import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../hooks/useAuth';
import { getColors } from '../constants/colors';
import { Header } from '../components/Header';
import { useMessagesApi } from '../services/api/messages';
import { useSocket } from '../hooks/useSocket';
import { Conversation } from '../types/api';
import { useSyncUserWithBackend } from '../hooks/useSyncUser';
import eventBus from '../utils/eventBus';
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../stores/userStore';
import { getCacheBustedUrl, getBaseUrl } from '../utils/imageCache';

export default function MessagesScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesApi = useMessagesApi();
  const socket = useSocket();
  const { isSignedIn, user } = useAuth();
  useSyncUserWithBackend();
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const colors = getColors(theme);
  
  // User store for profile images
  const getUserImage = useUserStore((state) => state.getUserImage);
  
  // Prevent infinite loop: track if we're currently loading
  const isLoadingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Helper to sort conversations by latest message
  function sortConversationsByLatest(conversations: Conversation[]) {
    return [...conversations].sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  // Get stable userId to prevent unnecessary re-renders
  const userId = useMemo(() => user?._id || user?.id, [user?._id, user?.id]);

  // Load conversations - stable function that doesn't change on every render
  const loadConversations = useCallback(async () => {
    // Prevent concurrent calls
    if (isLoadingRef.current) {
      console.log('⚠️ Already loading conversations, skipping duplicate call');
      return;
    }

    const currentUserId = user?._id || user?.id;
    if (!currentUserId) {
      console.log('⚠️ No user ID available, stopping conversation load');
      setIsLoading(false);
      return;
    }

    try {
      isLoadingRef.current = true;
      lastUserIdRef.current = currentUserId;
      console.log('🔍 Loading conversations for userId:', currentUserId);
      setIsLoading(true);
      setError(null);
      const response = await messagesApi.getConversations(currentUserId);
      console.log('✅ Conversations loaded:', response.conversations?.length || 0);
      setConversations(sortConversationsByLatest(response.conversations || []));
    } catch (error: any) {
      console.error('❌ Error loading conversations:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      setError(error?.message || 'Failed to load conversations');
      lastUserIdRef.current = null; // Reset on error to allow retry
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [messagesApi, user?._id, user?.id]); // Include all dependencies but use ref guards

  // Load conversations only when userId or sign-in status changes - with guard
  useEffect(() => {
    // Skip if already loading or if same userId as last successful load
    if (isLoadingRef.current) return;
    if (lastUserIdRef.current === userId && userId) return;

    if (isSignedIn && userId) {
      loadConversations();
    } else if (!isSignedIn) {
      // If not signed in, stop loading
      setIsLoading(false);
      setConversations([]);
      lastUserIdRef.current = null;
      isLoadingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, userId]); // Intentionally excluding loadConversations to prevent loop

  // Join/leave socket rooms when conversations change
  useEffect(() => {
    if (conversations.length > 0 && isSignedIn && userId) {
      const ids = conversations.map(c => c._id).filter(Boolean);
      if (ids.length > 0) {
        socket.joinConversations(ids);
      }
    }
    return () => {
      if (conversations.length > 0) {
        const ids = conversations.map(c => c._id).filter(Boolean);
        if (ids.length > 0) {
          socket.leaveConversations(ids);
        }
      }
    };
  }, [conversations, socket, isSignedIn, userId]);

  // Real-time updates for conversation list
  useEffect(() => {
    const handleNewMessage = (msg: any) => {
      setConversations(prev => sortConversationsByLatest(prev.map(conv =>
        conv._id === msg.conversationId
          ? { ...conv, lastMessage: msg, unreadCount: (conv.unreadCount || 0) + 1 }
          : conv
      )));
    };
    const handleConversationRead = ({ conversationId, userId: readUserId }: { conversationId: string; userId: string }) => {
      if (readUserId === userId) {
        setConversations(prev => sortConversationsByLatest(prev.map(conv =>
          conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )));
      }
    };
    const handleNewConversation = (conversation: any) => {
      setConversations(prev => {
        if (prev.some((conv) => conv._id === conversation._id)) return prev;
        return sortConversationsByLatest([conversation, ...prev]);
      });
    };
    socket.on('newMessage', handleNewMessage);
    socket.on('conversationRead', handleConversationRead);
    socket.on('newConversation', handleNewConversation);
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('conversationRead', handleConversationRead);
      socket.off('newConversation', handleNewConversation);
    };
  }, [socket, userId]);

  useEffect(() => {
    const handler = ({ message, conversation }: any) => {
      setConversations(prev => {
        const prevConv = prev.find(c => c._id === conversation._id);
        const mergedConv = {
          ...(prevConv || conversation),
          ...conversation,
          lastMessage: message,
          otherParticipant: getOtherParticipant(conversation, user?.id),
        };
        return sortConversationsByLatest(upsertConversation(prev, mergedConv));
      });
    };
    eventBus.on('messageSent', handler);
    return () => eventBus.off('messageSent', handler);
  }, [userId]);

  const handleConversationPress = (conversation: Conversation) => {
    if (!userId) return;
    navigation.navigate('ChatScreen', { conversation, userId });
  };

  const handleNewConversationPress = () => {
    if (!userId) return;
    navigation.navigate('NewConversationScreen', { userId });
  };

  // Helper to get the other participant
  const getOtherParticipant = (conversation: Conversation, currentUserId: string | undefined) => {
    if ((conversation as any).otherParticipant) return (conversation as any).otherParticipant;
    if (Array.isArray(conversation.participants)) {
      return conversation.participants.find((u: any) => {
        const uId = u._id || u.id;
        return uId !== currentUserId;
      });
    }
    return undefined;
  };

  const getLastMessagePreview = (conv: Conversation) => {
    if (!conv.lastMessage) return 'No messages yet';
    const messageType = (conv.lastMessage as any).messageType;
    if (conv.lastMessage.content === '' && messageType === 'image') return '📷 Image';
    if (conv.lastMessage.content === '' && messageType === 'video') return '🎥 Video';
    const content = conv.lastMessage.content;
    return content.length > 30 ? `${content.substring(0, 30)}...` : content;
  };

  // Helper to update or add a conversation in the list
  function upsertConversation(conversations: Conversation[], conversation: Conversation) {
    const idx = conversations.findIndex(c => c._id === conversation._id);
    if (idx !== -1) {
      // Update existing
      const updated = [...conversations];
      updated[idx] = { ...updated[idx], ...conversation };
      return updated;
    } else {
      // Add new to top
      return [conversation, ...conversations];
    }
  }

  // After sending a message, update the conversation's lastMessage in state
  const handleSendMessage = async (conversationId: string, messageData: any) => {
    // ... send message logic ...
    // After successful send (or optimistic update):
    setConversations(prev => {
      const existingConv = prev.find(c => c._id === conversationId);
      if (existingConv) {
        return sortConversationsByLatest(upsertConversation(prev, {
          ...existingConv,
          lastMessage: messageData,
        }));
      }
      return prev;
    });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const other = getOtherParticipant(item, userId);
    const displayName = other?.firstName || other?.username || 'Unknown User';
    const otherUserId = other?._id || other?.id;
    
    // Get profile image from store first, then fallback to API data
    const storeImage = otherUserId ? getUserImage(otherUserId, 'profile', other?.profileImageUrl) : other?.profileImageUrl;
    const avatar = storeImage ? getCacheBustedUrl(storeImage, false) : null;
    const avatarKey = storeImage ? `avatar-${getBaseUrl(storeImage)}` : 'avatar-placeholder';
    
    const unreadCount = typeof item.unreadCount === 'number' && !isNaN(item.unreadCount) && item.unreadCount > 0 ? item.unreadCount : 0;
    return (
      <TouchableOpacity style={[styles.conversationItem, { backgroundColor: colors.background.secondary }]} onPress={() => handleConversationPress(item)}>
        <View style={[styles.avatar, { backgroundColor: colors.primary[500] }]}>
          {avatar ? (
            <Image
              key={avatarKey}
              source={{ uri: avatar }}
              style={styles.avatarImage}
              contentFit="cover"
              cachePolicy="disk"
              transition={200}
              onError={(error: any) => {
                console.error('❌ MessagesScreen: Avatar failed to load:', {
                  url: avatar?.substring(0, 50) + '...',
                  error,
                });
              }}
            />
          ) : (
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          )}
          {other?.isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.conversationContent}>
          <Text style={[styles.username, { color: colors.text.primary }]}>{displayName}</Text>
          <Text style={[styles.lastMessage, { color: colors.text.secondary }]} numberOfLines={1}>{getLastMessagePreview(item)}</Text>
        </View>
        <View style={styles.rightSection}>
          {item.lastMessage?.createdAt ? (
            <Text style={[styles.timestamp, { color: colors.text.secondary }]}>
              {new Date(item.lastMessage.createdAt).toLocaleDateString()}
            </Text>
          ) : null}
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary[500] }]}>
              <Text style={[styles.unreadBadgeText, { color: 'white' }]}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!isSignedIn) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background.primary }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Messages</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Sign in to view your messages</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>{error}</Text>
        <TouchableOpacity onPress={loadConversations} style={{ marginTop: 16, padding: 12, backgroundColor: colors.primary[500], borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading conversations...</Text>
      </View>
    );
  }
  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Header 
        navigation={navigation} 
        title="Messages" 
        rightButton={{
          icon: 'plus',
          onPress: handleNewConversationPress
        }}
      />
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item, index) => item?._id || `conversation-${index}`}
        contentContainerStyle={[styles.listContainer, { backgroundColor: colors.background.primary }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: colors.background.primary }]}>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No conversations yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>Start a conversation with someone!</Text>
            <TouchableOpacity 
              style={[styles.startConversationButton, { backgroundColor: colors.primary[500] }]}
              onPress={handleNewConversationPress}
            >
              <Text style={[styles.startConversationButtonText, { color: 'white' }]}>Start a conversation</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  conversationContent: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 4,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
  },
  startConversationButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  startConversationButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
}); 