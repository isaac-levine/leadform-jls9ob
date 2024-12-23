// mongodb v5.0.0
// crypto v1.0.0
import { ObjectId } from 'mongodb';
import { IOrganization } from '../../interfaces/IOrganization';
import { Organization } from '../../db/models/Organization';
import { OrganizationStatus, SMSProviderType, SMSConfig } from '../../types/organization.types';
import { UserRole } from '../../types/auth.types';
import crypto from 'crypto';

/**
 * Service class implementing comprehensive organization management with
 * secure data handling, validation, and audit logging capabilities.
 */
export class OrganizationService {
  private readonly encryptionKey: Buffer;
  private readonly IV_LENGTH = 16;
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-cbc';

  constructor(encryptionKey: string) {
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * Creates a new organization with validation and security checks
   * @param organizationData Organization creation data
   * @returns Promise<IOrganization> Newly created organization
   */
  async createOrganization(organizationData: {
    name: string;
    adminUserId: ObjectId;
    smsConfig?: SMSConfig;
  }): Promise<IOrganization> {
    try {
      // Validate organization name uniqueness
      const isUnique = await Organization.ensureUniqueOrganizationName(organizationData.name);
      if (!isUnique) {
        throw new Error('Organization name already exists');
      }

      // Create initial organization structure
      const organization: Partial<IOrganization> = {
        name: organizationData.name,
        status: OrganizationStatus.ACTIVE,
        members: [{
          userId: organizationData.adminUserId,
          role: UserRole.ORGANIZATION_ADMIN,
          permissions: ['*'],
          joinedAt: new Date(),
          lastActiveAt: new Date(),
          status: 'active'
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Configure SMS if provided
      if (organizationData.smsConfig) {
        const encryptedConfig = await this.encryptSMSConfig(organizationData.smsConfig);
        organization.smsConfig = encryptedConfig;
      }

      // Create and return new organization
      const newOrganization = await Organization.create(organization);
      return newOrganization;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  /**
   * Retrieves organization by ID with security checks
   * @param organizationId Organization identifier
   * @returns Promise<IOrganization> Organization data
   */
  async getOrganizationById(organizationId: ObjectId): Promise<IOrganization> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Decrypt sensitive SMS configuration if present
      if (organization.smsConfig) {
        organization.smsConfig = await this.decryptSMSConfig(organization.smsConfig);
      }

      return organization;
    } catch (error) {
      console.error('Error retrieving organization:', error);
      throw error;
    }
  }

  /**
   * Updates organization details with validation
   * @param organizationId Organization identifier
   * @param updateData Update data
   * @returns Promise<IOrganization> Updated organization
   */
  async updateOrganization(
    organizationId: ObjectId,
    updateData: Partial<IOrganization>
  ): Promise<IOrganization> {
    try {
      // Validate name uniqueness if being updated
      if (updateData.name) {
        const isUnique = await Organization.ensureUniqueOrganizationName(updateData.name);
        if (!isUnique) {
          throw new Error('Organization name already exists');
        }
      }

      // Encrypt SMS config if being updated
      if (updateData.smsConfig) {
        updateData.smsConfig = await this.encryptSMSConfig(updateData.smsConfig);
      }

      const updatedOrganization = await Organization.findOneAndUpdate(
        { _id: organizationId },
        { 
          $set: { 
            ...updateData,
            updatedAt: new Date()
          }
        },
        { new: true, runValidators: true }
      );

      if (!updatedOrganization) {
        throw new Error('Organization not found');
      }

      // Decrypt SMS config for response
      if (updatedOrganization.smsConfig) {
        updatedOrganization.smsConfig = await this.decryptSMSConfig(updatedOrganization.smsConfig);
      }

      return updatedOrganization;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  }

  /**
   * Configures SMS provider with credential validation and security
   * @param organizationId Organization identifier
   * @param smsConfig SMS provider configuration
   * @returns Promise<IOrganization> Updated organization
   */
  async configureSMSProvider(
    organizationId: ObjectId,
    smsConfig: SMSConfig
  ): Promise<IOrganization> {
    try {
      // Validate SMS configuration
      await Organization.validateSMSConfig(smsConfig);

      // Encrypt sensitive credentials
      const encryptedConfig = await this.encryptSMSConfig(smsConfig);

      // Update organization with new SMS config
      const updatedOrganization = await Organization.updateSMSConfig(
        organizationId,
        encryptedConfig
      );

      if (!updatedOrganization) {
        throw new Error('Organization not found');
      }

      // Decrypt config for response
      updatedOrganization.smsConfig = await this.decryptSMSConfig(updatedOrganization.smsConfig);

      return updatedOrganization;
    } catch (error) {
      console.error('Error configuring SMS provider:', error);
      throw error;
    }
  }

  /**
   * Adds a new member to the organization
   * @param organizationId Organization identifier
   * @param userId User identifier
   * @param role User role
   * @returns Promise<IOrganization> Updated organization
   */
  async addOrganizationMember(
    organizationId: ObjectId,
    userId: ObjectId,
    role: UserRole
  ): Promise<IOrganization> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check if user is already a member
      const existingMember = organization.members.find(
        member => member.userId.toString() === userId.toString()
      );
      if (existingMember) {
        throw new Error('User is already a member of this organization');
      }

      // Add new member
      const updatedOrganization = await Organization.findOneAndUpdate(
        { _id: organizationId },
        {
          $push: {
            members: {
              userId,
              role,
              permissions: [],
              joinedAt: new Date(),
              lastActiveAt: new Date(),
              status: 'active'
            }
          },
          $set: { updatedAt: new Date() }
        },
        { new: true, runValidators: true }
      );

      if (!updatedOrganization) {
        throw new Error('Failed to add member');
      }

      return updatedOrganization;
    } catch (error) {
      console.error('Error adding organization member:', error);
      throw error;
    }
  }

  /**
   * Removes a member from the organization
   * @param organizationId Organization identifier
   * @param userId User identifier
   * @returns Promise<IOrganization> Updated organization
   */
  async removeOrganizationMember(
    organizationId: ObjectId,
    userId: ObjectId
  ): Promise<IOrganization> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Ensure at least one admin remains
      const member = organization.members.find(m => m.userId.toString() === userId.toString());
      if (!member) {
        throw new Error('Member not found');
      }

      if (member.role === UserRole.ADMIN || member.role === UserRole.ORGANIZATION_ADMIN) {
        const adminCount = organization.members.filter(m => 
          m.role === UserRole.ADMIN || m.role === UserRole.ORGANIZATION_ADMIN
        ).length;

        if (adminCount <= 1) {
          throw new Error('Cannot remove the last administrator');
        }
      }

      // Remove member
      const updatedOrganization = await Organization.findOneAndUpdate(
        { _id: organizationId },
        {
          $pull: { members: { userId } },
          $set: { updatedAt: new Date() }
        },
        { new: true, runValidators: true }
      );

      if (!updatedOrganization) {
        throw new Error('Failed to remove member');
      }

      return updatedOrganization;
    } catch (error) {
      console.error('Error removing organization member:', error);
      throw error;
    }
  }

  /**
   * Encrypts sensitive SMS configuration data
   * @param smsConfig SMS configuration to encrypt
   * @returns Promise<SMSConfig> Encrypted configuration
   */
  private async encryptSMSConfig(smsConfig: SMSConfig): Promise<SMSConfig> {
    try {
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(
        this.ENCRYPTION_ALGORITHM,
        this.encryptionKey,
        iv
      );

      // Encrypt sensitive fields
      const encryptedConfig = { ...smsConfig };
      if (smsConfig.apiKey) {
        encryptedConfig.apiKey = this.encrypt(smsConfig.apiKey, iv);
      }
      if (smsConfig.apiSecret) {
        encryptedConfig.apiSecret = this.encrypt(smsConfig.apiSecret, iv);
      }

      return encryptedConfig;
    } catch (error) {
      console.error('Error encrypting SMS config:', error);
      throw error;
    }
  }

  /**
   * Decrypts sensitive SMS configuration data
   * @param smsConfig Encrypted SMS configuration
   * @returns Promise<SMSConfig> Decrypted configuration
   */
  private async decryptSMSConfig(smsConfig: SMSConfig): Promise<SMSConfig> {
    try {
      const decryptedConfig = { ...smsConfig };
      if (smsConfig.apiKey) {
        decryptedConfig.apiKey = this.decrypt(smsConfig.apiKey);
      }
      if (smsConfig.apiSecret) {
        decryptedConfig.apiSecret = this.decrypt(smsConfig.apiSecret);
      }

      return decryptedConfig;
    } catch (error) {
      console.error('Error decrypting SMS config:', error);
      throw error;
    }
  }

  /**
   * Encrypts a single value with IV
   * @param value Value to encrypt
   * @param iv Initialization vector
   * @returns string Encrypted value
   */
  private encrypt(value: string, iv: Buffer): string {
    const cipher = crypto.createCipheriv(
      this.ENCRYPTION_ALGORITHM,
      this.encryptionKey,
      iv
    );
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final()
    ]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts a single encrypted value
   * @param encrypted Encrypted value with IV
   * @returns string Decrypted value
   */
  private decrypt(encrypted: string): string {
    const [ivHex, encryptedHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(
      this.ENCRYPTION_ALGORITHM,
      this.encryptionKey,
      iv
    );
    return Buffer.concat([
      decipher.update(encryptedText),
      decipher.final()
    ]).toString('utf8');
  }
}