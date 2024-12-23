// react v18.0.0
// clsx v2.0.0
// tailwind-merge v3.0.0
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ButtonProps, ButtonVariant, ComponentSize } from '../../types/ui.types';
import Spinner from './spinner';

/**
 * Style configurations for different button variants
 */
const variantStyles = {
  [ButtonVariant.PRIMARY]: {
    base: 'bg-primary-600 text-white border border-transparent',
    hover: 'hover:bg-primary-700',
    focus: 'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    active: 'active:bg-primary-800',
    disabled: 'disabled:bg-primary-300 disabled:cursor-not-allowed',
  },
  [ButtonVariant.SECONDARY]: {
    base: 'bg-secondary-100 text-secondary-900 border border-transparent',
    hover: 'hover:bg-secondary-200',
    focus: 'focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2',
    active: 'active:bg-secondary-300',
    disabled: 'disabled:bg-secondary-50 disabled:text-secondary-400 disabled:cursor-not-allowed',
  },
  [ButtonVariant.OUTLINE]: {
    base: 'bg-transparent border border-gray-300 text-gray-700',
    hover: 'hover:bg-gray-50',
    focus: 'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    active: 'active:bg-gray-100',
    disabled: 'disabled:bg-transparent disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed',
  },
  [ButtonVariant.GHOST]: {
    base: 'bg-transparent text-gray-700',
    hover: 'hover:bg-gray-100',
    focus: 'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
    active: 'active:bg-gray-200',
    disabled: 'disabled:bg-transparent disabled:text-gray-400 disabled:cursor-not-allowed',
  },
};

/**
 * Size-specific styles configuration
 */
const sizeStyles = {
  [ComponentSize.SMALL]: {
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    iconSpacing: 'gap-1.5',
  },
  [ComponentSize.MEDIUM]: {
    padding: 'px-4 py-2',
    text: 'text-base',
    iconSpacing: 'gap-2',
  },
  [ComponentSize.LARGE]: {
    padding: 'px-6 py-3',
    text: 'text-lg',
    iconSpacing: 'gap-3',
  },
};

/**
 * A reusable button component that implements Acetunity UI and ShadCN design systems.
 * Supports multiple variants, sizes, loading states, and enhanced accessibility features.
 *
 * @param {ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>} props - Component props
 * @returns {JSX.Element} Rendered button component
 */
const Button: React.FC<ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  variant = ButtonVariant.PRIMARY,
  size = ComponentSize.MEDIUM,
  loading = false,
  icon,
  iconPosition = 'left',
  className,
  disabled = false,
  children,
  type = 'button',
  ...props
}) => {
  // Get variant-specific styles
  const variantStyle = variantStyles[variant];
  
  // Get size-specific styles
  const sizeStyle = sizeStyles[size];

  // Combine all classes with proper precedence
  const buttonClasses = twMerge(
    clsx(
      // Base button styles
      'inline-flex items-center justify-center font-medium rounded-md',
      'transition-colors duration-200 ease-in-out',
      'focus:outline-none',
      
      // Variant-specific styles
      variantStyle.base,
      variantStyle.hover,
      variantStyle.focus,
      variantStyle.active,
      variantStyle.disabled,
      
      // Size-specific styles
      sizeStyle.padding,
      sizeStyle.text,
      
      // Icon spacing
      icon && sizeStyle.iconSpacing,
      
      // Loading state styles
      loading && 'relative',
      
      // Custom classes
      className
    )
  );

  // Content visibility during loading
  const contentClasses = clsx(
    'flex items-center',
    icon && sizeStyle.iconSpacing,
    loading && 'invisible'
  );

  // Determine if button should be disabled
  const isDisabled = disabled || loading;

  // Handle icon positioning
  const IconElement = icon && (
    <span className={clsx(
      'flex-shrink-0',
      loading && 'invisible'
    )}>
      {icon}
    </span>
  );

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={size} />
        </span>
      )}

      {/* Button content with icon positioning */}
      <span className={contentClasses}>
        {iconPosition === 'left' && IconElement}
        {children}
        {iconPosition === 'right' && IconElement}
      </span>
    </button>
  );
};

export default Button;