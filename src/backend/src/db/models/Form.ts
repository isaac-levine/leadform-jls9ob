/**
 * @file Form.ts
 * @description Mongoose model definition for Form documents with type-safe operations
 * and comprehensive validation. Implements the IForm interface and uses FormSchema.
 * @version 1.0.0
 */

import { model, Model } from 'mongoose'; // v7.0.0
import { IForm } from '../../interfaces/IForm';
import { FormSchema } from '../schemas/form.schema';

/**
 * Type guard to check if a model already exists in Mongoose registry
 * Prevents model recompilation errors in development with hot reload
 * 
 * @param modelName - Name of the model to check
 * @returns boolean indicating if model exists
 */
const isModelDefined = (modelName: string): boolean => {
  try {
    return !!model(modelName);
  } catch (error) {
    return false;
  }
};

/**
 * Form model for MongoDB 'forms' collection.
 * Provides type-safe access to form documents with comprehensive validation.
 * 
 * Key Features:
 * - Strong typing with IForm interface
 * - Comprehensive validation via FormSchema
 * - Optimized indexes for common queries
 * - Multi-tenant support through organizationId
 * 
 * @example
 * // Create a new form
 * const form = await Form.create({
 *   organizationId: new ObjectId(),
 *   config: { ... },
 *   embedCode: '<div>...</div>',
 *   active: true
 * });
 * 
 * // Find active forms for an organization
 * const forms = await Form.find({
 *   organizationId,
 *   active: true
 * }).sort({ createdAt: -1 });
 */
const Form: Model<IForm> = isModelDefined('Form') 
  ? model<IForm>('Form')
  : model<IForm>('Form', FormSchema);

// Add static methods for common operations
/**
 * Finds all active forms for a given organization
 * @param organizationId - ID of the organization
 * @returns Promise resolving to array of active forms
 */
Form.static('findActiveByOrganization', function(organizationId: string) {
  return this.find({ 
    organizationId, 
    active: true 
  }).sort({ createdAt: -1 });
});

/**
 * Finds a form by its embed code with type safety
 * @param embedCode - Unique embed code to search for
 * @returns Promise resolving to form document or null
 */
Form.static('findByEmbedCode', function(embedCode: string) {
  return this.findOne({ embedCode });
});

/**
 * Safely deactivates a form while maintaining referential integrity
 * @param formId - ID of the form to deactivate
 * @returns Promise resolving to updated form document
 */
Form.static('safeDeactivate', async function(formId: string) {
  return this.findByIdAndUpdate(
    formId,
    { active: false },
    { 
      new: true,
      runValidators: true 
    }
  );
});

// Export the Form model as the default export
export default Form;

// Also export as a named export for flexibility
export { Form };

/**
 * @security
 * - Model enforces strict schema validation
 * - Immutable fields prevent unauthorized modifications
 * - Indexes support efficient querying patterns
 * - Multi-tenant isolation through organizationId
 * 
 * @performance
 * - Optimized indexes for common query patterns
 * - Compound indexes for organization-based queries
 * - Efficient text search capabilities
 * 
 * @maintainability
 * - Type-safe operations with TypeScript
 * - Comprehensive JSDoc documentation
 * - Clear separation of concerns
 * - Static helper methods for common operations
 */