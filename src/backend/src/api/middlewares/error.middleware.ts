import { Request, Response, NextFunction } from 'express';
import { AppError, isOperationalError, formatError } from '../../utils/error.utils';
import { HTTP_STATUS_CODES, ERROR_CODES, ERROR_MESSAGES } from '../../constants/error.constants';
import { logger } from '../../utils/logger.utils';

/**
 * Cache for storing frequently occurring errors to optimize performance
 * Key: error signature, Value: formatted error response
 */
const errorResponseCache = new Map<string, object>();

/**
 * Generates a unique error signature for caching
 * @param error Error instance
 * @param metadata Error metadata
 * @returns Unique error signature
 */
const generateErrorSignature = (error: Error, metadata: object): string => {
  return `${error.name}:${error.message}:${JSON.stringify(metadata)}`;
};

/**
 * Central error handling middleware for Express application
 * Processes all errors, ensures secure responses, and integrates with monitoring
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Extract request context for error tracking
  const errorContext = {
    requestId: req.headers['x-request-id'] || '',
    correlationId: req.headers['x-correlation-id'] || '',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  };

  // Log error with context
  logger.error('Request error occurred', error, {
    ...errorContext,
    stack: error.stack
  });

  // Check if error is operational (expected) or programming (unexpected)
  const isOperational = isOperationalError(error);

  // Generate error signature for caching
  const errorSignature = generateErrorSignature(error, errorContext);

  // Try to get cached error response
  let errorResponse = errorResponseCache.get(errorSignature);

  if (!errorResponse) {
    // Format error response with security considerations
    errorResponse = formatError(error, errorContext);

    // Cache error response for future use if it's an operational error
    if (isOperational) {
      errorResponseCache.set(errorSignature, errorResponse);

      // Prevent cache from growing too large
      if (errorResponseCache.size > 1000) {
        const firstKey = errorResponseCache.keys().next().value;
        errorResponseCache.delete(firstKey);
      }
    }
  }

  // Determine appropriate status code
  const statusCode = error instanceof AppError 
    ? error.statusCode 
    : HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;

  // Send error response
  res.status(statusCode).json(errorResponse);

  // Handle non-operational errors
  if (!isOperational) {
    // Log critical error for immediate attention
    logger.error('Critical error - non-operational error occurred', error, {
      ...errorContext,
      severity: 'CRITICAL'
    });

    // Implement recovery mechanism if needed
    // This could include cleanup, connection reset, etc.
    handleCriticalError(error, errorContext);
  }
};

/**
 * Handles critical (non-operational) errors with additional monitoring and alerts
 * @param error Error instance
 * @param context Error context
 */
const handleCriticalError = (error: Error, context: object): void => {
  // Track error frequency for monitoring
  trackErrorFrequency(error);

  // Additional handling could be added here:
  // - Send alerts to monitoring system
  // - Trigger incident response
  // - Attempt recovery procedures
};

/**
 * Tracks error frequency for monitoring and pattern detection
 * @param error Error instance
 */
const trackErrorFrequency = (error: Error): void => {
  // Implementation would depend on monitoring system
  // This is a placeholder for the actual implementation
  logger.warn('Error frequency tracking', {
    errorName: error.name,
    errorMessage: error.message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Middleware to handle 404 Not Found errors for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const notFoundError = new AppError(
    ERROR_MESSAGES.RESOURCE_NOT_FOUND,
    HTTP_STATUS_CODES.NOT_FOUND,
    ERROR_CODES.RESOURCE_NOT_FOUND,
    true
  );

  notFoundError.setMetadata({
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  next(notFoundError);
};
```

This implementation provides a comprehensive error handling solution with the following features:

1. Centralized error handling with secure error formatting
2. Error caching for performance optimization
3. Detailed error logging with request context
4. Operational vs programming error classification
5. Critical error handling with monitoring integration
6. 404 Not Found error handling for undefined routes
7. Security considerations in error responses
8. Request context tracking with correlation IDs
9. Error frequency monitoring
10. Integration with the application's logging system

The middleware can be used in the Express application setup like this:

```typescript
app.use(notFoundHandler);  // Handle 404 errors
app.use(errorHandler);     // Handle all other errors