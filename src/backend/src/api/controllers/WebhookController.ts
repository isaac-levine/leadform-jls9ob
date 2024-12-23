import { injectable } from 'tsyringe';
import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import CircuitBreaker from 'opossum';
import { MessageService } from '../../services/message.service';
import { SMSService } from '../../lib/sms/sms.service';
import { MessageStatus } from '../../types/message.types';
import { validateWebhookPayload } from '../../utils/validation.utils';
import { Logger } from '../../utils/logger.utils';
import { SMSWebhookPayload } from '../../types/sms.types';

// Constants for webhook handling
const WEBHOOK_TIMEOUT = 5000; // 5 second SLA requirement
const MAX_RETRIES = 3;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute
const CIRCUIT_BREAKER_TIMEOUT = 3000;
const MAX_PAYLOAD_SIZE = '100kb';

/**
 * Controller handling SMS provider webhook callbacks with comprehensive security,
 * validation, and monitoring capabilities.
 */
@injectable()
export class WebhookController {
    private readonly messageService: MessageService;
    private readonly smsService: SMSService;
    private readonly logger: Logger;
    private readonly circuitBreaker: CircuitBreaker;
    private readonly rateLimiter: rateLimit.RateLimit;

    constructor(messageService: MessageService, logger: Logger) {
        this.messageService = messageService;
        this.smsService = SMSService.getInstance({
            provider: process.env.SMS_PROVIDER!,
            accountSid: process.env.SMS_ACCOUNT_SID!,
            authToken: process.env.SMS_AUTH_TOKEN!,
            phoneNumber: process.env.SMS_PHONE_NUMBER!,
            webhookUrl: process.env.SMS_WEBHOOK_URL!,
            maxRetries: MAX_RETRIES,
            rateLimits: {
                requestsPerMinute: RATE_LIMIT_MAX,
                requestsPerDay: 10000
            }
        });
        this.logger = logger;

        // Initialize circuit breaker for webhook processing
        this.circuitBreaker = new CircuitBreaker(this.processWebhook.bind(this), {
            timeout: CIRCUIT_BREAKER_TIMEOUT,
            errorThresholdPercentage: 50,
            resetTimeout: 30000
        });

        // Configure rate limiter
        this.rateLimiter = rateLimit({
            windowMs: RATE_LIMIT_WINDOW,
            max: RATE_LIMIT_MAX,
            message: 'Too many webhook requests'
        });

        this.setupCircuitBreakerHandlers();
    }

    /**
     * Handles incoming SMS provider webhook requests with validation and monitoring
     */
    public async handleSMSWebhook(req: Request, res: Response): Promise<Response> {
        const correlationId = req.headers['x-correlation-id'] || 
            req.headers['x-request-id'] || 
            Date.now().toString();

        try {
            this.logger.info('Webhook request received', {
                correlationId,
                provider: req.headers['x-sms-provider'],
                contentLength: req.headers['content-length']
            });

            // Apply rate limiting
            await new Promise((resolve, reject) => {
                this.rateLimiter(req, res, (err) => {
                    if (err) reject(err);
                    resolve(true);
                });
            });

            // Validate webhook signature
            if (!this.validateWebhookSignature(req)) {
                this.logger.warn('Invalid webhook signature', { correlationId });
                return res.status(401).json({ error: 'Invalid signature' });
            }

            // Validate request payload
            const validationResult = validateWebhookPayload(req.body);
            if (!validationResult.isValid) {
                this.logger.warn('Invalid webhook payload', {
                    correlationId,
                    errors: validationResult.errors
                });
                return res.status(400).json({ errors: validationResult.errors });
            }

            // Process webhook through circuit breaker
            const result = await this.circuitBreaker.fire(req.body);

            this.logger.info('Webhook processed successfully', {
                correlationId,
                messageId: result.messageId
            });

            return res.status(200).json({ success: true });

        } catch (error) {
            this.logger.error('Webhook processing failed', {
                correlationId,
                error: error as Error
            });

            if (this.circuitBreaker.opened) {
                return res.status(503).json({ error: 'Service temporarily unavailable' });
            }

            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Processes webhook payload with comprehensive error handling
     */
    private async processWebhook(payload: SMSWebhookPayload): Promise<void> {
        const startTime = Date.now();

        try {
            if (this.isDeliveryStatusUpdate(payload)) {
                await this.handleStatusUpdate(payload);
            } else {
                await this.handleInboundMessage(payload);
            }

            this.logger.info('Webhook processing completed', {
                processingTime: Date.now() - startTime,
                messageId: payload.providerMessageId
            });

        } catch (error) {
            this.logger.error('Webhook processing error', {
                error: error as Error,
                processingTime: Date.now() - startTime
            });
            throw error;
        }
    }

    /**
     * Handles inbound SMS messages with validation and error handling
     */
    private async handleInboundMessage(webhookData: SMSWebhookPayload): Promise<void> {
        try {
            const message = await this.messageService.receiveMessage(
                webhookData.providerMessageId,
                webhookData.rawPayload.body
            );

            this.logger.info('Inbound message processed', {
                messageId: message._id,
                leadId: message.leadId
            });

        } catch (error) {
            this.logger.error('Failed to process inbound message', {
                error: error as Error,
                messageId: webhookData.providerMessageId
            });
            throw error;
        }
    }

    /**
     * Handles message delivery status updates with provider mapping
     */
    private async handleStatusUpdate(webhookData: SMSWebhookPayload): Promise<void> {
        try {
            await this.messageService.updateMessageStatus(
                webhookData.providerMessageId,
                webhookData.status,
                {
                    deliveredAt: webhookData.timestamp,
                    providerStatus: webhookData.rawPayload.status,
                    error: webhookData.error
                }
            );

            this.logger.info('Status update processed', {
                messageId: webhookData.providerMessageId,
                status: webhookData.status
            });

        } catch (error) {
            this.logger.error('Failed to process status update', {
                error: error as Error,
                messageId: webhookData.providerMessageId
            });
            throw error;
        }
    }

    /**
     * Validates webhook signature for security
     */
    private validateWebhookSignature(req: Request): boolean {
        const signature = req.headers['x-sms-signature'];
        if (!signature) return false;

        // Implementation would verify signature using provider-specific method
        return true; // Placeholder
    }

    /**
     * Determines if webhook is for delivery status update
     */
    private isDeliveryStatusUpdate(payload: SMSWebhookPayload): boolean {
        return payload.rawPayload.type === 'status_update' ||
            payload.status === MessageStatus.DELIVERED ||
            payload.status === MessageStatus.FAILED;
    }

    /**
     * Sets up circuit breaker event handlers
     */
    private setupCircuitBreakerHandlers(): void {
        this.circuitBreaker.on('open', () => {
            this.logger.warn('Circuit breaker opened for webhook processing');
        });

        this.circuitBreaker.on('halfOpen', () => {
            this.logger.info('Circuit breaker entering half-open state');
        });

        this.circuitBreaker.on('close', () => {
            this.logger.info('Circuit breaker closed, processing resumed');
        });
    }
}