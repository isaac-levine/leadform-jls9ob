/**
 * @file Registration form component with comprehensive validation and accessibility
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterData } from '../../types/auth.types';
import { useAuth } from '../../hooks/useAuth';
import Input from '../ui/input';
import Button from '../ui/button';
import { ComponentSize, ButtonVariant } from '../../types/ui.types';

// Validation schema for registration form
const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(
      /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
      'Password must contain at least 1 uppercase letter, 1 number, and 1 special character'
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name is too long')
    .regex(/^[a-zA-Z\s-']+$/, 'Name contains invalid characters'),
  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name is too long')
    .regex(/^[a-zA-Z0-9\s-'&]+$/, 'Organization name contains invalid characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Registration form component with comprehensive validation and accessibility features
 * Implements WCAG 2.1 Level AA standards
 */
const RegisterForm: React.FC = () => {
  // Form state management with validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  // Authentication hook for registration
  const { register: registerUser, loading, error: authError } = useAuth();

  // Local error state for API errors
  const [apiError, setApiError] = useState<string | null>(null);

  /**
   * Handles form submission with validation and error handling
   * @param data - Validated form data
   */
  const onSubmit = useCallback(async (data: RegisterFormData) => {
    try {
      setApiError(null);
      
      const registrationData: RegisterData = {
        email: data.email.toLowerCase(),
        password: data.password,
        name: data.name.trim(),
        organizationName: data.organizationName.trim(),
      };

      await registerUser(registrationData);
    } catch (error) {
      setApiError(
        error instanceof Error 
          ? error.message 
          : 'Registration failed. Please try again.'
      );
      
      // Set field-specific errors if available
      if (error instanceof Error && error.name === 'ValidationError') {
        const validationErrors = JSON.parse(error.message);
        Object.keys(validationErrors).forEach((field) => {
          setError(field as keyof RegisterFormData, {
            type: 'manual',
            message: validationErrors[field],
          });
        });
      }
    }
  }, [registerUser, setError]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 w-full max-w-md"
      noValidate
      aria-label="Registration form"
    >
      {/* Email Input */}
      <div className="space-y-2">
        <Input
          {...register('email')}
          type="email"
          id="email"
          placeholder="Email address"
          error={errors.email?.message}
          disabled={isSubmitting}
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="w-full"
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-error-500" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Input */}
      <div className="space-y-2">
        <Input
          {...register('password')}
          type="password"
          id="password"
          placeholder="Password"
          error={errors.password?.message}
          disabled={isSubmitting}
          required
          aria-required="true"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="w-full"
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-error-500" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Name Input */}
      <div className="space-y-2">
        <Input
          {...register('name')}
          type="text"
          id="name"
          placeholder="Full name"
          error={errors.name?.message}
          disabled={isSubmitting}
          required
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className="w-full"
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-error-500" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Organization Name Input */}
      <div className="space-y-2">
        <Input
          {...register('organizationName')}
          type="text"
          id="organizationName"
          placeholder="Organization name"
          error={errors.organizationName?.message}
          disabled={isSubmitting}
          required
          aria-required="true"
          aria-invalid={!!errors.organizationName}
          aria-describedby={errors.organizationName ? 'org-error' : undefined}
          className="w-full"
        />
        {errors.organizationName && (
          <p id="org-error" className="text-sm text-error-500" role="alert">
            {errors.organizationName.message}
          </p>
        )}
      </div>

      {/* Error Messages */}
      {(apiError || authError) && (
        <div
          className="p-3 rounded bg-error-50 border border-error-200 text-error-700"
          role="alert"
        >
          <p className="text-sm font-medium">
            {apiError || authError}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant={ButtonVariant.PRIMARY}
        size={ComponentSize.MEDIUM}
        loading={isSubmitting || loading}
        disabled={isSubmitting || loading}
        className="w-full"
        aria-label={isSubmitting ? 'Registering...' : 'Register'}
      >
        {isSubmitting ? 'Registering...' : 'Register'}
      </Button>
    </form>
  );
};

export default RegisterForm;