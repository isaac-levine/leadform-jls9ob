/**
 * SMS Configuration Module
 * Implements provider-agnostic SMS integration layer with enhanced security and validation
 * @module sms.config
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.0.0
import { SMSProvider, SMSConfig } from '../types/sms.types';

// Load environment variables
config();

// Regular expressions for validation
const PHONE_NUMBER_REGEX = /^\+[1-9]\d{1,14}$/;
const WEBHOOK_URL_REGEX = /^https:\/\/[\w\-\.]+[a-zA-Z]{2,}(\/\S*)?$/;

/**
 * Validates phone number format according to E.164 standard
 * @param phoneNumber - Phone number to validate
 * @returns boolean indicating if phone number is valid
 */
const validatePhoneNumber = (phoneNumber: string): boolean => {
  if (!phoneNumber || !PHONE_NUMBER_REGEX.test(phoneNumber)) {
    throw new Error('Invalid phone number format. Must be in E.164 format (e.g., +1234567890)');
  }
  return true;
};

/**
 * Validates webhook URL format and security requirements
 * @param webhookUrl - Webhook URL to validate
 * @returns boolean indicating if webhook URL is valid
 */
const validateWebhookUrl = (webhookUrl: string): boolean => {
  if (!webhookUrl || !WEBHOOK_URL_REGEX.test(webhookUrl)) {
    throw new Error('Invalid webhook URL format. Must be HTTPS URL');
  }
  return true;
};

/**
 * Validates the SMS configuration values with enhanced security checks
 * @throws Error if configuration is invalid
 * @returns boolean indicating if configuration is valid
 */
const validateSMSConfig = (): boolean => {
  // Check required environment variables
  if (!process.env.SMS_ACCOUNT_SID || !process.env.SMS_AUTH_TOKEN) {
    throw new Error('Missing required SMS credentials in environment variables');
  }

  // Validate SMS provider
  const provider = process.env.SMS_PROVIDER || SMSProvider.TWILIO;
  if (!Object.values(SMSProvider).includes(provider as SMSProvider)) {
    throw new Error('Invalid SMS provider specified');
  }

  // Validate phone number
  if (process.env.SMS_PHONE_NUMBER) {
    validatePhoneNumber(process.env.SMS_PHONE_NUMBER);
  }

  // Validate webhook URL
  if (process.env.SMS_WEBHOOK_URL) {
    validateWebhookUrl(process.env.SMS_WEBHOOK_URL);
  }

  // Validate rate limit
  const rateLimit = parseInt(process.env.SMS_RATE_LIMIT || '100', 10);
  if (isNaN(rateLimit) || rateLimit <= 0) {
    throw new Error('Invalid rate limit value. Must be a positive number');
  }

  return true;
};

// Validate configuration on module load
validateSMSConfig();

/**
 * SMS configuration object with validated values
 * @constant
 */
export const smsConfig: SMSConfig = {
  provider: (process.env.SMS_PROVIDER as SMSProvider) || SMSProvider.TWILIO,
  accountSid: process.env.SMS_ACCOUNT_SID!,
  authToken: process.env.SMS_AUTH_TOKEN!,
  phoneNumber: process.env.SMS_PHONE_NUMBER || '',
  webhookUrl: process.env.SMS_WEBHOOK_URL || '',
  maxRetries: parseInt(process.env.SMS_MAX_RETRIES || '3', 10),
  rateLimits: {
    requestsPerMinute: parseInt(process.env.SMS_RATE_LIMIT || '100', 10),
    requestsPerDay: parseInt(process.env.SMS_DAILY_RATE_LIMIT || '10000', 10)
  }
};

// Freeze configuration object to prevent runtime modifications
Object.freeze(smsConfig);
Object.freeze(smsConfig.rateLimits);

export default smsConfig;