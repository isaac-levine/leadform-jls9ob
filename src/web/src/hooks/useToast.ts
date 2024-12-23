// react v18.0.0
import React from 'react';
import { useUIStore } from '../../store/ui.store';
import { ToastVariant } from '../../types/ui.types';

/**
 * Valid positions for toast notifications
 */
export type ToastPosition = 
  | 'top'
  | 'bottom'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

/**
 * Configuration options for displaying a toast notification
 */
export interface ToastOptions {
  /** Visual variant of the toast */
  type: ToastVariant;
  /** Content message to display */
  message: string;
  /** Optional title for the toast */
  title?: string;
  /** Duration in milliseconds before auto-dismissal */
  duration?: number;
  /** Screen position for the toast */
  position?: ToastPosition;
  /** Optional action element to display */
  action?: React.ReactNode;
}

/**
 * Custom hook for managing toast notifications with support for different variants,
 * positions, and durations while ensuring accessibility and mobile responsiveness.
 * 
 * @returns Object containing toast management functions and state
 */
export const useToast = () => {
  // Access UI store for toast management
  const { showToast: showUIToast, hideToast: hideUIToast, toast } = useUIStore();

  // Default configuration values
  const DEFAULT_DURATION = 3000;
  const DEFAULT_POSITION: ToastPosition = 'bottom-right';

  /**
   * Displays a toast notification with the given options
   * @param options - Toast configuration options
   */
  const show = React.useCallback((options: ToastOptions) => {
    // Validate required fields
    if (!options.message || !options.type) {
      console.error('Toast requires message and type properties');
      return;
    }

    // Prepare toast props with defaults
    const toastProps = {
      variant: options.type,
      message: options.message,
      title: options.title,
      duration: options.duration || DEFAULT_DURATION,
      action: options.action,
      position: options.position || DEFAULT_POSITION,
    };

    showUIToast(toastProps);
  }, [showUIToast]);

  /**
   * Manually dismisses the current toast notification
   */
  const hide = React.useCallback(() => {
    hideUIToast();
  }, [hideUIToast]);

  /**
   * Cleanup on unmount
   */
  React.useEffect(() => {
    return () => {
      hideUIToast();
    };
  }, [hideUIToast]);

  return {
    /**
     * Display a toast notification
     */
    show,
    
    /**
     * Manually dismiss the current toast
     */
    hide,
    
    /**
     * Current visibility state of toast
     */
    isVisible: !!toast,
    
    /**
     * Current position of toast
     */
    position: toast?.position || DEFAULT_POSITION,
  };
};

export default useToast;
```

This implementation:

1. Provides a strongly-typed interface for toast notifications with comprehensive TypeScript definitions.
2. Integrates with the UI store for state management while providing a simplified API.
3. Supports all toast variants defined in the UI types (success, error, warning, info).
4. Implements flexible positioning options with sensible defaults.
5. Handles automatic cleanup and unmounting.
6. Includes validation for required fields.
7. Maintains accessibility through proper ARIA attributes (handled by the UI store).
8. Supports mobile responsiveness through position management.
9. Includes comprehensive JSDoc documentation for better developer experience.
10. Follows the technical specification's requirements for toast notifications.

The hook can be used in components like this:

```typescript
const MyComponent = () => {
  const toast = useToast();
  
  const handleSuccess = () => {
    toast.show({
      type: ToastVariant.SUCCESS,
      message: 'Operation completed successfully',
      duration: 5000,
      position: 'top-right'
    });
  };
  
  return <button onClick={handleSuccess}>Show Toast</button>;
};