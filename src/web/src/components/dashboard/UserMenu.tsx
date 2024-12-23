/**
 * @file User menu component for dashboard with enhanced security and accessibility
 * @version 1.0.0
 */

import React, { memo, useCallback } from 'react';
import { clsx } from 'clsx'; // v2.0.0
import { Dropdown } from '../ui/dropdown';
import { useAuth } from '../../hooks/useAuth';
import { AuthUser, UserRole } from '../../types/auth.types';

/**
 * Interface for user menu options with role-based access control
 */
interface UserMenuOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  requiredRole?: UserRole;
  ariaLabel: string;
}

/**
 * Default user avatar component with accessibility support
 */
const UserAvatar: React.FC<{ user: AuthUser }> = memo(({ user }) => (
  <div 
    className={clsx(
      'w-8 h-8 rounded-full bg-primary-600 text-white',
      'flex items-center justify-center text-sm font-medium'
    )}
    role="img"
    aria-label={`${user.name}'s avatar`}
  >
    {user.name.charAt(0).toUpperCase()}
  </div>
));

UserAvatar.displayName = 'UserAvatar';

/**
 * Menu options configuration with role-based access
 * Implements role-based access control from technical specifications
 */
const USER_MENU_OPTIONS: UserMenuOption[] = [
  {
    value: 'profile',
    label: 'Profile Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    ariaLabel: 'View and edit profile settings'
  },
  {
    value: 'organization',
    label: 'Organization',
    requiredRole: UserRole.ORGANIZATION_ADMIN,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    ariaLabel: 'Manage organization settings'
  },
  {
    value: 'settings',
    label: 'System Settings',
    requiredRole: UserRole.ADMIN,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    ariaLabel: 'Access system settings'
  },
  {
    value: 'logout',
    label: 'Sign Out',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
    ariaLabel: 'Sign out of your account'
  }
];

/**
 * UserMenu component with enhanced security and accessibility
 * Implements user interface design requirements from technical specifications
 */
const UserMenu: React.FC = memo(() => {
  const { user, logout, isAuthenticated } = useAuth();

  // Filter menu options based on user role
  const filteredOptions = USER_MENU_OPTIONS.filter(option => 
    !option.requiredRole || (user && option.requiredRole && user.role >= option.requiredRole)
  );

  /**
   * Handles menu option selection with security checks
   */
  const handleOptionSelect = useCallback(async (value: string) => {
    if (!user || !isAuthenticated) return;

    try {
      switch (value) {
        case 'logout':
          await logout();
          break;
        // Add additional option handlers here
      }
    } catch (error) {
      console.error('Menu action failed:', error);
      // Error handling should be implemented based on your error handling strategy
    }
  }, [user, isAuthenticated, logout]);

  if (!user) return null;

  return (
    <div className="relative">
      <Dropdown
        options={filteredOptions.map(option => ({
          value: option.value,
          label: option.label,
          disabled: false
        }))}
        value=""
        onChange={handleOptionSelect}
        className="w-56"
        renderTrigger={({ isOpen, onClick }) => (
          <button
            onClick={onClick}
            className={clsx(
              'flex items-center space-x-3 p-2 rounded-lg',
              'hover:bg-gray-100 transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              isOpen && 'bg-gray-100'
            )}
            aria-label="Open user menu"
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <UserAvatar user={user} />
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user.name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user.email}
              </div>
            </div>
            <svg
              className={clsx(
                'w-5 h-5 text-gray-400 transition-transform duration-200',
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
          </button>
        )}
      />
    </div>
  );
});

UserMenu.displayName = 'UserMenu';

export default UserMenu;