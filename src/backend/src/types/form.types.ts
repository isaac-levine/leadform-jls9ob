// mongodb v5.0.0
import { ObjectId } from 'mongodb';
import { OrganizationId } from '../types/organization.types';
import { EMAIL_REGEX, PHONE_REGEX } from '../constants/regex.constants';

/**
 * Maximum number of fields allowed in a single form
 * Prevents form complexity and potential performance issues
 */
export const MAX_FIELD_COUNT = 20;

/**
 * Minimum number of fields required in a form
 * Ensures forms capture meaningful data
 */
export const MIN_FIELD_COUNT = 1;

/**
 * Maximum length for field labels
 * Maintains UI consistency and prevents data issues
 */
export const MAX_LABEL_LENGTH = 100;

/**
 * Maximum length for form description
 * Ensures readable and manageable form descriptions
 */
export const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Type alias for form identifier using MongoDB ObjectId
 */
export type FormId = ObjectId;

/**
 * Enumeration of supported form field types
 * Defines all available input types for form fields
 */
export enum FormFieldType {
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  SELECT = 'SELECT',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  TEXTAREA = 'TEXTAREA'
}

/**
 * Interface defining structure of form fields with validation
 * Contains all necessary properties for rendering and validating form fields
 */
export interface FormField {
  /** Unique identifier for the field */
  id: string;

  /** Type of form field from FormFieldType enum */
  type: FormFieldType;

  /** Display label for the field */
  label: string;

  /** Whether the field is required */
  required: boolean;

  /** Options for SELECT, CHECKBOX, or RADIO fields */
  options?: string[];

  /** Placeholder text for input fields */
  placeholder?: string;

  /** Validation pattern based on field type */
  validationPattern?: RegExp;
}

/**
 * Interface for complete form configuration including embed code
 * Contains all form settings and content configuration
 */
export interface FormConfig {
  /** Form title displayed at the top */
  title: string;

  /** Optional form description */
  description?: string;

  /** Array of form fields */
  fields: FormField[];

  /** Custom text for the submit button */
  submitButtonText: string;

  /** Message displayed after successful submission */
  successMessage: string;

  /** Whether the form is currently active */
  active: boolean;

  /** Generated HTML code for embedding the form */
  embedCode: string;
}

/**
 * Data transfer object for form creation
 * Contains required data for creating a new form
 */
export interface CreateFormDTO {
  /** Organization that owns the form */
  organizationId: OrganizationId;

  /** Complete form configuration */
  config: FormConfig;
}

/**
 * Data transfer object for form updates
 * Contains fields that can be updated for an existing form
 */
export interface UpdateFormDTO {
  /** Updated form configuration */
  config?: Partial<FormConfig>;

  /** Updated form active status */
  active?: boolean;
}

/**
 * Helper function to get default validation pattern for field type
 * @param type FormFieldType to get validation pattern for
 * @returns RegExp validation pattern or undefined if not applicable
 */
export const getDefaultValidationPattern = (type: FormFieldType): RegExp | undefined => {
  switch (type) {
    case FormFieldType.EMAIL:
      return EMAIL_REGEX;
    case FormFieldType.PHONE:
      return PHONE_REGEX;
    default:
      return undefined;
  }
};

/**
 * Interface for form validation errors
 * Used to return validation error details
 */
export interface FormValidationError {
  /** Field ID where validation failed */
  fieldId: string;

  /** Error message describing the validation failure */
  message: string;

  /** Type of validation that failed */
  type: 'required' | 'pattern' | 'options' | 'length';
}