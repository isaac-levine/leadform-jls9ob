/**
 * @fileoverview Comprehensive unit tests for validation utility functions
 * @version 1.0.0
 * @module validation.test
 * 
 * @security These tests verify critical security controls for input validation.
 * Any modifications require security review.
 */

import {
  validatePhoneNumber,
  validateEmail,
  validatePassword,
  validateFormField,
  validateFormConfig,
  sanitizeInput
} from '../../src/utils/validation.utils';
import {
  PHONE_REGEX,
  EMAIL_REGEX,
  PASSWORD_REGEX
} from '../../src/constants/regex.constants';

// Test data constants
const VALID_PHONE_NUMBERS = [
  '+1234567890',
  '+44123456789',
  '+61234567890',
  '+8612345678901'
];

const INVALID_PHONE_NUMBERS = [
  '1234567890', // Missing +
  'abc',        // Non-numeric
  '+abc',       // Invalid format
  '+123',       // Too short
  '+12345678901234567' // Too long
];

const VALID_EMAILS = [
  'test@example.com',
  'user.name@domain.co.uk',
  'test+label@domain.com',
  'valid@subdomain.domain.org',
  'first.last@company.org'
];

const INVALID_EMAILS = [
  'test@',           // Missing domain
  '@domain.com',     // Missing local part
  'invalid',         // No @ symbol
  'test@.com',       // Missing domain part
  'test@domain',     // Missing TLD
  'test@domain..com' // Consecutive dots
];

const VALID_PASSWORDS = [
  'Test1234!',
  'Password123$',
  'Complex1!Password',
  'Secure123!@#'
];

const INVALID_PASSWORDS = [
  'test',         // Too short
  'password',     // No uppercase/numbers/special
  '12345678',     // No letters/special
  'Password',     // No numbers/special
  'password123',  // No uppercase/special
  'TEST1234!'     // No lowercase
];

describe('validatePhoneNumber', () => {
  it('should validate correct E.164 phone numbers', () => {
    VALID_PHONE_NUMBERS.forEach(phone => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.value).toBe(phone);
    });
  });

  it('should reject invalid phone numbers', () => {
    INVALID_PHONE_NUMBERS.forEach(phone => {
      const result = validatePhoneNumber(phone);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  it('should handle whitespace in phone numbers', () => {
    const result = validatePhoneNumber('  +1234567890  ');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('+1234567890');
  });

  it('should validate phone number length constraints', () => {
    const tooShort = validatePhoneNumber('+123');
    expect(tooShort.isValid).toBe(false);
    expect(tooShort.errors).toContain('Phone number must be between 8 and 15 characters');

    const tooLong = validatePhoneNumber('+123456789012345678');
    expect(tooLong.isValid).toBe(false);
    expect(tooLong.errors).toContain('Phone number must be between 8 and 15 characters');
  });
});

describe('validateEmail', () => {
  it('should validate correct email addresses', () => {
    VALID_EMAILS.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.value).toBe(email.toLowerCase());
    });
  });

  it('should reject invalid email addresses', () => {
    INVALID_EMAILS.forEach(email => {
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  it('should normalize email addresses', () => {
    const result = validateEmail('  Test.User@EXAMPLE.com  ');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('test.user@example.com');
  });

  it('should validate email length constraints', () => {
    const longLocalPart = 'a'.repeat(255) + '@example.com';
    const result = validateEmail(longLocalPart);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Email must not exceed 254 characters');
  });
});

describe('validatePassword', () => {
  it('should validate strong passwords', () => {
    VALID_PASSWORDS.forEach(password => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  it('should reject weak passwords', () => {
    INVALID_PASSWORDS.forEach(password => {
      const result = validatePassword(password);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  it('should validate password complexity requirements', () => {
    const result = validatePassword('password123');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain uppercase, lowercase, number, and special character');
  });

  it('should check password length constraints', () => {
    const tooShort = validatePassword('Ab1!');
    expect(tooShort.isValid).toBe(false);
    expect(tooShort.errors).toContain('Password must be at least 8 characters');

    const tooLong = validatePassword('A'.repeat(129) + 'b1!');
    expect(tooLong.isValid).toBe(false);
    expect(tooLong.errors).toContain('Password must not exceed 128 characters');
  });
});

describe('validateFormField', () => {
  const textField = {
    id: 'name',
    type: 'text' as const,
    label: 'Full Name',
    required: true
  };

  const emailField = {
    id: 'email',
    type: 'email' as const,
    label: 'Email Address',
    required: true
  };

  const phoneField = {
    id: 'phone',
    type: 'phone' as const,
    label: 'Phone Number',
    required: true
  };

  it('should validate required fields', () => {
    const result = validateFormField(textField, '');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Full Name is required');
  });

  it('should validate email fields', () => {
    const validResult = validateFormField(emailField, 'test@example.com');
    expect(validResult.isValid).toBe(true);

    const invalidResult = validateFormField(emailField, 'invalid-email');
    expect(invalidResult.isValid).toBe(false);
  });

  it('should validate phone fields', () => {
    const validResult = validateFormField(phoneField, '+1234567890');
    expect(validResult.isValid).toBe(true);

    const invalidResult = validateFormField(phoneField, '1234567890');
    expect(invalidResult.isValid).toBe(false);
  });

  it('should handle custom validation patterns', () => {
    const customField = {
      ...textField,
      validation: {
        pattern: '^[A-Z][a-z]+$'
      }
    };

    const validResult = validateFormField(customField, 'Name');
    expect(validResult.isValid).toBe(true);

    const invalidResult = validateFormField(customField, 'name');
    expect(invalidResult.isValid).toBe(false);
  });
});

describe('validateFormConfig', () => {
  const validConfig = {
    id: 'test-form',
    title: 'Test Form',
    version: '1.0.0',
    fields: [
      {
        id: 'name',
        type: 'text' as const,
        label: 'Name',
        required: true
      }
    ],
    settings: {
      submitLabel: 'Submit',
      successMessage: 'Success',
      errorMessage: 'Error'
    }
  };

  it('should validate correct form configurations', () => {
    const result = validateFormConfig(validConfig);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate form field count constraints', () => {
    const noFields = { ...validConfig, fields: [] };
    const result = validateFormConfig(noFields);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Form must have at least 1 field');
  });

  it('should detect duplicate field IDs', () => {
    const duplicateFields = {
      ...validConfig,
      fields: [
        { id: 'name', type: 'text' as const, label: 'Name', required: true },
        { id: 'name', type: 'text' as const, label: 'Name 2', required: true }
      ]
    };
    const result = validateFormConfig(duplicateFields);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Duplicate field ID found: name');
  });

  it('should validate field label constraints', () => {
    const longLabel = {
      ...validConfig,
      fields: [{
        ...validConfig.fields[0],
        label: 'A'.repeat(101)
      }]
    };
    const result = validateFormConfig(longLabel);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Field label exceeds maximum length: ' + longLabel.fields[0].label);
  });
});

describe('sanitizeInput', () => {
  it('should sanitize HTML content', () => {
    const input = '<script>alert("xss")</script>Hello<b>World</b>';
    const result = sanitizeInput(input, { allowHtml: false, trim: true });
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;Hello&lt;b&gt;World&lt;/b&gt;');
  });

  it('should handle whitespace trimming', () => {
    const input = '  test string  ';
    const result = sanitizeInput(input, { allowHtml: false, trim: true });
    expect(result).toBe('test string');
  });

  it('should enforce maximum length', () => {
    const input = 'test string';
    const result = sanitizeInput(input, { allowHtml: false, trim: true, maxLength: 4 });
    expect(result).toBe('test');
  });

  it('should apply lowercase transformation', () => {
    const input = 'Test String';
    const result = sanitizeInput(input, { allowHtml: false, trim: true, lowercase: true });
    expect(result).toBe('test string');
  });

  it('should handle custom sanitizer functions', () => {
    const input = 'test@string';
    const customSanitizer = (value: string) => value.replace('@', '-');
    const result = sanitizeInput(input, {
      allowHtml: false,
      trim: true,
      customSanitizer
    });
    expect(result).toBe('test-string');
  });
});