/**
 * Twilio-specific implementation of the SMS provider abstraction layer
 * Provides enhanced error handling, retry logic, and secure message processing
 * @version 1.0.0
 */

import { Twilio, MessageInstance } from 'twilio'; // twilio v4.x
import { Logger } from 'winston'; // winston v3.x
import { AbstractSMSProvider } from '../provider.abstract';
import { SMSConfig, SMSMessage, SMSProviderResponse } from '../../../types/sms.types';
import { MessageStatus } from '../../../types/message.types';
import { PHONE_REGEX } from '../../../constants/regex.constants';

/**
 * Interface for Twilio-specific error handling
 */
interface TwilioError {
  code: number;
  message: string;
  status: number;
}

/**
 * Rate limiter implementation for Twilio API requests
 */
class RateLimiter {
  private requestCount: number = 0;
  private lastReset: Date = new Date();
  private readonly maxRequestsPerMinute: number;

  constructor(maxRequests: number) {
    this.maxRequestsPerMinute = maxRequests;
  }

  canMakeRequest(): boolean {
    const now = new Date();
    if (now.getTime() - this.lastReset.getTime() > 60000) {
      this.requestCount = 0;
      this.lastReset = now;
    }
    return this.requestCount < this.maxRequestsPerMinute;
  }

  incrementCount(): void {
    this.requestCount++;
  }
}

/**
 * Enhanced Twilio provider implementation with retry logic and monitoring
 */
export class TwilioProvider extends AbstractSMSProvider {
  private twilioClient: Twilio | null = null;
  private readonly logger: Logger;
  private readonly rateLimiter: RateLimiter;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff delays

  constructor(config: SMSConfig) {
    super(config);
    this.logger = this.setupLogger();
    this.rateLimiter = new RateLimiter(config.rateLimits?.requestsPerMinute || 100);
  }

  /**
   * Initializes the Twilio client with enhanced error handling
   */
  public async initialize(): Promise<void> {
    try {
      if (!this.validateConfig()) {
        throw new Error('Invalid Twilio configuration');
      }

      this.twilioClient = new Twilio(
        this.config.accountSid,
        this.config.authToken,
        {
          lazyLoading: true,
          timeout: 30000 // 30 second timeout
        }
      );

      this.initialized = true;
      this.logger.info('Twilio provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Twilio provider', { error });
      throw error;
    }
  }

  /**
   * Validates Twilio-specific configuration
   */
  protected validateConfig(): boolean {
    try {
      if (!super.validateConfig()) {
        return false;
      }

      // Validate Twilio-specific format for accountSid
      if (!this.config.accountSid.startsWith('AC')) {
        this.logger.error('Invalid Twilio account SID format');
        return false;
      }

      // Validate phone number format
      if (!PHONE_REGEX.test(this.config.phoneNumber)) {
        this.logger.error('Invalid phone number format');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Configuration validation failed', { error });
      return false;
    }
  }

  /**
   * Sends SMS message using Twilio API with retry logic
   */
  public async sendMessage(message: SMSMessage): Promise<SMSProviderResponse> {
    if (!this.isInitialized() || !this.twilioClient) {
      throw new Error('Twilio provider not initialized');
    }

    let lastError: Error | null = null;
    let twilioResponse: MessageInstance | null = null;

    // Implement retry logic with exponential backoff
    for (let attempt = 0; attempt < TwilioProvider.RETRY_DELAYS.length; attempt++) {
      try {
        if (!this.rateLimiter.canMakeRequest()) {
          await this.sleep(1000); // Wait if rate limit reached
          continue;
        }

        this.rateLimiter.incrementCount();
        twilioResponse = await this.twilioClient.messages.create({
          to: message.to,
          from: this.config.phoneNumber,
          body: message.body,
          statusCallback: this.config.webhookUrl
        });

        // Success - break retry loop
        break;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Send attempt ${attempt + 1} failed`, { error });
        
        if (this.shouldRetry(error as TwilioError)) {
          await this.sleep(TwilioProvider.RETRY_DELAYS[attempt]);
          continue;
        }
        break;
      }
    }

    if (!twilioResponse) {
      return this.createErrorResponse(lastError?.message || 'Failed to send message');
    }

    return {
      success: true,
      providerMessageId: twilioResponse.sid,
      error: null,
      status: this.mapTwilioStatus(twilioResponse.status),
      retryCount: 0,
      providerSpecificData: {
        price: twilioResponse.price,
        errorCode: twilioResponse.errorCode,
        errorMessage: twilioResponse.errorMessage
      },
      processedAt: new Date()
    };
  }

  /**
   * Maps Twilio message status to internal MessageStatus enum
   */
  private mapTwilioStatus(twilioStatus: string): MessageStatus {
    const statusMap: Record<string, MessageStatus> = {
      'queued': MessageStatus.QUEUED,
      'sent': MessageStatus.SENT,
      'delivered': MessageStatus.DELIVERED,
      'failed': MessageStatus.FAILED,
      'undelivered': MessageStatus.FAILED
    };
    return statusMap[twilioStatus.toLowerCase()] || MessageStatus.FAILED;
  }

  /**
   * Determines if error is retryable based on Twilio error codes
   */
  private shouldRetry(error: TwilioError): boolean {
    const retryableCodes = [
      429, // Too Many Requests
      500, // Internal Server Error
      503  // Service Unavailable
    ];
    return retryableCodes.includes(error.status);
  }

  /**
   * Sets up Winston logger with Twilio-specific configuration
   */
  private setupLogger(): Logger {
    // Implementation would configure Winston logger
    // Placeholder return type for compilation
    return {} as Logger;
  }

  /**
   * Utility method for implementing sleep/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}