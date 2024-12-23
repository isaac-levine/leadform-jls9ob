/**
 * @file form.routes.ts
 * @description Express router configuration for form management endpoints with comprehensive security
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.0
import rateLimit from 'express-rate-limit'; // v6.7.0

// Internal imports
import { FormController } from '../controllers/FormController';
import authenticate from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { createFormSchema, updateFormSchema } from '../validators/form.validator';
import { UserRole } from '../../types/auth.types';

/**
 * Rate limiting configuration for form management endpoints
 * Prevents abuse and DoS attacks
 */
const formRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many form operations from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Initialize router and controller instances
 */
const router = Router();
const formController = new FormController();

/**
 * @route POST /api/forms
 * @description Create a new form with organization context
 * @access Private - Admin, Organization Admin
 */
router.post(
  '/',
  formRateLimit,
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN]),
  validateRequest(createFormSchema),
  formController.createForm
);

/**
 * @route GET /api/forms/:formId
 * @description Get form by ID with organization validation
 * @access Private - Admin, Organization Admin, Form Manager
 */
router.get(
  '/:formId',
  formRateLimit,
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN, UserRole.FORM_MANAGER]),
  formController.getFormById
);

/**
 * @route GET /api/forms/organization/:organizationId
 * @description Get all forms for organization with pagination
 * @access Private - Admin, Organization Admin, Form Manager
 */
router.get(
  '/organization/:organizationId',
  formRateLimit,
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN, UserRole.FORM_MANAGER]),
  formController.getFormsByOrganization
);

/**
 * @route PUT /api/forms/:formId
 * @description Update existing form with validation
 * @access Private - Admin, Organization Admin
 */
router.put(
  '/:formId',
  formRateLimit,
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN]),
  validateRequest(updateFormSchema),
  formController.updateForm
);

/**
 * @route DELETE /api/forms/:formId
 * @description Delete form with organization validation
 * @access Private - Admin, Organization Admin
 */
router.delete(
  '/:formId',
  formRateLimit,
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN]),
  formController.deleteForm
);

/**
 * Error handling middleware for form routes
 * Ensures consistent error responses
 */
router.use((err: any, req: any, res: any, next: any) => {
  console.error('Form route error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

export default router;