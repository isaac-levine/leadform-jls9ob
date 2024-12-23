/**
 * User Routes Configuration
 * Implements secure endpoints for user authentication, registration, and management
 * with comprehensive security controls and input validation.
 * 
 * @module api/routes/user.routes
 * @version 1.0.0
 * 
 * @security This module implements critical authentication and authorization controls.
 * Any modifications require security review.
 */

import { Router } from 'express'; // v4.18.0
import rateLimit from 'express-rate-limit'; // v6.0.0
import helmet from 'helmet'; // v6.0.0

// Internal imports
import { UserController } from '../controllers/UserController';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import { 
  registerUserSchema,
  loginUserSchema,
  updateUserSchema
} from '../validators/user.validator';
import { UserRole } from '../../types/auth.types';

// Initialize router
const router = Router();

// Initialize controller
const userController = new UserController();

/**
 * Rate limiting configuration for authentication endpoints
 * Prevents brute force and DoS attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route POST /api/users/register
 * @description Register a new user with organization context
 * @access Public
 */
router.post(
  '/register',
  [
    helmet(),
    authLimiter,
    validateRequest(registerUserSchema)
  ],
  userController.register
);

/**
 * @route POST /api/users/login
 * @description Authenticate user and generate JWT tokens
 * @access Public
 */
router.post(
  '/login',
  [
    helmet(),
    authLimiter,
    validateRequest(loginUserSchema)
  ],
  userController.login
);

/**
 * @route PUT /api/users/profile
 * @description Update authenticated user's profile
 * @access Private
 */
router.put(
  '/profile',
  [
    helmet(),
    authenticate,
    validateRequest(updateUserSchema)
  ],
  userController.updateProfile
);

/**
 * @route POST /api/users/reset-password
 * @description Initiate password reset process
 * @access Public (with rate limiting)
 */
router.post(
  '/reset-password',
  [
    helmet(),
    authLimiter
  ],
  userController.resetPassword
);

/**
 * @route GET /api/users/organization
 * @description Get organization users with role-based filtering
 * @access Private (Admin/Organization Admin only)
 */
router.get(
  '/organization/users',
  [
    helmet(),
    authenticate,
    authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN])
  ],
  userController.getOrganizationUsers
);

/**
 * @route POST /api/users/refresh-token
 * @description Refresh access token using refresh token
 * @access Public (with valid refresh token)
 */
router.post(
  '/refresh-token',
  [
    helmet(),
    authLimiter
  ],
  userController.refreshToken
);

/**
 * @route POST /api/users/logout
 * @description Invalidate user's tokens and clear session
 * @access Private
 */
router.post(
  '/logout',
  [
    helmet(),
    authenticate
  ],
  userController.logout
);

/**
 * @route DELETE /api/users/organization/:userId
 * @description Deactivate user account (soft delete)
 * @access Private (Admin/Organization Admin only)
 */
router.delete(
  '/organization/:userId',
  [
    helmet(),
    authenticate,
    authorize([UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN])
  ],
  userController.deactivateUser
);

/**
 * Security headers configuration
 * Applied to all routes in this router
 */
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true,
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}));

export default router;