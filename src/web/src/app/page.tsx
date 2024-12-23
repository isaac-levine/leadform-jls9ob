/**
 * @file Landing page component for AI-Driven Lead Capture & SMS Lead Nurturing Platform
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import Button from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';
import { ButtonVariant, ComponentSize } from '../types/ui.types';

/**
 * Landing page component with responsive design and accessibility features
 */
const Home: React.FC = () => {
  // Authentication state
  const { user, loading: authLoading } = useAuth();

  // Form toggle state
  const [showLogin, setShowLogin] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-white dark:bg-gray-800 p-4 rounded-md shadow-md"
      >
        Skip to main content
      </a>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-900 to-primary-800 text-white py-20 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                AI-Powered Lead Capture & SMS Nurturing
              </h1>
              <p className="text-lg md:text-xl text-gray-200 max-w-2xl">
                Automate your lead management with intelligent SMS communication. 
                Capture, nurture, and convert leads effortlessly with our AI-driven platform.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant={ButtonVariant.PRIMARY}
                  size={ComponentSize.LARGE}
                  onClick={() => setShowLogin(false)}
                  className="bg-white text-primary-900 hover:bg-gray-100"
                >
                  Get Started Free
                </Button>
                <Button
                  variant={ButtonVariant.OUTLINE}
                  size={ComponentSize.LARGE}
                  onClick={() => setShowLogin(true)}
                  className="border-white text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative h-[400px] lg:h-[500px]">
              <Image
                src="/assets/hero-illustration.svg"
                alt="Platform illustration"
                fill
                priority
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Authentication Section */}
      <section
        id="main-content"
        className="relative -mt-16 pb-20 px-4"
      >
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 md:p-8">
            {/* Form Toggle */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-md p-1 bg-gray-100 dark:bg-gray-700">
                <button
                  onClick={() => setShowLogin(true)}
                  className={twMerge(
                    clsx(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      showLogin
                        ? 'bg-white dark:bg-gray-600 text-primary-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    )
                  )}
                  aria-pressed={showLogin}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowLogin(false)}
                  className={twMerge(
                    clsx(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      !showLogin
                        ? 'bg-white dark:bg-gray-600 text-primary-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    )
                  )}
                  aria-pressed={!showLogin}
                >
                  Register
                </button>
              </div>
            </div>

            {/* Auth Forms */}
            <div
              className={clsx(
                'transition-opacity duration-200',
                authLoading && 'opacity-50 pointer-events-none'
              )}
            >
              {showLogin ? <LoginForm /> : <RegisterForm />}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 md:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md"
              >
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-950 py-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Company
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            {/* Add more footer columns as needed */}
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-gray-600 dark:text-gray-300">
              © {new Date().getFullYear()} AI-Driven Lead Capture. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Feature data
const features = [
  {
    title: 'AI-Powered Conversations',
    description: 'Intelligent SMS conversations that adapt to your leads\' responses and needs.',
    icon: <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 20 20" />,
  },
  {
    title: 'Smart Lead Capture',
    description: 'Customizable forms that integrate seamlessly with your website.',
    icon: <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 20 20" />,
  },
  {
    title: 'Real-time Analytics',
    description: 'Comprehensive insights into your lead nurturing performance.',
    icon: <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 20 20" />,
  },
];

export default Home;