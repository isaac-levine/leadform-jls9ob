// mongoose v7.0.0
import { Schema, model } from 'mongoose';
import { encrypt } from 'mongoose-field-encryption';
import { ILead } from '../../interfaces/ILead';
import { LeadStatus, LeadSource } from '../../types/lead.types';
import { PHONE_REGEX } from '../../constants/regex.constants';

/**
 * MongoDB schema definition for Lead entities with enhanced security features
 * and comprehensive validation rules. Implements field-level encryption for PII data
 * and includes optimized indexes for common query patterns.
 * 
 * @security
 * - Field-level encryption for phone numbers (PII)
 * - Input validation for all fields
 * - Audit trail with timestamps
 * - TCPA compliance tracking
 */
const leadSchema = new Schema<ILead>({
  formId: {
    type: Schema.Types.ObjectId,
    required: [true, 'Form ID is required'],
    ref: 'Form',
    index: true // Index for form relationship queries
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: (value: string) => PHONE_REGEX.test(value),
      message: 'Phone number must be in E.164 format'
    },
    unique: true, // Prevent duplicate phone numbers
    // Field-level encryption for PII protection
    encrypt: {
      searchable: true, // Enable searching on encrypted field
      saltGenerator: (secret: string) => secret.slice(0, 16) // Custom salt for encryption
    }
  },
  data: {
    type: Schema.Types.Mixed,
    required: [true, 'Form data is required'],
    validate: {
      validator: (value: Record<string, any>) => {
        // Ensure data object is not empty
        return Object.keys(value).length > 0;
      },
      message: 'Form data cannot be empty'
    }
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(LeadStatus),
    default: LeadStatus.NEW,
    index: true // Index for status filtering
  },
  source: {
    type: String,
    required: true,
    enum: Object.values(LeadSource),
    default: LeadSource.FORM
  },
  optedOut: {
    type: Boolean,
    required: true,
    default: false,
    index: true // Index for TCPA compliance queries
  },
  lastContactedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  strict: true, // Prevent additional fields
  collection: 'leads', // Explicit collection name
  versionKey: false // Disable __v version key
});

/**
 * Compound indexes for optimized query patterns
 */
leadSchema.index({ lastContactedAt: 1, status: 1 }); // For queue processing
leadSchema.index({ createdAt: 1, status: 1 }); // For reporting
leadSchema.index({ formId: 1, createdAt: -1 }); // For form analytics

/**
 * Pre-save middleware for data validation and sanitization
 */
leadSchema.pre('save', async function(next) {
  // Sanitize phone number
  if (this.isModified('phone')) {
    this.phone = this.phone.trim();
  }

  // Sanitize form data
  if (this.isModified('data')) {
    // Remove any null or undefined values
    this.data = Object.fromEntries(
      Object.entries(this.data).filter(([_, v]) => v != null)
    );
  }

  // Update lastContactedAt if status changes to CONTACTED
  if (this.isModified('status') && this.status === LeadStatus.CONTACTED) {
    this.lastContactedAt = new Date();
  }

  next();
});

/**
 * Apply field-level encryption to PII fields
 * Requires encryption keys to be set in environment variables
 */
leadSchema.plugin(encrypt, {
  fields: ['phone'],
  secret: process.env.ENCRYPTION_KEY as string,
  saltGenerator: (secret: string) => secret.slice(0, 16)
});

/**
 * Virtual for full name composition (if available in data)
 */
leadSchema.virtual('fullName').get(function() {
  const { firstName, lastName } = this.data;
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return undefined;
});

/**
 * Instance method to safely get contact information
 * Ensures PII access is logged for audit purposes
 */
leadSchema.methods.getContactInfo = async function() {
  // Log PII access for audit
  console.info(`PII access for lead ${this._id} at ${new Date().toISOString()}`);
  
  return {
    phone: this.phone,
    ...this.data
  };
};

/**
 * Static method to find leads requiring follow-up
 */
leadSchema.statics.findRequiringFollowUp = async function() {
  const followUpThreshold = new Date();
  followUpThreshold.setHours(followUpThreshold.getHours() - 24);

  return this.find({
    status: { $in: [LeadStatus.NEW, LeadStatus.CONTACTED] },
    optedOut: false,
    lastContactedAt: { $lt: followUpThreshold }
  }).sort({ lastContactedAt: 1 });
};

// Create and export the Lead model
export const Lead = model<ILead>('Lead', leadSchema);

// Export the schema for potential reuse
export { leadSchema };