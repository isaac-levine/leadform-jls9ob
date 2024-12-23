/**
 * @file Comprehensive test suite for authentication components
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import LoginForm from '../../src/components/auth/LoginForm';
import RegisterForm from '../../src/components/auth/RegisterForm';
import { useAuth } from '../../src/hooks/useAuth';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock useAuth hook
vi.mock('../../src/hooks/useAuth');

// Mock implementation of login function
const mockLogin = vi.fn().mockImplementation((credentials) => {
  if (credentials.email === 'invalid@example.com') {
    throw new Error('Invalid credentials');
  }
  return Promise.resolve({ token: 'mock-jwt-token' });
});

// Mock implementation of register function
const mockRegister = vi.fn().mockImplementation((data) => {
  if (data.email === 'existing@example.com') {
    throw new Error('Email already exists');
  }
  return Promise.resolve({ token: 'mock-jwt-token' });
});

// Setup mock auth hook
const mockUseAuth = vi.mocked(useAuth);

describe('LoginForm', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null
    } as any);
    vi.clearAllMocks();
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<LoginForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and descriptions', () => {
      render(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(passwordInput).toHaveAttribute('aria-required', 'true');
    });

    it('should support keyboard navigation', async () => {
      render(<LoginForm />);
      const form = screen.getByRole('form');
      
      // Initial focus should be on email input
      expect(document.activeElement).toEqual(screen.getByLabelText(/email/i));
      
      // Tab through form elements
      await userEvent.tab();
      expect(document.activeElement).toEqual(screen.getByLabelText(/password/i));
    });
  });

  describe('Validation', () => {
    it('should show error for invalid email format', async () => {
      render(<LoginForm />);
      
      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.tab(); // Trigger blur validation
      
      expect(await screen.findByText(/invalid email format/i)).toBeInTheDocument();
    });

    it('should show error for password length violation', async () => {
      render(<LoginForm />);
      
      const passwordInput = screen.getByLabelText(/password/i);
      await userEvent.type(passwordInput, 'short');
      await userEvent.tab();
      
      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    it('should show error for missing required fields', async () => {
      render(<LoginForm />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await userEvent.click(submitButton);
      
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should handle successful login', async () => {
      render(<LoginForm />);
      
      await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'ValidPass123!');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123!',
        rememberMe: false
      });
    });

    it('should handle login failure', async () => {
      render(<LoginForm />);
      
      await userEvent.type(screen.getByLabelText(/email/i), 'invalid@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'ValidPass123!');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    });

    it('should disable form during submission', async () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        loading: true,
        error: null
      } as any);
      
      render(<LoginForm />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(submitButton).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });
  });
});

describe('RegisterForm', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      loading: false,
      error: null
    } as any);
    vi.clearAllMocks();
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<RegisterForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and descriptions', () => {
      render(<RegisterForm />);
      
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAttribute('aria-required', 'true');
      });
    });
  });

  describe('Validation', () => {
    it('should validate email format', async () => {
      render(<RegisterForm />);
      
      await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email');
      await userEvent.tab();
      
      expect(await screen.findByText(/invalid email format/i)).toBeInTheDocument();
    });

    it('should validate password complexity', async () => {
      render(<RegisterForm />);
      
      await userEvent.type(screen.getByLabelText(/password/i), 'simple');
      await userEvent.tab();
      
      expect(await screen.findByText(/password must contain/i)).toBeInTheDocument();
    });

    it('should validate organization name', async () => {
      render(<RegisterForm />);
      
      await userEvent.type(screen.getByLabelText(/organization name/i), '@invalid@');
      await userEvent.tab();
      
      expect(await screen.findByText(/organization name contains invalid characters/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should handle successful registration', async () => {
      render(<RegisterForm />);
      
      await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'ValidPass123!');
      await userEvent.type(screen.getByLabelText(/name/i), 'John Doe');
      await userEvent.type(screen.getByLabelText(/organization name/i), 'Test Corp');
      
      await userEvent.click(screen.getByRole('button', { name: /register/i }));
      
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'ValidPass123!',
        name: 'John Doe',
        organizationName: 'Test Corp'
      });
    });

    it('should handle registration failure', async () => {
      render(<RegisterForm />);
      
      await userEvent.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'ValidPass123!');
      await userEvent.type(screen.getByLabelText(/name/i), 'John Doe');
      await userEvent.type(screen.getByLabelText(/organization name/i), 'Test Corp');
      
      await userEvent.click(screen.getByRole('button', { name: /register/i }));
      
      expect(await screen.findByText(/email already exists/i)).toBeInTheDocument();
    });

    it('should show loading state during submission', async () => {
      mockUseAuth.mockReturnValue({
        register: mockRegister,
        loading: true,
        error: null
      } as any);
      
      render(<RegisterForm />);
      
      const submitButton = screen.getByRole('button', { name: /register/i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/registering/i);
    });
  });
});