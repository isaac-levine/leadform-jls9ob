import { format, parseISO, differenceInMilliseconds, addDays } from 'date-fns'; // v2.30.0

/**
 * Cache for frequently used date formats to improve performance
 */
const formatCache = new Map<string, string>();

/**
 * Error messages for date utilities
 */
const ERROR_MESSAGES = {
  INVALID_DATE: 'Invalid date provided',
  INVALID_FORMAT: 'Invalid format string',
  INVALID_RANGE: 'Invalid date range',
  NEGATIVE_DIFFERENCE: 'Negative time difference calculated',
  INVALID_TIMEFRAME: 'Invalid timeframe parameter',
} as const;

/**
 * Interface for date formatting options
 */
interface DateFormatOptions {
  locale?: Locale;
  useCache?: boolean;
  timezone?: string;
}

/**
 * Interface for timeframe checking options
 */
interface TimeframeOptions {
  includeDST?: boolean;
  strict?: boolean;
}

/**
 * Interface for date range options
 */
interface DateRangeOptions {
  timezone?: string;
  inclusive?: boolean;
}

/**
 * Interface for date range result
 */
interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Validates a date object or string
 * @param date Date to validate
 * @returns boolean indicating if date is valid
 */
const isValidDate = (date: Date | string): boolean => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

/**
 * Decorator for input validation
 */
function validateInput(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    if (!args[0] || !isValidDate(args[0])) {
      throw new Error(ERROR_MESSAGES.INVALID_DATE);
    }
    return originalMethod.apply(this, args);
  };
  return descriptor;
}

/**
 * Memoization decorator for caching results
 */
function memoize(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const cache = new Map();
  
  descriptor.value = function (...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = originalMethod.apply(this, args);
    cache.set(key, result);
    return result;
  };
  return descriptor;
}

/**
 * Formats a date object or ISO string into a specified format
 * @param date Date object or ISO string to format
 * @param formatString Format pattern to apply
 * @param options Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  formatString: string,
  options: DateFormatOptions = {}
): string {
  try {
    if (!isValidDate(date)) {
      throw new Error(ERROR_MESSAGES.INVALID_DATE);
    }

    const { useCache = true, locale } = options;
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const cacheKey = `${dateObj.getTime()}-${formatString}-${locale?.code || 'default'}`;

    if (useCache && formatCache.has(cacheKey)) {
      return formatCache.get(cacheKey)!;
    }

    const formatted = format(dateObj, formatString, { locale });

    if (useCache) {
      formatCache.set(cacheKey, formatted);
    }

    return formatted;
  } catch (error) {
    throw new Error(`Error formatting date: ${error.message}`);
  }
}

/**
 * Calculates precise time difference between message received and response
 * @param receivedAt Timestamp when message was received
 * @param respondedAt Timestamp when response was sent
 * @returns Time difference in milliseconds
 */
export function calculateResponseTime(receivedAt: Date, respondedAt: Date): number {
  try {
    if (!isValidDate(receivedAt) || !isValidDate(respondedAt)) {
      throw new Error(ERROR_MESSAGES.INVALID_DATE);
    }

    const difference = differenceInMilliseconds(respondedAt, receivedAt);
    
    if (difference < 0) {
      throw new Error(ERROR_MESSAGES.NEGATIVE_DIFFERENCE);
    }

    return difference;
  } catch (error) {
    throw new Error(`Error calculating response time: ${error.message}`);
  }
}

/**
 * Checks if a date falls within a specified timeframe from now
 * @param date Date to check
 * @param days Number of days in timeframe
 * @param options Timeframe checking options
 * @returns Boolean indicating if date is within timeframe
 */
export function isWithinTimeframe(
  date: Date,
  days: number,
  options: TimeframeOptions = {}
): boolean {
  try {
    if (!isValidDate(date) || typeof days !== 'number' || days < 0) {
      throw new Error(ERROR_MESSAGES.INVALID_TIMEFRAME);
    }

    const { includeDST = true, strict = false } = options;
    const now = new Date();
    const boundary = addDays(now, -days);

    if (includeDST) {
      const dateUTC = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds()
      );
      const boundaryUTC = Date.UTC(
        boundary.getUTCFullYear(),
        boundary.getUTCMonth(),
        boundary.getUTCDate(),
        boundary.getUTCHours(),
        boundary.getUTCMinutes(),
        boundary.getUTCSeconds()
      );
      return strict ? dateUTC >= boundaryUTC : dateUTC >= boundaryUTC;
    }

    return strict ? date >= boundary : date >= boundary;
  } catch (error) {
    throw new Error(`Error checking timeframe: ${error.message}`);
  }
}

/**
 * Converts a date string or object to UTC
 * @param date Date to convert
 * @param options Parsing options
 * @returns UTC Date object
 */
@validateInput
export function parseToUTC(date: Date | string, options: { timezone?: string } = {}): Date {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const { timezone } = options;

    if (timezone) {
      // Convert to specified timezone
      const tzOffset = new Date().getTimezoneOffset();
      return new Date(dateObj.getTime() + tzOffset * 60 * 1000);
    }

    return new Date(Date.UTC(
      dateObj.getUTCFullYear(),
      dateObj.getUTCMonth(),
      dateObj.getUTCDate(),
      dateObj.getUTCHours(),
      dateObj.getUTCMinutes(),
      dateObj.getUTCSeconds(),
      dateObj.getUTCMilliseconds()
    ));
  } catch (error) {
    throw new Error(`Error parsing to UTC: ${error.message}`);
  }
}

/**
 * Generates start and end dates for analytics
 * @param range Range specification (day, week, month, year, custom)
 * @param options Range generation options
 * @returns Object containing start and end dates
 */
@memoize
export function getDateRange(range: string, options: DateRangeOptions = {}): DateRange {
  try {
    const { inclusive = true } = options;
    const now = new Date();
    let startDate: Date;

    switch (range.toLowerCase()) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = addDays(now, -7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        throw new Error(ERROR_MESSAGES.INVALID_RANGE);
    }

    const endDate = inclusive ? new Date(now.setHours(23, 59, 59, 999)) : now;

    return {
      startDate: parseToUTC(startDate),
      endDate: parseToUTC(endDate)
    };
  } catch (error) {
    throw new Error(`Error generating date range: ${error.message}`);
  }
}