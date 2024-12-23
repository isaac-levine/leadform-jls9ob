/**
 * Express router configuration for lead-related API endpoints.
 * Implements comprehensive security, validation, and compliance measures
 * for lead capture and management operations.
 * 
 * @module lead.routes
 * @version 1.0.0
 * 
 * @security
 * - Request validation and sanitization
 * - Rate limiting protection
 * - Role-based access control
 * - PII data protection
 * - TCPA compliance tracking
 */

import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { LeadController } from '../controllers/LeadController';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { createLeadSchema, updateLeadSchema } from '../validators/lead.validator';
import { UserRole } from '../../types/auth.types';

// Initialize router and controller
const leadRouter = Router();
const leadController = new LeadController();

/**
 * Rate limiting configurations for different endpoints
 */
const createLeadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Too many lead creation attempts, please try again later'
});

const updateLeadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: 'Too many update attempts, please try again later'
});

const queryLeadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Too many query attempts, please try again later'
});

/**
 * @route   POST /api/leads
 * @desc    Create new lead with enhanced validation and PII protection
 * @access  Public
 * 
 * @security
 * - Input validation and sanitization
 * - Rate limiting
 * - PII data encryption
 */
leadRouter.post('/',
  createLeadLimiter,
  validateRequest(createLeadSchema),
  leadController.createLead
);

/**
 * @route   PATCH /api/leads/:leadId/status
 * @desc    Update lead status with role-based access control
 * @access  Private (Admin, Organization Admin, Agent)
 * 
 * @security
 * - Authentication required
 * - Role-based authorization
 * - Input validation
 * - Audit logging
 */
leadRouter.patch('/:leadId/status',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN, UserRole.AGENT]),
  updateLeadLimiter,
  validateRequest(updateLeadSchema),
  leadController.updateLeadStatus
);

/**
 * @route   GET /api/leads/form/:formId
 * @desc    Get form leads with pagination and access control
 * @access  Private (Admin, Organization Admin, Agent)
 * 
 * @security
 * - Authentication required
 * - Role-based authorization
 * - Rate limiting
 * - PII access logging
 */
leadRouter.get('/form/:formId',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN, UserRole.AGENT]),
  queryLeadLimiter,
  leadController.getLeadsByForm
);

/**
 * @route   POST /api/leads/:leadId/opt-out
 * @desc    Process lead opt-out with TCPA compliance tracking
 * @access  Public (with rate limiting)
 * 
 * @security
 * - Rate limiting
 * - TCPA compliance logging
 * - Input validation
 */
leadRouter.post('/:leadId/opt-out',
  rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: 'Too many opt-out attempts, please try again later'
  }),
  validateRequest(updateLeadSchema),
  leadController.optOutLead
);

/**
 * @route   GET /api/leads/health
 * @desc    Health check endpoint for monitoring
 * @access  Public
 */
leadRouter.get('/health', (_, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Export the router for use in the main application
export default leadRouter;