/**
 * Unit tests for SMS service and provider implementations
 * Tests provider abstraction, message processing, and error handling
 * @version 1.0.0
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { SMSService } from '../../src/lib/sms/sms.service';
import { TwilioProvider } from '../../src/lib/sms/providers/twilio.provider';
import { SMSConfig, SMSMessage } from '../../src/types/sms.types';
import { MessageStatus } from '../../src/types/message.types';

// Mock configurations
const mockSMSConfig: SMSConfig = {
  provider: 'TWILIO',
  accountSid: 'test_account_sid',
  authToken: 'test_auth_token',
  phoneNumber: '+1234567890',
  webhookUrl: 'https://test.com/webhook',
  maxRetries: 3,
  rateLimits: {
    requestsPerMinute: 100,
    requestsPerDay: 10000
  }
};

const mockMessage: SMSMessage = {
  messageId: 'test_message_id',
  to: '+1987654321',
  from: '+1234567890',
  body: 'Test message',
  metadata: {},
  scheduledAt: null,
  retryCount: 0
};

// Mock provider response
const mockProviderResponse = {
  success: true,
  providerMessageId: 'test_provider_id',
  error: null,
  status: MessageStatus.SENT,
  retryCount: 0,
  providerSpecificData: {},
  processedAt: new Date()
};

describe('SMSService', () => {
  let smsService: SMSService;
  let mockTwilioProvider: jest.Mocked<TwilioProvider>;

  beforeEach(() => {
    // Reset mocks and service instance before each test
    jest.clearAllMocks();
    
    // Mock TwilioProvider implementation
    mockTwilioProvider = {
      initialize: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue(mockProviderResponse),
      validateConfig: jest.fn().mockReturnValue(true)
    } as unknown as jest.Mocked<TwilioProvider>;

    // Initialize service with mocked dependencies
    smsService = SMSService.getInstance(mockSMSConfig);
  });

  describe('Initialization and Configuration', () => {
    test('should create singleton instance with valid configuration', () => {
      const instance1 = SMSService.getInstance(mockSMSConfig);
      const instance2 = SMSService.getInstance(mockSMSConfig);
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(SMSService);
    });

    test('should throw error with invalid configuration', () => {
      const invalidConfig = { ...mockSMSConfig, accountSid: '' };
      
      expect(() => {
        SMSService.getInstance(invalidConfig);
      }).toThrow('Invalid SMS configuration');
    });

    test('should validate provider-specific configuration', () => {
      const config = { ...mockSMSConfig, provider: 'INVALID_PROVIDER' };
      
      expect(() => {
        SMSService.getInstance(config);
      }).toThrow('Unsupported SMS provider');
    });
  });

  describe('Message Processing', () => {
    test('should process message within 5 second SLA', async () => {
      const startTime = Date.now();
      
      await smsService.sendMessage(mockMessage);
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(5000);
    });

    test('should queue message with correct metadata', async () => {
      const queueSpy = jest.spyOn(smsService as any, 'addToQueue');
      
      await smsService.sendMessage(mockMessage);
      
      expect(queueSpy).toHaveBeenCalledWith(expect.objectContaining({
        ...mockMessage,
        metadata: expect.objectContaining({
          provider: mockSMSConfig.provider,
          queuedAt: expect.any(Date)
        })
      }));
    });

    test('should emit correct events during processing', async () => {
      const eventSpy = jest.spyOn(smsService as any, 'events');
      
      await smsService.sendMessage(mockMessage);
      
      expect(eventSpy.emit).toHaveBeenCalledWith('sms:message:queued', expect.any(Object));
      expect(eventSpy.emit).toHaveBeenCalledWith('sms:message:sent', expect.any(Object));
    });
  });

  describe('Provider Abstraction', () => {
    test('should handle provider switching without message loss', async () => {
      // Initial send with first provider
      await smsService.sendMessage(mockMessage);
      
      // Switch provider configuration
      const newConfig = { ...mockSMSConfig, provider: 'CUSTOM' };
      smsService = SMSService.getInstance(newConfig);
      
      // Send with new provider
      await smsService.sendMessage(mockMessage);
      
      expect(mockTwilioProvider.sendMessage).toHaveBeenCalledTimes(1);
    });

    test('should maintain message state across provider changes', async () => {
      const message = { ...mockMessage, metadata: { customField: 'value' } };
      
      await smsService.sendMessage(message);
      
      expect(mockTwilioProvider.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            customField: 'value'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should implement retry mechanism for failed messages', async () => {
      mockTwilioProvider.sendMessage
        .mockRejectedValueOnce(new Error('Provider error'))
        .mockResolvedValueOnce(mockProviderResponse);
      
      await smsService.sendMessage(mockMessage);
      
      expect(mockTwilioProvider.sendMessage).toHaveBeenCalledTimes(2);
    });

    test('should respect max retry attempts configuration', async () => {
      mockTwilioProvider.sendMessage.mockRejectedValue(new Error('Provider error'));
      
      await expect(smsService.sendMessage(mockMessage))
        .rejects
        .toThrow('Max retry attempts exceeded');
      
      expect(mockTwilioProvider.sendMessage).toHaveBeenCalledTimes(mockSMSConfig.maxRetries);
    });

    test('should handle provider-specific errors appropriately', async () => {
      const providerError = {
        code: 'PROVIDER_ERROR',
        message: 'Invalid recipient',
        status: 400
      };
      
      mockTwilioProvider.sendMessage.mockRejectedValue(providerError);
      
      await expect(smsService.sendMessage(mockMessage))
        .rejects
        .toMatchObject({
          code: 'SMS_PROVIDER_ERROR',
          originalError: providerError
        });
    });

    test('should log errors with appropriate context', async () => {
      const loggerSpy = jest.spyOn(smsService as any, 'logger');
      const error = new Error('Provider error');
      
      mockTwilioProvider.sendMessage.mockRejectedValue(error);
      
      await expect(smsService.sendMessage(mockMessage)).rejects.toThrow();
      
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to send message',
        error,
        expect.objectContaining({
          messageId: mockMessage.messageId
        })
      );
    });
  });

  describe('Webhook Handling', () => {
    test('should validate webhook signatures', async () => {
      const webhookPayload = {
        providerMessageId: 'test_id',
        status: MessageStatus.DELIVERED,
        timestamp: new Date(),
        securitySignature: 'valid_signature'
      };
      
      await smsService.handleDeliveryStatus(webhookPayload);
      
      expect(mockTwilioProvider.validateWebhookSignature)
        .toHaveBeenCalledWith(webhookPayload);
    });

    test('should update message status on valid webhook', async () => {
      const webhookPayload = {
        providerMessageId: mockMessage.messageId,
        status: MessageStatus.DELIVERED,
        timestamp: new Date(),
        securitySignature: 'valid_signature'
      };
      
      await smsService.handleDeliveryStatus(webhookPayload);
      
      expect(smsService.getMessageStatus(mockMessage.messageId))
        .resolves
        .toBe(MessageStatus.DELIVERED);
    });
  });
});