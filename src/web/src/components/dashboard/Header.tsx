/**
 * @file Dashboard header component with enhanced accessibility and responsive design
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx'; // v2.0.0
import NotificationCenter from './NotificationCenter';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';

/**
 * Props interface for Header component with accessibility support
 */
interface HeaderProps {
  /** Additional CSS classes to apply */
  className?: string;
  /** Accessible label for the header */
  ariaLabel?: string;
  /** Flag to enable reduced motion for animations */
  reducedMotion?: boolean;
}

/**
 * Dashboard header component that provides navigation, notifications,
 * theme control and user menu functionality with enhanced accessibility.
 * Implements Acetunity UI and ShadCN design system requirements.
 */
const Header: React.FC<HeaderProps> = React.memo(({
  className,
  ariaLabel = 'Dashboard header',
  reducedMotion = false
}) => {
  // State for header scroll behavior
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Handle scroll events for header styling
  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    setIsScrolled(scrollPosition > 0);
  }, []);

  // Set up scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Combine classes for header container
  const headerClasses = clsx(
    // Base styles
    'fixed top-0 left-0 right-0 z-50',
    'h-16 px-4 md:px-6',
    'flex items-center justify-between',
    'bg-white dark:bg-gray-900',
    'transition-all duration-200',
    
    // Conditional styles
    isScrolled && 'border-b border-gray-200 dark:border-gray-800 shadow-sm',
    !isScrolled && 'bg-opacity-90 backdrop-blur-sm',
    
    // Custom classes
    className
  );

  // Combine classes for actions container
  const actionsClasses = clsx(
    'flex items-center space-x-2 md:space-x-4'
  );

  return (
    <header
      className={headerClasses}
      role="banner"
      aria-label={ariaLabel}
    >
      {/* Logo and branding section */}
      <div className="flex items-center">
        <span 
          className="text-xl font-semibold text-gray-900 dark:text-white"
          aria-label="Dashboard logo"
        >
          Lead Capture
        </span>
      </div>

      {/* Actions section */}
      <div className={actionsClasses}>
        {/* Notification center with badge and toast support */}
        <div className="relative" aria-label="Notifications">
          <NotificationCenter
            showBadge={true}
            showToasts={true}
          />
        </div>

        {/* Theme toggle with smooth transitions */}
        <div 
          className="relative"
          aria-label="Theme toggle"
        >
          <ThemeToggle />
        </div>

        {/* User menu with proper keyboard navigation */}
        <div 
          className="relative"
          aria-label="User menu"
        >
          <UserMenu />
        </div>
      </div>

      {/* Accessibility announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
      >
        {isScrolled ? 'Header is fixed' : 'Header is at top'}
      </div>
    </header>
  );
});

// Display name for debugging
Header.displayName = 'Header';

export default Header;