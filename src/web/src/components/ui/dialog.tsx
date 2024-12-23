// react v18.0.0
// clsx v2.0.0
// tailwind-merge v3.0.0
import React, { useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DialogProps } from '../../types/ui.types';
import Button from './button';

/**
 * A reusable dialog component that provides an accessible modal overlay
 * with focus management, keyboard navigation, and WCAG 2.1 Level AA compliance.
 * Built with Acetunity UI and ShadCN design systems.
 */
const Dialog = React.memo<DialogProps & React.HTMLAttributes<HTMLDivElement>>(({
  open,
  title,
  children,
  onClose,
  initialFocusRef,
  className,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  ...props
}) => {
  // Refs for focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  /**
   * Handles focus trap within the dialog
   * Ensures keyboard navigation stays within the modal
   */
  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (!dialogRef.current) return;

    const focusableElements = dialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }, []);

  /**
   * Handles keyboard events for accessibility
   * Implements ESC key to close dialog
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
    handleTabKey(event);
  }, [onClose, handleTabKey]);

  /**
   * Manages focus when dialog opens/closes
   * Implements WCAG 2.1 focus management requirements
   */
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Set initial focus
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (dialogRef.current) {
        const firstFocusable = dialogRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        firstFocusable?.focus();
      }

      // Add keyboard event listeners
      document.addEventListener('keydown', handleKeyDown);
      
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    } else {
      // Restore focus to previous element
      previousActiveElement.current?.focus();
      
      // Remove keyboard event listeners
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore background scrolling
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [open, handleKeyDown, initialFocusRef]);

  // Don't render if dialog is not open
  if (!open) return null;

  // Size-specific styles
  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  // Combine classes with proper precedence
  const overlayClasses = twMerge(
    clsx(
      'fixed inset-0 bg-black/50 backdrop-blur-sm',
      'transition-opacity duration-200',
      'flex items-center justify-center',
      'z-50'
    )
  );

  const dialogClasses = twMerge(
    clsx(
      // Base styles
      'relative bg-white dark:bg-gray-800',
      'rounded-lg shadow-xl',
      'w-full mx-4',
      'animate-in fade-in-0 zoom-in-95',
      'duration-200',
      
      // Size variant
      sizeStyles[size],
      
      // Custom classes
      className
    )
  );

  return (
    <div
      className={overlayClasses}
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={dialogClasses}
        onClick={e => e.stopPropagation()}
        {...props}
      >
        {/* Dialog Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="dialog-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            {title}
          </h2>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close dialog"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>

        {/* Dialog Content */}
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
});

Dialog.displayName = 'Dialog';

export default Dialog;