/**
 * Lead data validation schemas and utilities using Zod.
 * Implements comprehensive validation rules for lead-related operations
 * with security measures and detailed error reporting.
 * 
 * @module lead.validator
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.0.0
import { PHONE_REGEX } from '../../constants/regex.constants';
import { 
  CreateLeadDTO, 
  UpdateLeadDTO, 
  LeadStatus, 
  LeadSource 
} from '../../types/lead.types';

/**
 * Interface for validation result containing success status,
 * sanitized data, and any validation errors.
 */
interface ValidationResult {
  success: boolean;
  data?: Record<string, any>;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Zod schema for validating lead creation payload.
 * Implements strict validation rules with detailed error messages.
 */
export const createLeadSchema = z.object({
  formId: z.string().min(1, 'Form ID is required')
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Form ID format'),
    
  phone: z.string()
    .min(1, 'Phone number is required')
    .regex(PHONE_REGEX, 'Invalid phone number format. Must be in E.164 format (+1234567890)'),
    
  data: z.record(z.string(), z.any())
    .refine(
      (data) => Object.keys(data).length > 0,
      'Form data is required'
    )
    .refine(
      (data) => Object.keys(data).length <= 50,
      'Maximum of 50 form fields allowed'
    ),
    
  source: z.nativeEnum(LeadSource, {
    errorMap: () => ({ message: 'Invalid lead source. Must be one of: FORM, MANUAL, API' })
  })
}).strict();

/**
 * Zod schema for validating lead update payload.
 * Implements partial validation for optional update fields.
 */
export const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus, {
    errorMap: () => ({ 
      message: 'Invalid lead status. Must be one of: NEW, CONTACTED, ENGAGED, CONVERTED, CLOSED' 
    })
  }).optional(),
  
  optedOut: z.boolean()
    .optional()
    .refine(
      (val) => val === undefined || typeof val === 'boolean',
      'optedOut must be a boolean value'
    ),
    
  data: z.record(z.string(), z.any())
    .optional()
    .refine(
      (data) => !data || Object.keys(data).length > 0,
      'Form data cannot be empty when provided'
    )
    .refine(
      (data) => !data || Object.keys(data).length <= 50,
      'Maximum of 50 form fields allowed'
    )
}).strict();

/**
 * Validates and sanitizes custom form data submitted with lead creation.
 * Implements field-specific validation and sanitization rules.
 * 
 * @param data - Record containing form field data to validate
 * @returns ValidationResult with success status, sanitized data, and any errors
 */
export const validateLeadData = (data: Record<string, any>): ValidationResult => {
  const errors: Array<{ field: string; message: string }> = [];
  const sanitizedData: Record<string, any> = {};

  // Verify data object exists and is not empty
  if (!data || Object.keys(data).length === 0) {
    return {
      success: false,
      errors: [{ field: 'data', message: 'Form data is required' }]
    };
  }

  // Validate and sanitize each field
  for (const [key, value] of Object.entries(data)) {
    // Sanitize field key
    const sanitizedKey = key.trim().slice(0, 100);

    // Validate string values
    if (typeof value === 'string') {
      // Prevent XSS and injection
      const sanitizedValue = value
        .trim()
        .replace(/[<>]/g, '')
        .slice(0, 1000); // Limit string length
      
      sanitizedData[sanitizedKey] = sanitizedValue;
      
      // Validate non-empty if present
      if (sanitizedValue.length === 0) {
        errors.push({
          field: key,
          message: `${key} cannot be empty when provided`
        });
      }
    }
    // Validate numeric values
    else if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        errors.push({
          field: key,
          message: `${key} must be a valid number`
        });
      } else {
        sanitizedData[sanitizedKey] = value;
      }
    }
    // Validate boolean values
    else if (typeof value === 'boolean') {
      sanitizedData[sanitizedKey] = value;
    }
    // Validate array values
    else if (Array.isArray(value)) {
      if (value.length > 100) { // Limit array size
        errors.push({
          field: key,
          message: `${key} exceeds maximum allowed items (100)`
        });
      } else {
        sanitizedData[sanitizedKey] = value.map(item => 
          typeof item === 'string' ? item.trim().replace(/[<>]/g, '').slice(0, 1000) : item
        );
      }
    }
    // Reject other types
    else {
      errors.push({
        field: key,
        message: `${key} contains an unsupported data type`
      });
    }
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? sanitizedData : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
};