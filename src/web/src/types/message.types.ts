// mongodb v5.0.0
import { ObjectId } from 'mongodb';
import { LeadId } from './lead.types';

/**
 * Type alias for message identifier using MongoDB ObjectId
 * Ensures consistent ID typing across the application
 * @version 1.0.0
 */
export type MessageId = ObjectId;

/**
 * Enumeration defining message flow directions
 * Used for tracking conversation flow between system and leads
 * @version 1.0.0
 */
export enum MessageDirection {
  INBOUND = 'INBOUND',   // Messages received from leads
  OUTBOUND = 'OUTBOUND'  // Messages sent to leads
}

/**
 * Enumeration of message delivery statuses
 * Tracks the lifecycle of message delivery
 * @version 1.0.0
 */
export enum MessageStatus {
  QUEUED = 'QUEUED',         // Message queued for sending
  SENT = 'SENT',            // Message sent to provider
  DELIVERED = 'DELIVERED',   // Message confirmed delivered
  FAILED = 'FAILED'         // Message delivery failed
}

/**
 * Enumeration distinguishing message source types
 * Supports AI-powered conversation management requirements
 * @version 1.0.0
 */
export enum MessageType {
  AI = 'AI',           // AI-generated messages
  HUMAN = 'HUMAN',     // Human agent messages
  SYSTEM = 'SYSTEM'    // System notifications/alerts
}

/**
 * Core interface defining message structure
 * Implements message management requirements from technical specification
 * @version 1.0.0
 */
export interface Message {
  _id: MessageId;                    // Unique message identifier
  leadId: LeadId;                    // Associated lead identifier
  content: string;                   // Message content
  direction: MessageDirection;        // Message flow direction
  type: MessageType;                 // Message source type
  status: MessageStatus;             // Delivery status
  metadata: Record<string, any>;     // Additional message metadata
  sentAt: Date;                      // Timestamp when sent
  deliveredAt: Date | null;          // Timestamp when delivered
  readonly createdAt: Date;          // Creation timestamp
  readonly updatedAt: Date;          // Last update timestamp
}

/**
 * Data transfer object for message creation
 * Contains required fields for creating new messages
 * @version 1.0.0
 */
export interface CreateMessageDTO {
  leadId: LeadId;                    // Associated lead
  content: string;                   // Message content
  type: MessageType;                 // Message type
  metadata?: Record<string, any>;    // Optional metadata
}

/**
 * Data transfer object for updating message status
 * Used for tracking message delivery lifecycle
 * @version 1.0.0
 */
export interface UpdateMessageStatusDTO {
  status: MessageStatus;             // Updated status
  deliveredAt: Date;                // Delivery timestamp
}

/**
 * Type guard to check if an object is a valid Message
 * @param obj - Object to validate
 * @returns boolean indicating if object matches Message interface
 */
export function isMessage(obj: unknown): obj is Message {
  const message = obj as Message;
  return (
    message?._id instanceof ObjectId &&
    message?.leadId instanceof ObjectId &&
    typeof message?.content === 'string' &&
    Object.values(MessageDirection).includes(message?.direction) &&
    Object.values(MessageType).includes(message?.type) &&
    Object.values(MessageStatus).includes(message?.status) &&
    typeof message?.metadata === 'object' &&
    message?.sentAt instanceof Date &&
    (message?.deliveredAt === null || message?.deliveredAt instanceof Date) &&
    message?.createdAt instanceof Date &&
    message?.updatedAt instanceof Date
  );
}

/**
 * Type guard to check if an object is a valid CreateMessageDTO
 * @param obj - Object to validate
 * @returns boolean indicating if object matches CreateMessageDTO interface
 */
export function isCreateMessageDTO(obj: unknown): obj is CreateMessageDTO {
  const dto = obj as CreateMessageDTO;
  return (
    dto?.leadId instanceof ObjectId &&
    typeof dto?.content === 'string' &&
    Object.values(MessageType).includes(dto?.type) &&
    (dto?.metadata === undefined || typeof dto?.metadata === 'object')
  );
}

/**
 * Type guard to check if an object is a valid UpdateMessageStatusDTO
 * @param obj - Object to validate
 * @returns boolean indicating if object matches UpdateMessageStatusDTO interface
 */
export function isUpdateMessageStatusDTO(obj: unknown): obj is UpdateMessageStatusDTO {
  const dto = obj as UpdateMessageStatusDTO;
  return (
    Object.values(MessageStatus).includes(dto?.status) &&
    dto?.deliveredAt instanceof Date
  );
}