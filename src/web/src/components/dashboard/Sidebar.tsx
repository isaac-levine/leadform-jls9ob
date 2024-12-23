/**
 * @file Sidebar navigation component for dashboard layout
 * @version 1.0.0
 * @description Implements responsive navigation with role-based access control,
 * accessibility features, and Acetunity UI design system integration
 */

import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'next-i18next';
import { clsx } from 'clsx';
import Button from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import { ButtonVariant } from '../../types/ui.types';
import { UserRole } from '../../types/auth.types';

// Icons for navigation items (imported from your icon library)
import {
  DashboardIcon,
  InboxIcon,
  FormIcon,
  ChartIcon,
  SettingsIcon
} from '../icons';

/**
 * Interface for navigation item configuration
 */
interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  requiredRole: UserRole | 'any';
  ariaLabel: string;
}

/**
 * Navigation items configuration with role-based access control
 */
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'nav.dashboard',
    icon: <DashboardIcon className="w-5 h-5" />,
    requiredRole: 'any',
    ariaLabel: 'Navigate to dashboard overview'
  },
  {
    path: '/dashboard/inbox',
    label: 'nav.inbox',
    icon: <InboxIcon className="w-5 h-5" />,
    requiredRole: UserRole.AGENT,
    ariaLabel: 'Navigate to SMS inbox'
  },
  {
    path: '/dashboard/forms',
    label: 'nav.forms',
    icon: <FormIcon className="w-5 h-5" />,
    requiredRole: UserRole.FORM_MANAGER,
    ariaLabel: 'Navigate to form management'
  },
  {
    path: '/dashboard/analytics',
    label: 'nav.analytics',
    icon: <ChartIcon className="w-5 h-5" />,
    requiredRole: UserRole.ADMIN,
    ariaLabel: 'Navigate to analytics dashboard'
  },
  {
    path: '/dashboard/settings',
    label: 'nav.settings',
    icon: <SettingsIcon className="w-5 h-5" />,
    requiredRole: UserRole.ADMIN,
    ariaLabel: 'Navigate to system settings'
  }
];

/**
 * Props interface for Sidebar component
 */
interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

/**
 * Sidebar navigation component with role-based access and accessibility
 * Implements dashboard navigation requirements from technical specification
 */
const Sidebar: React.FC<SidebarProps> = ({
  className,
  collapsed = false,
  onToggle
}) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { user, validateRole } = useAuth();

  /**
   * Checks if current route is active
   */
  const isActiveRoute = useCallback((itemPath: string): boolean => {
    return pathname?.startsWith(itemPath) ?? false;
  }, [pathname]);

  /**
   * Filters navigation items based on user role
   */
  const filteredNavItems = useMemo(() => {
    return NAVIGATION_ITEMS.filter(item => 
      item.requiredRole === 'any' || (user && validateRole(item.requiredRole))
    );
  }, [user, validateRole]);

  /**
   * Renders navigation items with accessibility and role-based access
   */
  const renderNavItems = () => {
    return filteredNavItems.map((item) => {
      const isActive = isActiveRoute(item.path);
      
      return (
        <Link
          key={item.path}
          href={item.path}
          passHref
          legacyBehavior
        >
          <Button
            variant={isActive ? ButtonVariant.ACTIVE : ButtonVariant.GHOST}
            className={clsx(
              'w-full justify-start gap-3 px-3 py-2',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              isActive ? 'bg-primary-50 text-primary-900' : 'text-gray-700 hover:bg-gray-100',
              collapsed && 'justify-center px-2'
            )}
            aria-label={item.ariaLabel}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.icon}
            {!collapsed && (
              <span className="text-sm font-medium">
                {t(item.label)}
              </span>
            )}
          </Button>
        </Link>
      );
    });
  };

  return (
    <nav
      className={clsx(
        'flex flex-col gap-1 p-2',
        'bg-white border-r border-gray-200',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
      aria-label="Main navigation"
      role="navigation"
    >
      {/* Navigation Items */}
      <div className="flex flex-col gap-1">
        {renderNavItems()}
      </div>

      {/* Collapse Toggle Button */}
      {onToggle && (
        <Button
          variant={ButtonVariant.GHOST}
          className="mt-auto p-2"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? '→' : '←'}
        </Button>
      )}
    </nav>
  );
};

export default React.memo(Sidebar);