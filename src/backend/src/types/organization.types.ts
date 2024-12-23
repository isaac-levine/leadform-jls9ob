// mongodb v5.0.0
import { ObjectId } from 'mongodb';
import { UserRole } from '../types/auth.types';

/**
 * Enum defining possible organization status values.
 * Used to track and manage organization lifecycle states.
 */
export enum OrganizationStatus {
  /** Organization is active and fully operational */
  ACTIVE = 'ACTIVE',
  
  /** Organization is temporarily or permanently deactivated */
  INACTIVE = 'INACTIVE',
  
  /** Organization is suspended due to policy violations or payment issues */
  SUSPENDED = 'SUSPENDED'
}

/**
 * Enum defining supported SMS provider types.
 * Enables provider-agnostic SMS integration configuration.
 */
export enum SMSProviderType {
  /** Twilio SMS provider integration */
  TWILIO = 'TWILIO',
  
  /** Custom SMS provider integration with configurable parameters */
  CUSTOM = 'CUSTOM'
}

/**
 * Interface defining SMS provider configuration structure.
 * Contains all necessary parameters for SMS provider integration.
 */
export interface SMSConfig {
  /** Type of SMS provider being configured */
  providerType: SMSProviderType;
  
  /** Provider API key for authentication */
  apiKey: string;
  
  /** Provider API secret for authentication */
  apiSecret: string;
  
  /** Sender phone number for outbound messages */
  fromNumber: string;
  
  /** Webhook URL for receiving provider callbacks */
  webhookUrl: string;
  
  /** Additional provider-specific configuration parameters */
  customConfig?: Record<string, unknown>;
}

/**
 * Interface defining organization member structure.
 * Represents a user's membership and role within an organization.
 */
export interface OrganizationMember {
  /** Reference to the user's ID */
  userId: ObjectId;
  
  /** Member's role within the organization */
  role: UserRole;
  
  /** Specific permissions granted to the member */
  permissions: string[];
  
  /** Timestamp when member joined the organization */
  joinedAt: Date;
  
  /** Timestamp of member's last activity */
  lastActiveAt: Date;
  
  /** Current status of the member (e.g., 'active', 'inactive') */
  status: string;
}

/**
 * Main interface defining organization structure.
 * Contains all organization-related data and configurations.
 */
export interface Organization {
  /** Unique identifier for the organization */
  _id: ObjectId;
  
  /** Organization's display name */
  name: string;
  
  /** Current status of the organization */
  status: OrganizationStatus;
  
  /** SMS provider configuration */
  smsConfig: SMSConfig;
  
  /** List of organization members */
  members: OrganizationMember[];
  
  /** Organization-specific settings */
  settings: Record<string, unknown>;
  
  /** Additional metadata for the organization */
  metadata: Record<string, unknown>;
  
  /** Timestamp when organization was created */
  createdAt: Date;
  
  /** Timestamp when organization was last updated */
  updatedAt: Date;
}