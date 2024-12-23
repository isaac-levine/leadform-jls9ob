/**
 * @file PhoneField component for phone number input with E.164 format validation
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge'; // v3.0.0
import debounce from 'lodash/debounce'; // v4.17.21
import Input from '../../ui/input';
import { FormFieldValidation } from '../../../types/form.types';
import { validatePhone } from '../../../utils/validation.utils';
import { formatPhoneNumber, formatPhoneNumberForDisplay } from '../../../lib/phone';

/**
 * Props interface for PhoneField component
 */
interface PhoneFieldProps {
  name: string;                                  // Field name for form state
  id: string;                                    // Unique identifier
  label: string;                                 // Label text
  value: string;                                // Current value in E.164 format
  onChange: (value: string) => void;            // Change handler
  validation: FormFieldValidation;              // Validation rules
  error?: string;                               // Error message
  placeholder?: string;                         // Placeholder text
  disabled?: boolean;                           // Disabled state
  countryCode?: string;                         // Default country code
  autoFormat?: boolean;                         // Enable auto-formatting
  onValidationChange?: (isValid: boolean) => void; // Validation callback
}

/**
 * PhoneField component for phone number input with validation and formatting
 */
const PhoneField: React.FC<PhoneFieldProps> = ({
  name,
  id,
  label,
  value,
  onChange,
  validation,
  error,
  placeholder = 'Enter phone number',
  disabled = false,
  countryCode = 'US',
  autoFormat = true,
  onValidationChange
}) => {
  // Local state for display value and validation
  const [displayValue, setDisplayValue] = useState<string>('');
  const [localError, setLocalError] = useState<string>('');

  // Initialize display value on mount and value changes
  useEffect(() => {
    if (value) {
      setDisplayValue(autoFormat ? formatPhoneNumberForDisplay(value) : value);
    }
  }, [value, autoFormat]);

  /**
   * Debounced validation handler
   */
  const debouncedValidate = useCallback(
    debounce((phoneNumber: string) => {
      const validationResult = validatePhone(phoneNumber);
      setLocalError(validationResult.error || '');
      onValidationChange?.(validationResult.isValid);
    }, 300),
    [onValidationChange]
  );

  /**
   * Handles phone number input changes with formatting and validation
   */
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Remove non-numeric characters except + for raw value
    const rawValue = inputValue.replace(/[^\d+]/g, '');

    // Format number if auto-format is enabled
    const formattedValue = autoFormat ? 
      formatPhoneNumber(rawValue, countryCode) || rawValue :
      rawValue;

    // Update display value
    setDisplayValue(inputValue);

    // Trigger validation
    debouncedValidate(formattedValue);

    // Call onChange with E.164 formatted value
    onChange(formattedValue);
  }, [autoFormat, countryCode, debouncedValidate, onChange]);

  /**
   * Cleanup validation timeout on unmount
   */
  useEffect(() => {
    return () => {
      debouncedValidate.cancel();
    };
  }, [debouncedValidate]);

  // Generate unique IDs for accessibility
  const inputId = id || `phone-field-${name}`;
  const errorId = `${inputId}-error`;
  const labelId = `${inputId}-label`;

  return (
    <div className="w-full">
      {/* Label */}
      <label
        id={labelId}
        htmlFor={inputId}
        className={twMerge(
          'block text-sm font-medium text-gray-700 mb-1',
          disabled && 'opacity-50'
        )}
      >
        {label}
        {validation.required && (
          <span className="text-error-500 ml-1" aria-hidden="true">*</span>
        )}
      </label>

      {/* Phone Input */}
      <Input
        id={inputId}
        type="tel"
        name={name}
        value={displayValue}
        onChange={handlePhoneChange}
        disabled={disabled}
        error={error || localError}
        placeholder={placeholder}
        aria-labelledby={labelId}
        aria-describedby={errorId}
        aria-required={validation.required}
        aria-invalid={!!(error || localError)}
        className={twMerge(
          'phone-field',
          disabled && 'cursor-not-allowed'
        )}
        startIcon={
          <span className="text-gray-400" aria-hidden="true">
            📞
          </span>
        }
      />

      {/* Error Message */}
      {(error || localError) && (
        <div
          id={errorId}
          className="mt-1 text-sm text-error-500"
          role="alert"
        >
          {error || localError}
        </div>
      )}
    </div>
  );
};

export default PhoneField;