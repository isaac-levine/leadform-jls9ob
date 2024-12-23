import React, { useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion'; // ^10.0.0
import { useMediaQuery } from '@react-hook/media-query'; // ^1.1.1
import { Toast } from '../ui/toast';
import { useToast } from '../../hooks/useToast';
import { useUIStore } from '../../store/ui.store';
import { useAnalytics } from '../../hooks/useAnalytics';
import { ToastVariant } from '../../types/ui.types';

// Constants for animation and timing
const ANIMATION_DURATION = 0.2;
const TOAST_AUTO_DISMISS_DURATION = 5000;

// Toast positioning based on viewport
const NOTIFICATION_POSITION = {
  desktop: 'top-right' as const,
  mobile: 'bottom-center' as const,
};

/**
 * NotificationCenter component that manages and displays system notifications
 * using toast messages with accessibility support and mobile responsiveness
 */
const NotificationCenter = React.memo(() => {
  // Get toast state and management functions
  const { toast, hideToast } = useUIStore();
  const { show: showToast, hide: hideToastMessage } = useToast();
  const { trackToastEvent } = useAnalytics();

  // Media queries for responsive behavior
  const isMobile = useMediaQuery('(max-width: 768px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Handle toast dismissal with analytics tracking
  const handleToastDismiss = useCallback(async () => {
    if (toast) {
      try {
        await trackToastEvent({
          messageId: toast.message,
          action: 'dismiss',
          variant: toast.variant
        });
        hideToast();
      } catch (error) {
        console.error('Failed to track toast dismissal:', error);
        hideToast(); // Still hide toast even if tracking fails
      }
    }
  }, [toast, hideToast, trackToastEvent]);

  // Auto-dismiss toast after duration
  useEffect(() => {
    if (toast && toast.duration !== Infinity) {
      const timer = setTimeout(
        handleToastDismiss,
        toast.duration || TOAST_AUTO_DISMISS_DURATION
      );
      return () => clearTimeout(timer);
    }
  }, [toast, handleToastDismiss]);

  // Get position based on viewport
  const position = isMobile 
    ? NOTIFICATION_POSITION.mobile 
    : NOTIFICATION_POSITION.desktop;

  // Animation variants with reduced motion support
  const animationVariants = {
    initial: {
      opacity: 0,
      y: position.includes('top') ? -20 : 20,
      scale: prefersReducedMotion ? 1 : 0.95,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
    exit: {
      opacity: 0,
      y: position.includes('top') ? -20 : 20,
      scale: prefersReducedMotion ? 1 : 0.95,
    },
  };

  // Position styles based on viewport
  const getPositionStyles = () => {
    const baseStyles = 'fixed z-50 flex items-center justify-center p-4';
    const positionStyles = {
      'top-right': 'top-0 right-0',
      'bottom-center': 'bottom-0 left-1/2 transform -translate-x-1/2',
    };
    return `${baseStyles} ${positionStyles[position]}`;
  };

  return (
    <div 
      className={getPositionStyles()}
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="sync">
        {toast && (
          <motion.div
            key={toast.message}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={animationVariants}
            transition={{
              duration: prefersReducedMotion ? 0 : ANIMATION_DURATION,
              ease: 'easeInOut',
            }}
          >
            <Toast
              variant={toast.variant}
              message={toast.message}
              title={toast.title}
              action={toast.action}
              onClose={handleToastDismiss}
              aria-live={
                toast.variant === ToastVariant.ERROR ? 'assertive' : 'polite'
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

NotificationCenter.displayName = 'NotificationCenter';

export default NotificationCenter;