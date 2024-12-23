import { injectable } from 'tsyringe';
import CircuitBreaker from 'opossum';
import { Logger } from 'winston';
import { IMessage } from '../interfaces/IMessage';
import { Message } from '../db/models/Message';
import { SMSService } from '../lib/sms/sms.service';
import { ConversationManager } from '../lib/ai/conversation.manager';
import { MessageStatus, MessageType, MessageDirection } from '../types/message.types';
import { LeadId } from '../types/lead.types';

/**
 * Service handling message operations with comprehensive error handling and monitoring
 * Implements SMS conversation management with AI integration
 * @version 1.0.0
 */
@injectable()
export class MessageService {
    private readonly circuitBreaker: CircuitBreaker;
    private readonly messageProcessingTimeout = 5000; // 5 second SLA requirement

    constructor(
        private readonly smsService: SMSService,
        private readonly conversationManager: ConversationManager,
        private readonly logger: Logger
    ) {
        // Initialize circuit breaker for SMS operations
        this.circuitBreaker = new CircuitBreaker(this.processSMSMessage.bind(this), {
            timeout: this.messageProcessingTimeout,
            errorThresholdPercentage: 50,
            resetTimeout: 30000
        });

        this.setupCircuitBreakerHandlers();
    }

    /**
     * Sends a new message with comprehensive error handling and monitoring
     * @param leadId - Target lead identifier
     * @param content - Message content
     * @param type - Message type (AI/HUMAN/SYSTEM)
     * @returns Created and processed message
     */
    public async sendMessage(
        leadId: LeadId,
        content: string,
        type: MessageType
    ): Promise<IMessage> {
        const startTime = Date.now();

        try {
            // Create message document
            const message = await Message.create({
                leadId,
                content,
                type,
                direction: MessageDirection.OUTBOUND,
                status: MessageStatus.QUEUED,
                metadata: {
                    processingStarted: new Date(),
                    type
                }
            });

            // Process through circuit breaker
            await this.circuitBreaker.fire({
                message,
                type,
                content
            });

            const processingTime = Date.now() - startTime;
            this.logger.info('Message sent successfully', {
                messageId: message._id,
                leadId,
                type,
                processingTime
            });

            return message;

        } catch (error) {
            this.logger.error('Failed to send message', {
                error,
                leadId,
                type,
                processingTime: Date.now() - startTime
            });
            throw error;
        }
    }

    /**
     * Handles incoming message with AI processing and human takeover capabilities
     * @param leadId - Source lead identifier
     * @param content - Message content
     * @returns Processed message with AI response
     */
    public async receiveMessage(
        leadId: LeadId,
        content: string
    ): Promise<IMessage> {
        const startTime = Date.now();

        try {
            // Create inbound message record
            const inboundMessage = await Message.create({
                leadId,
                content,
                type: MessageType.HUMAN,
                direction: MessageDirection.INBOUND,
                status: MessageStatus.DELIVERED,
                metadata: {
                    receivedAt: new Date()
                }
            });

            // Get conversation context
            const context = await this.getConversationContext(leadId);

            // Process through AI conversation manager
            const aiResponse = await this.conversationManager.handleMessage(
                context,
                content
            );

            // Create and send AI response if not in human takeover
            if (!aiResponse.metadata.requiresHumanIntervention) {
                await this.sendMessage(
                    leadId,
                    aiResponse.response,
                    MessageType.AI
                );
            } else {
                await this.handleHumanTakeover(leadId, context);
            }

            const processingTime = Date.now() - startTime;
            this.logger.info('Message received and processed', {
                messageId: inboundMessage._id,
                leadId,
                processingTime,
                requiresHumanIntervention: aiResponse.metadata.requiresHumanIntervention
            });

            return inboundMessage;

        } catch (error) {
            this.logger.error('Failed to process received message', {
                error,
                leadId,
                processingTime: Date.now() - startTime
            });
            throw error;
        }
    }

    /**
     * Updates message status with delivery tracking
     * @param messageId - Message identifier
     * @param status - New message status
     * @param metadata - Optional status metadata
     */
    public async updateMessageStatus(
        messageId: string,
        status: MessageStatus,
        metadata?: Record<string, any>
    ): Promise<void> {
        try {
            await Message.updateStatus(messageId, status);
            
            if (metadata) {
                await Message.updateMetadata(messageId, {
                    ...metadata,
                    statusUpdatedAt: new Date()
                });
            }

            this.logger.info('Message status updated', {
                messageId,
                status,
                metadata
            });

        } catch (error) {
            this.logger.error('Failed to update message status', {
                error,
                messageId,
                status
            });
            throw error;
        }
    }

    /**
     * Retrieves thread messages with pagination
     * @param leadId - Lead identifier
     * @param page - Page number
     * @param limit - Messages per page
     */
    public async getThreadMessages(
        leadId: LeadId,
        page: number = 1,
        limit: number = 50
    ): Promise<IMessage[]> {
        try {
            const messages = await Message.findByLeadId(leadId);
            return messages;
        } catch (error) {
            this.logger.error('Failed to retrieve thread messages', {
                error,
                leadId
            });
            throw error;
        }
    }

    /**
     * Processes SMS message delivery through provider
     * @private
     */
    private async processSMSMessage(data: {
        message: IMessage;
        type: MessageType;
        content: string;
    }): Promise<void> {
        const { message, content } = data;

        try {
            await this.smsService.sendMessage({
                messageId: message._id.toString(),
                to: message.leadId.toString(),
                from: process.env.SMS_FROM_NUMBER!,
                body: content,
                metadata: {
                    type: message.type,
                    direction: message.direction
                },
                scheduledAt: null,
                retryCount: 0
            });

            await this.updateMessageStatus(
                message._id.toString(),
                MessageStatus.SENT
            );

        } catch (error) {
            await this.updateMessageStatus(
                message._id.toString(),
                MessageStatus.FAILED,
                { error: (error as Error).message }
            );
            throw error;
        }
    }

    /**
     * Sets up circuit breaker event handlers
     * @private
     */
    private setupCircuitBreakerHandlers(): void {
        this.circuitBreaker.on('open', () => {
            this.logger.warn('Circuit breaker opened for SMS operations');
        });

        this.circuitBreaker.on('halfOpen', () => {
            this.logger.info('Circuit breaker entering half-open state');
        });

        this.circuitBreaker.on('close', () => {
            this.logger.info('Circuit breaker closed, operations resumed');
        });
    }

    /**
     * Retrieves conversation context for AI processing
     * @private
     */
    private async getConversationContext(leadId: LeadId) {
        const history = await this.getThreadMessages(leadId);
        return {
            leadId: leadId.toString(),
            conversationHistory: history.map(msg => ({
                role: msg.direction === MessageDirection.INBOUND ? 'user' : 'assistant',
                content: msg.content
            })),
            state: history.length === 0 ? 'ACTIVE' : history[0].metadata?.state || 'ACTIVE'
        };
    }

    /**
     * Handles transition to human agent
     * @private
     */
    private async handleHumanTakeover(
        leadId: LeadId,
        context: any
    ): Promise<void> {
        try {
            const handoff = await this.conversationManager.handleHumanTakeover(
                context,
                'AI confidence threshold not met'
            );

            await this.sendMessage(
                leadId,
                handoff.message,
                MessageType.SYSTEM
            );

        } catch (error) {
            this.logger.error('Failed to handle human takeover', {
                error,
                leadId
            });
            throw error;
        }
    }
}