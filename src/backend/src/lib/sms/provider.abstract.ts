/**
 * Abstract base class for SMS provider implementations
 * Provides a standardized interface for SMS provider integrations
 * Version: 1.0.0
 * 
 * @abstract
 * @class AbstractSMSProvider
 */

import { SMSConfig, SMSMessage, SMSProviderResponse } from '../../types/sms.types';
import { MessageStatus } from '../../types/message.types';
import { PHONE_REGEX } from '../../constants/regex.constants';

export abstract class AbstractSMSProvider {
  /**
   * Provider configuration
   * @protected
   */
  protected config: SMSConfig;

  /**
   * Provider initialization status
   * @protected
   */
  protected initialized: boolean = false;

  /**
   * Creates an instance of AbstractSMSProvider
   * @param {SMSConfig} config - Provider configuration
   * @throws {Error} If configuration is invalid
   */
  constructor(config: SMSConfig) {
    this.config = this.sanitizeConfig(config);
    this.initialized = false;

    if (!this.validateConfig()) {
      throw new Error('Invalid SMS provider configuration');
    }
  }

  /**
   * Initializes the SMS provider with configuration
   * Must be called before sending messages
   * 
   * @abstract
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  abstract initialize(): Promise<void>;

  /**
   * Validates provider configuration
   * Ensures all required fields are present and properly formatted
   * 
   * @protected
   * @returns {boolean} True if configuration is valid
   */
  protected validateConfig(): boolean {
    try {
      // Check required fields
      if (!this.config.provider || !this.config.accountSid || !this.config.authToken || !this.config.phoneNumber) {
        return false;
      }

      // Validate phone number format
      if (!PHONE_REGEX.test(this.config.phoneNumber)) {
        return false;
      }

      // Additional provider-specific validation can be implemented in derived classes
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sanitizes sensitive configuration data
   * Removes any potentially harmful characters from configuration values
   * 
   * @protected
   * @param {SMSConfig} config - Raw configuration object
   * @returns {SMSConfig} Sanitized configuration object
   */
  protected sanitizeConfig(config: SMSConfig): SMSConfig {
    return {
      ...config,
      accountSid: this.sanitizeString(config.accountSid),
      authToken: this.sanitizeString(config.authToken),
      phoneNumber: this.sanitizeString(config.phoneNumber)
    };
  }

  /**
   * Sanitizes string input to prevent injection attacks
   * 
   * @protected
   * @param {string} input - String to sanitize
   * @returns {string} Sanitized string
   */
  protected sanitizeString(input: string): string {
    return input.replace(/[^\w\s-+@.]/g, '');
  }

  /**
   * Sends an SMS message through the provider
   * Implements retry logic and standardized error handling
   * 
   * @abstract
   * @param {SMSMessage} message - Message to send
   * @returns {Promise<SMSProviderResponse>} Standardized provider response
   * @throws {Error} If provider is not initialized
   */
  abstract sendMessage(message: SMSMessage): Promise<SMSProviderResponse>;

  /**
   * Creates a standardized error response
   * 
   * @protected
   * @param {string} error - Error message
   * @returns {SMSProviderResponse} Error response object
   */
  protected createErrorResponse(error: string): SMSProviderResponse {
    return {
      success: false,
      providerMessageId: '',
      error: error,
      status: MessageStatus.FAILED,
      retryCount: 0,
      providerSpecificData: {},
      processedAt: new Date()
    };
  }

  /**
   * Creates a standardized success response
   * 
   * @protected
   * @param {string} providerMessageId - Provider-specific message ID
   * @param {number} retryCount - Number of retry attempts made
   * @returns {SMSProviderResponse} Success response object
   */
  protected createSuccessResponse(providerMessageId: string, retryCount: number = 0): SMSProviderResponse {
    return {
      success: true,
      providerMessageId,
      error: null,
      status: MessageStatus.SENT,
      retryCount,
      providerSpecificData: {},
      processedAt: new Date()
    };
  }

  /**
   * Validates message content and format
   * 
   * @protected
   * @param {SMSMessage} message - Message to validate
   * @returns {boolean} True if message is valid
   */
  protected validateMessage(message: SMSMessage): boolean {
    try {
      // Check required fields
      if (!message.to || !message.from || !message.body) {
        return false;
      }

      // Validate phone numbers
      if (!PHONE_REGEX.test(message.to) || !PHONE_REGEX.test(message.from)) {
        return false;
      }

      // Validate message content
      if (message.body.length === 0 || message.body.length > 1600) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if provider is initialized
   * 
   * @protected
   * @returns {boolean} True if provider is initialized
   */
  protected isInitialized(): boolean {
    return this.initialized;
  }
}