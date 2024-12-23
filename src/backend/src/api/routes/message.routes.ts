/**
 * Express router configuration for message-related API endpoints
 * Implements secure SMS message handling with AI integration and human takeover capabilities
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import { container } from 'tsyringe'; // ^4.7.0
import { MessageController } from '../controllers/MessageController';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { 
  createMessageSchema, 
  updateMessageStatusSchema,
  messageQuerySchema 
} from '../validators/message.validator';
import { UserRole } from '../../types/auth.types';

// Initialize router and resolve controller
const router = Router();
const messageController = container.resolve(MessageController);

/**
 * Rate limiting configurations for different endpoints
 */
const rateLimits = {
  send: { windowMs: 60000, max: 100 }, // 100 requests per minute
  query: { windowMs: 60000, max: 200 }, // 200 requests per minute
  webhook: { windowMs: 60000, max: 500 }, // 500 requests per minute
  takeover: { windowMs: 60000, max: 50 } // 50 requests per minute
};

/**
 * @route POST /api/messages
 * @desc Send a new message with validation and rate limiting
 * @access Private - Agents and Organization Admins only
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.AGENT, UserRole.ORGANIZATION_ADMIN]),
  validateRequest(createMessageSchema, 'body', {
    strict: true,
    rateLimit: rateLimits.send
  }),
  messageController.sendMessage
);

/**
 * @route GET /api/messages/threads/:leadId
 * @desc Get all messages in a conversation thread with pagination
 * @access Private - Agents and Organization Admins only
 */
router.get(
  '/threads/:leadId',
  authenticate,
  authorize([UserRole.AGENT, UserRole.ORGANIZATION_ADMIN]),
  validateRequest(messageQuerySchema, 'query', {
    rateLimit: rateLimits.query
  }),
  messageController.getThreadMessages
);

/**
 * @route POST /api/messages/webhook
 * @desc Handle incoming SMS webhook with signature validation
 * @access Public - Protected by webhook signature verification
 */
router.post(
  '/webhook',
  validateRequest(createMessageSchema, 'body', {
    rateLimit: rateLimits.webhook
  }),
  messageController.handleWebhook
);

/**
 * @route POST /api/messages/threads/:leadId/takeover
 * @desc Take over conversation from AI with role validation
 * @access Private - Agents and Organization Admins only
 */
router.post(
  '/threads/:leadId/takeover',
  authenticate,
  authorize([UserRole.AGENT, UserRole.ORGANIZATION_ADMIN]),
  validateRequest(messageQuerySchema, 'params', {
    rateLimit: rateLimits.takeover
  }),
  messageController.takeOverConversation
);

/**
 * @route PATCH /api/messages/:messageId/status
 * @desc Update message delivery status with validation
 * @access Private - Agents and Organization Admins only
 */
router.patch(
  '/:messageId/status',
  authenticate,
  authorize([UserRole.AGENT, UserRole.ORGANIZATION_ADMIN]),
  validateRequest(updateMessageStatusSchema, 'body', {
    strict: true,
    rateLimit: rateLimits.send
  }),
  messageController.updateMessageStatus
);

export default router;