/**
 * @file Comprehensive test suite for useAuth hook
 * @version 1.0.0
 * @description Tests JWT-based authentication, session management, security features,
 * and error handling as per technical specifications
 */

import { renderHook, act, waitFor } from '@testing-library/react-hooks'; // v8.0.1
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'; // v29.7.0
import useAuth from '../../src/hooks/useAuth';
import { AuthUser, LoginCredentials, RegisterData, UserRole } from '../../src/types/auth.types';
import useAuthStore from '../../src/store/auth.store';

// Mock tokens for testing
const mockTokens = {
  accessToken: 'mock.jwt.token',
  refreshToken: 'mock.refresh.token',
  expiresIn: 3600
};

// Mock user data
const mockUser: AuthUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: UserRole.ORGANIZATION_ADMIN,
  organizationId: 'test-org-id'
};

// Mock login credentials
const mockLoginCredentials: LoginCredentials = {
  email: 'test@example.com',
  password: 'Password123!',
  rememberMe: false
};

// Mock registration data
const mockRegisterData: RegisterData = {
  email: 'test@example.com',
  password: 'Password123!',
  name: 'Test User',
  organizationName: 'Test Organization'
};

describe('useAuth Hook', () => {
  // Setup and teardown
  beforeEach(() => {
    // Reset auth store state
    useAuthStore.setState({
      user: null,
      tokens: null,
      loading: false,
      error: null,
      csrfToken: 'mock-csrf-token'
    });

    // Clear all mocks
    jest.clearAllMocks();

    // Reset localStorage
    localStorage.clear();

    // Mock timer functions
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore timer functions
    jest.useRealTimers();
  });

  describe('Authentication Flow', () => {
    it('should handle successful login', async () => {
      const { result } = renderHook(() => useAuth());

      // Mock successful login
      useAuthStore.setState = jest.fn().mockImplementation(() => ({
        user: mockUser,
        tokens: mockTokens,
        loading: false,
        error: null
      }));

      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const { result } = renderHook(() => useAuth());

      // Mock login failure
      useAuthStore.setState = jest.fn().mockImplementation(() => ({
        user: null,
        tokens: null,
        loading: false,
        error: 'Invalid credentials'
      }));

      await act(async () => {
        try {
          await result.current.login(mockLoginCredentials);
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('should handle logout', async () => {
      const { result } = renderHook(() => useAuth());

      // Set initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        tokens: mockTokens,
        loading: false,
        error: null
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should handle token refresh', async () => {
      const { result } = renderHook(() => useAuth());

      // Set initial state with expired token
      useAuthStore.setState({
        user: mockUser,
        tokens: {
          ...mockTokens,
          accessToken: 'expired.token'
        },
        loading: false,
        error: null
      });

      // Mock successful token refresh
      const newTokens = {
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
        expiresIn: 3600
      };

      useAuthStore.setState = jest.fn().mockImplementation(() => ({
        user: mockUser,
        tokens: newTokens,
        loading: false,
        error: null
      }));

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.tokens).toEqual(newTokens);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle session timeout', async () => {
      const { result } = renderHook(() => useAuth());

      // Set initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        tokens: mockTokens,
        loading: false,
        error: null
      });

      // Fast-forward past session timeout
      act(() => {
        jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('should validate session state', async () => {
      const { result } = renderHook(() => useAuth());

      // Set initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        tokens: mockTokens,
        loading: false,
        error: null
      });

      expect(result.current.validateRole(UserRole.AGENT)).toBe(true);
      expect(result.current.validateRole(UserRole.ADMIN)).toBe(false);
    });
  });

  describe('Security Features', () => {
    it('should handle concurrent authentication attempts', async () => {
      const { result } = renderHook(() => useAuth());

      // Attempt multiple concurrent logins
      const loginPromises = Array(3).fill(null).map(() => 
        result.current.login(mockLoginCredentials)
      );

      await act(async () => {
        const results = await Promise.allSettled(loginPromises);
        const successfulLogins = results.filter(r => r.status === 'fulfilled');
        expect(successfulLogins.length).toBe(1); // Only one should succeed
      });
    });

    it('should handle token rotation', async () => {
      const { result } = renderHook(() => useAuth());

      // Set initial state
      useAuthStore.setState({
        user: mockUser,
        tokens: mockTokens,
        loading: false,
        error: null
      });

      // Mock token rotation
      const rotatedTokens = {
        accessToken: 'rotated.access.token',
        refreshToken: 'rotated.refresh.token',
        expiresIn: 3600
      };

      useAuthStore.setState = jest.fn().mockImplementation(() => ({
        user: mockUser,
        tokens: rotatedTokens,
        loading: false,
        error: null
      }));

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.tokens).toEqual(rotatedTokens);
    });

    it('should handle refresh token expiration', async () => {
      const { result } = renderHook(() => useAuth());

      // Set initial state with expired refresh token
      useAuthStore.setState({
        user: mockUser,
        tokens: {
          ...mockTokens,
          refreshToken: 'expired.refresh.token'
        },
        loading: false,
        error: null
      });

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const { result } = renderHook(() => useAuth());

      // Mock network error
      useAuthStore.setState = jest.fn().mockImplementation(() => {
        throw new Error('Network error');
      });

      await act(async () => {
        try {
          await result.current.login(mockLoginCredentials);
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle invalid tokens', async () => {
      const { result } = renderHook(() => useAuth());

      // Set invalid token state
      useAuthStore.setState({
        user: mockUser,
        tokens: {
          ...mockTokens,
          accessToken: 'invalid.token'
        },
        loading: false,
        error: null
      });

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});