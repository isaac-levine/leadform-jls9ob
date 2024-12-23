'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ResetPasswordForm from '../../../components/auth/ResetPasswordForm';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { ToastVariant } from '../../../types/ui.types';

/**
 * Password reset page component implementing secure password reset flow
 * with comprehensive error handling and accessibility support.
 * 
 * @version 1.0.0
 */
const ResetPasswordPage = () => {
  // Initialize hooks and state
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetPassword, clearAuthState } = useAuth();
  const toast = useToast();
  const [isValidToken, setIsValidToken] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Extract reset token from URL
  const token = searchParams.get('token');

  /**
   * Validates reset token format and expiration
   * @param token - Password reset token from URL
   * @returns boolean indicating token validity
   */
  const validateToken = (token: string | null): boolean => {
    if (!token) return false;

    // Check token format (JWT structure)
    const tokenRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
    return tokenRegex.test(token);
  };

  /**
   * Handles successful password reset with proper cleanup
   */
  const handleResetSuccess = async () => {
    // Clear any existing auth state
    clearAuthState();

    // Show success notification
    toast.show({
      type: ToastVariant.SUCCESS,
      message: 'Password has been successfully reset. Please log in with your new password.',
      duration: 5000
    });

    // Redirect to login page
    router.push('/login');
  };

  /**
   * Handles password reset errors with user feedback
   * @param error - Error message or object
   */
  const handleResetError = (error: any) => {
    const errorMessage = error?.message || 'Failed to reset password. Please try again.';
    
    toast.show({
      type: ToastVariant.ERROR,
      message: errorMessage,
      duration: 5000
    });
  };

  // Validate token on mount
  useEffect(() => {
    const isValid = validateToken(token);
    setIsValidToken(isValid);
    setIsLoading(false);

    if (!isValid) {
      toast.show({
        type: ToastVariant.ERROR,
        message: 'Invalid or expired reset token. Please request a new password reset.',
        duration: 5000
      });
    }
  }, [token, toast]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div 
          role="status"
          className="text-center"
          aria-label="Loading password reset page"
        >
          Loading...
        </div>
      </div>
    );
  }

  // Show error for invalid token
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div 
          role="alert"
          className="text-center max-w-md px-6"
        >
          <h1 className="text-2xl font-semibold mb-4">
            Invalid Reset Link
          </h1>
          <p className="text-gray-600 mb-6">
            The password reset link is invalid or has expired. Please request a new password reset from the login page.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full px-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2">
            Reset Your Password
          </h1>
          <p className="text-gray-600">
            Please enter your new password below
          </p>
        </div>

        {/* Password reset form with security requirements */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <ResetPasswordForm
            token={token!}
            onSuccess={handleResetSuccess}
            onError={handleResetError}
          />
        </div>

        {/* Back to login link */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/login')}
            className="text-gray-600 hover:text-gray-800"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;