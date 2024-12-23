import { sign, verify, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import jwtConfig from '../../config/jwt.config';
import { JWTPayload, AuthTokens } from '../../types/auth.types';

/**
 * Service responsible for JWT token generation, validation, and management.
 * Implements secure authentication flows with token rotation and blacklisting.
 * @version 1.0.0
 */
export class JWTService {
  private readonly redisClient: any; // Redis client for token blacklisting
  private readonly TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
  private readonly TOKEN_FAMILY_PREFIX = 'token:family:';

  /**
   * Initializes the JWT service with Redis connection for token blacklisting
   * @param redisClient - Redis client instance for token management
   */
  constructor(redisClient: any) {
    this.redisClient = redisClient;
  }

  /**
   * Generates a cryptographically secure token fingerprint
   * @param length - Length of the fingerprint in bytes
   * @returns Generated fingerprint hash
   */
  private generateFingerprint(length: number = 32): string {
    return createHash('sha256')
      .update(randomBytes(length))
      .digest('hex');
  }

  /**
   * Generates a new pair of access and refresh tokens with enhanced security
   * @param payload - User payload for token generation
   * @param fingerprint - Browser fingerprint for token binding
   * @returns Promise resolving to token pair with metadata
   */
  async generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>, fingerprint: string): Promise<AuthTokens> {
    // Generate unique identifiers for token family
    const familyId = randomBytes(16).toString('hex');
    const nonce = randomBytes(12).toString('hex');

    // Create enhanced payload with security metadata
    const enhancedPayload = {
      ...payload,
      nonce,
      fingerprint: createHash('sha256').update(fingerprint).digest('hex'),
      family: familyId
    };

    // Generate access token
    const accessToken = sign(
      enhancedPayload,
      jwtConfig.accessToken.secret!,
      {
        expiresIn: jwtConfig.accessToken.expiresIn,
        algorithm: jwtConfig.accessToken.algorithm,
        issuer: jwtConfig.accessToken.issuer,
        audience: jwtConfig.accessToken.audience
      }
    );

    // Generate refresh token
    const refreshToken = sign(
      enhancedPayload,
      jwtConfig.refreshToken.secret!,
      {
        expiresIn: jwtConfig.refreshToken.expiresIn,
        algorithm: jwtConfig.refreshToken.algorithm,
        issuer: jwtConfig.refreshToken.issuer,
        audience: jwtConfig.refreshToken.audience
      }
    );

    // Store token family metadata in Redis
    await this.redisClient.set(
      `${this.TOKEN_FAMILY_PREFIX}${familyId}`,
      JSON.stringify({ nonce, lastRotation: Date.now() }),
      'EX',
      604800 // 7 days
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600 // 1 hour in seconds
    };
  }

  /**
   * Verifies and decodes an access token with enhanced validation
   * @param token - Access token to verify
   * @param fingerprint - Browser fingerprint for token binding validation
   * @returns Promise resolving to decoded token payload
   * @throws {JsonWebTokenError} If token is invalid
   * @throws {TokenExpiredError} If token has expired
   */
  async verifyAccessToken(token: string, fingerprint: string): Promise<JWTPayload> {
    // Check token blacklist
    const isBlacklisted = await this.redisClient.get(`${this.TOKEN_BLACKLIST_PREFIX}${token}`);
    if (isBlacklisted) {
      throw new JsonWebTokenError('Token has been revoked');
    }

    // Verify token with strict validation
    const decoded = verify(token, jwtConfig.accessToken.secret!, {
      algorithms: [jwtConfig.accessToken.algorithm],
      issuer: jwtConfig.accessToken.issuer,
      audience: jwtConfig.accessToken.audience,
      clockTolerance: jwtConfig.accessToken.clockTolerance
    }) as JWTPayload & { fingerprint: string };

    // Validate token binding
    const providedFingerprint = createHash('sha256').update(fingerprint).digest('hex');
    if (decoded.fingerprint !== providedFingerprint) {
      throw new JsonWebTokenError('Token binding mismatch');
    }

    return decoded;
  }

  /**
   * Verifies and decodes a refresh token with reuse detection
   * @param token - Refresh token to verify
   * @param fingerprint - Browser fingerprint for token binding validation
   * @returns Promise resolving to decoded token payload
   * @throws {JsonWebTokenError} If token is invalid or reused
   */
  async verifyRefreshToken(token: string, fingerprint: string): Promise<JWTPayload> {
    const decoded = verify(token, jwtConfig.refreshToken.secret!, {
      algorithms: [jwtConfig.refreshToken.algorithm],
      issuer: jwtConfig.refreshToken.issuer,
      audience: jwtConfig.refreshToken.audience,
      clockTolerance: jwtConfig.refreshToken.clockTolerance
    }) as JWTPayload & { fingerprint: string; family: string };

    // Validate token binding
    const providedFingerprint = createHash('sha256').update(fingerprint).digest('hex');
    if (decoded.fingerprint !== providedFingerprint) {
      throw new JsonWebTokenError('Token binding mismatch');
    }

    // Check token family status
    const familyData = await this.redisClient.get(`${this.TOKEN_FAMILY_PREFIX}${decoded.family}`);
    if (!familyData) {
      throw new JsonWebTokenError('Invalid token family');
    }

    const { nonce } = JSON.parse(familyData);
    if (decoded.nonce !== nonce) {
      // Token reuse detected - revoke entire family
      await this.revokeToken(token, true);
      throw new JsonWebTokenError('Token reuse detected');
    }

    return decoded;
  }

  /**
   * Generates new token pair using a valid refresh token
   * @param refreshToken - Current refresh token
   * @param fingerprint - Browser fingerprint for token binding
   * @returns Promise resolving to new token pair
   */
  async refreshAccessToken(refreshToken: string, fingerprint: string): Promise<AuthTokens> {
    const decoded = await this.verifyRefreshToken(refreshToken, fingerprint);
    
    // Generate new token pair
    const tokens = await this.generateTokens(
      {
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        role: decoded.role
      },
      fingerprint
    );

    // Revoke old refresh token
    await this.revokeToken(refreshToken, false);

    return tokens;
  }

  /**
   * Revokes a token and optionally its entire family
   * @param token - Token to revoke
   * @param revokeFamily - Whether to revoke entire token family
   */
  async revokeToken(token: string, revokeFamily: boolean = false): Promise<void> {
    const decoded = verify(token, jwtConfig.refreshToken.secret!, {
      algorithms: [jwtConfig.refreshToken.algorithm],
      ignoreExpiration: true
    }) as JWTPayload & { family: string };

    // Add token to blacklist
    await this.redisClient.set(
      `${this.TOKEN_BLACKLIST_PREFIX}${token}`,
      '1',
      'EX',
      3600 // 1 hour
    );

    if (revokeFamily && decoded.family) {
      // Revoke entire token family
      await this.redisClient.del(`${this.TOKEN_FAMILY_PREFIX}${decoded.family}`);
    }
  }
}

export default JWTService;