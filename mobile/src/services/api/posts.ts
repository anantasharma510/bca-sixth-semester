import { authClient } from '../../lib/auth-client';
import { resolveApiBaseUrl } from '../../config/env';

const API_BASE_URL = resolveApiBaseUrl();

class PostsAPI {
  private async callAPI(endpoint: string, token: string | undefined, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const cookies = authClient.getCookie();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    
    // Use cookies if available (Better Auth), otherwise fall back to token for backward compatibility
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

  private async callFormDataAPI(endpoint: string, token: string | undefined, formData: FormData) {
    const url = `${API_BASE_URL}${endpoint}`;
    const cookies = authClient.getCookie();
    const headers: Record<string, string> = {};
    
    // Use cookies if available (Better Auth), otherwise fall back to token for backward compatibility
    if (cookies) {
      headers['Cookie'] = cookies;
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status} error`);
    }

    return response.json();
  }

  // Post CRUD operations
  // Token parameter is optional for backward compatibility - Better Auth uses cookies
  async getPosts(token: string | undefined, page: number = 1, limit: number = 20) {
    return this.callAPI(`/posts?page=${page}&limit=${limit}`, token);
  }

  async getPublicPosts(limit: number = 10) {
    const response = await fetch(`${API_BASE_URL}/posts/public?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch public posts: ${response.status}`);
    }
    return response.json();
  }

  async getPost(token: string | undefined, postId: string) {
    return this.callAPI(`/posts/${postId}`, token);
  }

  async getRecentMedia(token: string | undefined, limit: number = 20) {
    return this.callAPI(`/posts/recent-media?limit=${limit}`, token);
  }

  async createPost(token: string | undefined, formData: FormData) {
    return this.callFormDataAPI('/posts', token, formData);
  }

  async updatePost(token: string | undefined, postId: string, formData: FormData) {
    const url = `${API_BASE_URL}/posts/${postId}`;
    const cookies = authClient.getCookie();
    const headers: Record<string, string> = {};
    
    // Use cookies if available (Better Auth), otherwise fall back to token for backward compatibility
    if (cookies) {
      headers['Cookie'] = cookies;
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status} error`);
    }

    return response.json();
  }

  async deletePost(token: string | undefined, postId: string) {
    return this.callAPI(`/posts/${postId}`, token, { method: 'DELETE' });
  }

  // Like functionality
  async likePost(token: string | undefined, postId: string) {
    console.log('📱 API: Liking post:', postId);
    const response = await this.callAPI(`/posts/${postId}/like`, token, { method: 'POST' });
    console.log('📱 API: Like response:', response);
    return response;
  }

  // Repost functionality
  async repost(token: string | undefined, postId: string, comment?: string) {
    console.log('📱 API: Reposting post:', postId, 'comment:', comment);
    const response = await this.callAPI(`/posts/${postId}/repost`, token, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    console.log('📱 API: Repost response:', response);
    return response;
  }

  async updateRepost(token: string | undefined, repostId: string, comment?: string) {
    console.log('📱 API: Updating repost:', repostId, 'comment:', comment);
    const response = await this.callAPI(`/posts/reposts/${repostId}`, token, {
      method: 'PUT',
      body: JSON.stringify({ comment }),
    });
    console.log('📱 API: Update repost response:', response);
    return response;
  }

  async deleteRepost(token: string | undefined, repostId: string) {
    console.log('📱 API: Deleting repost:', repostId);
    const response = await this.callAPI(`/posts/reposts/${repostId}`, token, { method: 'DELETE' });
    console.log('📱 API: Delete repost response:', response);
    return response;
  }

  // Comment functionality
  async getComments(token: string | undefined, postId: string, page: number = 1, limit: number = 20) {
    console.log('📱 API: Getting comments for post:', postId, 'page:', page, 'limit:', limit);
    const response = await this.callAPI(`/posts/${postId}/comments?page=${page}&limit=${limit}`, token);
    console.log('📱 API: Comments response:', {
      commentCount: response.comments?.length || 0,
      comments: response.comments?.map((c: any) => ({
        _id: c._id,
        content: c.content,
        replyCount: c.replyCount,
        parentComment: c.parentComment
      }))
    });
    return response;
  }

  async createComment(token: string | undefined, postId: string, content: string) {
    console.log('📱 API: Creating comment for post:', postId, 'content:', content);
    const response = await this.callAPI(`/posts/${postId}/comments`, token, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    console.log('📱 API: Comment creation response:', response);
    return response;
  }

  async updateComment(token: string | undefined, commentId: string, content: string) {
    const response = await this.callAPI(`/comments/${commentId}`, token, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
    return response;
  }

  async deleteComment(token: string | undefined, commentId: string) {
    const response = await this.callAPI(`/comments/${commentId}`, token, { method: 'DELETE' });
    return response;
  }

  async likeComment(token: string | undefined, commentId: string) {
    console.log('📱 API: Liking comment:', commentId);
    const response = await this.callAPI(`/comments/${commentId}/like`, token, { method: 'POST' });
    console.log('📱 API: Comment like response:', response);
    return response;
  }

  // Reply functionality
  async getReplies(token: string | undefined, commentId: string, page: number = 1, limit: number = 20) {
    console.log('📱 API: Getting replies for comment:', commentId, 'page:', page, 'limit:', limit);
    const response = await this.callAPI(`/comments/${commentId}/replies?page=${page}&limit=${limit}`, token);
    console.log('📱 API: Replies response:', {
      replyCount: response.replies?.length || 0,
      replies: response.replies?.map((r: any) => ({
        _id: r._id,
        content: r.content,
        parentComment: r.parentComment
      }))
    });
    return response;
  }

  async createReply(token: string | undefined, commentId: string, content: string) {
    console.log('📱 API: Creating reply to comment:', commentId, 'content:', content);
    const response = await this.callAPI(`/comments/${commentId}/replies`, token, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    console.log('📱 API: Reply creation response:', response);
    return response;
  }

  // Explore and trending
  async getExplorePosts(token: string | undefined, limit: number = 20) {
    return this.callAPI(`/posts/explore?limit=${limit}`, token);
  }

  async getTrendingPosts(token: string | undefined, limit: number = 10, hashtag?: string) {
    let url = `/posts/trending?limit=${limit}`;
    if (hashtag) url += `&hashtag=${encodeURIComponent(hashtag)}`;
    return this.callAPI(url, token);
  }

  async getTrendingHashtags(token: string | undefined, limit: number = 10, days: number = 2) {
    return this.callAPI(`/posts/trending-hashtags?limit=${limit}&days=${days}`, token);
  }


}

// Create and export singleton instance
export const postsAPI = new PostsAPI(); 