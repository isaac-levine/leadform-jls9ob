// zod v3.0.0
import { z } from 'zod';
import { FormFieldType, FormField, FormConfig } from '../../types/form.types';
import { ERROR_MESSAGES } from '../../constants/error.constants';
import { EMAIL_REGEX, PHONE_REGEX } from '../../constants/regex.constants';

/**
 * Maximum allowed field count for a single form
 * Prevents form complexity and potential performance issues
 */
const MAX_FIELD_COUNT = 20;

/**
 * Minimum required field count for a form
 * Ensures forms capture meaningful data
 */
const MIN_FIELD_COUNT = 1;

/**
 * Maximum length for field labels
 * Maintains UI consistency and prevents data issues
 */
const MAX_LABEL_LENGTH = 100;

/**
 * Maximum length for form description
 * Ensures readable and manageable form descriptions
 */
const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Regex for sanitizing text input to prevent XSS
 * Removes potentially dangerous characters
 */
const TEXT_SANITIZE_REGEX = /[<>"'&]/g;

/**
 * Zod schema for validating form field options
 * Ensures options are properly formatted and sanitized
 */
const optionsSchema = z.array(z.string()
  .min(1, 'Option cannot be empty')
  .transform(val => val.replace(TEXT_SANITIZE_REGEX, ''))
).optional();

/**
 * Zod schema for form field validation
 * Implements comprehensive validation rules for each field type
 */
export const formFieldSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(FormFieldType),
  label: z.string()
    .min(1, ERROR_MESSAGES.FIELD_REQUIRED)
    .max(MAX_LABEL_LENGTH, `Label must not exceed ${MAX_LABEL_LENGTH} characters`)
    .transform(val => val.replace(TEXT_SANITIZE_REGEX, '')),
  required: z.boolean(),
  placeholder: z.string().optional()
    .transform(val => val?.replace(TEXT_SANITIZE_REGEX, '')),
  options: optionsSchema.refine(
    (opts) => !opts || opts.length > 0,
    'Options must not be empty when provided'
  ),
  validationPattern: z.instanceof(RegExp).optional()
}).refine((field) => {
  // Ensure SELECT, CHECKBOX, and RADIO fields have options
  if ([FormFieldType.SELECT, FormFieldType.CHECKBOX, FormFieldType.RADIO].includes(field.type)) {
    return Array.isArray(field.options) && field.options.length > 0;
  }
  return true;
}, 'Options are required for SELECT, CHECKBOX, and RADIO fields');

/**
 * Zod schema for complete form configuration
 * Validates entire form structure and relationships
 */
export const formConfigSchema = z.object({
  title: z.string()
    .min(1, ERROR_MESSAGES.FIELD_REQUIRED)
    .max(MAX_LABEL_LENGTH)
    .transform(val => val.replace(TEXT_SANITIZE_REGEX, '')),
  description: z.string()
    .max(MAX_DESCRIPTION_LENGTH)
    .transform(val => val.replace(TEXT_SANITIZE_REGEX, ''))
    .optional(),
  fields: z.array(formFieldSchema)
    .min(MIN_FIELD_COUNT, `Form must have at least ${MIN_FIELD_COUNT} field`)
    .max(MAX_FIELD_COUNT, `Form cannot have more than ${MAX_FIELD_COUNT} fields`),
  submitButtonText: z.string()
    .min(1, ERROR_MESSAGES.FIELD_REQUIRED)
    .transform(val => val.replace(TEXT_SANITIZE_REGEX, '')),
  successMessage: z.string()
    .min(1, ERROR_MESSAGES.FIELD_REQUIRED)
    .transform(val => val.replace(TEXT_SANITIZE_REGEX, '')),
  active: z.boolean(),
  embedCode: z.string()
});

/**
 * Zod schema for form creation
 * Includes organization validation and complete form config
 */
export const createFormSchema = z.object({
  organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid organization ID'),
  config: formConfigSchema
});

/**
 * Zod schema for form updates
 * Allows partial updates while maintaining validation
 */
export const updateFormSchema = z.object({
  config: formConfigSchema.partial().optional(),
  active: z.boolean().optional()
});

/**
 * Validates and sanitizes form field data based on field type
 * Implements type-specific validation and security measures
 */
export const validateFormFieldData = (field: FormField, value: any): {
  success: boolean;
  value?: any;
  error?: string;
} => {
  // Sanitize input value
  const sanitizedValue = typeof value === 'string' 
    ? value.replace(TEXT_SANITIZE_REGEX, '')
    : value;

  // Check required field
  if (field.required && !sanitizedValue) {
    return {
      success: false,
      error: ERROR_MESSAGES.FIELD_REQUIRED
    };
  }

  // Type-specific validation
  switch (field.type) {
    case FormFieldType.EMAIL:
      if (sanitizedValue && !EMAIL_REGEX.test(sanitizedValue)) {
        return {
          success: false,
          error: 'Invalid email format'
        };
      }
      break;

    case FormFieldType.PHONE:
      if (sanitizedValue && !PHONE_REGEX.test(sanitizedValue)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }
      break;

    case FormFieldType.SELECT:
    case FormFieldType.RADIO:
      if (sanitizedValue && (!field.options?.includes(sanitizedValue))) {
        return {
          success: false,
          error: 'Invalid option selected'
        };
      }
      break;

    case FormFieldType.CHECKBOX:
      if (sanitizedValue && (!Array.isArray(sanitizedValue) || 
          !sanitizedValue.every(v => field.options?.includes(v)))) {
        return {
          success: false,
          error: 'Invalid checkbox selection'
        };
      }
      break;
  }

  // Custom validation pattern check
  if (field.validationPattern && sanitizedValue && 
      !field.validationPattern.test(sanitizedValue)) {
    return {
      success: false,
      error: ERROR_MESSAGES.INVALID_FORMAT
    };
  }

  return {
    success: true,
    value: sanitizedValue
  };
};

/**
 * Validates array of form fields for completeness and security
 * Ensures form structure meets all requirements
 */
export const validateFormFields = (fields: FormField[]): {
  success: boolean;
  errors?: string[];
} => {
  const errors: string[] = [];

  // Check field count constraints
  if (fields.length < MIN_FIELD_COUNT || fields.length > MAX_FIELD_COUNT) {
    errors.push(`Form must have between ${MIN_FIELD_COUNT} and ${MAX_FIELD_COUNT} fields`);
  }

  // Check for duplicate field IDs
  const fieldIds = new Set<string>();
  fields.forEach(field => {
    if (fieldIds.has(field.id)) {
      errors.push(`Duplicate field ID: ${field.id}`);
    }
    fieldIds.add(field.id);
  });

  // Validate each field's configuration
  fields.forEach(field => {
    try {
      formFieldSchema.parse(field);
    } catch (error) {
      errors.push(`Invalid field configuration for ${field.label}: ${error.message}`);
    }
  });

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};