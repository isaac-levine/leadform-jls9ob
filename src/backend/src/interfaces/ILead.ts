// mongodb v5.0.0
import { Document } from 'mongodb';
import { LeadId, LeadStatus, LeadSource } from '../types/lead.types';
import { FormId } from '../types/form.types';

/**
 * Core interface for Lead entities in the lead capture and SMS nurturing system.
 * Extends MongoDB Document for database integration while providing comprehensive
 * tracking, security, and compliance features for lead management.
 * 
 * @interface ILead
 * @extends {Document}
 * 
 * @security
 * - PII data fields are marked for field-level encryption
 * - Audit fields track all modifications
 * - TCPA compliance fields included for SMS opt-out tracking
 */
export interface ILead extends Document {
  /**
   * Unique identifier for the lead
   * @type {LeadId}
   */
  _id: LeadId;

  /**
   * Reference to the form that captured the lead
   * Ensures referential integrity with form configurations
   * @type {FormId}
   */
  formId: FormId;

  /**
   * Lead's phone number in E.164 format
   * Validated using PHONE_REGEX pattern
   * @type {string}
   * @security PII field - requires encryption
   */
  phone: string;

  /**
   * Dynamic form submission data containing additional lead information
   * Structure varies based on form configuration
   * @type {Record<string, any>}
   * @security May contain PII - field-level encryption required
   */
  data: Record<string, any>;

  /**
   * Current status in the lead lifecycle
   * Tracks progression through the sales pipeline
   * @type {LeadStatus}
   */
  status: LeadStatus;

  /**
   * Lead acquisition source for attribution tracking
   * Identifies how the lead entered the system
   * @type {LeadSource}
   */
  source: LeadSource;

  /**
   * SMS communication opt-out status
   * Required for TCPA compliance
   * @type {boolean}
   */
  optedOut: boolean;

  /**
   * Timestamp of last contact attempt
   * Used for frequency capping and engagement tracking
   * @type {Date}
   */
  lastContactedAt: Date;

  /**
   * Timestamp when lead was created
   * Part of audit trail
   * @type {Date}
   */
  createdAt: Date;

  /**
   * Timestamp when lead was last updated
   * Part of audit trail
   * @type {Date}
   */
  updatedAt: Date;
}