import { MessageType } from '../types/message.types';

/**
 * Default system messages used for standard communications.
 * These templates provide consistent messaging for common scenarios.
 */
export const DEFAULT_MESSAGES = {
  /** Initial welcome message sent to new leads */
  WELCOME: "Welcome! Thank you for your interest. I'm your AI assistant and I'll be helping you today. You can opt-out anytime by replying STOP.",
  
  /** Message sent when a lead opts out */
  OPT_OUT: "You've been successfully unsubscribed from our messages. Reply START to opt back in.",
  
  /** Notification when human agent takes over conversation */
  HUMAN_TAKEOVER: "You're now connected with a human agent who will assist you further.",
  
  /** Notification when conversation returns to AI handling */
  AI_HANDOFF: "I'm your AI assistant again. I'll continue helping you with your inquiry.",
  
  /** System unavailability message */
  SYSTEM_UNAVAILABLE: "Our messaging system is temporarily unavailable. Please try again later.",
} as const;

/**
 * Error messages for various SMS operation failures.
 * Used for consistent error reporting and logging.
 */
export const MESSAGE_ERRORS = {
  /** Message delivery failure */
  SEND_FAILED: "Failed to send message. Please retry or contact support if the issue persists.",
  
  /** Invalid phone number format */
  INVALID_PHONE: "Invalid phone number format. Please ensure the number follows E.164 format.",
  
  /** Attempted message to opted-out lead */
  OPTED_OUT: "Cannot send message: recipient has opted out of communications.",
  
  /** Rate limit exceeded */
  RATE_LIMITED: "Message rate limit exceeded. Please wait before sending more messages.",
  
  /** Maximum retry attempts reached */
  RETRY_EXCEEDED: "Message delivery failed after maximum retry attempts.",
  
  /** Invalid message content */
  INVALID_MESSAGE: "Invalid message content. Please check the message and try again.",
} as const;

/**
 * System limits and constraints for message handling.
 * Defines operational boundaries for the messaging system.
 */
export const MESSAGE_LIMITS = {
  /** Maximum message length in characters */
  MAX_LENGTH: 1600,
  
  /** Messages per minute rate limit */
  RATE_LIMIT: 100,
  
  /** Maximum retry attempts for failed messages */
  RETRY_ATTEMPTS: 3,
  
  /** Delay between retry attempts in milliseconds */
  RETRY_DELAY_MS: 5000,
  
  /** Maximum size of message processing queue */
  MAX_QUEUE_SIZE: 1000,
} as const;

/**
 * Parameterized message templates for different scenarios.
 * Templates use ${variable} syntax for dynamic content.
 */
export const MESSAGE_TEMPLATES = {
  /** AI response template with context */
  AI_RESPONSE: {
    type: MessageType.AI,
    template: "I understand you're interested in ${topic}. ${response}",
  },
  
  /** Follow-up message template */
  FOLLOW_UP: {
    type: MessageType.AI,
    template: "Hi ${name}, following up on your inquiry about ${topic}. Would you like to learn more?",
  },
  
  /** Confirmation message template */
  CONFIRMATION: {
    type: MessageType.TEMPLATE,
    template: "Your ${action} has been confirmed for ${datetime}. Reply C to confirm or R to reschedule.",
  },
  
  /** Appointment reminder template */
  APPOINTMENT_REMINDER: {
    type: MessageType.TEMPLATE,
    template: "Reminder: Your appointment is scheduled for ${datetime}. Reply C to confirm or R to reschedule.",
  },
  
  /** Feedback request template */
  FEEDBACK_REQUEST: {
    type: MessageType.TEMPLATE,
    template: "Thank you for using our service. How would you rate your experience? Reply with 1-5 (1=Poor, 5=Excellent)",
  },
} as const;

/**
 * Message processing configuration constants.
 * Defines system-wide processing parameters.
 */
export const MESSAGE_PROCESSING = {
  /** Queue processing batch size */
  BATCH_SIZE: 50,
  
  /** Queue polling interval in milliseconds */
  POLL_INTERVAL_MS: 1000,
  
  /** Maximum message age in queue (milliseconds) */
  MAX_QUEUE_AGE_MS: 300000, // 5 minutes
  
  /** Default timeout for message operations (milliseconds) */
  OPERATION_TIMEOUT_MS: 30000, // 30 seconds
} as const;

/**
 * Message validation constants.
 * Used for content validation and sanitization.
 */
export const MESSAGE_VALIDATION = {
  /** Minimum message length */
  MIN_LENGTH: 1,
  
  /** Maximum URLs allowed in message */
  MAX_URLS: 3,
  
  /** Maximum consecutive characters */
  MAX_CONSECUTIVE_CHARS: 5,
  
  /** Restricted characters regex */
  RESTRICTED_CHARS: /[<>{}]/g,
} as const;