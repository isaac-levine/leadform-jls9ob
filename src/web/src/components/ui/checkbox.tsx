"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"; // v1.0.0
import { clsx } from "clsx"; // v2.0.0
import { ComponentSize } from "../../types/ui.types";

/**
 * Props interface for the Checkbox component
 * Implements Acetunity UI and ShadCN design system specifications
 */
interface CheckboxProps {
  checked: boolean | "indeterminate";
  onChange: (checked: boolean) => void;
  label: string;
  size?: ComponentSize;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  ariaLabel?: string;
}

/**
 * A reusable, accessible checkbox component implementing Acetunity UI and ShadCN design system
 * specifications with support for size variants, labels, and disabled states.
 * 
 * @component
 * @example
 * ```tsx
 * <Checkbox
 *   checked={isChecked}
 *   onChange={setIsChecked}
 *   label="Accept terms"
 *   size={ComponentSize.MEDIUM}
 * />
 * ```
 */
const Checkbox = React.memo(({
  checked,
  onChange,
  label,
  size = ComponentSize.MEDIUM,
  disabled = false,
  className = "",
  id,
  name,
  required = false,
  ariaLabel,
}: CheckboxProps) => {
  // Generate unique ID if not provided
  const checkboxId = React.useMemo(() => id || `checkbox-${Math.random().toString(36).slice(2)}`, [id]);

  // Base styles following Acetunity UI specifications
  const baseStyles = "relative peer shrink-0 border rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

  // Size-specific styles
  const sizeStyles = {
    [ComponentSize.SMALL]: "h-4 w-4",
    [ComponentSize.MEDIUM]: "h-5 w-5",
  };

  // State-specific styles
  const stateStyles = "border-primary text-primary-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground";

  // Combine all styles using clsx
  const checkboxStyles = clsx(
    baseStyles,
    sizeStyles[size],
    stateStyles,
    className
  );

  // Label styles based on size
  const labelStyles = clsx(
    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    size === ComponentSize.SMALL ? "ml-2" : "ml-3"
  );

  return (
    <div className="flex items-center space-x-2">
      <CheckboxPrimitive.Root
        id={checkboxId}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        name={name}
        required={required}
        aria-label={ariaLabel || label}
        className={checkboxStyles}
      >
        <CheckboxPrimitive.Indicator
          className={clsx(
            "flex items-center justify-center text-current",
            size === ComponentSize.SMALL ? "text-[0.8rem]" : "text-[1rem]"
          )}
        >
          {checked === "indeterminate" ? (
            <MinusIcon className="h-full w-full" />
          ) : (
            <CheckIcon className="h-full w-full" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      
      {label && (
        <label
          htmlFor={checkboxId}
          className={labelStyles}
        >
          {label}
        </label>
      )}
    </div>
  );
});

Checkbox.displayName = "Checkbox";

// Icon components for checkbox states
const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const MinusIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export { Checkbox };
export type { CheckboxProps };