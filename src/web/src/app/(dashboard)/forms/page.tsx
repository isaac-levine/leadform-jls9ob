'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { FormBuilder } from '@/components/forms/FormBuilder';
import { useForm } from '@/hooks/useForm';
import { Button } from '@/components/ui/button';
import { FormState } from '@/types/form.types';

/**
 * Forms dashboard page component for managing lead capture forms
 * Implements form listing, creation, and management capabilities
 */
const FormsPage: React.FC = () => {
  // Router for navigation
  const router = useRouter();

  // Form management hook
  const { form, loading, errors } = useForm();

  // Local state for form grid loading states
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  /**
   * Handles navigation to form creation page
   */
  const handleCreateForm = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, create: true }));
      await router.push('/forms/new');
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, create: false }));
    }
  }, [router]);

  /**
   * Handles navigation to form details/edit page
   */
  const handleFormClick = useCallback(async (formId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, [formId]: true }));
      await router.push(`/forms/${formId}`);
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [formId]: false }));
    }
  }, [router]);

  /**
   * Renders form card with loading and error states
   */
  const renderFormCard = (form: FormState) => {
    const isLoading = loadingStates[form.id.toString()];

    return (
      <div
        key={form.id.toString()}
        className={clsx(
          'bg-white rounded-lg shadow-sm p-6',
          'hover:shadow-md transition-shadow duration-200',
          'focus-visible:ring-2 focus-visible:ring-primary-500',
          'cursor-pointer'
        )}
        onClick={() => handleFormClick(form.id.toString())}
        onKeyDown={(e) => e.key === 'Enter' && handleFormClick(form.id.toString())}
        role="button"
        tabIndex={0}
        aria-busy={isLoading}
      >
        {/* Form Title */}
        <h3 className="text-lg font-semibold mb-2 text-gray-900">
          {form.config.title}
        </h3>

        {/* Form Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {form.config.description}
        </p>

        {/* Form Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{form.config.fields.length} fields</span>
          <span>{form.active ? 'Active' : 'Inactive'}</span>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div 
            className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 focus-visible:outline-none">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Capture Forms</h1>
          <p className="text-gray-600 mt-1">
            Create and manage your lead capture forms
          </p>
        </div>

        <Button
          variant="primary"
          size="medium"
          onClick={handleCreateForm}
          loading={loadingStates.create}
          aria-label="Create new form"
        >
          Create Form
        </Button>
      </div>

      {/* Error Display */}
      {errors && Object.keys(errors).length > 0 && (
        <div 
          className="bg-error-50 text-error-500 p-4 rounded-lg mb-6"
          role="alert"
        >
          <h2 className="font-semibold">Error Loading Forms</h2>
          <ul className="list-disc list-inside">
            {Object.entries(errors).map(([key, messages]) => (
              <li key={key}>{messages.join(', ')}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Forms Grid */}
      {loading ? (
        // Loading State
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="bg-gray-100 rounded-lg h-48 animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : form?.config.fields.length === 0 ? (
        // Empty State
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Forms Created Yet
          </h2>
          <p className="text-gray-600 mb-6">
            Get started by creating your first lead capture form
          </p>
          <Button
            variant="primary"
            size="medium"
            onClick={handleCreateForm}
            loading={loadingStates.create}
          >
            Create Your First Form
          </Button>
        </div>
      ) : (
        // Forms Grid
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          role="grid"
          aria-label="Forms list"
        >
          {form?.config.fields.map(renderFormCard)}
        </div>
      )}
    </div>
  );
};

export default FormsPage;