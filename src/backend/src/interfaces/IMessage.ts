// mongoose v7.0.0
import { Document } from 'mongoose';
import { MessageDirection, MessageStatus, MessageType, MessageId } from '../types/message.types';
import { LeadId } from '../types/lead.types';

/**
 * Interface defining the structure and behavior of message documents in the SMS lead nurturing system.
 * Extends MongoDB Document type for database integration and provides comprehensive support for
 * AI-powered conversations, delivery tracking, and metadata management.
 * 
 * @extends Document - MongoDB document interface for database operations
 */
export interface IMessage extends Document {
  /**
   * Unique identifier for the message document
   * Uses MessageId type alias for type safety
   */
  _id: MessageId;

  /**
   * Reference to the lead associated with this message
   * Links message to specific lead for conversation tracking
   */
  leadId: LeadId;

  /**
   * Actual content/body of the message
   * Contains the text that was/will be sent via SMS
   */
  content: string;

  /**
   * Indicates whether message is inbound (from lead) or outbound (to lead)
   * Used for message flow tracking and conversation management
   */
  direction: MessageDirection;

  /**
   * Classifies message source as AI, human agent, or system
   * Critical for conversation handling and analytics
   */
  type: MessageType;

  /**
   * Tracks message delivery lifecycle state
   * Used for monitoring delivery status and handling retries
   */
  status: MessageStatus;

  /**
   * Flexible metadata storage for additional message attributes
   * Supports extended tracking and integration requirements
   */
  metadata: Record<string, any>;

  /**
   * Timestamp when message was sent to SMS provider
   * Used for delivery tracking and SLA monitoring
   */
  sentAt: Date;

  /**
   * Timestamp when message was confirmed delivered
   * Null if not yet delivered or delivery failed
   */
  deliveredAt: Date | null;

  /**
   * Timestamp when message document was created
   * Automatically managed by MongoDB
   */
  createdAt: Date;

  /**
   * Timestamp when message document was last modified
   * Automatically managed by MongoDB
   */
  updatedAt: Date;
}