import { authClient } from '../../lib/auth-client';
import { resolveApiBaseUrl } from '../../config/env';

const API_BASE_URL = resolveApiBaseUrl();

const request = async (endpoint: string, options: RequestInit = {}, token?: string) => {
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || `HTTP ${response.status} error`);
  }

  return response.json();
};

export const commentsAPI = {
  async getComments(token: string | undefined, postId: string, page: number = 1, limit: number = 20) {
    return request(`/posts/${postId}/comments?page=${page}&limit=${limit}`, {}, token);
  },

  async createComment(token: string | undefined, postId: string, content: string) {
    return request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }, token);
  },

  async updateComment(token: string | undefined, commentId: string, content: string) {
    return request(`/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }, token);
  },

  async deleteComment(token: string | undefined, commentId: string) {
    return request(`/comments/${commentId}`, {
      method: 'DELETE',
    }, token);
  },

  async likeComment(token: string | undefined, commentId: string) {
    return request(`/comments/${commentId}/like`, {
      method: 'POST',
    }, token);
  },

  async createReply(token: string | undefined, commentId: string, content: string) {
    return request(`/comments/${commentId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }, token);
  },

  async getReplies(token: string | undefined, commentId: string, page: number = 1, limit: number = 20) {
    return request(`/comments/${commentId}/replies?page=${page}&limit=${limit}`, {}, token);
  },
};
