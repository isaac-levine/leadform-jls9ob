/**
 * Core SMS service implementation providing provider-agnostic SMS messaging capabilities
 * with queue integration, error handling, and delivery status management.
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { SMSProviderFactory } from './provider.factory';
import { SMSConfig, SMSMessage, SMSWebhookPayload } from '../../types/sms.types';
import { MessageQueue } from '../queue/message.queue';
import { MessageStatus } from '../../types/message.types';
import { Logger } from '../../utils/logger.utils';

// Global constants for SMS operations
export const SMS_EVENTS = {
  MESSAGE_QUEUED: 'sms:message:queued',
  MESSAGE_SENT: 'sms:message:sent',
  MESSAGE_FAILED: 'sms:message:failed',
  STATUS_UPDATED: 'sms:status:updated',
  DELIVERY_CONFIRMED: 'sms:delivery:confirmed',
  DELIVERY_FAILED: 'sms:delivery:failed'
} as const;

export const SMS_TIMEOUTS = {
  PROCESSING: 5000, // 5 second SLA requirement
  RETRY_INITIAL: 1000,
  RETRY_MAX: 30000
} as const;

/**
 * Core service handling SMS operations with provider abstraction and queue integration
 */
export class SMSService {
  private static instance: SMSService;
  private providerFactory: SMSProviderFactory;
  private messageQueue: MessageQueue;
  private events: EventEmitter;
  private logger: Logger;
  private config: SMSConfig;
  private retryAttempts: Map<string, number>;

  /**
   * Private constructor implementing singleton pattern with event handling setup
   */
  private constructor(config: SMSConfig) {
    this.events = new EventEmitter();
    this.logger = Logger.getInstance();
    this.config = this.validateAndSanitizeConfig(config);
    this.providerFactory = SMSProviderFactory.getInstance();
    this.messageQueue = MessageQueue.getInstance();
    this.retryAttempts = new Map();

    this.setupEventHandlers();
  }

  /**
   * Gets singleton instance of SMS service with configuration
   */
  public static getInstance(config: SMSConfig): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService(config);
    }
    return SMSService.instance;
  }

  /**
   * Sends SMS message with queue integration and monitoring
   */
  public async sendMessage(message: SMSMessage): Promise<void> {
    try {
      // Validate message content
      this.validateMessage(message);

      // Add message to processing queue
      await this.messageQueue.addToQueue({
        ...message,
        metadata: {
          ...message.metadata,
          provider: this.config.provider,
          queuedAt: new Date()
        }
      });

      this.logger.info('Message queued for sending', {
        messageId: message.messageId,
        to: message.to
      });

      this.events.emit(SMS_EVENTS.MESSAGE_QUEUED, { message });

    } catch (error) {
      this.logger.error('Failed to queue message', error as Error, {
        messageId: message.messageId
      });
      throw error;
    }
  }

  /**
   * Processes queued SMS message with retry logic
   */
  private async processMessage(message: SMSMessage): Promise<void> {
    const provider = await this.providerFactory.getProvider(this.config);
    const startTime = Date.now();

    try {
      const response = await provider.sendMessage(message);

      if (!response.success) {
        throw new Error(response.error || 'Provider send failed');
      }

      this.logger.info('Message sent successfully', {
        messageId: message.messageId,
        providerMessageId: response.providerMessageId,
        processingTime: Date.now() - startTime
      });

      this.events.emit(SMS_EVENTS.MESSAGE_SENT, {
        message,
        response,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      await this.handleSendError(message, error as Error);
    }
  }

  /**
   * Handles delivery status updates from provider webhooks
   */
  public async handleDeliveryStatus(payload: SMSWebhookPayload): Promise<void> {
    try {
      // Validate webhook signature
      this.validateWebhookSignature(payload);

      const status = payload.status;
      const messageId = payload.providerMessageId;

      this.logger.info('Delivery status update received', {
        messageId,
        status,
        timestamp: payload.timestamp
      });

      // Emit appropriate status event
      if (status === MessageStatus.DELIVERED) {
        this.events.emit(SMS_EVENTS.DELIVERY_CONFIRMED, payload);
      } else if (status === MessageStatus.FAILED) {
        this.events.emit(SMS_EVENTS.DELIVERY_FAILED, payload);
        await this.handleDeliveryFailure(messageId, payload);
      }

      this.events.emit(SMS_EVENTS.STATUS_UPDATED, payload);

    } catch (error) {
      this.logger.error('Failed to process delivery status', error as Error, {
        payload
      });
      throw error;
    }
  }

  /**
   * Sets up event handlers for queue and delivery status monitoring
   */
  private setupEventHandlers(): void {
    this.messageQueue.on('processed', (data) => {
      this.logger.info('Message processed by queue', {
        messageId: data.message.messageId
      });
    });

    this.messageQueue.on('failed', async (data) => {
      await this.handleSendError(data.message, data.error);
    });

    this.events.on(SMS_EVENTS.DELIVERY_FAILED, (payload) => {
      this.logger.warn('Message delivery failed', {
        messageId: payload.providerMessageId,
        error: payload.error
      });
    });
  }

  /**
   * Handles message send errors with retry logic
   */
  private async handleSendError(message: SMSMessage, error: Error): Promise<void> {
    const retryCount = this.retryAttempts.get(message.messageId) || 0;

    if (retryCount < this.config.maxRetries) {
      this.retryAttempts.set(message.messageId, retryCount + 1);
      await this.messageQueue.addToRetryQueue(message, {
        message: error.message,
        code: 'SEND_FAILED',
        attempt: retryCount,
        timestamp: new Date()
      });
    } else {
      this.events.emit(SMS_EVENTS.MESSAGE_FAILED, {
        message,
        error,
        retryCount
      });
    }
  }

  /**
   * Validates and sanitizes SMS configuration
   */
  private validateAndSanitizeConfig(config: SMSConfig): SMSConfig {
    if (!config.provider || !config.accountSid || !config.authToken) {
      throw new Error('Invalid SMS configuration');
    }
    return {
      ...config,
      maxRetries: config.maxRetries || 3,
      rateLimits: {
        requestsPerMinute: config.rateLimits?.requestsPerMinute || 100,
        requestsPerDay: config.rateLimits?.requestsPerDay || 10000
      }
    };
  }

  /**
   * Validates message content and structure
   */
  private validateMessage(message: SMSMessage): void {
    if (!message.to || !message.body) {
      throw new Error('Invalid message format');
    }
    if (message.body.length > 1600) {
      throw new Error('Message content exceeds maximum length');
    }
  }

  /**
   * Validates webhook signature for security
   */
  private validateWebhookSignature(payload: SMSWebhookPayload): void {
    if (!payload.securitySignature) {
      throw new Error('Invalid webhook signature');
    }
    // Implement provider-specific signature validation
  }

  /**
   * Handles delivery failures with appropriate retry logic
   */
  private async handleDeliveryFailure(messageId: string, payload: SMSWebhookPayload): Promise<void> {
    const retryCount = this.retryAttempts.get(messageId) || 0;
    if (retryCount < this.config.maxRetries) {
      // Implement delivery failure retry logic
    }
  }
}