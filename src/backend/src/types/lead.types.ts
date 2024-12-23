// mongodb v5.0.0
import { ObjectId } from 'mongodb';
import { FormId } from './form.types';

/**
 * Type alias for lead identifier using MongoDB ObjectId
 * Used for consistent typing of lead references throughout the system
 */
export type LeadId = ObjectId;

/**
 * Enumeration of possible lead statuses
 * Tracks the lead's progression through the sales pipeline
 */
export enum LeadStatus {
  /** Initial state when lead is first captured */
  NEW = 'NEW',
  
  /** System or agent has made first contact attempt */
  CONTACTED = 'CONTACTED',
  
  /** Lead has responded or shown interest */
  ENGAGED = 'ENGAGED',
  
  /** Lead has completed desired conversion action */
  CONVERTED = 'CONVERTED',
  
  /** Lead opportunity is no longer active */
  CLOSED = 'CLOSED'
}

/**
 * Enumeration of lead acquisition sources
 * Tracks how the lead entered the system
 */
export enum LeadSource {
  /** Lead captured through embedded form */
  FORM = 'FORM',
  
  /** Lead manually entered by user */
  MANUAL = 'MANUAL',
  
  /** Lead created through API integration */
  API = 'API'
}

/**
 * Core interface for Lead entities in the system
 * Contains all lead-related data and tracking fields
 */
export interface Lead {
  /** Unique identifier for the lead */
  _id: LeadId;
  
  /** Reference to the form that captured the lead */
  formId: FormId;
  
  /** Lead's phone number in E.164 format */
  phone: string;
  
  /** Dynamic form submission data */
  data: Record<string, any>;
  
  /** Current status in the sales pipeline */
  status: LeadStatus;
  
  /** How the lead was acquired */
  source: LeadSource;
  
  /** Whether the lead has opted out of communications */
  optedOut: boolean;
  
  /** Timestamp of last contact attempt */
  lastContactedAt: Date;
  
  /** Timestamp when lead was created */
  createdAt: Date;
  
  /** Timestamp when lead was last updated */
  updatedAt: Date;
}

/**
 * Data transfer object for lead creation
 * Contains required fields for creating a new lead
 */
export interface CreateLeadDTO {
  /** Form that captured the lead */
  formId: FormId;
  
  /** Lead's phone number (must match PHONE_REGEX) */
  phone: string;
  
  /** Form submission data */
  data: Record<string, any>;
  
  /** Lead acquisition source */
  source: LeadSource;
}

/**
 * Data transfer object for lead updates
 * Contains fields that can be updated for an existing lead
 */
export interface UpdateLeadDTO {
  /** Updated lead status */
  status?: LeadStatus;
  
  /** Updated opt-out preference */
  optedOut?: boolean;
  
  /** Updated form submission data */
  data?: Record<string, any>;
}