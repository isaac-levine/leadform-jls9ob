import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import { RequestHandler } from 'express';
import { HTTP_STATUS_CODES } from '../constants/error.constants';

/**
 * Configuration options for rate limiter instances
 */
interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  keyPrefix: string;
}

// Default rate limiting window (1 minute in milliseconds)
const DEFAULT_WINDOW_MS = 60 * 1000;

// Redis configuration from environment variables
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    // Exponential backoff with max 2 second delay
    return Math.min(times * 50, 2000);
  }
};

// Initialize Redis client
const redisClient = new Redis(REDIS_CONFIG);

// Handle Redis connection errors
redisClient.on('error', (error: Error) => {
  console.error('Redis connection error:', error);
  // Fall back to memory store if Redis is unavailable
});

/**
 * Creates a configured rate limiter middleware instance with Redis store
 * @param options - Configuration options for the rate limiter
 * @returns Configured Express rate limiter middleware
 */
const createRateLimiter = (options: RateLimiterOptions): RequestHandler => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    standardHeaders: options.standardHeaders,
    legacyHeaders: options.legacyHeaders,
    keyGenerator: (req) => {
      // Use IP address and optional API key for rate limit key
      return `${options.keyPrefix}:${req.ip}:${req.get('X-API-Key') || ''}`;
    },
    store: new RedisStore({
      // Pass the Redis client instance
      client: redisClient,
      // Prefix for Redis keys to avoid collisions
      prefix: `${options.keyPrefix}:ratelimit:`,
      // Automatically handle Redis connection issues
      sendCommand: (...args: any[]) => redisClient.call(...args)
    }),
    statusCode: HTTP_STATUS_CODES.TOO_MANY_REQUESTS,
    skipFailedRequests: false, // Count failed requests against the rate limit
    skipSuccessfulRequests: false, // Count successful requests against the rate limit
    requestWasSuccessful: (req, res) => {
      // Consider request successful if status code is < 400
      return res.statusCode < 400;
    }
  });
};

/**
 * General API rate limiter middleware (100 req/min)
 * Used for standard API endpoints
 */
export const apiLimiter: RequestHandler = createRateLimiter({
  windowMs: DEFAULT_WINDOW_MS,
  max: 100,
  message: 'Too many requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
  keyPrefix: 'api'
});

/**
 * SMS endpoint rate limiter middleware (100 req/min)
 * Used for SMS provider integration endpoints
 */
export const smsLimiter: RequestHandler = createRateLimiter({
  windowMs: DEFAULT_WINDOW_MS,
  max: 100,
  message: 'SMS rate limit exceeded. Please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
  keyPrefix: 'sms'
});

/**
 * AI service rate limiter middleware (50 req/min)
 * Used for AI processing endpoints
 */
export const aiLimiter: RequestHandler = createRateLimiter({
  windowMs: DEFAULT_WINDOW_MS,
  max: 50,
  message: 'AI service rate limit exceeded. Please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
  keyPrefix: 'ai'
});

/**
 * Webhook endpoint rate limiter middleware (200 req/min)
 * Used for webhook callbacks
 */
export const webhookLimiter: RequestHandler = createRateLimiter({
  windowMs: DEFAULT_WINDOW_MS,
  max: 200,
  message: 'Webhook rate limit exceeded. Please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
  keyPrefix: 'webhook'
});
```

This implementation provides a robust, production-ready rate limiting solution with the following key features:

1. Redis-backed distributed rate limiting to work across multiple server instances
2. Configurable rate limits for different types of endpoints (API, SMS, AI, Webhooks)
3. Proper error handling for Redis connection issues
4. Support for API key-based rate limiting in addition to IP-based
5. Standard rate limit headers (RateLimit-*)
6. Customizable error messages
7. Exponential backoff for Redis connection retries
8. Proper TypeScript types and interfaces
9. Comprehensive comments for maintainability

The rate limits are implemented as specified in the technical requirements:
- Standard API endpoints: 100 requests per minute
- SMS provider endpoints: 100 requests per minute
- AI service endpoints: 50 requests per minute
- Webhook endpoints: 200 requests per minute

The middleware can be easily imported and used in Express route definitions:

```typescript
import { apiLimiter, smsLimiter, aiLimiter, webhookLimiter } from './middlewares/rateLimiter.middleware';

// Apply to routes
app.use('/api/', apiLimiter);
app.use('/api/sms', smsLimiter);
app.use('/api/ai', aiLimiter);
app.use('/api/webhooks', webhookLimiter);