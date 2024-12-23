import { useState, useEffect, useCallback, useRef } from 'react'; // ^18.0.0
import { AnalyticsManager } from '../lib/analytics';

// Types for analytics data
interface FormSubmissionData {
  formId: string;
  [key: string]: any;
}

interface MessageMetricsData {
  messageId: string;
  conversationId: string;
  isAiResponse: boolean;
  responseTime: number;
}

interface AIPerformanceData {
  messageId: string;
  confidence: number;
  processingTime: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportOptions {
  metrics: string[];
  groupBy?: string[];
  filters?: Record<string, any>;
  format?: 'json' | 'csv';
}

interface AnalyticsReport {
  id: string;
  dateRange: DateRange;
  metrics: Record<string, any>;
  trends: Record<string, any>;
  insights: string[];
  metadata: {
    generatedAt: Date;
    dataPoints: number;
    privacyMode: string;
  };
}

interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  sampleRate: number;
  flushInterval: number;
  errorRetryAttempts: number;
  errorRetryDelay: number;
  performanceMonitoring: boolean;
  memoryThreshold: number;
}

interface UseAnalyticsReturn {
  trackFormSubmission: (formId: string, data: FormSubmissionData) => Promise<void>;
  trackMessageMetrics: (data: MessageMetricsData) => Promise<void>;
  trackAIPerformance: (data: AIPerformanceData) => Promise<void>;
  generateReport: (range: DateRange, options: ReportOptions) => Promise<AnalyticsReport>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  retryOperation: () => Promise<void>;
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  debug: false,
  sampleRate: 1.0,
  flushInterval: 30000,
  errorRetryAttempts: 3,
  errorRetryDelay: 1000,
  performanceMonitoring: true,
  memoryThreshold: 0.9 // 90% memory threshold
};

export function useAnalytics(config: Partial<AnalyticsConfig> = {}): UseAnalyticsReturn {
  // Merge provided config with defaults
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Create stable reference for analytics manager
  const analyticsManager = useRef<AnalyticsManager | null>(null);
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const lastOperation = useRef<(() => Promise<void>) | null>(null);

  // Memory monitoring
  const checkMemoryUsage = useCallback(() => {
    if (!finalConfig.performanceMonitoring) return true;
    
    if (typeof window !== 'undefined' && 'performance' in window) {
      const memory = (performance as any).memory;
      if (memory) {
        return memory.usedJSHeapSize / memory.jsHeapSizeLimit < finalConfig.memoryThreshold;
      }
    }
    return true;
  }, [finalConfig.performanceMonitoring, finalConfig.memoryThreshold]);

  // Error handling wrapper
  const withErrorHandling = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      setIsLoading(true);
      setError(null);
      lastOperation.current = operation as () => Promise<void>;
      const result = await operation();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize analytics manager
  useEffect(() => {
    if (!analyticsManager.current) {
      analyticsManager.current = new AnalyticsManager(finalConfig);
    }
    
    return () => {
      // Cleanup on unmount
      if (analyticsManager.current) {
        analyticsManager.current = null;
      }
    };
  }, []);

  // Memoized tracking functions
  const trackFormSubmission = useCallback(async (formId: string, data: FormSubmissionData) => {
    if (!checkMemoryUsage()) {
      throw new Error('Memory usage exceeded threshold');
    }
    
    return withErrorHandling(async () => {
      if (!analyticsManager.current) throw new Error('Analytics manager not initialized');
      await analyticsManager.current.trackFormSubmission(formId, data);
    });
  }, [checkMemoryUsage, withErrorHandling]);

  const trackMessageMetrics = useCallback(async (data: MessageMetricsData) => {
    if (!checkMemoryUsage()) {
      throw new Error('Memory usage exceeded threshold');
    }
    
    return withErrorHandling(async () => {
      if (!analyticsManager.current) throw new Error('Analytics manager not initialized');
      await analyticsManager.current.trackMessageMetrics(data);
    });
  }, [checkMemoryUsage, withErrorHandling]);

  const trackAIPerformance = useCallback(async (data: AIPerformanceData) => {
    if (!checkMemoryUsage()) {
      throw new Error('Memory usage exceeded threshold');
    }
    
    return withErrorHandling(async () => {
      if (!analyticsManager.current) throw new Error('Analytics manager not initialized');
      await analyticsManager.current.trackAIPerformance(data);
    });
  }, [checkMemoryUsage, withErrorHandling]);

  const generateReport = useCallback(async (range: DateRange, options: ReportOptions) => {
    if (!checkMemoryUsage()) {
      throw new Error('Memory usage exceeded threshold');
    }
    
    return withErrorHandling(async () => {
      if (!analyticsManager.current) throw new Error('Analytics manager not initialized');
      return analyticsManager.current.generateReport(range, options);
    });
  }, [checkMemoryUsage, withErrorHandling]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const retryOperation = useCallback(async () => {
    if (!lastOperation.current || retryCount >= finalConfig.errorRetryAttempts) {
      throw new Error('Maximum retry attempts reached or no operation to retry');
    }

    setRetryCount(prev => prev + 1);
    const delay = finalConfig.errorRetryDelay * Math.pow(2, retryCount);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return withErrorHandling(lastOperation.current);
  }, [retryCount, finalConfig.errorRetryAttempts, finalConfig.errorRetryDelay, withErrorHandling]);

  return {
    trackFormSubmission,
    trackMessageMetrics,
    trackAIPerformance,
    generateReport,
    isLoading,
    error,
    clearError,
    retryOperation
  };
}