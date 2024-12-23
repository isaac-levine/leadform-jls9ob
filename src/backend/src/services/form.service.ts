/**
 * @file form.service.ts
 * @description Service layer implementation for form management operations with enhanced validation,
 * security, and error handling. Implements the business logic for form CRUD operations.
 * @version 1.0.0
 */

import { nanoid } from 'nanoid'; // v3.3.4
import { z } from 'zod'; // v3.22.0
import { Form } from '../db/models/Form';
import { IForm } from '../interfaces/IForm';
import { 
  CreateFormDTO, 
  UpdateFormDTO, 
  FormFieldType,
  MAX_FIELD_COUNT,
  MIN_FIELD_COUNT,
  MAX_LABEL_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  FormValidationError
} from '../types/form.types';
import { OrganizationId } from '../types/organization.types';
import { EMAIL_REGEX, PHONE_REGEX } from '../constants/regex.constants';

/**
 * Service class implementing secure form management business logic
 * with enhanced validation and error handling
 */
export class FormService {
  private readonly formValidator: z.ZodSchema;
  private readonly embedCodeLength: number = 12;

  constructor() {
    // Initialize Zod validator schema for form configuration
    this.formValidator = z.object({
      title: z.string()
        .min(3, 'Title must be at least 3 characters')
        .max(100, 'Title cannot exceed 100 characters'),
      description: z.string()
        .max(MAX_DESCRIPTION_LENGTH)
        .optional(),
      fields: z.array(z.object({
        id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
        type: z.enum(Object.values(FormFieldType) as [string, ...string[]]),
        label: z.string().max(MAX_LABEL_LENGTH),
        required: z.boolean(),
        options: z.array(z.string()).optional(),
        placeholder: z.string().max(100).optional(),
        validationPattern: z.instanceof(RegExp).optional()
      }))
      .min(MIN_FIELD_COUNT)
      .max(MAX_FIELD_COUNT),
      submitButtonText: z.string().max(50),
      successMessage: z.string().max(200)
    });
  }

  /**
   * Creates a new form with validation and secure embed code generation
   * @param formData Form creation data transfer object
   * @returns Promise resolving to created form document
   * @throws {Error} If validation fails or creation error occurs
   */
  async createForm(formData: CreateFormDTO): Promise<IForm> {
    try {
      // Validate form configuration
      const validationResult = this.formValidator.safeParse(formData.config);
      if (!validationResult.success) {
        throw new Error(`Invalid form configuration: ${validationResult.error.message}`);
      }

      // Generate secure embed code
      const embedCode = this.generateEmbedCode();

      // Apply field-specific validation patterns
      const fields = formData.config.fields.map(field => ({
        ...field,
        validationPattern: this.getFieldValidationPattern(field.type)
      }));

      // Create form document with transaction
      const session = await Form.startSession();
      let createdForm: IForm | null = null;

      await session.withTransaction(async () => {
        createdForm = await Form.create([{
          organizationId: formData.organizationId,
          config: {
            ...formData.config,
            fields
          },
          embedCode,
          active: true
        }], { session });
      });

      await session.endSession();

      if (!createdForm) {
        throw new Error('Failed to create form');
      }

      return createdForm;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Retrieves a form by ID with access control
   * @param formId Form identifier
   * @param organizationId Organization context for access control
   * @returns Promise resolving to form document or null
   */
  async getFormById(formId: string, organizationId: OrganizationId): Promise<IForm | null> {
    try {
      return await Form.findOne({
        _id: formId,
        organizationId
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Retrieves paginated forms for an organization
   * @param organizationId Organization identifier
   * @param options Pagination options
   * @returns Promise resolving to paginated forms and total count
   */
  async getFormsByOrganization(
    organizationId: OrganizationId,
    options: { page: number; limit: number; active?: boolean }
  ): Promise<{ forms: IForm[]; total: number }> {
    try {
      const query = {
        organizationId,
        ...(typeof options.active === 'boolean' ? { active: options.active } : {})
      };

      const [forms, total] = await Promise.all([
        Form.find(query)
          .skip((options.page - 1) * options.limit)
          .limit(options.limit)
          .sort({ createdAt: -1 }),
        Form.countDocuments(query)
      ]);

      return { forms, total };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Updates form with validation and access control
   * @param formId Form identifier
   * @param updateData Form update data
   * @param organizationId Organization context for access control
   * @returns Promise resolving to updated form or null
   */
  async updateForm(
    formId: string,
    updateData: UpdateFormDTO,
    organizationId: OrganizationId
  ): Promise<IForm | null> {
    try {
      // Validate update data if config is included
      if (updateData.config) {
        const validationResult = this.formValidator.safeParse(updateData.config);
        if (!validationResult.success) {
          throw new Error(`Invalid form configuration: ${validationResult.error.message}`);
        }
      }

      // Update form with transaction
      const session = await Form.startSession();
      let updatedForm: IForm | null = null;

      await session.withTransaction(async () => {
        updatedForm = await Form.findOneAndUpdate(
          { _id: formId, organizationId },
          { $set: updateData },
          { new: true, runValidators: true, session }
        );
      });

      await session.endSession();
      return updatedForm;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Deletes form with cascade and access control
   * @param formId Form identifier
   * @param organizationId Organization context for access control
   * @returns Promise resolving to deletion success status
   */
  async deleteForm(formId: string, organizationId: OrganizationId): Promise<boolean> {
    try {
      const session = await Form.startSession();
      let success = false;

      await session.withTransaction(async () => {
        const result = await Form.deleteOne(
          { _id: formId, organizationId },
          { session }
        );
        success = result.deletedCount === 1;
      });

      await session.endSession();
      return success;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Retrieves active form by embed code
   * @param embedCode Form embed code
   * @returns Promise resolving to form document or null
   */
  async getFormByEmbedCode(embedCode: string): Promise<IForm | null> {
    try {
      return await Form.findOne({
        embedCode,
        active: true
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generates a secure and unique embed code
   * @private
   * @returns Generated embed code string
   */
  private generateEmbedCode(): string {
    const code = nanoid(this.embedCodeLength);
    return `<div data-form-id="${code}"></div>`;
  }

  /**
   * Gets appropriate validation pattern for field type
   * @private
   * @param fieldType Form field type
   * @returns RegExp validation pattern or undefined
   */
  private getFieldValidationPattern(fieldType: FormFieldType): RegExp | undefined {
    switch (fieldType) {
      case FormFieldType.EMAIL:
        return EMAIL_REGEX;
      case FormFieldType.PHONE:
        return PHONE_REGEX;
      default:
        return undefined;
    }
  }

  /**
   * Handles and transforms service errors
   * @private
   * @param error Original error
   * @returns Transformed error with appropriate message
   */
  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      // Handle specific error types and add context
      if (error.name === 'ValidationError') {
        return new Error(`Form validation failed: ${error.message}`);
      }
      if (error.name === 'MongoError' && (error as any).code === 11000) {
        return new Error('Duplicate embed code detected');
      }
      return error;
    }
    return new Error('An unexpected error occurred');
  }
}