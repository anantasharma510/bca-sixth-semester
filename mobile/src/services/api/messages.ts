import { useApiService } from '../api';
import { Conversation, Message } from '../../types/api';
import { useCallback } from 'react';

export const useMessagesApi = () => {
  const api = useApiService();

  // Conversations - memoized to prevent recreation
  const getConversations = useCallback(async (userId: string) => {
    return api.get<{ conversations: Conversation[] }>(`/messages/conversations/${userId}`);
  }, [api.get]);

  const searchConversations = async (userId: string, query: string, page = 1, limit = 20) => {
    if (!query.trim()) return getConversations(userId);
    return api.get(`/messages/conversations/${userId}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  };

  const createConversation = async (userId: string, participantId: string) => {
    return api.post(`/messages/conversations`, { userId, participantId });
  };

  // Messages
  const getMessages = async (conversationId: string, page = 1, limit = 20) => {
    return api.get<{ messages: Message[] }>(`/messages/messages/${conversationId}?page=${page}&limit=${limit}`);
  };

  const sendMessage = async (data: {
    conversationId: string;
    senderId: string;
    content: string;
    messageType?: 'text' | 'image';
    attachments?: string[];
    replyTo?: string;
  }) => {
    return api.post(`/messages/messages`, data);
  };

  const updateMessage = async (messageId: string, content: string) => {
    return api.put(`/messages/messages/${messageId}`, { content });
  };

  const deleteMessage = async (messageId: string) => {
    return api.delete(`/messages/messages/${messageId}`);
  };

  const markMessageAsRead = async (messageId: string, conversationId: string) => {
    return api.put(`/messages/messages/${messageId}/read`, { conversationId });
  };

  const markConversationAsRead = async (conversationId: string) => {
    return api.put(`/messages/conversations/${conversationId}/read`);
  };

  const searchMessages = async (conversationId: string, query: string, page = 1, limit = 20) => {
    return api.get(`/messages/messages/${conversationId}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  };

  const getFollowingUsers = async (userId: string) => {
    return api.get(`/messages/following/${userId}`);
  };

  // uploadMessageFile expects a file object: { uri, name, type } for React Native
  const uploadMessageFile = async (file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload(`/messages/upload`, formData);
  };

  const getUnreadCount = async (userId: string) => {
    return api.get(`/messages/unread-count/${userId}`);
  };

  const addReaction = async (messageId: string, reaction: string) => {
    return api.post(`/messages/messages/${messageId}/reactions`, { reaction });
  };

  const removeReaction = async (messageId: string, userId: string) => {
    return api.delete(`/messages/messages/${messageId}/reactions`, { data: { userId } });
  };

  const markMessageAsDelivered = async (messageId: string, userId: string) => {
    return api.put(`/messages/messages/${messageId}/delivered`, { userId });
  };

  const getMessageStats = async (messageId: string) => {
    return api.get(`/messages/messages/${messageId}/stats`);
  };

  return {
    getConversations,
    searchConversations,
    createConversation,
    getMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    markMessageAsRead,
    markConversationAsRead,
    searchMessages,
    getFollowingUsers,
    uploadMessageFile,
    getUnreadCount,
    addReaction,
    removeReaction,
    markMessageAsDelivered,
    getMessageStats,
  };
}; 