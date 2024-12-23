/**
 * @file Enhanced input component with validation, accessibility, and state management
 * @version 1.0.0
 */

import React, { forwardRef, useCallback, useEffect, useState } from 'react'; // react v18.0.0
import { cn } from 'clsx'; // clsx v2.0.0
import { twMerge } from 'tailwind-merge'; // tailwind-merge v3.0.0
import { ComponentSize } from '../../types/ui.types';
import { validateFormField } from '../../utils/validation.utils';
import { FormFieldType, FormFieldValidation } from '../../types/form.types';

/**
 * Interface for validation state
 */
interface ValidationState {
  isValid: boolean;
  error?: string;
}

/**
 * Interface for enhanced input component props
 */
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: ComponentSize;
  error?: string;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  validation?: FormFieldValidation;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onValidation?: (result: ValidationState) => void;
}

/**
 * Returns Tailwind CSS classes for input size variants
 * @param size - Component size variant
 */
const getInputSizeClasses = (size: ComponentSize = ComponentSize.MEDIUM): string => {
  const baseClasses = 'rounded-md transition-all duration-200';
  
  const sizeClasses = {
    [ComponentSize.SMALL]: 'px-2 py-1 text-sm',
    [ComponentSize.MEDIUM]: 'px-3 py-2 text-base',
    [ComponentSize.LARGE]: 'px-4 py-3 text-lg'
  };

  return `${baseClasses} ${sizeClasses[size]}`;
};

/**
 * Enhanced input component with validation and accessibility features
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  size = ComponentSize.MEDIUM,
  error,
  className,
  fullWidth = false,
  startIcon,
  endIcon,
  validation,
  ariaLabel,
  ariaDescribedBy,
  onValidation,
  disabled,
  required,
  type = 'text',
  value = '',
  onChange,
  onBlur,
  ...rest
}, ref) => {
  // Local validation state
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true
  });

  // Validation timeout ref for debouncing
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  /**
   * Handles input validation with debouncing
   */
  const handleValidation = useCallback((value: string) => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    const timeout = setTimeout(() => {
      if (validation) {
        const result = validateFormField(
          value,
          type as unknown as FormFieldType,
          validation
        );

        setValidationState(result);
        onValidation?.(result);
      }
    }, 300); // 300ms debounce

    setValidationTimeout(timeout);
  }, [validation, onValidation, type]);

  // Cleanup validation timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  /**
   * Handles input change with validation
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    handleValidation(e.target.value);
  };

  /**
   * Handles input blur with validation
   */
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e);
    handleValidation(e.target.value);
  };

  // Compute input container classes
  const containerClasses = cn(
    'relative inline-flex items-center',
    {
      'w-full': fullWidth,
      'opacity-60 cursor-not-allowed': disabled
    },
    className
  );

  // Compute input classes
  const inputClasses = twMerge(
    getInputSizeClasses(size),
    'border border-gray-300 bg-white',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
    'disabled:bg-gray-50 disabled:cursor-not-allowed',
    'placeholder:text-gray-400',
    'w-full',
    {
      'pl-10': startIcon,
      'pr-10': endIcon,
      'border-error-500 focus:ring-error-500 focus:border-error-500': error || !validationState.isValid
    }
  );

  // Generate unique IDs for accessibility
  const errorId = `${rest.id || 'input'}-error`;
  const descriptionId = ariaDescribedBy || errorId;

  return (
    <div className={containerClasses}>
      {/* Start Icon */}
      {startIcon && (
        <div className="absolute left-3 flex items-center pointer-events-none">
          {startIcon}
        </div>
      )}

      {/* Input Element */}
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        className={inputClasses}
        aria-label={ariaLabel}
        aria-invalid={!!error || !validationState.isValid}
        aria-describedby={descriptionId}
        {...rest}
      />

      {/* End Icon */}
      {endIcon && (
        <div className="absolute right-3 flex items-center pointer-events-none">
          {endIcon}
        </div>
      )}

      {/* Error Message */}
      {(error || !validationState.isValid) && (
        <div
          id={errorId}
          className="absolute -bottom-6 left-0 text-sm text-error-500"
          role="alert"
        >
          {error || validationState.error}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;