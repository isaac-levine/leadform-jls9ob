import { UserRole } from '../types/auth.types';

/**
 * Enumeration of possible organization status values
 * Defines valid states for organization lifecycle management
 * @version 1.0.0
 */
export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',         // Organization is fully operational
  INACTIVE = 'INACTIVE',     // Organization is temporarily disabled
  SUSPENDED = 'SUSPENDED'    // Organization is suspended due to policy violation
}

/**
 * Enumeration of supported SMS provider types
 * Extensible design to support multiple provider integrations
 * @version 1.0.0
 */
export enum SMSProviderType {
  TWILIO = 'TWILIO',    // Twilio SMS provider integration
  CUSTOM = 'CUSTOM'     // Custom SMS provider implementation
}

/**
 * Interface defining SMS provider configuration
 * Implements provider-agnostic design with security considerations
 * @version 1.0.0
 */
export interface SMSConfig {
  providerType: SMSProviderType;              // Type of SMS provider
  apiKey: string;                             // Provider API key (encrypted at rest)
  apiSecret: string;                          // Provider API secret (encrypted at rest)
  fromNumber: string;                         // Sender phone number
  webhookUrl: string;                         // Webhook URL for provider callbacks
  customConfig?: Record<string, unknown>;     // Additional provider-specific configuration
}

/**
 * Interface defining organization member structure
 * Implements role-based access control with activity tracking
 * @version 1.0.0
 */
export interface OrganizationMember {
  userId: string;                // Unique identifier of the member
  role: UserRole;               // Member's role within organization
  joinedAt: Date;               // Timestamp of when member joined
  lastActive: Date;             // Timestamp of member's last activity
  permissions: string[];        // Additional granular permissions
}

/**
 * Interface defining comprehensive organization structure
 * Implements multi-tenant architecture with audit support
 * @version 1.0.0
 */
export interface Organization {
  id: string;                           // Unique organization identifier
  name: string;                         // Organization display name
  status: OrganizationStatus;           // Current organization status
  smsConfig: SMSConfig;                 // SMS provider configuration
  members: OrganizationMember[];        // Organization members list
  settings: Record<string, unknown>;    // Organization-specific settings
  createdAt: Date;                      // Organization creation timestamp
  updatedAt: Date;                      // Last update timestamp
}

/**
 * Type guard to check if an object is a valid Organization
 * @param obj - Object to validate
 * @returns boolean indicating if object matches Organization interface
 */
export function isOrganization(obj: unknown): obj is Organization {
  const org = obj as Organization;
  return (
    typeof org?.id === 'string' &&
    typeof org?.name === 'string' &&
    Object.values(OrganizationStatus).includes(org?.status) &&
    Array.isArray(org?.members) &&
    org?.smsConfig !== undefined &&
    org?.createdAt instanceof Date &&
    org?.updatedAt instanceof Date
  );
}

/**
 * Type guard to check if an object is a valid SMSConfig
 * @param obj - Object to validate
 * @returns boolean indicating if object matches SMSConfig interface
 */
export function isSMSConfig(obj: unknown): obj is SMSConfig {
  const config = obj as SMSConfig;
  return (
    Object.values(SMSProviderType).includes(config?.providerType) &&
    typeof config?.apiKey === 'string' &&
    typeof config?.apiSecret === 'string' &&
    typeof config?.fromNumber === 'string' &&
    typeof config?.webhookUrl === 'string'
  );
}