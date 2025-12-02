import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuth } from '../hooks/useAuth';
import { authClient } from '../lib/auth-client';
import { useCallback } from 'react';
import { resolveApiBaseUrl } from '../config/env';

const API_BASE_URL = resolveApiBaseUrl();

// Create axios instance
// Increased timeout for uploads - React Native needs longer timeouts for file uploads
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 120 seconds default (was 10s) - needed for file uploads
  // Don't set default Content-Type - let it be set per request
});

// Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Custom hook for authenticated API calls
export const useApiService = () => {
  const { isSignedIn } = useAuth();

  const makeRequest = useCallback(async <T = any>(
    config: AxiosRequestConfig
  ): Promise<T> => {
    try {
      console.log('🔍 API Request Debug:', {
        url: `${API_BASE_URL}${config.url}`,
        method: config.method,
        isSignedIn,
        hasCookies: isSignedIn ? 'checking...' : 'not signed in'
      });

      // Get cookies for authenticated requests (Better Auth uses cookies, not tokens)
      let cookies: string | null = null;
      try {
        cookies = authClient.getCookie();
      } catch (cookieError) {
        console.warn('Failed to get auth cookies:', cookieError);
      }

      if (cookies) {
        config.headers = {
          ...config.headers,
          Cookie: cookies,
        };
        config.withCredentials = true;
        console.log('✅ Cookies added to request');
      } else if (isSignedIn) {
        console.warn('⚠️ Signed in but no cookies available yet. Proceeding without Cookie header.');
      } else {
        console.log('❌ User not signed in');
      }

      // Set appropriate Content-Type based on data type
      if (config.data instanceof FormData) {
        // For FormData, let Axios set the Content-Type with boundary
        delete config.headers?.['Content-Type'];
        console.log('📤 Making FormData request:', {
          method: config.method,
          url: config.url,
          headers: config.headers,
          hasAuth: !!config.headers?.Authorization,
          formDataType: 'FormData detected'
        });
      } else if (config.data && typeof config.data === 'object') {
        // For JSON data, set Content-Type to application/json
        config.headers = {
          ...config.headers,
          'Content-Type': 'application/json',
        };
      }

      // Ensure timeout is set for uploads (override instance default)
      if (config.timeout) {
        config.timeout = config.timeout;
      }
      
      console.log('🚀 Making API request to:', `${API_BASE_URL}${config.url}`, {
        timeout: config.timeout,
        method: config.method,
        hasFormData: config.data instanceof FormData
      });
      const response = await api(config);
      console.log('✅ API Response received:', response.status);
      
      // Debug logging for upload responses
      if (config.data instanceof FormData) {
        console.log('📥 FormData response:', {
          status: response.status,
          data: response.data
        });
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ API Request failed:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: `${API_BASE_URL}${config.url}`
      });
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        
        if (status === 401) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        
        if (status === 403) {
          if (data.suspended) {
            throw new Error('Account suspended');
          }
          throw new Error('Access denied');
        }
        
        if (status === 429) {
          throw new Error('Too many requests. Please wait and try again.');
        }
        
        if (status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        
        throw new Error(data.message || data.error || 'Request failed');
      } else if (error.request) {
        // Network error
        throw new Error('Network error. Please check your connection.');
      } else {
        // Other error
        throw new Error(error.message || 'An unexpected error occurred');
      }
    }
  }, [isSignedIn]);

  const get = useCallback(async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return makeRequest<T>({ ...config, method: 'GET', url });
  }, [makeRequest]);

  const post = useCallback(async <T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<T> => {
    return makeRequest<T>({ ...config, method: 'POST', url, data });
  }, [makeRequest]);

  const put = useCallback(async <T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<T> => {
    return makeRequest<T>({ ...config, method: 'PUT', url, data });
  }, [makeRequest]);

  const del = useCallback(async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return makeRequest<T>({ ...config, method: 'DELETE', url });
  }, [makeRequest]);

  const upload = useCallback(async <T = any>(
    url: string, 
    formData: FormData, 
    config?: AxiosRequestConfig
  ): Promise<T> => {
    try {
      // Use React Native's fetch API directly for uploads to avoid axios FormData issues
      const fullUrl = `${API_BASE_URL}${url}`;
      const timeout = config?.timeout || 120000; // 120 seconds for uploads
      
      // Get cookies for authenticated requests
      let cookies: string | null = null;
      try {
        cookies = authClient.getCookie();
      } catch (cookieError) {
        console.warn('Failed to get auth cookies:', cookieError);
      }
      
      console.log('📤 Upload method called (using fetch):', {
        url: fullUrl,
        timeout,
        hasFormData: formData instanceof FormData,
        hasCookies: !!cookies
      });
      
      // Create headers - DON'T set Content-Type, let fetch set it with boundary
      const headers: HeadersInit = {};
      if (cookies) {
        headers['Cookie'] = cookies;
      }
      
      // Use fetch with timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(fullUrl, {
          method: 'POST',
          body: formData,
          headers,
          credentials: 'include',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errorData.error || errorData.message || `Upload failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Upload response received:', response.status);
        return data;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Upload timeout. Please try again.');
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error('❌ Upload request failed:', {
        error: error.message,
        url: `${API_BASE_URL}${url}`
      });
      
      if (error.message.includes('timeout')) {
        throw new Error('Upload timeout. Please try again.');
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        throw new Error('Network error. Please check your connection.');
      }
      
      throw error;
    }
  }, []);

  return {
    get,
    post,
    put,
    delete: del,
    upload,
    makeRequest,
  };
};

// Legacy default export for backward compatibility
const apiService = {
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.get(url, config);
    return response.data;
  },

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.post(url, data, config);
    return response.data;
  },

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.put(url, data, config);
    return response.data;
  },

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.delete(url, config);
    return response.data;
  },
};

export default apiService; 