import Bull from 'bull';
import { EventEmitter } from 'events';
import CircuitBreaker from 'opossum';
import { QUEUE_NAMES, QUEUE_OPTIONS, createQueueConfig, QueueMetrics } from '../../config/queue.config';
import { Message, MessageStatus, MessageType, MessageError } from '../../types/message.types';
import { RetryQueue } from './retry.queue';
import { Logger } from '../../utils/logger.utils';

// Global constants for queue configuration
const PROCESSING_TIMEOUT_MS = 5000; // 5 second SLA requirement
const MAX_CONCURRENT_JOBS = 100;
const CIRCUIT_BREAKER_THRESHOLD = 50;
const HEALTH_CHECK_INTERVAL_MS = 30000;

/**
 * Events emitted by the message queue for monitoring and metrics
 */
export const MESSAGE_QUEUE_EVENTS = {
  MESSAGE_QUEUED: 'message:queued',
  MESSAGE_PROCESSED: 'message:processed',
  MESSAGE_FAILED: 'message:failed',
  AI_RESPONSE_GENERATED: 'ai:response:generated',
  AI_RESPONSE_FAILED: 'ai:response:failed',
  PROVIDER_ERROR: 'provider:error',
  HEALTH_CHECK: 'health:check'
} as const;

/**
 * Enterprise-grade message queue for SMS processing with AI integration
 * Implements comprehensive monitoring, circuit breaker pattern, and performance optimization
 */
export class MessageQueue {
  private static instance: MessageQueue;
  private messageQueue: Bull.Queue;
  private events: EventEmitter;
  private logger: Logger;
  private retryQueue: RetryQueue;
  private circuitBreaker: CircuitBreaker;
  private metrics: QueueMetrics;

  private constructor() {
    this.events = new EventEmitter();
    this.logger = Logger.getInstance();
    this.retryQueue = RetryQueue.getInstance();

    // Initialize queue with optimized configuration
    const queueConfig = createQueueConfig(QUEUE_NAMES.SMS, {
      monitoringEnabled: true
    });

    this.messageQueue = new Bull(QUEUE_NAMES.SMS, queueConfig);

    // Initialize circuit breaker for failure handling
    this.circuitBreaker = new CircuitBreaker(this.processMessage.bind(this), {
      timeout: PROCESSING_TIMEOUT_MS,
      errorThresholdPercentage: CIRCUIT_BREAKER_THRESHOLD,
      resetTimeout: 30000
    });

    // Initialize metrics tracking
    this.metrics = {
      processedCount: 0,
      failedCount: 0,
      averageLatency: 0,
      queueSize: 0,
      aiResponseTime: 0
    };

    this.setupQueueHandlers();
    this.startHealthCheck();
  }

  /**
   * Gets singleton instance of message queue
   */
  public static getInstance(): MessageQueue {
    if (!MessageQueue.instance) {
      MessageQueue.instance = new MessageQueue();
    }
    return MessageQueue.instance;
  }

  /**
   * Adds a new message to the processing queue with validation and monitoring
   */
  public async addToQueue(message: Message): Promise<void> {
    try {
      // Validate message object
      if (!message.content || !message.leadId) {
        throw new Error('Invalid message format');
      }

      // Check circuit breaker status
      if (this.circuitBreaker.opened) {
        this.logger.warn('Circuit breaker is open, message queued for retry', {
          messageId: message._id
        });
        await this.retryQueue.addToRetryQueue(message, {
          message: 'Circuit breaker open',
          code: 'CIRCUIT_OPEN',
          attempt: 0,
          timestamp: new Date()
        });
        return;
      }

      // Add message to queue with optimized options
      const job = await this.messageQueue.add(message, {
        attempts: 1,
        timeout: PROCESSING_TIMEOUT_MS,
        removeOnComplete: true,
        removeOnFail: false
      });

      // Update metrics
      this.metrics.queueSize = await this.messageQueue.count();

      this.logger.info('Message added to queue', {
        messageId: message._id,
        jobId: job.id
      });

      this.events.emit(MESSAGE_QUEUE_EVENTS.MESSAGE_QUEUED, { message, jobId: job.id });

    } catch (error) {
      this.logger.error('Failed to add message to queue', error as Error, {
        messageId: message._id
      });
      throw error;
    }
  }

  /**
   * Processes a queued message with timeout handling and performance monitoring
   */
  private async processMessage(job: Bull.Job<Message>): Promise<void> {
    const startTime = Date.now();
    const message = job.data;

    try {
      // Update message status
      message.status = MessageStatus.QUEUED;

      // Generate AI response if needed
      if (message.type === MessageType.AI) {
        const aiStartTime = Date.now();
        await this.generateAIResponse(message);
        this.metrics.aiResponseTime = Date.now() - aiStartTime;
      }

      // Process message delivery
      await this.deliverMessage(message);

      // Update success metrics
      this.metrics.processedCount++;
      this.updateProcessingLatency(startTime);

      this.logger.info('Message processed successfully', {
        messageId: message._id,
        processingTime: Date.now() - startTime
      });

      this.events.emit(MESSAGE_QUEUE_EVENTS.MESSAGE_PROCESSED, {
        message,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      // Update failure metrics
      this.metrics.failedCount++;

      this.logger.error('Message processing failed', error as Error, {
        messageId: message._id
      });

      // Add to retry queue if appropriate
      await this.handleProcessingError(message, error as Error);

      throw error;
    }
  }

  /**
   * Generates AI response for messages requiring AI processing
   */
  private async generateAIResponse(message: Message): Promise<void> {
    try {
      // AI response generation would be implemented here
      // This is a placeholder for the actual implementation
      this.events.emit(MESSAGE_QUEUE_EVENTS.AI_RESPONSE_GENERATED, { message });
    } catch (error) {
      this.events.emit(MESSAGE_QUEUE_EVENTS.AI_RESPONSE_FAILED, {
        message,
        error
      });
      throw error;
    }
  }

  /**
   * Delivers message through configured SMS provider
   */
  private async deliverMessage(message: Message): Promise<void> {
    // SMS provider integration would be implemented here
    // This is a placeholder for the actual implementation
    throw new Error('deliverMessage not implemented');
  }

  /**
   * Handles processing errors with intelligent retry strategy
   */
  private async handleProcessingError(message: Message, error: Error): Promise<void> {
    const retryError = {
      message: error.message,
      code: (error as any).code || 'PROCESSING_ERROR',
      attempt: 0,
      timestamp: new Date()
    };

    await this.retryQueue.addToRetryQueue(message, retryError);
    this.events.emit(MESSAGE_QUEUE_EVENTS.MESSAGE_FAILED, { message, error });
  }

  /**
   * Sets up queue event handlers and processors
   */
  private setupQueueHandlers(): void {
    this.messageQueue.process(MAX_CONCURRENT_JOBS, async (job) => {
      await this.circuitBreaker.fire(job);
    });

    this.messageQueue.on('error', (error) => {
      this.logger.error('Queue error occurred', error as Error);
    });

    this.messageQueue.on('failed', (job, error) => {
      this.logger.error('Job failed', error as Error, { jobId: job.id });
    });

    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened');
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed');
    });
  }

  /**
   * Updates average processing latency metric
   */
  private updateProcessingLatency(startTime: number): void {
    const latency = Date.now() - startTime;
    const totalProcessed = this.metrics.processedCount;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (totalProcessed - 1) + latency) / totalProcessed;
  }

  /**
   * Starts periodic health check monitoring
   */
  private startHealthCheck(): void {
    setInterval(async () => {
      try {
        const health = {
          queueSize: await this.messageQueue.count(),
          failedCount: this.metrics.failedCount,
          circuitBreakerStatus: this.circuitBreaker.opened ? 'OPEN' : 'CLOSED',
          averageLatency: this.metrics.averageLatency,
          aiResponseTime: this.metrics.aiResponseTime
        };

        this.events.emit(MESSAGE_QUEUE_EVENTS.HEALTH_CHECK, health);
      } catch (error) {
        this.logger.error('Health check failed', error as Error);
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Gets current queue metrics
   */
  public getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }
}