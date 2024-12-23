/**
 * @file Enhanced forgot password form component with comprehensive validation and accessibility
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '../ui/button';
import Input from '../ui/input';
import { useAuth } from '../../hooks/useAuth';
import { ButtonVariant, ComponentSize } from '../../types/ui.types';

// Validation schema for password reset request
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Enhanced forgot password form component with validation and accessibility features
 * Implements secure password reset flow from technical specifications
 */
const ForgotPasswordForm: React.FC = () => {
  // Form state management with validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  });

  // Authentication hook for password reset functionality
  const { requestPasswordReset, loading, error } = useAuth();

  // Success message state
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Refs for focus management
  const emailInputRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  /**
   * Handles form submission with enhanced error handling
   * @param data - Validated form data
   */
  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setSuccessMessage('');
      
      // Request password reset
      await requestPasswordReset(data.email);
      
      // Show success message
      setSuccessMessage(
        'If an account exists with this email, you will receive password reset instructions.'
      );
      
      // Reset form
      reset();
      
      // Focus status message for screen readers
      statusRef.current?.focus();
      
    } catch (err) {
      // Error handling is managed by useAuth hook
      console.error('Password reset request failed:', err);
    }
  };

  // Focus first input on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md space-y-6"
      noValidate
    >
      <div className="space-y-4">
        {/* Form Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            Reset Your Password
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        {/* Email Input */}
        <div className="space-y-1">
          <Input
            {...register('email')}
            type="email"
            id="email"
            ref={emailInputRef}
            placeholder="Enter your email address"
            error={errors.email?.message}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            disabled={loading}
            required
            fullWidth
          />
          {errors.email && (
            <p
              id="email-error"
              className="text-sm text-error-500"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant={ButtonVariant.PRIMARY}
          size={ComponentSize.LARGE}
          loading={loading}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Sending Instructions...' : 'Send Reset Instructions'}
        </Button>

        {/* Status Messages */}
        <div
          ref={statusRef}
          tabIndex={-1}
          className="mt-4"
          role="status"
          aria-live="polite"
        >
          {successMessage && (
            <p className="text-sm text-success-600">
              {successMessage}
            </p>
          )}
          {error && (
            <p className="text-sm text-error-500" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;