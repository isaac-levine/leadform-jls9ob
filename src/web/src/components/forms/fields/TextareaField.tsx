/**
 * @file TextareaField component implementation
 * @version 1.0.0
 * @description A form field component that renders a textarea with validation,
 * character counting, and accessibility features for multiline text input in form builder
 */

import React, { useMemo, useCallback } from 'react';
import { cn } from 'clsx'; // v2.0.0
import { debounce } from 'lodash'; // v4.17.21
import { Textarea } from '../../ui/textarea';
import { FormField } from '../../../types/form.types';
import { validateFormField } from '../../../utils/validation.utils';

/**
 * Props interface for TextareaField component
 */
interface TextareaFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * TextareaField component for multiline text input with validation and character counting
 */
const TextareaField: React.FC<TextareaFieldProps> = ({
  field,
  value,
  onChange,
  error,
  className,
  disabled = false,
}) => {
  // Debounced validation to optimize performance
  const debouncedValidation = useCallback(
    debounce((value: string) => {
      const validationResult = validateFormField(
        value,
        field.type,
        field.validation
      );
      if (!validationResult.isValid && validationResult.error) {
        onChange(value); // Propagate value even if invalid
      }
    }, 300),
    [field, onChange]
  );

  /**
   * Handles textarea value changes with validation
   */
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      onChange(newValue);
      debouncedValidation(newValue);
    },
    [onChange, debouncedValidation]
  );

  /**
   * Calculates and formats character count display
   */
  const characterCount = useMemo(() => {
    const currentLength = value.length;
    const maxLength = field.validation.maxLength;

    if (!maxLength) {
      return `${currentLength} characters`;
    }

    const remaining = maxLength - currentLength;
    const isNearLimit = remaining < 20;

    return (
      <span className={cn('text-xs', isNearLimit && 'text-warning-500')}>
        {currentLength}/{maxLength} characters
        {isNearLimit && ` (${remaining} remaining)`}
      </span>
    );
  }, [value, field.validation.maxLength]);

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {/* Field Label */}
      <label
        htmlFor={field.id}
        className="text-sm font-medium text-gray-700 flex items-center gap-1"
      >
        {field.label}
        {field.validation.required && (
          <span className="text-error-500 text-sm">*</span>
        )}
      </label>

      {/* Textarea Input */}
      <Textarea
        id={field.id}
        value={value}
        onChange={handleChange}
        error={error}
        disabled={disabled}
        placeholder={field.placeholder}
        rows={5}
        maxLength={field.validation.maxLength}
        required={field.validation.required}
        aria-describedby={`${field.id}-description`}
        aria-invalid={error ? true : undefined}
        className={cn(
          'min-h-[120px]',
          error && 'border-error-500 focus:border-error-500'
        )}
      />

      {/* Error Message */}
      {error && (
        <p
          id={`${field.id}-error`}
          className="text-sm text-error-500 mt-1"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Character Counter */}
      <div
        id={`${field.id}-description`}
        className="text-xs text-gray-500 text-right mt-0.5"
        aria-live="polite"
      >
        {characterCount}
      </div>
    </div>
  );
};

export default TextareaField;