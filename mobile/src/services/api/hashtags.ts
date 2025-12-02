import { useApiService } from '../api';
import { resolveApiBaseUrl } from '../../config/env';

const API_BASE_URL = resolveApiBaseUrl();

export const useHashtagsApi = () => {
  const api = useApiService();

  const getTrendingHashtags = async (limit = 10, days = 2) => {
    // Use the same endpoint as frontend with days parameter
    return api.get(`/posts/trending-hashtags?limit=${limit}&days=${days}`);
  };

  const getHashtagPosts = async (hashtag: string, page = 1, limit = 20) => {
    return api.get(`/hashtags/${encodeURIComponent(hashtag)}/posts?page=${page}&limit=${limit}`);
  };

  return {
    getTrendingHashtags,
    getHashtagPosts,
  };
};

// Legacy API for backward compatibility
class HashtagsAPI {
  private async callAPI(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status} error`);
    }

    return response.json();
  }

  async getTrendingHashtags(limit: number = 10, days: number = 2) {
    // Use the same endpoint as frontend with days parameter
    return this.callAPI(`/posts/trending-hashtags?limit=${limit}&days=${days}`);
  }

  async getHashtagPosts(hashtag: string, page: number = 1, limit: number = 20) {
    return this.callAPI(`/hashtags/${encodeURIComponent(hashtag)}/posts?page=${page}&limit=${limit}`);
  }
}

export const hashtagsAPI = new HashtagsAPI(); 