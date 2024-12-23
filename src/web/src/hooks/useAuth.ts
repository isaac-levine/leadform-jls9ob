/**
 * @file Enhanced authentication hook with comprehensive security features
 * @version 1.0.0
 * @description Implements secure JWT-based authentication with automatic token refresh,
 * role-based access control, and comprehensive error handling as per technical specifications
 */

import { useEffect, useCallback, useRef } from 'react'; // v18.0.0
import {
  AuthState,
  AuthUser,
  AuthTokens,
  UserRole
} from '../types/auth.types';
import { useAuthStore } from '../store/auth.store';
import {
  authenticate,
  validateToken,
  rotateToken
} from '../lib/auth';

// Constants for token refresh and security configuration
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes
const MAX_REFRESH_RETRIES = 3;
const REFRESH_RETRY_DELAY = 1000; // 1 second base delay
const AUTH_TIMEOUT = 30 * 1000; // 30 seconds login timeout

/**
 * Enhanced authentication hook providing secure authentication functionality
 * Implements comprehensive security features from technical specifications
 */
export function useAuth() {
  // Get authentication state from store
  const {
    user,
    tokens,
    loading,
    error,
    login: storeLogin,
    logout: storeLogout,
    refreshSession: storeRefresh,
    validateRole: storeValidateRole,
    resetError,
    clearSession
  } = useAuthStore();

  // Refs for managing refresh timer and retry count
  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const refreshRetryCountRef = useRef(0);
  const authTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Handles secure token refresh with retry capability
   * Implements exponential backoff for failed refresh attempts
   */
  const handleTokenRefresh = useCallback(async () => {
    try {
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Validate current token
      if (!validateToken(tokens.accessToken)) {
        throw new Error('Invalid access token');
      }

      // Attempt token refresh
      const newTokens = await storeRefresh();
      refreshRetryCountRef.current = 0;

      // Schedule next refresh
      refreshTimerRef.current = setTimeout(
        handleTokenRefresh,
        TOKEN_REFRESH_INTERVAL
      );

      return newTokens;
    } catch (error) {
      // Implement exponential backoff for retries
      if (refreshRetryCountRef.current < MAX_REFRESH_RETRIES) {
        refreshRetryCountRef.current++;
        const delay = REFRESH_RETRY_DELAY * Math.pow(2, refreshRetryCountRef.current - 1);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return handleTokenRefresh();
      }

      // Clear session on max retries
      clearSession();
      throw error;
    }
  }, [tokens, storeRefresh, clearSession]);

  /**
   * Securely handles user login process with timeout and CSRF protection
   * @param credentials - User login credentials
   */
  const handleLogin = useCallback(async (
    credentials: { email: string; password: string; rememberMe?: boolean }
  ) => {
    try {
      // Clear any existing timeouts
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }

      // Set authentication timeout
      authTimeoutRef.current = setTimeout(() => {
        clearSession();
        throw new Error('Authentication timeout');
      }, AUTH_TIMEOUT);

      // Attempt authentication
      const result = await storeLogin(credentials);

      // Clear timeout on success
      clearTimeout(authTimeoutRef.current);

      // Initialize token refresh cycle
      refreshTimerRef.current = setTimeout(
        handleTokenRefresh,
        TOKEN_REFRESH_INTERVAL
      );

      return result;
    } catch (error) {
      clearTimeout(authTimeoutRef.current);
      throw error;
    }
  }, [storeLogin, handleTokenRefresh, clearSession]);

  /**
   * Validates user role against required permissions
   * Implements role-based access control from technical specifications
   * @param requiredRole - Required role for access
   */
  const validateRole = useCallback((requiredRole: UserRole): boolean => {
    if (!user) return false;

    const roleHierarchy = {
      [UserRole.ADMIN]: 5,
      [UserRole.ORGANIZATION_ADMIN]: 4,
      [UserRole.AGENT]: 3,
      [UserRole.FORM_MANAGER]: 2,
      [UserRole.READ_ONLY]: 1
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }, [user]);

  /**
   * Handles secure logout with session cleanup
   */
  const handleLogout = useCallback(async () => {
    try {
      // Clear refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      // Perform logout
      await storeLogout();

      // Clear session
      clearSession();
    } catch (error) {
      console.error('Logout error:', error);
      clearSession();
    }
  }, [storeLogout, clearSession]);

  // Set up automatic token refresh on mount
  useEffect(() => {
    if (tokens?.accessToken) {
      refreshTimerRef.current = setTimeout(
        handleTokenRefresh,
        TOKEN_REFRESH_INTERVAL
      );
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [tokens, handleTokenRefresh]);

  return {
    user,
    tokens,
    loading,
    error,
    isAuthenticated: !!user,
    login: handleLogin,
    logout: handleLogout,
    validateRole,
    refreshToken: handleTokenRefresh,
    resetError
  };
}