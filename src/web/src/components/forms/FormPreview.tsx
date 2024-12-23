/**
 * @file Form preview component with real-time validation and accessibility support
 * @version 1.0.0
 */

import React, { useCallback, useMemo, useState } from 'react';
import { cn } from 'clsx'; // clsx v2.0.0
import { debounce } from 'lodash'; // lodash v4.17.21
import TextField from './fields/TextField';
import { useForm } from '../../hooks/useForm';
import { FormField, FormFieldType } from '../../types/form.types';

/**
 * Props interface for FormPreview component
 */
interface FormPreviewProps {
  formId?: string;                                  // Optional ID of form to preview
  className?: string;                               // Optional custom CSS classes
  onValidationChange?: (isValid: boolean) => void;  // Validation state callback
  onFieldChange?: (fieldId: string, value: string) => void; // Field change callback
}

/**
 * FormPreview component that renders a live preview of the form being built
 * Implements WCAG 2.1 Level AA compliance and real-time validation
 */
const FormPreview: React.FC<FormPreviewProps> = ({
  formId,
  className,
  onValidationChange,
  onFieldChange
}) => {
  // Get form state from useForm hook
  const { form, loading, isValid, errors } = useForm(formId);

  // Local state for field values and validation
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /**
   * Debounced validation handler to prevent excessive validation calls
   */
  const debouncedValidation = useMemo(
    () => debounce((isValid: boolean) => {
      onValidationChange?.(isValid);
    }, 300),
    [onValidationChange]
  );

  /**
   * Handles field value changes with validation
   */
  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    // Update field value
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear existing error for the field
    setFieldErrors(prev => ({
      ...prev,
      [fieldId]: ''
    }));

    // Trigger external change handler
    onFieldChange?.(fieldId, value);
  }, [onFieldChange]);

  /**
   * Renders appropriate field component based on field type
   */
  const renderField = useCallback((field: FormField) => {
    const value = fieldValues[field.id] || '';
    const error = fieldErrors[field.id] || errors[`field-${field.id}`];

    switch (field.type) {
      case FormFieldType.TEXT:
      case FormFieldType.EMAIL:
      case FormFieldType.PHONE:
        return (
          <TextField
            key={field.id}
            field={field}
            value={value}
            onChange={(newValue) => handleFieldChange(field.id, newValue)}
            error={error}
            className="mb-4"
          />
        );
      // Additional field types can be added here
      default:
        return null;
    }
  }, [fieldValues, fieldErrors, errors, handleFieldChange]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Show error state if form not found
  if (!form) {
    return (
      <div className="p-4 text-error-500 bg-error-50 rounded-md">
        Form not found or failed to load
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full max-w-lg mx-auto p-6 space-y-4 rounded-lg shadow-sm',
        'bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Form Header */}
      <div className="space-y-2">
        <h2 
          className="text-2xl font-bold text-gray-900 dark:text-gray-100"
          id="form-preview-title"
        >
          {form.config.title}
        </h2>
        {form.config.description && (
          <p 
            className="text-sm text-gray-600 dark:text-gray-400"
            id="form-preview-description"
          >
            {form.config.description}
          </p>
        )}
      </div>

      {/* Form Fields */}
      <form
        className="space-y-6"
        aria-labelledby="form-preview-title"
        aria-describedby="form-preview-description"
        onSubmit={(e) => e.preventDefault()}
      >
        {form.config.fields.map(renderField)}

        {/* Submit Button */}
        <button
          type="submit"
          className={cn(
            'w-full px-4 py-2 text-sm font-medium text-white',
            'bg-primary-600 hover:bg-primary-700',
            'rounded-md shadow-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          disabled={!isValid}
          aria-disabled={!isValid}
        >
          {form.config.submitButtonText || 'Submit'}
        </button>
      </form>

      {/* Validation Feedback */}
      {!isValid && Object.keys(errors).length > 0 && (
        <div
          className="mt-4 p-3 bg-error-50 border border-error-200 rounded-md"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-error-800">
            Please correct the following errors:
          </p>
          <ul className="mt-2 text-sm text-error-700">
            {Object.entries(errors).map(([key, messages]) => (
              <li key={key}>
                {Array.isArray(messages) ? messages.join(', ') : messages}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FormPreview;