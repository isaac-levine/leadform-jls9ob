/**
 * REST API controller handling message-related operations with enhanced security,
 * performance monitoring, and human takeover capabilities
 * @version 1.0.0
 */

import { injectable } from 'tsyringe';
import { Request, Response } from 'express';
import { Logger } from 'winston';
import { MessageService } from '../../services/message.service';
import {
  createMessageSchema,
  updateMessageStatusSchema,
  messageQuerySchema
} from '../validators/message.validator';
import {
  CreateMessageDTO,
  UpdateMessageStatusDTO,
  MessageType,
  MessageStatus
} from '../../types/message.types';
import { HTTP_STATUS_CODES, ERROR_CODES, ERROR_MESSAGES } from '../../constants/error.constants';

@injectable()
export class MessageController {
  private readonly messageService: MessageService;
  private readonly logger: Logger;

  constructor(messageService: MessageService, logger: Logger) {
    this.messageService = messageService;
    this.logger = logger;
  }

  /**
   * Handles request to send a new message with rate limiting and validation
   * @param req Express request
   * @param res Express response
   */
  public async sendMessage(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();

    try {
      // Validate request body
      const validatedData = createMessageSchema.parse(req.body);
      const messageData: CreateMessageDTO = {
        leadId: validatedData.leadId,
        content: validatedData.content,
        type: validatedData.type,
        metadata: validatedData.metadata || {}
      };

      this.logger.info('Processing send message request', {
        leadId: messageData.leadId,
        type: messageData.type
      });

      // Send message through service
      const message = await this.messageService.sendMessage(
        messageData.leadId,
        messageData.content,
        messageData.type
      );

      const processingTime = Date.now() - startTime;
      this.logger.info('Message sent successfully', {
        messageId: message._id,
        processingTime
      });

      return res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        data: message,
        metadata: {
          processingTime
        }
      });

    } catch (error) {
      this.logger.error('Failed to send message', {
        error,
        processingTime: Date.now() - startTime
      });

      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }
  }

  /**
   * Retrieves all messages in a conversation thread with pagination
   * @param req Express request
   * @param res Express response
   */
  public async getThreadMessages(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();

    try {
      // Validate query parameters
      const validatedQuery = messageQuerySchema.parse(req.query);
      const { leadId, page = 1, limit = 50 } = validatedQuery;

      if (!leadId) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: ERROR_MESSAGES.VALIDATION_ERROR,
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }

      // Retrieve messages
      const messages = await this.messageService.getThreadMessages(
        leadId,
        page,
        limit
      );

      const processingTime = Date.now() - startTime;
      this.logger.info('Thread messages retrieved', {
        leadId,
        messageCount: messages.length,
        processingTime
      });

      return res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        data: messages,
        metadata: {
          processingTime,
          page,
          limit
        }
      });

    } catch (error) {
      this.logger.error('Failed to retrieve thread messages', {
        error,
        processingTime: Date.now() - startTime
      });

      return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  /**
   * Processes incoming SMS webhook with signature validation
   * @param req Express request
   * @param res Express response
   */
  public async handleWebhook(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();

    try {
      const { leadId, content } = req.body;

      // Process incoming message
      const message = await this.messageService.receiveMessage(
        leadId,
        content
      );

      const processingTime = Date.now() - startTime;
      this.logger.info('Webhook processed successfully', {
        messageId: message._id,
        processingTime
      });

      return res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        data: message,
        metadata: {
          processingTime
        }
      });

    } catch (error) {
      this.logger.error('Failed to process webhook', {
        error,
        processingTime: Date.now() - startTime
      });

      return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  /**
   * Transitions conversation from AI to human agent with validation
   * @param req Express request
   * @param res Express response
   */
  public async takeOverConversation(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();

    try {
      const { leadId } = req.params;

      if (!leadId) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: ERROR_MESSAGES.VALIDATION_ERROR,
          code: ERROR_CODES.VALIDATION_ERROR
        });
      }

      // Get conversation context
      const context = await this.messageService.getThreadMessages(leadId);

      // Handle takeover
      await this.messageService.handleHumanTakeover(leadId, context);

      const processingTime = Date.now() - startTime;
      this.logger.info('Human takeover successful', {
        leadId,
        processingTime
      });

      return res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        metadata: {
          processingTime
        }
      });

    } catch (error) {
      this.logger.error('Failed to take over conversation', {
        error,
        processingTime: Date.now() - startTime
      });

      return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  }

  /**
   * Updates delivery status of a message with validation
   * @param req Express request
   * @param res Express response
   */
  public async updateMessageStatus(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();

    try {
      const { messageId } = req.params;
      const validatedData = updateMessageStatusSchema.parse(req.body);

      const statusData: UpdateMessageStatusDTO = {
        status: validatedData.status,
        deliveredAt: validatedData.deliveredAt
      };

      // Update message status
      await this.messageService.updateMessageStatus(
        messageId,
        statusData.status,
        { deliveredAt: statusData.deliveredAt }
      );

      const processingTime = Date.now() - startTime;
      this.logger.info('Message status updated', {
        messageId,
        status: statusData.status,
        processingTime
      });

      return res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        metadata: {
          processingTime
        }
      });

    } catch (error) {
      this.logger.error('Failed to update message status', {
        error,
        processingTime: Date.now() - startTime
      });

      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: ERROR_MESSAGES.VALIDATION_ERROR,
        code: ERROR_CODES.VALIDATION_ERROR
      });
    }
  }
}