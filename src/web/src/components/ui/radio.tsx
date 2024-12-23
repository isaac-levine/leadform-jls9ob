// react v18.0.0
// @radix-ui/react-radio-group v1.1.3
// clsx v2.0.0
import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from 'clsx';
import { ComponentSize } from '../../types/ui.types';

/**
 * Props interface for individual Radio component
 * Implements WCAG 2.1 Level AA accessibility requirements
 */
interface RadioProps {
  value: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: ComponentSize;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  required?: boolean;
  error?: boolean;
  name?: string;
}

/**
 * Props interface for RadioGroup component
 * Provides form integration and accessibility support
 */
interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  error?: boolean;
  orientation?: 'horizontal' | 'vertical';
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * Individual Radio component with accessibility features
 * Implements WCAG 2.1 Level AA compliant radio input
 */
const Radio = React.memo(({
  value,
  checked,
  onChange,
  size = ComponentSize.MEDIUM,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  required = false,
  error = false,
  name,
}: RadioProps) => {
  // Size-based styling configurations
  const sizeStyles = {
    [ComponentSize.SMALL]: 'h-4 w-4',
    [ComponentSize.MEDIUM]: 'h-5 w-5',
    [ComponentSize.LARGE]: 'h-6 w-6',
  };

  // Indicator size based on radio size
  const indicatorSizes = {
    [ComponentSize.SMALL]: 'h-2 w-2',
    [ComponentSize.MEDIUM]: 'h-2.5 w-2.5',
    [ComponentSize.LARGE]: 'h-3 w-3',
  };

  // Combine classes for radio button styling
  const radioClasses = cn(
    'peer shrink-0 border-2 border-slate-300 rounded-full',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'transition-all duration-200',
    error && 'border-red-500',
    sizeStyles[size],
    className
  );

  // Combine classes for indicator styling
  const indicatorClasses = cn(
    'flex items-center justify-center rounded-full bg-slate-900',
    'transition-transform duration-200',
    'data-[state=checked]:animate-scale-in',
    'data-[state=unchecked]:animate-scale-out',
    indicatorSizes[size]
  );

  return (
    <RadioGroupPrimitive.Item
      value={value}
      disabled={disabled}
      required={required}
      className={radioClasses}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      name={name}
      onCheckedChange={onChange}
    >
      <RadioGroupPrimitive.Indicator className={indicatorClasses} />
    </RadioGroupPrimitive.Item>
  );
});

/**
 * RadioGroup component for grouping radio buttons
 * Provides keyboard navigation and group-level accessibility
 */
const RadioGroup = React.memo(({
  value,
  onChange,
  children,
  className = '',
  disabled = false,
  name,
  required = false,
  error = false,
  orientation = 'vertical',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: RadioGroupProps) => {
  // Combine classes for radio group container
  const groupClasses = cn(
    'flex gap-2',
    orientation === 'vertical' ? 'flex-col' : 'flex-row items-center',
    error && 'text-red-500',
    className
  );

  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      name={name}
      required={required}
      orientation={orientation}
      className={groupClasses}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-invalid={error}
    >
      {children}
    </RadioGroupPrimitive.Root>
  );
});

// Set display names for debugging
Radio.displayName = 'Radio';
RadioGroup.displayName = 'RadioGroup';

// Export components
export { Radio, RadioGroup };
export type { RadioProps, RadioGroupProps };