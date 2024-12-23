/**
 * @file Comprehensive test suite for form-related components
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import FormBuilder from '../../src/components/forms/FormBuilder';
import FormPreview from '../../src/components/forms/FormPreview';
import FormEmbed from '../../src/components/forms/FormEmbed';
import { useFormStore } from '../../src/store/form.store';
import { FormFieldType, FormState } from '../../types/form.types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
};

// Mock form store
vi.mock('../../src/store/form.store', () => ({
  useFormStore: vi.fn(),
}));

// Test data
const mockFormState: FormState = {
  id: new ObjectId(),
  organizationId: new ObjectId(),
  config: {
    title: 'Test Form',
    description: 'Test form description',
    fields: [
      {
        id: 'field_1',
        type: FormFieldType.TEXT,
        label: 'Name',
        validation: { required: true },
      },
      {
        id: 'field_2',
        type: FormFieldType.EMAIL,
        label: 'Email',
        validation: { required: true },
      },
    ],
    submitButtonText: 'Submit',
    successMessage: 'Thank you!',
    theme: {
      primaryColor: '#000000',
      backgroundColor: '#ffffff',
      fontFamily: 'Arial',
    },
  },
  active: true,
  embedCode: '',
};

describe('FormBuilder Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useFormStore as jest.Mock).mockReturnValue({
      form: mockFormState,
      addField: vi.fn(),
      updateField: vi.fn(),
      removeField: vi.fn(),
      reorderFields: vi.fn(),
      setError: vi.fn(),
    });
  });

  test('should render form builder with initial state and verify accessibility', async () => {
    const { container } = render(
      <FormBuilder
        onSave={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify initial render
    expect(screen.getByText('Form Builder')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(mockFormState.config.fields.length * 2 + 2);
  });

  test('should enforce maximum field limit of 20 fields', async () => {
    const mockStore = useFormStore();
    mockStore.form.config.fields = Array(20).fill(mockFormState.config.fields[0]);

    render(
      <FormBuilder
        onSave={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    const addButton = screen.getByRole('button', { name: /add text/i });
    fireEvent.click(addButton);

    expect(screen.getByText(/maximum.*fields allowed/i)).toBeInTheDocument();
  });

  test('should handle field reordering with keyboard navigation', async () => {
    const reorderFields = vi.fn();
    (useFormStore as jest.Mock).mockReturnValue({
      ...mockFormState,
      reorderFields,
    });

    render(
      <FormBuilder
        onSave={vi.fn()}
        onPreview={vi.fn()}
      />
    );

    const fields = screen.getAllByRole('button', { name: /drag to reorder/i });
    const firstField = fields[0];
    const secondField = fields[1];

    // Simulate keyboard reordering
    fireEvent.keyDown(firstField, { key: 'Space' });
    fireEvent.keyDown(firstField, { key: 'ArrowDown' });
    fireEvent.keyDown(firstField, { key: 'Space' });

    expect(reorderFields).toHaveBeenCalledWith(0, 1);
    expect(screen.getByRole('status')).toHaveTextContent(/moved.*position/i);
  });
});

describe('FormPreview Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('should render preview with proper responsive layout', async () => {
    render(<FormPreview formId={mockFormState.id.toString()} />);

    const form = screen.getByRole('form');
    expect(form).toHaveClass('max-w-lg');
    expect(form).toBeVisible();

    // Check responsive classes
    expect(form).toHaveClass('w-full');
    expect(form.parentElement).toHaveClass('mx-auto');
  });

  test('should validate required fields with proper error messages', async () => {
    render(<FormPreview formId={mockFormState.id.toString()} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorMessages = screen.getAllByRole('alert');
      expect(errorMessages).toHaveLength(2);
      expect(errorMessages[0]).toHaveTextContent(/required/i);
    });
  });
});

describe('FormEmbed Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
    });
  });

  test('should generate secure embed code with CSP headers', async () => {
    render(<FormEmbed formId={mockFormState.id.toString()} />);

    const embedCode = screen.getByTestId('embed-code-display');
    expect(embedCode.textContent).toMatch(/nonce=/);
    expect(embedCode.textContent).toMatch(/integrity=/);
    expect(embedCode.textContent).toMatch(/crossorigin="anonymous"/);
  });

  test('should handle clipboard API failures gracefully', async () => {
    mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard error'));

    render(<FormEmbed formId={mockFormState.id.toString()} />);

    const copyButton = screen.getByRole('button', { name: /copy.*code/i });
    await userEvent.click(copyButton);

    expect(screen.getByRole('alert')).toHaveTextContent(/failed to copy/i);
  });

  test('should validate embed code against XSS vulnerabilities', async () => {
    render(<FormEmbed formId={mockFormState.id.toString()} />);

    const embedCode = screen.getByTestId('embed-code-display');
    const codeContent = embedCode.textContent || '';

    // Check for script tag sanitization
    expect(codeContent).not.toMatch(/<script>.*<\/script>/i);
    expect(codeContent).toMatch(/sandbox="allow-forms allow-scripts"/);
  });
});

// Additional test suites for specific functionality
describe('Form Field Validation Tests', () => {
  test('should validate email field format in real-time', async () => {
    render(<FormPreview formId={mockFormState.id.toString()} />);

    const emailField = screen.getByLabelText(/email/i);
    await userEvent.type(emailField, 'invalid-email');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email/i);
    });

    await userEvent.clear(emailField);
    await userEvent.type(emailField, 'valid@email.com');

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});

describe('Form Accessibility Tests', () => {
  test('should maintain proper focus management during field interactions', async () => {
    render(<FormBuilder onSave={vi.fn()} onPreview={vi.fn()} />);

    const addButton = screen.getByRole('button', { name: /add text/i });
    await userEvent.click(addButton);

    const newField = screen.getByRole('textbox', { name: /new text field/i });
    expect(document.activeElement).toBe(newField);

    // Test keyboard navigation
    await userEvent.tab();
    expect(document.activeElement).toHaveAttribute('aria-label', 'Edit field');
  });
});

describe('Form Security Tests', () => {
  test('should sanitize user input to prevent XSS attacks', async () => {
    const updateField = vi.fn();
    (useFormStore as jest.Mock).mockReturnValue({
      ...mockFormState,
      updateField,
    });

    render(<FormBuilder onSave={vi.fn()} onPreview={vi.fn()} />);

    const field = screen.getByRole('textbox', { name: /name/i });
    await userEvent.type(field, '<script>alert("xss")</script>');

    expect(updateField).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        label: expect.not.stringContaining('<script>')
      })
    );
  });
});