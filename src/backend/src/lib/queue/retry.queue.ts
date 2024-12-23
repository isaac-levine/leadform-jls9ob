import Bull from 'bull';
import { EventEmitter } from 'events';
import { QUEUE_NAMES, QUEUE_OPTIONS, RETRY_STRATEGY, createQueueConfig } from '../../config/queue.config';
import { Message, MessageStatus } from '../../types/message.types';
import { Logger } from '../../utils/logger.utils';

/**
 * Events emitted by the retry queue for monitoring and metrics
 */
export const RETRY_EVENTS = {
  RETRY_QUEUED: 'retry:message:queued',
  RETRY_SUCCEEDED: 'retry:message:succeeded',
  RETRY_FAILED: 'retry:message:failed',
  MAX_RETRIES_EXCEEDED: 'retry:max:exceeded',
  PROVIDER_ERROR: 'retry:provider:error',
  CIRCUIT_BREAKER_OPEN: 'retry:circuit:open'
} as const;

/**
 * Interface for provider-specific error details
 */
interface ProviderError {
  code: string;
  message: string;
  retryable: boolean;
  providerName: string;
}

/**
 * Interface for retry error context
 */
interface RetryError {
  message: string;
  code: string;
  attempt: number;
  providerError?: ProviderError;
  timestamp: Date;
}

/**
 * Interface for circuit breaker state
 */
interface CircuitBreaker {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date | null;
  resetTimeout: number;
}

/**
 * Interface for retry metrics
 */
interface RetryMetrics {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryLatency: number;
  providerErrors: Map<string, number>;
}

/**
 * Manages retry queue for failed SMS message delivery attempts with exponential backoff,
 * provider-agnostic error handling, and comprehensive monitoring
 */
export class RetryQueue {
  private static instance: RetryQueue;
  private retryQueue: Bull.Queue;
  private events: EventEmitter;
  private logger: Logger;
  private circuitBreaker: CircuitBreaker;
  private metrics: RetryMetrics;

  private constructor() {
    this.events = new EventEmitter();
    this.logger = Logger.getInstance();
    
    // Initialize circuit breaker
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      resetTimeout: 60000 // 1 minute default reset timeout
    };

    // Initialize metrics
    this.metrics = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryLatency: 0,
      providerErrors: new Map()
    };

    // Create retry queue with configured options
    const queueConfig = createQueueConfig(QUEUE_NAMES.RETRY, {
      monitoringEnabled: true,
      customRetryStrategy: RETRY_STRATEGY
    });

    this.retryQueue = new Bull(QUEUE_NAMES.RETRY, queueConfig);

    // Set up queue event handlers
    this.setupQueueHandlers();
  }

  /**
   * Gets singleton instance of retry queue
   */
  public static getInstance(): RetryQueue {
    if (!RetryQueue.instance) {
      RetryQueue.instance = new RetryQueue();
    }
    return RetryQueue.instance;
  }

  /**
   * Adds a failed message to the retry queue with intelligent backoff strategy
   */
  public async addToRetryQueue(message: Message, error: RetryError): Promise<void> {
    try {
      // Check circuit breaker status
      if (this.circuitBreaker.isOpen) {
        this.logger.warn('Circuit breaker is open, rejecting retry', { messageId: message._id });
        this.events.emit(RETRY_EVENTS.CIRCUIT_BREAKER_OPEN, { message, error });
        return;
      }

      // Validate retry attempt count
      if (error.attempt >= RETRY_STRATEGY.maxAttempts) {
        this.logger.error('Max retry attempts exceeded', { messageId: message._id, attempts: error.attempt });
        this.events.emit(RETRY_EVENTS.MAX_RETRIES_EXCEEDED, { message, error });
        return;
      }

      // Calculate backoff delay
      const delay = this.calculateBackoff(error.attempt, error);

      // Add to retry queue with calculated delay
      await this.retryQueue.add(
        {
          message,
          error,
          attempt: error.attempt + 1
        },
        {
          delay,
          attempts: 1, // Single attempt per job
          removeOnComplete: true,
          removeOnFail: false
        }
      );

      // Update metrics
      this.metrics.totalRetries++;
      if (error.providerError) {
        const count = this.metrics.providerErrors.get(error.providerError.code) || 0;
        this.metrics.providerErrors.set(error.providerError.code, count + 1);
      }

      this.logger.info('Message added to retry queue', {
        messageId: message._id,
        attempt: error.attempt,
        delay
      });

      this.events.emit(RETRY_EVENTS.RETRY_QUEUED, { message, error, delay });

    } catch (err) {
      this.logger.error('Failed to add message to retry queue', err as Error, {
        messageId: message._id,
        error
      });
      throw err;
    }
  }

  /**
   * Processes a retry attempt for a failed message
   */
  private async processRetry(job: Bull.Job): Promise<void> {
    const { message, error, attempt } = job.data;
    const startTime = Date.now();

    try {
      // Update message status to retry pending
      message.status = MessageStatus.QUEUED;
      message.metadata.lastRetryAttempt = new Date();

      // Attempt message delivery
      await this.retryMessageDelivery(message);

      // Update metrics on success
      this.metrics.successfulRetries++;
      this.updateRetryLatency(startTime);
      this.resetCircuitBreaker();

      this.logger.info('Retry attempt successful', {
        messageId: message._id,
        attempt
      });

      this.events.emit(RETRY_EVENTS.RETRY_SUCCEEDED, { message, attempt });

    } catch (err) {
      // Update failure metrics
      this.metrics.failedRetries++;
      this.updateCircuitBreaker();

      this.logger.error('Retry attempt failed', err as Error, {
        messageId: message._id,
        attempt
      });

      this.events.emit(RETRY_EVENTS.RETRY_FAILED, {
        message,
        error: err,
        attempt
      });

      // Re-throw error to trigger retry logic
      throw err;
    }
  }

  /**
   * Calculates intelligent backoff delay based on error type and attempt number
   */
  private calculateBackoff(attemptNumber: number, error: RetryError): number {
    const baseDelay = RETRY_STRATEGY.initialBackoff;
    let delay = baseDelay * Math.pow(RETRY_STRATEGY.backoffMultiplier, attemptNumber);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    delay += jitter;

    // Adjust delay based on error type
    if (error.providerError?.retryable === false) {
      delay *= 2; // Double delay for known non-retryable errors
    }

    // Cap at maximum backoff
    return Math.min(delay, RETRY_STRATEGY.maxBackoff);
  }

  /**
   * Sets up queue event handlers and processors
   */
  private setupQueueHandlers(): void {
    // Process retry attempts
    this.retryQueue.process(async (job) => {
      await this.processRetry(job);
    });

    // Handle queue errors
    this.retryQueue.on('error', (error) => {
      this.logger.error('Retry queue error', error as Error);
    });

    // Monitor queue health
    this.retryQueue.on('failed', (job, error) => {
      this.logger.error('Job failed', error as Error, { jobId: job.id });
    });
  }

  /**
   * Updates circuit breaker state based on failures
   */
  private updateCircuitBreaker(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();

    if (this.circuitBreaker.failureCount >= 5) { // Open after 5 consecutive failures
      this.circuitBreaker.isOpen = true;
      setTimeout(() => this.resetCircuitBreaker(), this.circuitBreaker.resetTimeout);
    }
  }

  /**
   * Resets circuit breaker state
   */
  private resetCircuitBreaker(): void {
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = null;
  }

  /**
   * Updates average retry latency metric
   */
  private updateRetryLatency(startTime: number): void {
    const latency = Date.now() - startTime;
    const totalRetries = this.metrics.successfulRetries + this.metrics.failedRetries;
    this.metrics.averageRetryLatency = 
      (this.metrics.averageRetryLatency * (totalRetries - 1) + latency) / totalRetries;
  }

  /**
   * Attempts to deliver a message through the SMS provider
   */
  private async retryMessageDelivery(message: Message): Promise<void> {
    // Implementation would integrate with SMS provider service
    // This is a placeholder for the actual implementation
    throw new Error('retryMessageDelivery not implemented');
  }
}