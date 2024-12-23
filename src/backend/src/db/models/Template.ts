// mongodb v7.0.0
import { model, Model, Document, ObjectId } from 'mongoose';
import { ITemplate } from '../../interfaces/ITemplate';
import { TemplateSchema } from '../schemas/template.schema';

/**
 * Interface for Template model instance methods and static methods
 * Extends both ITemplate interface and Mongoose Document
 */
interface ITemplateModel extends Model<ITemplate & Document> {
  findByOrganization(organizationId: ObjectId): Promise<ITemplate[]>;
  findActiveTemplates(organizationId: ObjectId, options?: {
    type?: string;
    metadata?: Record<string, any>;
  }): Promise<ITemplate[]>;
  findTemplatesByVersion(organizationId: ObjectId, version: number): Promise<ITemplate[]>;
  findTemplatesByMetadata(organizationId: ObjectId, metadata: Record<string, any>): Promise<ITemplate[]>;
}

/**
 * Static method to find all templates belonging to an organization
 * Includes error handling and validation
 */
TemplateSchema.statics.findByOrganization = async function(
  organizationId: ObjectId
): Promise<ITemplate[]> {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const templates = await this.find({ 
      organizationId,
    }).sort({ updatedAt: -1 });

    return templates;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Error finding templates: ${err.message}`);
  }
};

/**
 * Static method to find active templates for an organization with filtering options
 * Supports filtering by type and metadata criteria
 */
TemplateSchema.statics.findActiveTemplates = async function(
  organizationId: ObjectId,
  options: {
    type?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<ITemplate[]> {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const query: any = {
      organizationId,
      isActive: true
    };

    // Add optional filters if provided
    if (options.type) {
      query.type = options.type;
    }

    if (options.metadata) {
      // Add metadata criteria to query
      Object.entries(options.metadata).forEach(([key, value]) => {
        query[`metadata.${key}`] = value;
      });
    }

    const templates = await this.find(query).sort({ updatedAt: -1 });
    return templates;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Error finding active templates: ${err.message}`);
  }
};

/**
 * Static method to find templates by version number for an organization
 * Useful for tracking template changes and versioning
 */
TemplateSchema.statics.findTemplatesByVersion = async function(
  organizationId: ObjectId,
  version: number
): Promise<ITemplate[]> {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    if (!version || version < 1) {
      throw new Error('Valid version number is required');
    }

    const templates = await this.find({
      organizationId,
      version
    }).sort({ updatedAt: -1 });

    return templates;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Error finding templates by version: ${err.message}`);
  }
};

/**
 * Static method to find templates by metadata criteria for an organization
 * Supports complex metadata filtering for template categorization
 */
TemplateSchema.statics.findTemplatesByMetadata = async function(
  organizationId: ObjectId,
  metadata: Record<string, any>
): Promise<ITemplate[]> {
  try {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    if (!metadata || Object.keys(metadata).length === 0) {
      throw new Error('Metadata criteria is required');
    }

    const query: any = {
      organizationId
    };

    // Build metadata query criteria
    Object.entries(metadata).forEach(([key, value]) => {
      query[`metadata.${key}`] = value;
    });

    const templates = await this.find(query).sort({ updatedAt: -1 });
    return templates;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Error finding templates by metadata: ${err.message}`);
  }
};

// Create and export the Template model with static methods
export const Template = model<ITemplate & Document, ITemplateModel>('Template', TemplateSchema);