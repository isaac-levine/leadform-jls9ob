/**
 * Integration tests for user-related functionality with comprehensive security validation
 * @module tests/integration/user.test
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ObjectId } from 'mongodb';
import { UserController } from '../../src/api/controllers/UserController';
import { UserRole } from '../../types/auth.types';

// Constants for test data
const TEST_TIMEOUT = 30000;
const VALID_PASSWORD = 'Test1234!@#$';
const WEAK_PASSWORD = 'password123';
const TEST_EMAIL = 'test@example.com';
const ADMIN_EMAIL = 'admin@example.com';

// Test data interfaces
interface TestUser {
  _id?: ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: ObjectId;
}

interface TestContext {
  mongoServer: MongoMemoryServer;
  app: Express.Application;
  adminUser: TestUser;
  regularUser: TestUser;
  adminToken: string;
  userToken: string;
  testOrganizationId: ObjectId;
}

const context: TestContext = {
  mongoServer: null!,
  app: null!,
  adminUser: null!,
  regularUser: null!,
  adminToken: '',
  userToken: '',
  testOrganizationId: new ObjectId()
};

describe('User Authentication & Authorization Integration Tests', () => {
  beforeAll(async () => {
    // Setup test environment
    context.mongoServer = await MongoMemoryServer.create();
    const mongoUri = context.mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_EXPIRES_IN = '1h';

    // Create test organization and users
    context.adminUser = {
      email: ADMIN_EMAIL,
      password: VALID_PASSWORD,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      organizationId: context.testOrganizationId
    };

    context.regularUser = {
      email: TEST_EMAIL,
      password: VALID_PASSWORD,
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.READ_ONLY,
      organizationId: context.testOrganizationId
    };
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await context.mongoServer.stop();
  });

  describe('User Registration', () => {
    test('should successfully register a new user with valid data', async () => {
      const response = await supertest(context.app)
        .post('/api/users/register')
        .send({
          email: 'newuser@example.com',
          password: VALID_PASSWORD,
          firstName: 'New',
          lastName: 'User',
          role: UserRole.READ_ONLY,
          organizationId: context.testOrganizationId.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toHaveProperty('email', 'newuser@example.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should reject registration with weak password', async () => {
      const response = await supertest(context.app)
        .post('/api/users/register')
        .send({
          email: 'weak@example.com',
          password: WEAK_PASSWORD,
          firstName: 'Weak',
          lastName: 'Password',
          role: UserRole.READ_ONLY,
          organizationId: context.testOrganizationId.toString()
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    test('should prevent duplicate email registration', async () => {
      const response = await supertest(context.app)
        .post('/api/users/register')
        .send({
          email: TEST_EMAIL,
          password: VALID_PASSWORD,
          firstName: 'Duplicate',
          lastName: 'User',
          role: UserRole.READ_ONLY,
          organizationId: context.testOrganizationId.toString()
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('DUPLICATE_RESOURCE');
    });
  });

  describe('User Authentication', () => {
    test('should successfully authenticate with valid credentials', async () => {
      const response = await supertest(context.app)
        .post('/api/users/login')
        .send({
          email: TEST_EMAIL,
          password: VALID_PASSWORD,
          organizationId: context.testOrganizationId.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.header['set-cookie']).toBeDefined();
      
      // Store token for subsequent tests
      context.userToken = response.body.data.accessToken;
    });

    test('should handle rate limiting for failed login attempts', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await supertest(context.app)
          .post('/api/users/login')
          .send({
            email: TEST_EMAIL,
            password: 'wrongpassword',
            organizationId: context.testOrganizationId.toString()
          });
      }

      const response = await supertest(context.app)
        .post('/api/users/login')
        .send({
          email: TEST_EMAIL,
          password: VALID_PASSWORD,
          organizationId: context.testOrganizationId.toString()
        });

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Role-Based Access Control', () => {
    test('should allow admin to access organization users', async () => {
      const response = await supertest(context.app)
        .get(`/api/organizations/${context.testOrganizationId}/users`)
        .set('Authorization', `Bearer ${context.adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    test('should prevent regular user from accessing organization users', async () => {
      const response = await supertest(context.app)
        .get(`/api/organizations/${context.testOrganizationId}/users`)
        .set('Authorization', `Bearer ${context.userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('Profile Management', () => {
    test('should allow user to update their own profile', async () => {
      const response = await supertest(context.app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${context.userToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.firstName).toBe('Updated');
      expect(response.body.data.user.lastName).toBe('Name');
    });

    test('should prevent user from updating role', async () => {
      const response = await supertest(context.app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${context.userToken}`)
        .send({
          role: UserRole.ADMIN
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('Password Management', () => {
    test('should handle password reset request securely', async () => {
      const response = await supertest(context.app)
        .post('/api/users/reset-password')
        .send({
          email: TEST_EMAIL,
          organizationId: context.testOrganizationId.toString()
        });

      // Should return 200 even if email doesn't exist to prevent email enumeration
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset instructions sent if email exists');
    });

    test('should validate password reset token', async () => {
      const response = await supertest(context.app)
        .post('/api/users/reset-password/confirm')
        .send({
          token: 'invalid-token',
          newPassword: VALID_PASSWORD
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
});