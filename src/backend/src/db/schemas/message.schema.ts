// mongoose v7.0.0
import { Schema, model } from 'mongoose';
import { IMessage } from '../../interfaces/IMessage';
import { MessageDirection, MessageStatus, MessageType } from '../../types/message.types';

/**
 * MongoDB schema definition for Message documents with enhanced delivery tracking 
 * and metadata support for AI-powered SMS conversations.
 * 
 * Features:
 * - Comprehensive message tracking with delivery status
 * - Support for AI, human, and system message types
 * - 12-month TTL index for automatic data retention
 * - Compound indexes for efficient conversation retrieval
 * - Rich metadata support for AI context and tracking
 */
const MessageSchema = new Schema<IMessage>({
  leadId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Lead',
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1600 // SMS provider max length with safety margin
  },
  direction: {
    type: String,
    required: true,
    enum: Object.values(MessageDirection),
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: Object.values(MessageType),
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(MessageStatus),
    default: MessageStatus.QUEUED,
    index: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
    validate: {
      validator: function(value: Record<string, any>) {
        // Ensure metadata object isn't too large (limit to 16KB)
        return JSON.stringify(value).length <= 16384;
      },
      message: 'Metadata size exceeds maximum allowed size of 16KB'
    }
  },
  sentAt: {
    type: Date,
    sparse: true,
    index: true
  },
  deliveredAt: {
    type: Date,
    sparse: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 12 months from now
    index: true
  }
}, {
  timestamps: true,
  collection: 'messages'
});

// Compound indexes for efficient querying
MessageSchema.index({ leadId: 1, createdAt: -1 }); // For conversation history retrieval
MessageSchema.index({ status: 1, sentAt: 1 }); // For delivery status monitoring
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for 12-month retention

// Sanitize and transform output
MessageSchema.set('toJSON', {
  transform: function(doc, ret) {
    // Convert ObjectIds to strings
    ret.id = ret._id.toString();
    ret.leadId = ret.leadId.toString();
    delete ret._id;
    delete ret.__v;

    // Format dates
    ret.sentAt = ret.sentAt?.toISOString();
    ret.deliveredAt = ret.deliveredAt?.toISOString();
    ret.createdAt = ret.createdAt.toISOString();
    ret.updatedAt = ret.updatedAt.toISOString();
    ret.expiresAt = ret.expiresAt.toISOString();

    // Convert metadata Map to plain object
    if (ret.metadata instanceof Map) {
      ret.metadata = Object.fromEntries(ret.metadata);
    }

    return ret;
  }
});

// Pre-save hooks for data validation and processing
MessageSchema.pre('save', function(next) {
  // Set sentAt for outbound messages being queued
  if (this.isNew && this.direction === MessageDirection.OUTBOUND) {
    this.sentAt = new Date();
  }
  next();
});

// Virtual for message age in minutes (useful for SLA monitoring)
MessageSchema.virtual('ageMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / 60000);
});

/**
 * Mongoose model for Message documents with enhanced delivery tracking
 * and metadata support for AI-powered conversations.
 */
export const Message = model<IMessage>('Message', MessageSchema);

export default MessageSchema;