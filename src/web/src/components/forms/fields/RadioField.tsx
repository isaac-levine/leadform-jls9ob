/**
 * @file RadioField component for form builder interface
 * @version 1.0.0
 * @description Accessible radio button field component with validation support
 * Implements WCAG 2.1 Level AA accessibility standards
 */

import React from 'react'; // v18.0.0
import { cn } from 'clsx'; // v2.0.0
import { Radio } from '../../ui/radio';
import { FormField } from '../../../types/form.types';
import { validateFormField } from '../../../utils/validation.utils';

/**
 * Props interface for RadioField component
 */
interface RadioFieldProps {
  field: FormField;                      // Form field configuration
  value: string;                         // Currently selected value
  onChange: (value: string) => void;     // Change handler
  error?: string;                        // Validation error message
  disabled?: boolean;                    // Disabled state
  className?: string;                    // Optional custom styling
}

/**
 * RadioField component that renders an accessible group of radio buttons
 * with validation support and error handling
 */
export const RadioField = React.memo(({
  field,
  value,
  onChange,
  error,
  disabled = false,
  className
}: RadioFieldProps) => {
  // Extract field configuration
  const { options = [], validation, label } = field;

  // Generate unique IDs for accessibility
  const fieldId = React.useMemo(() => `radio-${field.id}`, [field.id]);
  const errorId = React.useMemo(() => `${fieldId}-error`, [fieldId]);
  const descriptionId = React.useMemo(() => `${fieldId}-description`, [fieldId]);

  // Handle radio selection change
  const handleChange = React.useCallback((newValue: string) => {
    // Validate the new value
    const validationResult = validateFormField(newValue, field.type, validation);
    
    // Update value if valid or if the field is not required
    if (validationResult.isValid || !validation.required) {
      onChange(newValue);
    }
  }, [field.type, validation, onChange]);

  // Container classes for radio group
  const containerClasses = cn(
    'flex flex-col gap-2',
    error && 'text-red-500',
    className
  );

  // Radio group label classes
  const labelClasses = cn(
    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    validation.required && 'after:content-["*"] after:ml-0.5 after:text-red-500'
  );

  return (
    <div className={containerClasses} role="radiogroup" aria-labelledby={fieldId}>
      {/* Field label */}
      <label
        id={fieldId}
        className={labelClasses}
      >
        {label}
      </label>

      {/* Radio options */}
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option} className="flex items-center space-x-2">
            <Radio
              value={option}
              checked={value === option}
              onChange={() => handleChange(option)}
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : descriptionId}
              required={validation.required}
              name={fieldId}
            />
            <label
              htmlFor={`${fieldId}-${option}`}
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {option}
            </label>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-500 mt-1"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Hidden description for screen readers */}
      <span
        id={descriptionId}
        className="sr-only"
      >
        {validation.required ? 'Required.' : 'Optional.'} Select one option.
      </span>
    </div>
  );
});

// Set display name for debugging
RadioField.displayName = 'RadioField';

// Export component
export default RadioField;