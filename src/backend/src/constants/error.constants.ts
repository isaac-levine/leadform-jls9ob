/**
 * Standard HTTP status codes used for REST API responses
 * @enum {number}
 */
export enum HTTP_STATUS_CODES {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * Application-specific error codes for internal error tracking and handling
 * These codes help identify the specific type of error that occurred
 * @enum {string}
 */
export enum ERROR_CODES {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  SMS_PROVIDER_ERROR = 'SMS_PROVIDER_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * User-friendly error messages that avoid exposing sensitive system details
 * These messages are safe to display to end users
 * @const {Object.<string, string>}
 */
export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Please check your input and try again',
  AUTHENTICATION_REQUIRED: 'Please sign in to continue',
  INVALID_CREDENTIALS: 'Invalid sign in credentials',
  UNAUTHORIZED_ACCESS: 'You do not have permission to perform this action',
  RESOURCE_NOT_FOUND: 'The requested resource could not be found',
  DUPLICATE_RESOURCE: 'This resource already exists',
  SMS_PROVIDER_ERROR: 'Unable to send SMS message at this time',
  AI_SERVICE_ERROR: 'AI service is temporarily unavailable',
  DATABASE_ERROR: 'Unable to complete database operation',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred'
} as const;

/**
 * Type definition for error message keys to ensure type safety when accessing messages
 */
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

/**
 * Ensures error messages object is read-only to prevent accidental modifications
 */
Object.freeze(ERROR_MESSAGES);