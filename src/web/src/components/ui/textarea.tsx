/**
 * @file Textarea component implementation
 * @version 1.0.0
 * @description A reusable textarea component built with Acetunity UI and ShadCN that provides
 * a consistent multiline text input interface with comprehensive features and accessibility support.
 */

import React, { useEffect, useRef } from 'react';
import { cn } from 'clsx'; // v2.0.0
import { twMerge } from 'tailwind-merge'; // v3.0.0
import { ComponentSize } from '../../types/ui.types';
import { validateFormField } from '../../utils/validation.utils';
import { FormFieldType, FormFieldValidation } from '../../types/form.types';

/**
 * Gets Tailwind CSS classes for textarea size variants
 * @param size - Component size variant
 * @returns Combined Tailwind CSS classes
 */
const getTextareaSizeClasses = (size: ComponentSize): string => {
  switch (size) {
    case ComponentSize.SMALL:
      return 'px-2 py-1.5 text-sm';
    case ComponentSize.LARGE:
      return 'px-4 py-3 text-lg';
    case ComponentSize.MEDIUM:
    default:
      return 'px-3 py-2 text-base';
  }
};

/**
 * Interface for Textarea component props
 */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: ComponentSize;
  error?: string;
  className?: string;
  fullWidth?: boolean;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
  autoResize?: boolean;
  required?: boolean;
  spellCheck?: boolean;
  validation?: FormFieldValidation;
}

/**
 * Textarea component with comprehensive features and accessibility support
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      size = ComponentSize.MEDIUM,
      error,
      className,
      fullWidth = false,
      rows = 3,
      maxLength,
      showCharCount = false,
      autoResize = false,
      required = false,
      spellCheck = true,
      validation,
      onChange,
      onBlur,
      value = '',
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const mergedRef = (node: HTMLTextAreaElement) => {
      textareaRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    // Handle auto-resize functionality
    useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [value, autoResize]);

    // Handle onChange with validation
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e);
      }

      if (validation) {
        const validationResult = validateFormField(
          e.target.value,
          FormFieldType.TEXTAREA,
          validation
        );
        if (!validationResult.isValid && props['aria-invalid'] !== undefined) {
          props['aria-invalid'] = true;
        }
      }

      if (autoResize) {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }
    };

    // Handle blur with validation
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (onBlur) {
        onBlur(e);
      }

      if (validation) {
        validateFormField(e.target.value, FormFieldType.TEXTAREA, validation);
      }
    };

    // Calculate character count and remaining
    const charCount = String(value).length;
    const remainingChars = maxLength ? maxLength - charCount : null;

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        <textarea
          ref={mergedRef}
          className={twMerge(
            // Base styles
            'min-h-[60px] w-full rounded-md border border-gray-300 bg-transparent',
            'transition-colors duration-200',
            // Focus styles
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            // Size variant
            getTextareaSizeClasses(size),
            // Error state
            error && 'border-error-500 focus:border-error-500 focus:ring-error-500',
            // Disabled state
            props.disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            // Required state
            required && 'border-l-4 border-l-primary-500',
            // Full width
            fullWidth && 'w-full',
            // Custom classes
            className
          )}
          rows={rows}
          maxLength={maxLength}
          spellCheck={spellCheck}
          onChange={handleChange}
          onBlur={handleBlur}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-errormessage={error ? `${props.id}-error` : undefined}
          aria-required={required}
          {...props}
        />

        {/* Error message */}
        {error && (
          <div
            id={`${props.id}-error`}
            className="mt-1 text-sm text-error-500"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Character counter */}
        {showCharCount && (
          <div
            className="mt-1 text-right text-sm text-gray-500"
            aria-live="polite"
          >
            {maxLength ? (
              <span>
                {charCount}/{maxLength} characters
                {remainingChars !== null && remainingChars < 20 && (
                  <span className="ml-1 text-warning-500">
                    ({remainingChars} remaining)
                  </span>
                )}
              </span>
            ) : (
              <span>{charCount} characters</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

// Display name for debugging
Textarea.displayName = 'Textarea';

export default Textarea;