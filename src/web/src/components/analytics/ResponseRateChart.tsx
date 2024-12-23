import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'; // ^2.0.0
import { format, isValid } from 'date-fns'; // ^2.30.0
import debounce from 'lodash/debounce'; // ^4.17.21
import { Card, CardHeader, CardContent } from '../ui/card';
import { useAnalytics } from '../../hooks/useAnalytics';

// Chart styling constants
const CHART_COLORS = {
  primary: 'var(--chart-primary, #2563eb)',
  secondary: 'var(--chart-secondary, #7c3aed)',
  grid: 'var(--chart-grid, #e5e7eb)',
  text: 'var(--chart-text, #374151)',
  tooltip: 'var(--chart-tooltip-bg, rgba(255, 255, 255, 0.95))'
} as const;

// Chart configuration
const CHART_CONFIG = {
  maxDataPoints: 100,
  defaultRefreshInterval: 30000,
  minHeight: 400,
  margin: { top: 20, right: 30, left: 20, bottom: 30 },
  animationDuration: 300
} as const;

// Type definitions
interface ResponseRateChartProps {
  dateRange: {
    start: Date;
    end: Date;
  };
  className?: string;
  onError?: (error: Error) => void;
  refreshInterval?: number;
}

interface ChartDataPoint {
  timestamp: number;
  responseRate: number;
  aiResponseRate: number;
  humanResponseRate: number;
}

/**
 * ResponseRateChart - A responsive line chart component displaying SMS response rates
 * 
 * @param {ResponseRateChartProps} props - Component props
 * @returns {JSX.Element} Rendered chart component
 */
export const ResponseRateChart: React.FC<ResponseRateChartProps> = ({
  dateRange,
  className,
  onError,
  refreshInterval = CHART_CONFIG.defaultRefreshInterval
}) => {
  // Refs for resize handling and cleanup
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  // Analytics hook for data fetching
  const {
    generateReport,
    isLoading,
    error,
    clearError
  } = useAnalytics();

  // Validate date range
  const isValidDateRange = useMemo(() => {
    return isValid(dateRange.start) && 
           isValid(dateRange.end) && 
           dateRange.start < dateRange.end;
  }, [dateRange]);

  // Format chart data
  const formatChartData = useCallback((data: any): ChartDataPoint[] => {
    if (!data?.metrics) return [];

    const points = Object.entries(data.metrics)
      .map(([timestamp, metrics]: [string, any]) => ({
        timestamp: parseInt(timestamp),
        responseRate: (metrics.totalResponses / metrics.totalMessages) * 100 || 0,
        aiResponseRate: (metrics.aiResponses / metrics.totalMessages) * 100 || 0,
        humanResponseRate: (metrics.humanResponses / metrics.totalMessages) * 100 || 0
      }))
      .slice(-CHART_CONFIG.maxDataPoints);

    return points;
  }, []);

  // Fetch and format data
  const fetchData = useCallback(async () => {
    if (!isValidDateRange) return;

    try {
      const report = await generateReport(dateRange, {
        metrics: ['responseRates', 'aiMetrics'],
        groupBy: ['hourly']
      });
      return formatChartData(report);
    } catch (err) {
      onError?.(err as Error);
      return [];
    }
  }, [dateRange, generateReport, formatChartData, isValidDateRange, onError]);

  // Memoized chart data
  const chartData = useMemo(() => fetchData(), [fetchData]);

  // Handle window resize
  const handleResize = useCallback(debounce(() => {
    if (containerRef.current) {
      // Force chart update on resize
      containerRef.current.style.opacity = '0.99';
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.opacity = '1';
        }
      }, 50);
    }
  }, 150), []);

  // Setup resize observer
  useEffect(() => {
    if (containerRef.current) {
      resizeObserver.current = new ResizeObserver(handleResize);
      resizeObserver.current.observe(containerRef.current);
    }

    return () => {
      resizeObserver.current?.disconnect();
      handleResize.cancel();
    };
  }, [handleResize]);

  // Setup data refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalId = setInterval(fetchData, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  // Custom tooltip formatter
  const tooltipFormatter = (value: number) => `${value.toFixed(2)}%`;
  const dateFormatter = (timestamp: number) => format(new Date(timestamp), 'MMM d, HH:mm');

  // Error handling
  if (error) {
    return (
      <Card className={className} aria-label="Response rate chart error state">
        <CardContent className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-red-600">
            <p>Error loading chart data</p>
            <button 
              onClick={clearError}
              className="mt-2 text-sm underline"
              aria-label="Retry loading chart data"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className} aria-label="Response rate chart loading state">
        <CardContent className="animate-pulse min-h-[400px] bg-gray-100 dark:bg-gray-800" />
      </Card>
    );
  }

  return (
    <Card 
      className={className}
      ref={containerRef}
      aria-label="SMS response rates chart"
    >
      <CardHeader>
        <h3 className="text-lg font-semibold">Response Rates Over Time</h3>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={CHART_CONFIG.margin}
              aria-label="Line chart showing response rates over time"
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={CHART_COLORS.grid}
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={dateFormatter}
                stroke={CHART_COLORS.text}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={tooltipFormatter}
                stroke={CHART_COLORS.text}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={tooltipFormatter}
                labelFormatter={dateFormatter}
                contentStyle={{ backgroundColor: CHART_COLORS.tooltip }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="responseRate"
                stroke={CHART_COLORS.primary}
                name="Overall Response Rate"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                animationDuration={CHART_CONFIG.animationDuration}
              />
              <Line
                type="monotone"
                dataKey="aiResponseRate"
                stroke={CHART_COLORS.secondary}
                name="AI Response Rate"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                animationDuration={CHART_CONFIG.animationDuration}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResponseRateChart;