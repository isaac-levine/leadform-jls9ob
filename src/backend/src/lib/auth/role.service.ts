// mongodb v5.0.0
import { ObjectId } from 'mongodb';
import { UserRole } from '../../types/auth.types';
import { IUser } from '../../interfaces/IUser';

/**
 * Service responsible for managing role-based access control (RBAC) operations,
 * permission validation, and role hierarchy management.
 * 
 * Implements comprehensive security controls and organization-level access validation
 * as specified in Technical Specifications/7.1 AUTHENTICATION AND AUTHORIZATION.
 * 
 * Features:
 * - Role hierarchy management with inheritance
 * - Permission validation with organization context
 * - Secure role comparison and validation
 * - Audit logging for access attempts
 */
export class RoleService {
  /**
   * Immutable map defining the role hierarchy and inheritance relationships.
   * Each role maps to an array of subordinate roles it has permission over.
   * @private
   */
  private readonly roleHierarchy: Map<UserRole, UserRole[]>;

  /**
   * Initializes the role service with a comprehensive role hierarchy.
   * The hierarchy is immutable after initialization for security purposes.
   */
  constructor() {
    // Initialize role hierarchy map
    this.roleHierarchy = new Map<UserRole, UserRole[]>();

    // Define role hierarchy relationships
    this.roleHierarchy.set(UserRole.ADMIN, [
      UserRole.ORGANIZATION_ADMIN,
      UserRole.AGENT,
      UserRole.FORM_MANAGER,
      UserRole.READ_ONLY
    ]);

    this.roleHierarchy.set(UserRole.ORGANIZATION_ADMIN, [
      UserRole.AGENT,
      UserRole.FORM_MANAGER,
      UserRole.READ_ONLY
    ]);

    this.roleHierarchy.set(UserRole.AGENT, [
      UserRole.READ_ONLY
    ]);

    this.roleHierarchy.set(UserRole.FORM_MANAGER, [
      UserRole.READ_ONLY
    ]);

    this.roleHierarchy.set(UserRole.READ_ONLY, []);

    // Freeze the hierarchy map to prevent modifications
    Object.freeze(this.roleHierarchy);
  }

  /**
   * Validates if a user role has permission over another role based on the hierarchy.
   * 
   * @param userRole - The role of the user requesting access
   * @param requiredRole - The role level being requested
   * @returns boolean indicating if the user role has sufficient permissions
   * @throws Error if invalid roles are provided
   */
  public hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    // Validate input parameters
    if (!userRole || !requiredRole) {
      throw new Error('Invalid role parameters provided');
    }

    // Same role always has permission to itself
    if (userRole === requiredRole) {
      return true;
    }

    // Get subordinate roles for the user's role
    const subordinateRoles = this.roleHierarchy.get(userRole);

    // Check if the required role exists in subordinates
    return subordinateRoles ? subordinateRoles.includes(requiredRole) : false;
  }

  /**
   * Validates a user's access to a specific organization with admin override.
   * Admins have access to all organizations, while other roles must match the organization.
   * 
   * @param user - The user attempting to access the organization
   * @param targetOrgId - The organization being accessed
   * @returns boolean indicating if access is allowed
   * @throws Error if invalid parameters are provided
   */
  public validateOrganizationAccess(user: IUser, targetOrgId: ObjectId): boolean {
    // Validate input parameters
    if (!user || !targetOrgId) {
      throw new Error('Invalid user or organization parameters');
    }

    // Admin role has access to all organizations
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    try {
      // Validate organization IDs match for non-admin users
      return user.organizationId.equals(targetOrgId);
    } catch (error) {
      // Log the access attempt failure for security audit
      console.error('Organization access validation failed:', {
        userId: user._id,
        userRole: user.role,
        targetOrgId: targetOrgId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Retrieves the complete role hierarchy for a given role.
   * Used for permission management and role relationship visualization.
   * 
   * @param role - The role to get hierarchy for
   * @returns Array of subordinate roles
   * @throws Error if invalid role is provided
   */
  public getRoleHierarchy(role: UserRole): UserRole[] {
    // Validate input role
    if (!role) {
      throw new Error('Invalid role parameter');
    }

    try {
      // Return a copy of the subordinate roles array to prevent modification
      const subordinateRoles = this.roleHierarchy.get(role);
      return subordinateRoles ? [...subordinateRoles] : [];
    } catch (error) {
      // Log hierarchy access error
      console.error('Role hierarchy access failed:', {
        role: role,
        error: error.message
      });
      return [];
    }
  }
}

/**
 * Default role assigned to new users if not specified.
 * Provides minimum required access level.
 */
export const DEFAULT_ROLE = UserRole.READ_ONLY;