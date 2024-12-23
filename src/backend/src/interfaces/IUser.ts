// mongodb v5.0.0
import { ObjectId } from 'mongodb';
import { UserRole } from '../types/auth.types';

/**
 * Interface defining the core user entity structure in the system.
 * Implements comprehensive user management with security, authentication,
 * role-based access control, and activity tracking capabilities.
 * 
 * Security Notes:
 * - PII data fields should be encrypted at rest using AES-256
 * - Passwords must be hashed using bcrypt before storage
 * - Password reset tokens must be cryptographically secure
 * 
 * @see Technical Specifications/7.1 AUTHENTICATION AND AUTHORIZATION
 * @see Technical Specifications/7.2 DATA SECURITY
 */
export interface IUser {
  /**
   * Unique identifier for the user document in MongoDB
   */
  _id: ObjectId;

  /**
   * User's email address (PII data)
   * Must be unique across the system
   * @encrypted AES-256
   */
  email: string;

  /**
   * Bcrypt-hashed password string
   * Never stored or transmitted in plain text
   * @hashed bcrypt
   */
  password: string;

  /**
   * User's first name (PII data)
   * @encrypted AES-256
   */
  firstName: string;

  /**
   * User's last name (PII data)
   * @encrypted AES-256
   */
  lastName: string;

  /**
   * User's assigned role for role-based access control
   * Determines system-wide permissions and access levels
   */
  role: UserRole;

  /**
   * Reference to the user's organization
   * Implements multi-tenant data isolation
   */
  organizationId: ObjectId;

  /**
   * Flag indicating if the user account is active
   * Used for temporary or permanent account deactivation
   */
  isActive: boolean;

  /**
   * Timestamp of user's last successful login
   * Used for security monitoring and activity tracking
   */
  lastLoginAt: Date;

  /**
   * Secure token for password reset process
   * Must be cryptographically secure and time-limited
   * Null when no reset is in progress
   */
  passwordResetToken: string | null;

  /**
   * Expiration timestamp for password reset token
   * Null when no reset is in progress
   * Maximum 1 hour validity from generation
   */
  passwordResetExpires: Date | null;

  /**
   * Timestamp of user account creation
   * Used for audit trail and account lifecycle tracking
   */
  createdAt: Date;

  /**
   * Timestamp of last user record update
   * Used for audit trail and change tracking
   */
  updatedAt: Date;
}