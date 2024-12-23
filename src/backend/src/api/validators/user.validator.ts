/**
 * @fileoverview User validation schemas with comprehensive security checks and sanitization
 * @version 1.0.0
 * @module api/validators/user.validator
 * 
 * @security This module implements critical security controls for user data validation.
 * Any modifications require security review.
 */

import { z } from 'zod'; // v3.0.0
import { UserRole } from '../../types/auth.types';
import { validateEmail, validatePassword } from '../../utils/validation.utils';

// Validation constants
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Base schema for name validation with sanitization
 */
const nameSchema = z.string()
  .min(MIN_NAME_LENGTH, `Name must be at least ${MIN_NAME_LENGTH} characters`)
  .max(MAX_NAME_LENGTH, `Name must not exceed ${MAX_NAME_LENGTH} characters`)
  .transform(val => val.trim())
  .refine(val => /^[a-zA-Z\s-']+$/.test(val), {
    message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
  });

/**
 * Schema for user registration with enhanced security validation
 */
export const registerUserSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .transform(val => val.toLowerCase().trim())
    .refine(async (email) => {
      const result = validateEmail(email);
      return result.isValid;
    }, {
      message: 'Email validation failed security checks'
    }),

  password: z.string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .refine(async (password) => {
      const result = validatePassword(password);
      return result.isValid;
    }, {
      message: 'Password must include uppercase, lowercase, number, and special character'
    }),

  firstName: nameSchema,
  lastName: nameSchema,

  role: z.enum([
    UserRole.ADMIN,
    UserRole.ORGANIZATION_ADMIN,
    UserRole.AGENT,
    UserRole.FORM_MANAGER,
    UserRole.READ_ONLY
  ], {
    errorMap: () => ({ message: 'Invalid user role selected' })
  })
}).strict();

/**
 * Schema for user login with security measures
 */
export const loginUserSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .transform(val => val.toLowerCase().trim())
    .refine(async (email) => {
      const result = validateEmail(email);
      return result.isValid;
    }, {
      message: 'Invalid email format or security check failed'
    }),

  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password exceeds maximum length')
}).strict();

/**
 * Schema for user profile updates with role-based validation
 */
export const updateUserSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  role: z.enum([
    UserRole.ADMIN,
    UserRole.ORGANIZATION_ADMIN,
    UserRole.AGENT,
    UserRole.FORM_MANAGER,
    UserRole.READ_ONLY
  ]).optional()
}).strict()
.refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

/**
 * Schema for password change requests with strength validation
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),

  newPassword: z.string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .refine(async (password) => {
      const result = validatePassword(password);
      return result.isValid;
    }, {
      message: 'New password does not meet security requirements'
    })
}).strict()
.refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword']
});

/**
 * Schema for password reset validation with token verification
 */
export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required')
    .refine(token => /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/.test(token), {
      message: 'Invalid reset token format'
    }),

  newPassword: z.string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .refine(async (password) => {
      const result = validatePassword(password);
      return result.isValid;
    }, {
      message: 'New password does not meet security requirements'
    })
}).strict();

/**
 * Validates user data against the specified schema with enhanced security checks
 * @param data - User data to validate
 * @param schemaType - Type of validation schema to apply
 * @returns Validated and sanitized user data
 * @throws ZodError if validation fails
 */
export async function validateUserData(
  data: Record<string, any>,
  schemaType: 'register' | 'login' | 'update' | 'changePassword' | 'resetPassword'
): Promise<Record<string, any>> {
  const schemas = {
    register: registerUserSchema,
    login: loginUserSchema,
    update: updateUserSchema,
    changePassword: changePasswordSchema,
    resetPassword: resetPasswordSchema
  };

  const schema = schemas[schemaType];
  if (!schema) {
    throw new Error('Invalid schema type specified');
  }

  return schema.parseAsync(data);
}