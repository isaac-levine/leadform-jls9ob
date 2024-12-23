/**
 * @fileoverview Centralized TypeScript constants module defining all status enums 
 * and values used across the lead capture and SMS messaging system.
 * @version 1.0.0
 */

/**
 * Enum representing all possible message delivery statuses in the SMS system
 * Used for tracking message state throughout the delivery lifecycle
 */
export enum MESSAGE_STATUS {
  QUEUED = 'QUEUED',       // Message is queued for sending
  SENT = 'SENT',          // Message has been sent to provider
  DELIVERED = 'DELIVERED', // Message confirmed delivered to recipient
  FAILED = 'FAILED',      // Message delivery failed
  RETRY = 'RETRY',        // Message flagged for retry after failure
  BLOCKED = 'BLOCKED'     // Message blocked (e.g. due to opt-out)
}

/**
 * Enum representing lead lifecycle states from initial capture through conversion
 * Used for tracking lead progression and status
 */
export enum LEAD_STATUS {
  NEW = 'NEW',               // Fresh lead from form submission
  CONTACTED = 'CONTACTED',   // Initial outreach made
  ENGAGED = 'ENGAGED',       // Lead has responded/interacted
  CONVERTED = 'CONVERTED',   // Lead has completed desired action
  CLOSED = 'CLOSED',         // Lead opportunity closed
  UNSUBSCRIBED = 'UNSUBSCRIBED', // Lead opted out
  INVALID = 'INVALID'        // Lead determined to be invalid
}

/**
 * Enum for classifying message flow direction and system messages
 * Used to identify message source and destination
 */
export enum MESSAGE_DIRECTION {
  INBOUND = 'INBOUND',     // Message from lead to system
  OUTBOUND = 'OUTBOUND',   // Message from system to lead
  SYSTEM = 'SYSTEM'        // Internal system message/notification
}

/**
 * Enum for identifying message sender types
 * Used to track source/originator of messages
 */
export enum MESSAGE_TYPE {
  AI = 'AI',               // AI-generated response
  HUMAN = 'HUMAN',         // Human agent response
  TEMPLATE = 'TEMPLATE',   // Pre-defined template message
  AUTOMATED = 'AUTOMATED'  // System-automated message
}

/**
 * Enum representing form activation states
 * Used to control form visibility and functionality
 */
export enum FORM_STATUS {
  ACTIVE = true,           // Form is live and accepting submissions
  INACTIVE = false,        // Form is disabled/not accepting submissions
  DRAFT = false           // Form is in draft/editing mode
}

/**
 * Standard HTTP status codes used across the application
 * Following REST API best practices
 */
export const STATUS_CODES = {
  // Success Codes (2xx)
  SUCCESS: 200,           // Request succeeded
  CREATED: 201,          // Resource created successfully
  ACCEPTED: 202,         // Request accepted for processing
  NO_CONTENT: 204,       // Request succeeded with no content to return

  // Client Error Codes (4xx)
  BAD_REQUEST: 400,      // Invalid request format/parameters
  UNAUTHORIZED: 401,     // Authentication required
  FORBIDDEN: 403,        // Authenticated but not authorized
  NOT_FOUND: 404,        // Requested resource not found
  CONFLICT: 409,         // Request conflicts with current state
  TOO_MANY_REQUESTS: 429, // Rate limit exceeded

  // Server Error Codes (5xx)
  INTERNAL_ERROR: 500,   // Unexpected server error
  SERVICE_UNAVAILABLE: 503 // Service temporarily unavailable
} as const;

// Type assertion to ensure STATUS_CODES is readonly
Object.freeze(STATUS_CODES);