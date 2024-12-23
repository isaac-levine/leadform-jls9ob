// mongodb v5.0.0
import { ObjectId } from 'mongodb';
import { 
  OrganizationStatus, 
  SMSProviderType, 
  SMSConfig 
} from '../types/organization.types';
import { UserRole } from '../types/auth.types';

/**
 * Interface defining the structure of an organization member within the system.
 * Represents a user's association and role within an organization.
 */
interface IOrganizationMember {
  /** MongoDB ObjectId reference to the user */
  userId: ObjectId;
  
  /** User's role within the organization */
  role: UserRole;
  
  /** Timestamp when the user joined the organization */
  joinedAt: Date;
}

/**
 * Core interface defining the structure of organization entities in the system.
 * Supports multi-tenant architecture and provider-agnostic SMS integration.
 * 
 * @interface IOrganization
 */
export interface IOrganization {
  /** Unique identifier for the organization */
  _id: ObjectId;
  
  /** Organization's display name */
  name: string;
  
  /** Current operational status of the organization */
  status: OrganizationStatus;
  
  /** SMS provider configuration settings */
  smsConfig: SMSConfig;
  
  /** List of users associated with the organization and their roles */
  members: IOrganizationMember[];
  
  /** Timestamp when the organization was created */
  createdAt: Date;
  
  /** Timestamp when the organization was last updated */
  updatedAt: Date;
}