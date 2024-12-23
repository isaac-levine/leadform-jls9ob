/**
 * @fileoverview Organization controller implementing secure HTTP endpoints for organization management
 * with comprehensive validation, error handling, and role-based access control.
 * 
 * @version 1.0.0
 * @module OrganizationController
 * 
 * @security This controller implements critical security controls.
 * Any modifications require security review.
 */

import { Request, Response } from 'express'; // v4.18.0
import { z } from 'zod'; // v3.0.0
import rateLimit from 'express-rate-limit'; // v6.0.0
import { OrganizationService } from '../../services/organization.service';
import { 
  createOrganizationSchema, 
  updateOrganizationSchema, 
  addMemberSchema,
  validateOrganizationName,
  validateSMSConfig 
} from '../validators/organization.validator';
import { OrganizationStatus, SMSProviderType } from '../../types/organization.types';
import { UserRole } from '../../types/auth.types';
import { sanitizeInput } from '../../utils/validation.utils';

/**
 * Controller class handling organization-related HTTP endpoints with enhanced security and validation
 */
export class OrganizationController {
  private organizationService: OrganizationService;
  private readonly rateLimiter: typeof rateLimit;

  constructor() {
    this.organizationService = new OrganizationService(process.env.ENCRYPTION_KEY || '');
    this.rateLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later'
    });
  }

  /**
   * Creates a new organization with enhanced validation and security checks
   * @param req Express request object
   * @param res Express response object
   */
  public createOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body against schema
      const validatedData = createOrganizationSchema.parse(req.body);

      // Additional organization name validation
      const nameValidation = validateOrganizationName(validatedData.name);
      if (!nameValidation.isValid) {
        res.status(400).json({ 
          success: false, 
          errors: nameValidation.errors 
        });
        return;
      }

      // Validate SMS configuration if provided
      if (validatedData.smsConfig) {
        const smsValidation = validateSMSConfig(validatedData.smsConfig);
        if (!smsValidation.isValid) {
          res.status(400).json({ 
            success: false, 
            errors: smsValidation.errors 
          });
          return;
        }
      }

      // Create organization
      const organization = await this.organizationService.createOrganization({
        name: validatedData.name,
        adminUserId: req.user.id, // Assuming user ID from auth middleware
        smsConfig: validatedData.smsConfig
      });

      res.status(201).json({
        success: true,
        data: organization
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          errors: error.errors
        });
        return;
      }

      console.error('Error creating organization:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Retrieves organization details with security checks
   * @param req Express request object
   * @param res Express response object
   */
  public getOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.params.id;
      const organization = await this.organizationService.getOrganizationById(organizationId);

      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      console.error('Error retrieving organization:', error);
      res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
  };

  /**
   * Updates organization details with validation and security checks
   * @param req Express request object
   * @param res Express response object
   */
  public updateOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.params.id;
      const validatedData = updateOrganizationSchema.parse(req.body);

      // Additional validation for status changes
      if (validatedData.status === OrganizationStatus.SUSPENDED && !req.user.isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Only administrators can suspend organizations'
        });
        return;
      }

      // Validate SMS configuration updates
      if (validatedData.smsConfig) {
        const smsValidation = validateSMSConfig(validatedData.smsConfig);
        if (!smsValidation.isValid) {
          res.status(400).json({
            success: false,
            errors: smsValidation.errors
          });
          return;
        }
      }

      const organization = await this.organizationService.updateOrganization(
        organizationId,
        validatedData
      );

      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          errors: error.errors
        });
        return;
      }

      console.error('Error updating organization:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Configures SMS provider with connection testing and validation
   * @param req Express request object
   * @param res Express response object
   */
  public configureSMSProvider = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.params.id;
      const smsConfig = req.body;

      // Validate SMS configuration
      const validation = validateSMSConfig(smsConfig);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          errors: validation.errors
        });
        return;
      }

      // Test provider connection
      const testResult = await this.organizationService.testSMSProviderConnection(
        smsConfig
      );

      if (!testResult.success) {
        res.status(400).json({
          success: false,
          error: 'SMS provider connection test failed',
          details: testResult.error
        });
        return;
      }

      // Configure provider
      const organization = await this.organizationService.configureSMSProvider(
        organizationId,
        smsConfig
      );

      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      console.error('Error configuring SMS provider:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Adds a new member to the organization with role validation
   * @param req Express request object
   * @param res Express response object
   */
  public addMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.params.id;
      const validatedData = addMemberSchema.parse(req.body);

      const organization = await this.organizationService.addOrganizationMember(
        organizationId,
        validatedData.userId,
        validatedData.role
      );

      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          errors: error.errors
        });
        return;
      }

      console.error('Error adding organization member:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Removes a member from the organization with role validation
   * @param req Express request object
   * @param res Express response object
   */
  public removeMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = req.params.id;
      const userId = req.params.userId;

      const organization = await this.organizationService.removeOrganizationMember(
        organizationId,
        userId
      );

      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      console.error('Error removing organization member:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

export default OrganizationController;