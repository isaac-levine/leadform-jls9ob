// react v18.0.0
import { ReactNode } from 'react';
import { AuthUser } from '../types/auth.types';

/**
 * Enumeration of button style variants following Acetunity UI design system
 */
export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  OUTLINE = 'outline',
  GHOST = 'ghost'
}

/**
 * Enumeration of standard component size options
 * Used across various UI components for consistent sizing
 */
export enum ComponentSize {
  SMALL = 'sm',
  MEDIUM = 'md',
  LARGE = 'lg'
}

/**
 * Interface for Button component props
 * Implements Acetunity UI button specifications
 */
export interface ButtonProps {
  variant: ButtonVariant;                // Button style variant
  size: ComponentSize;                   // Button size
  loading?: boolean;                     // Loading state flag
  icon?: ReactNode;                      // Optional icon element
  children: ReactNode;                   // Button content
  disabled?: boolean;                    // Disabled state
  onClick?: () => void;                  // Click handler
  type?: 'button' | 'submit' | 'reset';  // Button type attribute
  className?: string;                    // Additional CSS classes
}

/**
 * Enumeration of toast notification variants
 * Defines available styles for toast messages
 */
export enum ToastVariant {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Interface for Toast component props
 * Implements notification system requirements
 */
export interface ToastProps {
  variant: ToastVariant;      // Toast style variant
  message: string;            // Toast message content
  duration?: number;          // Display duration in milliseconds
  onClose: () => void;        // Close handler
  title?: string;             // Optional toast title
  action?: ReactNode;         // Optional action element
}

/**
 * Interface for Dialog component props
 * Implements modal dialog requirements
 */
export interface DialogProps {
  open: boolean;              // Dialog visibility state
  title: string;              // Dialog title
  children: ReactNode;        // Dialog content
  onClose: () => void;        // Close handler
  size?: ComponentSize;       // Dialog size
  closeOnOverlayClick?: boolean; // Close when clicking overlay
  showCloseButton?: boolean;  // Show close button option
}

/**
 * Interface for Avatar component props
 * Implements user avatar display requirements
 */
export interface AvatarProps {
  user: AuthUser;             // User data for avatar
  size: ComponentSize;        // Avatar size
  showStatus?: boolean;       // Show online status option
  className?: string;         // Additional CSS classes
  onClick?: () => void;       // Click handler
}

/**
 * Interface for Input component props
 * Implements form input field requirements
 */
export interface InputProps {
  type: 'text' | 'email' | 'password' | 'number' | 'tel';
  value: string | number;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  size?: ComponentSize;
  className?: string;
}

/**
 * Interface for Card component props
 * Implements card container requirements
 */
export interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

/**
 * Interface for Badge component props
 * Implements status indicator requirements
 */
export interface BadgeProps {
  variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  children: ReactNode;
  size?: ComponentSize;
  className?: string;
}

/**
 * Interface for Menu component props
 * Implements dropdown menu requirements
 */
export interface MenuProps {
  items: Array<{
    label: string;
    value: string;
    icon?: ReactNode;
    disabled?: boolean;
  }>;
  onSelect: (value: string) => void;
  trigger: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}