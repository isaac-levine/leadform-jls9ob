import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../../lib/auth/jwt.service';
import { UserRole, JWTPayload } from '../../types/auth.types';
import { ERROR_MESSAGES } from '../../constants/error.constants';

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Initialize JWT service
const jwtService = new JWTService(global.redisClient);

/**
 * Role hierarchy mapping for authorization checks
 * Higher roles inherit permissions of lower roles
 */
const ROLE_HIERARCHY: { [key in UserRole]: UserRole[] } = {
  [UserRole.ADMIN]: [
    UserRole.ADMIN,
    UserRole.ORGANIZATION_ADMIN,
    UserRole.AGENT,
    UserRole.FORM_MANAGER,
    UserRole.READ_ONLY
  ],
  [UserRole.ORGANIZATION_ADMIN]: [
    UserRole.ORGANIZATION_ADMIN,
    UserRole.AGENT,
    UserRole.FORM_MANAGER,
    UserRole.READ_ONLY
  ],
  [UserRole.AGENT]: [UserRole.AGENT, UserRole.READ_ONLY],
  [UserRole.FORM_MANAGER]: [UserRole.FORM_MANAGER, UserRole.READ_ONLY],
  [UserRole.READ_ONLY]: [UserRole.READ_ONLY]
};

/**
 * Express middleware to validate JWT access token with enhanced security features
 * Implements token fingerprinting and comprehensive error handling
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: ERROR_MESSAGES.AUTHENTICATION_REQUIRED,
        code: 'AUTHENTICATION_ERROR'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Extract token fingerprint from secure cookie
    const fingerprint = req.signedCookies['token-fingerprint'];
    if (!fingerprint) {
      res.status(401).json({
        error: ERROR_MESSAGES.INVALID_TOKEN,
        code: 'AUTHENTICATION_ERROR'
      });
      return;
    }

    try {
      // Verify token and fingerprint
      const decodedToken = await jwtService.verifyAccessToken(token, fingerprint);
      
      // Attach verified user data to request
      req.user = decodedToken;
      next();
    } catch (error: any) {
      // Handle specific token validation errors
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          error: ERROR_MESSAGES.TOKEN_EXPIRED,
          code: 'AUTHENTICATION_ERROR'
        });
        return;
      }

      if (error.message === 'Token binding mismatch') {
        res.status(401).json({
          error: ERROR_MESSAGES.INVALID_TOKEN,
          code: 'AUTHENTICATION_ERROR'
        });
        return;
      }

      throw error;
    }
  } catch (error) {
    // Handle unexpected errors
    res.status(401).json({
      error: ERROR_MESSAGES.AUTHENTICATION_REQUIRED,
      code: 'AUTHENTICATION_ERROR'
    });
  }
};

/**
 * Express middleware factory for role-based authorization with hierarchy support
 * @param allowedRoles - Array of roles that have access to the resource
 * @param requireOrganization - Whether to enforce organization-specific access
 */
export const authorize = (allowedRoles: UserRole[], requireOrganization: boolean = true) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Verify request has authenticated user data
      if (!req.user) {
        res.status(401).json({
          error: ERROR_MESSAGES.AUTHENTICATION_REQUIRED,
          code: 'AUTHENTICATION_ERROR'
        });
        return;
      }

      const { role, organizationId } = req.user;

      // Validate organization access if required
      if (requireOrganization && !organizationId) {
        res.status(403).json({
          error: ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
          code: 'AUTHORIZATION_ERROR'
        });
        return;
      }

      // Check if user role has required permissions through hierarchy
      const hasPermission = allowedRoles.some(allowedRole => 
        ROLE_HIERARCHY[role].includes(allowedRole)
      );

      if (!hasPermission) {
        res.status(403).json({
          error: ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
          code: 'AUTHORIZATION_ERROR'
        });
        return;
      }

      next();
    } catch (error) {
      res.status(403).json({
        error: ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

/**
 * Usage examples:
 * 
 * // Require authentication only
 * router.get('/public-resource', authenticate, handleRequest);
 * 
 * // Require specific role
 * router.post('/forms', authenticate, authorize([UserRole.FORM_MANAGER]), handleRequest);
 * 
 * // Allow multiple roles
 * router.get('/messages', authenticate, authorize([UserRole.ADMIN, UserRole.AGENT]), handleRequest);
 * 
 * // Organization-agnostic admin access
 * router.get('/system-stats', authenticate, authorize([UserRole.ADMIN], false), handleRequest);
 */