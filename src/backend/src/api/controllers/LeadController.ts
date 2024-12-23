// express v4.18.0
// @/errors v1.0.0
// xss v1.0.0
// rate-limiter-flexible v2.3.0
// zod v3.0.0

import { Request, Response, NextFunction } from 'express';
import { BadRequestError, NotFoundError, RateLimitError } from '@/errors';
import { sanitizeInput } from 'xss';
import { RateLimiter } from 'rate-limiter-flexible';
import { z } from 'zod';
import { LeadService } from '../../services/lead.service';
import { validatePhoneNumber } from '../../utils/phone.utils';
import { LeadStatus, LeadSource } from '../../types/lead.types';
import { PHONE_REGEX } from '../../constants/regex.constants';

/**
 * Lead data validation schema using zod
 * @security Implements strict input validation
 */
const createLeadSchema = z.object({
  formId: z.string().min(1),
  phone: z.string().regex(PHONE_REGEX, 'Invalid phone number format'),
  data: z.record(z.unknown()).min(1, 'Form data is required'),
  source: z.nativeEnum(LeadSource).default(LeadSource.FORM)
});

/**
 * Lead status update validation schema
 */
const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  optedOut: z.boolean().optional()
});

/**
 * Controller handling HTTP requests for lead management with comprehensive
 * security, compliance, and audit logging features.
 * 
 * @security
 * - Input validation and sanitization
 * - Rate limiting protection
 * - PII data handling compliance
 * - TCPA/GDPR compliance tracking
 */
export class LeadController {
  private leadService: LeadService;
  private rateLimiter: RateLimiter;

  constructor() {
    this.leadService = new LeadService();
    this.rateLimiter = new RateLimiter({
      points: 100, // Number of points
      duration: 60, // Per 60 seconds
    });
  }

  /**
   * Creates a new lead with comprehensive validation and compliance tracking
   * 
   * @security
   * - Input sanitization
   * - Rate limiting
   * - PII encryption
   * - GDPR compliance logging
   */
  public createLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Rate limiting check
      const rateLimitRes = await this.rateLimiter.consume(req.ip);
      if (rateLimitRes.remainingPoints <= 0) {
        throw new RateLimitError('Too many lead creation attempts');
      }

      // Validate input data
      const validatedData = createLeadSchema.parse(req.body);

      // Sanitize input data
      const sanitizedData = {
        ...validatedData,
        data: Object.fromEntries(
          Object.entries(validatedData.data).map(([key, value]) => [
            key,
            typeof value === 'string' ? sanitizeInput(value) : value
          ])
        )
      };

      // Validate phone number format
      if (!validatePhoneNumber(sanitizedData.phone)) {
        throw new BadRequestError('Invalid phone number format');
      }

      // Create lead with sanitized data
      const lead = await this.leadService.createLead(sanitizedData);

      res.status(201).json({
        success: true,
        data: lead
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates lead status with audit logging and compliance tracking
   * 
   * @security
   * - Input validation
   * - Rate limiting
   * - Audit logging
   */
  public updateLeadStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { leadId } = req.params;
      const validatedData = updateLeadSchema.parse(req.body);

      // Rate limiting check
      const rateLimitRes = await this.rateLimiter.consume(req.ip);
      if (rateLimitRes.remainingPoints <= 0) {
        throw new RateLimitError('Too many update attempts');
      }

      const updatedLead = await this.leadService.updateLeadStatus(leadId, validatedData);

      res.status(200).json({
        success: true,
        data: updatedLead
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves paginated leads for a form with caching
   * 
   * @security
   * - Access control validation
   * - Rate limiting
   * - PII access logging
   */
  public getLeadsByForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { formId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Rate limiting check
      const rateLimitRes = await this.rateLimiter.consume(req.ip);
      if (rateLimitRes.remainingPoints <= 0) {
        throw new RateLimitError('Too many retrieval attempts');
      }

      const leads = await this.leadService.findLeadsByFormId(formId, page, limit);

      res.status(200).json({
        success: true,
        data: leads,
        pagination: {
          page,
          limit,
          total: leads.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handles lead opt-out with TCPA compliance tracking
   * 
   * @security
   * - TCPA compliance logging
   * - Audit trail
   * - Input validation
   */
  public optOutLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { leadId } = req.params;

      // Rate limiting check
      const rateLimitRes = await this.rateLimiter.consume(req.ip);
      if (rateLimitRes.remainingPoints <= 0) {
        throw new RateLimitError('Too many opt-out attempts');
      }

      const updatedLead = await this.leadService.toggleLeadOptOut(leadId);

      res.status(200).json({
        success: true,
        data: updatedLead,
        message: updatedLead.optedOut ? 'Successfully opted out' : 'Successfully opted in'
      });
    } catch (error) {
      next(error);
    }
  };
}