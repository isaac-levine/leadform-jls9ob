/**
 * @file Forgot password page component with enhanced security and accessibility
 * @version 1.0.0
 * @description Implements secure password reset request interface with WCAG 2.1 Level AA compliance
 */

import React from 'react'; // v18.0.0
import type { Metadata } from 'next'; // v14.x
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

/**
 * Enhanced metadata configuration for forgot password page
 * Implements SEO best practices with security considerations
 */
export const metadata: Metadata = {
  title: 'Forgot Password | AI-Driven Lead Capture Platform',
  description: 'Reset your password for the AI-Driven Lead Capture & SMS Lead Nurturing Platform',
  robots: 'noindex, nofollow', // Prevent indexing of authentication pages
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#ffffff',
};

/**
 * Forgot password page component with comprehensive security and accessibility features
 * Implements password reset flow from technical specifications
 * 
 * @returns {JSX.Element} Rendered forgot password page with semantic structure
 */
const ForgotPasswordPage: React.FC = () => {
  return (
    <main 
      className="min-h-screen flex flex-col items-center justify-center bg-gray-50"
      role="main"
    >
      <div 
        className="w-full max-w-md px-6 py-8 bg-white shadow-lg rounded-lg"
        aria-labelledby="forgotPasswordTitle"
      >
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 
            id="forgotPasswordTitle"
            className="text-2xl font-bold text-gray-900"
            tabIndex={-1} // Allow programmatic focus
          >
            Forgot Your Password?
          </h1>
          <p 
            className="mt-2 text-sm text-gray-600"
            role="doc-subtitle"
          >
            Enter your email address below and we'll send you instructions to reset your password.
          </p>
        </div>

        {/* Security Notice */}
        <div 
          className="mb-6 p-4 bg-blue-50 rounded-md"
          role="note"
          aria-label="Security information"
        >
          <p className="text-sm text-blue-700">
            For your security, a reset link will be sent only if the email address matches an existing account.
          </p>
        </div>

        {/* Password Reset Form */}
        <div role="form" aria-labelledby="forgotPasswordTitle">
          <ForgotPasswordForm />
        </div>

        {/* Back to Login Link */}
        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-sm text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            aria-label="Return to login page"
          >
            Return to Login
          </a>
        </div>
      </div>

      {/* Accessibility Skip Link - Hidden visually but available for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white p-4 rounded-md shadow-lg"
      >
        Skip to main content
      </a>
    </main>
  );
};

export default ForgotPasswordPage;