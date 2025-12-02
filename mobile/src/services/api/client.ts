import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authClient } from '../../lib/auth-client';
import { ApiError, ApiResponse } from '../../types/api';
import { Platform } from 'react-native';
import { resolveApiBaseUrl } from '../../config/env';

const API_CONFIG = {
  baseURL: resolveApiBaseUrl(),
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Custom error class
export class ApiClientError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Request retry utility
const retryRequest = async (
  fn: () => Promise<any>,
  retries: number,
  delay: number
): Promise<any> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    // Only retry on network errors or 5xx server errors
    if (error instanceof ApiClientError && error.statusCode >= 500) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2);
    }
    
    throw error;
  }
};

// API Client class
export class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `AIRWIG-Mobile/${Platform.OS}/${Platform.Version}`,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        try {
          // Get cookies from Better Auth and add to request headers
          const cookies = authClient.getCookie();
          if (cookies) {
            config.headers = config.headers || {};
            config.headers['Cookie'] = cookies;
          }
        } catch (error) {
          console.warn('Failed to get auth cookies:', error);
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const apiError = this.handleError(error);
        
        // Handle 401 Unauthorized
        if (apiError.statusCode === 401) {
          return this.handleUnauthorized(apiError);
        }
        
        // Handle 403 Forbidden (suspension)
        if (apiError.statusCode === 403) {
          return this.handleForbidden(apiError);
        }
        
        return Promise.reject(apiError);
      }
    );
  }

  private handleError(error: AxiosError): ApiClientError {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const errorData = data as any;
      
      return new ApiClientError(
        errorData?.message || errorData?.error || `HTTP ${status} error`,
        status || 500,
        errorData?.code || 'UNKNOWN_ERROR',
        errorData?.details
      );
    } else if (error.request) {
      // Network error
      return new ApiClientError(
        'Network error - unable to connect to server',
        0,
        'NETWORK_ERROR'
      );
    } else {
      // Other error
      return new ApiClientError(
        error.message || 'Unknown error occurred',
        500,
        'UNKNOWN_ERROR'
      );
    }
  }

  private async handleUnauthorized(error: ApiClientError): Promise<never> {
    // For now, just reject the error
    // In a real app, you might want to trigger a sign-out or token refresh
    return Promise.reject(error);
  }

  private async handleForbidden(error: ApiClientError): Promise<never> {
    // Check if it's a suspension error
    if (error.code === 'ACCOUNT_SUSPENDED') {
      // Handle suspension - this will be caught by the auth hook
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }

  // Generic request method with retry logic
  private async request<T>(
    config: AxiosRequestConfig,
    retryAttempts: number = API_CONFIG.retryAttempts
  ): Promise<T> {
    return retryRequest(
      () => this.client.request<T>(config),
      retryAttempts,
      API_CONFIG.retryDelay
    );
  }

  // HTTP Methods - cookies are automatically added via interceptor
  async get<T>(endpoint: string, params?: any, token?: string): Promise<T> {
    // Token parameter kept for backward compatibility but not used (cookies used instead)
    const response = await this.request<ApiResponse<T>>({
      method: 'GET',
      url: endpoint,
      params,
      withCredentials: true,
    });
    return response.data as T;
  }

  async post<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    // Token parameter kept for backward compatibility but not used (cookies used instead)
    const response = await this.request<ApiResponse<T>>({
      method: 'POST',
      url: endpoint,
      data,
      withCredentials: true,
    });
    return response.data as T;
  }

  async put<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    // Token parameter kept for backward compatibility but not used (cookies used instead)
    const response = await this.request<ApiResponse<T>>({
      method: 'PUT',
      url: endpoint,
      data,
      withCredentials: true,
    });
    return response.data as T;
  }

  async patch<T>(endpoint: string, data?: any, token?: string): Promise<T> {
    // Token parameter kept for backward compatibility but not used (cookies used instead)
    const response = await this.request<ApiResponse<T>>({
      method: 'PATCH',
      url: endpoint,
      data,
      withCredentials: true,
    });
    return response.data as T;
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    // Token parameter kept for backward compatibility but not used (cookies used instead)
    const response = await this.request<ApiResponse<T>>({
      method: 'DELETE',
      url: endpoint,
      withCredentials: true,
    });
    return response.data as T;
  }

  // File upload method
  async uploadFile<T>(endpoint: string, formData: FormData, token?: string): Promise<T> {
    // Token parameter kept for backward compatibility but not used (cookies used instead)
    const response = await this.request<ApiResponse<T>>({
      method: 'POST',
      url: endpoint,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    });
    return response.data as T;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient; 