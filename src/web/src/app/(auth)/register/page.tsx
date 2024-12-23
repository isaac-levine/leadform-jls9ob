/**
 * @file Registration page component with enhanced security and accessibility
 * @version 1.0.0
 */

import { Metadata } from 'next';
import RegisterForm from '../../../components/auth/RegisterForm';

/**
 * Metadata configuration for the registration page
 * Implements SEO and security requirements
 */
export const metadata: Metadata = {
  title: 'Register | AI-Driven Lead Capture Platform',
  description: 'Create your account to start capturing and nurturing leads with AI-powered SMS conversations.',
  robots: 'noindex, nofollow', // Prevent indexing of authentication pages
  openGraph: {
    title: 'Register | AI-Driven Lead Capture Platform',
    description: 'Create your account to start capturing and nurturing leads with AI-powered SMS conversations.',
    type: 'website',
    locale: 'en_US',
  },
  // Security headers
  other: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },
};

/**
 * Registration page component with enhanced accessibility and security features
 * Implements WCAG 2.1 Level AA compliance and Acetunity UI design patterns
 * 
 * @returns {JSX.Element} Rendered registration page
 */
const RegisterPage = () => {
  return (
    <main 
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8"
      role="main"
      aria-labelledby="register-heading"
    >
      {/* Background with accessible overlay */}
      <div 
        className="fixed inset-0 -z-10 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
        aria-hidden="true"
      />

      {/* Content container */}
      <div className="w-full max-w-md space-y-8">
        {/* Header section */}
        <div className="text-center space-y-2">
          <h1 
            id="register-heading"
            className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
          >
            Create your account
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Start capturing and nurturing leads with AI-powered conversations
          </p>
        </div>

        {/* Registration form */}
        <div 
          className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6 sm:p-8"
          role="region"
          aria-label="Registration form"
        >
          <RegisterForm />
        </div>

        {/* Additional information */}
        <div 
          className="text-center text-sm text-gray-600 dark:text-gray-400"
          role="complementary"
        >
          <p>
            Already have an account?{' '}
            <a 
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </main>
  );
};

export default RegisterPage;