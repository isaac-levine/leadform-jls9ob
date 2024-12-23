/**
 * Password Service - Handles secure password operations with comprehensive validation
 * @module PasswordService
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import { hashPassword, verifyPassword } from '../../utils/crypto.utils';
import { AppError } from '../../utils/error.utils';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS_CODES } from '../../constants/error.constants';

// Password policy constants
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Custom error messages for password validation
 */
const PASSWORD_ERROR_MESSAGES = {
  tooShort: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
  tooLong: `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`,
  pattern: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  required: 'Password is required',
  invalid: 'Invalid password format'
} as const;

/**
 * Service class for secure password operations with comprehensive validation
 */
export class PasswordService {
  private readonly passwordSchema: z.ZodString;

  constructor() {
    // Initialize password validation schema with custom error messages
    this.passwordSchema = z.string({
      required_error: PASSWORD_ERROR_MESSAGES.required,
      invalid_type_error: PASSWORD_ERROR_MESSAGES.invalid
    })
    .min(PASSWORD_MIN_LENGTH, { message: PASSWORD_ERROR_MESSAGES.tooShort })
    .max(PASSWORD_MAX_LENGTH, { message: PASSWORD_ERROR_MESSAGES.tooLong })
    .regex(PASSWORD_PATTERN, { message: PASSWORD_ERROR_MESSAGES.pattern });
  }

  /**
   * Validates password against security policy
   * @param {string} password - Password to validate
   * @returns {boolean} True if password is valid
   * @throws {AppError} If validation fails
   */
  private validatePassword(password: string): boolean {
    try {
      this.passwordSchema.parse(password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(
          error.errors[0].message,
          HTTP_STATUS_CODES.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          true
        );
      }
      throw new AppError(
        ERROR_MESSAGES.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true
      );
    }
  }

  /**
   * Securely hashes a password with validation
   * @param {string} password - Plain text password to hash
   * @returns {Promise<string>} Hashed password
   * @throws {AppError} If password is invalid or hashing fails
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      // Validate password against security policy
      this.validatePassword(password);

      // Hash password with timing attack protection
      const hashedPassword = await hashPassword(password);

      // Clear sensitive data from memory
      password = '';

      return hashedPassword;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        false
      );
    }
  }

  /**
   * Verifies a password against a stored hash with timing attack protection
   * @param {string} password - Plain text password to verify
   * @param {string} hashedPassword - Stored password hash to compare against
   * @returns {Promise<boolean>} True if password matches
   * @throws {AppError} If verification fails
   */
  public async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      // Validate inputs
      if (!password || !hashedPassword) {
        throw new AppError(
          'Password and hash must be provided',
          HTTP_STATUS_CODES.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          true
        );
      }

      // Verify password with constant-time comparison
      const isValid = await verifyPassword(password, hashedPassword);

      // Clear sensitive data from memory
      password = '';

      return isValid;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        false
      );
    }
  }
}