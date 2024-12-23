'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { debounce } from 'lodash'; // v4.17.21
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shadcn/ui'; // latest
import FormBuilder from '@/components/forms/FormBuilder';
import FormPreview from '@/components/forms/FormPreview';
import { useForm } from '@/hooks/useForm';
import { FormState } from '@/types/form.types';

/**
 * Generates dynamic metadata for the form editing page
 * @param params - Route parameters containing formId
 */
export const generateMetadata = async ({ params }: { params: { formId: string } }) => {
  return {
    title: `Edit Form - ${params.formId}`,
    description: 'Form builder and preview interface for lead capture form customization',
  };
};

/**
 * Form editing page component with real-time preview
 * Implements form builder requirements from technical specification
 */
const FormPage: React.FC<{ params: { formId: string } }> = ({ params }) => {
  // Initialize form state with useForm hook
  const { form, loading, error, updateForm } = useForm(params.formId);
  
  // Local state for active tab
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  /**
   * Debounced form update handler to prevent excessive API calls
   */
  const debouncedUpdate = useCallback(
    debounce((updatedForm: FormState) => {
      updateForm(updatedForm);
    }, 500),
    [updateForm]
  );

  /**
   * Handles form changes with validation and preview sync
   */
  const handleFormChange = useCallback((updatedForm: FormState) => {
    debouncedUpdate(updatedForm);
  }, [debouncedUpdate]);

  /**
   * Handles preview tab activation with validation
   */
  const handlePreviewClick = useCallback(() => {
    setActiveTab('preview');
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <div 
          className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-md"
          role="alert"
        >
          <p className="font-medium">Error loading form</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Show 404 state
  if (!form) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Form Not Found</h2>
          <p className="mt-2 text-gray-600">The requested form could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {form.config.title || 'Untitled Form'}
        </h1>
      </div>

      {/* Tabbed Interface */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger 
            value="edit"
            className="text-sm font-medium"
          >
            Form Builder
          </TabsTrigger>
          <TabsTrigger 
            value="preview"
            className="text-sm font-medium"
            onClick={handlePreviewClick}
          >
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent 
          value="edit"
          className="border rounded-lg shadow-sm bg-white"
        >
          <FormBuilder
            onSave={handleFormChange}
            onPreview={() => setActiveTab('preview')}
            initialData={form}
            className="p-4 md:p-6"
          />
        </TabsContent>

        <TabsContent 
          value="preview"
          className="border rounded-lg shadow-sm bg-white"
        >
          <FormPreview
            formId={params.formId}
            className="p-4 md:p-6"
            onValidationChange={(isValid) => {
              // Handle validation state changes
              console.log('Form validation state:', isValid);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FormPage;