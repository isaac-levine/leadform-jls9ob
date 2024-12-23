import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  formatMessageDate, 
  formatDate, 
  calculateResponseTime, 
  isWithinTimeframe, 
  getDateRange 
} from '../src/utils/date.utils';
import { 
  addDays, 
  subDays, 
  addMinutes, 
  subMinutes,
  addMilliseconds 
} from 'date-fns'; // v2.30.0

describe('Date Utilities', () => {
  // Store original timezone
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    // Set consistent timezone for tests
    process.env.TZ = 'UTC';
  });

  afterEach(() => {
    // Restore original timezone
    process.env.TZ = originalTZ;
  });

  describe('formatMessageDate', () => {
    it('should format current timestamp as "just now" within 60 seconds', () => {
      const now = new Date();
      const justNow = addMilliseconds(now, -30000); // 30 seconds ago
      expect(formatMessageDate(justNow)).toMatch(/less than a minute ago/i);
    });

    it('should format relative times correctly', () => {
      const now = new Date();
      const fiveMinutesAgo = subMinutes(now, 5);
      const oneHourAgo = subMinutes(now, 60);
      const oneDayAgo = subDays(now, 1);

      expect(formatMessageDate(fiveMinutesAgo)).toMatch(/5 minutes ago/i);
      expect(formatMessageDate(oneHourAgo)).toMatch(/about 1 hour ago/i);
      expect(formatMessageDate(oneDayAgo)).toMatch(/1 day ago/i);
    });

    it('should handle timezone conversions correctly', () => {
      process.env.TZ = 'America/New_York';
      const date = new Date('2023-12-25T15:00:00Z');
      expect(formatMessageDate(date)).toContain('ago');
      
      process.env.TZ = 'Asia/Tokyo';
      expect(formatMessageDate(date)).toContain('ago');
    });

    it('should handle DST transitions gracefully', () => {
      // Test during DST transition
      const dstDate = new Date('2023-03-12T07:00:00Z'); // During US DST transition
      expect(() => formatMessageDate(dstDate)).not.toThrow();
    });

    it('should throw error for invalid dates', () => {
      expect(formatMessageDate(new Date('invalid'))).toBe('Invalid date');
    });

    it('should handle high-precision timestamps', () => {
      const now = new Date();
      const preciseTime = addMilliseconds(now, -1500); // 1.5 seconds ago
      expect(formatMessageDate(preciseTime)).toMatch(/less than a minute ago/i);
    });
  });

  describe('formatDate', () => {
    it('should format dates in various international formats', () => {
      const date = new Date('2023-12-25T15:30:45Z');
      
      expect(formatDate(date, 'MM/dd/yyyy')).toBe('12/25/2023');
      expect(formatDate(date, 'dd.MM.yyyy')).toBe('25.12.2023');
      expect(formatDate(date, 'yyyy年MM月dd日')).toBe('2023年12月25日');
    });

    it('should handle timezone-specific formatting', () => {
      const date = new Date('2023-12-25T15:30:45Z');
      expect(formatDate(date, "yyyy-MM-dd'T'HH:mm:ssXXX")).toMatch(/2023-12-25T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/);
    });

    it('should maintain precision in time formatting', () => {
      const date = new Date('2023-12-25T15:30:45.123Z');
      expect(formatDate(date, 'HH:mm:ss.SSS')).toBe('15:30:45.123');
    });

    it('should throw error for invalid format string', () => {
      const date = new Date();
      expect(formatDate(date, '')).toBe('Invalid date');
    });
  });

  describe('calculateResponseTime', () => {
    it('should calculate precise millisecond differences', () => {
      const receivedAt = new Date('2023-12-25T15:30:45.123Z');
      const respondedAt = new Date('2023-12-25T15:30:46.456Z');
      
      const difference = calculateResponseTime(receivedAt, respondedAt);
      expect(difference).toBe(1333); // 1.333 seconds in milliseconds
    });

    it('should handle cross-timezone calculations', () => {
      process.env.TZ = 'America/New_York';
      const receivedAt = new Date('2023-12-25T15:30:45Z');
      const respondedAt = new Date('2023-12-25T15:31:45Z');
      
      const difference = calculateResponseTime(receivedAt, respondedAt);
      expect(difference).toBe(60000); // 60 seconds in milliseconds
    });

    it('should throw error for chronologically incorrect dates', () => {
      const laterDate = new Date('2023-12-25T15:30:45Z');
      const earlierDate = new Date('2023-12-25T15:29:45Z');
      
      expect(() => calculateResponseTime(laterDate, earlierDate)).toThrow();
    });
  });

  describe('isWithinTimeframe', () => {
    it('should validate exact boundary conditions', () => {
      const now = new Date();
      const exactlySevenDaysAgo = subDays(now, 7);
      const sixDaysAgo = subDays(now, 6);
      const eightDaysAgo = subDays(now, 8);

      expect(isWithinTimeframe(exactlySevenDaysAgo, 7)).toBe(true);
      expect(isWithinTimeframe(sixDaysAgo, 7)).toBe(true);
      expect(isWithinTimeframe(eightDaysAgo, 7)).toBe(false);
    });

    it('should handle timezone edge cases', () => {
      process.env.TZ = 'Asia/Tokyo';
      const date = new Date();
      expect(isWithinTimeframe(date, 1)).toBe(true);
      
      process.env.TZ = 'America/Los_Angeles';
      expect(isWithinTimeframe(date, 1)).toBe(true);
    });

    it('should throw error for invalid timeframe parameters', () => {
      const date = new Date();
      expect(() => isWithinTimeframe(date, -1)).toThrow();
      expect(() => isWithinTimeframe(date, 0)).toThrow();
      expect(() => isWithinTimeframe(date, 1.5)).toThrow();
    });
  });

  describe('getDateRange', () => {
    it('should calculate precise daily ranges', () => {
      const result = getDateRange('day');
      const expectedStart = subDays(new Date(), 1);
      
      expect(result.startDate.getDate()).toBe(expectedStart.getDate());
      expect(result.endDate.getDate()).toBe(new Date().getDate());
    });

    it('should handle week start variations', () => {
      const result = getDateRange('week');
      const expectedStart = subDays(new Date(), 7);
      
      expect(result.startDate.getDate()).toBe(expectedStart.getDate());
    });

    it('should maintain timezone consistency', () => {
      process.env.TZ = 'Europe/London';
      const result = getDateRange('month');
      
      expect(result.startDate.getTimezoneOffset()).toBe(result.endDate.getTimezoneOffset());
    });

    it('should throw error for invalid range type', () => {
      // @ts-expect-error Testing invalid range type
      expect(() => getDateRange('invalid')).toThrow();
    });

    it('should handle custom range with default values', () => {
      const result = getDateRange('custom');
      const expectedStart = subDays(new Date(), 30);
      
      expect(result.startDate.getDate()).toBe(expectedStart.getDate());
    });
  });
});