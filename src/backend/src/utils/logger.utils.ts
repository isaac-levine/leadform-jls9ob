import winston from 'winston';
import morgan from 'morgan';
import { AsyncLocalStorage } from 'async_hooks';
import { ERROR_CODES } from '../constants/error.constants';
import { Request, Response } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define log levels with numeric priorities
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  HTTP: 3,
  DEBUG: 4,
};

// Define sensitive fields that should be masked in logs
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'secret', 'authorization'];

// Regular expressions for PII detection
const PII_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /\+?\d{10,}/g,
  SSN: /\d{3}[-]?\d{2}[-]?\d{4}/g,
};

/**
 * Creates and configures a Winston logger instance with appropriate transports
 * @param options Configuration options for the logger
 */
const createLogger = (options: any = {}) => {
  const logDir = path.join(process.cwd(), 'logs');

  // Custom format including timestamp, correlation ID and request context
  const customFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf((info) => {
      const { timestamp, level, message, correlationId, ...meta } = info;
      return JSON.stringify({
        timestamp,
        level,
        message,
        correlationId,
        ...meta,
      });
    })
  );

  return winston.createLogger({
    levels: LOG_LEVELS,
    level: process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG',
    transports: [
      // Console transport with colorization
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
      // Error log file transport
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'ERROR',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: customFormat,
      }),
      // Combined log file transport
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: customFormat,
      }),
    ],
  });
};

/**
 * Sanitizes sensitive information from log data
 * @param data Object containing log data
 * @returns Sanitized data object
 */
const sanitizeLogData = (data: any): any => {
  if (!data) return data;
  
  if (typeof data !== 'object') return data;
  
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'string') {
      // Mask PII data
      sanitized[key] = sanitized[key]
        .replace(PII_PATTERNS.EMAIL, '[EMAIL]')
        .replace(PII_PATTERNS.PHONE, '[PHONE]')
        .replace(PII_PATTERNS.SSN, '[SSN]');
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
};

/**
 * Logger class providing secure logging capabilities with request context tracking
 */
class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private context: AsyncLocalStorage<Map<string, any>>;
  private correlationIdKey: string = 'correlationId';

  private constructor() {
    this.logger = createLogger();
    this.context = new AsyncLocalStorage();
  }

  /**
   * Gets singleton logger instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Creates middleware for request context tracking
   */
  public requestMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      const correlationId = req.headers['x-correlation-id'] || uuidv4();
      const contextMap = new Map();
      contextMap.set(this.correlationIdKey, correlationId);
      contextMap.set('requestId', uuidv4());
      contextMap.set('path', req.path);
      contextMap.set('method', req.method);

      this.context.run(contextMap, () => next());
    };
  }

  /**
   * Logs error messages with full context
   */
  public error(message: string, error?: Error, metadata: any = {}) {
    const context = this.getRequestContext();
    const errorData = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code || ERROR_CODES.INTERNAL_ERROR,
    } : {};

    this.logger.error(message, {
      ...context,
      ...sanitizeLogData(errorData),
      ...sanitizeLogData(metadata),
    });
  }

  /**
   * Logs warning messages
   */
  public warn(message: string, metadata: any = {}) {
    const context = this.getRequestContext();
    this.logger.warn(message, {
      ...context,
      ...sanitizeLogData(metadata),
    });
  }

  /**
   * Logs informational messages
   */
  public info(message: string, metadata: any = {}) {
    const context = this.getRequestContext();
    this.logger.info(message, {
      ...context,
      ...sanitizeLogData(metadata),
    });
  }

  /**
   * Logs HTTP request details
   */
  public http(req: Request, res: Response) {
    const context = this.getRequestContext();
    morgan(':method :url :status :response-time ms', {
      stream: {
        write: (message: string) => {
          this.logger.http(message.trim(), {
            ...context,
            ...sanitizeLogData({
              headers: req.headers,
              query: req.query,
              responseStatus: res.statusCode,
            }),
          });
        },
      },
    })(req, res, () => {});
  }

  /**
   * Logs debug messages
   */
  public debug(message: string, metadata: any = {}) {
    const context = this.getRequestContext();
    this.logger.debug(message, {
      ...context,
      ...sanitizeLogData(metadata),
    });
  }

  /**
   * Gets current request context
   */
  private getRequestContext(): object {
    const contextMap = this.context.getStore();
    if (!contextMap) return {};

    return {
      correlationId: contextMap.get(this.correlationIdKey),
      requestId: contextMap.get('requestId'),
      path: contextMap.get('path'),
      method: contextMap.get('method'),
    };
  }
}

// Export singleton logger instance
export const logger = Logger.getInstance();
```

This implementation provides a robust logging utility that addresses all the specified requirements:

1. Uses Winston for core logging functionality with multiple transports (console and file)
2. Implements secure logging with PII sanitization and sensitive data masking
3. Provides request context tracking with correlation IDs using AsyncLocalStorage
4. Includes different log levels (ERROR, WARN, INFO, HTTP, DEBUG)
5. Supports structured logging with metadata
6. Implements file rotation and size limits
7. Includes HTTP request logging via Morgan integration
8. Follows singleton pattern for global logger access
9. Provides comprehensive error logging with stack traces
10. Implements secure data sanitization for all log entries

The logger can be used throughout the application by importing the singleton instance:

```typescript
import { logger } from './utils/logger.utils';

// Usage examples:
logger.info('Operation completed', { userId: '123' });
logger.error('Operation failed', error, { orderId: '456' });
logger.http(req, res);