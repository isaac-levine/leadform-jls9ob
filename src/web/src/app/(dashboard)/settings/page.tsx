'use client';

import React, { useState, useCallback } from 'react';
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';

/**
 * Settings page component providing secure, role-based access to application settings
 * Implements WCAG 2.1 Level AA accessibility standards
 */
const SettingsPage: React.FC = () => {
  // Get authentication context and role validation
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Ensure user is authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-600" role="alert">
          Please log in to access settings
        </p>
      </div>
    );
  }

  /**
   * Sanitizes user input to prevent XSS attacks
   * @param input - Raw user input
   * @returns Sanitized string
   */
  const sanitizeInput = useCallback((input: string): string => {
    return sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'recursiveEscape'
    });
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your account, organization, and integration settings
        </p>
      </header>

      {/* Settings Tabs */}
      <TabsRoot
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
        aria-label="Settings tabs"
      >
        <TabsList className="mb-8" aria-label="Settings sections">
          {/* Profile Tab - Available to all authenticated users */}
          <TabsTrigger value="profile" className="px-4 py-2">
            Profile Settings
          </TabsTrigger>

          {/* Organization Tab - Restricted to admin roles */}
          {hasRole(UserRole.ORGANIZATION_ADMIN) && (
            <TabsTrigger value="organization" className="px-4 py-2">
              Organization Settings
            </TabsTrigger>
          )}

          {/* Integrations Tab - Restricted to admin roles */}
          {hasRole(UserRole.ORGANIZATION_ADMIN) && (
            <TabsTrigger value="integrations" className="px-4 py-2">
              SMS Integration
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Settings Content */}
        <TabsContent
          value="profile"
          role="tabpanel"
          aria-labelledby="profile-tab"
          className="focus:outline-none"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
            <div className="space-y-6">
              {/* Profile Form - Implement in separate component */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500">
                  Update your personal information and preferences
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Organization Settings Content */}
        {hasRole(UserRole.ORGANIZATION_ADMIN) && (
          <TabsContent
            value="organization"
            role="tabpanel"
            aria-labelledby="organization-tab"
            className="focus:outline-none"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Organization Settings</h2>
              <div className="space-y-6">
                {/* Organization Form - Implement in separate component */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500">
                    Manage organization details and member access
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {/* SMS Integration Settings Content */}
        {hasRole(UserRole.ORGANIZATION_ADMIN) && (
          <TabsContent
            value="integrations"
            role="tabpanel"
            aria-labelledby="integrations-tab"
            className="focus:outline-none"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">SMS Integration</h2>
              <div className="space-y-6">
                {/* SMS Integration Form - Implement in separate component */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500">
                    Configure SMS provider settings and webhooks
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </TabsRoot>

      {/* Accessibility Skip Link */}
      <div className="sr-only focus:not-sr-only">
        <a href="#main-content" className="focus:outline-none focus:ring-2">
          Skip to main content
        </a>
      </div>
    </div>
  );
};

export default SettingsPage;