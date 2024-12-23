"use client";

import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Header } from '../../components/dashboard/Header';
import AIPerformanceStats from '../../components/analytics/AIPerformanceStats';
import ConversionChart from '../../components/analytics/ConversionChart';
import ResponseRateChart from '../../components/analytics/ResponseRateChart';
import { useAnalytics } from '../../hooks/useAnalytics';

/**
 * Main dashboard page component that displays performance metrics and analytics
 * Implements core features and success criteria from technical specifications
 */
const DashboardPage: React.FC = () => {
  // State for date range selection
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date()
  });

  // Analytics hook for data management
  const { generateReport, isLoading, error } = useAnalytics({
    enabled: true,
    performanceMonitoring: true
  });

  // Query for fetching dashboard metrics
  const { data: dashboardMetrics } = useQuery(
    ['dashboardMetrics', dateRange],
    async () => {
      const report = await generateReport(dateRange, {
        metrics: [
          'conversion_rate',
          'response_rate',
          'ai_performance',
          'lead_volume'
        ],
        groupBy: ['date'],
        format: 'json'
      });
      return report;
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      staleTime: 25000 // Consider data stale after 25 seconds
    }
  );

  // Handle metric alerts
  const handleMetricAlert = useCallback((metric: string, value: number, threshold: number) => {
    console.warn(`Metric alert: ${metric} value ${value} exceeded threshold ${threshold}`);
    // Additional alert handling could be implemented here
  }, []);

  // Error fallback component
  const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
    <div 
      className="flex flex-col items-center justify-center min-h-screen p-4"
      role="alert"
      aria-live="assertive"
    >
      <h2 className="text-xl font-semibold text-red-600 mb-4">
        Error Loading Dashboard
      </h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
      >
        Retry
      </button>
    </div>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header with navigation and theme controls */}
        <Header />

        {/* Main dashboard content */}
        <main className="container mx-auto px-4 py-8 space-y-6">
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time performance metrics and analytics
            </p>
          </div>

          {/* AI Performance Stats */}
          <section 
            className="mb-8"
            aria-labelledby="ai-performance-heading"
          >
            <h2 id="ai-performance-heading" className="sr-only">
              AI Performance Metrics
            </h2>
            <AIPerformanceStats
              dateRange={dateRange}
              onMetricAlert={handleMetricAlert}
              className={clsx(
                'bg-white dark:bg-gray-800',
                'rounded-lg shadow-sm'
              )}
            />
          </section>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Rate Chart */}
            <section 
              className="w-full"
              aria-labelledby="conversion-chart-heading"
            >
              <h2 id="conversion-chart-heading" className="sr-only">
                Conversion Rates
              </h2>
              <ConversionChart
                dateRange={dateRange}
                height={400}
                showTrendline={true}
                smoothData={true}
                className={clsx(
                  'bg-white dark:bg-gray-800',
                  'rounded-lg shadow-sm p-4'
                )}
              />
            </section>

            {/* Response Rate Chart */}
            <section 
              className="w-full"
              aria-labelledby="response-rate-heading"
            >
              <h2 id="response-rate-heading" className="sr-only">
                Response Rates
              </h2>
              <ResponseRateChart
                dateRange={dateRange}
                refreshInterval={30000}
                className={clsx(
                  'bg-white dark:bg-gray-800',
                  'rounded-lg shadow-sm'
                )}
                onError={(error) => {
                  console.error('Response rate chart error:', error);
                }}
              />
            </section>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default DashboardPage;