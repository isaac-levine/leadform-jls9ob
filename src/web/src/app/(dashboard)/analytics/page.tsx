"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays, isValid, isFuture } from 'date-fns'; // ^2.30.0
import AIPerformanceStats from '@/components/analytics/AIPerformanceStats';
import ConversionChart from '@/components/analytics/ConversionChart';
import LeadSourceChart from '@/components/analytics/LeadSourceChart';
import ResponseRateChart from '@/components/analytics/ResponseRateChart';
import { useAnalytics } from '@/hooks/useAnalytics';

// Constants
const DEFAULT_RANGE_DAYS = 30;
const REFRESH_INTERVAL_MS = 30000; // 30 seconds
const MAX_RANGE_DAYS = 90;

// Types
interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get default date range for analytics
 * @returns {DateRange} Object containing start and end dates
 */
const getDefaultDateRange = (): DateRange => {
  const endDate = new Date();
  const startDate = subDays(endDate, DEFAULT_RANGE_DAYS);
  
  return {
    startDate,
    endDate: isFuture(endDate) ? new Date() : endDate
  };
};

/**
 * Validate date range input
 * @param {DateRange} dateRange - Date range to validate
 * @returns {boolean} True if date range is valid
 */
const validateDateRange = (dateRange: DateRange): boolean => {
  const { startDate, endDate } = dateRange;
  
  if (!isValid(startDate) || !isValid(endDate)) {
    return false;
  }

  if (isFuture(endDate)) {
    return false;
  }

  const diffInDays = Math.abs(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diffInDays <= MAX_RANGE_DAYS;
};

/**
 * Analytics Dashboard Page Component
 * Displays comprehensive analytics and metrics for the lead capture and SMS platform
 */
const AnalyticsPage = () => {
  // State management
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  
  // Analytics hook
  const { generateReport, isLoading, error, retryFetch } = useAnalytics();

  // Memoized report options
  const reportOptions = useMemo(() => ({
    metrics: [
      'conversion_rate',
      'response_rate',
      'ai_performance',
      'lead_sources'
    ],
    groupBy: ['date'],
    format: 'json'
  }), []);

  // Handle date range changes
  const handleDateRangeChange = useCallback((newRange: DateRange) => {
    if (validateDateRange(newRange)) {
      setDateRange(newRange);
    }
  }, []);

  // Set up real-time data refresh
  useEffect(() => {
    const intervalId = setInterval(() => {
      generateReport(dateRange, reportOptions);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [dateRange, generateReport, reportOptions]);

  // Error handling callback
  const handleError = useCallback((error: Error) => {
    console.error('Analytics error:', error);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Analytics Dashboard
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {format(new Date(), 'MMM d, yyyy HH:mm')}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div 
          className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800"
          role="alert"
        >
          <p className="text-red-600 dark:text-red-400">
            Error loading analytics data
          </p>
          <button
            onClick={retryFetch}
            className="text-red-600 dark:text-red-400 underline text-sm mt-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* AI Performance Stats */}
      <AIPerformanceStats
        dateRange={dateRange}
        className="w-full"
        onMetricAlert={(metric, value, threshold) => {
          console.warn(`Metric alert: ${metric} (${value}) exceeded threshold (${threshold})`);
        }}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Rate Chart */}
        <ConversionChart
          dateRange={dateRange}
          className="w-full"
          showTrendline={true}
          smoothData={true}
          accessibilityLabel="Lead conversion rate trends over time"
        />

        {/* Lead Source Distribution */}
        <LeadSourceChart
          dateRange={dateRange}
          className="w-full"
        />

        {/* Response Rate Chart */}
        <ResponseRateChart
          dateRange={dateRange}
          className="w-full"
          refreshInterval={REFRESH_INTERVAL_MS}
          onError={handleError}
        />
      </div>
    </div>
  );
};

export default AnalyticsPage;