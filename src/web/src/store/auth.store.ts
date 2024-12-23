/**
 * @file Authentication store implementation using Zustand
 * @version 1.0.0
 * @description Implements secure JWT-based authentication state management with
 * comprehensive security features, CSRF protection, and session handling
 */

import { create } from 'zustand'; // v4.4.0
import { devtools, persist } from 'zustand/middleware'; // v4.4.0
import {
  AuthState,
  AuthUser,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  UserRole,
  SecurityAuditEvent
} from '../types/auth.types';
import {
  authenticate,
  register,
  logout,
  refreshSession,
  validateToken,
  generateCsrfToken,
  logSecurityEvent
} from '../lib/auth';

// Constants for authentication configuration
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour session timeout
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes lockout

// Initial state definition
const INITIAL_STATE: AuthState = {
  user: null,
  tokens: null,
  loading: false,
  error: null,
  csrfToken: null,
  sessionTimeout: null,
  loginAttempts: 0,
  lockedUntil: null
};

/**
 * Interface extending AuthState with store actions
 */
interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials, csrfToken: string) => Promise<void>;
  register: (data: RegisterData, csrfToken: string) => Promise<void>;
  logout: (csrfToken: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  validateRole: (requiredRole: UserRole) => boolean;
  resetError: () => void;
  clearSession: () => void;
}

/**
 * Creates the authentication store with security features and persistence
 */
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...INITIAL_STATE,

        /**
         * Authenticates user with credentials and CSRF protection
         */
        login: async (credentials: LoginCredentials, csrfToken: string) => {
          try {
            // Check login attempts and lockout
            const { loginAttempts, lockedUntil } = get();
            if (lockedUntil && Date.now() < lockedUntil) {
              throw new Error('Account temporarily locked. Please try again later.');
            }

            set({ loading: true, error: null });

            // Validate CSRF token
            if (!csrfToken || csrfToken !== get().csrfToken) {
              throw new Error('Invalid security token');
            }

            // Attempt authentication
            const { tokens, user } = await authenticate(credentials);

            // Generate new CSRF token
            const newCsrfToken = await generateCsrfToken();

            // Set up session timeout
            const sessionTimeout = window.setTimeout(() => {
              get().clearSession();
            }, SESSION_TIMEOUT);

            // Log successful authentication
            await logSecurityEvent({
              type: 'AUTH_SUCCESS',
              userId: user.id,
              metadata: { email: credentials.email }
            });

            // Update store state
            set({
              user,
              tokens,
              loading: false,
              error: null,
              csrfToken: newCsrfToken,
              sessionTimeout,
              loginAttempts: 0,
              lockedUntil: null
            });

            // Schedule token refresh
            setTimeout(() => {
              get().refreshSession();
            }, tokens.expiresIn * 1000 - TOKEN_REFRESH_THRESHOLD);

          } catch (error) {
            // Handle failed login attempt
            const attempts = get().loginAttempts + 1;
            const locked = attempts >= MAX_LOGIN_ATTEMPTS;

            await logSecurityEvent({
              type: 'AUTH_FAILURE',
              metadata: {
                email: credentials.email,
                attempts,
                locked,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            });

            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Authentication failed',
              loginAttempts: attempts,
              lockedUntil: locked ? Date.now() + LOCKOUT_DURATION : null
            });
          }
        },

        /**
         * Registers new user with security validation
         */
        register: async (data: RegisterData, csrfToken: string) => {
          try {
            set({ loading: true, error: null });

            // Validate CSRF token
            if (!csrfToken || csrfToken !== get().csrfToken) {
              throw new Error('Invalid security token');
            }

            // Attempt registration
            const { tokens, user } = await register(data);

            // Generate new CSRF token
            const newCsrfToken = await generateCsrfToken();

            // Set up session timeout
            const sessionTimeout = window.setTimeout(() => {
              get().clearSession();
            }, SESSION_TIMEOUT);

            // Log successful registration
            await logSecurityEvent({
              type: 'REGISTRATION_SUCCESS',
              userId: user.id,
              metadata: { email: data.email }
            });

            set({
              user,
              tokens,
              loading: false,
              error: null,
              csrfToken: newCsrfToken,
              sessionTimeout
            });

          } catch (error) {
            await logSecurityEvent({
              type: 'REGISTRATION_FAILURE',
              metadata: {
                email: data.email,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            });

            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Registration failed'
            });
          }
        },

        /**
         * Performs secure logout with session cleanup
         */
        logout: async (csrfToken: string) => {
          try {
            // Validate CSRF token
            if (!csrfToken || csrfToken !== get().csrfToken) {
              throw new Error('Invalid security token');
            }

            const { user, sessionTimeout } = get();

            // Clear session timeout
            if (sessionTimeout) {
              clearTimeout(sessionTimeout);
            }

            // Perform logout
            await logout();

            // Log successful logout
            if (user) {
              await logSecurityEvent({
                type: 'LOGOUT',
                userId: user.id,
                metadata: { email: user.email }
              });
            }

            // Reset store to initial state
            set(INITIAL_STATE);

          } catch (error) {
            console.error('Logout error:', error);
            set(INITIAL_STATE);
          }
        },

        /**
         * Refreshes authentication session with token rotation
         */
        refreshSession: async () => {
          try {
            const { tokens } = get();
            if (!tokens) return;

            // Validate current token
            if (!validateToken(tokens.accessToken)) {
              throw new Error('Invalid token');
            }

            // Attempt token refresh
            const newTokens = await refreshSession(tokens.refreshToken);

            // Generate new CSRF token
            const newCsrfToken = await generateCsrfToken();

            // Update session timeout
            const sessionTimeout = window.setTimeout(() => {
              get().clearSession();
            }, SESSION_TIMEOUT);

            set({
              tokens: newTokens,
              csrfToken: newCsrfToken,
              sessionTimeout
            });

            // Schedule next refresh
            setTimeout(() => {
              get().refreshSession();
            }, newTokens.expiresIn * 1000 - TOKEN_REFRESH_THRESHOLD);

          } catch (error) {
            console.error('Session refresh failed:', error);
            get().clearSession();
          }
        },

        /**
         * Validates user role against required permissions
         */
        validateRole: (requiredRole: UserRole): boolean => {
          const { user } = get();
          if (!user) return false;

          const roleHierarchy = {
            [UserRole.ADMIN]: 5,
            [UserRole.ORGANIZATION_ADMIN]: 4,
            [UserRole.AGENT]: 3,
            [UserRole.FORM_MANAGER]: 2,
            [UserRole.READ_ONLY]: 1
          };

          const hasPermission = roleHierarchy[user.role] >= roleHierarchy[requiredRole];

          if (!hasPermission) {
            logSecurityEvent({
              type: 'UNAUTHORIZED_ACCESS',
              userId: user.id,
              metadata: {
                requiredRole,
                userRole: user.role
              }
            });
          }

          return hasPermission;
        },

        /**
         * Resets error state
         */
        resetError: () => set({ error: null }),

        /**
         * Clears authentication session
         */
        clearSession: () => {
          const { sessionTimeout } = get();
          if (sessionTimeout) {
            clearTimeout(sessionTimeout);
          }
          set(INITIAL_STATE);
        }
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          tokens: state.tokens
        })
      }
    ),
    { name: 'AuthStore' }
  )
);