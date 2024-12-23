/**
 * User Controller - Handles user-related HTTP requests with enhanced security features
 * @module UserController
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import rateLimit from 'express-rate-limit';

// Internal imports
import { UserService } from '../../services/user.service';
import { 
  registerUserSchema, 
  loginUserSchema, 
  updateUserSchema 
} from '../validators/user.validator';
import { UserRole } from '../../types/auth.types';
import { AppError, createAuthenticationError } from '../../utils/error.utils';
import { SecurityLogger } from '../../utils/logger.utils';
import { HTTP_STATUS_CODES, ERROR_CODES } from '../../constants/error.constants';

/**
 * Rate limiting configuration for authentication endpoints
 */
const AUTH_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later'
};

/**
 * Controller class handling user-related HTTP endpoints with comprehensive security
 */
export class UserController {
  private readonly userService: UserService;
  private readonly securityLogger: SecurityLogger;
  private readonly authRateLimiter: any;

  /**
   * Initializes controller with required dependencies
   * @param userService - Service for user operations
   * @param securityLogger - Logger for security events
   */
  constructor(userService: UserService, securityLogger: SecurityLogger) {
    this.userService = userService;
    this.securityLogger = securityLogger;
    this.authRateLimiter = rateLimit(AUTH_RATE_LIMIT);
  }

  /**
   * Handles user registration with enhanced security validation
   * @param req - Express request object
   * @param res - Express response object
   */
  public register = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Apply rate limiting
      await this.authRateLimiter(req, res, () => {});

      // Validate request body
      const validatedData = await registerUserSchema.parseAsync(req.body);

      // Validate organization context
      const organizationId = new ObjectId(req.body.organizationId);
      if (!organizationId) {
        throw new AppError(
          'Invalid organization ID',
          HTTP_STATUS_CODES.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          true
        );
      }

      // Create user with validated data
      const user = await this.userService.createUser(validatedData, organizationId);

      // Log security event
      this.securityLogger.info('User registered successfully', {
        userId: user._id,
        organizationId,
        role: user.role
      });

      // Return sanitized user data
      return res.status(HTTP_STATUS_CODES.OK).json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organizationId: user.organizationId
          }
        }
      });
    } catch (error) {
      // Log security event for failed registration
      this.securityLogger.error('User registration failed', error as Error, {
        email: req.body.email,
        organizationId: req.body.organizationId
      });

      if (error instanceof AppError) throw error;
      throw new AppError(
        'Registration failed',
        HTTP_STATUS_CODES.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true
      );
    }
  };

  /**
   * Handles user login with rate limiting and security measures
   * @param req - Express request object
   * @param res - Express response object
   */
  public login = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Apply rate limiting
      await this.authRateLimiter(req, res, () => {});

      // Validate login credentials
      const { email, password, organizationId } = await loginUserSchema.parseAsync(req.body);

      // Authenticate user
      const user = await this.userService.authenticateUser(
        email,
        password,
        new ObjectId(organizationId)
      );

      // Generate JWT tokens
      const tokens = await this.userService.generateAuthTokens(user);

      // Log security event
      this.securityLogger.info('User logged in successfully', {
        userId: user._id,
        organizationId: user.organizationId
      });

      // Set secure cookie with refresh token
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.status(HTTP_STATUS_CODES.OK).json({
        status: 'success',
        data: {
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn
        }
      });
    } catch (error) {
      // Log security event for failed login
      this.securityLogger.warn('Login attempt failed', {
        email: req.body.email,
        organizationId: req.body.organizationId
      });

      throw createAuthenticationError('Invalid credentials');
    }
  };

  /**
   * Handles user profile updates with role-based access control
   * @param req - Express request object
   * @param res - Express response object
   */
  public updateProfile = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = new ObjectId(req.params.userId);
      const organizationId = new ObjectId(req.user.organizationId);

      // Validate update data
      const validatedData = await updateUserSchema.parseAsync(req.body);

      // Check permissions
      if (
        req.user.role !== UserRole.ADMIN && 
        req.user.role !== UserRole.ORGANIZATION_ADMIN &&
        req.user._id.toString() !== userId.toString()
      ) {
        throw new AppError(
          'Unauthorized access',
          HTTP_STATUS_CODES.FORBIDDEN,
          ERROR_CODES.AUTHORIZATION_ERROR,
          true
        );
      }

      // Update user profile
      const updatedUser = await this.userService.updateUser(
        userId,
        validatedData,
        organizationId
      );

      // Log security event
      this.securityLogger.info('User profile updated', {
        userId,
        organizationId,
        updatedBy: req.user._id
      });

      return res.status(HTTP_STATUS_CODES.OK).json({
        status: 'success',
        data: {
          user: updatedUser
        }
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Profile update failed',
        HTTP_STATUS_CODES.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true
      );
    }
  };

  /**
   * Handles password reset requests with security measures
   * @param req - Express request object
   * @param res - Express response object
   */
  public resetPassword = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Apply rate limiting
      await this.authRateLimiter(req, res, () => {});

      const { email } = req.body;
      const organizationId = new ObjectId(req.body.organizationId);

      // Initiate password reset
      const resetToken = await this.userService.initiatePasswordReset(
        email,
        organizationId
      );

      // Log security event
      this.securityLogger.info('Password reset requested', {
        email,
        organizationId
      });

      return res.status(HTTP_STATUS_CODES.OK).json({
        status: 'success',
        message: 'Password reset instructions sent'
      });
    } catch (error) {
      // Log security event but return success to prevent email enumeration
      this.securityLogger.warn('Password reset attempt failed', {
        email: req.body.email
      });

      return res.status(HTTP_STATUS_CODES.OK).json({
        status: 'success',
        message: 'Password reset instructions sent if email exists'
      });
    }
  };

  /**
   * Retrieves users by organization with role-based filtering
   * @param req - Express request object
   * @param res - Express response object
   */
  public getOrganizationUsers = async (req: Request, res: Response): Promise<Response> => {
    try {
      const organizationId = new ObjectId(req.params.organizationId);
      const role = req.query.role as UserRole | undefined;

      // Check organization access
      if (
        req.user.role !== UserRole.ADMIN &&
        req.user.organizationId.toString() !== organizationId.toString()
      ) {
        throw new AppError(
          'Unauthorized access',
          HTTP_STATUS_CODES.FORBIDDEN,
          ERROR_CODES.AUTHORIZATION_ERROR,
          true
        );
      }

      // Retrieve users
      const users = await this.userService.getUsersByOrganization(
        organizationId,
        role
      );

      return res.status(HTTP_STATUS_CODES.OK).json({
        status: 'success',
        data: {
          users
        }
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to retrieve users',
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR,
        true
      );
    }
  };
}