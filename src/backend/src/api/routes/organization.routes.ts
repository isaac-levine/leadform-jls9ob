/**
 * @fileoverview Express router configuration for organization-related endpoints
 * Implements secure routes with comprehensive validation, rate limiting and RBAC
 * 
 * @version 1.0.0
 * @module organization.routes
 * 
 * @security This module implements critical security controls.
 * Any modifications require security review.
 */

import express from 'express'; // v4.18.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import { OrganizationController } from '../controllers/OrganizationController';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { UserRole } from '../../types/auth.types';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  addMemberSchema
} from '../validators/organization.validator';

// Initialize router
const router = express.Router();

// Initialize controller
const organizationController = new OrganizationController();

// Rate limiting configurations
const createOrgLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many organization creation attempts, please try again later'
});

const updateOrgLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: 'Too many update attempts, please try again later'
});

const membershipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: 'Too many membership changes, please try again later'
});

/**
 * Create new organization
 * @security Requires ADMIN role
 * @route POST /api/organizations
 */
router.post('/',
  authenticate,
  authorize([UserRole.ADMIN]),
  createOrgLimiter,
  validateRequest(createOrganizationSchema),
  organizationController.createOrganization
);

/**
 * Get organization details
 * @security Requires authentication and organization membership
 * @route GET /api/organizations/:organizationId
 */
router.get('/:organizationId',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN, UserRole.AGENT, UserRole.FORM_MANAGER, UserRole.READ_ONLY]),
  organizationController.getOrganization
);

/**
 * Update organization details
 * @security Requires ADMIN or ORGANIZATION_ADMIN role
 * @route PUT /api/organizations/:organizationId
 */
router.put('/:organizationId',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN]),
  updateOrgLimiter,
  validateRequest(updateOrganizationSchema),
  organizationController.updateOrganization
);

/**
 * Configure SMS provider settings
 * @security Requires ADMIN or ORGANIZATION_ADMIN role
 * @route PUT /api/organizations/:organizationId/sms-config
 */
router.put('/:organizationId/sms-config',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN]),
  updateOrgLimiter,
  organizationController.configureSMSProvider
);

/**
 * Add member to organization
 * @security Requires ADMIN or ORGANIZATION_ADMIN role
 * @route POST /api/organizations/:organizationId/members
 */
router.post('/:organizationId/members',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN]),
  membershipLimiter,
  validateRequest(addMemberSchema),
  organizationController.addMember
);

/**
 * Remove member from organization
 * @security Requires ADMIN or ORGANIZATION_ADMIN role
 * @route DELETE /api/organizations/:organizationId/members/:userId
 */
router.delete('/:organizationId/members/:userId',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN]),
  membershipLimiter,
  organizationController.removeMember
);

// Export configured router
export default router;