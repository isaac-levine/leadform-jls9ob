/**
 * @file Test suite for frontend validation utilities
 * @version 1.0.0
 * @description Comprehensive tests for form field validation including security and data protection
 */

import { describe, test, expect } from '@jest/globals'; // ^29.0.0
import {
  validateFormField,
  validateEmail,
  validatePhone,
  validateUrl,
  createFieldSchema,
} from '../../src/utils/validation.utils';
import { FormFieldType } from '../../src/types/form.types';

describe('validateFormField', () => {
  test('should validate required fields correctly', () => {
    const validation = { required: true };
    
    expect(validateFormField('', FormFieldType.TEXT, validation))
      .toEqual({ isValid: false, error: 'This field is required' });
    
    expect(validateFormField('test', FormFieldType.TEXT, validation))
      .toEqual({ isValid: true });
  });

  test('should validate optional fields correctly', () => {
    const validation = { required: false };
    
    expect(validateFormField('', FormFieldType.TEXT, validation))
      .toEqual({ isValid: true });
    
    expect(validateFormField('test', FormFieldType.TEXT, validation))
      .toEqual({ isValid: true });
  });

  test('should validate length constraints', () => {
    const validation = { 
      required: true,
      minLength: 3,
      maxLength: 10
    };

    expect(validateFormField('ab', FormFieldType.TEXT, validation))
      .toEqual({ isValid: false, error: 'Minimum length is 3 characters' });

    expect(validateFormField('abcdefghijk', FormFieldType.TEXT, validation))
      .toEqual({ isValid: false, error: 'Maximum length is 10 characters' });

    expect(validateFormField('abcdef', FormFieldType.TEXT, validation))
      .toEqual({ isValid: true });
  });

  test('should sanitize input for XSS prevention', () => {
    const validation = { required: true };
    
    expect(validateFormField('<script>alert("xss")</script>', FormFieldType.TEXT, validation))
      .toEqual({ isValid: true });
    
    const sanitizedResult = validateFormField('test<>alert', FormFieldType.TEXT, validation);
    expect(sanitizedResult.isValid).toBe(true);
  });

  test('should validate custom patterns', () => {
    const validation = {
      required: true,
      pattern: '^[A-Z]{3}\\d{3}$',
      customError: 'Must be 3 uppercase letters followed by 3 numbers'
    };

    expect(validateFormField('ABC123', FormFieldType.TEXT, validation))
      .toEqual({ isValid: true });

    expect(validateFormField('abc123', FormFieldType.TEXT, validation))
      .toEqual({ isValid: false, error: 'Must be 3 uppercase letters followed by 3 numbers' });
  });
});

describe('validateEmail', () => {
  test('should validate valid email addresses', () => {
    expect(validateEmail('test@example.com')).toEqual({ isValid: true });
    expect(validateEmail('user.name+tag@example.co.uk')).toEqual({ isValid: true });
    expect(validateEmail('test.email@subdomain.example.com')).toEqual({ isValid: true });
  });

  test('should reject invalid email addresses', () => {
    expect(validateEmail('')).toEqual({ isValid: false, error: 'Email is required' });
    expect(validateEmail('invalid.email')).toEqual({ isValid: false, error: 'Invalid email format' });
    expect(validateEmail('@example.com')).toEqual({ isValid: false, error: 'Invalid email format' });
    expect(validateEmail('test@')).toEqual({ isValid: false, error: 'Invalid email format' });
  });

  test('should validate email length constraints', () => {
    const longLocalPart = 'a'.repeat(65);
    const longDomain = 'a'.repeat(256);
    
    expect(validateEmail(`${longLocalPart}@example.com`))
      .toEqual({ isValid: false, error: 'Email address components exceed length limits' });
    
    expect(validateEmail(`test@${longDomain}.com`))
      .toEqual({ isValid: false, error: 'Email address components exceed length limits' });
  });

  test('should sanitize email input', () => {
    expect(validateEmail('test<script>@example.com'))
      .toEqual({ isValid: false, error: 'Invalid email format' });
  });
});

describe('validatePhone', () => {
  test('should validate valid E.164 phone numbers', () => {
    expect(validatePhone('+1234567890')).toEqual({ isValid: true });
    expect(validatePhone('+44123456789')).toEqual({ isValid: true });
    expect(validatePhone('+12345678901234')).toEqual({ isValid: true });
  });

  test('should reject invalid phone numbers', () => {
    expect(validatePhone('')).toEqual({ isValid: false, error: 'Phone number is required' });
    expect(validatePhone('1234567890')).toEqual({ 
      isValid: false, 
      error: 'Invalid phone number format. Must be in E.164 format (e.g., +1234567890)' 
    });
    expect(validatePhone('+123')).toEqual({ isValid: false, error: 'Phone number length is invalid' });
  });

  test('should handle phone numbers with spaces and hyphens', () => {
    expect(validatePhone('+1-234-567-8901')).toEqual({ isValid: true });
    expect(validatePhone('+1 234 567 8901')).toEqual({ isValid: true });
  });

  test('should validate phone number length', () => {
    expect(validatePhone('+1234567')).toEqual({ isValid: false, error: 'Phone number length is invalid' });
    expect(validatePhone('+123456789012345678')).toEqual({ isValid: false, error: 'Phone number length is invalid' });
  });
});

describe('validateUrl', () => {
  test('should validate valid URLs', () => {
    expect(validateUrl('https://example.com')).toEqual({ isValid: true });
    expect(validateUrl('http://subdomain.example.com/path')).toEqual({ isValid: true });
    expect(validateUrl('https://example.com/path?param=value')).toEqual({ isValid: true });
  });

  test('should reject invalid URLs', () => {
    expect(validateUrl('')).toEqual({ isValid: false, error: 'URL is required' });
    expect(validateUrl('not-a-url')).toEqual({ isValid: false, error: 'Invalid URL format' });
    expect(validateUrl('ftp://example.com')).toEqual({ isValid: false, error: 'Invalid URL format' });
  });

  test('should reject URLs with malicious protocols', () => {
    expect(validateUrl('javascript:alert(1)')).toEqual({ isValid: false, error: 'URL contains invalid protocols' });
    expect(validateUrl('data:text/html,<script>alert(1)</script>')).toEqual({ isValid: false, error: 'URL contains invalid protocols' });
    expect(validateUrl('vbscript:msgbox(1)')).toEqual({ isValid: false, error: 'URL contains invalid protocols' });
  });

  test('should handle URLs with special characters', () => {
    expect(validateUrl('https://example.com/path%20with%20spaces')).toEqual({ isValid: true });
    expect(validateUrl('https://example.com/path#fragment')).toEqual({ isValid: true });
  });
});

describe('createFieldSchema', () => {
  test('should create schema for required fields', () => {
    const schema = createFieldSchema(FormFieldType.TEXT, { required: true });
    
    expect(schema.safeParse('')).toMatchObject({ success: false });
    expect(schema.safeParse('test')).toMatchObject({ success: true });
  });

  test('should create schema for optional fields', () => {
    const schema = createFieldSchema(FormFieldType.TEXT, { required: false });
    
    expect(schema.safeParse('')).toMatchObject({ success: true });
    expect(schema.safeParse('test')).toMatchObject({ success: true });
  });

  test('should create schema with length constraints', () => {
    const schema = createFieldSchema(FormFieldType.TEXT, {
      required: true,
      minLength: 3,
      maxLength: 10
    });

    expect(schema.safeParse('ab')).toMatchObject({ success: false });
    expect(schema.safeParse('abcdefghijk')).toMatchObject({ success: false });
    expect(schema.safeParse('abcdef')).toMatchObject({ success: true });
  });

  test('should create schema for email validation', () => {
    const schema = createFieldSchema(FormFieldType.EMAIL, { required: true });
    
    expect(schema.safeParse('invalid-email')).toMatchObject({ success: false });
    expect(schema.safeParse('test@example.com')).toMatchObject({ success: true });
  });

  test('should create schema for phone validation', () => {
    const schema = createFieldSchema(FormFieldType.PHONE, { required: true });
    
    expect(schema.safeParse('123456789')).toMatchObject({ success: false });
    expect(schema.safeParse('+1234567890')).toMatchObject({ success: true });
  });

  test('should create schema for URL validation', () => {
    const schema = createFieldSchema(FormFieldType.URL, { required: true });
    
    expect(schema.safeParse('not-a-url')).toMatchObject({ success: false });
    expect(schema.safeParse('https://example.com')).toMatchObject({ success: true });
  });

  test('should create schema with custom pattern', () => {
    const schema = createFieldSchema(FormFieldType.TEXT, {
      required: true,
      pattern: '^[A-Z]{3}\\d{3}$',
      customError: 'Must be 3 uppercase letters followed by 3 numbers'
    });

    expect(schema.safeParse('abc123')).toMatchObject({ success: false });
    expect(schema.safeParse('ABC123')).toMatchObject({ success: true });
  });
});