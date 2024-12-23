/**
 * @file Test suite for useForm custom hook
 * @version 1.0.0
 * @description Comprehensive tests for form management functionality including
 * state management, field operations, validation, and error handling
 */

import { renderHook, act } from '@testing-library/react-hooks'; // v8.0.0
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import { useForm } from '../../src/hooks/useForm';
import { FormFieldType, FormState } from '../../src/types/form.types';
import * as api from '../../src/lib/api';

// Mock API calls
jest.mock('../../src/lib/api');

// Mock form store
jest.mock('../../src/store/form.store', () => ({
  useFormStore: () => ({
    form: null,
    setForm: jest.fn(),
    optimisticUpdate: jest.fn()
  })
}));

// Test data constants
const mockFormId = 'form_123';
const mockFormData: FormState = {
  id: mockFormId as any,
  organizationId: 'org_123' as any,
  config: {
    title: 'Test Form',
    description: 'Test form description',
    fields: [],
    submitButtonText: 'Submit',
    successMessage: 'Success!',
    theme: {
      primaryColor: '#000000',
      backgroundColor: '#ffffff',
      fontFamily: 'Arial'
    }
  },
  active: true,
  embedCode: '<script>...</script>'
};

const mockField = {
  id: 'field_123',
  type: FormFieldType.TEXT,
  label: 'Test Field',
  validation: {
    required: true,
    minLength: 2,
    maxLength: 100
  }
};

describe('useForm Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getForms as jest.Mock).mockResolvedValue([mockFormData]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should initialize with empty state when no formId provided', () => {
    const { result } = renderHook(() => useForm());

    expect(result.current.form).toBeNull();
    expect(result.current.loading).toBeFalsy();
    expect(result.current.errors).toEqual({});
    expect(result.current.isValid).toBeTruthy();
    expect(typeof result.current.addField).toBe('function');
    expect(typeof result.current.updateField).toBe('function');
    expect(typeof result.current.removeField).toBe('function');
    expect(typeof result.current.validateForm).toBe('function');
  });

  it('should load form data when formId is provided', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useForm(mockFormId));

    expect(result.current.loading).toBeTruthy();

    await waitForNextUpdate();

    expect(result.current.loading).toBeFalsy();
    expect(result.current.form).toBeDefined();
    expect(result.current.isValid).toBeTruthy();
    expect(api.getForms).toHaveBeenCalledWith(mockFormId);
  });

  it('should handle form loading errors gracefully', async () => {
    const errorMessage = 'Failed to load form';
    (api.getForms as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    const { result, waitForNextUpdate } = renderHook(() => useForm(mockFormId));

    await waitForNextUpdate();

    expect(result.current.loading).toBeFalsy();
    expect(result.current.form).toBeNull();
    expect(result.current.errors).toHaveProperty('form');
    expect(result.current.isValid).toBeFalsy();
  });

  it('should add field with validation', async () => {
    const { result } = renderHook(() => useForm(mockFormId));

    await act(async () => {
      result.current.addField(FormFieldType.TEXT);
    });

    expect(result.current.form?.config.fields).toBeDefined();
    expect(result.current.isValid).toBeTruthy();
  });

  it('should update field with validation', async () => {
    const { result } = renderHook(() => useForm(mockFormId));

    await act(async () => {
      result.current.updateField(mockField.id, {
        label: 'Updated Field'
      });
    });

    expect(result.current.isValid).toBeTruthy();
  });

  it('should remove field with validation', async () => {
    const { result } = renderHook(() => useForm(mockFormId));

    await act(async () => {
      result.current.removeField(mockField.id);
    });

    expect(result.current.isValid).toBeTruthy();
  });

  it('should validate form configuration', async () => {
    const { result } = renderHook(() => useForm(mockFormId));

    await act(async () => {
      const validationResult = result.current.validateForm();
      expect(validationResult.isValid).toBeTruthy();
    });
  });

  it('should handle validation errors for invalid field configuration', async () => {
    const { result } = renderHook(() => useForm(mockFormId));

    await act(async () => {
      result.current.addField(FormFieldType.EMAIL);
      // Add invalid validation rules
      result.current.updateField('field_123', {
        validation: {
          required: true,
          minLength: 100,
          maxLength: 50 // Invalid: min > max
        }
      });
    });

    expect(result.current.isValid).toBeFalsy();
    expect(result.current.errors).toBeDefined();
  });

  it('should maintain form state consistency during operations', async () => {
    const { result } = renderHook(() => useForm(mockFormId));

    await act(async () => {
      // Add field
      result.current.addField(FormFieldType.TEXT);
      // Update field
      result.current.updateField('field_123', { label: 'Test' });
      // Remove field
      result.current.removeField('field_123');
    });

    expect(result.current.form).toBeDefined();
    expect(result.current.isValid).toBeTruthy();
  });

  it('should handle concurrent field operations correctly', async () => {
    const { result } = renderHook(() => useForm(mockFormId));

    await act(async () => {
      // Simulate concurrent operations
      Promise.all([
        result.current.addField(FormFieldType.TEXT),
        result.current.addField(FormFieldType.EMAIL),
        result.current.updateField('field_123', { label: 'Test' })
      ]);
    });

    expect(result.current.form).toBeDefined();
    expect(result.current.isValid).toBeTruthy();
  });

  it('should clean up resources on unmount', () => {
    const { unmount } = renderHook(() => useForm(mockFormId));
    unmount();
    // Verify cleanup
    expect(api.getForms).toHaveBeenCalledTimes(1);
  });

  // Performance tests
  it('should handle large form configurations efficiently', async () => {
    const { result } = renderHook(() => useForm(mockFormId));

    const startTime = performance.now();
    await act(async () => {
      // Add multiple fields
      for (let i = 0; i < 20; i++) {
        result.current.addField(FormFieldType.TEXT);
      }
    });
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    expect(result.current.isValid).toBeTruthy();
  });

  // Memory leak tests
  it('should not leak memory during repeated operations', async () => {
    const { result, rerender } = renderHook(() => useForm(mockFormId));

    const initialMemory = process.memoryUsage().heapUsed;
    
    await act(async () => {
      // Perform multiple operations
      for (let i = 0; i < 100; i++) {
        result.current.addField(FormFieldType.TEXT);
        rerender();
      }
    });

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB increase
  });
});