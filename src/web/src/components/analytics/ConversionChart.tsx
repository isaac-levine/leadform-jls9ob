import React, { memo, useEffect, useMemo, useRef } from 'react'; // ^18.0.0
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'; // ^4.0.0
import { Line } from 'react-chartjs-2'; // ^5.0.0
import { useAnalytics } from '../../hooks/useAnalytics';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Types
interface DateRange {
  start: Date;
  end: Date;
}

interface Dataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
  tension: number;
}

interface TrendData {
  label: string;
  data: number[];
  borderDash: number[];
}

interface ChartData {
  labels: string[];
  datasets: Dataset[];
  trends: TrendData[];
}

interface ConversionChartProps {
  dateRange: DateRange;
  formId?: string;
  height?: number;
  className?: string;
  showTrendline?: boolean;
  smoothData?: boolean;
  accessibilityLabel?: string;
}

interface ProcessOptions {
  smooth?: boolean;
  includeTrends?: boolean;
}

// Constants
const CHART_COLORS = {
  primary: 'rgb(59, 130, 246)',
  secondary: 'rgb(147, 197, 253)',
  trend: 'rgb(107, 114, 128)',
  confidence: 'rgba(59, 130, 246, 0.1)'
};

const DEFAULT_HEIGHT = 400;

// Utility functions
const smoothDataPoints = (data: number[], factor: number = 0.3): number[] => {
  if (data.length < 2) return data;
  const smoothed = [data[0]];
  
  for (let i = 1; i < data.length - 1; i++) {
    const prev = smoothed[i - 1];
    const current = data[i];
    const next = data[i + 1];
    smoothed.push(prev * factor + current * (1 - 2 * factor) + next * factor);
  }
  
  smoothed.push(data[data.length - 1]);
  return smoothed;
};

const calculateTrendline = (data: number[]): number[] => {
  const n = data.length;
  if (n < 2) return data;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return Array.from({ length: n }, (_, i) => slope * i + intercept);
};

// Main component
export const ConversionChart = memo(({
  dateRange,
  formId,
  height = DEFAULT_HEIGHT,
  className = '',
  showTrendline = true,
  smoothData = true,
  accessibilityLabel = 'Conversion rate chart showing form submissions to SMS conversation rates'
}: ConversionChartProps) => {
  const chartRef = useRef<ChartJS>(null);
  const { generateReport, isLoading, error } = useAnalytics();

  // Process analytics data into chart format
  const processChartData = (report: any, options: ProcessOptions = {}): ChartData => {
    const { smooth = true, includeTrends = true } = options;
    
    const conversionRates = report.metrics.daily_conversion_rates || [];
    const labels = conversionRates.map((item: any) => 
      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    
    let data = conversionRates.map((item: any) => item.rate * 100);
    
    if (smooth) {
      data = smoothDataPoints(data);
    }

    const datasets: Dataset[] = [{
      label: 'Conversion Rate',
      data,
      borderColor: CHART_COLORS.primary,
      backgroundColor: CHART_COLORS.secondary,
      fill: true,
      tension: 0.4
    }];

    const trends: TrendData[] = [];
    if (includeTrends) {
      const trendlineData = calculateTrendline(data);
      trends.push({
        label: 'Trend',
        data: trendlineData,
        borderDash: [5, 5]
      });
    }

    return { labels, datasets, trends };
  };

  // Fetch and process data
  const chartData = useMemo(async () => {
    try {
      const report = await generateReport(dateRange, {
        metrics: ['conversion_rate', 'submission_count', 'conversation_count'],
        groupBy: ['date'],
        filters: formId ? { form_id: formId } : undefined
      });
      
      return processChartData(report, {
        smooth: smoothData,
        includeTrends: showTrendline
      });
    } catch (err) {
      console.error('Error processing chart data:', err);
      return null;
    }
  }, [dateRange, formId, smoothData, showTrendline, generateReport]);

  // Chart configuration
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `${value}%`
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `Conversion Rate: ${context.parsed.y.toFixed(1)}%`
        }
      }
    }
  }), []);

  // Accessibility setup
  useEffect(() => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', accessibilityLabel);
    }
  }, [accessibilityLabel]);

  if (isLoading) {
    return (
      <div 
        className={`animate-pulse bg-gray-200 rounded ${className}`} 
        style={{ height }}
        role="progressbar"
        aria-label="Loading chart data"
      />
    );
  }

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center text-red-500 ${className}`}
        style={{ height }}
        role="alert"
      >
        <p>Error loading chart data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      {chartData && (
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
          aria-label={accessibilityLabel}
        />
      )}
    </div>
  );
});

ConversionChart.displayName = 'ConversionChart';

export { processChartData };