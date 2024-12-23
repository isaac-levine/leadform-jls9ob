import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PasswordResetData } from '../../types/auth.types';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/button';
import { ButtonVariant, ComponentSize } from '../../types/ui.types';

// Props interface for the ResetPasswordForm component
interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

// Password reset validation schema with security requirements
const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword']
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * A secure password reset form component with comprehensive validation
 * and accessibility features. Implements requirements from technical specification.
 */
const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ token, onSuccess }) => {
  // Get authentication functionality from useAuth hook
  const { resetPassword, loading, error } = useAuth();

  // Initialize form with validation schema
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange'
  });

  /**
   * Handles secure form submission with error handling
   */
  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const resetData: PasswordResetData = {
        token,
        newPassword: data.newPassword
      };

      await resetPassword(resetData);
      reset(); // Clear form
      onSuccess(); // Trigger success callback
    } catch (err) {
      console.error('Password reset failed:', err);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* New Password Field */}
      <div>
        <label 
          htmlFor="newPassword"
          className="block text-sm font-medium text-gray-700"
        >
          New Password
        </label>
        <div className="mt-1">
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className={`
              w-full px-3 py-2 border rounded-md shadow-sm
              focus:outline-none focus:ring-primary-500 focus:border-primary-500
              ${errors.newPassword ? 'border-red-500' : 'border-gray-300'}
            `}
            aria-invalid={!!errors.newPassword}
            aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p 
              id="newPassword-error" 
              className="mt-1 text-sm text-red-600"
              role="alert"
            >
              {errors.newPassword.message}
            </p>
          )}
        </div>
      </div>

      {/* Confirm Password Field */}
      <div>
        <label 
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700"
        >
          Confirm Password
        </label>
        <div className="mt-1">
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={`
              w-full px-3 py-2 border rounded-md shadow-sm
              focus:outline-none focus:ring-primary-500 focus:border-primary-500
              ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}
            `}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p 
              id="confirmPassword-error" 
              className="mt-1 text-sm text-red-600"
              role="alert"
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="p-3 text-sm text-red-600 bg-red-50 rounded-md"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant={ButtonVariant.PRIMARY}
        size={ComponentSize.MEDIUM}
        loading={loading}
        disabled={loading}
        className="w-full"
      >
        Reset Password
      </Button>
    </form>
  );
};

export default ResetPasswordForm;