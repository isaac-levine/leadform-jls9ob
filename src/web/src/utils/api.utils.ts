import axios, { AxiosError, AxiosResponse } from 'axios'; // ^1.6.0
import { AuthTokens } from '../types/auth.types';

// Maximum number of retry attempts for failed requests
const MAX_RETRIES = 3;

// Initial delay in milliseconds between retry attempts
const RETRY_DELAY = 1000;

/**
 * Interface for formatted API error response
 */
interface FormattedApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
  requestInfo?: {
    url?: string;
    method?: string;
    params?: any;
  };
}

/**
 * Processes and formats API errors for consistent error handling across the application
 * @param error - The axios error object to process
 * @returns Formatted error object with consistent structure
 */
export function handleApiError(error: AxiosError): FormattedApiError {
  const formattedError: FormattedApiError = new Error();
  
  // Extract base error message
  formattedError.message = error.message;
  
  // Add HTTP status if available
  if (error.response) {
    formattedError.status = error.response.status;
    
    // Extract detailed error information from response
    const responseData = error.response.data as any;
    if (responseData) {
      formattedError.message = responseData.message || error.message;
      formattedError.code = responseData.code;
      formattedError.details = responseData.details;
    }
  }
  
  // Add request details for debugging
  if (error.config) {
    formattedError.requestInfo = {
      url: error.config.url,
      method: error.config.method?.toUpperCase(),
      params: error.config.params
    };
  }
  
  // Set name for error type identification
  formattedError.name = 'ApiError';
  
  return formattedError;
}

/**
 * Determines if an error is a network-related error that warrants a retry attempt
 * @param error - The axios error to evaluate
 * @returns boolean indicating if the error is retryable
 */
export function isNetworkError(error: AxiosError): boolean {
  // No response indicates network error
  if (!error.response) {
    return true;
  }
  
  // Check for timeout errors
  if (error.code === 'ECONNABORTED') {
    return true;
  }
  
  // Check for DNS and network-related error codes
  if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'].includes(error.code || '')) {
    return true;
  }
  
  // Check for server errors (5xx)
  if (error.response.status >= 500 && error.response.status <= 599) {
    return true;
  }
  
  return false;
}

/**
 * Implements exponential backoff retry logic for failed API requests
 * @param requestFn - The API request function to retry
 * @param maxRetries - Maximum number of retry attempts (default: MAX_RETRIES)
 * @param initialDelay - Initial delay between retries in ms (default: RETRY_DELAY)
 * @returns Promise resolving to the API response or rejecting with error after max retries
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = RETRY_DELAY
): Promise<T> {
  let retryCount = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await requestFn();
    } catch (error) {
      // Check if error is retryable and we haven't exceeded max retries
      if (error instanceof AxiosError && isNetworkError(error) && retryCount < maxRetries) {
        // Calculate exponential backoff delay
        delay = initialDelay * Math.pow(2, retryCount);
        
        // Add some randomness to prevent thundering herd
        const jitter = Math.random() * 100;
        
        // Wait for calculated delay
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        
        retryCount++;
        continue;
      }
      
      // If not retryable or max retries exceeded, throw formatted error
      if (error instanceof AxiosError) {
        throw handleApiError(error);
      }
      throw error;
    }
  }
}

/**
 * Formats and sanitizes query parameters for API requests
 * @param params - Object containing query parameters
 * @returns URL-encoded query string
 */
export function formatQueryParams(params: Record<string, any>): string {
  // Filter out null and undefined values
  const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
  
  // Convert to URLSearchParams
  const searchParams = new URLSearchParams();
  
  // Process and add each parameter
  Object.entries(filteredParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      // Handle array values
      value.forEach(item => searchParams.append(`${key}[]`, String(item)));
    } else if (typeof value === 'object') {
      // Handle nested objects
      searchParams.append(key, JSON.stringify(value));
    } else {
      // Handle primitive values
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
}

/**
 * Adds authorization headers to API requests
 * @param tokens - Authentication tokens
 * @returns Object containing authorization headers
 */
export function getAuthHeaders(tokens: AuthTokens): Record<string, string> {
  return {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'X-Refresh-Token': tokens.refreshToken
  };
}