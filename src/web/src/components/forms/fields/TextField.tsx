/**
 * @file Text field component with validation and accessibility features
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react'; // react v18.0.0
import { cn } from 'clsx'; // clsx v2.0.0
import { Input } from '../../ui/input';
import { FormField, FormFieldType } from '../../../types/form.types';
import { validateFormField } from '../../../utils/validation.utils';

/**
 * Props interface for TextField component
 */
interface TextFieldProps {
  field: FormField;                      // Field configuration
  value: string;                         // Current input value
  onChange: (value: string) => void;     // Change handler
  error?: string;                        // External error message
  className?: string;                    // Custom CSS classes
}

/**
 * TextField component for form input with validation and accessibility
 * Implements WCAG 2.1 Level AA compliance
 */
export const TextField: React.FC<TextFieldProps> = ({
  field,
  value,
  onChange,
  error: externalError,
  className
}) => {
  // Local state for validation and error handling
  const [localError, setLocalError] = useState<string | undefined>();
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Clear validation timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  /**
   * Handles input value changes with debounced validation
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;

    // Clear existing validation timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    // Set new validation timeout with debouncing
    const timeout = setTimeout(() => {
      const validationResult = validateFormField(
        newValue,
        field.type,
        field.validation
      );

      setLocalError(validationResult.isValid ? undefined : validationResult.error);
    }, 300); // 300ms debounce

    setValidationTimeout(timeout);
    onChange(newValue);
  }, [field, onChange, validationTimeout]);

  // Compute error message priority (external error takes precedence)
  const errorMessage = externalError || localError;

  // Generate unique IDs for accessibility
  const inputId = `field-${field.id}`;
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;

  return (
    <div 
      className={cn(
        'flex flex-col gap-1.5',
        className
      )}
    >
      {/* Field Label */}
      <label
        htmlFor={inputId}
        className={cn(
          'text-sm font-medium text-gray-700 dark:text-gray-200',
          field.validation.required && 'after:content-["*"] after:ml-0.5 after:text-error-500'
        )}
      >
        {field.label}
      </label>

      {/* Input Field */}
      <Input
        id={inputId}
        type={field.type === FormFieldType.EMAIL ? 'email' : 'text'}
        value={value}
        onChange={handleChange}
        placeholder={field.placeholder}
        error={errorMessage}
        required={field.validation.required}
        aria-describedby={errorMessage ? errorId : descriptionId}
        aria-invalid={!!errorMessage}
        className={cn(
          'w-full transition-colors duration-200',
          errorMessage && 'border-error-500 focus:border-error-500 focus:ring-error-500'
        )}
      />

      {/* Error Message */}
      {errorMessage && (
        <p
          id={errorId}
          className="text-sm text-error-500 animate-fadeIn"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {/* Field Description (for screen readers) */}
      <span id={descriptionId} className="sr-only">
        {field.validation.required ? 'Required field.' : 'Optional field.'} 
        {field.validation.minLength && ` Minimum ${field.validation.minLength} characters.`}
        {field.validation.maxLength && ` Maximum ${field.validation.maxLength} characters.`}
      </span>
    </div>
  );
};

export default TextField;