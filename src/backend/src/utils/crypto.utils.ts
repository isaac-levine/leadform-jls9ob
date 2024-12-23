// @ts-nocheck
/**
 * Cryptographic utility module providing secure password hashing, verification,
 * and data encryption using industry-standard algorithms.
 * @module crypto.utils
 * @version 1.0.0
 */

// External dependencies
// bcrypt v5.1.0 - Industry-standard password hashing
import * as bcrypt from 'bcrypt';
// crypto - Node.js built-in cryptographic functionality
import * as crypto from 'crypto';

// Constants
const SALT_ROUNDS = 12;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;
const TIMING_SAFE_EQUAL_LENGTH = 32;

/**
 * Interface representing encrypted data structure with authentication
 */
export interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
  version: number;
}

/**
 * Custom error class for cryptographic operations
 */
export class CryptoError extends Error {
  constructor(
    public code: string,
    public message: string,
    public operation: string
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}

/**
 * Decorator for standardized crypto error handling
 */
function ThrowsCryptoError(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (...args: any[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      throw new CryptoError(
        error.code || 'CRYPTO_ERROR',
        error.message || 'Cryptographic operation failed',
        propertyKey
      );
    }
  };
  return descriptor;
}

/**
 * Securely hashes passwords using bcrypt with timing attack protection
 * @param password - Plain text password to hash
 * @returns Promise resolving to bcrypt hashed password
 * @throws CryptoError if hashing fails
 */
@ThrowsCryptoError
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new CryptoError(
      'INVALID_PASSWORD',
      'Password must be at least 8 characters long',
      'hashPassword'
    );
  }

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    
    // Clear sensitive data from memory
    password = '';
    return hash;
  } catch (error) {
    throw new CryptoError(
      'HASH_FAILED',
      'Password hashing failed',
      'hashPassword'
    );
  }
}

/**
 * Verifies passwords against bcrypt hashes with constant-time comparison
 * @param password - Plain text password to verify
 * @param hashedPassword - Bcrypt hash to compare against
 * @returns Promise resolving to boolean indicating match
 * @throws CryptoError if verification fails
 */
@ThrowsCryptoError
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!password || !hashedPassword) {
    throw new CryptoError(
      'INVALID_INPUT',
      'Password and hash must be provided',
      'verifyPassword'
    );
  }

  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    
    // Clear sensitive data from memory
    password = '';
    return isMatch;
  } catch (error) {
    throw new CryptoError(
      'VERIFY_FAILED',
      'Password verification failed',
      'verifyPassword'
    );
  }
}

/**
 * Encrypts sensitive data using AES-256-GCM with authentication
 * @param data - Data to encrypt
 * @param encryptionKey - Key used for encryption
 * @returns Promise resolving to EncryptedData object
 * @throws CryptoError if encryption fails
 */
@ThrowsCryptoError
export async function encryptData(data: string, encryptionKey: string): Promise<EncryptedData> {
  if (!data || !encryptionKey) {
    throw new CryptoError(
      'INVALID_INPUT',
      'Data and encryption key must be provided',
      'encryptData'
    );
  }

  try {
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(encryptionKey, 'base64'),
      iv
    );

    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Clear sensitive data
    encryptionKey = '';
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      version: 1
    };
  } catch (error) {
    throw new CryptoError(
      'ENCRYPTION_FAILED',
      'Data encryption failed',
      'encryptData'
    );
  }
}

/**
 * Decrypts AES-256-GCM encrypted data with authentication verification
 * @param encryptedData - EncryptedData object containing encrypted data
 * @param encryptionKey - Key used for decryption
 * @returns Promise resolving to decrypted string
 * @throws CryptoError if decryption fails
 */
@ThrowsCryptoError
export async function decryptData(encryptedData: EncryptedData, encryptionKey: string): Promise<string> {
  if (!encryptedData || !encryptionKey) {
    throw new CryptoError(
      'INVALID_INPUT',
      'Encrypted data and key must be provided',
      'decryptData'
    );
  }

  try {
    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(encryptionKey, 'base64'),
      Buffer.from(encryptedData.iv, 'base64')
    );

    // Set auth tag
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));

    // Decrypt data
    let decrypted = decipher.update(encryptedData.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Clear sensitive data
    encryptionKey = '';
    
    return decrypted;
  } catch (error) {
    throw new CryptoError(
      'DECRYPTION_FAILED',
      'Data decryption failed',
      'decryptData'
    );
  }
}

/**
 * Generates cryptographically secure random key
 * @param length - Desired key length in bytes
 * @returns Promise resolving to base64 encoded secure key
 * @throws CryptoError if key generation fails
 */
@ThrowsCryptoError
export async function generateSecureKey(length: number): Promise<string> {
  if (!length || length < 16) {
    throw new CryptoError(
      'INVALID_LENGTH',
      'Key length must be at least 16 bytes',
      'generateSecureKey'
    );
  }

  try {
    const key = crypto.randomBytes(length);
    return key.toString('base64');
  } catch (error) {
    throw new CryptoError(
      'KEY_GENERATION_FAILED',
      'Secure key generation failed',
      'generateSecureKey'
    );
  }
}