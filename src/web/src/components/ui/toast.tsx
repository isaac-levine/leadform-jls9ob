// react v18.0.0
// framer-motion v10.0.0
// clsx v2.0.0
import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from 'clsx';
import { ToastVariant, ToastProps } from '../../types/ui.types';
import useUIStore from '../../store/ui.store';

// Constants for toast configuration
const DEFAULT_DURATION = 3000;
const ANIMATION_DURATION = 0.2;
const TOAST_Z_INDEX = 50;
const ARIA_LIVE_DELAY = 100;

/**
 * Toast component for displaying temporary notifications
 * Implements Acetunity UI and ShadCN design system
 */
const Toast = React.memo<ToastProps>(({ 
  variant, 
  message, 
  duration = DEFAULT_DURATION, 
  onClose,
  icon 
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  /**
   * Get variant-specific styles based on Acetunity UI design system
   */
  const getVariantStyles = (variant: ToastVariant): string => {
    const baseStyles = 'rounded-lg p-4 shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px]';
    
    const variantStyles = {
      [ToastVariant.SUCCESS]: 'bg-green-50 text-green-800 border border-green-200 hover:bg-green-100',
      [ToastVariant.ERROR]: 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100',
      [ToastVariant.WARNING]: 'bg-yellow-50 text-yellow-800 border border-yellow-200 hover:bg-yellow-100',
      [ToastVariant.INFO]: 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
    };

    return cn(baseStyles, variantStyles[variant]);
  };

  const defaultIcons = {
    [ToastVariant.SUCCESS]: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    [ToastVariant.ERROR]: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    [ToastVariant.WARNING]: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    [ToastVariant.INFO]: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: ANIMATION_DURATION }}
      className={getVariantStyles(variant)}
      role="alert"
      aria-live="polite"
    >
      {icon || defaultIcons[variant]}
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-auto hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
});

Toast.displayName = 'Toast';

/**
 * Container component for managing toast notifications
 * Handles positioning and animation of toasts
 */
export const ToastContainer: React.FC = () => {
  const { toast, hideToast } = useUIStore();

  // Ensure screen readers announce the toast after a brief delay
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        const alertElement = document.querySelector('[role="alert"]');
        if (alertElement) {
          alertElement.setAttribute('aria-live', 'assertive');
        }
      }, ARIA_LIVE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div 
      className={cn(
        'fixed bottom-4 right-4',
        'flex flex-col gap-2',
        `z-[${TOAST_Z_INDEX}]`
      )}
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="sync">
        {toast && (
          <Toast
            variant={toast.variant}
            message={toast.message}
            duration={toast.duration}
            onClose={hideToast}
            icon={toast.icon}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Toast;
```

This implementation provides a robust toast notification component with the following features:

1. Follows Acetunity UI and ShadCN design system with consistent styling
2. Supports multiple variants (success, error, warning, info) with appropriate colors and icons
3. Implements smooth animations using Framer Motion
4. Ensures accessibility with proper ARIA attributes and keyboard navigation
5. Provides customizable duration and auto-dismiss functionality
6. Includes custom icon support with fallback to default icons
7. Uses React.memo for performance optimization
8. Implements proper cleanup of timers and event listeners
9. Supports responsive design with flexible width constraints
10. Integrates with the global UI store for state management

The component can be used throughout the application by accessing the `useUIStore` hook:

```typescript
const { showToast } = useUIStore();

// Example usage
showToast({
  variant: ToastVariant.SUCCESS,
  message: "Operation completed successfully",
  duration: 5000 // optional
});