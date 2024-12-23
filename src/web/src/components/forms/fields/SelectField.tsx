// react v18.0.0
// clsx v2.0.0
import * as React from 'react';
import { cn } from 'clsx';
import Select from '../../ui/select';
import { FormField } from '../../../types/form.types';
import { validateFormField } from '../../../utils/validation.utils';

/**
 * Interface for SelectField component props
 * Implements form field requirements with comprehensive configuration
 */
export interface SelectFieldProps {
  field: FormField;                                      // Form field configuration
  value: string;                                         // Current field value
  onChange: (value: string) => void;                     // Value change handler
  error?: string;                                        // Error message
  disabled?: boolean;                                    // Disabled state
  loading?: boolean;                                     // Loading state
  onFocus?: (event: React.FocusEvent) => void;          // Focus event handler
  onBlur?: (event: React.FocusEvent) => void;           // Blur event handler
  className?: string;                                    // Additional CSS classes
  description?: string;                                  // Field description
}

/**
 * Converts string array options to SelectOption format
 * @param options - Array of option strings
 * @returns Formatted select options with accessibility metadata
 */
const getSelectOptions = (options: string[] = []): Array<{
  value: string;
  label: string;
  ariaLabel?: string;
}> => {
  return options.map((option) => ({
    value: option,
    label: option,
    ariaLabel: `Select ${option}`,
  }));
};

/**
 * SelectField component for form builder
 * Implements accessible dropdown selection with validation support
 */
export const SelectField: React.FC<SelectFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
  loading = false,
  onFocus,
  onBlur,
  className,
  description,
}) => {
  // State for field validation and interaction
  const [isFocused, setIsFocused] = React.useState(false);
  const [validationMessage, setValidationMessage] = React.useState<string>('');
  const fieldId = React.useId();

  // Handle value changes with validation
  const handleChange = React.useCallback(
    (newValue: string) => {
      const validation = validateFormField(newValue, field.type, field.validation);
      setValidationMessage(validation.error || '');
      onChange(newValue);
    },
    [field, onChange]
  );

  // Handle focus events
  const handleFocus = React.useCallback(
    (event: React.FocusEvent) => {
      setIsFocused(true);
      onFocus?.(event);

      // Announce field description to screen readers
      if (description) {
        const announcement = new CustomEvent('announce', {
          detail: { message: description },
        });
        window.dispatchEvent(announcement);
      }
    },
    [description, onFocus]
  );

  // Handle blur events
  const handleBlur = React.useCallback(
    (event: React.FocusEvent) => {
      setIsFocused(false);
      const validation = validateFormField(value, field.type, field.validation);
      setValidationMessage(validation.error || '');
      onBlur?.(event);
    },
    [field, value, onBlur]
  );

  // Effect for initial validation
  React.useEffect(() => {
    if (value) {
      const validation = validateFormField(value, field.type, field.validation);
      setValidationMessage(validation.error || '');
    }
  }, [field, value]);

  return (
    <div className={cn('form-field-container', className)}>
      {/* Field Label */}
      <label
        htmlFor={fieldId}
        className={cn(
          'block text-sm font-medium text-gray-700 dark:text-gray-200',
          field.validation.required && 'required'
        )}
      >
        {field.label}
        {field.validation.required && (
          <span className="text-red-500 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* Field Description */}
      {description && (
        <div
          id={`${fieldId}-description`}
          className="mt-1 text-sm text-gray-500 dark:text-gray-400"
        >
          {description}
        </div>
      )}

      {/* Select Component */}
      <div className="mt-1">
        <Select
          options={getSelectOptions(field.options)}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          loading={loading}
          error={error || validationMessage}
          className={cn(
            'w-full',
            isFocused && 'ring-2 ring-primary',
            (error || validationMessage) && 'border-red-500'
          )}
          ariaLabel={field.label}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
        />
      </div>

      {/* Error Message */}
      {(error || validationMessage) && (
        <div
          className={cn(
            'mt-1 text-sm text-red-500',
            'animate-fadeIn transition-all duration-200'
          )}
          id={`${fieldId}-error`}
          role="alert"
        >
          {error || validationMessage}
        </div>
      )}
    </div>
  );
};

export default SelectField;