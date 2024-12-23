// zod v3.22.0
import { z } from 'zod';
import { FormFieldType, FormFieldValidation } from '../types/form.types';

/**
 * Regular expression patterns for enhanced security validation
 * @version 1.0.0
 */
const VALIDATION_PATTERNS = {
  // RFC 5322 compliant email pattern with additional security checks
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  // E.164 compliant phone number pattern
  PHONE: /^\+[1-9]\d{1,14}$/,
  
  // Secure text pattern preventing common injection attacks
  TEXT: /^[^<>{}()`;&|$]*$/,
  
  // URL pattern with security considerations
  URL: /^https?:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(\/\S*)?$/
};

/**
 * Global validation constraints
 */
const VALIDATION_CONSTRAINTS = {
  MAX_FIELD_LENGTH: 1000,
  MIN_FIELD_LENGTH: 1,
  MAX_EMAIL_LENGTH: 254, // RFC 5321 compliant
  MIN_PHONE_LENGTH: 8,
  MAX_PHONE_LENGTH: 15 // E.164 standard
};

/**
 * Sanitizes input string to prevent XSS and injection attacks
 * @param input - Raw input string
 * @returns Sanitized string
 */
const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>{}()`;&|$]/g, '') // Remove potentially dangerous characters
    .slice(0, VALIDATION_CONSTRAINTS.MAX_FIELD_LENGTH);
};

/**
 * Validates email address format with comprehensive security checks
 * @param email - Email address to validate
 * @returns Boolean indicating if email is valid
 */
export const validateEmail = (email: string): boolean => {
  const sanitizedEmail = sanitizeInput(email);
  
  if (sanitizedEmail.length > VALIDATION_CONSTRAINTS.MAX_EMAIL_LENGTH) {
    return false;
  }

  return VALIDATION_PATTERNS.EMAIL.test(sanitizedEmail);
};

/**
 * Validates phone number format using E.164 standard
 * @param phone - Phone number to validate
 * @returns Boolean indicating if phone number is valid
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const sanitizedPhone = sanitizeInput(phone);
  
  if (
    sanitizedPhone.length < VALIDATION_CONSTRAINTS.MIN_PHONE_LENGTH ||
    sanitizedPhone.length > VALIDATION_CONSTRAINTS.MAX_PHONE_LENGTH
  ) {
    return false;
  }

  return VALIDATION_PATTERNS.PHONE.test(sanitizedPhone);
};

/**
 * Validates a single form field value with enhanced security patterns
 * @param value - Field value to validate
 * @param fieldType - Type of form field
 * @param validation - Validation rules for the field
 * @returns Boolean indicating if field value is valid
 */
export const validateFormField = (
  value: string | number | boolean,
  fieldType: FormFieldType,
  validation: FormFieldValidation
): boolean => {
  // Handle empty required fields
  if (validation.required && (value === undefined || value === null || value === '')) {
    return false;
  }

  // Skip validation for optional empty fields
  if (!validation.required && (value === undefined || value === null || value === '')) {
    return true;
  }

  const stringValue = String(value);
  const sanitizedValue = sanitizeInput(stringValue);

  // Validate field length constraints
  if (validation.minLength && sanitizedValue.length < validation.minLength) {
    return false;
  }
  if (validation.maxLength && sanitizedValue.length > validation.maxLength) {
    return false;
  }

  // Type-specific validation
  switch (fieldType) {
    case FormFieldType.EMAIL:
      return validateEmail(sanitizedValue);
      
    case FormFieldType.PHONE:
      return validatePhoneNumber(sanitizedValue);
      
    case FormFieldType.TEXT:
      return VALIDATION_PATTERNS.TEXT.test(sanitizedValue);
      
    default:
      // Custom pattern validation if specified
      if (validation.pattern) {
        try {
          const regex = new RegExp(validation.pattern);
          return regex.test(sanitizedValue);
        } catch {
          return false;
        }
      }
      return true;
  }
};

/**
 * Validates complete form submission data with enhanced security
 * @param data - Form submission data
 * @param fields - Form field configurations
 * @returns Validation result with errors and sanitized data
 */
export const validateFormData = (
  data: Record<string, any>,
  fields: Array<{
    id: string;
    type: FormFieldType;
    validation: FormFieldValidation;
  }>
): {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, any>;
} => {
  const errors: Record<string, string> = {};
  const sanitizedData: Record<string, any> = {};
  
  // Create zod schema based on field configurations
  const schemaObject: Record<string, any> = {};
  
  fields.forEach(field => {
    let fieldSchema = z.string();
    
    // Apply validation rules
    if (field.validation.required) {
      fieldSchema = fieldSchema.min(1, 'This field is required');
    }
    
    if (field.validation.minLength) {
      fieldSchema = fieldSchema.min(field.validation.minLength, 
        `Minimum length is ${field.validation.minLength} characters`);
    }
    
    if (field.validation.maxLength) {
      fieldSchema = fieldSchema.max(field.validation.maxLength,
        `Maximum length is ${field.validation.maxLength} characters`);
    }
    
    // Type-specific validation
    switch (field.type) {
      case FormFieldType.EMAIL:
        fieldSchema = fieldSchema.email('Invalid email address');
        break;
        
      case FormFieldType.PHONE:
        fieldSchema = fieldSchema.regex(
          VALIDATION_PATTERNS.PHONE,
          'Invalid phone number format'
        );
        break;
    }
    
    schemaObject[field.id] = field.validation.required ? fieldSchema : fieldSchema.optional();
  });
  
  const formSchema = z.object(schemaObject);
  
  try {
    // Validate and sanitize all fields
    const validationResult = formSchema.safeParse(data);
    
    if (!validationResult.success) {
      validationResult.error.issues.forEach(issue => {
        errors[issue.path[0]] = issue.message;
      });
      return { isValid: false, errors, sanitizedData: {} };
    }
    
    // Additional field-level validation
    fields.forEach(field => {
      const value = data[field.id];
      const isFieldValid = validateFormField(value, field.type, field.validation);
      
      if (!isFieldValid) {
        errors[field.id] = `Invalid ${field.type.toLowerCase()} format`;
      } else {
        sanitizedData[field.id] = sanitizeInput(String(value));
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: { _form: 'Invalid form submission' },
      sanitizedData: {}
    };
  }
};