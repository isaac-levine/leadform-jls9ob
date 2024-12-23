/**
 * @file IForm.ts
 * @description Core interface for Form documents in the MongoDB database.
 * Defines the structure and relationships for form data in the lead capture system.
 * @version 1.0.0
 */

import { Document } from 'mongoose'; // v7.0.0
import { FormId, FormConfig } from '../types/form.types';
import { OrganizationId } from '../types/organization.types';

/**
 * Interface representing a Form document in MongoDB.
 * Extends the base Document interface from Mongoose.
 * 
 * @interface IForm
 * @extends {Document}
 * 
 * @property {FormId} _id - Unique identifier for the form
 * @property {OrganizationId} organizationId - Reference to the owning organization
 * @property {FormConfig} config - Complete form configuration including fields and settings
 * @property {string} embedCode - Generated HTML code for embedding the form
 * @property {boolean} active - Whether the form is currently active and accepting submissions
 * @property {Date} createdAt - Timestamp when the form was created
 * @property {Date} updatedAt - Timestamp when the form was last updated
 */
export interface IForm extends Document {
  /** Unique identifier for the form */
  _id: FormId;

  /** Reference to the organization that owns this form */
  organizationId: OrganizationId;

  /** Complete form configuration including fields, validation, and display settings */
  config: FormConfig;

  /** Generated HTML code for embedding the form on external websites */
  embedCode: string;

  /** Indicates whether the form is currently active and accepting submissions */
  active: boolean;

  /** Timestamp when the form was created */
  createdAt: Date;

  /** Timestamp when the form was last updated */
  updatedAt: Date;
}