/**
 * @file Core authentication library for web frontend
 * @version 1.0.0
 * @description Implements secure JWT-based authentication, session management,
 * and role-based access control with enhanced security features and audit logging
 */

import { jwtDecode } from 'jwt-decode'; // v4.0.0
import { 
  AuthTokens, 
  AuthUser, 
  UserRole, 
  SecurityAuditEvent 
} from '../types/auth.types';
import { 
  parseJwt, 
  storeTokens, 
  validateCsrfToken 
} from '../utils/auth.utils';
import { 
  login, 
  createApiClient, 
  logSecurityEvent 
} from './api';

// Authentication storage and refresh configuration
const AUTH_STORAGE_KEY = 'auth_state';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
const MAX_REFRESH_RETRIES = 3;
const REFRESH_RETRY_DELAY = 2000; // 2 seconds base delay

/**
 * Interface for authentication state management
 */
interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
}

/**
 * Manages authentication state with enhanced security
 */
class AuthManager {
  private state: AuthState = {
    user: null,
    tokens: null,
    loading: false,
    error: null
  };

  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshRetryCount = 0;

  /**
   * Initializes authentication state from secure storage
   */
  private initializeFromStorage(): void {
    try {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const { tokens } = JSON.parse(storedAuth);
        if (tokens?.accessToken && !this.isTokenExpired(tokens.accessToken)) {
          this.state.tokens = tokens;
          this.state.user = parseJwt(tokens.accessToken);
          this.scheduleTokenRefresh();
        } else {
          this.clearAuthState();
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
      this.clearAuthState();
    }
  }

  /**
   * Checks if access token is expired or near expiration
   */
  private isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<{ exp: number }>(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp <= currentTime + (TOKEN_REFRESH_THRESHOLD / 1000);
    } catch {
      return true;
    }
  }

  /**
   * Schedules automatic token refresh before expiration
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.state.tokens?.accessToken) return;

    const decoded = jwtDecode<{ exp: number }>(this.state.tokens.accessToken);
    const expiresIn = decoded.exp * 1000 - Date.now() - TOKEN_REFRESH_THRESHOLD;

    if (expiresIn > 0) {
      this.refreshTimer = setTimeout(() => this.refreshSession(), expiresIn);
    }
  }

  /**
   * Updates authentication state and storage
   */
  private updateAuthState(update: Partial<AuthState>): void {
    this.state = { ...this.state, ...update };

    if (this.state.tokens) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        tokens: this.state.tokens
      }));
      storeTokens(this.state.tokens);
    }
  }

  /**
   * Clears authentication state and storage
   */
  private clearAuthState(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.state = {
      user: null,
      tokens: null,
      loading: false,
      error: null
    };
  }

  /**
   * Authenticates user with credentials and CSRF protection
   * @param credentials - User login credentials
   * @param csrfToken - CSRF token for request validation
   * @returns Authenticated user data
   */
  public async authenticate(credentials: { 
    email: string; 
    password: string; 
    rememberMe?: boolean 
  }, csrfToken: string): Promise<AuthUser> {
    try {
      this.updateAuthState({ loading: true, error: null });

      // Validate CSRF token
      if (!validateCsrfToken(csrfToken)) {
        throw new Error('Invalid security token');
      }

      // Attempt login
      const tokens = await login(credentials);
      const user = parseJwt(tokens.accessToken);

      // Update state and schedule refresh
      this.updateAuthState({
        user,
        tokens,
        loading: false
      });

      this.scheduleTokenRefresh();

      // Log successful authentication
      await logSecurityEvent({
        type: 'AUTH_SUCCESS',
        userId: user.id,
        metadata: {
          email: credentials.email,
          rememberMe: credentials.rememberMe
        }
      });

      return user;
    } catch (error) {
      // Log failed authentication attempt
      await logSecurityEvent({
        type: 'AUTH_FAILURE',
        metadata: {
          email: credentials.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      this.updateAuthState({
        loading: false,
        error: 'Authentication failed'
      });
      throw error;
    }
  }

  /**
   * Refreshes authentication session with retry capability
   * @returns New authentication tokens
   */
  public async refreshSession(): Promise<AuthTokens> {
    try {
      if (!this.state.tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const apiClient = createApiClient(this.state.tokens);
      const response = await apiClient.post<AuthTokens>('/auth/refresh', {
        refreshToken: this.state.tokens.refreshToken
      });

      // Update state with new tokens
      this.updateAuthState({
        tokens: response.data,
        user: parseJwt(response.data.accessToken)
      });

      this.refreshRetryCount = 0;
      this.scheduleTokenRefresh();

      return response.data;
    } catch (error) {
      // Implement exponential backoff for retries
      if (this.refreshRetryCount < MAX_REFRESH_RETRIES) {
        this.refreshRetryCount++;
        const delay = REFRESH_RETRY_DELAY * Math.pow(2, this.refreshRetryCount - 1);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.refreshSession();
      }

      // Log refresh failure and clear state
      await logSecurityEvent({
        type: 'TOKEN_REFRESH_FAILURE',
        userId: this.state.user?.id,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      this.clearAuthState();
      throw error;
    }
  }

  /**
   * Performs secure logout with session cleanup
   */
  public async logout(): Promise<void> {
    try {
      if (this.state.tokens) {
        const apiClient = createApiClient(this.state.tokens);
        await apiClient.post('/auth/logout', {
          refreshToken: this.state.tokens.refreshToken
        });

        // Log successful logout
        await logSecurityEvent({
          type: 'LOGOUT',
          userId: this.state.user?.id,
          metadata: { email: this.state.user?.email }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthState();
    }
  }

  /**
   * Checks if user has required role or higher
   * @param requiredRole - Required role for access
   * @returns boolean indicating if user has sufficient privileges
   */
  public hasRole(requiredRole: UserRole): boolean {
    if (!this.state.user) return false;

    const roleHierarchy = {
      [UserRole.ADMIN]: 5,
      [UserRole.ORGANIZATION_ADMIN]: 4,
      [UserRole.AGENT]: 3,
      [UserRole.FORM_MANAGER]: 2,
      [UserRole.READ_ONLY]: 1
    };

    return roleHierarchy[this.state.user.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Gets current authenticated user
   * @returns Current user or null if not authenticated
   */
  public getCurrentUser(): AuthUser | null {
    return this.state.user;
  }
}

// Create singleton instance
const authManager = new AuthManager();

// Export authentication functions
export const authenticate = authManager.authenticate.bind(authManager);
export const refreshSession = authManager.refreshSession.bind(authManager);
export const logout = authManager.logout.bind(authManager);
export const hasRole = authManager.hasRole.bind(authManager);
export const getCurrentUser = authManager.getCurrentUser.bind(authManager);