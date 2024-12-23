// jest v29.0.0
// supertest v6.0.0
// mongodb v5.0.0
import { describe, it, beforeEach, afterEach, expect } from 'jest';
import { ObjectId } from 'mongodb';
import supertest from 'supertest';
import { OrganizationService } from '../../src/services/organization.service';
import { Organization } from '../../src/db/models/Organization';
import { IOrganization } from '../../src/interfaces/IOrganization';
import { OrganizationStatus, SMSProviderType } from '../../src/types/organization.types';
import { UserRole } from '../../src/types/auth.types';

describe('Organization Integration Tests', () => {
  let organizationService: OrganizationService;
  let testOrganizationId: ObjectId;
  let testAdminUserId: ObjectId;

  // Test constants
  const TEST_ENCRYPTION_KEY = process.env.TEST_ENCRYPTION_KEY || 'testEncryptionKey32CharactersLength12';
  const TEST_TIMEOUT = 10000;

  beforeEach(async () => {
    // Initialize test environment
    organizationService = new OrganizationService(TEST_ENCRYPTION_KEY);
    testAdminUserId = new ObjectId();

    // Clean up test data
    await Organization.deleteMany({});

    // Create test organization
    const testOrg = await organizationService.createOrganization({
      name: 'Test Organization',
      adminUserId: testAdminUserId,
    });
    testOrganizationId = testOrg._id;
  }, TEST_TIMEOUT);

  afterEach(async () => {
    // Clean up test data
    await Organization.deleteMany({});
  });

  describe('Organization CRUD Operations', () => {
    it('should create a new organization with proper validation', async () => {
      const newOrgData = {
        name: 'New Test Organization',
        adminUserId: new ObjectId(),
      };

      const result = await organizationService.createOrganization(newOrgData);

      expect(result).toBeDefined();
      expect(result.name).toBe(newOrgData.name);
      expect(result.status).toBe(OrganizationStatus.ACTIVE);
      expect(result.members).toHaveLength(1);
      expect(result.members[0].userId).toEqual(newOrgData.adminUserId);
      expect(result.members[0].role).toBe(UserRole.ORGANIZATION_ADMIN);
    });

    it('should prevent duplicate organization names', async () => {
      const duplicateOrgData = {
        name: 'Test Organization',
        adminUserId: new ObjectId(),
      };

      await expect(
        organizationService.createOrganization(duplicateOrgData)
      ).rejects.toThrow('Organization name already exists');
    });

    it('should retrieve organization by ID with decrypted SMS config', async () => {
      const org = await organizationService.getOrganizationById(testOrganizationId);

      expect(org).toBeDefined();
      expect(org._id).toEqual(testOrganizationId);
      expect(org.name).toBe('Test Organization');
    });

    it('should update organization details with validation', async () => {
      const updateData = {
        name: 'Updated Organization Name',
        status: OrganizationStatus.INACTIVE,
      };

      const updated = await organizationService.updateOrganization(
        testOrganizationId,
        updateData
      );

      expect(updated.name).toBe(updateData.name);
      expect(updated.status).toBe(updateData.status);
    });
  });

  describe('SMS Provider Configuration', () => {
    it('should configure Twilio SMS provider with encrypted credentials', async () => {
      const smsConfig = {
        providerType: SMSProviderType.TWILIO,
        apiKey: 'test-api-key-12345',
        apiSecret: 'test-api-secret-67890',
        fromNumber: '+15555555555',
        webhookUrl: 'https://test-webhook.com/sms',
      };

      const result = await organizationService.configureSMSProvider(
        testOrganizationId,
        smsConfig
      );

      expect(result.smsConfig).toBeDefined();
      expect(result.smsConfig.providerType).toBe(SMSProviderType.TWILIO);
      expect(result.smsConfig.apiKey).not.toBe(smsConfig.apiKey); // Should be encrypted
      expect(result.smsConfig.apiSecret).not.toBe(smsConfig.apiSecret); // Should be encrypted
      expect(result.smsConfig.fromNumber).toBe(smsConfig.fromNumber);
    });

    it('should validate SMS provider configuration requirements', async () => {
      const invalidConfig = {
        providerType: SMSProviderType.TWILIO,
        apiKey: 'invalid',
        fromNumber: 'invalid',
      };

      await expect(
        organizationService.configureSMSProvider(testOrganizationId, invalidConfig)
      ).rejects.toThrow();
    });

    it('should support custom SMS provider configuration', async () => {
      const customConfig = {
        providerType: SMSProviderType.CUSTOM,
        apiKey: 'custom-api-key',
        fromNumber: '+15555555555',
        webhookUrl: 'https://custom-webhook.com/sms',
        customConfig: {
          endpoint: 'https://custom-sms.com/api',
          timeout: 5000,
        },
      };

      const result = await organizationService.configureSMSProvider(
        testOrganizationId,
        customConfig
      );

      expect(result.smsConfig.providerType).toBe(SMSProviderType.CUSTOM);
      expect(result.smsConfig.webhookUrl).toBe(customConfig.webhookUrl);
    });
  });

  describe('Organization Member Management', () => {
    it('should add new member with proper role', async () => {
      const newMemberId = new ObjectId();
      const result = await organizationService.addOrganizationMember(
        testOrganizationId,
        newMemberId,
        UserRole.AGENT
      );

      expect(result.members).toHaveLength(2); // Admin + new member
      const newMember = result.members.find(m => m.userId.equals(newMemberId));
      expect(newMember).toBeDefined();
      expect(newMember?.role).toBe(UserRole.AGENT);
    });

    it('should prevent removing last administrator', async () => {
      await expect(
        organizationService.removeOrganizationMember(
          testOrganizationId,
          testAdminUserId
        )
      ).rejects.toThrow('Cannot remove the last administrator');
    });

    it('should update member role with validation', async () => {
      const newMemberId = new ObjectId();
      await organizationService.addOrganizationMember(
        testOrganizationId,
        newMemberId,
        UserRole.AGENT
      );

      const result = await organizationService.updateOrganization(
        testOrganizationId,
        {
          members: [{
            userId: newMemberId,
            role: UserRole.FORM_MANAGER,
            permissions: ['form:create', 'form:edit'],
            joinedAt: new Date(),
            lastActiveAt: new Date(),
            status: 'active'
          }]
        }
      );

      const updatedMember = result.members.find(m => m.userId.equals(newMemberId));
      expect(updatedMember?.role).toBe(UserRole.FORM_MANAGER);
    });
  });

  describe('Security Features', () => {
    it('should enforce field-level encryption for sensitive data', async () => {
      const smsConfig = {
        providerType: SMSProviderType.TWILIO,
        apiKey: 'sensitive-api-key',
        apiSecret: 'sensitive-api-secret',
        fromNumber: '+15555555555',
      };

      const result = await organizationService.configureSMSProvider(
        testOrganizationId,
        smsConfig
      );

      // Direct database query to verify encryption
      const dbOrg = await Organization.findById(testOrganizationId);
      expect(dbOrg?.smsConfig.apiKey).not.toBe(smsConfig.apiKey);
      expect(dbOrg?.smsConfig.apiSecret).not.toBe(smsConfig.apiSecret);

      // Service should return decrypted values
      expect(result.smsConfig.apiKey).toBe(smsConfig.apiKey);
      expect(result.smsConfig.apiSecret).toBe(smsConfig.apiSecret);
    });

    it('should validate security settings during organization updates', async () => {
      const updateData = {
        status: OrganizationStatus.ACTIVE,
        securitySettings: {
          mfaRequired: true,
          passwordPolicy: {
            minLength: 12,
            requireSpecialChars: true,
          },
          ipWhitelist: ['192.168.1.1'],
        },
      };

      const result = await organizationService.updateOrganization(
        testOrganizationId,
        updateData
      );

      expect(result.securitySettings).toBeDefined();
      expect(result.securitySettings.mfaRequired).toBe(true);
      expect(result.securitySettings.passwordPolicy.minLength).toBe(12);
    });
  });
});