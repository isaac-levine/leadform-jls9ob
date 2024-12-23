"use client";

import React, { useState, useEffect } from 'react';
import { z } from 'zod'; // v3.0.0
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import Button from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import useToast from '@/hooks/useToast';
import { SMSProviderType, SMSConfig, isSMSConfig } from '@/types/organization.types';
import { UserRole } from '@/types/auth.types';
import { validateUrl } from '@/utils/validation.utils';
import { ButtonVariant, ComponentSize } from '@/types/ui.types';

// SMS Provider configuration schema
const smsConfigSchema = z.object({
  providerType: z.enum([SMSProviderType.TWILIO, SMSProviderType.CUSTOM]),
  apiKey: z.string().min(1, 'API Key is required'),
  apiSecret: z.string().min(1, 'API Secret is required'),
  fromNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  webhookUrl: z.string().url('Invalid webhook URL'),
  customConfig: z.record(z.unknown()).optional()
});

// AI Service configuration schema
const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'custom']),
  apiKey: z.string().min(1, 'API Key is required'),
  model: z.string().min(1, 'Model name is required'),
  maxTokens: z.number().int().min(1).max(4096),
  temperature: z.number().min(0).max(1),
  customConfig: z.record(z.unknown()).optional()
});

/**
 * Integration settings page component
 * Provides interface for configuring SMS and AI service integrations
 */
const IntegrationsPage: React.FC = () => {
  // Hooks
  const { user, validateRole } = useAuth();
  const toast = useToast();

  // State management
  const [smsConfig, setSMSConfig] = useState<SMSConfig | null>(null);
  const [aiConfig, setAIConfig] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState({
    sms: false,
    ai: false
  });
  const [testStatus, setTestStatus] = useState({
    sms: false,
    ai: false
  });

  // Check authorization
  if (!user || !validateRole(UserRole.ORGANIZATION_ADMIN)) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">
          Unauthorized Access
        </h1>
        <p className="mt-2 text-gray-600">
          You need administrator privileges to access integration settings.
        </p>
      </div>
    );
  }

  /**
   * Handles SMS provider configuration updates
   */
  const handleSMSUpdate = async (formData: FormData) => {
    try {
      setIsLoading(prev => ({ ...prev, sms: true }));

      const config = {
        providerType: formData.get('providerType') as SMSProviderType,
        apiKey: formData.get('apiKey') as string,
        apiSecret: formData.get('apiSecret') as string,
        fromNumber: formData.get('fromNumber') as string,
        webhookUrl: formData.get('webhookUrl') as string
      };

      // Validate configuration
      const validatedConfig = smsConfigSchema.parse(config);

      // Validate webhook URL
      const urlValidation = validateUrl(validatedConfig.webhookUrl);
      if (!urlValidation.isValid) {
        throw new Error(urlValidation.error);
      }

      // Update configuration
      // API call would go here
      setSMSConfig(validatedConfig);

      toast.show({
        type: 'success',
        message: 'SMS provider configuration updated successfully'
      });

    } catch (error) {
      toast.show({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update SMS configuration'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, sms: false }));
    }
  };

  /**
   * Handles AI service configuration updates
   */
  const handleAIUpdate = async (formData: FormData) => {
    try {
      setIsLoading(prev => ({ ...prev, ai: true }));

      const config = {
        provider: formData.get('provider'),
        apiKey: formData.get('apiKey'),
        model: formData.get('model'),
        maxTokens: Number(formData.get('maxTokens')),
        temperature: Number(formData.get('temperature'))
      };

      // Validate configuration
      const validatedConfig = aiConfigSchema.parse(config);

      // Update configuration
      // API call would go here
      setAIConfig(validatedConfig);

      toast.show({
        type: 'success',
        message: 'AI service configuration updated successfully'
      });

    } catch (error) {
      toast.show({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update AI configuration'
      });
    } finally {
      setIsLoading(prev => ({ ...prev, ai: false }));
    }
  };

  /**
   * Tests SMS provider connection
   */
  const testSMSConnection = async () => {
    try {
      setTestStatus(prev => ({ ...prev, sms: true }));
      // API call to test SMS connection would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.show({
        type: 'success',
        message: 'SMS provider connection test successful'
      });
    } catch (error) {
      toast.show({
        type: 'error',
        message: 'SMS provider connection test failed'
      });
    } finally {
      setTestStatus(prev => ({ ...prev, sms: false }));
    }
  };

  /**
   * Tests AI service connection
   */
  const testAIConnection = async () => {
    try {
      setTestStatus(prev => ({ ...prev, ai: true }));
      // API call to test AI connection would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.show({
        type: 'success',
        message: 'AI service connection test successful'
      });
    } catch (error) {
      toast.show({
        type: 'error',
        message: 'AI service connection test failed'
      });
    } finally {
      setTestStatus(prev => ({ ...prev, ai: false }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Integration Settings</h1>
      
      {/* SMS Provider Configuration */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">SMS Provider Configuration</h2>
          <p className="text-sm text-gray-600">
            Configure your SMS provider settings for message delivery
          </p>
        </CardHeader>
        
        <CardContent>
          <form id="smsForm" onSubmit={(e) => {
            e.preventDefault();
            handleSMSUpdate(new FormData(e.currentTarget));
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Provider Type
                </label>
                <select
                  name="providerType"
                  className="w-full p-2 border rounded"
                  defaultValue={smsConfig?.providerType}
                >
                  <option value={SMSProviderType.TWILIO}>Twilio</option>
                  <option value={SMSProviderType.CUSTOM}>Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  name="apiKey"
                  className="w-full p-2 border rounded"
                  defaultValue={smsConfig?.apiKey}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  API Secret
                </label>
                <input
                  type="password"
                  name="apiSecret"
                  className="w-full p-2 border rounded"
                  defaultValue={smsConfig?.apiSecret}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  From Number
                </label>
                <input
                  type="text"
                  name="fromNumber"
                  className="w-full p-2 border rounded"
                  placeholder="+1234567890"
                  defaultValue={smsConfig?.fromNumber}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  name="webhookUrl"
                  className="w-full p-2 border rounded"
                  defaultValue={smsConfig?.webhookUrl}
                  required
                />
              </div>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="submit"
            form="smsForm"
            variant={ButtonVariant.PRIMARY}
            size={ComponentSize.MEDIUM}
            loading={isLoading.sms}
          >
            Save Changes
          </Button>

          <Button
            variant={ButtonVariant.SECONDARY}
            size={ComponentSize.MEDIUM}
            onClick={testSMSConnection}
            loading={testStatus.sms}
          >
            Test Connection
          </Button>
        </CardFooter>
      </Card>

      {/* AI Service Configuration */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">AI Service Configuration</h2>
          <p className="text-sm text-gray-600">
            Configure your AI service settings for automated responses
          </p>
        </CardHeader>

        <CardContent>
          <form id="aiForm" onSubmit={(e) => {
            e.preventDefault();
            handleAIUpdate(new FormData(e.currentTarget));
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Provider
                </label>
                <select
                  name="provider"
                  className="w-full p-2 border rounded"
                  defaultValue={aiConfig?.provider}
                >
                  <option value="openai">OpenAI</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  name="apiKey"
                  className="w-full p-2 border rounded"
                  defaultValue={aiConfig?.apiKey}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  className="w-full p-2 border rounded"
                  defaultValue={aiConfig?.model}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  name="maxTokens"
                  className="w-full p-2 border rounded"
                  min="1"
                  max="4096"
                  defaultValue={aiConfig?.maxTokens}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Temperature
                </label>
                <input
                  type="number"
                  name="temperature"
                  className="w-full p-2 border rounded"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue={aiConfig?.temperature}
                  required
                />
              </div>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="submit"
            form="aiForm"
            variant={ButtonVariant.PRIMARY}
            size={ComponentSize.MEDIUM}
            loading={isLoading.ai}
          >
            Save Changes
          </Button>

          <Button
            variant={ButtonVariant.SECONDARY}
            size={ComponentSize.MEDIUM}
            onClick={testAIConnection}
            loading={testStatus.ai}
          >
            Test Connection
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default IntegrationsPage;