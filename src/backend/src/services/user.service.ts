/**
 * User Service - Handles user management operations with enhanced security features
 * @module UserService
 * @version 1.0.0
 */

import { ObjectId } from 'mongodb';
import { RateLimiter } from 'rate-limiter-flexible';

// Internal imports
import { IUser } from '../../interfaces/IUser';
import { User } from '../../db/models/User';
import { PasswordService } from '../../lib/auth/password.service';
import { UserRole } from '../../types/auth.types';
import { 
  AppError, 
  createAuthenticationError, 
  createValidationError, 
  createNotFoundError 
} from '../../utils/error.utils';
import { 
  HTTP_STATUS_CODES, 
  ERROR_CODES, 
  ERROR_MESSAGES 
} from '../../constants/error.constants';

// Rate limiting configuration
const LOGIN_RATE_LIMIT = {
  points: 5, // Number of attempts
  duration: 60 * 15, // 15 minutes
  blockDuration: 60 * 60 // 1 hour block
};

/**
 * Service class for user management operations with comprehensive security features
 */
export class UserService {
  private readonly passwordService: PasswordService;
  private readonly loginRateLimiter: RateLimiter;

  /**
   * Initializes UserService with required dependencies
   * @param passwordService - Service for secure password operations
   */
  constructor(
    passwordService: PasswordService,
    rateLimiter: RateLimiter
  ) {
    this.passwordService = passwordService;
    this.loginRateLimiter = rateLimiter;
  }

  /**
   * Creates a new user with security validation and organization context
   * @param userData - User data to create
   * @param organizationId - Organization context
   * @returns Promise resolving to created user
   * @throws AppError if validation fails or user exists
   */
  public async createUser(
    userData: Partial<IUser>,
    organizationId: ObjectId
  ): Promise<IUser> {
    try {
      // Validate required fields
      if (!userData.email || !userData.password) {
        throw createValidationError('Email and password are required');
      }

      // Check for existing user
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new AppError(
          'Email already registered',
          HTTP_STATUS_CODES.CONFLICT,
          ERROR_CODES.DUPLICATE_RESOURCE,
          true
        );
      }

      // Hash password securely
      const hashedPassword = await this.passwordService.hashPassword(userData.password);

      // Create user with organization context
      const user = await User.create({
        ...userData,
        password: hashedPassword,
        organizationId,
        role: userData.role || UserRole.READ_ONLY,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        false
      );
    }
  }

  /**
   * Authenticates user with rate limiting and security measures
   * @param email - User email
   * @param password - User password
   * @param organizationId - Organization context
   * @returns Promise resolving to authenticated user
   * @throws AppError if authentication fails
   */
  public async authenticateUser(
    email: string,
    password: string,
    organizationId: ObjectId
  ): Promise<IUser> {
    try {
      // Check rate limit
      const rateLimitKey = `login_${email}`;
      const rateLimitResult = await this.loginRateLimiter.consume(rateLimitKey);

      // Find user with organization context
      const user = await User.findOne({
        email: email.toLowerCase(),
        organizationId,
        isActive: true
      }).select('+password');

      if (!user) {
        throw createAuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      // Verify password
      const isValid = await this.passwordService.verifyPassword(
        password,
        user.password
      );

      if (!isValid) {
        throw createAuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      // Update last login timestamp
      user.lastLoginAt = new Date();
      await user.save();

      // Remove sensitive data
      user.password = undefined;
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        false
      );
    }
  }

  /**
   * Retrieves users by organization with role filtering
   * @param organizationId - Organization context
   * @param role - Optional role filter
   * @returns Promise resolving to user array
   */
  public async getUsersByOrganization(
    organizationId: ObjectId,
    role?: UserRole
  ): Promise<IUser[]> {
    try {
      return await User.findByOrganization(organizationId.toString(), role);
    } catch (error) {
      throw new AppError(
        ERROR_MESSAGES.DATABASE_ERROR,
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR,
        true
      );
    }
  }

  /**
   * Updates user data with security validation
   * @param userId - User ID to update
   * @param updateData - Data to update
   * @param organizationId - Organization context
   * @returns Promise resolving to updated user
   */
  public async updateUser(
    userId: ObjectId,
    updateData: Partial<IUser>,
    organizationId: ObjectId
  ): Promise<IUser> {
    try {
      // Find user with organization context
      const user = await User.findOne({
        _id: userId,
        organizationId,
        isActive: true
      });

      if (!user) {
        throw createNotFoundError('User not found');
      }

      // Handle password update separately
      if (updateData.password) {
        updateData.password = await this.passwordService.hashPassword(
          updateData.password
        );
      }

      // Update user data
      Object.assign(user, {
        ...updateData,
        updatedAt: new Date()
      });

      await user.save();
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.DATABASE_ERROR,
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR,
        true
      );
    }
  }

  /**
   * Initiates password reset process with security measures
   * @param email - User email
   * @param organizationId - Organization context
   * @returns Promise resolving to reset token
   */
  public async initiatePasswordReset(
    email: string,
    organizationId: ObjectId
  ): Promise<string> {
    try {
      const user = await User.findOne({
        email: email.toLowerCase(),
        organizationId,
        isActive: true
      });

      if (!user) {
        // Return success to prevent email enumeration
        return 'Password reset initiated';
      }

      const resetToken = await user.generatePasswordResetToken();
      await user.save();

      return resetToken;
    } catch (error) {
      throw new AppError(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        false
      );
    }
  }
}