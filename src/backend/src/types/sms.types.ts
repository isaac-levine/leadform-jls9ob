/**
 * Type definitions for SMS provider integration and message handling
 * Implements provider-agnostic SMS architecture supporting multiple SMS providers
 * @module sms.types
 * @version 1.0.0
 */

import { MessageStatus } from './message.types';

/**
 * Enumeration of supported SMS providers
 * Add new providers here to extend provider support
 */
export enum SMSProvider {
  /** Twilio SMS provider integration */
  TWILIO = 'TWILIO',
  /** Custom SMS provider implementation */
  CUSTOM = 'CUSTOM'
}

/**
 * Interface defining SMS provider configuration
 * Contains all necessary parameters for provider integration
 */
export interface SMSConfig {
  /** Type of SMS provider being used */
  provider: SMSProvider;
  
  /** Provider account identifier */
  accountSid: string;
  
  /** Provider authentication token */
  authToken: string;
  
  /** Sender phone number in E.164 format */
  phoneNumber: string;
  
  /** Webhook URL for receiving delivery status updates */
  webhookUrl: string;
  
  /** Maximum number of retry attempts for failed messages */
  maxRetries: number;
  
  /** Rate limiting configuration */
  rateLimits: {
    /** Maximum requests per minute */
    requestsPerMinute: number;
    /** Maximum requests per day */
    requestsPerDay: number;
  };
}

/**
 * Interface defining SMS message structure
 * Used for sending messages through provider-agnostic layer
 */
export interface SMSMessage {
  /** Internal message identifier */
  messageId: string;
  
  /** Recipient phone number in E.164 format */
  to: string;
  
  /** Sender phone number in E.164 format */
  from: string;
  
  /** Message content */
  body: string;
  
  /** Additional metadata for message tracking */
  metadata: Record<string, any>;
  
  /** Optional scheduled send time */
  scheduledAt: Date | null;
  
  /** Number of send attempts made */
  retryCount: number;
}

/**
 * Interface defining standardized provider response
 * Normalizes responses across different providers
 */
export interface SMSProviderResponse {
  /** Whether the send operation was successful */
  success: boolean;
  
  /** Provider-specific message identifier */
  providerMessageId: string;
  
  /** Error message if send failed */
  error: string | null;
  
  /** Current message delivery status */
  status: MessageStatus;
  
  /** Number of retry attempts made */
  retryCount: number;
  
  /** Provider-specific response data */
  providerSpecificData: Record<string, any>;
  
  /** Timestamp of response processing */
  processedAt: Date;
}

/**
 * Interface defining webhook payload structure
 * Standardizes webhook handling across providers
 */
export interface SMSWebhookPayload {
  /** Provider-specific message identifier */
  providerMessageId: string;
  
  /** Updated message delivery status */
  status: MessageStatus;
  
  /** Webhook event timestamp */
  timestamp: Date;
  
  /** Error details if delivery failed */
  error: string | null;
  
  /** Raw webhook payload from provider */
  rawPayload: Record<string, any>;
  
  /** Timestamp of webhook processing */
  processedAt: Date;
  
  /** Webhook signature for verification */
  securitySignature: string;
}