/**
 * @file Frontend validation utilities for form fields and user inputs
 * @version 1.0.0
 * @description Implements comprehensive client-side validation with zod schemas
 * for immediate feedback and data protection
 */

import { z } from 'zod'; // v3.22.0
import { FormFieldType, FormFieldValidation } from '../types/form.types';

// Regular expression patterns for validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
const URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

// Validation constants
const MAX_FIELD_LENGTH = 1000;
const MIN_FIELD_LENGTH = 1;

/**
 * Interface for validation result
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Sanitizes input string to prevent XSS attacks
 * @param input - Raw input string
 * @returns Sanitized string
 */
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
};

/**
 * Validates email address format with enhanced security checks
 * @param email - Email address to validate
 * @returns Validation result with error message if invalid
 */
export const validateEmail = (email: string): ValidationResult => {
  const sanitized = sanitizeInput(email);
  
  if (!sanitized) {
    return { isValid: false, error: 'Email is required' };
  }

  if (sanitized.length > MAX_FIELD_LENGTH) {
    return { isValid: false, error: 'Email is too long' };
  }

  if (!EMAIL_REGEX.test(sanitized)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Additional email validation checks
  const [localPart, domain] = sanitized.split('@');
  if (localPart.length > 64 || domain.length > 255) {
    return { isValid: false, error: 'Email address components exceed length limits' };
  }

  return { isValid: true };
};

/**
 * Validates phone number in E.164 format with international support
 * @param phone - Phone number to validate
 * @returns Validation result with error message if invalid
 */
export const validatePhone = (phone: string): ValidationResult => {
  const sanitized = sanitizeInput(phone);
  
  if (!sanitized) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove spaces and hyphens for validation
  const normalized = sanitized.replace(/[\s-]/g, '');

  if (!PHONE_REGEX.test(normalized)) {
    return { isValid: false, error: 'Invalid phone number format. Must be in E.164 format (e.g., +1234567890)' };
  }

  // Validate reasonable length for international numbers
  if (normalized.length < 8 || normalized.length > 15) {
    return { isValid: false, error: 'Phone number length is invalid' };
  }

  return { isValid: true };
};

/**
 * Validates URL format for form embeds and integrations
 * @param url - URL to validate
 * @returns Validation result with error message if invalid
 */
export const validateUrl = (url: string): ValidationResult => {
  const sanitized = sanitizeInput(url);
  
  if (!sanitized) {
    return { isValid: false, error: 'URL is required' };
  }

  if (!URL_REGEX.test(sanitized)) {
    return { isValid: false, error: 'Invalid URL format' };
  }

  // Check for malicious patterns
  const lowercaseUrl = sanitized.toLowerCase();
  const suspiciousPatterns = ['javascript:', 'data:', 'vbscript:'];
  if (suspiciousPatterns.some(pattern => lowercaseUrl.includes(pattern))) {
    return { isValid: false, error: 'URL contains invalid protocols' };
  }

  return { isValid: true };
};

/**
 * Creates a Zod schema for form field validation
 * @param type - Type of form field
 * @param validation - Validation rules for the field
 * @returns Zod schema with validation rules
 */
export const createFieldSchema = (
  type: FormFieldType,
  validation: FormFieldValidation
): z.ZodType => {
  let schema = z.string();

  // Apply required validation
  if (validation.required) {
    schema = schema.min(1, { message: 'This field is required' });
  } else {
    schema = schema.optional();
  }

  // Apply length constraints
  if (validation.minLength) {
    schema = schema.min(validation.minLength, {
      message: `Minimum length is ${validation.minLength} characters`
    });
  }

  if (validation.maxLength) {
    schema = schema.max(validation.maxLength, {
      message: `Maximum length is ${validation.maxLength} characters`
    });
  }

  // Apply type-specific validation
  switch (type) {
    case FormFieldType.EMAIL:
      schema = schema.refine(
        (val) => !val || EMAIL_REGEX.test(val),
        { message: 'Invalid email address format' }
      );
      break;
    case FormFieldType.PHONE:
      schema = schema.refine(
        (val) => !val || PHONE_REGEX.test(val.replace(/[\s-]/g, '')),
        { message: 'Invalid phone number format' }
      );
      break;
    case FormFieldType.URL:
      schema = schema.refine(
        (val) => !val || URL_REGEX.test(val),
        { message: 'Invalid URL format' }
      );
      break;
  }

  // Apply custom pattern validation if specified
  if (validation.pattern) {
    schema = schema.refine(
      (val) => !val || new RegExp(validation.pattern!).test(val),
      { message: validation.customError || 'Invalid format' }
    );
  }

  return schema;
};

/**
 * Validates a single form field value based on its type and validation rules
 * @param value - Field value to validate
 * @param type - Type of form field
 * @param validation - Validation rules for the field
 * @returns Validation result with error message if invalid
 */
export const validateFormField = (
  value: string | number | boolean,
  type: FormFieldType,
  validation: FormFieldValidation
): ValidationResult => {
  // Convert value to string for validation
  const stringValue = String(value);
  
  // Check required field
  if (validation.required && !stringValue) {
    return { isValid: false, error: 'This field is required' };
  }

  // Skip further validation if field is empty and not required
  if (!validation.required && !stringValue) {
    return { isValid: true };
  }

  // Sanitize input
  const sanitized = sanitizeInput(stringValue);

  // Validate based on field type
  switch (type) {
    case FormFieldType.EMAIL:
      return validateEmail(sanitized);
    case FormFieldType.PHONE:
      return validatePhone(sanitized);
    case FormFieldType.URL:
      return validateUrl(sanitized);
    default:
      // Apply general validation rules
      if (validation.minLength && sanitized.length < validation.minLength) {
        return {
          isValid: false,
          error: `Minimum length is ${validation.minLength} characters`
        };
      }

      if (validation.maxLength && sanitized.length > validation.maxLength) {
        return {
          isValid: false,
          error: `Maximum length is ${validation.maxLength} characters`
        };
      }

      if (validation.pattern) {
        const pattern = new RegExp(validation.pattern);
        if (!pattern.test(sanitized)) {
          return {
            isValid: false,
            error: validation.customError || 'Invalid format'
          };
        }
      }

      return { isValid: true };
  }
};