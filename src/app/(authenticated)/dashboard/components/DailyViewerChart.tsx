'use client';

import React from 'react';
import { Paper, Typography, Box, CircularProgress } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  DotProps as RechartsDotsProps,
} from 'recharts';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { utcDateToLocalDate } from '@/utils/dateUtils';

interface DailyViewerAverage {
  date: string;
  average_viewers: number;
}

interface DailyViewerChartProps {
  data: DailyViewerAverage[];
  isLoading: boolean;
  error?: any;
}

interface ChartDataPoint {
  hasData: boolean;
  average_viewers: number;
  date: string;
  formattedDate: string;
}

interface TooltipPayload {
  value: number;
  payload: ChartDataPoint;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

// Use recharts' DotProps for better type safety
interface CustomDotProps extends RechartsDotsProps {
  payload?: ChartDataPoint;
}

// Memoized dot component to prevent unnecessary re-renders
const CustomDot = React.memo<CustomDotProps>(({ cx, cy, payload }) => {
  const hasData = payload?.hasData ?? false;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={hasData ? '#2196f3' : '#ccc'}
      stroke={hasData ? '#2196f3' : '#999'}
      strokeWidth={hasData ? 2 : 1}
      opacity={hasData ? 1 : 0.6}
    />
  );
});

CustomDot.displayName = 'CustomDot';

export function DailyViewerChart({ data, isLoading, error }: DailyViewerChartProps) {
  /**
   * Convert the UTC dates returned from the backend (YYYY-MM-DD in UTC) into
   * the user's **local** dates so the chart aligns with the browser timezone.
   * If multiple UTC dates map to the same local date (edge-case around UTC
   * midnight), we sum their viewer counts.
   */
  const processedData = React.useMemo<DailyViewerAverage[]>(() => {
    if (!data || data.length === 0) return [];

    const map = new Map<string, number>();

    data.forEach(item => {
      const localDate = utcDateToLocalDate(item.date); // YYYY-MM-DD local
      map.set(localDate, (map.get(localDate) || 0) + item.average_viewers);
    });

    return Array.from(map.entries())
      .map(([date, average_viewers]) => ({ date, average_viewers }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  // Pre-compute empty days using processed (local) data
  const hasEmptyDays = React.useMemo(() => {
    return processedData.some(item => item.average_viewers === 0);
  }, [processedData]);

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Daily Average Viewers
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error || processedData.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Daily Average Viewers
        </Typography>
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography color="textSecondary">
            {error ? 'Error loading chart data' : 'No data available for the last 30 days'}
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Calculate trend with proper guards against insufficient data
  let isPositiveTrend = false;
  let trendPercentage = 0;
  let hasValidTrend = false;

  // Guard: Need at least 14 days of total data for meaningful 14-day comparison
  if (processedData.length >= 14) {
    // CRITICAL: Ensure data is chronologically sorted (oldest → newest) before slicing
    // Without this, reversed arrays would invert trend calculations completely
    // Parse dates as UTC to prevent timezone-based date shifts
    const sortedData = [...processedData]; // already sorted chronologically

    const firstHalfData = sortedData.slice(0, 14); // Oldest 14 days
    const lastHalfData = sortedData.slice(-14); // Newest 14 days

    // Only calculate averages from days with actual data to avoid dilution from zero days
    const firstHalfWithData = firstHalfData.filter(item => item.average_viewers > 0);
    const lastHalfWithData = lastHalfData.filter(item => item.average_viewers > 0);

    const firstHalfAvg =
      firstHalfWithData.length > 0
        ? firstHalfWithData.reduce((sum, item) => sum + item.average_viewers, 0) /
          firstHalfWithData.length
        : 0;

    const lastHalfAvg =
      lastHalfWithData.length > 0
        ? lastHalfWithData.reduce((sum, item) => sum + item.average_viewers, 0) /
          lastHalfWithData.length
        : 0;

    // Guard: Need actual data in both halves for meaningful comparison
    if (firstHalfWithData.length > 0 && lastHalfWithData.length > 0) {
      isPositiveTrend = lastHalfAvg > firstHalfAvg;
      trendPercentage = ((lastHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      hasValidTrend = true;
    } else if (firstHalfWithData.length === 0 && lastHalfWithData.length > 0) {
      // Special case: No data in first half, some data in second half
      isPositiveTrend = true;
      trendPercentage = 100; // Cap at 100% to avoid infinity
      hasValidTrend = true;
    } else if (firstHalfWithData.length > 0 && lastHalfWithData.length === 0) {
      // Special case: Data in first half, none in second half
      isPositiveTrend = false;
      trendPercentage = -100; // Cap at -100% to avoid negative infinity
      hasValidTrend = true;
    }
    // If both halves have no data, keep defaults (hasValidTrend = false)
  }

  // Determine trend significance (grey for changes < 3%)
  const isSignificantTrend = Math.abs(trendPercentage) >= 3;

  // Format data for the chart with improved date handling and guaranteed sorting
  const chartData = processedData.map(item => {
    const dateObj = new Date(item.date + 'T00:00:00'); // Parse as local date
    return {
      ...item,
      formattedDate: dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      hasData: item.average_viewers > 0,
    };
  });

  // Custom tooltip with data quality indicators
  const CustomTooltip = ({ active, payload: dataPoints, label }: TooltipProps) => {
    if (active && dataPoints && dataPoints.length > 0) {
      // Safe access with optional chaining to prevent runtime errors
      const value = dataPoints?.[0]?.value ?? 0;
      const hasData = dataPoints?.[0]?.payload?.hasData ?? false;

      return (
        <Paper
          sx={{ p: 1, backgroundColor: 'background.paper', border: 1, borderColor: 'divider' }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {label}
          </Typography>
          {hasData ? (
            <Typography variant="body2" color="primary.main">
              {value.toLocaleString()} avg viewers
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No streaming activity
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Daily Average Viewers (30 days)</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {hasValidTrend ? (
            isSignificantTrend ? (
              isPositiveTrend ? (
                <TrendingUp sx={{ color: 'success.main' }} />
              ) : (
                <TrendingDown sx={{ color: 'error.main' }} />
              )
            ) : (
              <TrendingUp sx={{ color: 'text.secondary' }} />
            )
          ) : (
            <TrendingUp sx={{ color: 'text.disabled' }} />
          )}
          <Typography
            variant="body2"
            color={
              hasValidTrend
                ? isSignificantTrend
                  ? isPositiveTrend
                    ? 'success.main'
                    : 'error.main'
                  : 'text.secondary'
                : 'text.disabled'
            }
            sx={{ fontWeight: 'bold' }}
          >
            {hasValidTrend
              ? `${trendPercentage >= 0 ? '+' : ''}${Math.round(trendPercentage)}% trend`
              : 'Insufficient data'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ height: 300, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="formattedDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
              tickFormatter={value => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="average_viewers"
              stroke="#2196f3"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 6, fill: '#1976d2' }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        Average live viewers per day over the last 30 days. Days with no streaming activity show as
        zero.
        {hasEmptyDays && (
          <span style={{ fontStyle: 'italic' }}> Grayed dots indicate days without streams.</span>
        )}{' '}
        {hasValidTrend
          ? 'Trend is calculated by comparing the first 14 days vs the last 14 days.'
          : 'Trend calculation requires at least 14 days of data with streaming activity in both periods.'}
      </Typography>
    </Paper>
  );
}
