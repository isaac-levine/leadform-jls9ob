// mongodb v5.0.0
import { ObjectId } from 'mongodb';
import { FormId } from './form.types';

/**
 * Type alias for lead identifier using MongoDB ObjectId
 * @version 1.0.0
 */
export type LeadId = ObjectId;

/**
 * Enumeration of possible lead statuses in the system
 * Defines the complete lifecycle of a lead from capture to conversion
 * @version 1.0.0
 */
export enum LeadStatus {
  NEW = 'NEW',               // Lead just entered the system
  CONTACTED = 'CONTACTED',   // Initial contact made
  ENGAGED = 'ENGAGED',       // Lead has responded
  NURTURING = 'NURTURING',   // In active conversation
  UNRESPONSIVE = 'UNRESPONSIVE', // No response after attempts
  CONVERTED = 'CONVERTED',   // Successfully converted
  CLOSED = 'CLOSED'         // Lead opportunity closed
}

/**
 * Enumeration of lead acquisition sources
 * Tracks how leads enter the system
 * @version 1.0.0
 */
export enum LeadSource {
  FORM = 'FORM',     // Web form submission
  MANUAL = 'MANUAL', // Manually entered by user
  API = 'API'        // External API integration
}

/**
 * Core interface for Lead entities in the frontend application
 * Implements lead management requirements from technical specification
 * @version 1.0.0
 */
export interface Lead {
  _id: LeadId;                      // Unique identifier
  formId: FormId;                   // Associated form ID
  phone: string;                    // Lead's phone number (PII)
  data: Record<string, any>;        // Dynamic form submission data
  status: LeadStatus;               // Current lead status
  source: LeadSource;               // Lead acquisition source
  optedOut: boolean;                // SMS opt-out status
  tags: string[];                   // Custom categorization tags
  notes: string;                    // Internal notes about lead
  assignedTo: string | null;        // Assigned agent ID
  conversionValue: number | null;   // Value if converted
  lastContactedAt: Date;            // Last message timestamp
  readonly createdAt: Date;         // Creation timestamp
  readonly updatedAt: Date;         // Last update timestamp
}

/**
 * Data transfer object for lead creation in frontend forms
 * Contains required fields for creating a new lead
 * @version 1.0.0
 */
export interface CreateLeadDTO {
  formId: FormId;                   // Associated form ID
  phone: string;                    // Lead's phone number
  data: Record<string, any>;        // Form submission data
  source: LeadSource;               // Lead source
}

/**
 * Data transfer object for lead updates in frontend forms
 * Contains fields that can be updated for an existing lead
 * @version 1.0.0
 */
export interface UpdateLeadDTO {
  status?: LeadStatus;              // Updated lead status
  optedOut?: boolean;               // Updated opt-out status
  data?: Record<string, any>;       // Updated form data
  tags?: string[];                  // Updated tags
  notes?: string;                   // Updated notes
  assignedTo?: string;              // Updated agent assignment
  conversionValue?: number;         // Updated conversion value
}

/**
 * Type guard to check if an object is a valid Lead
 * @param obj - Object to validate
 * @returns boolean indicating if object matches Lead interface
 */
export function isLead(obj: unknown): obj is Lead {
  const lead = obj as Lead;
  return (
    lead?._id instanceof ObjectId &&
    lead?.formId instanceof ObjectId &&
    typeof lead?.phone === 'string' &&
    typeof lead?.data === 'object' &&
    Object.values(LeadStatus).includes(lead?.status) &&
    Object.values(LeadSource).includes(lead?.source) &&
    typeof lead?.optedOut === 'boolean' &&
    Array.isArray(lead?.tags) &&
    typeof lead?.notes === 'string' &&
    (lead?.assignedTo === null || typeof lead?.assignedTo === 'string') &&
    (lead?.conversionValue === null || typeof lead?.conversionValue === 'number') &&
    lead?.lastContactedAt instanceof Date &&
    lead?.createdAt instanceof Date &&
    lead?.updatedAt instanceof Date
  );
}

/**
 * Type guard to check if an object is a valid CreateLeadDTO
 * @param obj - Object to validate
 * @returns boolean indicating if object matches CreateLeadDTO interface
 */
export function isCreateLeadDTO(obj: unknown): obj is CreateLeadDTO {
  const dto = obj as CreateLeadDTO;
  return (
    dto?.formId instanceof ObjectId &&
    typeof dto?.phone === 'string' &&
    typeof dto?.data === 'object' &&
    Object.values(LeadSource).includes(dto?.source)
  );
}