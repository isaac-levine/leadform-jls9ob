import { JWTService } from '../../src/lib/auth/jwt.service';
import { PasswordService } from '../../src/lib/auth/password.service';
import { RoleService } from '../../src/lib/auth/role.service';
import { UserRole } from '../../src/types/auth.types';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

// Mock Redis client for JWT token management
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
};

// Test constants
const TEST_USER_PAYLOAD = {
  userId: new ObjectId().toString(),
  organizationId: new ObjectId().toString(),
  role: UserRole.AGENT,
  permissions: ['read:messages', 'write:messages']
};

const TEST_PASSWORDS = {
  valid: 'StrongP@ss123',
  invalid: [
    'short1!',              // Too short
    'nouppercasepass1!',    // No uppercase
    'NOLOWERCASEPASS1!',    // No lowercase
    'NoSpecialChars123',    // No special chars
    'No1Numbers!'           // No numbers
  ],
  compromised: 'Password123!' // Common password
};

const TEST_ORGANIZATIONS = {
  primary: new ObjectId(),
  secondary: new ObjectId()
};

describe('JWTService', () => {
  let jwtService: JWTService;
  const mockFingerprint = crypto.randomBytes(32).toString('hex');

  beforeEach(() => {
    jwtService = new JWTService(mockRedisClient);
    jest.clearAllMocks();
  });

  describe('Token Generation and Validation', () => {
    it('should generate valid access and refresh tokens', async () => {
      const tokens = await jwtService.generateTokens(TEST_USER_PAYLOAD, mockFingerprint);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(typeof tokens.expiresIn).toBe('number');
    });

    it('should verify valid access token', async () => {
      const tokens = await jwtService.generateTokens(TEST_USER_PAYLOAD, mockFingerprint);
      mockRedisClient.get.mockResolvedValue(null); // Token not blacklisted

      const decoded = await jwtService.verifyAccessToken(tokens.accessToken, mockFingerprint);

      expect(decoded).toHaveProperty('userId', TEST_USER_PAYLOAD.userId);
      expect(decoded).toHaveProperty('organizationId', TEST_USER_PAYLOAD.organizationId);
      expect(decoded).toHaveProperty('role', TEST_USER_PAYLOAD.role);
    });

    it('should reject blacklisted access token', async () => {
      const tokens = await jwtService.generateTokens(TEST_USER_PAYLOAD, mockFingerprint);
      mockRedisClient.get.mockResolvedValue('1'); // Token blacklisted

      await expect(
        jwtService.verifyAccessToken(tokens.accessToken, mockFingerprint)
      ).rejects.toThrow('Token has been revoked');
    });

    it('should reject token with invalid fingerprint', async () => {
      const tokens = await jwtService.generateTokens(TEST_USER_PAYLOAD, mockFingerprint);
      const invalidFingerprint = crypto.randomBytes(32).toString('hex');

      await expect(
        jwtService.verifyAccessToken(tokens.accessToken, invalidFingerprint)
      ).rejects.toThrow('Token binding mismatch');
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh access token with valid refresh token', async () => {
      const initialTokens = await jwtService.generateTokens(TEST_USER_PAYLOAD, mockFingerprint);
      mockRedisClient.get.mockResolvedValue(JSON.stringify({ nonce: expect.any(String) }));

      const newTokens = await jwtService.refreshAccessToken(initialTokens.refreshToken, mockFingerprint);

      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens.accessToken).not.toBe(initialTokens.accessToken);
    });

    it('should detect refresh token reuse', async () => {
      const tokens = await jwtService.generateTokens(TEST_USER_PAYLOAD, mockFingerprint);
      mockRedisClient.get.mockResolvedValue(JSON.stringify({ nonce: 'different-nonce' }));

      await expect(
        jwtService.refreshAccessToken(tokens.refreshToken, mockFingerprint)
      ).rejects.toThrow('Token reuse detected');
    });
  });
});

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('Password Validation', () => {
    it('should accept valid password', async () => {
      const hashedPassword = await passwordService.hashPassword(TEST_PASSWORDS.valid);
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt hash pattern
    });

    test.each(TEST_PASSWORDS.invalid)('should reject invalid password: %s', async (password) => {
      await expect(
        passwordService.hashPassword(password)
      ).rejects.toThrow();
    });

    it('should verify correct password', async () => {
      const hashedPassword = await passwordService.hashPassword(TEST_PASSWORDS.valid);
      const isValid = await passwordService.verifyPassword(TEST_PASSWORDS.valid, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hashedPassword = await passwordService.hashPassword(TEST_PASSWORDS.valid);
      const isValid = await passwordService.verifyPassword('WrongP@ss123', hashedPassword);
      expect(isValid).toBe(false);
    });
  });
});

describe('RoleService', () => {
  let roleService: RoleService;

  beforeEach(() => {
    roleService = new RoleService();
  });

  describe('Permission Hierarchy', () => {
    it('should validate admin access to all roles', () => {
      const allRoles = Object.values(UserRole);
      allRoles.forEach(role => {
        expect(roleService.hasPermission(UserRole.ADMIN, role)).toBe(true);
      });
    });

    it('should validate organization admin permissions', () => {
      expect(roleService.hasPermission(UserRole.ORGANIZATION_ADMIN, UserRole.AGENT)).toBe(true);
      expect(roleService.hasPermission(UserRole.ORGANIZATION_ADMIN, UserRole.FORM_MANAGER)).toBe(true);
      expect(roleService.hasPermission(UserRole.ORGANIZATION_ADMIN, UserRole.ADMIN)).toBe(false);
    });

    it('should validate agent permissions', () => {
      expect(roleService.hasPermission(UserRole.AGENT, UserRole.READ_ONLY)).toBe(true);
      expect(roleService.hasPermission(UserRole.AGENT, UserRole.FORM_MANAGER)).toBe(false);
    });
  });

  describe('Organization Access', () => {
    const mockUser = {
      _id: new ObjectId(),
      organizationId: TEST_ORGANIZATIONS.primary,
      role: UserRole.ORGANIZATION_ADMIN
    };

    it('should allow admin access to any organization', () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      expect(roleService.validateOrganizationAccess(adminUser, TEST_ORGANIZATIONS.secondary)).toBe(true);
    });

    it('should restrict non-admin to own organization', () => {
      expect(roleService.validateOrganizationAccess(mockUser, TEST_ORGANIZATIONS.primary)).toBe(true);
      expect(roleService.validateOrganizationAccess(mockUser, TEST_ORGANIZATIONS.secondary)).toBe(false);
    });
  });
});