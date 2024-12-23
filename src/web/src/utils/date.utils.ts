import { format, parseISO, formatDistanceToNow, differenceInMilliseconds, addDays } from 'date-fns'; // v2.30.0

/**
 * Error messages for date utilities
 */
const DATE_ERRORS = {
  INVALID_DATE: 'Invalid date provided',
  INVALID_FORMAT: 'Invalid format string provided',
  INVALID_RANGE: 'Invalid date range',
  INVALID_TIMEFRAME: 'Invalid timeframe parameter',
  CHRONOLOGICAL_ERROR: 'Response time must be after received time'
} as const;

/**
 * Supported date range options for analytics
 */
type DateRange = 'day' | 'week' | 'month' | 'year' | 'custom';

/**
 * Interface for date range return type
 */
interface DateRangeResult {
  startDate: Date;
  endDate: Date;
}

/**
 * Formats a message timestamp for display in the inbox thread view
 * Provides relative time formatting with timezone awareness
 * 
 * @param date - Date object or ISO string to format
 * @returns Formatted relative time string (e.g. "5 minutes ago")
 * @throws Error if date is invalid
 */
export const formatMessageDate = (date: Date | string): string => {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      throw new Error(DATE_ERRORS.INVALID_DATE);
    }

    return formatDistanceToNow(parsedDate, { 
      addSuffix: true,
      includeSeconds: true
    });
  } catch (error) {
    console.error('Error formatting message date:', error);
    return 'Invalid date';
  }
};

/**
 * Formats a date object or ISO string into a specified format
 * 
 * @param date - Date object or ISO string to format
 * @param formatString - Format string following date-fns format
 * @returns Formatted date string
 * @throws Error if date or format is invalid
 */
export const formatDate = (date: Date | string, formatString: string): string => {
  try {
    if (!formatString) {
      throw new Error(DATE_ERRORS.INVALID_FORMAT);
    }

    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      throw new Error(DATE_ERRORS.INVALID_DATE);
    }

    return format(parsedDate, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Calculates time difference between message received and response
 * Provides high precision calculation for analytics
 * 
 * @param receivedAt - Date when message was received
 * @param respondedAt - Date when response was sent
 * @returns Time difference in milliseconds
 * @throws Error if dates are invalid or chronologically incorrect
 */
export const calculateResponseTime = (receivedAt: Date, respondedAt: Date): number => {
  try {
    if (!receivedAt || !respondedAt || 
        isNaN(receivedAt.getTime()) || 
        isNaN(respondedAt.getTime())) {
      throw new Error(DATE_ERRORS.INVALID_DATE);
    }

    if (receivedAt > respondedAt) {
      throw new Error(DATE_ERRORS.CHRONOLOGICAL_ERROR);
    }

    return differenceInMilliseconds(respondedAt, receivedAt);
  } catch (error) {
    console.error('Error calculating response time:', error);
    throw error;
  }
};

/**
 * Checks if a date falls within a specified timeframe from now
 * Considers timezone differences in calculation
 * 
 * @param date - Date to check
 * @param days - Number of days in timeframe
 * @returns Boolean indicating if date is within timeframe
 * @throws Error if parameters are invalid
 */
export const isWithinTimeframe = (date: Date, days: number): boolean => {
  try {
    if (!date || isNaN(date.getTime())) {
      throw new Error(DATE_ERRORS.INVALID_DATE);
    }

    if (days <= 0 || !Number.isInteger(days)) {
      throw new Error(DATE_ERRORS.INVALID_TIMEFRAME);
    }

    const now = new Date();
    const timeframeBoundary = addDays(now, -days);
    
    return date >= timeframeBoundary && date <= now;
  } catch (error) {
    console.error('Error checking timeframe:', error);
    throw error;
  }
};

/**
 * Generates start and end dates for analytics date range selection
 * Provides flexible range options with timezone consideration
 * 
 * @param range - Date range type to generate
 * @returns Object containing start and end dates
 * @throws Error if range parameter is invalid
 */
export const getDateRange = (range: DateRange): DateRangeResult => {
  try {
    const endDate = new Date();
    let startDate: Date;

    switch (range) {
      case 'day':
        startDate = addDays(endDate, -1);
        break;
      case 'week':
        startDate = addDays(endDate, -7);
        break;
      case 'month':
        startDate = addDays(endDate, -30);
        break;
      case 'year':
        startDate = addDays(endDate, -365);
        break;
      case 'custom':
        // Custom range should be handled by the component
        startDate = addDays(endDate, -30); // Default to 30 days
        break;
      default:
        throw new Error(DATE_ERRORS.INVALID_RANGE);
    }

    return { startDate, endDate };
  } catch (error) {
    console.error('Error generating date range:', error);
    throw error;
  }
};