import { useAuth } from "@/hooks/use-auth";
import { useCallback } from "react";
import { useProtectedApi } from "./api";

export function useMessagingApi() {
  const { callProtectedApi } = useProtectedApi();
  const { user } = useAuth();
  const userId = user?.id;

  // Get users that can be messaged (mutual followers)
  const getMessageableUsers = useCallback(async (limit: number = 20) => {
    if (!userId) throw new Error("User not authenticated");
    
    try {
      // Get users the current user follows
      const followingResponse = await callProtectedApi(`/api/follows/${userId}/following-list?limit=100`);
      const following = followingResponse.following || [];
      
      // Get users who follow the current user
      const followersResponse = await callProtectedApi(`/api/follows/${userId}/followers?limit=100`);
      const followers = followersResponse.followers || [];
      
      // Find mutual followers
      const followingIds = new Set(following.map((f: any) => f.followingId._id));
      const followersIds = new Set(followers.map((f: any) => f.followerId._id));
      
      const mutualFollowers = following.filter((f: any) => 
        followersIds.has(f.followingId._id)
      ).slice(0, limit);
      
      return mutualFollowers.map((f: any) => f.followingId);
    } catch (error) {
      console.error('Error getting messageable users:', error);
      throw error;
    }
  }, [callProtectedApi, userId]);

  // Create a new conversation
  const createConversation = useCallback(async (participantId: string) => {
    if (!userId) throw new Error("User not authenticated");
    
    const response = await callProtectedApi('/api/messages/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, participantId }),
    });
    
    return response.conversation;
  }, [callProtectedApi, userId]);

  // Get conversations for the current user
  const getConversations = useCallback(async () => {
    if (!userId) throw new Error("User not authenticated");
    
    const response = await callProtectedApi(`/api/messages/conversations/${userId}`);
    return response.conversations || [];
  }, [callProtectedApi, userId]);

  // Get messages for a conversation
  const getMessages = useCallback(async (conversationId: string, page: number = 1, limit: number = 20) => {
    const response = await callProtectedApi(`/api/messages/messages/${conversationId}?page=${page}&limit=${limit}`);
    return response.messages || [];
  }, [callProtectedApi]);

  // Send a message
  const sendMessage = useCallback(async (messageData: {
    conversationId: string;
    content: string;
    messageType?: string;
    attachments?: Array<{ type: string; url: string; name?: string; size?: number }>;
    replyTo?: string;
  }) => {
    if (!userId) throw new Error("User not authenticated");
    
    const response = await callProtectedApi('/api/messages/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...messageData, senderId: userId }),
    });
    
    return response.message;
  }, [callProtectedApi, userId]);

  // Edit a message
  const editMessage = useCallback(async (messageId: string, content: string) => {
    const response = await callProtectedApi(`/api/messages/messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    
    return response.message;
  }, [callProtectedApi]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    await callProtectedApi(`/api/messages/messages/${messageId}`, {
      method: 'DELETE',
    });
  }, [callProtectedApi]);

  // Mark message as read
  const markMessageAsRead = useCallback(async (conversationId: string, messageId: string) => {
    await callProtectedApi(`/api/messages/messages/${messageId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, userId }),
    });
  }, [callProtectedApi, userId]);

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    await callProtectedApi(`/api/messages/conversations/${conversationId}/read`, {
      method: 'PUT',
    });
  }, [callProtectedApi]);

  // Search messages in a conversation
  const searchMessages = useCallback(async (conversationId: string, query: string, page: number = 1, limit: number = 20) => {
    const response = await callProtectedApi(`/api/messages/messages/${conversationId}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    return response.messages || [];
  }, [callProtectedApi]);

  // Upload file for messaging
  const uploadMessageFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await callProtectedApi('/api/messages/upload', {
      method: 'POST',
      body: formData,
    });
    
    return response;
  }, [callProtectedApi]);

  // Get unread message count
  const getUnreadCount = useCallback(async () => {
    if (!userId) return 0;
    
    const response = await callProtectedApi(`/api/messages/unread-count/${userId}`);
    return response.unreadCount || 0;
  }, [callProtectedApi, userId]);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, reaction: string) => {
    if (!userId) throw new Error("User not authenticated");
    
    const response = await callProtectedApi(`/api/messages/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction, userId }),
    });
    
    return response.message;
  }, [callProtectedApi, userId]);

  // Remove reaction from message
  const removeReaction = useCallback(async (messageId: string) => {
    if (!userId) throw new Error("User not authenticated");
    
    const response = await callProtectedApi(`/api/messages/messages/${messageId}/reactions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    
    return response.message;
  }, [callProtectedApi, userId]);

  // Mark message as delivered
  const markMessageAsDelivered = useCallback(async (messageId: string) => {
    if (!userId) throw new Error("User not authenticated");
    
    await callProtectedApi(`/api/messages/messages/${messageId}/delivered`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  }, [callProtectedApi, userId]);

  // Get message statistics
  const getMessageStats = useCallback(async (messageId: string) => {
    const response = await callProtectedApi(`/api/messages/messages/${messageId}/stats`);
    return response.stats;
  }, [callProtectedApi]);

  return {
    getMessageableUsers,
    createConversation,
    getConversations,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markMessageAsRead,
    markConversationAsRead,
    searchMessages,
    uploadMessageFile,
    getUnreadCount,
    addReaction,
    removeReaction,
    markMessageAsDelivered,
    getMessageStats,
  };
} 