// mongoose v7.0.0
// @/errors v1.0.0
// @/security v1.0.0
// @/logging v1.0.0

import { Lead } from '../db/models/Lead';
import { ILead } from '../interfaces/ILead';
import { validatePhoneNumber } from '../utils/phone.utils';
import { BadRequestError, SecurityError } from '@/errors';
import { RateLimiter } from '@/security';
import { AuditLogger } from '@/logging';
import { 
  LeadId, 
  LeadStatus, 
  LeadSource, 
  CreateLeadDTO, 
  UpdateLeadDTO 
} from '../types/lead.types';
import { FormId } from '../types/form.types';

/**
 * Service class implementing secure lead management with comprehensive
 * PII protection, audit logging, and compliance tracking.
 * 
 * @security
 * - Field-level encryption for PII
 * - Rate limiting on sensitive operations
 * - Audit logging for compliance
 * - TCPA/GDPR/CCPA compliance features
 */
export class LeadService {
  private auditLogger: AuditLogger;
  private rateLimiter: RateLimiter;

  constructor() {
    this.auditLogger = new AuditLogger('LeadService');
    this.rateLimiter = new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100
    });
  }

  /**
   * Creates a new lead with encrypted PII data and compliance tracking
   * 
   * @param {CreateLeadDTO} leadData - Lead creation data
   * @returns {Promise<ILead>} Created lead document
   * @throws {BadRequestError} For validation failures
   * @throws {SecurityError} For rate limit violations
   * 
   * @security Implements PII encryption and input validation
   */
  async createLead(leadData: CreateLeadDTO): Promise<ILead> {
    // Rate limiting check
    if (!await this.rateLimiter.checkLimit('createLead')) {
      throw new SecurityError('Rate limit exceeded for lead creation');
    }

    // Validate phone number
    if (!validatePhoneNumber(leadData.phone)) {
      throw new BadRequestError('Invalid phone number format');
    }

    try {
      // Create lead with encrypted data
      const lead = await Lead.create({
        formId: leadData.formId,
        phone: leadData.phone,
        data: leadData.data,
        source: leadData.source || LeadSource.FORM,
        status: LeadStatus.NEW,
        optedOut: false,
        lastContactedAt: new Date()
      });

      // Audit logging
      await this.auditLogger.log('lead_created', {
        leadId: lead._id,
        formId: leadData.formId,
        source: leadData.source
      });

      return lead;
    } catch (error) {
      this.auditLogger.error('lead_creation_failed', { error });
      throw error;
    }
  }

  /**
   * Updates lead information with compliance tracking
   * 
   * @param {LeadId} leadId - Lead identifier
   * @param {UpdateLeadDTO} updateData - Data to update
   * @returns {Promise<ILead>} Updated lead document
   * @throws {BadRequestError} For validation failures
   * 
   * @security Implements audit logging and data validation
   */
  async updateLead(leadId: LeadId, updateData: UpdateLeadDTO): Promise<ILead> {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new BadRequestError('Lead not found');
    }

    // Track status changes for compliance
    if (updateData.status && updateData.status !== lead.status) {
      await this.auditLogger.log('lead_status_changed', {
        leadId,
        oldStatus: lead.status,
        newStatus: updateData.status
      });
    }

    // Track opt-out changes for TCPA compliance
    if (updateData.optedOut !== undefined && updateData.optedOut !== lead.optedOut) {
      await this.auditLogger.log('lead_consent_changed', {
        leadId,
        optedOut: updateData.optedOut,
        timestamp: new Date()
      });
    }

    try {
      const updated = await Lead.findByIdAndUpdate(
        leadId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updated) {
        throw new BadRequestError('Lead update failed');
      }

      return updated;
    } catch (error) {
      this.auditLogger.error('lead_update_failed', { leadId, error });
      throw error;
    }
  }

  /**
   * Retrieves lead by ID with PII access logging
   * 
   * @param {LeadId} leadId - Lead identifier
   * @returns {Promise<ILead>} Lead document
   * @throws {BadRequestError} If lead not found
   * 
   * @security Implements PII access logging
   */
  async findLeadById(leadId: LeadId): Promise<ILead> {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new BadRequestError('Lead not found');
    }

    // Log PII access
    await this.auditLogger.log('lead_pii_accessed', {
      leadId,
      timestamp: new Date()
    });

    return lead;
  }

  /**
   * Finds leads by form ID with pagination
   * 
   * @param {FormId} formId - Form identifier
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<ILead[]>} Array of lead documents
   */
  async findLeadsByForm(
    formId: FormId,
    page: number = 1,
    limit: number = 10
  ): Promise<ILead[]> {
    return Lead.findByFormId(formId, { page, limit });
  }

  /**
   * Toggles lead opt-out status with TCPA compliance tracking
   * 
   * @param {LeadId} leadId - Lead identifier
   * @returns {Promise<ILead>} Updated lead document
   * @throws {BadRequestError} If lead not found
   * 
   * @security Implements TCPA compliance tracking
   */
  async toggleOptOut(leadId: LeadId): Promise<ILead> {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new BadRequestError('Lead not found');
    }

    const newOptOutStatus = !lead.optedOut;

    // Log consent change for TCPA compliance
    await this.auditLogger.log('lead_consent_updated', {
      leadId,
      optedOut: newOptOutStatus,
      timestamp: new Date()
    });

    return Lead.toggleOptOut(leadId);
  }

  /**
   * Finds leads requiring follow-up with compliance checks
   * 
   * @returns {Promise<ILead[]>} Array of leads needing follow-up
   * 
   * @security Implements consent verification
   */
  async findLeadsRequiringFollowUp(): Promise<ILead[]> {
    return Lead.findRequiringFollowUp();
  }

  /**
   * Marks a lead as contacted with audit logging
   * 
   * @param {LeadId} leadId - Lead identifier
   * @returns {Promise<ILead>} Updated lead document
   * @throws {BadRequestError} If lead not found
   * 
   * @security Implements contact attempt logging
   */
  async markLeadContacted(leadId: LeadId): Promise<ILead> {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new BadRequestError('Lead not found');
    }

    // Log contact attempt
    await this.auditLogger.log('lead_contacted', {
      leadId,
      timestamp: new Date()
    });

    return Lead.markContacted(leadId);
  }
}