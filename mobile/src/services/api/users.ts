import { useApiService } from '../api';
import { authClient } from '../../lib/auth-client';
import { resolveApiBaseUrl } from '../../config/env';

const API_BASE_URL = resolveApiBaseUrl();

export const useUsersApi = () => {
  const api = useApiService();

  const searchUsers = async (query: string, page = 1, limit = 20) => {
    if (!query.trim()) {
      return { users: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
    
    // Use the same protected endpoint as frontend
    return api.get(`/protected/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  };

  const getUser = async (userId: string) => {
    return api.get(`/protected/users/${userId}`);
  };

  const getUserByUsername = async (username: string) => {
    // Search for user by username using search endpoint
    const result = await api.get(`/protected/users/search?q=${encodeURIComponent(username)}&limit=1`);
    if (result.users && result.users.length > 0) {
      const user = result.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
      if (user) return user;
    }
    throw new Error('User not found');
  };

  const followUser = async (userId: string) => {
    return api.post(`/follows/${userId}/follow`);
  };

  const unfollowUser = async (userId: string) => {
    return api.delete(`/follows/${userId}/follow`);
  };

  const getFollowers = async (userId: string, page = 1, limit = 20) => {
    return api.get(`/follows/${userId}/followers?page=${page}&limit=${limit}`);
  };

  const getFollowing = async (userId: string, page = 1, limit = 20) => {
    return api.get(`/follows/${userId}/following-list?page=${page}&limit=${limit}`);
  };

  const getSuggestedUsers = async (limit = 5) => {
    return api.get(`/follows/suggestions?limit=${limit}`);
  };

  return {
    searchUsers,
    getUser,
    getUserByUsername,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getSuggestedUsers,
  };
};

// Legacy API for backward compatibility
class UsersAPI {
  private async callAPI(endpoint: string, token?: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const cookies = authClient.getCookie();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers ? (options.headers as Record<string, string>) : {}),
    };

    if (cookies) {
      headers['Cookie'] = cookies;
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status} error`);
    }

    return response.json();
  }

  async searchUsers(token: string | undefined, query: string, page: number = 1, limit: number = 20) {
    if (!query.trim()) {
      return { users: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
    
    // Use the same protected endpoint as frontend
    return this.callAPI(`/protected/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`, token);
  }

  async getUser(token: string | undefined, userId: string) {
    return this.callAPI(`/protected/users/${userId}`, token);
  }

  async followUser(token: string | undefined, userId: string) {
    return this.callAPI(`/follows/${userId}/follow`, token, { method: 'POST' });
  }

  async unfollowUser(token: string | undefined, userId: string) {
    return this.callAPI(`/follows/${userId}/follow`, token, { method: 'DELETE' });
  }
}

export const usersAPI = new UsersAPI(); 