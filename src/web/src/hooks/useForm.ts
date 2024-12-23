/**
 * @file Custom React hook for managing form state and operations
 * @version 1.0.0
 * @description Provides comprehensive form management with validation, optimistic updates,
 * and error handling for the form builder interface
 */

import { useState, useCallback, useEffect } from 'react'; // v18.0.0
import { z } from 'zod'; // v3.0.0
import { FormState, FormField, FormFieldType, isFormConfig } from '../types/form.types';
import { useFormStore } from '../store/form.store';
import { createDefaultField, validateFormConfig } from '../utils/form.utils';
import { getForms } from '../lib/api';

/**
 * Interface for field-level validation errors
 */
interface FieldErrors {
  [fieldId: string]: string[];
}

/**
 * Interface for form validation state
 */
interface ValidationState {
  isValid: boolean;
  errors: FieldErrors;
  lastValidated: Date | null;
}

/**
 * Custom hook for managing form state and operations
 * @param formId - Optional form ID to load existing form
 * @returns Form management interface with validation and error handling
 */
export const useForm = (formId?: string) => {
  // Local state for loading and validation
  const [loading, setLoading] = useState<boolean>(false);
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    errors: {},
    lastValidated: null
  });

  // Get form state and actions from global store
  const { form, setForm, optimisticUpdate } = useFormStore();

  /**
   * Loads form data from API with error handling
   */
  const loadForm = useCallback(async () => {
    if (!formId) return;

    setLoading(true);
    try {
      const forms = await getForms(formId);
      const loadedForm = forms.find(f => f.id.toString() === formId);
      
      if (!loadedForm) {
        throw new Error('Form not found');
      }

      // Validate loaded form
      const validation = validateFormConfig(loadedForm.config);
      setValidationState({
        isValid: validation.isValid,
        errors: validation.errors,
        lastValidated: new Date()
      });

      setForm(loadedForm);
    } catch (error) {
      setValidationState(prev => ({
        ...prev,
        isValid: false,
        errors: { form: [(error as Error).message] }
      }));
    } finally {
      setLoading(false);
    }
  }, [formId, setForm]);

  /**
   * Adds a new field to the form with validation
   * @param type - Type of field to add
   * @param validation - Validation rules for the field
   */
  const addField = useCallback((type: FormFieldType, validation?: z.ZodSchema) => {
    if (!form) return;

    const newField = createDefaultField(type);
    if (validation) {
      newField.validation = {
        ...newField.validation,
        schema: validation
      };
    }

    // Optimistic update
    optimisticUpdate({
      type: 'ADD_FIELD',
      field: newField,
      timestamp: Date.now()
    });

    // Validate updated form
    const updatedFields = [...form.config.fields, newField];
    const validation = validateFormConfig({
      ...form.config,
      fields: updatedFields
    });

    setValidationState({
      isValid: validation.isValid,
      errors: validation.errors,
      lastValidated: new Date()
    });
  }, [form, optimisticUpdate]);

  /**
   * Updates an existing form field with validation
   * @param fieldId - ID of field to update
   * @param updates - Field updates to apply
   */
  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    if (!form) return;

    const fieldIndex = form.config.fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) return;

    // Optimistic update
    optimisticUpdate({
      type: 'UPDATE_FIELD',
      fieldId,
      updates,
      timestamp: Date.now()
    });

    // Validate updated field
    const updatedFields = [...form.config.fields];
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      ...updates
    };

    const validation = validateFormConfig({
      ...form.config,
      fields: updatedFields
    });

    setValidationState({
      isValid: validation.isValid,
      errors: validation.errors,
      lastValidated: new Date()
    });
  }, [form, optimisticUpdate]);

  /**
   * Removes a field from the form with validation
   * @param fieldId - ID of field to remove
   */
  const removeField = useCallback((fieldId: string) => {
    if (!form) return;

    // Optimistic update
    optimisticUpdate({
      type: 'REMOVE_FIELD',
      fieldId,
      timestamp: Date.now()
    });

    // Validate updated form
    const updatedFields = form.config.fields.filter(f => f.id !== fieldId);
    const validation = validateFormConfig({
      ...form.config,
      fields: updatedFields
    });

    setValidationState({
      isValid: validation.isValid,
      errors: validation.errors,
      lastValidated: new Date()
    });
  }, [form, optimisticUpdate]);

  /**
   * Validates the entire form configuration
   * @returns Validation result with detailed error information
   */
  const validateForm = useCallback(() => {
    if (!form) {
      return {
        isValid: false,
        errors: { form: ['No form loaded'] }
      };
    }

    const validation = validateFormConfig(form.config);
    setValidationState({
      isValid: validation.isValid,
      errors: validation.errors,
      lastValidated: new Date()
    });

    return validation;
  }, [form]);

  // Load form data on mount or formId change
  useEffect(() => {
    if (formId) {
      loadForm();
    }
  }, [formId, loadForm]);

  return {
    form,
    loading,
    isValid: validationState.isValid,
    errors: validationState.errors,
    lastValidated: validationState.lastValidated,
    addField,
    updateField,
    removeField,
    validateForm
  };
};

export type { FieldErrors, ValidationState };