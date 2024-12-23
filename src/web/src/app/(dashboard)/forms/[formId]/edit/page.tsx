'use client';

import React, { useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@acetunity/ui';
import FormBuilder from '@/components/forms/FormBuilder';
import { useForm } from '@/hooks/useForm';
import { useToast } from '@/hooks/useToast';
import { FormState } from '@/types/form.types';

/**
 * Form Edit Page Component
 * Provides a drag-and-drop interface for editing lead capture forms with
 * real-time validation and preview capabilities.
 */
const FormEditPage: React.FC = () => {
  // Get form ID from URL params
  const params = useParams();
  const formId = params.formId as string;

  // Initialize hooks
  const {
    form,
    loading,
    isValid,
    errors,
    validateForm
  } = useForm(formId);

  const toast = useToast();

  /**
   * Handles saving form changes with validation
   */
  const handleSave = useCallback(async (updatedForm: FormState) => {
    try {
      // Validate form before saving
      const validation = validateForm();
      if (!validation.isValid) {
        const errorMessage = Object.values(validation.errors)
          .flat()
          .join(', ');
        throw new Error(errorMessage);
      }

      // Save form changes
      await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedForm)
      });

      // Show success message
      toast.show({
        type: 'success',
        message: 'Form saved successfully',
        duration: 3000
      });
    } catch (error) {
      // Show error message
      toast.show({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save form',
        duration: 5000
      });
    }
  }, [formId, validateForm, toast]);

  /**
   * Handles form preview
   */
  const handlePreview = useCallback((form: FormState) => {
    // Store current form state in session storage for preview
    sessionStorage.setItem('form-preview', JSON.stringify(form));
    // Navigate to preview page
    window.open(`/forms/${formId}/preview`, '_blank');
  }, [formId]);

  // Show loading state
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading form...</p>
        </div>
      </div>
    );
  }

  // Show error state if form not found
  if (!form) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 min-h-screen">
        <div className="bg-error-50 dark:bg-error-900/50 text-error-500 dark:text-error-400 p-4 rounded-md">
          Form not found or you don't have permission to edit it.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Edit Form
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Customize your lead capture form using drag and drop
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handlePreview(form)}
            disabled={!isValid}
            aria-label="Preview form in new window"
          >
            Preview
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave(form)}
            disabled={!isValid}
            aria-label="Save form changes"
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {!isValid && Object.keys(errors).length > 0 && (
        <div 
          className="mb-6 bg-error-50 dark:bg-error-900/50 text-error-500 dark:text-error-400 p-4 rounded-md"
          role="alert"
        >
          <h2 className="text-sm font-medium">Please fix the following errors:</h2>
          <ul className="mt-2 list-disc list-inside">
            {Object.entries(errors).map(([field, messages]) => (
              <li key={field}>
                {field}: {Array.isArray(messages) ? messages.join(', ') : messages}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form Builder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <FormBuilder
          onSave={handleSave}
          onPreview={handlePreview}
          initialData={form}
          className="min-h-[600px]"
        />
      </div>
    </div>
  );
};

export default FormEditPage;