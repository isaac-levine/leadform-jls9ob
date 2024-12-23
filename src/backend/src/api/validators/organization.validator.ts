/**
 * @fileoverview Organization validation schemas and functions using Zod
 * Implements comprehensive validation for organization management operations
 * with enhanced security measures and provider-specific configurations.
 * 
 * @version 1.0.0
 * @module organization.validator
 * 
 * @security This module implements critical validation controls.
 * Any modifications require security review.
 */

import { z } from 'zod'; // v3.0.0
import { OrganizationStatus, SMSProviderType } from '../../types/organization.types';
import { UserRole } from '../../types/auth.types';
import { sanitizeInput } from '../../utils/validation.utils';
import { PHONE_REGEX, URL_REGEX } from '../../constants/regex.constants';

// Validation constants
const MIN_ORG_NAME_LENGTH = 2;
const MAX_ORG_NAME_LENGTH = 100;
const ORG_NAME_PATTERN = /^[a-zA-Z0-9\s\-_]+$/;
const RESTRICTED_WORDS = ['admin', 'system', 'restricted'];

// Provider-specific configuration requirements
const SMS_PROVIDER_CONFIGS = {
  [SMSProviderType.TWILIO]: {
    required: ['accountSid', 'authToken', 'fromNumber'],
    optional: ['webhookUrl', 'messagingServiceSid']
  },
  [SMSProviderType.CUSTOM]: {
    required: ['apiKey', 'apiSecret', 'fromNumber', 'webhookUrl'],
    optional: ['customHeaders', 'retryConfig']
  }
};

/**
 * SMS provider configuration schema with provider-specific validation
 */
const smsConfigSchema = z.object({
  providerType: z.nativeEnum(SMSProviderType),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  fromNumber: z.string().regex(PHONE_REGEX, 'Invalid phone number format'),
  webhookUrl: z.string().regex(URL_REGEX, 'Invalid webhook URL').optional(),
  customConfig: z.record(z.unknown()).optional(),
}).refine((data) => {
  const config = SMS_PROVIDER_CONFIGS[data.providerType];
  return config.required.every(field => data[field] !== undefined);
}, {
  message: 'Missing required provider-specific configuration fields'
});

/**
 * Organization creation schema with enhanced validation rules
 */
export const createOrganizationSchema = z.object({
  name: z.string()
    .min(MIN_ORG_NAME_LENGTH, `Organization name must be at least ${MIN_ORG_NAME_LENGTH} characters`)
    .max(MAX_ORG_NAME_LENGTH, `Organization name cannot exceed ${MAX_ORG_NAME_LENGTH} characters`)
    .regex(ORG_NAME_PATTERN, 'Organization name contains invalid characters')
    .transform(val => sanitizeInput(val, { 
      allowHtml: false, 
      trim: true,
      maxLength: MAX_ORG_NAME_LENGTH 
    }))
    .refine(
      name => !RESTRICTED_WORDS.some(word => name.toLowerCase().includes(word)),
      'Organization name contains restricted words'
    ),
  smsConfig: smsConfigSchema,
  metadata: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional()
});

/**
 * Organization update schema with status transition validation
 */
export const updateOrganizationSchema = createOrganizationSchema.extend({
  status: z.nativeEnum(OrganizationStatus).optional(),
  smsConfig: smsConfigSchema.optional()
}).refine((data) => {
  if (data.status === OrganizationStatus.SUSPENDED) {
    return data.metadata?.suspensionReason !== undefined;
  }
  return true;
}, {
  message: 'Suspension reason is required when status is SUSPENDED'
});

/**
 * Member addition schema with role-based validation
 */
export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(UserRole).refine(
    role => role !== UserRole.ADMIN,
    'Cannot assign system admin role through organization membership'
  ),
  permissions: z.array(z.string()).optional()
});

/**
 * Validates organization name with enhanced business rules
 * @param name Organization name to validate
 * @returns Validation result with detailed error messages
 */
export function validateOrganizationName(name: string): { 
  isValid: boolean; 
  errors: string[]; 
} {
  const errors: string[] = [];
  const sanitized = sanitizeInput(name, {
    allowHtml: false,
    trim: true,
    maxLength: MAX_ORG_NAME_LENGTH
  });

  // Length validation
  if (sanitized.length < MIN_ORG_NAME_LENGTH) {
    errors.push(`Organization name must be at least ${MIN_ORG_NAME_LENGTH} characters`);
  }
  if (sanitized.length > MAX_ORG_NAME_LENGTH) {
    errors.push(`Organization name cannot exceed ${MAX_ORG_NAME_LENGTH} characters`);
  }

  // Pattern validation
  if (!ORG_NAME_PATTERN.test(sanitized)) {
    errors.push('Organization name contains invalid characters');
  }

  // Restricted words validation
  if (RESTRICTED_WORDS.some(word => sanitized.toLowerCase().includes(word))) {
    errors.push('Organization name contains restricted words');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates SMS provider configuration with provider-specific rules
 * @param config SMS provider configuration to validate
 * @returns Validation result with detailed error messages
 */
export function validateSMSConfig(config: z.infer<typeof smsConfigSchema>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const providerConfig = SMS_PROVIDER_CONFIGS[config.providerType];

  // Required fields validation
  providerConfig.required.forEach(field => {
    if (!config[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Phone number validation
  if (!PHONE_REGEX.test(config.fromNumber)) {
    errors.push('Invalid from number format');
  }

  // Webhook URL validation if provided
  if (config.webhookUrl && !URL_REGEX.test(config.webhookUrl)) {
    errors.push('Invalid webhook URL format');
  }

  // Provider-specific validation
  if (config.providerType === SMSProviderType.TWILIO) {
    if (!/^AC[a-zA-Z0-9]{32}$/.test(config.apiKey)) {
      errors.push('Invalid Twilio Account SID format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}