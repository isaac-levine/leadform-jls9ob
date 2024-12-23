/**
 * @fileoverview Comprehensive validation and sanitization utilities for secure input handling
 * @version 1.0.0
 * @module validation.utils
 * 
 * @security This module implements critical security controls for input validation
 * and sanitization. Any modifications require security review.
 */

import { z } from 'zod'; // v3.0.0
import {
  PHONE_REGEX,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  URL_REGEX
} from '../constants/regex.constants';

// Global validation constants
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_FIELD_LABEL_LENGTH = 100;
const MAX_FIELD_DESCRIPTION_LENGTH = 500;
const MAX_EMAIL_LENGTH = 254;
const MIN_FORM_FIELDS = 1;
const MAX_FORM_FIELDS = 50;

/**
 * Validation result interface for consistent return types
 */
interface ValidationResult<T = string> {
  isValid: boolean;
  value: T;
  errors: string[];
  metadata?: Record<string, any>;
}

/**
 * Form field validation interface
 */
interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox';
  label: string;
  description?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    customValidator?: (value: any) => boolean;
  };
}

/**
 * Form configuration interface
 */
interface FormConfig {
  id: string;
  title: string;
  description?: string;
  version: string;
  fields: FormField[];
  settings: {
    submitLabel: string;
    successMessage: string;
    errorMessage: string;
  };
}

/**
 * Sanitization options interface
 */
interface SanitizeOptions {
  allowHtml: boolean;
  maxLength?: number;
  trim: boolean;
  lowercase?: boolean;
  customSanitizer?: (value: string) => string;
}

/**
 * Validates phone numbers using E.164 format with comprehensive error checking
 * @param phoneNumber - Phone number to validate
 * @returns Validation result with normalized phone number
 */
export function validatePhoneNumber(phoneNumber: string): ValidationResult {
  const errors: string[] = [];
  let normalizedPhone = phoneNumber.trim().replace(/\s+/g, '');

  // Basic format validation
  if (!normalizedPhone.startsWith('+')) {
    errors.push('Phone number must start with country code (+)');
  }

  // Length validation
  if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
    errors.push('Phone number must be between 8 and 15 characters');
  }

  // Pattern validation
  if (!PHONE_REGEX.test(normalizedPhone)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    value: normalizedPhone,
    errors,
    metadata: {
      originalLength: phoneNumber.length,
      normalizedLength: normalizedPhone.length
    }
  };
}

/**
 * Validates email addresses with enhanced security checks
 * @param email - Email address to validate
 * @returns Validation result with normalized email
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  let normalizedEmail = email.trim().toLowerCase();

  // Length validation
  if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
    errors.push(`Email must not exceed ${MAX_EMAIL_LENGTH} characters`);
  }

  // Pattern validation
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.push('Invalid email format');
  }

  // Additional security checks
  if (normalizedEmail.includes('..') || normalizedEmail.includes('--')) {
    errors.push('Email contains invalid character sequences');
  }

  return {
    isValid: errors.length === 0,
    value: normalizedEmail,
    errors,
    metadata: {
      domain: normalizedEmail.split('@')[1],
      localPart: normalizedEmail.split('@')[0]
    }
  };
}

/**
 * Validates password strength with comprehensive security requirements
 * @param password - Password to validate
 * @returns Validation result with strength assessment
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  let strengthScore = 0;

  // Length validation
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters`);
  }

  // Pattern validation
  if (!PASSWORD_REGEX.test(password)) {
    errors.push('Password must contain uppercase, lowercase, number, and special character');
  }

  // Calculate strength score
  strengthScore += password.length >= 12 ? 2 : 1;
  strengthScore += /[A-Z].*[A-Z]/.test(password) ? 2 : 0;
  strengthScore += /\d.*\d/.test(password) ? 2 : 0;
  strengthScore += /[!@#$%^&*].*[!@#$%^&*]/.test(password) ? 2 : 0;

  return {
    isValid: errors.length === 0,
    value: password,
    errors,
    metadata: {
      strengthScore,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*]/.test(password)
    }
  };
}

/**
 * Validates form fields with comprehensive type checking and security measures
 * @param field - Form field configuration
 * @param value - Field value to validate
 * @returns Validation result with sanitized value
 */
export function validateFormField(field: FormField, value: any): ValidationResult {
  const errors: string[] = [];
  let sanitizedValue = value;

  // Required field validation
  if (field.required && (value === undefined || value === null || value === '')) {
    errors.push(`${field.label} is required`);
    return { isValid: false, value: sanitizedValue, errors };
  }

  // Type-specific validation
  switch (field.type) {
    case 'email':
      const emailResult = validateEmail(String(value));
      if (!emailResult.isValid) {
        errors.push(...emailResult.errors);
      }
      sanitizedValue = emailResult.value;
      break;

    case 'phone':
      const phoneResult = validatePhoneNumber(String(value));
      if (!phoneResult.isValid) {
        errors.push(...phoneResult.errors);
      }
      sanitizedValue = phoneResult.value;
      break;

    case 'text':
      sanitizedValue = sanitizeInput(String(value), {
        allowHtml: false,
        maxLength: field.validation?.max || MAX_FIELD_LABEL_LENGTH,
        trim: true
      });
      break;
  }

  // Custom validation pattern
  if (field.validation?.pattern) {
    const pattern = new RegExp(field.validation.pattern);
    if (!pattern.test(String(sanitizedValue))) {
      errors.push(`${field.label} format is invalid`);
    }
  }

  // Custom validator
  if (field.validation?.customValidator) {
    try {
      if (!field.validation.customValidator(sanitizedValue)) {
        errors.push(`${field.label} failed custom validation`);
      }
    } catch (error) {
      errors.push('Custom validation error occurred');
    }
  }

  return {
    isValid: errors.length === 0,
    value: sanitizedValue,
    errors,
    metadata: {
      fieldType: field.type,
      originalValue: value
    }
  };
}

/**
 * Validates complete form configuration with enhanced security and business rules
 * @param config - Form configuration to validate
 * @returns Validation result with normalized config
 */
export function validateFormConfig(config: FormConfig): ValidationResult<FormConfig> {
  const errors: string[] = [];
  const normalizedConfig = { ...config };

  // Validate basic form properties
  if (!config.title?.trim()) {
    errors.push('Form title is required');
  }

  // Validate field count
  if (!config.fields || config.fields.length < MIN_FORM_FIELDS) {
    errors.push(`Form must have at least ${MIN_FORM_FIELDS} field`);
  }
  if (config.fields && config.fields.length > MAX_FORM_FIELDS) {
    errors.push(`Form cannot exceed ${MAX_FORM_FIELDS} fields`);
  }

  // Validate individual fields
  if (config.fields) {
    const fieldIds = new Set<string>();
    config.fields.forEach((field, index) => {
      // Check for duplicate IDs
      if (fieldIds.has(field.id)) {
        errors.push(`Duplicate field ID found: ${field.id}`);
      }
      fieldIds.add(field.id);

      // Validate field properties
      if (!field.label?.trim()) {
        errors.push(`Field ${index + 1} missing label`);
      }
      if (field.label && field.label.length > MAX_FIELD_LABEL_LENGTH) {
        errors.push(`Field label exceeds maximum length: ${field.label}`);
      }
      if (field.description && field.description.length > MAX_FIELD_DESCRIPTION_LENGTH) {
        errors.push(`Field description exceeds maximum length: ${field.id}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    value: normalizedConfig,
    errors,
    metadata: {
      fieldCount: config.fields?.length || 0,
      version: config.version
    }
  };
}

/**
 * Sanitizes input strings with comprehensive security measures
 * @param input - String to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeInput(input: string, options: SanitizeOptions): string {
  let sanitized = input;

  // Trim whitespace if specified
  if (options.trim) {
    sanitized = sanitized.trim();
  }

  // Convert to lowercase if specified
  if (options.lowercase) {
    sanitized = sanitized.toLowerCase();
  }

  // Remove control characters and invisible characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Escape HTML if not allowed
  if (!options.allowHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Apply length limit if specified
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.slice(0, options.maxLength);
  }

  // Apply custom sanitizer if provided
  if (options.customSanitizer) {
    sanitized = options.customSanitizer(sanitized);
  }

  return sanitized;
}

// Export Zod schemas for type validation
export const FormFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['text', 'email', 'phone', 'select', 'checkbox']),
  label: z.string().min(1).max(MAX_FIELD_LABEL_LENGTH),
  description: z.string().max(MAX_FIELD_DESCRIPTION_LENGTH).optional(),
  required: z.boolean(),
  validation: z.object({
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional()
  }).optional()
});

export const FormConfigSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(MAX_FIELD_LABEL_LENGTH),
  description: z.string().max(MAX_FIELD_DESCRIPTION_LENGTH).optional(),
  version: z.string(),
  fields: z.array(FormFieldSchema).min(MIN_FORM_FIELDS).max(MAX_FORM_FIELDS),
  settings: z.object({
    submitLabel: z.string().min(1),
    successMessage: z.string().min(1),
    errorMessage: z.string().min(1)
  })
});