import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { Card, CardHeader, CardContent } from '../ui/card';
import Spinner from '../ui/spinner';
import { ComponentSize } from '../../types/ui.types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Interfaces for component props and data structures
interface AIPerformanceStatsProps {
  dateRange: {
    start: Date;
    end: Date;
  };
  className?: string;
  thresholds?: {
    minResponseRate: number;
    maxResponseTime: number;
    maxHandoffRate: number;
    minAccuracyScore: number;
  };
  onMetricAlert?: (metric: string, value: number, threshold: number) => void;
}

interface AIPerformanceMetrics {
  responseRate: number;
  averageResponseTime: number;
  handoffRate: number;
  successfulResolutions: number;
  totalConversations: number;
  accuracyScore: number;
  averageHandlingTime: number;
  customerSatisfactionScore: number;
}

// Default thresholds for metrics
const DEFAULT_THRESHOLDS = {
  minResponseRate: 90, // 90%
  maxResponseTime: 5000, // 5 seconds
  maxHandoffRate: 20, // 20%
  minAccuracyScore: 85 // 85%
};

/**
 * AIPerformanceStats Component
 * Displays comprehensive AI performance metrics with real-time updates and accessibility features
 */
const AIPerformanceStats: React.FC<AIPerformanceStatsProps> = ({
  dateRange,
  className,
  thresholds = DEFAULT_THRESHOLDS,
  onMetricAlert
}) => {
  // State for metrics data
  const [metrics, setMetrics] = useState<AIPerformanceMetrics | null>(null);
  
  // Analytics hook for data fetching
  const { trackAIPerformance, isLoading, error, retryOperation } = useAnalytics({
    enabled: true,
    performanceMonitoring: true
  });

  // Memoized function to format metric values
  const formatMetric = useCallback((value: number, type: string): string => {
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'time':
        return value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`;
      case 'score':
        return value.toFixed(1);
      default:
        return value.toLocaleString();
    }
  }, []);

  // Memoized threshold checks
  const thresholdViolations = useMemo(() => {
    if (!metrics) return {};
    
    const violations = {
      responseRate: metrics.responseRate < thresholds.minResponseRate,
      responseTime: metrics.averageResponseTime > thresholds.maxResponseTime,
      handoffRate: metrics.handoffRate > thresholds.maxHandoffRate,
      accuracyScore: metrics.accuracyScore < thresholds.minAccuracyScore
    };

    // Trigger alerts for violations
    Object.entries(violations).forEach(([metric, isViolated]) => {
      if (isViolated && onMetricAlert) {
        const value = metrics[metric as keyof AIPerformanceMetrics];
        const threshold = thresholds[`min${metric}` as keyof typeof thresholds] || 
                         thresholds[`max${metric}` as keyof typeof thresholds];
        onMetricAlert(metric, value, threshold);
      }
    });

    return violations;
  }, [metrics, thresholds, onMetricAlert]);

  // Effect for fetching metrics data
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await trackAIPerformance({
          messageId: 'performance-stats',
          confidence: 1,
          processingTime: 0
        });
        
        // Simulated metrics data (would come from actual API response)
        setMetrics({
          responseRate: 92.5,
          averageResponseTime: 3200,
          handoffRate: 15.3,
          successfulResolutions: 850,
          totalConversations: 1000,
          accuracyScore: 88.7,
          averageHandlingTime: 45000,
          customerSatisfactionScore: 4.2
        });
      } catch (err) {
        // Error handling is managed by useAnalytics hook
      }
    };

    fetchMetrics();
  }, [dateRange, trackAIPerformance]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Spinner 
          size={ComponentSize.LARGE}
          ariaLabel="Loading AI performance metrics"
        />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className={twMerge("bg-red-50 dark:bg-red-900/10", className)}>
        <CardContent className="text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => retryOperation()}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
            aria-label="Retry loading metrics"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  // Render metrics
  return (
    <Card 
      className={twMerge("overflow-hidden", className)}
      role="region"
      aria-label="AI Performance Statistics"
    >
      <CardHeader className="border-b dark:border-gray-700">
        <h2 className="text-xl font-semibold">AI Performance Metrics</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
        {metrics && (
          <>
            <MetricCard
              label="Response Rate"
              value={formatMetric(metrics.responseRate, 'percentage')}
              alert={thresholdViolations.responseRate}
              description="Percentage of messages responded to within SLA"
            />
            <MetricCard
              label="Average Response Time"
              value={formatMetric(metrics.averageResponseTime, 'time')}
              alert={thresholdViolations.responseTime}
              description="Average time to generate AI response"
            />
            <MetricCard
              label="Handoff Rate"
              value={formatMetric(metrics.handoffRate, 'percentage')}
              alert={thresholdViolations.handoffRate}
              description="Percentage of conversations requiring human intervention"
            />
            <MetricCard
              label="Accuracy Score"
              value={formatMetric(metrics.accuracyScore, 'score')}
              alert={thresholdViolations.accuracyScore}
              description="AI response accuracy based on feedback"
            />
            <MetricCard
              label="Successful Resolutions"
              value={formatMetric(metrics.successfulResolutions, 'number')}
              description="Number of successfully resolved conversations"
            />
            <MetricCard
              label="Total Conversations"
              value={formatMetric(metrics.totalConversations, 'number')}
              description="Total number of AI-handled conversations"
            />
            <MetricCard
              label="Average Handling Time"
              value={formatMetric(metrics.averageHandlingTime, 'time')}
              description="Average conversation duration"
            />
            <MetricCard
              label="Customer Satisfaction"
              value={`${formatMetric(metrics.customerSatisfactionScore, 'score')}/5`}
              description="Average customer satisfaction rating"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Helper component for individual metric cards
interface MetricCardProps {
  label: string;
  value: string;
  alert?: boolean;
  description: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  alert,
  description
}) => (
  <div 
    className={clsx(
      "p-4 rounded-lg border",
      "dark:border-gray-700",
      alert ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800" : "bg-white dark:bg-gray-800"
    )}
    role="article"
  >
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
        {label}
      </h3>
      {alert && (
        <span 
          className="text-red-600 dark:text-red-400"
          role="alert"
          aria-label={`${label} threshold violation`}
        >
          ⚠️
        </span>
      )}
    </div>
    <p className="text-2xl font-semibold mb-2">{value}</p>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      {description}
    </p>
  </div>
);

export default AIPerformanceStats;