/**
 * @file Login page component implementing secure authentication flow
 * @version 1.0.0
 */

'use client';

import React, { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
import LoginForm from '../../../components/auth/LoginForm';
import { useAuth } from '../../../hooks/useAuth';

/**
 * Generates static metadata for the login page
 * Implements SEO optimization requirements
 */
export const generateMetadata = () => {
  return {
    title: 'Login - Lead Capture & SMS Platform',
    description: 'Securely sign in to access your lead capture and SMS nurturing dashboard',
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: 'Login - Lead Capture & SMS Platform',
      description: 'Securely sign in to access your lead capture and SMS nurturing dashboard',
      type: 'website',
    },
  };
};

/**
 * Login page component that implements secure authentication flow
 * with comprehensive error handling and accessibility features
 */
const LoginPage: React.FC = () => {
  // Get authentication state and handlers
  const { user, isLoading } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && !isLoading) {
      redirect('/dashboard');
    }
  }, [user, isLoading]);

  // Prevent flash of login form for authenticated users
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white/90 backdrop-blur rounded-lg shadow-lg">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main container with background pattern */}
      <div className="min-h-screen flex flex-col items-center justify-center bg-auth-pattern bg-cover bg-center">
        {/* Login form container */}
        <div className="w-full max-w-md px-6 py-12 sm:px-8">
          {/* Logo or branding could be added here */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your account to manage leads and conversations
            </p>
          </div>

          {/* Login form component */}
          <div className="bg-white/90 backdrop-blur shadow-xl rounded-lg">
            <LoginForm />
          </div>

          {/* Additional help links */}
          <div className="mt-6 text-center text-sm">
            <a 
              href="/help"
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Get help with signing in"
            >
              Need help signing in?
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full py-4 text-center text-sm text-gray-600">
          <p>
            &copy; {new Date().getFullYear()} Lead Capture & SMS Platform. 
            All rights reserved.
          </p>
        </footer>
      </div>

      {/* Analytics integration */}
      <Analytics />
    </>
  );
};

export default LoginPage;