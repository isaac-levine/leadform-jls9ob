/**
 * @file Core API client library for web frontend HTTP communication
 * @version 1.0.0
 * @description Implements secure API communication with comprehensive error handling,
 * automatic token refresh, and request/response interceptors
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'; // v1.6.0
import { AuthTokens, LoginCredentials } from '../types/auth.types';
import { FormState } from '../types/form.types';
import { Message, MessageType, isMessage, CreateMessageDTO } from '../types/message.types';
import { validateFormField } from '../utils/validation.utils';

// Environment configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

/**
 * Custom API error class with enhanced error details
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.timestamp = new Date();
    Error.captureStackTrace(this, ApiError);
  }

  public readonly timestamp: Date;

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

/**
 * Creates an axios instance with enhanced security configuration
 * @param tokens - Authentication tokens for requests
 * @returns Configured axios instance
 */
export const createApiClient = (tokens: AuthTokens | null): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // Request interceptor for authentication and validation
  client.interceptors.request.use(
    (config) => {
      // Add auth header if tokens exist
      if (tokens?.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      }

      // Add request timestamp for monitoring
      config.metadata = { startTime: new Date() };

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and token refresh
  client.interceptors.response.use(
    (response) => {
      // Add response timing metadata
      const startTime = response.config.metadata?.startTime;
      if (startTime) {
        const duration = new Date().getTime() - startTime.getTime();
        response.headers['x-response-time'] = duration.toString();
      }

      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
      
      // Handle token refresh
      if (error.response?.status === 401 && !originalRequest._retry && tokens?.refreshToken) {
        originalRequest._retry = true;
        try {
          const newTokens = await refreshToken(tokens.refreshToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          // Handle refresh failure
          return Promise.reject(new ApiError(
            'Session expired',
            401,
            'AUTH_REFRESH_FAILED',
            { originalError: refreshError }
          ));
        }
      }

      // Transform error response
      const apiError = new ApiError(
        error.response?.data?.message || 'An unexpected error occurred',
        error.response?.status || 500,
        error.response?.data?.code || 'UNKNOWN_ERROR',
        error.response?.data?.details || {}
      );

      return Promise.reject(apiError);
    }
  );

  return client;
};

/**
 * Authenticates user with credentials
 * @param credentials - User login credentials
 * @returns Authentication tokens
 */
export const login = async (credentials: LoginCredentials): Promise<AuthTokens> => {
  try {
    const client = createApiClient(null);
    const response = await client.post<AuthTokens>('/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw new ApiError(
      'Login failed',
      error instanceof ApiError ? error.status : 500,
      'AUTH_FAILED',
      { originalError: error }
    );
  }
};

/**
 * Refreshes authentication tokens
 * @param refreshToken - Current refresh token
 * @returns New authentication tokens
 */
export const refreshToken = async (refreshToken: string): Promise<AuthTokens> => {
  try {
    const client = createApiClient(null);
    const response = await client.post<AuthTokens>('/auth/refresh', { refreshToken });
    return response.data;
  } catch (error) {
    throw new ApiError(
      'Token refresh failed',
      error instanceof ApiError ? error.status : 500,
      'REFRESH_FAILED',
      { originalError: error }
    );
  }
};

/**
 * Retrieves forms for organization with caching
 * @param organizationId - Organization identifier
 * @returns List of forms
 */
export const getForms = async (organizationId: string): Promise<FormState[]> => {
  try {
    const client = createApiClient(null);
    const response = await client.get<FormState[]>(`/forms`, {
      params: { organizationId },
      headers: {
        'Cache-Control': 'max-age=300' // 5 minute cache
      }
    });
    return response.data;
  } catch (error) {
    throw new ApiError(
      'Failed to retrieve forms',
      error instanceof ApiError ? error.status : 500,
      'FORMS_FETCH_FAILED',
      { organizationId, originalError: error }
    );
  }
};

/**
 * Retrieves messages for a lead with pagination
 * @param leadId - Lead identifier
 * @param page - Page number
 * @param limit - Items per page
 * @returns Paginated list of messages
 */
export const getMessages = async (
  leadId: string,
  page: number = 1,
  limit: number = 20
): Promise<Message[]> => {
  try {
    const client = createApiClient(null);
    const response = await client.get<Message[]>(`/messages`, {
      params: { leadId, page, limit }
    });

    // Validate response data
    if (!Array.isArray(response.data) || !response.data.every(isMessage)) {
      throw new Error('Invalid message data received');
    }

    return response.data;
  } catch (error) {
    throw new ApiError(
      'Failed to retrieve messages',
      error instanceof ApiError ? error.status : 500,
      'MESSAGES_FETCH_FAILED',
      { leadId, page, limit, originalError: error }
    );
  }
};

/**
 * Sends a new message with retry capability
 * @param messageData - Message data to send
 * @returns Created message
 */
export const sendMessage = async (messageData: CreateMessageDTO): Promise<Message> => {
  let retries = 0;
  
  const attemptSend = async (): Promise<Message> => {
    try {
      const client = createApiClient(null);
      const response = await client.post<Message>('/messages/send', messageData);

      if (!isMessage(response.data)) {
        throw new Error('Invalid message response received');
      }

      return response.data;
    } catch (error) {
      if (retries < MAX_RETRIES && error instanceof ApiError && error.status >= 500) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries - 1)));
        return attemptSend();
      }
      throw new ApiError(
        'Failed to send message',
        error instanceof ApiError ? error.status : 500,
        'MESSAGE_SEND_FAILED',
        { messageData, retries, originalError: error }
      );
    }
  };

  return attemptSend();
};

export type { AuthTokens, LoginCredentials, Message, MessageType, FormState };
export { ApiError };