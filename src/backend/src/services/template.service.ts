// mongodb v5.0.0
import { ObjectId } from 'mongodb';
import { ITemplate, CreateTemplateDTO, UpdateTemplateDTO } from '../../interfaces/ITemplate';
import { Template } from '../../db/models/Template';
import { AppError, createValidationError, createNotFoundError } from '../../utils/error.utils';
import { ERROR_CODES, ERROR_MESSAGES } from '../../constants/error.constants';
import { MessageType } from '../../types/message.types';

/**
 * Service class for managing message templates with enhanced security and caching
 * Implements CRUD operations and template management functionality
 */
export class TemplateService {
  private _templateModel;
  private _cache: Map<string, { data: ITemplate; timestamp: number }>;
  private readonly CACHE_TTL = 300000; // 5 minutes in milliseconds

  constructor() {
    this._templateModel = Template;
    this._cache = new Map();
  }

  /**
   * Creates a new message template with validation and security checks
   * @param templateData Template creation data
   * @param organizationId Organization identifier
   * @returns Created template
   */
  async createTemplate(
    templateData: CreateTemplateDTO,
    organizationId: ObjectId
  ): Promise<ITemplate> {
    try {
      // Validate template data
      if (!templateData.content || !templateData.name) {
        throw createValidationError('Template name and content are required');
      }

      // Validate content length for SMS compatibility
      if (templateData.content.length > 1600) {
        throw createValidationError('Template content exceeds maximum SMS length of 1600 characters');
      }

      // Check for existing template with same name
      const existingTemplate = await this._templateModel.findOne({
        organizationId,
        name: templateData.name
      });

      if (existingTemplate) {
        throw new AppError(
          'Template name already exists',
          409,
          ERROR_CODES.DUPLICATE_RESOURCE,
          true
        );
      }

      // Create template with metadata
      const template = await this._templateModel.create({
        ...templateData,
        organizationId,
        version: 1,
        isActive: true,
        metadata: {
          ...templateData.metadata,
          createdAt: new Date(),
          lastModified: new Date()
        }
      });

      // Update cache
      this._updateCache(template._id.toString(), template);

      return template;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        500,
        ERROR_CODES.INTERNAL_ERROR,
        false
      );
    }
  }

  /**
   * Retrieves a template by ID with security checks
   * @param templateId Template identifier
   * @param organizationId Organization identifier
   * @returns Found template
   */
  async getTemplateById(
    templateId: ObjectId,
    organizationId: ObjectId
  ): Promise<ITemplate> {
    try {
      // Check cache first
      const cached = this._getFromCache(templateId.toString());
      if (cached) return cached;

      const template = await this._templateModel.findOne({
        _id: templateId,
        organizationId
      });

      if (!template) {
        throw createNotFoundError('Template not found');
      }

      // Update cache
      this._updateCache(templateId.toString(), template);

      return template;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        500,
        ERROR_CODES.INTERNAL_ERROR,
        false
      );
    }
  }

  /**
   * Updates an existing template with version control
   * @param templateId Template identifier
   * @param updateData Template update data
   * @param organizationId Organization identifier
   * @returns Updated template
   */
  async updateTemplate(
    templateId: ObjectId,
    updateData: UpdateTemplateDTO,
    organizationId: ObjectId
  ): Promise<ITemplate> {
    try {
      const template = await this._templateModel.findOne({
        _id: templateId,
        organizationId
      });

      if (!template) {
        throw createNotFoundError('Template not found');
      }

      // Validate content length
      if (updateData.content && updateData.content.length > 1600) {
        throw createValidationError('Template content exceeds maximum SMS length');
      }

      // Check version for concurrency control
      if (updateData.version !== template.version) {
        throw new AppError(
          'Template has been modified by another user',
          409,
          ERROR_CODES.CONFLICT,
          true
        );
      }

      // Update template with new version
      const updatedTemplate = await this._templateModel.findOneAndUpdate(
        { _id: templateId, organizationId },
        {
          ...updateData,
          version: template.version + 1,
          'metadata.lastModified': new Date()
        },
        { new: true }
      );

      if (!updatedTemplate) {
        throw new AppError(
          ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          500,
          ERROR_CODES.INTERNAL_ERROR,
          false
        );
      }

      // Invalidate cache
      this._removeFromCache(templateId.toString());

      return updatedTemplate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        500,
        ERROR_CODES.INTERNAL_ERROR,
        false
      );
    }
  }

  /**
   * Soft deletes a template with security verification
   * @param templateId Template identifier
   * @param organizationId Organization identifier
   */
  async deleteTemplate(templateId: ObjectId, organizationId: ObjectId): Promise<void> {
    try {
      const template = await this._templateModel.findOne({
        _id: templateId,
        organizationId
      });

      if (!template) {
        throw createNotFoundError('Template not found');
      }

      // Perform soft delete
      await this._templateModel.findOneAndUpdate(
        { _id: templateId, organizationId },
        {
          isActive: false,
          'metadata.deletedAt': new Date()
        }
      );

      // Remove from cache
      this._removeFromCache(templateId.toString());
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        500,
        ERROR_CODES.INTERNAL_ERROR,
        false
      );
    }
  }

  /**
   * Gets all templates for an organization with pagination
   * @param organizationId Organization identifier
   * @param options Pagination options
   * @returns List of templates
   */
  async getOrganizationTemplates(
    organizationId: ObjectId,
    options: { page?: number; limit?: number; type?: MessageType } = {}
  ): Promise<{ templates: ITemplate[]; total: number }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const query: any = { organizationId };
      if (options.type) {
        query.type = options.type;
      }

      const [templates, total] = await Promise.all([
        this._templateModel.find(query)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit),
        this._templateModel.countDocuments(query)
      ]);

      return { templates, total };
    } catch (error) {
      throw new AppError(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        500,
        ERROR_CODES.INTERNAL_ERROR,
        false
      );
    }
  }

  /**
   * Gets active templates with caching support
   * @param organizationId Organization identifier
   * @returns List of active templates
   */
  async getActiveTemplates(organizationId: ObjectId): Promise<ITemplate[]> {
    try {
      const cacheKey = `active_templates_${organizationId.toString()}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) return Array.isArray(cached) ? cached : [cached];

      const templates = await this._templateModel.findActiveTemplates(organizationId);

      // Update cache
      this._updateCache(cacheKey, templates);

      return templates;
    } catch (error) {
      throw new AppError(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        500,
        ERROR_CODES.INTERNAL_ERROR,
        false
      );
    }
  }

  /**
   * Updates cache with template data
   * @param key Cache key
   * @param data Template data
   */
  private _updateCache(key: string, data: ITemplate | ITemplate[]): void {
    this._cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Retrieves template from cache if not expired
   * @param key Cache key
   * @returns Cached template or null
   */
  private _getFromCache(key: string): ITemplate | ITemplate[] | null {
    const cached = this._cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this._cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Removes template from cache
   * @param key Cache key
   */
  private _removeFromCache(key: string): void {
    this._cache.delete(key);
  }
}