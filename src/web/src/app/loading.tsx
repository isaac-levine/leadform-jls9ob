'use client';

import React from 'react';
import Spinner from '../components/ui/spinner';
import { ComponentSize } from '../types/ui.types';

/**
 * Default loading component for Next.js page transitions.
 * Provides a full-page centered loading indicator with accessibility support
 * and performance monitoring capabilities.
 * 
 * @returns {JSX.Element} Full-page loading spinner component
 */
export default function Loading(): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="alert"
      aria-busy="true"
      data-testid="page-loading"
      // Add performance monitoring attributes
      data-loading-start={Date.now()}
      data-component="page-loader"
    >
      <div className="flex flex-col items-center space-y-4">
        <Spinner 
          size={ComponentSize.LARGE}
          aria-label="Loading page content"
          className="text-primary-600 dark:text-primary-400"
          // Add error boundary timeout handling
          data-error-timeout="10000"
        />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}