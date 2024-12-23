/**
 * @file FormController.ts
 * @description REST API controller implementing secure form management endpoints with comprehensive validation
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // v4.18.0
import { StatusCodes } from 'http-status-codes'; // v2.2.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import winston from 'winston'; // v3.8.0

import { FormService } from '../../services/form.service';
import { IForm } from '../../interfaces/IForm';
import { createFormSchema, updateFormSchema } from '../validators/form.validator';
import { ERROR_MESSAGES } from '../../constants/error.constants';

/**
 * Rate limiting configuration for form management endpoints
 */
const formRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many form operations from this IP, please try again later'
});

/**
 * Controller class implementing secure form management HTTP endpoints
 * with comprehensive validation and error handling
 */
export class FormController {
  private readonly logger: winston.Logger;

  /**
   * Initializes form controller with required dependencies
   * @param formService - Service layer for form operations
   */
  constructor(private readonly formService: FormService) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'form-controller.log' })
      ]
    });

    // Bind methods to ensure correct 'this' context
    this.createForm = this.createForm.bind(this);
    this.getFormById = this.getFormById.bind(this);
    this.getFormsByOrganization = this.getFormsByOrganization.bind(this);
    this.updateForm = this.updateForm.bind(this);
    this.deleteForm = this.deleteForm.bind(this);
  }

  /**
   * Creates a new lead capture form with validation
   * @param req Express request object
   * @param res Express response object
   */
  async createForm(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body against schema
      const validatedData = createFormSchema.parse(req.body);

      // Create form using service
      const createdForm = await this.formService.createForm({
        organizationId: validatedData.organizationId,
        config: validatedData.config
      });

      this.logger.info('Form created successfully', {
        formId: createdForm._id,
        organizationId: createdForm.organizationId
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: createdForm
      });
    } catch (error) {
      this.logger.error('Form creation failed', { error });
      
      if (error.name === 'ZodError') {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: ERROR_MESSAGES.VALIDATION_ERROR,
          details: error.errors
        });
        return;
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      });
    }
  }

  /**
   * Retrieves a form by ID with access control
   * @param req Express request object
   * @param res Express response object
   */
  async getFormById(req: Request, res: Response): Promise<void> {
    try {
      const { formId } = req.params;
      const { organizationId } = req.user; // From auth middleware

      const form = await this.formService.getFormById(formId, organizationId);

      if (!form) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: ERROR_MESSAGES.RESOURCE_NOT_FOUND
        });
        return;
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: form
      });
    } catch (error) {
      this.logger.error('Form retrieval failed', { error, formId: req.params.formId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      });
    }
  }

  /**
   * Retrieves all forms for an organization with pagination
   * @param req Express request object
   * @param res Express response object
   */
  async getFormsByOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user; // From auth middleware
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const active = req.query.active === 'true';

      const { forms, total } = await this.formService.getFormsByOrganization(
        organizationId,
        { page, limit, active }
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          forms,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      this.logger.error('Forms retrieval failed', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      });
    }
  }

  /**
   * Updates an existing form with validation
   * @param req Express request object
   * @param res Express response object
   */
  async updateForm(req: Request, res: Response): Promise<void> {
    try {
      const { formId } = req.params;
      const { organizationId } = req.user; // From auth middleware

      // Validate update data
      const validatedData = updateFormSchema.parse(req.body);

      const updatedForm = await this.formService.updateForm(
        formId,
        validatedData,
        organizationId
      );

      if (!updatedForm) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: ERROR_MESSAGES.RESOURCE_NOT_FOUND
        });
        return;
      }

      this.logger.info('Form updated successfully', {
        formId,
        organizationId
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: updatedForm
      });
    } catch (error) {
      this.logger.error('Form update failed', { error, formId: req.params.formId });

      if (error.name === 'ZodError') {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: ERROR_MESSAGES.VALIDATION_ERROR,
          details: error.errors
        });
        return;
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      });
    }
  }

  /**
   * Deletes a form by ID with access control
   * @param req Express request object
   * @param res Express response object
   */
  async deleteForm(req: Request, res: Response): Promise<void> {
    try {
      const { formId } = req.params;
      const { organizationId } = req.user; // From auth middleware

      const success = await this.formService.deleteForm(formId, organizationId);

      if (!success) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: ERROR_MESSAGES.RESOURCE_NOT_FOUND
        });
        return;
      }

      this.logger.info('Form deleted successfully', {
        formId,
        organizationId
      });

      res.status(StatusCodes.NO_CONTENT).send();
    } catch (error) {
      this.logger.error('Form deletion failed', { error, formId: req.params.formId });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      });
    }
  }
}