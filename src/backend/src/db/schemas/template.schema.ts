// mongodb v7.0.0
import { Schema, model } from 'mongoose';
import { ITemplate } from '../../interfaces/ITemplate';
import { MessageType } from '../../types/message.types';

/**
 * MongoDB schema definition for message templates used in AI-powered SMS conversations.
 * Implements comprehensive validation, versioning, and organization relationships.
 * 
 * @remarks
 * - Supports both AI and system message types
 * - Includes version tracking for template changes
 * - Enforces SMS content length limits
 * - Maintains organization-level template isolation
 */
const TemplateSchema = new Schema<ITemplate>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters'],
    validate: {
      validator: function(v: string) {
        return v.length >= 3;
      },
      message: 'Template name must be at least 3 characters long'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  content: {
    type: String,
    required: [true, 'Template content is required'],
    maxlength: [1600, 'Content cannot exceed 1600 characters (SMS limit)'],
    validate: {
      validator: function(v: string) {
        return v.length >= 1;
      },
      message: 'Template content cannot be empty'
    }
  },
  type: {
    type: String,
    enum: {
      values: [MessageType.AI, MessageType.SYSTEM],
      message: 'Invalid template type'
    },
    required: [true, 'Template type is required']
  },
  variables: {
    type: [String],
    default: [],
    validate: {
      validator: function(v: string[]) {
        return v.every(variable => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(variable));
      },
      message: 'Variables must be valid identifiers'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version number must be positive']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  versionKey: false // Disable MongoDB's internal __v field since we manage our own version
});

/**
 * Compound index for efficient template lookup within organizations
 * Ensures unique template names within each organization
 */
TemplateSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, background: true }
);

/**
 * Index for filtering active templates by organization
 */
TemplateSchema.index(
  { organizationId: 1, isActive: 1 },
  { background: true }
);

/**
 * Index for filtering templates by type within organization
 */
TemplateSchema.index(
  { organizationId: 1, type: 1 },
  { background: true }
);

/**
 * Pre-save middleware for template validation and versioning
 * - Validates content length against SMS limits
 * - Updates timestamps
 * - Manages version numbers
 */
TemplateSchema.pre('save', async function(next) {
  // Set default values if not provided
  if (this.isNew) {
    this.isActive = this.isActive ?? true;
    this.metadata = this.metadata ?? {};
    this.version = 1;
  } else {
    // Increment version on content or type changes
    if (this.isModified('content') || this.isModified('type')) {
      this.version += 1;
    }
  }

  // Validate content length for SMS compatibility
  if (this.content && this.content.length > 1600) {
    next(new Error('Template content exceeds maximum SMS length of 1600 characters'));
    return;
  }

  // Update timestamps
  const now = new Date();
  this.updatedAt = now;
  if (this.isNew) {
    this.createdAt = now;
  }

  next();
});

// Create and export the Template model
export const Template = model<ITemplate>('Template', TemplateSchema);

// Export the schema for potential reuse or extension
export default TemplateSchema;