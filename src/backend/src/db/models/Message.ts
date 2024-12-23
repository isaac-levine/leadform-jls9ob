// mongoose v7.0.0
import { model, Model, BulkWriteResult } from 'mongoose';
import { IMessage } from '../../interfaces/IMessage';
import MessageSchema from '../schemas/message.schema';
import { MessageStatus, MessageId } from '../../types/message.types';
import { LeadId } from '../../types/lead.types';

/**
 * Interface for date range filtering in message queries
 */
interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Enhanced Mongoose model for Message documents with comprehensive static methods
 * for message management, delivery tracking, and AI conversation support.
 * 
 * Features:
 * - Robust message querying with date range filtering
 * - Bulk operations support for efficient updates
 * - Metadata management for AI conversation context
 * - TTL-based data retention implementation
 * - Type-safe static methods with proper error handling
 */
interface MessageModel extends Model<IMessage> {
  /**
   * Find all messages for a specific lead with optional date range filtering
   * @param leadId - ID of the lead to find messages for
   * @param dateRange - Optional date range for filtering messages
   * @returns Promise resolving to array of messages
   */
  findByLeadId(leadId: LeadId, dateRange?: DateRange): Promise<IMessage[]>;

  /**
   * Find messages by delivery status with optional date constraints
   * @param status - Message delivery status to filter by
   * @param dateRange - Optional date range for filtering
   * @returns Promise resolving to array of matching messages
   */
  findByStatus(status: MessageStatus, dateRange?: DateRange): Promise<IMessage[]>;

  /**
   * Update delivery status for a single message
   * @param messageId - ID of message to update
   * @param status - New delivery status
   * @param deliveredAt - Optional delivery timestamp
   * @returns Promise resolving to updated message
   */
  updateStatus(messageId: MessageId, status: MessageStatus, deliveredAt?: Date): Promise<IMessage>;

  /**
   * Find messages that have exceeded retention period
   * @returns Promise resolving to array of expired messages
   */
  findExpiredMessages(): Promise<IMessage[]>;

  /**
   * Update metadata for AI conversation management
   * @param messageId - ID of message to update
   * @param metadata - New metadata to merge with existing
   * @returns Promise resolving to updated message
   */
  updateMetadata(messageId: MessageId, metadata: Record<string, any>): Promise<IMessage>;

  /**
   * Bulk update status for multiple messages
   * @param messageIds - Array of message IDs to update
   * @param status - New status for all messages
   * @returns Promise resolving to bulk write result
   */
  bulkUpdateStatus(messageIds: MessageId[], status: MessageStatus): Promise<BulkWriteResult>;
}

/**
 * Implementation of MessageModel with enhanced static methods
 */
const MessageModelImpl: MessageModel = model<IMessage, MessageModel>('Message', MessageSchema);

// Implement static methods
MessageModelImpl.findByLeadId = async function(
  leadId: LeadId,
  dateRange?: DateRange
): Promise<IMessage[]> {
  const query: any = { leadId };

  if (dateRange) {
    query.createdAt = {};
    if (dateRange.startDate) query.createdAt.$gte = dateRange.startDate;
    if (dateRange.endDate) query.createdAt.$lte = dateRange.endDate;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .exec();
};

MessageModelImpl.findByStatus = async function(
  status: MessageStatus,
  dateRange?: DateRange
): Promise<IMessage[]> {
  const query: any = { status };

  if (dateRange) {
    query.sentAt = {};
    if (dateRange.startDate) query.sentAt.$gte = dateRange.startDate;
    if (dateRange.endDate) query.sentAt.$lte = dateRange.endDate;
  }

  return this.find(query)
    .sort({ sentAt: -1 })
    .exec();
};

MessageModelImpl.updateStatus = async function(
  messageId: MessageId,
  status: MessageStatus,
  deliveredAt?: Date
): Promise<IMessage> {
  const update: any = { status };
  if (deliveredAt) update.deliveredAt = deliveredAt;

  const message = await this.findByIdAndUpdate(
    messageId,
    update,
    { new: true, runValidators: true }
  );

  if (!message) {
    throw new Error(`Message not found with ID: ${messageId}`);
  }

  return message;
};

MessageModelImpl.findExpiredMessages = async function(): Promise<IMessage[]> {
  const now = new Date();
  return this.find({
    expiresAt: { $lt: now }
  }).exec();
};

MessageModelImpl.updateMetadata = async function(
  messageId: MessageId,
  metadata: Record<string, any>
): Promise<IMessage> {
  const message = await this.findById(messageId);
  if (!message) {
    throw new Error(`Message not found with ID: ${messageId}`);
  }

  // Merge new metadata with existing
  const updatedMetadata = {
    ...Object.fromEntries(message.metadata),
    ...metadata
  };

  // Validate metadata size
  if (JSON.stringify(updatedMetadata).length > 16384) {
    throw new Error('Updated metadata exceeds maximum size of 16KB');
  }

  message.metadata = new Map(Object.entries(updatedMetadata));
  return message.save();
};

MessageModelImpl.bulkUpdateStatus = async function(
  messageIds: MessageId[],
  status: MessageStatus
): Promise<BulkWriteResult> {
  return this.bulkWrite(
    messageIds.map((id) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { status } }
      }
    }))
  );
};

export const Message = MessageModelImpl;