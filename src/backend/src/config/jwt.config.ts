import { config } from 'dotenv';
import { JWTPayload } from '../types/auth.types';

// Load environment variables
config();

/**
 * Comprehensive JWT configuration for secure token generation and validation.
 * Implements production-ready settings for both access and refresh tokens.
 * @version 1.0.0
 */
export const jwtConfig = {
  /**
   * Access token configuration
   * Short-lived tokens for API authentication
   */
  accessToken: {
    /** Secret key for access token signing - must be set in environment */
    secret: process.env.JWT_ACCESS_SECRET,
    
    /** Token expiration time - defaults to 1 hour if not set */
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h',
    
    /** HMAC SHA-256 signing algorithm */
    algorithm: 'HS256' as const,
    
    /** Token issuer identifier */
    issuer: 'lead-capture-platform',
    
    /** Expected token audience */
    audience: 'lead-capture-users',
    
    /** Allowed clock skew in seconds for token validation */
    clockTolerance: 30,
    
    /** Token maximum age in milliseconds (1 hour) */
    maxAge: 3600000,
  },

  /**
   * Refresh token configuration
   * Long-lived tokens for access token renewal
   */
  refreshToken: {
    /** Secret key for refresh token signing - must be set in environment */
    secret: process.env.JWT_REFRESH_SECRET,
    
    /** Token expiration time - defaults to 7 days if not set */
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    
    /** HMAC SHA-256 signing algorithm */
    algorithm: 'HS256' as const,
    
    /** Token issuer identifier */
    issuer: 'lead-capture-platform',
    
    /** Expected token audience */
    audience: 'lead-capture-users',
    
    /** Allowed clock skew in seconds for token validation */
    clockTolerance: 30,
    
    /** Token maximum age in milliseconds (7 days) */
    maxAge: 604800000,
  },

  /**
   * Secure cookie configuration for token storage
   * Implements security best practices for cookie-based token handling
   */
  cookieOptions: {
    /** Prevents client-side access to cookies via JavaScript */
    httpOnly: true,
    
    /** Requires HTTPS in production environment */
    secure: process.env.NODE_ENV === 'production',
    
    /** Strict same-site policy to prevent CSRF attacks */
    sameSite: 'strict' as const,
    
    /** Cookie path scope */
    path: '/',
    
    /** Domain scope for cookies - must be set in environment */
    domain: process.env.COOKIE_DOMAIN,
    
    /** Enable cookie signing for tamper protection */
    signed: true,
  },

  /**
   * Token validation options
   * Strict validation rules for token verification
   */
  validation: {
    /** Enforce token expiration validation */
    ignoreExpiration: false,
    
    /** Validate token issuer claim */
    validateIssuer: true,
    
    /** Validate token audience claim */
    validateAudience: true,
    
    /** Subject validation not required for this implementation */
    validateSubject: false,
    
    /** Require expiration time in token claims */
    requireExpirationTime: true,
  },

  /**
   * Type guard to validate JWT payload structure
   * @param payload - The decoded JWT payload to validate
   * @returns boolean indicating if payload matches expected structure
   */
  isValidPayload: (payload: any): payload is JWTPayload => {
    return (
      payload &&
      typeof payload.userId === 'string' &&
      typeof payload.organizationId === 'string' &&
      typeof payload.role === 'string' &&
      typeof payload.iat === 'number' &&
      typeof payload.exp === 'number'
    );
  },
} as const;

/**
 * Required environment variables for JWT configuration
 * @throws {Error} If required environment variables are missing
 */
const requiredEnvVars = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'COOKIE_DOMAIN'
];

// Validate required environment variables
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

export default jwtConfig;