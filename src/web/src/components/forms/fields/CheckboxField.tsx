/**
 * @file CheckboxField component implementation
 * @version 1.0.0
 * @description A form field component that renders an accessible checkbox input with label,
 * validation, and error handling following Acetunity UI and ShadCN design system specifications.
 */

import React, { useCallback, useMemo } from 'react';
import { clsx } from 'clsx'; // v2.0.0
import { Checkbox } from '../../ui/checkbox';
import { FormField, FormFieldType } from '../../../types/form.types';
import { validateFormField } from '../../../utils/validation.utils';
import { ComponentSize } from '../../../types/ui.types';

/**
 * Props interface for the CheckboxField component
 */
interface CheckboxFieldProps {
  field: FormField;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
  testId?: string;
}

/**
 * A form field component that renders an accessible checkbox input with validation
 * and error handling following Acetunity UI and ShadCN design system specifications.
 *
 * @component
 * @example
 * ```tsx
 * <CheckboxField
 *   field={{
 *     id: 'terms',
 *     type: FormFieldType.CHECKBOX,
 *     label: 'Accept Terms',
 *     validation: { required: true }
 *   }}
 *   value={false}
 *   onChange={(value) => handleChange(value)}
 * />
 * ```
 */
export const CheckboxField = React.memo(({
  field,
  value,
  onChange,
  error,
  className,
  disabled = false,
  testId
}: CheckboxFieldProps) => {
  // Validate field type
  if (field.type !== FormFieldType.CHECKBOX) {
    console.error('CheckboxField received incorrect field type:', field.type);
    return null;
  }

  // Memoize validation check
  const validationResult = useMemo(() => {
    return validateFormField(value, field.type, field.validation);
  }, [value, field.type, field.validation]);

  // Memoize error message
  const errorMessage = useMemo(() => {
    return error || (!validationResult.isValid ? validationResult.error : undefined);
  }, [error, validationResult]);

  // Handle checkbox change with validation
  const handleChange = useCallback((checked: boolean) => {
    onChange(checked);
  }, [onChange]);

  // Generate unique ID for accessibility
  const fieldId = useMemo(() => `checkbox-${field.id}`, [field.id]);

  // Compute wrapper class names
  const wrapperClassName = clsx(
    'flex flex-col gap-1',
    {
      'opacity-50 cursor-not-allowed': disabled,
    },
    className
  );

  // Compute error class names
  const errorClassName = clsx(
    'text-sm text-destructive',
    'animate-in fade-in-50 slide-in-from-bottom-1'
  );

  return (
    <div 
      className={wrapperClassName}
      data-testid={testId}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          id={fieldId}
          checked={value}
          onChange={handleChange}
          label={field.label}
          disabled={disabled}
          size={ComponentSize.MEDIUM}
          required={field.validation.required}
          aria-describedby={errorMessage ? `${fieldId}-error` : undefined}
          aria-invalid={!!errorMessage}
        />
      </div>

      {/* Error message with ARIA support */}
      {errorMessage && (
        <div 
          id={`${fieldId}-error`}
          className={errorClassName}
          role="alert"
          aria-live="polite"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
});

// Display name for debugging
CheckboxField.displayName = 'CheckboxField';