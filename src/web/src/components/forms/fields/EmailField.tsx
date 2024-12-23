/**
 * @file EmailField component for secure and accessible email input
 * @version 1.0.0
 */

import React, { useCallback } from 'react'; // react v18.0.0
import { cn } from 'clsx'; // clsx v2.0.0
import { useDebounce } from 'use-debounce'; // use-debounce v9.0.0
import { Input } from '../../ui/input';
import { validateEmail } from '../../../utils/validation.utils';
import { FormFieldType } from '../../../types/form.types';

/**
 * Props interface for EmailField component
 */
interface EmailFieldProps {
  name: string;                          // Field identifier
  label: string;                         // Accessible label text
  value: string;                         // Current field value
  onChange: (value: string) => void;     // Change handler
  error?: string;                        // Validation error message
  required?: boolean;                    // Required field flag
  placeholder?: string;                  // Placeholder text
  disabled?: boolean;                    // Disabled state
  maxLength?: number;                    // Maximum length limit
  autoComplete?: string;                 // Autocomplete attribute
}

/**
 * EmailField component with enhanced validation and security features
 * Implements WCAG 2.1 Level AA accessibility standards
 */
const EmailField: React.FC<EmailFieldProps> = ({
  name,
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder = 'Enter email address',
  disabled = false,
  maxLength = 254, // RFC 5321 email length limit
  autoComplete = 'email'
}) => {
  // Debounced validation for performance
  const [debouncedValidate] = useDebounce(
    (email: string) => {
      const result = validateEmail(email);
      if (!result.isValid && email !== '') {
        return result.error;
      }
      return '';
    },
    300
  );

  /**
   * Handles input changes with validation
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    debouncedValidate(newValue);
  }, [onChange, debouncedValidate]);

  // Compute container classes
  const containerClasses = cn(
    'w-full relative',
    disabled && 'opacity-60'
  );

  // Compute label classes
  const labelClasses = cn(
    'block text-sm font-medium text-gray-700 mb-1',
    required && 'after:content-["*"] after:ml-0.5 after:text-error-500'
  );

  // Generate unique IDs for accessibility
  const inputId = `email-field-${name}`;
  const errorId = `email-field-error-${name}`;

  return (
    <div className={containerClasses}>
      {/* Accessible label */}
      <label htmlFor={inputId} className={labelClasses}>
        {label}
      </label>

      {/* Email input field */}
      <Input
        id={inputId}
        type="email"
        name={name}
        value={value}
        onChange={handleChange}
        error={error}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={!!error}
        aria-required={required}
        // Email-specific attributes
        inputMode="email"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />

      {/* Error message with ARIA support */}
      {error && (
        <div
          id={errorId}
          className="text-sm text-error-500 mt-1"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </div>
  );
};

// Display name for debugging
EmailField.displayName = 'EmailField';

export default EmailField;