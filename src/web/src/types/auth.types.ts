// mongodb v5.0.0
import { ObjectId } from 'mongodb';

/**
 * Enumeration of available user roles for authorization levels
 * Based on role-based access control requirements from technical specification
 */
export enum UserRole {
  ADMIN = 'ADMIN',                         // Full system access across all organizations
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN', // Organization-level management access
  AGENT = 'AGENT',                         // Access to manage assigned conversations
  FORM_MANAGER = 'FORM_MANAGER',           // Access to create and edit organization forms
  READ_ONLY = 'READ_ONLY'                  // View-only access to organization data
}

/**
 * Interface representing an authenticated user's data
 * Contains core user information and authorization details
 */
export interface AuthUser {
  id: string;              // Unique user identifier
  email: string;           // User's email address
  name: string;            // User's full name
  role: UserRole;          // User's assigned role
  organizationId: string;  // ID of user's associated organization
}

/**
 * Interface for authentication tokens response
 * Implements JWT token structure as specified in technical requirements
 */
export interface AuthTokens {
  accessToken: string;   // Short-lived JWT access token
  refreshToken: string;  // Long-lived JWT refresh token
  expiresIn: number;     // Access token expiration time in seconds
}

/**
 * Interface for login request credentials
 * Defines required fields for user authentication
 */
export interface LoginCredentials {
  email: string;         // User's email address
  password: string;      // User's password
  rememberMe: boolean;   // Flag to extend session duration
}

/**
 * Interface for new user registration data
 * Defines required fields for creating a new user account
 */
export interface RegisterData {
  email: string;           // New user's email address
  password: string;        // New user's password
  name: string;           // New user's full name
  organizationName: string; // Name of organization to create/join
}

/**
 * Interface for password reset request
 * Used when initiating password recovery process
 */
export interface PasswordResetRequest {
  email: string;  // Email address for password reset
}

/**
 * Interface for password reset data
 * Used when completing password reset process
 */
export interface PasswordResetData {
  token: string;      // Password reset verification token
  newPassword: string; // New password to set
}

/**
 * Interface representing the authentication state
 * Used for managing authentication context in the application
 */
export interface AuthState {
  user: AuthUser | null;        // Current authenticated user or null
  tokens: AuthTokens | null;    // Current authentication tokens or null
  loading: boolean;             // Loading state flag
  error: string | null;         // Authentication error message if any
  isAuthenticated: boolean;     // Flag indicating authentication status
}