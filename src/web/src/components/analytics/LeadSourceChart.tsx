"use client"

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'; // ^2.5.0
import { LeadSource } from '../../types/lead.types';
import { useAnalytics } from '../../hooks/useAnalytics';
import { Card, CardHeader, CardContent } from '../ui/card';

// Color mapping for different lead sources
const SOURCE_COLORS = {
  [LeadSource.FORM]: '#4f46e5', // Indigo
  [LeadSource.MANUAL]: '#10b981', // Emerald
  [LeadSource.API]: '#f59e0b', // Amber
};

interface LeadSourceChartProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  className?: string;
}

interface ChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  label: string;
}

/**
 * LeadSourceChart - Interactive pie chart showing lead distribution by source
 * Built with Recharts for accessibility and responsive design
 * 
 * @version 1.0.0
 */
export const LeadSourceChart: React.FC<LeadSourceChartProps> = ({ 
  dateRange,
  className 
}) => {
  // Analytics hook for data fetching
  const { generateReport, isLoading, error } = useAnalytics();

  // Transform analytics data for chart visualization
  const transformData = (report: any): ChartData[] => {
    const sourceData = {
      [LeadSource.FORM]: report?.metrics?.leadsBySource?.[LeadSource.FORM] || 0,
      [LeadSource.MANUAL]: report?.metrics?.leadsBySource?.[LeadSource.MANUAL] || 0,
      [LeadSource.API]: report?.metrics?.leadsBySource?.[LeadSource.API] || 0,
    };

    const total = Object.values(sourceData).reduce((sum, value) => sum + value, 0);

    return Object.entries(sourceData)
      .map(([source, value]) => ({
        name: source,
        value,
        percentage: total ? Math.round((value / total) * 100) : 0,
        color: SOURCE_COLORS[source as LeadSource],
        label: `${source} Leads`
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
  };

  // Fetch and transform data
  const chartData = useMemo(() => {
    const report = generateReport(
      { start: dateRange.startDate, end: dateRange.endDate },
      { 
        metrics: ['leadsBySource'],
        groupBy: ['source']
      }
    );
    return transformData(report);
  }, [dateRange, generateReport]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-gray-100">{data.label}</p>
          <p className="text-gray-600 dark:text-gray-400">
            Count: {data.value}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Percentage: {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>Lead Source Distribution</CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-red-500">
            Error loading chart data: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!chartData.length) {
    return (
      <Card className={className}>
        <CardHeader>Lead Source Distribution</CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No lead source data available for the selected date range
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <h3 className="text-lg font-semibold">Lead Source Distribution</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Distribution of leads by acquisition source
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="50%"
                outerRadius="80%"
                paddingAngle={2}
                role="img"
                aria-label="Lead source distribution pie chart"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="transparent"
                    className="transition-opacity hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{ outline: 'none' }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                layout="horizontal"
                formatter={(value: string) => (
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};