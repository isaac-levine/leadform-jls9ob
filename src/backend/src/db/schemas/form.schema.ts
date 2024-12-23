/**
 * @file form.schema.ts
 * @description MongoDB schema definition for form documents with comprehensive validation
 * and security measures. Implements IForm interface and enforces data integrity rules.
 * @version 1.0.0
 */

import { Schema, SchemaTypes } from 'mongoose'; // v7.0.0
import { IForm } from '../../interfaces/IForm';
import { 
  FormFieldType, 
  MAX_FIELD_COUNT, 
  MIN_FIELD_COUNT,
  MAX_LABEL_LENGTH,
  MAX_DESCRIPTION_LENGTH
} from '../../types/form.types';

/**
 * Validates the form field configuration ensuring count limits and field integrity
 * @param config The form configuration to validate
 * @returns boolean indicating if the configuration is valid
 */
const validateFieldCount = (config: any): boolean => {
  if (!config.fields || !Array.isArray(config.fields)) {
    return false;
  }

  const fieldCount = config.fields.length;
  if (fieldCount < MIN_FIELD_COUNT || fieldCount > MAX_FIELD_COUNT) {
    return false;
  }

  // Validate each field's configuration
  return config.fields.every((field: any) => {
    // Validate options array for fields that require it
    if ([FormFieldType.SELECT, FormFieldType.RADIO, FormFieldType.CHECKBOX].includes(field.type)) {
      return Array.isArray(field.options) && field.options.length > 0;
    }
    return true;
  });
};

/**
 * MongoDB schema for form documents with enhanced validation and indexing
 */
export const FormSchema = new Schema<IForm>(
  {
    organizationId: {
      type: SchemaTypes.ObjectId,
      required: [true, 'Organization ID is required'],
      ref: 'Organization',
      index: true,
      immutable: true
    },
    config: {
      type: {
        title: {
          type: String,
          required: [true, 'Form title is required'],
          trim: true,
          maxlength: [100, 'Title cannot exceed 100 characters'],
          minlength: [3, 'Title must be at least 3 characters']
        },
        description: {
          type: String,
          required: false,
          trim: true,
          maxlength: [MAX_DESCRIPTION_LENGTH, `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`]
        },
        fields: {
          type: [{
            id: {
              type: String,
              required: [true, 'Field ID is required'],
              validate: {
                validator: function(v: string) {
                  return /^[a-zA-Z0-9-_]+$/.test(v);
                },
                message: 'Field ID must contain only letters, numbers, hyphens, and underscores'
              }
            },
            type: {
              type: String,
              enum: {
                values: Object.values(FormFieldType),
                message: 'Invalid field type'
              },
              required: [true, 'Field type is required']
            },
            label: {
              type: String,
              required: [true, 'Field label is required'],
              trim: true,
              maxlength: [MAX_LABEL_LENGTH, `Label cannot exceed ${MAX_LABEL_LENGTH} characters`]
            },
            required: {
              type: Boolean,
              default: false
            },
            options: {
              type: [String],
              validate: {
                validator: function(v: string[]) {
                  const fieldType = (this as any).type;
                  if ([FormFieldType.SELECT, FormFieldType.RADIO, FormFieldType.CHECKBOX].includes(fieldType)) {
                    return Array.isArray(v) && v.length > 0;
                  }
                  return true;
                },
                message: 'Options are required for select, radio, and checkbox fields'
              }
            },
            placeholder: {
              type: String,
              trim: true,
              maxlength: [100, 'Placeholder cannot exceed 100 characters']
            }
          }],
          validate: [
            {
              validator: validateFieldCount,
              message: `Form must have between ${MIN_FIELD_COUNT} and ${MAX_FIELD_COUNT} fields`
            }
          ]
        },
        submitButtonText: {
          type: String,
          required: [true, 'Submit button text is required'],
          trim: true,
          maxlength: [50, 'Submit button text cannot exceed 50 characters'],
          default: 'Submit'
        },
        successMessage: {
          type: String,
          required: [true, 'Success message is required'],
          trim: true,
          maxlength: [200, 'Success message cannot exceed 200 characters'],
          default: 'Thank you for your submission!'
        }
      },
      required: [true, 'Form configuration is required']
    },
    embedCode: {
      type: String,
      required: [true, 'Embed code is required'],
      unique: true,
      immutable: true,
      validate: {
        validator: function(v: string) {
          return v.includes('<div') && v.includes('</div>');
        },
        message: 'Invalid embed code format'
      }
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    schemaVersion: {
      type: Number,
      default: 1,
      required: true,
      min: 1
    }
  },
  {
    timestamps: true,
    collection: 'forms',
    optimisticConcurrency: true,
    strict: 'throw'
  }
);

// Create compound indexes for common queries
FormSchema.index({ organizationId: 1, active: 1 });
FormSchema.index({ createdAt: 1 });
FormSchema.index({ 'config.title': 'text' });

// Add pre-save middleware for additional validation
FormSchema.pre('save', function(next) {
  // Ensure at least one required field exists
  if (this.config.fields.every(field => !field.required)) {
    next(new Error('Form must have at least one required field'));
  }
  next();
});

// Add virtual for field count
FormSchema.virtual('fieldCount').get(function() {
  return this.config.fields.length;
});

// Ensure virtuals are included in JSON serialization
FormSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function(doc, ret) {
    delete ret._id;
    return ret;
  }
});