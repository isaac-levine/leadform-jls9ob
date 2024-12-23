// mongodb v5.0.0
import { ObjectId } from 'mongodb';
import { OrganizationId } from '../types/organization.types';

/**
 * Type alias for form identifier using MongoDB ObjectId
 * @version 1.0.0
 */
export type FormId = ObjectId;

/**
 * Enumeration of supported form field types
 * Defines all available field types for form builder
 * @version 1.0.0
 */
export enum FormFieldType {
  TEXT = 'TEXT',           // Single line text input
  EMAIL = 'EMAIL',         // Email address input
  PHONE = 'PHONE',         // Phone number input
  SELECT = 'SELECT',       // Dropdown select input
  CHECKBOX = 'CHECKBOX',   // Multiple choice checkbox
  RADIO = 'RADIO',        // Single choice radio button
  TEXTAREA = 'TEXTAREA'   // Multi-line text input
}

/**
 * Interface for field validation rules
 * Defines validation constraints for form fields
 * @version 1.0.0
 */
export interface FormFieldValidation {
  required: boolean;     // Whether field is required
  minLength?: number;    // Minimum text length
  maxLength?: number;    // Maximum text length
  pattern?: string;      // Regex validation pattern
}

/**
 * Interface defining structure of form fields
 * Implements frontend-specific field properties
 * @version 1.0.0
 */
export interface FormField {
  id: string;                     // Unique field identifier
  type: FormFieldType;           // Field input type
  label: string;                 // Field display label
  validation: FormFieldValidation; // Field validation rules
  options?: string[];            // Options for SELECT/RADIO/CHECKBOX
  placeholder?: string;          // Input placeholder text
  defaultValue?: string;         // Default field value
}

/**
 * Interface for form theming options
 * Defines customizable visual properties
 * @version 1.0.0
 */
export interface FormTheme {
  primaryColor: string;      // Primary theme color
  backgroundColor: string;   // Form background color
  fontFamily: string;       // Form font family
}

/**
 * Interface for complete form configuration
 * Implements form builder requirements from technical specification
 * @version 1.0.0
 */
export interface FormConfig {
  title: string;              // Form title
  description: string;        // Form description
  fields: FormField[];        // Form fields array
  submitButtonText: string;   // Submit button label
  successMessage: string;     // Post-submission message
  theme: FormTheme;          // Form styling options
}

/**
 * Type for form state management in frontend components
 * Combines form data with operational state
 * @version 1.0.0
 */
export type FormState = {
  id: FormId;                    // Form unique identifier
  organizationId: OrganizationId; // Associated organization
  config: FormConfig;            // Form configuration
  active: boolean;               // Form enabled status
  embedCode: string;             // Form embed code
};

/**
 * Global constants for form validation
 */
export const MAX_FIELD_COUNT = 20;           // Maximum number of fields allowed
export const MIN_FIELD_COUNT = 1;            // Minimum number of fields required
export const MAX_LABEL_LENGTH = 100;         // Maximum length for field labels
export const MAX_DESCRIPTION_LENGTH = 500;   // Maximum length for form description

/**
 * Type guard to check if an object is a valid FormField
 * @param obj - Object to validate
 * @returns boolean indicating if object matches FormField interface
 */
export function isFormField(obj: unknown): obj is FormField {
  const field = obj as FormField;
  return (
    typeof field?.id === 'string' &&
    Object.values(FormFieldType).includes(field?.type) &&
    typeof field?.label === 'string' &&
    typeof field?.validation === 'object'
  );
}

/**
 * Type guard to check if an object is a valid FormConfig
 * @param obj - Object to validate
 * @returns boolean indicating if object matches FormConfig interface
 */
export function isFormConfig(obj: unknown): obj is FormConfig {
  const config = obj as FormConfig;
  return (
    typeof config?.title === 'string' &&
    typeof config?.description === 'string' &&
    Array.isArray(config?.fields) &&
    config.fields.length >= MIN_FIELD_COUNT &&
    config.fields.length <= MAX_FIELD_COUNT &&
    config.fields.every(isFormField) &&
    typeof config?.submitButtonText === 'string' &&
    typeof config?.successMessage === 'string' &&
    typeof config?.theme === 'object'
  );
}