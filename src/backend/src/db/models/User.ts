// External dependencies
import { model, Document, Model } from 'mongoose'; // v7.0.0
import bcrypt from 'bcrypt'; // v5.1.0
import crypto from 'crypto';

// Internal dependencies
import { IUser } from '../../interfaces/IUser';
import { UserRole } from '../../types/auth.types';
import { UserSchema } from '../schemas/user.schema';

/**
 * Interface for pagination options
 */
interface PaginationOptions {
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
}

/**
 * Extended interface for User model with instance methods
 */
interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePasswordResetToken(): Promise<string>;
}

/**
 * Extended interface for User model with static methods
 */
interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
  findByOrganization(
    organizationId: string,
    role?: UserRole,
    options?: PaginationOptions
  ): Promise<{ users: IUserDocument[]; total: number }>;
}

/**
 * Enhanced static method to find a user by email with case-insensitive search
 * and proper error handling
 */
UserSchema.statics.findByEmail = async function(
  email: string
): Promise<IUserDocument | null> {
  try {
    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    // Perform case-insensitive search
    return await this.findOne({
      email: new RegExp(`^${email.toLowerCase()}$`, 'i'),
      isActive: true
    }).select('+password');
  } catch (error) {
    console.error('Error in findByEmail:', error);
    throw error;
  }
};

/**
 * Enhanced static method to find users by organization with role filtering
 * and pagination support
 */
UserSchema.statics.findByOrganization = async function(
  organizationId: string,
  role?: UserRole,
  options: PaginationOptions = { page: 1, limit: 10 }
): Promise<{ users: IUserDocument[]; total: number }> {
  try {
    // Build query with security filters
    const query = {
      organizationId,
      isActive: true,
      ...(role && { role })
    };

    // Calculate pagination
    const skip = (options.page - 1) * options.limit;

    // Execute query with proper index usage
    const [users, total] = await Promise.all([
      this.find(query)
        .sort(options.sort || { createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .select('-password -passwordResetToken -passwordResetExpires'),
      this.countDocuments(query)
    ]);

    return { users, total };
  } catch (error) {
    console.error('Error in findByOrganization:', error);
    throw error;
  }
};

/**
 * Secure instance method to compare password with hashed password
 * Updates lastLogin timestamp on successful match
 */
UserSchema.methods.comparePassword = async function(
  candidatePassword: string
): Promise<boolean> {
  try {
    // Validate password input
    if (!candidatePassword) {
      throw new Error('Password is required');
    }

    // Compare passwords using bcrypt
    const isMatch = await bcrypt.compare(candidatePassword, this.password);

    // Update lastLogin on successful match
    if (isMatch) {
      this.lastLoginAt = new Date();
      await this.save();
    }

    return isMatch;
  } catch (error) {
    console.error('Error in comparePassword:', error);
    throw error;
  }
};

/**
 * Secure method to generate and manage password reset tokens
 * Implements cryptographically secure token generation with expiration
 */
UserSchema.methods.generatePasswordResetToken = async function(): Promise<string> {
  try {
    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token for storage
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expiration (1 hour)
    this.passwordResetExpires = new Date(Date.now() + 3600000);

    // Save user document
    await this.save();

    // Return unhashed token
    return resetToken;
  } catch (error) {
    console.error('Error in generatePasswordResetToken:', error);
    throw error;
  }
};

/**
 * User model with enhanced security features, role-based access control,
 * and comprehensive error handling
 * 
 * @see Technical Specifications/7.1 AUTHENTICATION AND AUTHORIZATION
 * @see Technical Specifications/7.2 DATA SECURITY
 */
export const User = model<IUserDocument, IUserModel>('User', UserSchema);