/**
 * Phone number utility library for validation, formatting and handling
 * Uses libphonenumber-js v1.10.0 for core phone number operations
 * @module lib/phone
 */

import { parsePhoneNumber, PhoneNumber } from 'libphonenumber-js'; // v1.10.0

// Types for function returns
interface PhoneParseResult {
  isValid: boolean;
  error?: string;
  parsedNumber?: PhoneNumber;
  countryCode?: string;
}

// Cache for formatted numbers to improve performance
const formatCache = new Map<string, string | null>();

/**
 * Formats a phone number string to E.164 format for consistent API submission
 * @param phoneNumber - The phone number string to format
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')
 * @returns Formatted E.164 phone number or null if invalid
 */
export const formatPhoneNumber = (
  phoneNumber: string,
  countryCode: string
): string | null => {
  // Check cache first
  const cacheKey = `${phoneNumber}-${countryCode}`;
  if (formatCache.has(cacheKey)) {
    return formatCache.get(cacheKey) || null;
  }

  try {
    // Sanitize input by removing non-numeric characters except '+'
    const sanitizedNumber = phoneNumber.replace(/[^\d+]/g, '');

    // Basic length validation
    if (sanitizedNumber.length < 8 || sanitizedNumber.length > 15) {
      return null;
    }

    // Parse number using libphonenumber-js
    const parsedNumber = parsePhoneNumber(sanitizedNumber, countryCode);
    
    if (!parsedNumber || !parsedNumber.isPossible()) {
      return null;
    }

    // Format to E.164 and cache result
    const formattedNumber = parsedNumber.format('E.164');
    formatCache.set(cacheKey, formattedNumber);
    return formattedNumber;
  } catch (error) {
    return null;
  }
};

/**
 * Comprehensive phone number validation with multiple validation rules
 * @param phoneNumber - The phone number string to validate
 * @returns boolean indicating if the phone number is valid
 */
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  try {
    // Sanitize input
    const sanitizedNumber = phoneNumber.replace(/[^\d+]/g, '');

    // Length validation
    if (sanitizedNumber.length < 8 || sanitizedNumber.length > 15) {
      return false;
    }

    // Parse and validate number
    const parsedNumber = parsePhoneNumber(sanitizedNumber);
    
    if (!parsedNumber) {
      return false;
    }

    return (
      parsedNumber.isPossible() &&
      parsedNumber.isValid() &&
      // Ensure country code is valid
      parsedNumber.country !== undefined &&
      // Verify number type (exclude premium rate, shared cost, etc.)
      ['MOBILE', 'FIXED_LINE', 'FIXED_LINE_OR_MOBILE'].includes(parsedNumber.getType() || '')
    );
  } catch (error) {
    return false;
  }
};

/**
 * Formats phone numbers into user-friendly display format
 * @param phoneNumber - The phone number string to format
 * @returns Formatted phone number string for display or original input if invalid
 */
export const formatPhoneNumberForDisplay = (phoneNumber: string): string => {
  try {
    if (!validatePhoneNumber(phoneNumber)) {
      return phoneNumber; // Return original if invalid
    }

    const parsedNumber = parsePhoneNumber(phoneNumber);
    
    if (!parsedNumber) {
      return phoneNumber;
    }

    // Format with national format if possible, otherwise international
    const formattedNumber = parsedNumber.formatInternational();
    
    // Escape output to prevent XSS
    return formattedNumber
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  } catch (error) {
    return phoneNumber;
  }
};

/**
 * Advanced phone number parsing with detailed error information
 * @param phoneNumber - The phone number string to parse
 * @returns Object containing validation status and error details
 */
export const parsePhoneNumberWithError = (phoneNumber: string): PhoneParseResult => {
  try {
    // Attempt to parse number
    const parsedNumber = parsePhoneNumber(phoneNumber);

    if (!parsedNumber) {
      return {
        isValid: false,
        error: 'Failed to parse phone number'
      };
    }

    // Validate number format and structure
    if (!parsedNumber.isPossible()) {
      return {
        isValid: false,
        error: 'Phone number format is not possible for any region',
        parsedNumber
      };
    }

    if (!parsedNumber.isValid()) {
      return {
        isValid: false,
        error: 'Phone number is not valid',
        parsedNumber
      };
    }

    // Check country code
    if (!parsedNumber.country) {
      return {
        isValid: false,
        error: 'Could not determine country code',
        parsedNumber
      };
    }

    // Return successful parse result
    return {
      isValid: true,
      parsedNumber,
      countryCode: parsedNumber.country
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};