// react v18.0.0
// clsx v2.0.0
// tailwind-merge v3.0.0
import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ComponentSize } from '../../types/ui.types';
import Button from './button';

/**
 * Interface for individual dropdown option
 */
interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Props for the dropdown trigger button when using custom render
 */
interface DropdownTriggerProps {
  isOpen: boolean;
  selectedLabel: string;
  onClick: () => void;
  disabled?: boolean;
  ref: React.RefObject<HTMLButtonElement>;
}

/**
 * Props interface for the Dropdown component
 */
interface DropdownProps {
  /** Array of options to display in the dropdown */
  options: DropdownOption[];
  /** Currently selected value(s) */
  value: string | string[];
  /** Handler for value change events */
  onChange: (value: string | string[]) => void;
  /** Size variant of the dropdown */
  size?: ComponentSize;
  /** Placeholder text when no option is selected */
  placeholder?: string;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Enable multiple selection mode */
  multiple?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether the dropdown is in an invalid state */
  isInvalid?: boolean;
  /** Error message to display when invalid */
  errorMessage?: string;
  /** Custom render function for the trigger button */
  renderTrigger?: (props: DropdownTriggerProps) => React.ReactNode;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Size-specific styles configuration
 */
const sizeStyles = {
  [ComponentSize.SMALL]: {
    trigger: 'text-sm py-1',
    menu: 'text-sm',
    option: 'py-1.5 px-3',
  },
  [ComponentSize.MEDIUM]: {
    trigger: 'text-base py-2',
    menu: 'text-base',
    option: 'py-2 px-4',
  },
  [ComponentSize.LARGE]: {
    trigger: 'text-lg py-2.5',
    menu: 'text-lg',
    option: 'py-2.5 px-5',
  },
};

/**
 * A reusable dropdown component that implements WCAG 2.1 Level AA accessibility standards
 * with keyboard navigation support and screen reader announcements.
 */
const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  size = ComponentSize.MEDIUM,
  placeholder = 'Select an option',
  disabled = false,
  multiple = false,
  className,
  isInvalid = false,
  errorMessage,
  renderTrigger,
  ariaLabel,
}) => {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  // Refs for DOM elements
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Get size-specific styles
  const style = sizeStyles[size];

  // Helper to get selected labels
  const getSelectedLabels = (): string[] => {
    if (!value) return [];
    const values = Array.isArray(value) ? value : [value];
    return options
      .filter(opt => values.includes(opt.value))
      .map(opt => opt.label);
  };

  // Display value for trigger
  const displayValue = getSelectedLabels().join(', ') || placeholder;

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation handlers
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          handleOptionSelect(options[focusedIndex]);
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      default:
        break;
    }
  };

  // Focus management
  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, isOpen]);

  // Option selection handler
  const handleOptionSelect = (option: DropdownOption) => {
    if (option.disabled) return;

    if (multiple) {
      const values = Array.isArray(value) ? value : [];
      const newValue = values.includes(option.value)
        ? values.filter(v => v !== option.value)
        : [...values, option.value];
      onChange(newValue);
    } else {
      onChange(option.value);
      setIsOpen(false);
    }
  };

  // Combine classes for the container
  const containerClasses = twMerge(
    clsx(
      'relative inline-block w-full',
      className
    )
  );

  // Classes for the trigger button
  const triggerClasses = clsx(
    'w-full flex items-center justify-between',
    'border rounded-md bg-white',
    'transition-colors duration-200',
    style.trigger,
    isInvalid ? 'border-red-500' : 'border-gray-300',
    !disabled && 'hover:border-primary-500',
    isOpen && 'border-primary-500 ring-2 ring-primary-500 ring-opacity-50',
    disabled && 'bg-gray-50 cursor-not-allowed'
  );

  // Classes for the dropdown menu
  const menuClasses = clsx(
    'absolute z-50 w-full mt-1',
    'bg-white border border-gray-200 rounded-md shadow-lg',
    'max-h-60 overflow-auto',
    style.menu
  );

  // Render the trigger button
  const triggerButton = renderTrigger ? (
    renderTrigger({
      isOpen,
      selectedLabel: displayValue,
      onClick: () => !disabled && setIsOpen(!isOpen),
      disabled,
      ref: triggerRef,
    })
  ) : (
    <Button
      ref={triggerRef}
      type="button"
      className={triggerClasses}
      onClick={() => !disabled && setIsOpen(!isOpen)}
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-labelledby={ariaLabel}
    >
      <span className="truncate">{displayValue}</span>
      <span className="ml-2 pointer-events-none">
        <svg
          className={clsx(
            'h-5 w-5 text-gray-400',
            isOpen && 'transform rotate-180'
          )}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M7 7l3-3 3 3m0 6l-3 3-3-3"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Button>
  );

  return (
    <div className={containerClasses}>
      {triggerButton}

      {isOpen && (
        <div
          ref={menuRef}
          className={menuClasses}
          role="listbox"
          aria-multiselectable={multiple}
          onKeyDown={handleKeyDown}
        >
          {options.map((option, index) => {
            const isSelected = Array.isArray(value)
              ? value.includes(option.value)
              : value === option.value;

            return (
              <div
                key={option.value}
                ref={el => (optionRefs.current[index] = el)}
                className={clsx(
                  'cursor-pointer outline-none',
                  style.option,
                  isSelected && 'bg-primary-50 text-primary-900',
                  !isSelected && 'text-gray-900',
                  !option.disabled && 'hover:bg-primary-50',
                  option.disabled && 'opacity-50 cursor-not-allowed',
                  focusedIndex === index && 'ring-2 ring-primary-500'
                )}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                tabIndex={focusedIndex === index ? 0 : -1}
                onClick={() => handleOptionSelect(option)}
              >
                <div className="flex items-center">
                  {multiple && (
                    <span className="mr-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="h-4 w-4 rounded border-gray-300 text-primary-600"
                      />
                    </span>
                  )}
                  {option.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isInvalid && errorMessage && (
        <div className="mt-1 text-sm text-red-500" role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default Dropdown;