"use client";

import React, { useCallback, useState } from 'react';
import { clsx } from 'clsx'; // v2.0.0
import Link from 'next/link'; // v14.0.0
import { useMediaQuery } from '@react-hook/media-query'; // v1.1.1
import ThemeToggle from './ThemeToggle';
import NotificationCenter from './NotificationCenter';
import UserMenu from './UserMenu';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth.types';
import { ButtonVariant, ComponentSize } from '../../types/ui.types';

// Interface for Navbar component props
interface NavbarProps {
  className?: string;
  skipLinkHref?: string;
  ariaLabel?: string;
}

// Interface for navigation items with role-based access
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredRoles: UserRole[];
  ariaLabel: string;
  testId: string;
}

// Navigation items configuration with role-based access control
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    requiredRoles: [UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN, UserRole.AGENT],
    ariaLabel: 'Navigate to dashboard overview',
    testId: 'nav-dashboard'
  },
  {
    label: 'SMS Inbox',
    href: '/dashboard/inbox',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    requiredRoles: [UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN, UserRole.AGENT],
    ariaLabel: 'Navigate to SMS inbox',
    testId: 'nav-inbox'
  },
  {
    label: 'Forms',
    href: '/dashboard/forms',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    requiredRoles: [UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN, UserRole.FORM_MANAGER],
    ariaLabel: 'Navigate to form management',
    testId: 'nav-forms'
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    requiredRoles: [UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN],
    ariaLabel: 'Navigate to analytics dashboard',
    testId: 'nav-analytics'
  }
];

/**
 * Navbar component with role-based access control, theme toggle, and notifications
 * Implements WCAG 2.1 Level AA accessibility standards
 */
const Navbar: React.FC<NavbarProps> = ({
  className,
  skipLinkHref = '#main-content',
  ariaLabel = 'Main navigation'
}) => {
  // Get authentication context
  const { user, validateRole } = useAuth();

  // State for mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check mobile breakpoint
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Filter navigation items based on user role
  const filteredNavItems = NAV_ITEMS.filter(item =>
    item.requiredRoles.some(role => validateRole(role))
  );

  // Toggle mobile menu
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsMobileMenuOpen(false);
    }
  }, []);

  return (
    <nav
      className={clsx(
        'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700',
        'fixed top-0 left-0 right-0 z-30',
        className
      )}
      role="navigation"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {/* Skip navigation link for accessibility */}
      <a
        href={skipLinkHref}
        className={clsx(
          'sr-only focus:not-sr-only',
          'focus:absolute focus:top-0 focus:left-0',
          'focus:p-2 focus:bg-primary-500 focus:text-white',
          'focus:z-50'
        )}
      >
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/dashboard"
                className="text-2xl font-bold text-primary-600 dark:text-primary-400"
                aria-label="Return to dashboard"
              >
                Logo
              </Link>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              {filteredNavItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md',
                    'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
                    'dark:text-gray-200 dark:hover:text-white dark:hover:bg-gray-700',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500'
                  )}
                  aria-label={item.ariaLabel}
                  data-testid={item.testId}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <NotificationCenter />
            <UserMenu />

            {/* Mobile menu button */}
            <button
              type="button"
              className={clsx(
                'md:hidden inline-flex items-center justify-center p-2',
                'rounded-md text-gray-500 hover:text-gray-900',
                'dark:text-gray-400 dark:hover:text-white',
                'focus:outline-none focus:ring-2 focus:ring-primary-500'
              )}
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Open main menu"
            >
              <span className="sr-only">
                {isMobileMenuOpen ? 'Close main menu' : 'Open main menu'}
              </span>
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={clsx(
          'md:hidden',
          isMobileMenuOpen ? 'block' : 'hidden'
        )}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="mobile-menu-button"
      >
        <div className="px-2 pt-2 pb-3 space-y-1">
          {filteredNavItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'block px-3 py-2 rounded-md text-base font-medium',
                'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
                'dark:text-gray-200 dark:hover:text-white dark:hover:bg-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-primary-500'
              )}
              aria-label={item.ariaLabel}
              role="menuitem"
              data-testid={`${item.testId}-mobile`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;