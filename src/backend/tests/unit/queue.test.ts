import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import Bull from 'bull';
import { EventEmitter } from 'events';
import { MessageQueue } from '../../src/lib/queue/message.queue';
import { RetryQueue } from '../../src/lib/queue/retry.queue';
import { Message, MessageStatus, MessageType } from '../../src/types/message.types';
import { ObjectId } from 'mongodb';

// Mock Bull queue
jest.mock('bull');

// Mock EventEmitter
jest.mock('events');

describe('MessageQueue', () => {
  let messageQueue: MessageQueue;
  let mockQueue: jest.Mocked<Bull.Queue>;
  let mockEventEmitter: jest.Mocked<EventEmitter>;
  let mockRetryQueue: jest.Mocked<RetryQueue>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock queue
    mockQueue = {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn(),
      count: jest.fn().mockResolvedValue(0)
    } as unknown as jest.Mocked<Bull.Queue>;

    // Setup mock event emitter
    mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn()
    } as unknown as jest.Mocked<EventEmitter>;

    // Setup mock retry queue
    mockRetryQueue = {
      addToRetryQueue: jest.fn(),
      getInstance: jest.fn()
    } as unknown as jest.Mocked<RetryQueue>;

    // Get MessageQueue instance
    messageQueue = MessageQueue.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should add message to queue successfully', async () => {
    // Create test message
    const testMessage: Message = {
      _id: new ObjectId(),
      leadId: new ObjectId(),
      content: 'Test message content',
      type: MessageType.SMS,
      status: MessageStatus.PENDING,
      direction: 'OUTBOUND',
      metadata: {},
      sentAt: new Date(),
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Mock queue add method
    mockQueue.add.mockResolvedValue({ id: 'test-job-id' } as Bull.Job);

    // Add message to queue
    await messageQueue.addToQueue(testMessage);

    // Verify queue add was called with correct parameters
    expect(mockQueue.add).toHaveBeenCalledWith(
      testMessage,
      expect.objectContaining({
        attempts: 1,
        timeout: 5000,
        removeOnComplete: true,
        removeOnFail: false
      })
    );

    // Verify event was emitted
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'message:queued',
      expect.objectContaining({
        message: testMessage,
        jobId: 'test-job-id'
      })
    );
  });

  test('should process message within 5 second SLA', async () => {
    jest.useFakeTimers();
    const startTime = Date.now();

    // Create test message and job
    const testMessage: Message = {
      _id: new ObjectId(),
      leadId: new ObjectId(),
      content: 'Test message content',
      type: MessageType.SMS,
      status: MessageStatus.QUEUED,
      direction: 'OUTBOUND',
      metadata: {},
      sentAt: new Date(),
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const testJob = {
      data: testMessage,
      id: 'test-job-id'
    } as Bull.Job;

    // Process message
    await messageQueue.processMessage(testJob);

    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(5000);

    // Verify message status was updated
    expect(testMessage.status).toBe(MessageStatus.SENT);

    // Verify success event was emitted
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'message:processed',
      expect.objectContaining({
        message: testMessage,
        processingTime: expect.any(Number)
      })
    );
  });

  test('should handle message delivery failure with retry', async () => {
    // Create test message
    const testMessage: Message = {
      _id: new ObjectId(),
      leadId: new ObjectId(),
      content: 'Test message content',
      type: MessageType.SMS,
      status: MessageStatus.QUEUED,
      direction: 'OUTBOUND',
      metadata: {},
      sentAt: new Date(),
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const testError = new Error('SMS delivery failed');
    (testError as any).code = 'DELIVERY_ERROR';

    // Mock RetryQueue instance
    RetryQueue.getInstance = jest.fn().mockReturnValue(mockRetryQueue);

    // Simulate message delivery failure
    await messageQueue.handleFailure(testMessage, testError);

    // Verify message was added to retry queue
    expect(mockRetryQueue.addToRetryQueue).toHaveBeenCalledWith(
      testMessage,
      expect.objectContaining({
        message: testError.message,
        code: 'DELIVERY_ERROR',
        attempt: 0
      })
    );

    // Verify failure event was emitted
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'message:failed',
      expect.objectContaining({
        message: testMessage,
        error: testError
      })
    );

    // Verify message status was updated
    expect(testMessage.status).toBe(MessageStatus.FAILED);
  });

  test('should respect circuit breaker when queue is overwhelmed', async () => {
    // Setup circuit breaker in open state
    const testMessage: Message = {
      _id: new ObjectId(),
      leadId: new ObjectId(),
      content: 'Test message content',
      type: MessageType.SMS,
      status: MessageStatus.PENDING,
      direction: 'OUTBOUND',
      metadata: {},
      sentAt: new Date(),
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Simulate circuit breaker open state
    messageQueue['circuitBreaker'].opened = true;

    // Attempt to add message
    await messageQueue.addToQueue(testMessage);

    // Verify message was sent to retry queue instead
    expect(mockRetryQueue.addToRetryQueue).toHaveBeenCalledWith(
      testMessage,
      expect.objectContaining({
        message: 'Circuit breaker open',
        code: 'CIRCUIT_OPEN'
      })
    );

    // Verify queue add was not called
    expect(mockQueue.add).not.toHaveBeenCalled();
  });
});

describe('RetryQueue', () => {
  let retryQueue: RetryQueue;
  let mockQueue: jest.Mocked<Bull.Queue>;
  let mockEventEmitter: jest.Mocked<EventEmitter>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueue = {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn()
    } as unknown as jest.Mocked<Bull.Queue>;

    mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn()
    } as unknown as jest.Mocked<EventEmitter>;

    retryQueue = RetryQueue.getInstance();
  });

  test('should calculate correct backoff delay', () => {
    const testError = {
      message: 'Test error',
      code: 'TEST_ERROR',
      attempt: 0,
      timestamp: new Date()
    };

    // Test backoff calculation for different attempt numbers
    const delay1 = retryQueue['calculateBackoff'](0, testError);
    const delay2 = retryQueue['calculateBackoff'](1, testError);
    const delay3 = retryQueue['calculateBackoff'](2, testError);

    // Verify exponential backoff
    expect(delay2).toBeGreaterThan(delay1);
    expect(delay3).toBeGreaterThan(delay2);

    // Verify maximum backoff cap
    const maxDelay = retryQueue['calculateBackoff'](10, testError);
    expect(maxDelay).toBeLessThanOrEqual(60000); // 60 second max
  });

  test('should handle max retry attempts exceeded', async () => {
    const testMessage: Message = {
      _id: new ObjectId(),
      leadId: new ObjectId(),
      content: 'Test message content',
      type: MessageType.SMS,
      status: MessageStatus.FAILED,
      direction: 'OUTBOUND',
      metadata: {},
      sentAt: new Date(),
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const testError = {
      message: 'Test error',
      code: 'TEST_ERROR',
      attempt: 3, // Max attempts reached
      timestamp: new Date()
    };

    await retryQueue.addToRetryQueue(testMessage, testError);

    // Verify message was not added to queue
    expect(mockQueue.add).not.toHaveBeenCalled();

    // Verify max retries event was emitted
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      'retry:max:exceeded',
      expect.objectContaining({
        message: testMessage,
        error: testError
      })
    );
  });
});