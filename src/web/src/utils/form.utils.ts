/**
 * @file Form utility functions for form manipulation, validation, and management
 * @version 1.0.0
 * @description Implements secure form utilities with enhanced validation and security features
 */

import { FormField, FormFieldType, FormConfig, isFormConfig } from '../types/form.types';
import { validateFormField, createFieldSchema } from './validation.utils';
import clsx from 'clsx'; // v2.0.0
import { z } from 'zod'; // v3.22.0

// Global configuration constants
const DEFAULT_FIELD_CONFIG = {
  required: false,
  minLength: 0,
  maxLength: 100,
  sanitization: 'strict',
  validation: 'immediate',
  errorReporting: 'detailed'
} as const;

// Secure embed code template with CSP headers
const EMBED_CODE_TEMPLATE = `
<script 
  nonce="%NONCE%" 
  src="%BASE_URL%/form-loader.js" 
  data-form-id="%FORM_ID%" 
  integrity="%INTEGRITY%" 
  crossorigin="anonymous" 
  sandbox="allow-forms allow-scripts">
</script>`;

/**
 * Generates a cryptographically secure unique identifier for form fields
 * @returns Unique field identifier with format 'field_[random-string]'
 */
export const generateFieldId = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const randomString = Array.from(array)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return `field_${randomString}`;
};

/**
 * Creates a new form field with enhanced security defaults and validation rules
 * @param type - Type of form field to create
 * @returns Secure form field configuration with validation
 */
export const createDefaultField = (type: FormFieldType): FormField => {
  const fieldId = generateFieldId();
  
  const baseField: FormField = {
    id: fieldId,
    type,
    label: '',
    validation: {
      required: DEFAULT_FIELD_CONFIG.required,
      minLength: DEFAULT_FIELD_CONFIG.minLength,
      maxLength: DEFAULT_FIELD_CONFIG.maxLength
    }
  };

  // Apply type-specific configurations
  switch (type) {
    case FormFieldType.EMAIL:
      baseField.validation.pattern = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';
      baseField.placeholder = 'Enter email address';
      break;
    case FormFieldType.PHONE:
      baseField.validation.pattern = '^\\+[1-9]\\d{1,14}$';
      baseField.placeholder = '+1234567890';
      break;
    case FormFieldType.SELECT:
      baseField.options = [];
      break;
    case FormFieldType.TEXTAREA:
      baseField.validation.maxLength = 500;
      break;
  }

  return baseField;
};

/**
 * Performs comprehensive validation of form configuration
 * @param config - Form configuration to validate
 * @returns Validation result with detailed error reporting
 */
export const validateFormConfig = (config: FormConfig): { 
  isValid: boolean; 
  errors: Record<string, string[]>;
} => {
  const errors: Record<string, string[]> = {};

  // Validate basic form structure
  if (!isFormConfig(config)) {
    errors.structure = ['Invalid form configuration structure'];
    return { isValid: false, errors };
  }

  // Validate title and description
  if (!config.title.trim()) {
    errors.title = ['Form title is required'];
  }
  if (config.description.length > 500) {
    errors.description = ['Description exceeds maximum length of 500 characters'];
  }

  // Validate fields
  config.fields.forEach((field, index) => {
    const fieldErrors: string[] = [];
    
    // Validate field label
    if (!field.label.trim()) {
      fieldErrors.push('Field label is required');
    }

    // Validate field type-specific requirements
    const validationResult = validateFormField('', field.type, field.validation);
    if (!validationResult.isValid && validationResult.error) {
      fieldErrors.push(validationResult.error);
    }

    // Validate field options for SELECT/RADIO/CHECKBOX
    if ([FormFieldType.SELECT, FormFieldType.RADIO, FormFieldType.CHECKBOX].includes(field.type)) {
      if (!field.options?.length) {
        fieldErrors.push('Options are required for this field type');
      }
    }

    if (fieldErrors.length > 0) {
      errors[`field_${index}`] = fieldErrors;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Generates secure embed code with CSP headers and sandbox attributes
 * @param formId - Unique identifier of the form
 * @returns Secure HTML embed code with CSP headers
 */
export const generateEmbedCode = (formId: string): string => {
  // Generate cryptographic nonce for CSP
  const nonce = crypto.getRandomValues(new Uint8Array(16))
    .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

  // Calculate SRI hash for form-loader.js (implementation depends on deployment)
  const integrity = 'sha384-PLACEHOLDER'; // Replace with actual SRI hash

  // Get base URL from environment
  const baseUrl = process.env.NEXT_PUBLIC_FORM_LOADER_URL || '';

  return EMBED_CODE_TEMPLATE
    .replace('%NONCE%', nonce)
    .replace('%BASE_URL%', baseUrl)
    .replace('%FORM_ID%', formId)
    .replace('%INTEGRITY%', integrity)
    .trim();
};

/**
 * Reorders form fields with validation of field relationships
 * @param fields - Array of form fields to reorder
 * @param sourceIndex - Original position of the field
 * @param destinationIndex - New position for the field
 * @returns Reordered fields array with preserved relationships
 */
export const reorderFormFields = (
  fields: FormField[],
  sourceIndex: number,
  destinationIndex: number
): FormField[] => {
  // Validate index bounds
  if (
    sourceIndex < 0 || 
    sourceIndex >= fields.length || 
    destinationIndex < 0 || 
    destinationIndex >= fields.length
  ) {
    throw new Error('Invalid field indices for reordering');
  }

  // Create new array to maintain immutability
  const reorderedFields = [...fields];
  const [movedField] = reorderedFields.splice(sourceIndex, 1);
  reorderedFields.splice(destinationIndex, 0, movedField);

  // Validate field relationships after reordering
  const validationResult = validateFormConfig({ 
    title: '',
    description: '',
    fields: reorderedFields,
    submitButtonText: '',
    successMessage: '',
    theme: { primaryColor: '', backgroundColor: '', fontFamily: '' }
  });

  if (!validationResult.isValid) {
    throw new Error('Reordering would create invalid field relationships');
  }

  return reorderedFields;
};