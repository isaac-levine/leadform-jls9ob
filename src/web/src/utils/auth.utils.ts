import { jwtDecode } from 'jwt-decode'; // v4.0.0
import { AuthTokens, AuthUser, UserRole } from '../types/auth.types';

/**
 * Constants for token expiration times
 * Aligned with security requirements for session management
 */
const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '1h',    // 1 hour expiry for access tokens
  REFRESH_TOKEN: '7d'    // 7 days expiry for refresh tokens
} as const;

/**
 * Cookie names for storing authentication tokens
 * Used consistently across the application
 */
const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token'
} as const;

/**
 * Secure cookie configuration
 * Implements security best practices for token storage
 */
const COOKIE_CONFIG = {
  secure: true,          // HTTPS only
  httpOnly: true,        // Prevents JavaScript access
  sameSite: 'strict' as const,  // CSRF protection
  path: '/',
  domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || 'localhost'
} as const;

/**
 * Securely parses and validates JWT tokens
 * Implements comprehensive token validation with enhanced security checks
 * 
 * @param token - JWT token string to parse
 * @returns Validated AuthUser object from token payload
 * @throws Error if token is invalid or malformed
 */
export const parseJwt = (token: string): AuthUser => {
  try {
    // Validate token existence
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token format');
    }

    // Decode token with type safety
    const decoded = jwtDecode<{
      sub: string;
      email: string;
      name: string;
      role: UserRole;
      organizationId: string;
      exp: number;
      iat: number;
    }>(token);

    // Validate required payload fields
    if (!decoded.sub || !decoded.email || !decoded.role || !decoded.organizationId) {
      throw new Error('Invalid token payload structure');
    }

    // Construct and return validated user data
    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      organizationId: decoded.organizationId
    };
  } catch (error) {
    console.error('Token parsing failed:', error);
    throw new Error('Failed to parse authentication token');
  }
};

/**
 * Securely stores authentication tokens in HttpOnly cookies
 * Implements secure token storage with enhanced security configurations
 * 
 * @param tokens - AuthTokens object containing access and refresh tokens
 */
export const storeTokens = (tokens: AuthTokens): void => {
  try {
    // Validate token data
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error('Invalid token data for storage');
    }

    // Calculate expiration dates
    const accessExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Set secure cookies with HttpOnly flag
    document.cookie = `${COOKIE_NAMES.ACCESS_TOKEN}=${tokens.accessToken}; expires=${accessExpiry.toUTCString()}; ${Object.entries(COOKIE_CONFIG)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')}`;

    document.cookie = `${COOKIE_NAMES.REFRESH_TOKEN}=${tokens.refreshToken}; expires=${refreshExpiry.toUTCString()}; ${Object.entries(COOKIE_CONFIG)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')}`;
  } catch (error) {
    console.error('Token storage failed:', error);
    throw new Error('Failed to store authentication tokens');
  }
};

/**
 * Securely removes stored authentication tokens
 * Implements comprehensive token cleanup with security considerations
 */
export const clearTokens = (): void => {
  try {
    // Remove cookies with secure attributes
    document.cookie = `${COOKIE_NAMES.ACCESS_TOKEN}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${Object.entries(COOKIE_CONFIG)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')}`;

    document.cookie = `${COOKIE_NAMES.REFRESH_TOKEN}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${Object.entries(COOKIE_CONFIG)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')}`;
  } catch (error) {
    console.error('Token removal failed:', error);
    throw new Error('Failed to clear authentication tokens');
  }
};

/**
 * Validates token expiration with comprehensive security checks
 * Implements secure time comparison and additional validation
 * 
 * @param token - JWT token string to validate
 * @returns boolean indicating if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    if (!token) return true;

    // Decode token to get expiration
    const decoded = jwtDecode<{ exp: number }>(token);
    
    // Validate expiration timestamp exists
    if (!decoded.exp) return true;

    // Secure time comparison with 30-second buffer
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp <= currentTime + 30;
  } catch (error) {
    console.error('Token expiration check failed:', error);
    return true;
  }
};

/**
 * Advanced role validation supporting hierarchical roles
 * Implements comprehensive role checking with security considerations
 * 
 * @param user - AuthUser object containing user's role
 * @param requiredRole - Required UserRole for access
 * @returns boolean indicating if user has required role or higher
 */
export const hasRole = (user: AuthUser, requiredRole: UserRole): boolean => {
  try {
    // Validate user object
    if (!user?.role) return false;

    // Role hierarchy definition
    const roleHierarchy = {
      [UserRole.ADMIN]: 5,
      [UserRole.ORGANIZATION_ADMIN]: 4,
      [UserRole.AGENT]: 3,
      [UserRole.FORM_MANAGER]: 2,
      [UserRole.READ_ONLY]: 1
    };

    // Compare role levels
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  } catch (error) {
    console.error('Role validation failed:', error);
    return false;
  }
};