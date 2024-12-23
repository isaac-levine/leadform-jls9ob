"use client";

import React, { useEffect, useState } from 'react';
import { useMediaQuery } from '@react-hook/media-query';
import { redirect } from 'next/navigation';
import { clsx } from 'clsx';
import { ErrorBoundary } from 'react-error-boundary';
import { Header } from '../../components/dashboard/Header';
import { Sidebar } from '../../components/dashboard/Sidebar';
import useAuth from '../../hooks/useAuth';

// Create React Context for dashboard state
export const DashboardContext = React.createContext<{
  isSidebarOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
}>({
  isSidebarOpen: true,
  isMobile: false,
  toggleSidebar: () => {},
});

// Props interface for the layout component
interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Error fallback component for the dashboard
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div 
    role="alert" 
    className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg"
  >
    <h2 className="text-lg font-semibold text-red-800">
      Something went wrong
    </h2>
    <p className="mt-2 text-sm text-red-600">
      {error.message}
    </p>
  </div>
);

/**
 * Root layout component for the dashboard section
 * Implements responsive design, authentication, and accessibility requirements
 */
const DashboardLayout: React.FC<LayoutProps> = ({ children }) => {
  // Authentication state
  const { user, isLoading } = useAuth();

  // Responsive state management
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  // Update sidebar state on screen size changes
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  // Toggle sidebar handler
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        role="status"
        aria-label="Loading dashboard"
      >
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    redirect('/auth/login');
    return null;
  }

  return (
    <DashboardContext.Provider 
      value={{ 
        isSidebarOpen, 
        isMobile, 
        toggleSidebar 
      }}
    >
      <div 
        className={clsx(
          'flex h-screen bg-gray-50',
          'transition-all duration-300 ease-in-out'
        )}
      >
        {/* Sidebar Navigation */}
        <Sidebar
          className={clsx(
            'fixed left-0 top-0 h-full z-30',
            'transition-transform duration-300',
            isMobile && !isSidebarOpen && '-translate-x-full'
          )}
          collapsed={!isSidebarOpen}
          onToggle={toggleSidebar}
        />

        {/* Main Content Area */}
        <main 
          className={clsx(
            'flex-1 flex flex-col',
            'transition-all duration-300',
            isSidebarOpen ? 'ml-64' : 'ml-16',
            isMobile && 'ml-0'
          )}
        >
          {/* Header */}
          <Header 
            className="fixed top-0 right-0 left-0 z-20"
          />

          {/* Page Content with Error Boundary */}
          <div 
            className={clsx(
              'flex-1 overflow-auto',
              'pt-16 px-4 md:px-6 pb-6'
            )}
          >
            <ErrorBoundary
              FallbackComponent={ErrorFallback}
              onReset={() => window.location.reload()}
            >
              {children}
            </ErrorBoundary>
          </div>

          {/* Mobile Sidebar Overlay */}
          {isMobile && isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-20"
              onClick={toggleSidebar}
              aria-hidden="true"
            />
          )}
        </main>

        {/* Accessibility Announcements */}
        <div 
          className="sr-only" 
          role="status" 
          aria-live="polite"
        >
          {isSidebarOpen ? 'Sidebar expanded' : 'Sidebar collapsed'}
        </div>
      </div>
    </DashboardContext.Provider>
  );
};

export default DashboardLayout;