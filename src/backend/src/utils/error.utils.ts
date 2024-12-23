import { HTTP_STATUS_CODES, ERROR_CODES, ERROR_MESSAGES } from '../constants/error.constants';

/**
 * Interface for error metadata containing additional context
 */
interface ErrorMetadata {
  requestId?: string;
  timestamp?: Date;
  path?: string;
  [key: string]: any;
}

/**
 * Custom application error class with enhanced security and monitoring features
 * @class AppError
 * @extends Error
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  private readonly metadata: ErrorMetadata;

  /**
   * Creates an instance of AppError with comprehensive error details
   * @param {string} message - User-safe error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Application-specific error code
   * @param {boolean} isOperational - Indicates if error is operational or programming
   */
  constructor(
    message: string,
    statusCode: number = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    errorCode: string = ERROR_CODES.INTERNAL_ERROR,
    isOperational: boolean = true
  ) {
    // Ensure message is sanitized before passing to parent
    super(message);

    // Set error properties
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    
    // Initialize metadata
    this.metadata = {
      timestamp: this.timestamp,
      errorCode: this.errorCode,
      statusCode: this.statusCode
    };

    // Capture stack trace while removing constructor call
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Sets additional metadata for the error
   * @param {ErrorMetadata} metadata - Additional error context
   */
  public setMetadata(metadata: ErrorMetadata): void {
    Object.assign(this.metadata, metadata);
    if (metadata.requestId) {
      this.requestId = metadata.requestId;
    }
  }

  /**
   * Converts error to JSON format with security considerations
   * @returns {object} Sanitized error object
   */
  public toJSON(): object {
    const errorResponse = {
      status: 'error',
      code: this.errorCode,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId
    };

    // Only include non-sensitive metadata in production
    if (process.env.NODE_ENV !== 'production') {
      return {
        ...errorResponse,
        stack: this.stack,
        metadata: this.metadata
      };
    }

    return errorResponse;
  }
}

/**
 * Determines if an error is operational (expected) or programming (unexpected)
 * @param {Error} error - Error to classify
 * @returns {boolean} True if operational, false if programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }

  // Consider all unknown errors as programming errors
  return false;
}

/**
 * Formats error object into standardized structure for API responses
 * @param {Error} error - Error to format
 * @param {object} metadata - Additional error context
 * @returns {object} Formatted error response
 */
export function formatError(error: Error, metadata: ErrorMetadata = {}): object {
  // Handle AppError instances
  if (error instanceof AppError) {
    error.setMetadata(metadata);
    return error.toJSON();
  }

  // Handle unknown errors
  const appError = new AppError(
    ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    ERROR_CODES.INTERNAL_ERROR,
    false
  );
  appError.setMetadata(metadata);

  // Log unknown errors for monitoring
  console.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    metadata
  });

  return appError.toJSON();
}

/**
 * Creates a validation error instance
 * @param {string} message - Validation error message
 * @returns {AppError} Validation error instance
 */
export function createValidationError(message: string): AppError {
  return new AppError(
    message || ERROR_MESSAGES.VALIDATION_ERROR,
    HTTP_STATUS_CODES.BAD_REQUEST,
    ERROR_CODES.VALIDATION_ERROR,
    true
  );
}

/**
 * Creates an authentication error instance
 * @param {string} message - Authentication error message
 * @returns {AppError} Authentication error instance
 */
export function createAuthenticationError(message: string): AppError {
  return new AppError(
    message || ERROR_MESSAGES.AUTHENTICATION_REQUIRED,
    HTTP_STATUS_CODES.UNAUTHORIZED,
    ERROR_CODES.AUTHENTICATION_ERROR,
    true
  );
}

/**
 * Creates a not found error instance
 * @param {string} message - Not found error message
 * @returns {AppError} Not found error instance
 */
export function createNotFoundError(message: string): AppError {
  return new AppError(
    message || ERROR_MESSAGES.RESOURCE_NOT_FOUND,
    HTTP_STATUS_CODES.NOT_FOUND,
    ERROR_CODES.RESOURCE_NOT_FOUND,
    true
  );
}