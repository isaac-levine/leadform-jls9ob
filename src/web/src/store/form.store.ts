// Zustand v4.4.0
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  FormState, 
  FormField, 
  FormFieldType,
  FormFieldValidation,
  MAX_FIELD_COUNT,
  MIN_FIELD_COUNT,
  MAX_LABEL_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  isFormField,
  isFormConfig
} from '../types/form.types';

/**
 * Constants for form store configuration
 */
const STORE_NAME = 'form-store';
const MAX_OPTIMISTIC_UPDATES = 50;

/**
 * Interface defining the form store state and actions
 */
interface FormStore {
  // State
  form: FormState | null;
  loading: boolean;
  error: string | null;
  selectedFieldId: string | null;
  isValid: boolean;
  validationErrors: Record<string, string[]>;
  optimisticUpdates: Map<string, any>;

  // Actions
  setForm: (form: FormState | null) => void;
  addField: (field: FormField) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  removeField: (fieldId: string) => void;
  reorderFields: (sourceIndex: number, destinationIndex: number) => void;
  setSelectedField: (fieldId: string | null) => void;
  validateForm: (form: FormState) => boolean;
  clearErrors: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Validation helper functions
 */
const validateFieldLabel = (label: string): string[] => {
  const errors: string[] = [];
  if (!label) errors.push('Field label is required');
  if (label.length > MAX_LABEL_LENGTH) errors.push(`Label must be ${MAX_LABEL_LENGTH} characters or less`);
  return errors;
};

const validateFieldValidation = (validation: FormFieldValidation): string[] => {
  const errors: string[] = [];
  if (validation.minLength && validation.maxLength && validation.minLength > validation.maxLength) {
    errors.push('Minimum length cannot be greater than maximum length');
  }
  if (validation.pattern && !isValidRegex(validation.pattern)) {
    errors.push('Invalid validation pattern');
  }
  return errors;
};

const isValidRegex = (pattern: string): boolean => {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
};

/**
 * Create the form store with Zustand, using immer for immutable updates
 * and devtools for Redux DevTools integration
 */
export const useFormStore = create<FormStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      form: null,
      loading: false,
      error: null,
      selectedFieldId: null,
      isValid: true,
      validationErrors: {},
      optimisticUpdates: new Map(),

      // Actions
      setForm: (form) => set((state) => {
        state.form = form;
        state.selectedFieldId = null;
        state.error = null;
        if (form) {
          state.isValid = get().validateForm(form);
        }
      }),

      addField: (field) => set((state) => {
        if (!state.form) return;

        // Validate field count
        if (state.form.config.fields.length >= MAX_FIELD_COUNT) {
          state.error = `Maximum of ${MAX_FIELD_COUNT} fields allowed`;
          return;
        }

        // Validate field structure
        if (!isFormField(field)) {
          state.error = 'Invalid field structure';
          return;
        }

        // Create optimistic update
        const updateId = Date.now().toString();
        state.optimisticUpdates.set(updateId, {
          type: 'ADD_FIELD',
          field,
          timestamp: Date.now()
        });

        // Update form
        state.form.config.fields.push(field);
        state.selectedFieldId = field.id;
        state.isValid = get().validateForm(state.form);

        // Cleanup old optimistic updates
        if (state.optimisticUpdates.size > MAX_OPTIMISTIC_UPDATES) {
          const oldestKey = Array.from(state.optimisticUpdates.keys())[0];
          state.optimisticUpdates.delete(oldestKey);
        }
      }),

      updateField: (fieldId, updates) => set((state) => {
        if (!state.form) return;

        const fieldIndex = state.form.config.fields.findIndex(f => f.id === fieldId);
        if (fieldIndex === -1) {
          state.error = 'Field not found';
          return;
        }

        // Create optimistic update
        const updateId = Date.now().toString();
        state.optimisticUpdates.set(updateId, {
          type: 'UPDATE_FIELD',
          fieldId,
          updates,
          timestamp: Date.now()
        });

        // Update field
        const updatedField = {
          ...state.form.config.fields[fieldIndex],
          ...updates
        };

        if (!isFormField(updatedField)) {
          state.error = 'Invalid field update';
          return;
        }

        state.form.config.fields[fieldIndex] = updatedField;
        state.isValid = get().validateForm(state.form);
      }),

      removeField: (fieldId) => set((state) => {
        if (!state.form) return;

        // Validate minimum field count
        if (state.form.config.fields.length <= MIN_FIELD_COUNT) {
          state.error = `Minimum of ${MIN_FIELD_COUNT} field required`;
          return;
        }

        // Create optimistic update
        const updateId = Date.now().toString();
        state.optimisticUpdates.set(updateId, {
          type: 'REMOVE_FIELD',
          fieldId,
          timestamp: Date.now()
        });

        // Update form
        state.form.config.fields = state.form.config.fields.filter(f => f.id !== fieldId);
        if (state.selectedFieldId === fieldId) {
          state.selectedFieldId = null;
        }
        state.isValid = get().validateForm(state.form);
      }),

      reorderFields: (sourceIndex, destinationIndex) => set((state) => {
        if (!state.form) return;

        // Validate indices
        if (
          sourceIndex < 0 || 
          sourceIndex >= state.form.config.fields.length ||
          destinationIndex < 0 || 
          destinationIndex >= state.form.config.fields.length
        ) {
          state.error = 'Invalid field position';
          return;
        }

        // Create optimistic update
        const updateId = Date.now().toString();
        state.optimisticUpdates.set(updateId, {
          type: 'REORDER_FIELDS',
          sourceIndex,
          destinationIndex,
          timestamp: Date.now()
        });

        // Reorder fields
        const fields = [...state.form.config.fields];
        const [removed] = fields.splice(sourceIndex, 1);
        fields.splice(destinationIndex, 0, removed);
        state.form.config.fields = fields;
      }),

      setSelectedField: (fieldId) => set((state) => {
        state.selectedFieldId = fieldId;
      }),

      validateForm: (form) => {
        const errors: Record<string, string[]> = {};
        let isValid = true;

        // Validate form configuration
        if (!isFormConfig(form.config)) {
          errors.form = ['Invalid form configuration'];
          isValid = false;
        }

        // Validate field count
        if (form.config.fields.length < MIN_FIELD_COUNT || form.config.fields.length > MAX_FIELD_COUNT) {
          errors.fields = [`Form must have between ${MIN_FIELD_COUNT} and ${MAX_FIELD_COUNT} fields`];
          isValid = false;
        }

        // Validate each field
        form.config.fields.forEach((field, index) => {
          const fieldErrors: string[] = [];

          // Validate label
          fieldErrors.push(...validateFieldLabel(field.label));

          // Validate field type
          if (!Object.values(FormFieldType).includes(field.type)) {
            fieldErrors.push('Invalid field type');
          }

          // Validate field validation rules
          fieldErrors.push(...validateFieldValidation(field.validation));

          if (fieldErrors.length > 0) {
            errors[`field-${index}`] = fieldErrors;
            isValid = false;
          }
        });

        // Update store with validation results
        set((state) => {
          state.validationErrors = errors;
          state.isValid = isValid;
        });

        return isValid;
      },

      clearErrors: () => set((state) => {
        state.error = null;
        state.validationErrors = {};
      }),

      setLoading: (loading) => set((state) => {
        state.loading = loading;
      }),

      setError: (error) => set((state) => {
        state.error = error;
      })
    })),
    {
      name: STORE_NAME
    }
  )
);

export default useFormStore;