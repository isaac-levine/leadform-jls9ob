'use client';

/**
 * @file New form creation page component with form builder and live preview
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast'; // v2.4.1
import { useAutoSave } from 'use-autosave'; // v3.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0

import FormBuilder from '../../../components/forms/FormBuilder';
import FormPreview from '../../../components/forms/FormPreview';
import { useForm } from '../../../hooks/useForm';
import { Button } from '../../../components/ui/button';
import { FormState, FormFieldType } from '../../../types/form.types';

/**
 * Error fallback component for form builder errors
 */
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary
}) => (
  <div className="p-6 bg-error-50 rounded-lg">
    <h3 className="text-lg font-semibold text-error-700">Something went wrong</h3>
    <p className="mt-2 text-error-600">{error.message}</p>
    <Button
      variant="outline"
      size="small"
      onClick={resetErrorBoundary}
      className="mt-4"
    >
      Try again
    </Button>
  </div>
);

/**
 * New form page component that implements form builder interface
 * with live preview and autosave functionality
 */
const NewFormPage: React.FC = () => {
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form state with default configuration
  const {
    form,
    loading,
    isValid,
    errors,
    addField,
    updateField,
    removeField,
    validateForm
  } = useForm();

  /**
   * Handles form saving with validation and error handling
   */
  const handleSave = useCallback(async () => {
    if (!form || !isValid) return;

    setIsSaving(true);
    try {
      // Validate form before saving
      const validation = validateForm();
      if (!validation.isValid) {
        throw new Error('Form validation failed');
      }

      // Save form implementation would go here
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Form saved successfully');
      router.push('/forms');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save form');
    } finally {
      setIsSaving(false);
    }
  }, [form, isValid, validateForm, router]);

  /**
   * Autosave configuration with debouncing
   */
  useAutoSave({
    data: form,
    onSave: async (data) => {
      if (!data || !isValid) return;
      try {
        // Autosave implementation would go here
        // For now, just show toast
        toast.success('Form autosaved', { duration: 2000 });
      } catch (error) {
        toast.error('Autosave failed');
      }
    },
    interval: 30000, // 30 seconds
    saveOnUnmount: true
  });

  /**
   * Handles preview mode toggle
   */
  const handlePreviewToggle = useCallback(() => {
    setShowPreview(prev => !prev);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Create New Form
            </h1>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handlePreviewToggle}
                disabled={!isValid}
              >
                {showPreview ? 'Edit Form' : 'Preview'}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!isValid || isSaving}
                loading={isSaving}
              >
                Save Form
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
        >
          <div className="flex gap-8">
            {/* Form Builder */}
            <div className={`flex-1 ${showPreview ? 'hidden md:block' : ''}`}>
              <FormBuilder
                onSave={handleSave}
                onPreview={handlePreviewToggle}
                className="bg-white dark:bg-gray-800 rounded-lg shadow"
              />
            </div>

            {/* Form Preview */}
            {(showPreview || window.innerWidth >= 768) && (
              <div className={`${showPreview ? 'w-full md:w-1/2' : 'hidden md:block md:w-1/3'}`}>
                <FormPreview
                  className="sticky top-24"
                  onValidationChange={(isValid) => {
                    if (!isValid) {
                      toast.error('Form has validation errors');
                    }
                  }}
                />
              </div>
            )}
          </div>
        </ErrorBoundary>

        {/* Validation Errors */}
        {!isValid && Object.keys(errors).length > 0 && (
          <div className="mt-8 p-4 bg-error-50 dark:bg-error-900 rounded-lg">
            <h3 className="text-lg font-semibold text-error-700 dark:text-error-200">
              Form Validation Errors
            </h3>
            <ul className="mt-2 list-disc list-inside text-error-600 dark:text-error-300">
              {Object.entries(errors).map(([key, messages]) => (
                <li key={key}>
                  {Array.isArray(messages) ? messages.join(', ') : messages}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewFormPage;