/**
 * Phone number utility functions for validation, formatting, and metadata extraction.
 * Implements secure phone number handling with E.164 compliance and international support.
 * 
 * @module phone.utils
 * @version 1.0.0
 * @security This module implements critical input validation - any changes require security review
 */

import { parsePhoneNumber, type PhoneNumber } from 'libphonenumber-js'; // v1.10.0
import { PHONE_REGEX } from '../constants/regex.constants';

/**
 * Error messages for phone number validation
 * @internal
 */
const ERROR_MESSAGES = {
  INVALID_INPUT: 'Invalid phone number input',
  INVALID_COUNTRY: 'Invalid country code',
  NORMALIZATION_FAILED: 'Phone number normalization failed',
  PARSING_FAILED: 'Failed to parse phone number'
} as const;

/**
 * Phone number metadata interface
 * @internal
 */
interface PhoneNumberMetadata {
  countryCode: string;
  nationalNumber: string;
  type: string | undefined;
  valid: boolean;
  formatted: string;
  carrier?: string;
}

/**
 * Formats a phone number to E.164 format with comprehensive validation
 * 
 * @param {string} phoneNumber - Raw phone number input
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
 * @returns {string | null} Formatted E.164 phone number or null if invalid
 * @throws {Error} If country code is invalid
 * 
 * @security Implements input sanitization and validation
 */
export const formatPhoneNumber = (phoneNumber: string, countryCode: string): string | null => {
  try {
    // Sanitize input by removing non-numeric characters except leading +
    const sanitizedNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Basic input validation
    if (!sanitizedNumber) {
      return null;
    }

    // Parse and validate using libphonenumber-js
    const parsedNumber = parsePhoneNumber(sanitizedNumber, countryCode.toUpperCase());
    
    if (!parsedNumber?.isValid()) {
      return null;
    }

    // Format to E.164 and validate against regex
    const formattedNumber = parsedNumber.format('E.164');
    if (!PHONE_REGEX.test(formattedNumber)) {
      return null;
    }

    return formattedNumber;
  } catch (error) {
    // Log error for monitoring but don't expose details
    console.error('Phone formatting error:', { countryCode, error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
};

/**
 * Performs comprehensive validation of phone numbers
 * 
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if phone number is valid and secure
 * 
 * @security Implements multiple validation layers for security
 */
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  try {
    // Initial regex validation
    if (!PHONE_REGEX.test(phoneNumber)) {
      return false;
    }

    // Deep validation using libphonenumber-js
    const parsedNumber = parsePhoneNumber(phoneNumber);
    if (!parsedNumber?.isValid()) {
      return false;
    }

    // Additional security checks
    const numberLength = parsedNumber.nationalNumber.length;
    if (numberLength < 6 || numberLength > 15) {
      return false;
    }

    // Verify country code is valid
    if (!parsedNumber.country) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Phone validation error:', { phoneNumber, error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
};

/**
 * Normalizes phone numbers to E.164 format with strict validation
 * 
 * @param {string} phoneNumber - Phone number to normalize
 * @returns {string} Normalized phone number in E.164 format
 * @throws {Error} If normalization fails
 * 
 * @security Implements strict input validation and sanitization
 */
export const normalizePhoneNumber = (phoneNumber: string): string => {
  try {
    // Remove all non-numeric characters except leading +
    const sanitized = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure number starts with +
    const withPrefix = sanitized.startsWith('+') ? sanitized : `+${sanitized}`;
    
    // Validate using libphonenumber-js
    const parsed = parsePhoneNumber(withPrefix);
    if (!parsed?.isValid()) {
      throw new Error(ERROR_MESSAGES.NORMALIZATION_FAILED);
    }

    // Format and validate against regex
    const normalized = parsed.format('E.164');
    if (!PHONE_REGEX.test(normalized)) {
      throw new Error(ERROR_MESSAGES.NORMALIZATION_FAILED);
    }

    return normalized;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.NORMALIZATION_FAILED;
    throw new Error(errorMessage);
  }
};

/**
 * Retrieves comprehensive metadata about a phone number
 * 
 * @param {string} phoneNumber - Phone number to analyze
 * @returns {PhoneNumberMetadata | null} Detailed phone number metadata or null if invalid
 * 
 * @security Implements input validation before metadata extraction
 */
export const getPhoneNumberMetadata = (phoneNumber: string): PhoneNumberMetadata | null => {
  try {
    if (!validatePhoneNumber(phoneNumber)) {
      return null;
    }

    const parsed: PhoneNumber = parsePhoneNumber(phoneNumber);
    
    return {
      countryCode: parsed.countryCallingCode,
      nationalNumber: parsed.nationalNumber,
      type: parsed.getType(),
      valid: parsed.isValid(),
      formatted: parsed.format('E.164'),
      carrier: parsed.getCarrier() // Note: Carrier info not available for all numbers
    };
  } catch (error) {
    console.error('Metadata extraction error:', { phoneNumber, error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
};