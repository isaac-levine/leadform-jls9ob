// mongodb v5.0.0
import { ObjectId } from 'mongodb';

/**
 * Enum defining user roles and their corresponding access levels within the system.
 * Used for role-based access control (RBAC) throughout the application.
 */
export enum UserRole {
  /** Full system access across all organizations */
  ADMIN = 'ADMIN',
  
  /** Organization-level administrative access */
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  
  /** Access to manage and respond to messages/conversations */
  AGENT = 'AGENT',
  
  /** Access to create and manage lead capture forms */
  FORM_MANAGER = 'FORM_MANAGER',
  
  /** View-only access to organization data */
  READ_ONLY = 'READ_ONLY'
}

/**
 * Interface defining the structure of JWT token payload.
 * Contains essential claims for user identification and authorization.
 */
export interface JWTPayload {
  /** Unique identifier of the authenticated user */
  userId: ObjectId;
  
  /** Organization context for the authenticated session */
  organizationId: ObjectId;
  
  /** User's role determining their access permissions */
  role: UserRole;
  
  /** Token issued at timestamp */
  iat: number;
  
  /** Token expiration timestamp */
  exp: number;
}

/**
 * Interface defining the structure of authentication tokens response.
 * Includes both access and refresh tokens with expiration information.
 */
export interface AuthTokens {
  /** JWT access token for API authentication */
  accessToken: string;
  
  /** Long-lived refresh token for obtaining new access tokens */
  refreshToken: string;
  
  /** Access token expiration time in seconds */
  expiresIn: number;
}

/**
 * Interface defining the structure of login request credentials.
 * Includes organization context for multi-tenant authentication.
 */
export interface LoginCredentials {
  /** User's email address */
  email: string;
  
  /** User's password (should be transmitted securely) */
  password: string;
  
  /** Organization identifier for login context */
  organizationId: ObjectId;
}

/**
 * Interface defining the structure of password reset request.
 * Includes validation token and new password confirmation.
 */
export interface PasswordReset {
  /** Password reset validation token */
  token: string;
  
  /** New password to be set */
  newPassword: string;
  
  /** Password confirmation for validation */
  confirmPassword: string;
}