// date-fns v2.30.0 - Production-grade date utilities
import { format, parseISO, formatDistanceToNow, differenceInMilliseconds, addDays } from 'date-fns';

// Custom error types for date handling
class DateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateValidationError';
  }
}

// Type definitions
type DateRange = {
  startDate: Date;
  endDate: Date;
};

// Memoization decorator implementation
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

// Input validation decorator
function validateInput(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    if (!args[0]) {
      throw new DateValidationError('Date parameter is required');
    }
    return originalMethod.apply(this, args);
  };
  return descriptor;
}

// Performance monitoring decorator
function performanceMetric(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    const start = performance.now();
    const result = originalMethod.apply(this, args);
    const end = performance.now();
    // Log performance metric if exceeds threshold
    if (end - start > 100) {
      console.warn(`Performance warning: ${propertyKey} took ${end - start}ms to execute`);
    }
    return result;
  };
  return descriptor;
}

/**
 * Formats a message timestamp for display with relative time
 * @param date - Date to format
 * @param timezone - Optional timezone string
 * @returns Formatted relative time string
 */
@memoize
export function formatMessageDate(date: Date | string, timezone?: string): string {
  try {
    const parsedDate = date instanceof Date ? date : parseISO(date);
    if (!isValidDate(parsedDate)) {
      throw new DateValidationError('Invalid date provided');
    }

    // Apply timezone offset if provided
    const dateWithTz = timezone ? 
      new Date(parsedDate.toLocaleString('en-US', { timeZone: timezone })) : 
      parsedDate;

    return formatDistanceToNow(dateWithTz, { 
      addSuffix: true,
      includeSeconds: true
    });
  } catch (error) {
    console.error('Error formatting message date:', error);
    return 'Invalid date';
  }
}

/**
 * Generic date formatter with format string support
 * @param date - Date to format
 * @param formatString - Format string pattern
 * @param locale - Optional locale string
 * @returns Formatted date string
 */
@validateInput
export function formatDate(date: Date | string, formatString: string, locale?: string): string {
  try {
    const parsedDate = date instanceof Date ? date : parseISO(date);
    if (!isValidDate(parsedDate)) {
      throw new DateValidationError('Invalid date provided');
    }

    return format(parsedDate, formatString, {
      locale: locale ? require(`date-fns/locale/${locale}`) : undefined
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Calculates response time between messages with high precision
 * @param receivedAt - Message received timestamp
 * @param respondedAt - Response timestamp
 * @returns Time difference in milliseconds
 */
@performanceMetric
export function calculateResponseTime(receivedAt: Date, respondedAt: Date): number {
  if (!isValidDate(receivedAt) || !isValidDate(respondedAt)) {
    throw new DateValidationError('Invalid date parameters');
  }

  if (receivedAt > respondedAt) {
    throw new DateValidationError('Received time cannot be after response time');
  }

  return differenceInMilliseconds(respondedAt, receivedAt);
}

/**
 * Checks if date falls within specified timeframe
 * @param date - Date to check
 * @param days - Number of days in timeframe
 * @param timezone - Optional timezone string
 * @returns Boolean indicating if date is within timeframe
 */
export function isWithinTimeframe(date: Date, days: number, timezone?: string): boolean {
  try {
    if (!isValidDate(date) || days < 0) {
      throw new DateValidationError('Invalid parameters');
    }

    const now = timezone ? 
      new Date(new Date().toLocaleString('en-US', { timeZone: timezone })) : 
      new Date();

    const boundary = addDays(now, -days);
    return date >= boundary && date <= now;
  } catch (error) {
    console.error('Error checking timeframe:', error);
    return false;
  }
}

/**
 * Generates date range for analytics
 * @param range - Range identifier (day, week, month, year)
 * @param timezone - Optional timezone string
 * @returns Object with start and end dates
 */
@memoize
export function getDateRange(range: string, timezone?: string): DateRange {
  try {
    const now = timezone ? 
      new Date(new Date().toLocaleString('en-US', { timeZone: timezone })) : 
      new Date();

    const ranges: { [key: string]: number } = {
      day: 1,
      week: 7,
      month: 30,
      year: 365
    };

    if (!(range in ranges)) {
      throw new DateValidationError('Invalid range specified');
    }

    return {
      startDate: addDays(now, -ranges[range]),
      endDate: now
    };
  } catch (error) {
    console.error('Error generating date range:', error);
    throw error;
  }
}

// Utility function to validate Date objects
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}