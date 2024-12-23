// mongodb v5.0.0
import { ObjectId } from 'mongodb';
import { MessageType } from '../types/message.types';
import { OrganizationStatus } from '../types/organization.types';

/**
 * Core interface defining the structure of message templates used in AI-powered SMS conversations.
 * Supports versioning, metadata, and variable interpolation for dynamic content generation.
 */
export interface ITemplate {
  /** Unique identifier for the template */
  _id: ObjectId;

  /** Reference to the organization that owns this template */
  organizationId: ObjectId;

  /** Human-readable name for the template */
  name: string;

  /** Detailed description of the template's purpose and usage */
  description: string;

  /** Template content with variable placeholders (e.g., {{leadName}}) */
  content: string;

  /** Type of message this template is used for */
  type: MessageType;

  /** Array of variable names used in the template content */
  variables: string[];

  /** Whether the template is currently active and available for use */
  isActive: boolean;

  /** Additional metadata for template categorization and processing */
  metadata: Record<string, any>;

  /** Template version number for tracking changes */
  version: number;

  /** Timestamp when template was created */
  createdAt: Date;

  /** Timestamp when template was last updated */
  updatedAt: Date;
}

/**
 * Data transfer object for creating new message templates.
 * Contains required fields for template creation without system-managed fields.
 */
export interface CreateTemplateDTO {
  /** Human-readable name for the template */
  name: string;

  /** Detailed description of the template's purpose and usage */
  description: string;

  /** Template content with variable placeholders */
  content: string;

  /** Type of message this template is used for */
  type: MessageType;

  /** Array of variable names used in the template content */
  variables: string[];

  /** Additional metadata for template categorization */
  metadata: Record<string, any>;
}

/**
 * Data transfer object for updating existing message templates.
 * Includes version field for optimistic concurrency control.
 */
export interface UpdateTemplateDTO {
  /** Updated template name */
  name: string;

  /** Updated template description */
  description: string;

  /** Updated template content */
  content: string;

  /** Updated message type */
  type: MessageType;

  /** Updated variable names */
  variables: string[];

  /** Updated active status */
  isActive: boolean;

  /** Updated metadata */
  metadata: Record<string, any>;

  /** Current version number for concurrency control */
  version: number;
}