// mongodb v7.0.0
import { Schema, model } from 'mongoose';
import { encrypt } from 'mongoose-field-encryption';
import { IOrganization } from '../../interfaces/IOrganization';
import { OrganizationStatus, SMSProviderType } from '../../types/organization.types';
import { UserRole } from '../../types/auth.types';

/**
 * MongoDB schema definition for organizations with comprehensive validation,
 * encryption, and indexing strategy for the lead capture and SMS platform.
 */
const organizationSchema = new Schema<IOrganization>({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    minlength: [2, 'Organization name must be at least 2 characters'],
    maxlength: [100, 'Organization name cannot exceed 100 characters'],
    validate: {
      validator: (name: string) => /^[a-zA-Z0-9\s\-_]+$/.test(name),
      message: 'Organization name can only contain alphanumeric characters, spaces, hyphens, and underscores'
    }
  },

  status: {
    type: String,
    enum: Object.values(OrganizationStatus),
    default: OrganizationStatus.ACTIVE,
    required: true
  },

  smsConfig: {
    providerType: {
      type: String,
      enum: Object.values(SMSProviderType),
      required: [true, 'SMS provider type is required']
    },
    apiKey: {
      type: String,
      required: [true, 'API key is required'],
      minlength: [10, 'API key must be at least 10 characters']
    },
    apiSecret: {
      type: String,
      required: [true, 'API secret is required'],
      minlength: [16, 'API secret must be at least 16 characters']
    },
    fromNumber: {
      type: String,
      required: [true, 'Sender phone number is required'],
      validate: {
        validator: (phone: string) => /^\+[1-9]\d{1,14}$/.test(phone),
        message: 'Phone number must be in E.164 format'
      }
    },
    webhookUrl: {
      type: String,
      validate: {
        validator: (url: string) => {
          if (!url) return true; // Optional field
          return /^https:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(\/\S*)?$/.test(url);
        },
        message: 'Webhook URL must be a valid HTTPS URL'
      }
    },
    customConfig: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => new Map()
    }
  },

  members: [{
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      ref: 'User'
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: [true, 'User role is required']
    },
    permissions: [{
      type: String,
      trim: true
    }],
    joinedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  }],

  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true,
  collection: 'organizations',
  versionKey: false
});

// Field-level encryption for sensitive SMS configuration
encrypt.encryptionKey = process.env.ENCRYPTION_KEY || 'defaultEncryptionKey32CharactersLong';
organizationSchema.plugin(encrypt, {
  fields: ['smsConfig.apiKey', 'smsConfig.apiSecret'],
  secret: process.env.ENCRYPTION_SECRET || 'defaultSecret32CharactersLongSecret'
});

// Indexes for optimized queries
organizationSchema.index({ name: 1, status: 1 }, { 
  unique: true, 
  background: true,
  name: 'name_status_idx' 
});
organizationSchema.index({ 'members.userId': 1 }, { 
  background: true,
  name: 'members_userId_idx' 
});
organizationSchema.index({ 'smsConfig.providerType': 1 }, { 
  background: true,
  name: 'sms_provider_idx' 
});

// Pre-save middleware for validation and data processing
organizationSchema.pre('save', async function(next) {
  try {
    // Update timestamps
    this.updatedAt = new Date();
    
    // Validate at least one admin exists
    const hasAdmin = this.members.some(member => 
      member.role === UserRole.ADMIN || member.role === UserRole.ORGANIZATION_ADMIN
    );
    if (!hasAdmin) {
      throw new Error('Organization must have at least one administrator');
    }

    // Validate SMS configuration based on provider type
    await validateSMSConfig(this.smsConfig);

    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Validates SMS provider configuration based on provider type
 * @param smsConfig - The SMS configuration to validate
 * @returns Promise<boolean> - True if configuration is valid
 */
async function validateSMSConfig(smsConfig: any): Promise<boolean> {
  if (!smsConfig.providerType) {
    throw new Error('SMS provider type is required');
  }

  switch (smsConfig.providerType) {
    case SMSProviderType.TWILIO:
      if (!smsConfig.apiKey || !smsConfig.apiSecret || !smsConfig.fromNumber) {
        throw new Error('Twilio configuration requires apiKey, apiSecret, and fromNumber');
      }
      break;
    case SMSProviderType.CUSTOM:
      if (!smsConfig.apiKey || !smsConfig.fromNumber) {
        throw new Error('Custom provider configuration requires at least apiKey and fromNumber');
      }
      break;
    default:
      throw new Error('Invalid SMS provider type');
  }

  return true;
}

// Create and export the Organization model
export const Organization = model<IOrganization>('Organization', organizationSchema);

// Export the schema for testing and validation
export default organizationSchema;