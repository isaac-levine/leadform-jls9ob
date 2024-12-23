/**
 * Factory class for creating and managing SMS provider instances
 * Implements thread-safe singleton pattern with secure provider initialization
 * @version 1.0.0
 */

import { AbstractSMSProvider } from './provider.abstract';
import { TwilioProvider } from './providers/twilio.provider';
import { SMSConfig, SMSProvider } from '../../types/sms.types';

/**
 * Thread-safe singleton factory for SMS provider management
 * Implements secure provider initialization and caching
 */
export class SMSProviderFactory {
  private static instance: SMSProviderFactory;
  private providers: Map<string, AbstractSMSProvider>;
  private initialized: Map<string, boolean>;

  /**
   * Private constructor enforcing singleton pattern
   * Initializes provider and initialization status tracking
   */
  private constructor() {
    this.providers = new Map<string, AbstractSMSProvider>();
    this.initialized = new Map<string, boolean>();
  }

  /**
   * Gets singleton instance with thread safety
   * @returns {SMSProviderFactory} Singleton factory instance
   */
  public static getInstance(): SMSProviderFactory {
    if (!SMSProviderFactory.instance) {
      SMSProviderFactory.instance = new SMSProviderFactory();
    }
    return SMSProviderFactory.instance;
  }

  /**
   * Gets or creates provider instance with configuration validation
   * @param {SMSConfig} config Provider configuration
   * @returns {Promise<AbstractSMSProvider>} Initialized provider instance
   * @throws {Error} If configuration is invalid or initialization fails
   */
  public async getProvider(config: SMSConfig): Promise<AbstractSMSProvider> {
    try {
      if (!this.validateConfig(config)) {
        throw new Error('Invalid SMS provider configuration');
      }

      const providerKey = this.generateProviderKey(config);
      
      // Return cached provider if available and initialized
      if (this.providers.has(providerKey) && this.initialized.get(providerKey)) {
        return this.providers.get(providerKey)!;
      }

      // Create new provider if needed
      if (!this.providers.has(providerKey)) {
        const provider = this.createProvider(config);
        this.providers.set(providerKey, provider);
        this.initialized.set(providerKey, false);
      }

      // Initialize provider if not already initialized
      const provider = this.providers.get(providerKey)!;
      if (!this.initialized.get(providerKey)) {
        await provider.initialize();
        this.initialized.set(providerKey, true);
      }

      return provider;
    } catch (error) {
      throw new Error(`Failed to get SMS provider: ${(error as Error).message}`);
    }
  }

  /**
   * Creates new provider instance based on configuration
   * @param {SMSConfig} config Provider configuration
   * @returns {AbstractSMSProvider} New provider instance
   * @throws {Error} If provider type is unsupported
   */
  private createProvider(config: SMSConfig): AbstractSMSProvider {
    switch (config.provider) {
      case SMSProvider.TWILIO:
        return new TwilioProvider(config);
      default:
        throw new Error(`Unsupported SMS provider type: ${config.provider}`);
    }
  }

  /**
   * Validates provider configuration completeness and security
   * @param {SMSConfig} config Provider configuration to validate
   * @returns {boolean} True if configuration is valid
   */
  private validateConfig(config: SMSConfig): boolean {
    try {
      // Check required fields
      if (!config || !config.provider || !config.credentials) {
        return false;
      }

      // Validate provider type
      if (!Object.values(SMSProvider).includes(config.provider)) {
        return false;
      }

      // Validate credentials based on provider type
      switch (config.provider) {
        case SMSProvider.TWILIO:
          return this.validateTwilioConfig(config);
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Validates Twilio-specific configuration
   * @param {SMSConfig} config Twilio configuration
   * @returns {boolean} True if Twilio configuration is valid
   */
  private validateTwilioConfig(config: SMSConfig): boolean {
    const { credentials } = config;
    return !!(
      credentials.accountSid &&
      typeof credentials.accountSid === 'string' &&
      credentials.accountSid.startsWith('AC') &&
      credentials.authToken &&
      typeof credentials.authToken === 'string' &&
      credentials.phoneNumber &&
      typeof credentials.phoneNumber === 'string'
    );
  }

  /**
   * Generates unique key for provider caching
   * @param {SMSConfig} config Provider configuration
   * @returns {string} Unique provider key
   */
  private generateProviderKey(config: SMSConfig): string {
    return `${config.provider}_${config.credentials.accountSid}`;
  }
}