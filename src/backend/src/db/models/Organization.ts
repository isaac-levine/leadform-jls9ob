// mongoose v7.0.0
import { model, Model, Schema } from 'mongoose';
import { IOrganization } from '../../interfaces/IOrganization';
import { organizationSchema } from '../schemas/organization.schema';
import { OrganizationStatus, SMSProviderType, SMSConfig } from '../../types/organization.types';
import { UserRole } from '../../types/auth.types';
import { ObjectId } from 'mongodb';

/**
 * Extended interface for Organization model with static methods
 */
interface OrganizationModel extends Model<IOrganization> {
  findByName(name: string): Promise<IOrganization | null>;
  findActiveOrganizations(): Promise<IOrganization[]>;
  updateSMSConfig(organizationId: ObjectId, smsConfig: SMSConfig): Promise<IOrganization | null>;
  validateSMSConfig(config: SMSConfig): Promise<boolean>;
  findByMember(userId: ObjectId): Promise<IOrganization[]>;
  updateMemberRole(organizationId: ObjectId, userId: ObjectId, role: UserRole): Promise<IOrganization | null>;
  ensureUniqueOrganizationName(name: string): Promise<boolean>;
}

// Add static methods to the schema
organizationSchema.statics.findByName = async function(
  name: string
): Promise<IOrganization | null> {
  try {
    // Sanitize input and perform case-insensitive search
    const sanitizedName = name.trim();
    return await this.findOne({ 
      name: new RegExp(`^${sanitizedName}$`, 'i'),
      status: { $ne: OrganizationStatus.SUSPENDED }
    });
  } catch (error) {
    console.error('Error in findByName:', error);
    throw error;
  }
};

organizationSchema.statics.findActiveOrganizations = async function(): Promise<IOrganization[]> {
  try {
    return await this.find({ 
      status: OrganizationStatus.ACTIVE 
    }).sort({ name: 1 });
  } catch (error) {
    console.error('Error in findActiveOrganizations:', error);
    throw error;
  }
};

organizationSchema.statics.updateSMSConfig = async function(
  organizationId: ObjectId,
  smsConfig: SMSConfig
): Promise<IOrganization | null> {
  try {
    // Validate SMS config before update
    await this.validateSMSConfig(smsConfig);

    // Update organization with new SMS config
    const updatedOrg = await this.findOneAndUpdate(
      { _id: organizationId },
      { 
        $set: { 
          smsConfig,
          updatedAt: new Date()
        }
      },
      { 
        new: true,
        runValidators: true
      }
    );

    return updatedOrg;
  } catch (error) {
    console.error('Error in updateSMSConfig:', error);
    throw error;
  }
};

organizationSchema.statics.validateSMSConfig = async function(
  config: SMSConfig
): Promise<boolean> {
  try {
    // Validate required fields
    if (!config.providerType || !config.apiKey || !config.fromNumber) {
      throw new Error('Missing required SMS configuration fields');
    }

    // Validate provider-specific requirements
    switch (config.providerType) {
      case SMSProviderType.TWILIO:
        if (!config.apiSecret) {
          throw new Error('Twilio configuration requires API secret');
        }
        if (!/^[A-Za-z0-9]{32}$/.test(config.apiKey)) {
          throw new Error('Invalid Twilio API key format');
        }
        break;

      case SMSProviderType.CUSTOM:
        if (!config.webhookUrl) {
          throw new Error('Custom provider requires webhook URL');
        }
        if (!/^https:\/\//.test(config.webhookUrl)) {
          throw new Error('Webhook URL must use HTTPS');
        }
        break;

      default:
        throw new Error('Unsupported SMS provider type');
    }

    // Validate phone number format (E.164)
    if (!/^\+[1-9]\d{1,14}$/.test(config.fromNumber)) {
      throw new Error('Invalid phone number format. Must be E.164 format');
    }

    return true;
  } catch (error) {
    console.error('Error in validateSMSConfig:', error);
    throw error;
  }
};

organizationSchema.statics.findByMember = async function(
  userId: ObjectId
): Promise<IOrganization[]> {
  try {
    return await this.find({
      'members.userId': userId,
      status: { $ne: OrganizationStatus.SUSPENDED }
    });
  } catch (error) {
    console.error('Error in findByMember:', error);
    throw error;
  }
};

organizationSchema.statics.updateMemberRole = async function(
  organizationId: ObjectId,
  userId: ObjectId,
  role: UserRole
): Promise<IOrganization | null> {
  try {
    // Ensure at least one admin remains
    if (role !== UserRole.ADMIN && role !== UserRole.ORGANIZATION_ADMIN) {
      const org = await this.findById(organizationId);
      const adminCount = org?.members.filter(m => 
        m.role === UserRole.ADMIN || m.role === UserRole.ORGANIZATION_ADMIN
      ).length || 0;
      
      if (adminCount <= 1) {
        throw new Error('Organization must maintain at least one administrator');
      }
    }

    return await this.findOneAndUpdate(
      { 
        _id: organizationId,
        'members.userId': userId 
      },
      { 
        $set: { 
          'members.$.role': role,
          'members.$.lastActiveAt': new Date()
        }
      },
      { 
        new: true,
        runValidators: true
      }
    );
  } catch (error) {
    console.error('Error in updateMemberRole:', error);
    throw error;
  }
};

organizationSchema.statics.ensureUniqueOrganizationName = async function(
  name: string
): Promise<boolean> {
  try {
    const existingOrg = await this.findOne({ 
      name: new RegExp(`^${name}$`, 'i')
    });
    return !existingOrg;
  } catch (error) {
    console.error('Error in ensureUniqueOrganizationName:', error);
    throw error;
  }
};

// Create and export the Organization model with static methods
export const Organization = model<IOrganization, OrganizationModel>('Organization', organizationSchema);