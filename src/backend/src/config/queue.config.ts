/**
 * Queue Configuration for Bull Message Processing
 * @module queue.config
 * @description Defines configuration settings and options for Redis-backed Bull message queues
 * used in SMS processing, retries, and AI operations with comprehensive error handling and monitoring
 * 
 * @version 1.0.0
 * @requires bull ^4.10.0
 * @requires ioredis ^5.0.0
 */

import Bull from 'bull';
import Redis from 'ioredis';

/**
 * Queue name constants for different processing operations
 */
export const QUEUE_NAMES = {
  SMS: 'sms_outbound',
  RETRY: 'sms_retry',
  AI: 'ai_processing',
  MONITORING: 'queue_monitoring'
} as const;

/**
 * Redis connection configuration with TLS and retry support
 */
export const REDIS_CONFIG: Redis.RedisOptions = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times: number) => {
    return Math.min(times * 200, 2000); // Exponential backoff capped at 2 seconds
  },
  enableOfflineQueue: true,
  connectTimeout: 10000,
  disconnectTimeout: 2000,
  commandTimeout: 5000,
  keepAlive: 30000,
  lazyConnect: true
};

/**
 * Default queue options with monitoring and performance settings
 */
export const QUEUE_OPTIONS: Bull.QueueOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false,
    timeout: 5000, // 5 second timeout per job
  },
  limiter: {
    max: 100, // Maximum of 100 jobs
    duration: 60000, // Per minute
    bounceBack: true // Queue jobs when rate limit is hit
  },
  settings: {
    lockDuration: 30000, // 30 seconds lock duration
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
    maxStalledCount: 3, // Maximum number of times a job can be marked as stalled
    lockRenewTime: 15000, // Renew locks every 15 seconds
    drainDelay: 300, // 300ms delay between processing jobs
  }
};

/**
 * Advanced retry strategy configuration with monitoring
 */
export const RETRY_STRATEGY = {
  maxAttempts: 3,
  initialBackoff: 1000, // 1 second
  maxBackoff: 60000, // 1 minute
  backoffMultiplier: 2,
  retryOnStatusCodes: [408, 429, 500, 502, 503, 504],
  monitoring: {
    trackAttempts: true,
    logErrors: true,
    alertOnFinalRetry: true,
    metrics: {
      trackLatency: true,
      trackThroughput: true,
      trackErrorRates: true,
      trackQueueSize: true
    }
  }
} as const;

/**
 * Interface for queue configuration options
 */
interface QueueConfigOptions {
  prefix?: string;
  rateLimitOverride?: Bull.RateLimiter;
  monitoringEnabled?: boolean;
  customRetryStrategy?: Partial<typeof RETRY_STRATEGY>;
}

/**
 * Creates a comprehensive Bull queue configuration with Redis connection settings,
 * monitoring, and error handling
 * 
 * @param queueName - Name of the queue to configure
 * @param options - Optional configuration overrides
 * @returns Complete queue configuration object
 */
export function createQueueConfig(
  queueName: string,
  options: QueueConfigOptions = {}
): Bull.QueueOptions {
  const {
    prefix = 'bull',
    rateLimitOverride,
    monitoringEnabled = true,
    customRetryStrategy
  } = options;

  // Create Redis client with configured settings
  const redisClient = new Redis({
    ...REDIS_CONFIG,
    keyPrefix: `${prefix}:${queueName}:`
  });

  // Merge default options with any custom settings
  const queueOptions: Bull.QueueOptions = {
    ...QUEUE_OPTIONS,
    prefix,
    createClient: (type) => {
      switch (type) {
        case 'client':
          return redisClient;
        case 'subscriber':
          return new Redis(REDIS_CONFIG);
        case 'bclient':
          return new Redis(REDIS_CONFIG);
        default:
          return redisClient;
      }
    },
    limiter: rateLimitOverride || QUEUE_OPTIONS.limiter,
    settings: {
      ...QUEUE_OPTIONS.settings,
      blacklisted: [], // No blacklisted jobs by default
    }
  };

  // Apply monitoring configuration if enabled
  if (monitoringEnabled) {
    queueOptions.metrics = {
      maxDataPoints: 100,
      collectInterval: 5000 // Collect metrics every 5 seconds
    };
  }

  // Merge custom retry strategy if provided
  if (customRetryStrategy) {
    queueOptions.defaultJobOptions = {
      ...queueOptions.defaultJobOptions,
      backoff: {
        type: 'exponential',
        delay: customRetryStrategy.initialBackoff || RETRY_STRATEGY.initialBackoff
      },
      attempts: customRetryStrategy.maxAttempts || RETRY_STRATEGY.maxAttempts
    };
  }

  return queueOptions;
}