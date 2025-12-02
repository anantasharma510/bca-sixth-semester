import { authClient } from "@/lib/auth-client";
import { useSmartToast } from "@/hooks/use-toast";
import { useCallback } from "react";

export function useProtectedApi() {
  const { toast } = useSmartToast();

  const callProtectedApi = useCallback(async (endpoint: string, options: RequestInit = {}, retryCount = 0) => {
    // Check if user has a valid session
    const session = await authClient.getSession();
    if (!session?.data?.session) {
      throw new Error("No Better Auth session found. Please sign in.");
    }
    
    // Prefix endpoint with backend URL if not absolute
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = endpoint.startsWith("http") ? endpoint : `${apiUrl}${endpoint}`;
    
    console.log('🔍 API Debug:', {
      endpoint,
      apiUrl,
      fullUrl: url,
      method: options.method || 'GET',
      hasSession: !!session?.data?.session,
    });
    
    try {
      // For FormData, don't set Content-Type header - let browser set it with boundary
      // Better Auth uses cookies, so we don't need Authorization header
      const headers: Record<string, string> = {};
      
      // Only add other headers if not FormData
      if (!(options.body instanceof FormData)) {
        Object.assign(headers, options.headers || {});
      } else {
        // For FormData, only add non-Content-Type headers
        if (options.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'content-type') {
              headers[key] = value;
            }
          });
        }
      }
      
      // Better Auth uses cookies, so we need to include credentials
      const res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Important: Include cookies for Better Auth
      });
      
      if (!res.ok) {
        console.log('🔍 API request failed:', {
          status: res.status,
          statusText: res.statusText,
          url: url,
          method: options.method || 'GET'
        });

        let errorData;
        let rawResponse;
        
        try {
          // Try to get the response text first
          rawResponse = await res.text();
          console.log('📄 Raw response:', rawResponse);
          
          // Check if response is HTML (likely a frontend page)
          if (rawResponse.includes('<!DOCTYPE html>') || rawResponse.includes('<html')) {
            console.error('❌ Received HTML response instead of JSON - likely hitting frontend instead of API');
            throw new Error(`Server returned HTML instead of JSON. Check API URL configuration. Status: ${res.status}`);
          }
          
          // Try to parse as JSON
          errorData = rawResponse ? JSON.parse(rawResponse) : {};
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          console.log('📄 Raw response that failed to parse:', rawResponse);
          errorData = { 
            error: `Server returned non-JSON response: ${rawResponse}`,
            status: res.status,
            statusText: res.statusText
          };
        }
        
        // Handle suspension
        if (res.status === 403 && errorData.suspended) {
          toast({
            title: "Account Suspended",
            description: "Your account has been suspended by an administrator.",
            variant: "destructive"
          });
          await authClient.signOut();
          throw new Error("Account suspended");
        }
        
        // Handle rate limiting with retry logic
        if (res.status === 429 && retryCount < 3) {
          const retryAfter = errorData.retryAfter || 1;
          console.log(`Rate limited, retrying after ${retryAfter} seconds... (attempt ${retryCount + 1}/3)`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          
          // Retry the request
          return callProtectedApi(endpoint, options, retryCount + 1);
        }
        
        // Handle rate limiting without retries
        if (res.status === 429) {
          toast({
            title: "Too Many Requests",
            description: "You're making too many requests. Please wait a moment and try again.",
            variant: "destructive"
          });
          throw new Error(`Rate limit exceeded. Please try again later.`);
        }
        
        // Handle 401 Unauthorized - session might be expired or invalid
        if (res.status === 401) {
          // For 401 errors, create a special error that can be caught and handled gracefully
          const authError = new Error(errorData.message || errorData.error || "Unauthorized - please sign in");
          (authError as any).isAuthError = true;
          (authError as any).statusCode = 401;
          // Don't show toast for 401s - let the calling component handle it
          // Only log in debug mode to reduce console noise
          if (process.env.NODE_ENV === 'development') {
            console.log('🔒 401 Unauthorized - session may be expired or invalid:', {
              endpoint,
              url: url,
              method: options.method || 'GET'
            });
          }
          throw authError;
        }
        
        const errorMessage = errorData.message || errorData.error || errorData.details || `HTTP ${res.status} ${res.statusText}`;
        console.error('🚨 API Error Details:', {
          status: res.status,
          statusText: res.statusText,
          errorData,
          url: url,
          method: options.method || 'GET'
        });
        throw new Error(errorMessage);
      }
      
      return res.json();
    } catch (error: any) {
      // Handle network errors or other fetch errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('Network error:', error);
        toast({
          title: "Network Error",
          description: "Unable to connect to the server. Please check your internet connection.",
          variant: "destructive"
        });
        throw new Error("Network error - unable to connect to server");
      }
      
      throw error;
    }
  }, [toast]);

  return { callProtectedApi };
}

// Follow-related API functions
export function useFollowApi() {
  const { callProtectedApi } = useProtectedApi();

  const followUser = useCallback(async (userId: string) => {
    const response = await callProtectedApi(`/api/follows/${userId}/follow`, {
      method: 'POST',
    });
    return response;
  }, [callProtectedApi]);

  const unfollowUser = useCallback(async (userId: string) => {
    const response = await callProtectedApi(`/api/follows/${userId}/follow`, {
      method: 'DELETE',
    });
    return response;
  }, [callProtectedApi]);

  const checkFollowingStatus = useCallback(async (userId: string) => {
    const response = await callProtectedApi(`/api/follows/${userId}/following`);
    return response;
  }, [callProtectedApi]);

  const checkFollowedByStatus = useCallback(async (userId: string) => {
    const response = await callProtectedApi(`/api/follows/${userId}/followed-by`);
    return response;
  }, [callProtectedApi]);

  const getFollowers = useCallback(async (userId: string, page: number = 1, limit: number = 20) => {
    const response = await callProtectedApi(`/api/follows/${userId}/followers?page=${page}&limit=${limit}`);
    return response;
  }, [callProtectedApi]);

  const getFollowing = useCallback(async (userId: string, page: number = 1, limit: number = 20) => {
    const response = await callProtectedApi(`/api/follows/${userId}/following-list?page=${page}&limit=${limit}`);
    return response;
  }, [callProtectedApi]);

  const getFollowCounts = useCallback(async (userId: string) => {
    const response = await callProtectedApi(`/api/follows/${userId}/counts`);
    return response;
  }, [callProtectedApi]);

  const getFollowSuggestions = useCallback(async (limit: number = 5) => {
    const response = await callProtectedApi(`/api/follows/suggestions?limit=${limit}`);
    return response;
  }, [callProtectedApi]);

  return {
    followUser,
    unfollowUser,
    checkFollowingStatus,
    checkFollowedByStatus,
    getFollowers,
    getFollowing,
    getFollowCounts,
    getFollowSuggestions,
  };
}

// Block-related API functions
export function useBlockApi() {
  const { callProtectedApi } = useProtectedApi();

  const blockUser = useCallback(async (blockedId: string) => {
    const response = await callProtectedApi(`/api/blocks/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blockedId })
    });
    return response;
  }, [callProtectedApi]);

  const unblockUser = useCallback(async (userId: string) => {
    const response = await callProtectedApi(`/api/blocks/${userId}/block`, {
      method: 'DELETE',
    });
    return response;
  }, [callProtectedApi]);

  const checkBlockStatus = useCallback(async (userId: string) => {
    const response = await callProtectedApi(`/api/blocks/${userId}/blocked`);
    return response;
  }, [callProtectedApi]);

  const checkMutualBlockStatus = useCallback(async (userId: string) => {
    const response = await callProtectedApi(`/api/blocks/${userId}/mutual-block`);
    return response;
  }, [callProtectedApi]);

  const getBlockedUsers = useCallback(async (page: number = 1, limit: number = 20) => {
    const response = await callProtectedApi(`/api/blocks/blocked-users?page=${page}&limit=${limit}`);
    return response;
  }, [callProtectedApi]);

  const getBlockedByUsers = useCallback(async (page: number = 1, limit: number = 20) => {
    const response = await callProtectedApi(`/api/blocks/blocked-by?page=${page}&limit=${limit}`);
    return response;
  }, [callProtectedApi]);

  const getBlockCounts = useCallback(async () => {
    const response = await callProtectedApi(`/api/blocks/counts`);
    return response;
  }, [callProtectedApi]);

  return {
    blockUser,
    unblockUser,
    checkBlockStatus,
    checkMutualBlockStatus,
    getBlockedUsers,
    getBlockedByUsers,
    getBlockCounts,
  };
}

// Post-related API functions
export function usePostApi() {
  const { callProtectedApi } = useProtectedApi();

  const createPost = useCallback(async (data: { content: string; images?: File[]; videos?: File[]; hashtags?: string[]; mentions?: string[] }) => {
    console.log('API: Creating post:', data)
    const formData = new FormData();
    
    // Only append content if it's not empty, or if there are no media files
    if (data.content && data.content.trim()) {
      formData.append('content', data.content);
    } else if (!data.images?.length && !data.videos?.length) {
      // If no content and no media, append empty content (will be rejected by backend)
      formData.append('content', '');
    }
    
    if (data.hashtags) {
      formData.append('hashtags', JSON.stringify(data.hashtags));
    }
    
    if (data.mentions) {
      formData.append('mentions', JSON.stringify(data.mentions));
    }
    
    // Handle images
    if (data.images) {
      data.images.forEach((image) => {
        formData.append('media', image);
      });
    }
    
    // Handle videos
    if (data.videos) {
      data.videos.forEach((video) => {
        formData.append('media', video);
      });
    }

    return callProtectedApi('/api/posts', {
      method: 'POST',
      body: formData,
    });
  }, [callProtectedApi]);

  const getPosts = useCallback(async (page: number = 1, limit: number = 20) => {
    return callProtectedApi(`/api/posts?page=${page}&limit=${limit}`);
  }, [callProtectedApi]);

  const getPublicPosts = useCallback(async (limit: number = 3) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${apiUrl}/api/posts/public?limit=${limit}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error('Error fetching public posts:', error);
      throw error;
    }
  }, []);

  const getPost = useCallback(async (postId: string) => {
    return callProtectedApi(`/api/posts/${postId}`);
  }, [callProtectedApi]);

  const updatePost = useCallback(async (postId: string, data: { content: string; images?: File[]; videos?: File[]; hashtags?: string[]; mentions?: string[] } | FormData) => {
    if (data instanceof FormData) {
      return callProtectedApi(`/api/posts/${postId}`, {
        method: 'PUT',
        body: data,
      });
    } else {
      const formData = new FormData();
      formData.append('content', data.content);
      
      if (data.hashtags) {
        formData.append('hashtags', JSON.stringify(data.hashtags));
      }
      
      if (data.mentions) {
        formData.append('mentions', JSON.stringify(data.mentions));
      }

      // Handle images
      if (data.images) {
        data.images.forEach((image) => {
          formData.append('media', image);
        });
      }
      
      // Handle videos
      if (data.videos) {
        data.videos.forEach((video) => {
          formData.append('media', video);
        });
      }

      return callProtectedApi(`/api/posts/${postId}`, {
        method: 'PUT',
        body: formData,
      });
    }
  }, [callProtectedApi]);

  const deletePost = useCallback(async (postId: string) => {
    return callProtectedApi(`/api/posts/${postId}`, {
      method: 'DELETE',
    });
  }, [callProtectedApi]);

  const likePost = useCallback(async (postId: string) => {
    console.log('API: Liking post:', postId);
    const response = await callProtectedApi(`/api/posts/${postId}/like`, {
      method: 'POST',
    });
    console.log('API: Like response:', response);
    return response;
  }, [callProtectedApi]);

  const createComment = useCallback(async (postId: string, content: string) => {
    console.log('Frontend: Creating top-level comment for post:', postId, 'content:', content);
    const response = await callProtectedApi(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    console.log('Frontend: Comment creation response:', response);
    return response;
  }, [callProtectedApi]);

  const getComments = useCallback(async (postId: string, page: number = 1, limit: number = 20) => {
    try {
      const response = await callProtectedApi(`/api/posts/${postId}/comments?page=${page}&limit=${limit}`);
      console.log('Frontend: Received comments response:', {
        commentCount: response.comments?.length || 0,
        comments: response.comments?.map((c: any) => ({
          _id: c._id,
          content: c.content,
          replyCount: c.replyCount,
          parentComment: c.parentComment
        }))
      });
      return response;
    } catch (error) {
      console.error('API Client: Error getting comments:', error)
      throw error;
    }
  }, [callProtectedApi]);

  const updateComment = useCallback(async (commentId: string, content: string) => {
    const response = await callProtectedApi(`/api/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    return response;
  }, [callProtectedApi]);

  const deleteComment = useCallback(async (commentId: string) => {
    const response = await callProtectedApi(`/api/comments/${commentId}`, {
      method: 'DELETE',
    });
    return response;
  }, [callProtectedApi]);

  const likeComment = useCallback(async (commentId: string) => {
    const response = await callProtectedApi(`/api/comments/${commentId}/like`, {
      method: 'POST',
    });
    return response;
  }, [callProtectedApi]);

  const createReply = useCallback(async (commentId: string, content: string) => {
    console.log('Frontend: Creating reply to comment:', commentId, 'content:', content);
    const response = await callProtectedApi(`/api/comments/${commentId}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    console.log('Frontend: Reply creation response:', response);
    return response;
  }, [callProtectedApi]);

  const getReplies = useCallback(async (commentId: string, page: number = 1, limit: number = 20) => {
    try {
      console.log('Frontend: Getting replies for comment:', commentId, 'page:', page, 'limit:', limit);
      const response = await callProtectedApi(`/api/comments/${commentId}/replies?page=${page}&limit=${limit}`);
      console.log('Frontend: Received replies response:', {
        replyCount: response.replies?.length || 0,
        replies: response.replies?.map((r: any) => ({
          _id: r._id,
          content: r.content,
          parentComment: r.parentComment
        }))
      });
      return response;
    } catch (error) {
      console.error('API: Error getting replies:', error)
      throw error;
    }
  }, [callProtectedApi]);

  const repost = useCallback(async (postId: string, comment?: string) => {
    console.log('API: Reposting post:', postId, 'comment:', comment)
    const response = await callProtectedApi(`/api/posts/${postId}/repost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment }),
    });
    console.log('API: Repost response:', response)
    return response;
  }, [callProtectedApi]);

  const updateRepost = useCallback(async (repostId: string, comment?: string) => {
    console.log('API: Updating repost:', repostId, 'comment:', comment)
    const response = await callProtectedApi(`/api/posts/reposts/${repostId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment }),
    });
    console.log('API: Update repost response:', response)
    return response;
  }, [callProtectedApi]);

  const deleteRepost = useCallback(async (repostId: string) => {
    console.log('API: Deleting repost:', repostId)
    const response = await callProtectedApi(`/api/posts/reposts/${repostId}`, {
      method: 'DELETE',
    });
    console.log('API: Delete repost response:', response)
    return response;
  }, [callProtectedApi]);

  const updateProfile = useCallback(async (profileData: {
    bio?: string
    website?: string
    location?: string
    profileImageUrl?: string
    coverImageUrl?: string
  }) => {
    console.log('API: Updating profile:', profileData)
    const response = await callProtectedApi('/api/protected/profile/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });
    console.log('API: Profile update response:', response)
    return response;
  }, [callProtectedApi]);

  const uploadProfileImage = useCallback(async (file: File, type: 'profile' | 'cover') => {
    console.log('API: Uploading profile image:', type)
    const formData = new FormData()
    formData.append('image', file)
    formData.append('type', type)

    const response = await callProtectedApi('/api/protected/profile/upload-image', {
      method: 'POST',
      body: formData,
    });
    console.log('API: Profile image upload response:', response)
    return response;
  }, [callProtectedApi]);

  const getTrendingPosts = useCallback(async (limit: number = 10, hashtag?: string) => {
    let url = `/api/posts/trending?limit=${limit}`;
    if (hashtag) url += `&hashtag=${encodeURIComponent(hashtag)}`;
    return callProtectedApi(url);
  }, [callProtectedApi]);

  const getExplorePosts = useCallback(async (limit: number = 20) => {
    return callProtectedApi(`/api/posts/explore?limit=${limit}`);
  }, [callProtectedApi]);

  const getTrendingHashtags = useCallback(async (limit: number = 10, days: number = 2) => {
    return callProtectedApi(`/api/posts/trending-hashtags?limit=${limit}&days=${days}`);
  }, [callProtectedApi]);

  return {
    createPost,
    getPosts,
    getPublicPosts,
    getPost,
    updatePost,
    deletePost,
    likePost,
    createComment,
    getComments,
    updateComment,
    deleteComment,
    likeComment,
    createReply,
    getReplies,
    repost,
    updateRepost,
    deleteRepost,
    updateProfile,
    uploadProfileImage,
    getTrendingPosts,
    getExplorePosts,
    getTrendingHashtags,
  };
}

// Notification-related API functions
export function useNotificationApi() {
  const { callProtectedApi } = useProtectedApi();

  const getNotifications = useCallback(async (page: number = 1, limit: number = 20) => {
    console.log('Notification API: Getting notifications, page:', page, 'limit:', limit);
    try {
      const response = await callProtectedApi(`/api/notifications?page=${page}&limit=${limit}`);
      console.log('Notification API: Received response:', response);
      return response;
    } catch (error) {
      console.error('Notification API: Error getting notifications:', error);
      throw error;
    }
  }, [callProtectedApi]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    console.log('Notification API: Marking notification as read:', notificationId);
    const response = await callProtectedApi(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
    return response;
  }, [callProtectedApi]);

  const markAllNotificationsAsRead = useCallback(async () => {
    console.log('Notification API: Marking all notifications as read');
    const response = await callProtectedApi('/api/notifications/read-all', {
      method: 'PUT',
    });
    return response;
  }, [callProtectedApi]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    console.log('Notification API: Deleting notification:', notificationId);
    const response = await callProtectedApi(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
    return response;
  }, [callProtectedApi]);

  const getNotificationCounts = useCallback(async () => {
    console.log('Notification API: Getting notification counts');
    try {
      const response = await callProtectedApi('/api/notifications/counts');
      console.log('Notification API: Received counts:', response);
      return response;
    } catch (error) {
      console.error('Notification API: Error getting counts:', error);
      throw error;
    }
  }, [callProtectedApi]);

  return {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getNotificationCounts,
  };
}

// User-related API functions
export function useUserApi() {
  const { callProtectedApi } = useProtectedApi();

  const searchUsers = useCallback(async (q: string) => {
    if (!q) return { users: [] };
    return callProtectedApi(`/api/protected/users/search?q=${encodeURIComponent(q)}`);
  }, [callProtectedApi]);

  return { searchUsers };
}

export function useAdminApi() {
  const { callProtectedApi } = useProtectedApi();

  const getAnalytics = useCallback(async () => {
    return callProtectedApi('/api/protected/admin/analytics');
  }, [callProtectedApi]);

  const getAdminPosts = useCallback(async (page: number = 1, search: string = "") => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.append('search', search);
    return callProtectedApi(`/api/protected/admin/posts?${params}`);
  }, [callProtectedApi]);

  const deleteAdminPost = useCallback(async (id: string) => {
    return callProtectedApi(`/api/protected/admin/posts/${id}`, { method: 'DELETE' });
  }, [callProtectedApi]);

  const getAdminReposts = useCallback(async (page = 1, search = "") => {
    const params = new URLSearchParams();
    if (page) params.append("page", String(page));
    if (search) params.append("search", search);
    return callProtectedApi(`/api/protected/admin/reposts?${params.toString()}`);
  }, [callProtectedApi]);

  const deleteAdminRepost = useCallback(async (idOrIds: string | string[]) => {
    if (Array.isArray(idOrIds)) {
      return callProtectedApi(`/api/protected/admin/reposts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idOrIds }),
      });
    } else {
      return callProtectedApi(`/api/protected/admin/reposts/${idOrIds}`, {
        method: 'DELETE',
      });
    }
  }, [callProtectedApi]);

  const triggerBackup = useCallback(async () => {
    return callProtectedApi('/api/protected/admin/backup', { method: 'POST' });
  }, [callProtectedApi]);

  const downloadLogs = useCallback(async () => {
    // Check session first
    const session = await authClient.getSession();
    if (!session?.data?.session) {
      throw new Error("No Better Auth session found. Please sign in.");
    }
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/protected/admin/logs`;
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include', // Include cookies for Better Auth
    });
    if (!res.ok) {
      throw new Error('Failed to download logs');
    }
    return res.blob();
  }, []);

  const getMaintenance = useCallback(async () => {
    // This endpoint does not require auth
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/protected/maintenance`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch maintenance status');
    return res.json();
  }, []);

  const setMaintenance = useCallback(async (enabled: boolean, message?: string, data?: any) => {
    return callProtectedApi('/api/protected/admin/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, message, data }),
    });
  }, [callProtectedApi]);

  const getAiConfig = useCallback(async () => {
    return callProtectedApi('/api/protected/admin/ai-config');
  }, [callProtectedApi]);

  const updateAiConfig = useCallback(async (config: any) => {
    return callProtectedApi('/api/protected/admin/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  }, [callProtectedApi]);

  const getSubscriptionTransactions = useCallback(
    async (page: number = 1, status?: string, userId?: string) => {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.append('status', status);
      if (userId) params.append('userId', userId);
      return callProtectedApi(`/api/protected/admin/subscription-transactions?${params.toString()}`);
    },
    [callProtectedApi]
  );

  return {
    getAnalytics,
    getAdminPosts,
    deleteAdminPost,
    getAdminReposts,
    deleteAdminRepost,
    triggerBackup,
    downloadLogs,
    getMaintenance,
    setMaintenance,
    getAiConfig,
    updateAiConfig,
    getSubscriptionTransactions,
  };
}

// Authenticated user subscription API
export function useSubscriptionApi() {
  const { callProtectedApi } = useProtectedApi();

  const getMySubscription = useCallback(async () => {
    return callProtectedApi('/api/protected/subscription/me');
  }, [callProtectedApi]);

  return { getMySubscription };
}

// Billing / subscription API functions for the web frontend
export function useBillingApi() {
  const { callProtectedApi } = useProtectedApi();

  const createCheckoutSession = useCallback(async (planKey: string, successUrl?: string, cancelUrl?: string) => {
    return callProtectedApi('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planKey, successUrl, cancelUrl }),
    });
  }, [callProtectedApi]);

  const createKhaltiPayment = useCallback(async (planKey: string, successUrl?: string, cancelUrl?: string) => {
    return callProtectedApi('/api/billing/khalti/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planKey, successUrl, cancelUrl }),
    });
  }, [callProtectedApi]);

  const verifyKhaltiPayment = useCallback(async (pidx: string) => {
    return callProtectedApi('/api/billing/khalti/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pidx }),
    });
  }, [callProtectedApi]);

  return { createCheckoutSession, createKhaltiPayment, verifyKhaltiPayment };
}

// Message-related API functions
export function useMessageApi() {
  const { callProtectedApi } = useProtectedApi();

  const getConversations = useCallback(async (userId: string) => {
    return callProtectedApi(`/api/messages/conversations/${userId}`);
  }, [callProtectedApi]);

  const searchConversations = useCallback(async (userId: string, query: string, page: number = 1, limit: number = 20) => {
    if (!query.trim()) {
      // If no query, return all conversations
      return getConversations(userId);
    }
    
    const params = new URLSearchParams({
      q: query.trim(),
      page: String(page),
      limit: String(limit)
    });
    
    return callProtectedApi(`/api/messages/conversations/${userId}/search?${params}`);
  }, [callProtectedApi, getConversations]);

  const createConversation = useCallback(async (userId: string, participantId: string) => {
    return callProtectedApi('/api/messages/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, participantId }),
    });
  }, [callProtectedApi]);

  const getMessages = useCallback(async (conversationId: string, page: number = 1, limit: number = 20) => {
    return callProtectedApi(`/api/messages/messages/${conversationId}?page=${page}&limit=${limit}`);
  }, [callProtectedApi]);

  const sendMessage = useCallback(async (messageData: {
    conversationId: string;
    senderId: string;
    content: string;
    messageType?: string;
    attachments?: Array<{ 
      type: string; 
      url: string; 
      name?: string; 
      size?: number; 
      duration?: number; // For videos
      thumbnail?: string; // For videos
    }>;
    replyTo?: string;
  }) => {
    return callProtectedApi('/api/messages/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    });
  }, [callProtectedApi]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    return callProtectedApi(`/api/messages/messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  }, [callProtectedApi]);

  const deleteMessage = useCallback(async (messageId: string) => {
    return callProtectedApi(`/api/messages/messages/${messageId}`, {
      method: 'DELETE',
    });
  }, [callProtectedApi]);

  const markMessageAsRead = useCallback(async (conversationId: string, messageId: string) => {
    return callProtectedApi(`/api/messages/messages/${messageId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    });
  }, [callProtectedApi]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    return callProtectedApi(`/api/messages/conversations/${conversationId}/read`, {
      method: 'PUT',
    });
  }, [callProtectedApi]);

  const searchMessages = useCallback(async (conversationId: string, query: string, page: number = 1, limit: number = 20) => {
    return callProtectedApi(`/api/messages/messages/${conversationId}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  }, [callProtectedApi]);

  const getFollowingUsers = useCallback(async (userId: string) => {
    return callProtectedApi(`/api/messages/following/${userId}`);
  }, [callProtectedApi]);

  const uploadMessageFile = useCallback(async (file: File) => {
    console.log('📁 Creating FormData for file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('📁 FormData created, making API call...');
    
    return callProtectedApi('/api/messages/upload', {
      method: 'POST',
      body: formData,
    });
  }, [callProtectedApi]);

  // Upload message file with real progress using XMLHttpRequest
  const uploadMessageFileWithProgress = useCallback((file: File, onProgress: (percent: number) => void) => {
    return new Promise<any>(async (resolve, reject) => {
      try {
        // Check session first
        const session = await authClient.getSession();
        if (!session?.data?.session) {
          reject(new Error("No Better Auth session found. Please sign in."));
          return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/messages/upload`, true);
        xhr.withCredentials = true; // Include cookies for Better Auth
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              resolve(json);
            } catch (e) {
              reject(new Error('Failed to parse upload response'));
            }
          } else {
            let errorMsg = `Upload failed with status ${xhr.status}`;
            try {
              const json = JSON.parse(xhr.responseText);
              errorMsg = json.error || errorMsg;
            } catch {}
            reject(new Error(errorMsg));
          }
        };
        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
        };
        xhr.ontimeout = () => {
          reject(new Error('Upload timed out'));
        };
        xhr.send(formData);
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  const getUnreadCount = useCallback(async (userId: string) => {
    return callProtectedApi(`/api/messages/unread-count/${userId}`);
  }, [callProtectedApi]);

  const addReaction = useCallback(async (messageId: string, reaction: string) => {
    return callProtectedApi(`/api/messages/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction }),
    });
  }, [callProtectedApi]);

  const removeReaction = useCallback(async (messageId: string) => {
    return callProtectedApi(`/api/messages/messages/${messageId}/reactions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'current' }), // Will be replaced by backend
    });
  }, [callProtectedApi]);

  const markMessageAsDelivered = useCallback(async (messageId: string) => {
    return callProtectedApi(`/api/messages/messages/${messageId}/delivered`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'current' }), // Will be replaced by backend
    });
  }, [callProtectedApi]);

  const getMessageStats = useCallback(async (messageId: string) => {
    return callProtectedApi(`/api/messages/messages/${messageId}/stats`);
  }, [callProtectedApi]);

  return {
    getConversations,
    searchConversations,
    createConversation,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markMessageAsRead,
    markConversationAsRead,
    searchMessages,
    getFollowingUsers,
    uploadMessageFile,
    uploadMessageFileWithProgress,
    getUnreadCount,
    addReaction,
    removeReaction,
    markMessageAsDelivered,
    getMessageStats,
  };
}

// Live Stream API functions
export function useLiveStreamApi() {
  const { callProtectedApi } = useProtectedApi();

  const createLiveStream = useCallback(async (data: {
    title: string;
    description?: string;
    scheduledAt?: string;
    isPrivate?: boolean;
    allowedViewers?: string[];
    tags?: string[];
    category?: string;
    maxViewers?: number;
    thumbnail?: File;
  }) => {
    console.log('API: Creating live stream:', data);
    
    const formData = new FormData();
    formData.append('title', data.title);
    
    if (data.description) formData.append('description', data.description);
    if (data.scheduledAt) formData.append('scheduledAt', data.scheduledAt);
    if (data.isPrivate !== undefined) formData.append('isPrivate', data.isPrivate.toString());
    if (data.category) formData.append('category', data.category);
    if (data.maxViewers) formData.append('maxViewers', data.maxViewers.toString());
    
    if (data.allowedViewers && data.allowedViewers.length > 0) {
      formData.append('allowedViewers', JSON.stringify(data.allowedViewers));
    }
    
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags));
    }
    
    if (data.thumbnail) {
      formData.append('thumbnail', data.thumbnail);
    }

    return callProtectedApi('/api/live-streams', {
      method: 'POST',
      body: formData,
    });
  }, [callProtectedApi]);

  const getLiveStreams = useCallback(async (options: {
    page?: number;
    limit?: number;
    status?: 'scheduled' | 'live' | 'ended';
    category?: string;
    tags?: string[];
  } = {}) => {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);
    if (options.category) params.append('category', options.category);
    if (options.tags && options.tags.length > 0) {
      params.append('tags', options.tags.join(','));
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${apiUrl}/api/live-streams?${params}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error('Error fetching live streams:', error);
      throw error;
    }
  }, []);

  const getLiveStream = useCallback(async (streamId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${apiUrl}/api/live-streams/${streamId}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error('Error fetching live stream:', error);
      throw error;
    }
  }, []);

  const joinLiveStream = useCallback(async (streamId: string) => {
    return callProtectedApi(`/api/live-streams/${streamId}/join`, {
      method: 'POST',
    });
  }, [callProtectedApi]);

  const leaveLiveStream = useCallback(async (streamId: string) => {
    return callProtectedApi(`/api/live-streams/${streamId}/leave`, {
      method: 'POST',
    });
  }, [callProtectedApi]);

  const endLiveStream = useCallback(async (streamId: string) => {
    return callProtectedApi(`/api/live-streams/${streamId}/end`, {
      method: 'POST',
    });
  }, [callProtectedApi]);

  const getUserStreams = useCallback(async (userId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}) => {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);

    const url = `/api/live-streams/user/${userId}?${params}`;
    
    return callProtectedApi(url);
  }, [callProtectedApi]);

  const updateLiveStream = useCallback(async (streamId: string, updateData: any) => {
    return callProtectedApi(`/api/live-streams/${streamId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
  }, [callProtectedApi]);

  const deleteLiveStream = useCallback(async (streamId: string) => {
    return callProtectedApi(`/api/live-streams/${streamId}`, {
      method: 'DELETE',
    });
  }, [callProtectedApi]);

  return {
    createLiveStream,
    getLiveStreams,
    getLiveStream,
    joinLiveStream,
    leaveLiveStream,
    endLiveStream,
    getUserStreams,
    updateLiveStream,
    deleteLiveStream,
  };
}