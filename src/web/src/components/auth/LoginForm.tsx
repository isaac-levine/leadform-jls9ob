/**
 * @file Login form component with comprehensive validation and security features
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginCredentials } from '../../types/auth.types';
import { useAuth } from '../../hooks/useAuth';
import Input from '../ui/input';
import Button from '../ui/button';
import { ComponentSize, ButtonVariant } from '../../types/ui.types';

// Login form validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must include uppercase, lowercase, number and special character'
    ),
  rememberMe: z.boolean().optional()
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Enhanced login form component with comprehensive validation and security features
 * Implements secure JWT-based authentication with error handling and loading states
 */
const LoginForm: React.FC = () => {
  // Initialize form with validation schema
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setFocus
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  // Get authentication hooks
  const { login, loading, error: authError } = useAuth();

  // Set initial focus on email field
  useEffect(() => {
    setFocus('email');
  }, [setFocus]);

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe
      } as LoginCredentials);
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('credentials')) {
          setError('root', {
            type: 'manual',
            message: 'Invalid email or password'
          });
        } else {
          setError('root', {
            type: 'manual',
            message: 'An error occurred during login'
          });
        }
        // Set focus back to email field on error
        setFocus('email');
      }
    }
  };

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 w-full max-w-md p-6 rounded-lg shadow-sm bg-white dark:bg-gray-800"
      noValidate
    >
      {/* Form Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Sign In
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Enter your credentials to access your account
        </p>
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <label 
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          size={ComponentSize.MEDIUM}
          error={errors.email?.message}
          {...register('email')}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label 
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Password
        </label>
        <Input
          id="password"
          type="password"
          size={ComponentSize.MEDIUM}
          error={errors.password?.message}
          {...register('password')}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="rememberMe"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            {...register('rememberMe')}
          />
          <label 
            htmlFor="rememberMe"
            className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
          >
            Remember me
          </label>
        </div>

        <a 
          href="/forgot-password"
          className="text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          Forgot password?
        </a>
      </div>

      {/* Error Messages */}
      {(errors.root?.message || authError) && (
        <div 
          role="alert"
          className="p-3 text-sm text-error-700 bg-error-50 rounded-md"
        >
          {errors.root?.message || authError}
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
      >
        Sign In
      </Button>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Don't have an account?{' '}
        <a 
          href="/signup"
          className="font-medium text-primary-600 hover:text-primary-500"
        >
          Sign up
        </a>
      </p>
    </form>
  );
};

export default LoginForm;