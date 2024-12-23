/**
 * @fileoverview Message validation schemas and functions using Zod
 * Implements comprehensive validation for message-related operations with enhanced security
 * @module message.validator
 * @version 1.0.0
 * 
 * @security This module implements critical security controls for message validation.
 * Any modifications require security review.
 */

import { z } from 'zod'; // v3.0.0
import { MessageType, MessageStatus } from '../../types/message.types';
import { ERROR_MESSAGES } from '../../constants/error.constants';
import { sanitizeInput } from '../../utils/validation.utils';

// Message content length constraints
export const MAX_MESSAGE_LENGTH = 2000;
export const MIN_MESSAGE_LENGTH = 1;

// Valid status transitions map to enforce state machine
export const VALID_STATUS_TRANSITIONS: Record<MessageStatus, MessageStatus[]> = {
  [MessageStatus.QUEUED]: [MessageStatus.SENT, MessageStatus.FAILED],
  [MessageStatus.SENT]: [MessageStatus.DELIVERED, MessageStatus.FAILED],
  [MessageStatus.DELIVERED]: [],
  [MessageStatus.FAILED]: []
};

/**
 * Validates and sanitizes message content with enhanced security checks
 * @param content - Message content to validate
 * @returns Sanitized and validated message content
 * @throws {Error} If validation fails
 */
export function validateMessageContent(content: string): string {
  // Trim and sanitize content
  const sanitizedContent = sanitizeInput(content, {
    allowHtml: false,
    maxLength: MAX_MESSAGE_LENGTH,
    trim: true
  });

  // Validate length after sanitization
  if (sanitizedContent.length < MIN_MESSAGE_LENGTH) {
    throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
  }

  if (sanitizedContent.length > MAX_MESSAGE_LENGTH) {
    throw new Error(ERROR_MESSAGES.CONTENT_LENGTH_ERROR);
  }

  // Check for malicious patterns
  const maliciousPatterns = [
    /javascript:/i,
    /data:/i,
    /<script/i,
    /onclick/i,
    /onerror/i
  ];

  if (maliciousPatterns.some(pattern => pattern.test(sanitizedContent))) {
    throw new Error(ERROR_MESSAGES.VALIDATION_ERROR);
  }

  return sanitizedContent;
}

/**
 * Schema for message metadata validation
 * Ensures metadata follows expected structure and types
 */
export const messageMetadataSchema = z.object({
  // Optional provider-specific message ID
  providerMessageId: z.string().optional(),
  
  // Optional delivery attempts count
  attempts: z.number().min(0).optional(),
  
  // Optional error information
  error: z.object({
    code: z.string(),
    message: z.string()
  }).optional(),
  
  // Optional custom tracking data
  tracking: z.record(z.unknown()).optional()
}).strict();

/**
 * Schema for creating new messages
 * Implements comprehensive validation for message creation
 */
export const createMessageSchema = z.object({
  // Lead ID must be a valid MongoDB ObjectId string
  leadId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lead ID format'),
  
  // Message content with length and security validation
  content: z.string()
    .min(MIN_MESSAGE_LENGTH, 'Message content is required')
    .max(MAX_MESSAGE_LENGTH, 'Message content exceeds maximum length')
    .transform(validateMessageContent),
  
  // Message type must be one of the defined types
  type: z.enum([MessageType.AI, MessageType.HUMAN, MessageType.SYSTEM]),
  
  // Optional metadata with strict schema validation
  metadata: messageMetadataSchema.optional()
}).strict();

/**
 * Schema for updating message status
 * Enforces valid status transitions and timestamp validation
 */
export const updateMessageStatusSchema = z.object({
  // Status must be one of the defined statuses
  status: z.enum([
    MessageStatus.QUEUED,
    MessageStatus.SENT,
    MessageStatus.DELIVERED,
    MessageStatus.FAILED
  ]),
  
  // Optional delivery timestamp
  deliveredAt: z.date().optional(),
  
  // Optional metadata updates
  metadata: messageMetadataSchema.optional()
}).strict().refine(
  (data) => {
    // Custom refinement to validate status transitions
    if (data.status === MessageStatus.DELIVERED && !data.deliveredAt) {
      return false;
    }
    return true;
  },
  {
    message: 'Delivered status requires deliveredAt timestamp'
  }
);

/**
 * Schema for message search/filter parameters
 * Validates query parameters for message listing
 */
export const messageQuerySchema = z.object({
  // Optional lead ID filter
  leadId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  
  // Optional status filter
  status: z.enum([
    MessageStatus.QUEUED,
    MessageStatus.SENT,
    MessageStatus.DELIVERED,
    MessageStatus.FAILED
  ]).optional(),
  
  // Optional type filter
  type: z.enum([
    MessageType.AI,
    MessageType.HUMAN,
    MessageType.SYSTEM
  ]).optional(),
  
  // Optional date range filters
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  
  // Pagination parameters
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
}).strict().refine(
  (data) => {
    // Validate date range if both dates are provided
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: 'Start date must be before or equal to end date'
  }
);