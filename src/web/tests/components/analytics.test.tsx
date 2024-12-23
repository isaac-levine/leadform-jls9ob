import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@axe-core/react';
import { vi } from 'vitest';
import ResizeObserver from 'resize-observer-polyfill';
import AIPerformanceStats from '../../src/components/analytics/AIPerformanceStats';
import ConversionChart from '../../src/components/analytics/ConversionChart';
import LeadSourceChart from '../../src/components/analytics/LeadSourceChart';
import ResponseRateChart from '../../src/components/analytics/ResponseRateChart';
import { useAnalytics } from '../../src/hooks/useAnalytics';
import { LeadSource } from '../../src/types/lead.types';

// Mock ResizeObserver
global.ResizeObserver = ResizeObserver;

// Mock useAnalytics hook
vi.mock('../../src/hooks/useAnalytics', () => ({
  useAnalytics: vi.fn()
}));

// Test data
const mockDateRange = {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
};

const mockAIPerformanceData = {
  responseRate: 92.5,
  averageResponseTime: 3200,
  handoffRate: 15.3,
  successfulResolutions: 850,
  totalConversations: 1000,
  accuracyScore: 88.7,
  averageHandlingTime: 45000,
  customerSatisfactionScore: 4.2
};

const mockConversionData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(2024, 0, i + 1).toISOString(),
  submissions: Math.floor(Math.random() * 100),
  conversions: Math.floor(Math.random() * 50),
  rate: Math.random() * 100
}));

const mockLeadSourceData = [
  { source: LeadSource.FORM, count: 150, percentage: 60 },
  { source: LeadSource.MANUAL, count: 75, percentage: 30 },
  { source: LeadSource.API, count: 25, percentage: 10 }
];

const mockResponseRateData = Array.from({ length: 24 }, (_, i) => ({
  timestamp: new Date(2024, 0, 1, i).getTime(),
  responseRate: Math.random() * 100,
  aiResponseRate: Math.random() * 80,
  humanResponseRate: Math.random() * 20
}));

describe('AIPerformanceStats', () => {
  beforeEach(() => {
    vi.mocked(useAnalytics).mockReturnValue({
      trackAIPerformance: vi.fn().mockResolvedValue(mockAIPerformanceData),
      isLoading: false,
      error: null,
      retryOperation: vi.fn(),
      clearError: vi.fn()
    } as any);
  });

  it('renders all performance metrics correctly', async () => {
    render(
      <AIPerformanceStats 
        dateRange={mockDateRange}
        thresholds={{
          minResponseRate: 90,
          maxResponseTime: 5000,
          maxHandoffRate: 20,
          minAccuracyScore: 85
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Response Rate')).toBeInTheDocument();
      expect(screen.getByText('92.5%')).toBeInTheDocument();
      expect(screen.getByText('Average Response Time')).toBeInTheDocument();
      expect(screen.getByText('3.2s')).toBeInTheDocument();
    });
  });

  it('shows loading state correctly', () => {
    vi.mocked(useAnalytics).mockReturnValue({
      ...vi.mocked(useAnalytics)(),
      isLoading: true
    } as any);

    render(<AIPerformanceStats dateRange={mockDateRange} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles errors appropriately', async () => {
    vi.mocked(useAnalytics).mockReturnValue({
      ...vi.mocked(useAnalytics)(),
      error: 'Failed to load metrics',
      retryOperation: vi.fn()
    } as any);

    render(<AIPerformanceStats dateRange={mockDateRange} />);
    
    expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);
    expect(vi.mocked(useAnalytics)().retryOperation).toHaveBeenCalled();
  });

  it('meets accessibility requirements', async () => {
    const { container } = render(<AIPerformanceStats dateRange={mockDateRange} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ConversionChart', () => {
  beforeEach(() => {
    vi.mocked(useAnalytics).mockReturnValue({
      generateReport: vi.fn().mockResolvedValue({ metrics: mockConversionData }),
      isLoading: false,
      error: null
    } as any);
  });

  it('renders chart with correct data', async () => {
    render(
      <ConversionChart 
        dateRange={mockDateRange}
        showTrendline={true}
        smoothData={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /conversion rate chart/i })).toBeInTheDocument();
    });
  });

  it('handles responsive resizing', async () => {
    const { container } = render(<ConversionChart dateRange={mockDateRange} />);
    const chart = container.firstChild;
    
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        expect(entry.contentRect.width).toBeGreaterThan(0);
      });
    });
    
    if (chart) resizeObserver.observe(chart);
  });

  it('updates on date range change', async () => {
    const { rerender } = render(<ConversionChart dateRange={mockDateRange} />);
    
    const newDateRange = {
      start: new Date('2024-02-01'),
      end: new Date('2024-02-28')
    };
    
    rerender(<ConversionChart dateRange={newDateRange} />);
    expect(vi.mocked(useAnalytics)().generateReport).toHaveBeenCalledTimes(2);
  });
});

describe('LeadSourceChart', () => {
  beforeEach(() => {
    vi.mocked(useAnalytics).mockReturnValue({
      generateReport: vi.fn().mockResolvedValue({ metrics: { leadsBySource: mockLeadSourceData } }),
      isLoading: false,
      error: null
    } as any);
  });

  it('renders pie chart with correct data', async () => {
    render(
      <LeadSourceChart 
        dateRange={{
          startDate: mockDateRange.start,
          endDate: mockDateRange.end
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Lead Source Distribution')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /lead source distribution pie chart/i })).toBeInTheDocument();
    });
  });

  it('displays correct percentages in tooltip', async () => {
    render(
      <LeadSourceChart 
        dateRange={{
          startDate: mockDateRange.start,
          endDate: mockDateRange.end
        }}
      />
    );

    const chart = screen.getByRole('img', { name: /lead source distribution pie chart/i });
    await userEvent.hover(chart);
    
    await waitFor(() => {
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });

  it('handles empty data state', async () => {
    vi.mocked(useAnalytics).mockReturnValue({
      ...vi.mocked(useAnalytics)(),
      generateReport: vi.fn().mockResolvedValue({ metrics: { leadsBySource: [] } })
    } as any);

    render(
      <LeadSourceChart 
        dateRange={{
          startDate: mockDateRange.start,
          endDate: mockDateRange.end
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/no lead source data available/i)).toBeInTheDocument();
    });
  });
});

describe('ResponseRateChart', () => {
  beforeEach(() => {
    vi.mocked(useAnalytics).mockReturnValue({
      generateReport: vi.fn().mockResolvedValue({ metrics: mockResponseRateData }),
      isLoading: false,
      error: null,
      clearError: vi.fn()
    } as any);
  });

  it('renders line chart with correct data series', async () => {
    render(<ResponseRateChart dateRange={mockDateRange} />);

    await waitFor(() => {
      expect(screen.getByText('Response Rates Over Time')).toBeInTheDocument();
      expect(screen.getByText('Overall Response Rate')).toBeInTheDocument();
      expect(screen.getByText('AI Response Rate')).toBeInTheDocument();
    });
  });

  it('handles auto-refresh correctly', async () => {
    vi.useFakeTimers();
    render(<ResponseRateChart dateRange={mockDateRange} refreshInterval={30000} />);
    
    vi.advanceTimersByTime(30000);
    expect(vi.mocked(useAnalytics)().generateReport).toHaveBeenCalledTimes(2);
    
    vi.useRealTimers();
  });

  it('validates date range input', async () => {
    const invalidDateRange = {
      start: new Date('2024-01-31'),
      end: new Date('2024-01-01')
    };

    render(<ResponseRateChart dateRange={invalidDateRange} />);
    expect(vi.mocked(useAnalytics)().generateReport).not.toHaveBeenCalled();
  });

  it('handles resize events smoothly', async () => {
    const { container } = render(<ResponseRateChart dateRange={mockDateRange} />);
    const chart = container.firstChild;
    
    if (chart) {
      const resizeEvent = new Event('resize');
      fireEvent(window, resizeEvent);
      
      await waitFor(() => {
        expect(chart).toHaveStyle({ opacity: '1' });
      });
    }
  });
});