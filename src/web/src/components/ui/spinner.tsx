import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ComponentSize } from '../../types/ui.types';

/**
 * Props interface for the Spinner component
 * @interface SpinnerProps
 */
interface SpinnerProps {
  /** Size variant of the spinner */
  size?: ComponentSize;
  /** Additional CSS classes to apply */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Size-specific dimensions and styles for the spinner
 */
const sizeStyles = {
  [ComponentSize.SMALL]: {
    containerClass: 'w-4 h-4',
    svgClass: 'w-4 h-4'
  },
  [ComponentSize.MEDIUM]: {
    containerClass: 'w-8 h-8',
    svgClass: 'w-8 h-8'
  },
  [ComponentSize.LARGE]: {
    containerClass: 'w-12 h-12',
    svgClass: 'w-12 h-12'
  }
};

/**
 * A reusable loading spinner component that supports different sizes,
 * themes, and accessibility features. Built with Acetunity UI and ShadCN.
 * 
 * @param {SpinnerProps & React.HTMLAttributes<HTMLDivElement>} props - Component props
 * @returns {JSX.Element} Rendered spinner component
 */
const Spinner: React.FC<SpinnerProps & React.HTMLAttributes<HTMLDivElement>> = ({
  size = ComponentSize.MEDIUM,
  className,
  ariaLabel = 'Loading',
  ...props
}) => {
  // Get size-specific styles
  const { containerClass, svgClass } = sizeStyles[size];

  // Combine classes with theme-aware colors and animation
  const containerClasses = twMerge(
    clsx(
      // Base classes
      'inline-flex items-center justify-center',
      containerClass,
      // Theme-aware color classes
      'text-primary-600 dark:text-primary-400',
      className
    )
  );

  const spinnerClasses = clsx(
    svgClass,
    // Animation with reduced motion support
    'animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]'
  );

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={containerClasses}
      {...props}
    >
      <svg
        className={spinnerClasses}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

export default Spinner;