// react v18.0.0
// @radix-ui/react-select v2.0.0
// clsx v2.0.0
import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from 'clsx';
import { ComponentSize } from '../../types/ui.types';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

// Interface for select option items with enhanced accessibility properties
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
}

// Props interface for Select component with comprehensive configuration options
export interface SelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  size?: ComponentSize;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  loading?: boolean;
  ariaLabel?: string;
  onBlur?: () => void;
  customIcon?: React.ReactNode;
  renderOption?: (option: SelectOption) => React.ReactNode;
}

// Helper function to generate comprehensive class names for select component
const getSelectClasses = (
  size: ComponentSize,
  disabled: boolean,
  hasError: boolean,
  className?: string,
  isLoading?: boolean,
  isTouchDevice?: boolean
): string => {
  return cn(
    // Base classes
    'relative w-full rounded-md border border-input bg-background text-sm ring-offset-background',
    // Size variants
    {
      'h-8 px-2 py-1 text-xs': size === ComponentSize.SMALL,
      'h-10 px-3 py-2': size === ComponentSize.MEDIUM,
      'h-12 px-4 py-3 text-lg': size === ComponentSize.LARGE,
    },
    // State classes
    {
      'cursor-not-allowed opacity-50': disabled,
      'border-red-500 focus:ring-red-500': hasError,
      'animate-pulse': isLoading,
      'touch-manipulation': isTouchDevice,
    },
    // Focus and hover states
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    'hover:bg-accent hover:text-accent-foreground',
    // Custom classes
    className
  );
};

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  size = ComponentSize.MEDIUM,
  placeholder,
  disabled = false,
  error,
  className,
  loading = false,
  ariaLabel,
  onBlur,
  customIcon,
  renderOption,
}) => {
  const [open, setOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);

  // Handle touch device detection
  React.useEffect(() => {
    setIsTouchDevice('ontouchstart' in window);
  }, []);

  // Handle mounting animation
  React.useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Handle value change with enhanced error handling
  const handleValueChange = React.useCallback(
    (newValue: string) => {
      try {
        onChange(newValue);
        setOpen(false);
        onBlur?.();
      } catch (err) {
        console.error('Error handling select value change:', err);
      }
    },
    [onChange, onBlur]
  );

  return (
    <SelectPrimitive.Root
      value={String(value)}
      onValueChange={handleValueChange}
      disabled={disabled || loading}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectPrimitive.Trigger
        className={getSelectClasses(
          size,
          disabled,
          Boolean(error),
          className,
          loading,
          isTouchDevice
        )}
        aria-label={ariaLabel}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'select-error' : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <SelectPrimitive.Value
            placeholder={placeholder || 'Select an option'}
          />
          {customIcon || (
            <SelectPrimitive.Icon>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </SelectPrimitive.Icon>
          )}
        </div>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            'relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
            isMounted ? 'opacity-100' : 'opacity-0'
          )}
          position="popper"
          sideOffset={5}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 cursor-default items-center justify-center bg-popover">
            <ChevronUp className="h-4 w-4" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={String(option.value)}
                disabled={option.disabled}
                className={cn(
                  'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  {
                    'cursor-not-allowed': option.disabled,
                  }
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>

                {renderOption ? (
                  renderOption(option)
                ) : (
                  <div className="flex items-center gap-2">
                    {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                    <div>
                      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="flex h-6 cursor-default items-center justify-center bg-popover">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>

      {error && (
        <span id="select-error" className="mt-1 text-sm text-red-500">
          {error}
        </span>
      )}
    </SelectPrimitive.Root>
  );
};

export default Select;