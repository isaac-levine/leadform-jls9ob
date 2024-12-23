"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { z } from 'zod'; // v3.0.0
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { 
  Organization, 
  OrganizationStatus, 
  SMSProviderType,
  SMSConfig,
  OrganizationMember,
  isSMSConfig 
} from '@/types/organization.types';
import { UserRole } from '@/types/auth.types';
import { validateUrl, validatePhone } from '@/utils/validation.utils';
import { createApiClient } from '@/lib/api';

// Zod schema for organization settings validation
const organizationSchema = z.object({
  name: z.string().min(2).max(100),
  status: z.nativeEnum(OrganizationStatus),
  smsConfig: z.object({
    providerType: z.nativeEnum(SMSProviderType),
    apiKey: z.string().min(10),
    apiSecret: z.string().min(10),
    fromNumber: z.string().refine(
      (val) => validatePhone(val).isValid,
      { message: "Invalid phone number format" }
    ),
    webhookUrl: z.string().refine(
      (val) => validateUrl(val).isValid,
      { message: "Invalid webhook URL" }
    )
  })
});

/**
 * Organization Settings Page Component
 * Provides secure interface for managing organization settings with role-based access
 */
const OrganizationSettingsPage: React.FC = () => {
  // Authentication and role validation
  const { user, validateRole } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state management
  const [formData, setFormData] = useState<Partial<Organization>>({});
  const [isEditing, setIsEditing] = useState(false);

  /**
   * Fetches organization data with error handling
   */
  const fetchOrganization = useCallback(async () => {
    try {
      if (!user?.organizationId) return;

      const apiClient = createApiClient(null);
      const response = await apiClient.get<Organization>(
        `/organizations/${user.organizationId}`
      );

      setOrganization(response.data);
      setFormData(response.data);
    } catch (err) {
      setError('Failed to load organization settings');
      console.error('Organization fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  // Load organization data on mount
  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  /**
   * Handles organization settings updates with validation
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate role permissions
      if (!validateRole(UserRole.ORGANIZATION_ADMIN)) {
        throw new Error('Insufficient permissions to update organization settings');
      }

      // Validate form data
      const validatedData = organizationSchema.parse(formData);

      const apiClient = createApiClient(null);
      await apiClient.put(
        `/organizations/${user?.organizationId}`,
        validatedData
      );

      setSuccessMessage('Organization settings updated successfully');
      setIsEditing(false);
      fetchOrganization(); // Refresh data
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError('Invalid form data. Please check your inputs.');
      } else {
        setError('Failed to update organization settings');
      }
      console.error('Settings update error:', err);
    }
  };

  /**
   * Handles SMS provider configuration updates with validation
   */
  const handleSMSConfigUpdate = async (config: SMSConfig) => {
    try {
      if (!validateRole(UserRole.ORGANIZATION_ADMIN)) {
        throw new Error('Insufficient permissions to update SMS configuration');
      }

      if (!isSMSConfig(config)) {
        throw new Error('Invalid SMS configuration');
      }

      const apiClient = createApiClient(null);
      await apiClient.put(
        `/organizations/${user?.organizationId}/sms-config`,
        config
      );

      setSuccessMessage('SMS configuration updated successfully');
      fetchOrganization(); // Refresh data
    } catch (err) {
      setError('Failed to update SMS configuration');
      console.error('SMS config update error:', err);
    }
  };

  if (loading) {
    return <div>Loading organization settings...</div>;
  }

  if (!organization) {
    return <div>No organization data available</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Organization Details Section */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Organization Settings</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  name: e.target.value
                })}
                disabled={!isEditing}
                className="w-full p-2 border rounded"
              />
            </div>

            {/* Organization Status */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Status
              </label>
              <select
                value={formData.status || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  status: e.target.value as OrganizationStatus
                })}
                disabled={!isEditing}
                className="w-full p-2 border rounded"
              >
                {Object.values(OrganizationStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={!validateRole(UserRole.ORGANIZATION_ADMIN)}
                >
                  Edit Settings
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SMS Configuration Section */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">SMS Provider Configuration</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Provider Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Provider Type
              </label>
              <select
                value={organization.smsConfig?.providerType || ''}
                onChange={(e) => handleSMSConfigUpdate({
                  ...organization.smsConfig,
                  providerType: e.target.value as SMSProviderType
                })}
                disabled={!validateRole(UserRole.ORGANIZATION_ADMIN)}
                className="w-full p-2 border rounded"
              >
                {Object.values(SMSProviderType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* API Credentials */}
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={organization.smsConfig?.apiKey || ''}
                  onChange={(e) => handleSMSConfigUpdate({
                    ...organization.smsConfig,
                    apiKey: e.target.value
                  })}
                  disabled={!validateRole(UserRole.ORGANIZATION_ADMIN)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  API Secret
                </label>
                <input
                  type="password"
                  value={organization.smsConfig?.apiSecret || ''}
                  onChange={(e) => handleSMSConfigUpdate({
                    ...organization.smsConfig,
                    apiSecret: e.target.value
                  })}
                  disabled={!validateRole(UserRole.ORGANIZATION_ADMIN)}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            {/* Phone Number Configuration */}
            <div>
              <label className="block text-sm font-medium mb-1">
                From Number
              </label>
              <input
                type="text"
                value={organization.smsConfig?.fromNumber || ''}
                onChange={(e) => handleSMSConfigUpdate({
                  ...organization.smsConfig,
                  fromNumber: e.target.value
                })}
                disabled={!validateRole(UserRole.ORGANIZATION_ADMIN)}
                className="w-full p-2 border rounded"
                placeholder="+1234567890"
              />
            </div>

            {/* Webhook Configuration */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Webhook URL
              </label>
              <input
                type="url"
                value={organization.smsConfig?.webhookUrl || ''}
                onChange={(e) => handleSMSConfigUpdate({
                  ...organization.smsConfig,
                  webhookUrl: e.target.value
                })}
                disabled={!validateRole(UserRole.ORGANIZATION_ADMIN)}
                className="w-full p-2 border rounded"
                placeholder="https://example.com/webhook"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default OrganizationSettingsPage;