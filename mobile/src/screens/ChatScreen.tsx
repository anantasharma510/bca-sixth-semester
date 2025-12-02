import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, Alert, ToastAndroid, Modal, Dimensions, Keyboard, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessagesApi } from '../services/api/messages';
import { useSocket } from '../hooks/useSocket';
import { Message, Conversation } from '../types/api';
import { getColors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import ActionSheet from 'react-native-actionsheet';
import eventBus from '../utils/eventBus';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../context/ThemeContext';
import { useAndroidBackHandler } from '../hooks/useAndroidBackHandler';
import { resolveApiBaseUrl } from '../config/env';
import { useAuth } from '../hooks/useAuth';
import { useUserStore } from '../stores/userStore';
import { getCacheBustedUrl, getBaseUrl } from '../utils/imageCache';

// Define the expected route params for ChatScreen
// (You may want to move this to a types/navigation.ts file for larger projects)
type ChatScreenRouteParams = {
  conversation: Conversation;
  userId: string;
};

// Helper to deduplicate messages by _id, matching frontend logic
function deduplicateMessages(messages: Message[]) {
  const seen = new Map();
  messages.forEach((message) => {
    const existingMessage = seen.get(message._id);
    if (!existingMessage) {
      seen.set(message._id, message);
    } else {
      const existingEditedAt = existingMessage.editedAt ? new Date(existingMessage.editedAt).getTime() : 0;
      const newEditedAt = message.editedAt ? new Date(message.editedAt).getTime() : 0;
      if (newEditedAt > existingEditedAt) {
        seen.set(message._id, message);
      } else if (newEditedAt === existingEditedAt) {
        if (Object.keys(message).length > Object.keys(existingMessage).length) {
          seen.set(message._id, message);
        }
      }
    }
  });
  return Array.from(seen.values());
}

// Helper to sort messages by createdAt ascending
function sortMessagesByTime(messages: Message[]) {
  return [...messages].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  });
}

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, ChatScreenRouteParams>, string>>();
  const { conversation, userId } = route.params as ChatScreenRouteParams;
  const messagesApi = useMessagesApi();
  const socket = useSocket();
  const actionSheetRef = useRef<any>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<Message | null>(null);
  const [actionSheetIsOwn, setActionSheetIsOwn] = useState(false);
  const [actionSheetOptions, setActionSheetOptions] = useState<string[]>(['Reply', 'Cancel']);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Full-screen media viewing
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'image' | 'video', url: string, name?: string } | null>(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);

  const { theme } = useTheme();
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  
  // User store for profile images
  const getUserImage = useUserStore((state) => state.getUserImage);
  const currentUserImages = useUserStore((state) => state.currentUserImages);
  
  // Track failed image loads to show placeholder
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const [failedMessageAvatars, setFailedMessageAvatars] = useState<Set<string>>(new Set());

  // Handle Android back button with unsaved changes check
  useAndroidBackHandler({
    onBackPress: () => {
      // If user is editing a message, ask for confirmation
      if (editingMessage) {
        Alert.alert(
          'Discard Changes?',
          'You have unsaved changes. Are you sure you want to go back?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Discard', 
              style: 'destructive',
              onPress: () => {
                setEditingMessage(null);
                setInput('');
                navigation.goBack();
              }
            }
          ]
        );
        return true; // Prevent default back action
      }
      
      // If user has typed something, ask for confirmation
      if (input.trim()) {
        Alert.alert(
          'Discard Message?',
          'You have typed a message. Are you sure you want to go back?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Discard', 
              style: 'destructive',
              onPress: () => navigation.goBack()
            }
          ]
        );
        return true; // Prevent default back action
      }
      
      // Allow normal back navigation
      return false;
    }
  });

  // Helper to ensure sender details for a message
  // No longer add senderId_details to optimistic messages; only use Message type fields.
  const ensureMessageSenderDetails = useCallback((message: Message): Message => message, []);

  // Load messages when conversation changes (API call, not socket)
  useEffect(() => {
    setLoading(true);
    messagesApi.getMessages(conversation._id, 1, 20)
      .then(res => {
        const newMessages = (res?.messages || []).map(ensureMessageSenderDetails);
        setMessages(sortMessagesByTime(newMessages));
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [conversation._id, ensureMessageSenderDetails]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  // Keyboard handling for better UX
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      // Scroll to bottom when keyboard appears
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      keyboardDidShowListener?.remove();
    };
  }, []);

  // Real-time socket join/leave and event listeners on focus
  useFocusEffect(
    useCallback(() => {
      // Helper to join room if connected
      const joinRoom = () => {
        if (socket.isConnected && socket.joinConversations) {
          console.log('[ChatScreen] Joining room:', conversation._id, 'on socket:', socket.socket?.id);
          socket.joinConversations([conversation._id]);
        } else {
          console.log('[ChatScreen] Socket not connected, cannot join room');
        }
      };
      joinRoom();

      // Re-join room on socket reconnect
      const handleSocketConnect = () => {
        console.log('[ChatScreen] Socket reconnected, rejoining room:', conversation._id);
        joinRoom();
      };
      if (socket.socket) {
        socket.socket.on('connect', handleSocketConnect);
      }

      return () => {
        // Only remove the connect listener, keep other listeners active
        if (socket.socket) {
          socket.socket.off('connect', handleSocketConnect);
        }
        // Note: We don't remove other event listeners here to prevent the real-time messaging issue
        // Event listeners will be cleaned up when the component unmounts
      };
    }, [socket, conversation._id])
  );

  // Separate effect for event listeners that persist throughout the component lifecycle
  useEffect(() => {
    if (!socket.socket) return;

    const handleNewMessage = (msg: Message) => {
      console.log('[ChatScreen] Received newMessage event:', {
        messageId: msg._id,
        conversationId: msg.conversationId,
        currentConversationId: conversation._id,
        senderId: msg.senderId,
        messageType: msg.messageType,
        hasAttachments: msg.attachments && msg.attachments.length > 0,
        attachments: msg.attachments,
        socketConnected: socket.isConnected,
        socketId: socket.socket?.id,
        timestamp: new Date().toISOString()
      });
      
      if (msg.conversationId === conversation._id) {
        const msgWithDetails = ensureMessageSenderDetails(msg);
        setMessages(prev => {
          // For image/video messages, match by messageType and attachment URL
          // For text messages, match by content
          const tempIndex = prev.findIndex(m => {
            if (typeof m._id !== 'string' || !m._id.startsWith('temp_')) return false;
            if (m.conversationId !== msgWithDetails.conversationId) return false;
            if (typeof m.senderId === 'object' ? m.senderId._id : m.senderId !== 
                (typeof msgWithDetails.senderId === 'object' ? msgWithDetails.senderId._id : msgWithDetails.senderId)) {
              return false;
            }
            
            // For image/video messages, match by messageType and recent timestamp
            if (msgWithDetails.messageType === 'image' || msgWithDetails.messageType === 'video') {
              if (m.messageType !== msgWithDetails.messageType) return false;
              
              // Match by timestamp (within 15 seconds) - most reliable for optimistic messages
              const tempTime = new Date(m.createdAt).getTime();
              const msgTime = new Date(msgWithDetails.createdAt).getTime();
              const timeDiff = Math.abs(msgTime - tempTime);
              
              // If temp message was created recently (within 15 seconds), match it
              // This ensures we replace the optimistic message even if URLs differ slightly
              if (timeDiff < 15000) {
                console.log('[ChatScreen] Matched temp message by timestamp:', {
                  tempId: m._id,
                  realId: msgWithDetails._id,
                  timeDiff,
                  tempUrl: m.attachments?.[0]?.url,
                  realUrl: msgWithDetails.attachments?.[0]?.url
                });
                return true;
              }
              
              return false;
            }
            
            // For text messages, match by content
            return m.content === msgWithDetails.content;
          });
          
          if (tempIndex !== -1) {
            // Replace temporary message with real message
            console.log('[ChatScreen] Replacing optimistic message:', {
              tempId: prev[tempIndex]._id,
              realId: msgWithDetails._id,
              messageType: msgWithDetails.messageType,
              hasAttachments: !!msgWithDetails.attachments?.length
            });
            const newMessages = [...prev];
            newMessages[tempIndex] = msgWithDetails;
            return sortMessagesByTime(deduplicateMessages(newMessages));
          } else {
            // Add new message
            console.log('[ChatScreen] Adding new message (no temp match):', {
              messageId: msgWithDetails._id,
              messageType: msgWithDetails.messageType
            });
            return sortMessagesByTime(deduplicateMessages([...prev, msgWithDetails]));
          }
        });
        if (msg.senderId !== userId) {
          setTimeout(() => {
            messagesApi.markMessageAsRead(conversation._id, msg._id).catch(() => {});
          }, 1000);
        }
      } else {
        console.log('[ChatScreen] Message for different conversation, ignoring:', {
          msgConversationId: msg.conversationId,
          currentConversationId: conversation._id
        });
      }
    };

    const handleMessageEdited = (msg: Message) => {
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, ...msg } : m));
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId 
          ? { ...m, deletedAt: new Date() }
          : m
      ));
    };

    const handleTyping = ({ userId: typingUserId }: { userId: string }) => {
      if (typingUserId !== userId) {
        setTypingUsers(prev => [...new Set([...prev, typingUserId])]);
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== typingUserId));
        }, 3000);
      }
    };

    const handleStopTyping = ({ userId: typingUserId }: { userId: string }) => {
      setTypingUsers(prev => prev.filter(id => id !== typingUserId));
    };

    // Set up event listeners
    socket.socket.on('newMessage', handleNewMessage);
    socket.socket.on('messageEdited', handleMessageEdited);
    socket.socket.on('messageDeleted', handleMessageDeleted);
    socket.socket.on('typing', handleTyping);
    socket.socket.on('stopTyping', handleStopTyping);

    // Clean up event listeners only when component unmounts or conversation changes
    return () => {
      if (socket.socket) {
        socket.socket.off('newMessage', handleNewMessage);
        socket.socket.off('messageEdited', handleMessageEdited);
        socket.socket.off('messageDeleted', handleMessageDeleted);
        socket.socket.off('typing', handleTyping);
        socket.socket.off('stopTyping', handleStopTyping);
      }
    };
  }, [socket.socket, conversation._id, userId, messagesApi, ensureMessageSenderDetails]);

  // Effect to handle conversation changes and ensure proper room joining
  useEffect(() => {
    if (socket.isConnected && socket.joinConversations) {
      console.log('[ChatScreen] Conversation changed, joining room:', conversation._id);
      socket.joinConversations([conversation._id]);
    }
  }, [conversation._id, socket.isConnected, socket.joinConversations]);

  // Cleanup effect to leave conversation room when component unmounts
  useEffect(() => {
    return () => {
      if (socket.isConnected && socket.leaveConversations) {
        console.log('[ChatScreen] Component unmounting, leaving room:', conversation._id);
        socket.leaveConversations([conversation._id]);
      }
    };
  }, [conversation._id, socket.isConnected, socket.leaveConversations]);

  // Effect to handle socket connection state changes
  useEffect(() => {
    if (socket.isConnected && socket.joinConversations) {
      console.log('[ChatScreen] Socket connected, ensuring room membership:', conversation._id);
      socket.joinConversations([conversation._id]);
    }
  }, [socket.isConnected, conversation._id, socket.joinConversations]);

  // Effect to track socket reconnections and verify auto-rejoin is working
  useEffect(() => {
    if (!socket.socket) return;

    const handleSocketConnect = () => {
      console.log('[ChatScreen] Socket reconnected detected:', {
        conversationId: conversation._id,
        socketId: socket.socket?.id,
        timestamp: new Date().toISOString(),
        note: 'Auto-rejoin should have been triggered by SocketService'
      });
      
      // Additional safety: ensure room membership after any reconnection
      setTimeout(() => {
        if (socket.isConnected && socket.joinConversations) {
          console.log('[ChatScreen] Safety rejoin after reconnection');
          socket.joinConversations([conversation._id]);
        }
      }, 1000);
    };

    const handleSocketDisconnect = (reason: string) => {
      console.log('[ChatScreen] Socket disconnected:', {
        reason,
        conversationId: conversation._id,
        timestamp: new Date().toISOString()
      });
    };

    socket.socket.on('connect', handleSocketConnect);
    socket.socket.on('disconnect', handleSocketDisconnect);

    return () => {
      if (socket.socket) {
        socket.socket.off('connect', handleSocketConnect);
        socket.socket.off('disconnect', handleSocketDisconnect);
      }
    };
  }, [socket.socket, conversation._id, socket.isConnected, socket.joinConversations]);

  // Helper for showing feedback
  const showToast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert(msg);
  };

  // Send message (with optimistic UI for reply)
  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const optimistic: Message = {
      _id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conversationId: conversation._id,
      senderId: userId, // Use string
      content: input.trim(),
      messageType: 'text',
      createdAt: new Date(),
      updatedAt: new Date(),
      isRead: false,
      isDelivered: false,
      ...(replyToMessage ? { replyTo: replyToMessage._id } : {}),
    };
    setMessages(prev => sortMessagesByTime(deduplicateMessages([...prev, optimistic])));
    setInput('');
    setReplyToMessage(null);
    try {
      if (socket.isConnected && socket.socket) {
        socket.socket.emit('sendMessage', {
          conversationId: conversation._id,
          senderId: userId,
          content: optimistic.content,
          messageType: 'text',
          ...(replyToMessage ? { replyTo: replyToMessage._id } : {}),
        });
      } else {
        await messagesApi.sendMessage({
          conversationId: conversation._id,
          senderId: userId,
          content: optimistic.content,
          messageType: 'text',
          ...(replyToMessage ? { replyTo: replyToMessage._id } : {}),
        });
      }
      eventBus.emit('messageSent', { message: optimistic, conversation });
    } catch (e) {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      showToast('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Typing indicator
  const handleInputChange = (text: string) => {
    setInput(text);
    if (!socket.socket || !socket.isConnected) return;
    socket.socket.emit('typing', { conversationId: conversation._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.socket?.emit('stopTyping', { conversationId: conversation._id });
    }, 2000);
  };

  // Load more messages (pagination)
  const handleLoadMore = () => {
    if (loading) return;
    messagesApi.getMessages(conversation._id, page + 1, 20)
      .then(res => {
        const newMessages = (res?.messages || []).map(ensureMessageSenderDetails);
        setMessages(prev => sortMessagesByTime(deduplicateMessages([...prev, ...newMessages])));
        setPage(page + 1);
      })
      .catch(() => {
        // Optionally show an error toast
        showToast('Failed to load more messages');
      });
  };

  // Edit message (optimistic UI)
  const handleEditMessage = async () => {
    if (!editingMessage || !input.trim() || sending) return;
    setSending(true);
    try {
      await messagesApi.editMessage(editingMessage._id, input.trim());
      setEditingMessage(null);
      setInput('');
      showToast('Message updated');
      // Do not update messages here; rely on socket event
    } catch (e) {
      showToast('Failed to edit message');
    } finally {
      setSending(false);
    }
  };
  // Fix reply logic: always set replyTo as replyToMessage._id
  const handleReplySend = async () => {
    if (!input.trim() || sending || !replyToMessage) return;
    setSending(true);
    const optimistic = {
      _id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conversationId: conversation._id,
      senderId: userId, // Use string
      content: input.trim(),
      messageType: 'text' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      isRead: false,
      isDelivered: false,
      replyTo: replyToMessage._id, // Always use ID
    };
    setMessages(prev => sortMessagesByTime(deduplicateMessages([...prev, optimistic])));
    setInput('');
    setReplyToMessage(null);
    try {
      await messagesApi.sendMessage({
        conversationId: conversation._id,
        senderId: userId,
        content: optimistic.content,
        messageType: 'text',
        replyTo: optimistic.replyTo,
      });
      eventBus.emit('messageSent', { message: optimistic, conversation });
    } catch (e) {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      showToast('Failed to send reply');
    } finally {
      setSending(false);
    }
  };
  // Delete message (optimistic UI)
  const handleDeleteMessage = async (message: Message) => {
    // Don't allow deletion of optimistic messages (temp_ IDs)
    if (typeof message._id === 'string' && message._id.startsWith('temp_')) {
      showToast('Cannot delete message while it\'s being sent');
      return;
    }

    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          // Optimistic update - mark as deleted immediately
          setMessages(prev => prev.map(m => 
            m._id === message._id 
              ? { ...m, deletedAt: new Date() }
              : m
          ));
          
          await messagesApi.deleteMessage(message._id);
          showToast('Message deleted');
          // Socket event will confirm the deletion
        } catch (e) {
          // Revert optimistic update on error
          setMessages(prev => prev.map(m => 
            m._id === message._id 
              ? { ...m, deletedAt: undefined }
              : m
          ));
          showToast('Failed to delete message');
        }
      }},
    ]);
  };
  // Long-press action sheet
  const handleMessageLongPress = (message: Message, isOwn: boolean) => {
    setActionSheetMessage(message);
    setActionSheetIsOwn(isOwn);
    
    // Don't allow edit/delete for optimistic messages
    const isOptimistic = typeof message._id === 'string' && message._id.startsWith('temp');
    
    if (isOwn && !isOptimistic) {
      setActionSheetOptions(['Reply', 'Edit', 'Delete', 'Cancel']);
    } else {
      setActionSheetOptions(['Reply', 'Cancel']);
    }
    
    actionSheetRef.current?.show();
  };

  const handleActionSheetPress = (index: number) => {
    if (!actionSheetMessage) return;
    if (index === 0) setReplyToMessage(actionSheetMessage);
    else if (actionSheetIsOwn && index === 1) {
      setEditingMessage(actionSheetMessage);
      setInput(actionSheetMessage.content);
    } else if (actionSheetIsOwn && index === 2) handleDeleteMessage(actionSheetMessage);
    setActionSheetMessage(null);
  };

  const handlePickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const isImage = typeof asset.type === 'string' && asset.type.startsWith('image');
      const isVideo = typeof asset.type === 'string' && asset.type.startsWith('video');
      if (!isImage && !isVideo) {
        showToast('Only images and videos are allowed');
        return;
      }
      const fileSize = asset.fileSize ?? 0;
      if ((isImage && fileSize > 10 * 1024 * 1024) || (isVideo && fileSize > 100 * 1024 * 1024)) {
        showToast('File too large');
        return;
      }
      let uploadMimeType = asset.type || '';
      if (!uploadMimeType || (!uploadMimeType.startsWith('image/') && !uploadMimeType.startsWith('video/'))) {
        if (asset.uri.endsWith('.mp4')) {
          uploadMimeType = 'video/mp4' as any;
        } else if (asset.uri.endsWith('.png')) {
          uploadMimeType = 'image/png' as any;
        } else {
          uploadMimeType = 'image/jpeg' as any;
        }
      }
      const file = {
        uri: asset.uri,
        name: asset.fileName || (uploadMimeType.startsWith('video/') ? 'upload.mp4' : 'upload.jpg'),
        type: uploadMimeType,
      };
      console.log('[Upload Debug] File object:', file);
      // Log API URL
      const apiUrl = resolveApiBaseUrl();
      console.log('[Upload Debug] API URL:', apiUrl + '/messages/upload');
      // Prepare FormData for upload (no logging of entries, not supported in React Native)
      const formData = new FormData();
      formData.append('file', file as any);
      try {
        setUploading(true);
        setUploadProgress(0);
        
        // Log socket state before upload
        console.log('[Upload Debug] Socket state before upload:', {
          isConnected: socket.isConnected,
          socketId: socket.socket?.id,
          conversationId: conversation._id
        });
        
        const uploadRes = await messagesApi.uploadMessageFile(file);
        const url = typeof uploadRes.url === 'string' ? uploadRes.url : '';
        const name = typeof file.name === 'string' ? file.name : '';
        const optimistic = {
          _id: `temp_${Date.now()}`,
          conversationId: conversation._id,
          senderId: userId,
          content: '',
          messageType: (isVideo ? 'video' : 'image') as 'image' | 'video',
          attachments: [{ type: isVideo ? 'video' : 'image', url, name, size: Number(fileSize), duration: uploadRes.duration, thumbnail: uploadRes.thumbnail }],
          createdAt: new Date(),
          updatedAt: new Date(),
          isRead: false,
          isDelivered: false,
        };
        setMessages(prev => sortMessagesByTime(deduplicateMessages([...prev, optimistic])));
        
        // Send message via API
        await messagesApi.sendMessage({
          conversationId: conversation._id,
          senderId: userId,
          content: '',
          messageType: isVideo ? 'video' : 'image',
          attachments: [{ type: isVideo ? 'video' : 'image', url, name, size: Number(fileSize), duration: uploadRes.duration, thumbnail: uploadRes.thumbnail }],
        });
        
        // Log socket state after upload
        console.log('[Upload Debug] Socket state after upload:', {
          isConnected: socket.isConnected,
          socketId: socket.socket?.id,
          conversationId: conversation._id
        });
        
        // Ensure room membership is maintained after upload
        if (socket.isConnected && socket.joinConversations) {
          console.log('[Upload Debug] Ensuring room membership after upload');
          socket.joinConversations([conversation._id]);
        }
      } catch (e) {
        const errorMsg = e && typeof e === 'object' && 'message' in e ? (e as any).message : String(e);
        console.error('Upload error:', errorMsg, e);
        showToast(errorMsg || 'Failed to upload media');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  };

  // Helper to get sender display info
  const getSenderInfo = (item: Message, isOwn: boolean) => {
    if (isOwn) {
      // Get current user's profile info from store first
      const storeProfileImage = currentUserImages.profileImageUrl || getUserImage('current', 'profile', null);
      const userProfileImage = storeProfileImage || currentUser?.profileImageUrl;
      const userAvatar = userProfileImage ? getCacheBustedUrl(userProfileImage, false) : null;
      
      const userFirstName = currentUser?.firstName || '';
      const userLastName = currentUser?.lastName || '';
      const userFullName = `${userFirstName} ${userLastName}`.trim();
      const userName = userFullName || currentUser?.username || 'You';
      return { 
        name: userName, 
        avatar: userAvatar,
        displayName: 'You' // Keep "You" as display name for own messages
      };
    }
    const anyItem = item as any;
    if (anyItem.senderId_details) {
      const senderId = anyItem.senderId_details?._id || anyItem.senderId_details?.id;
      const storeImage = senderId ? getUserImage(senderId, 'profile', anyItem.senderId_details.profileImageUrl) : anyItem.senderId_details.profileImageUrl;
      const avatar = storeImage ? getCacheBustedUrl(storeImage, false) : null;
      
      return {
        name: (() => {
          const firstName = anyItem.senderId_details?.firstName || '';
          const lastName = anyItem.senderId_details?.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          return fullName || anyItem.senderId_details?.username || 'User';
        })(),
        avatar: avatar,
        displayName: undefined,
      };
    }
    if (item.senderId && typeof item.senderId === 'object') {
      const senderId = item.senderId._id || item.senderId.id;
      const storeImage = senderId ? getUserImage(senderId, 'profile', item.senderId.profileImageUrl) : item.senderId.profileImageUrl;
      const avatar = storeImage ? getCacheBustedUrl(storeImage, false) : null;
      
      return {
        name: (() => {
          const firstName = item.senderId?.firstName || '';
          const lastName = item.senderId?.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          return fullName || item.senderId?.username || 'User';
        })(),
        avatar: avatar,
        displayName: undefined,
      };
    }
    return { name: 'User', avatar: undefined, displayName: undefined };
  };

  // Full-screen media viewing functions
  const openMediaViewer = (media: { type: 'image' | 'video', url: string, name?: string }) => {
    setSelectedMedia(media);
    setMediaModalVisible(true);
  };

  const closeMediaViewer = () => {
    setMediaModalVisible(false);
    setSelectedMedia(null);
  };

  // Render message bubble
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId && (typeof item.senderId === 'object' ? item.senderId._id : item.senderId) === userId;
    const { name, avatar, displayName } = getSenderInfo(item, isOwn);
    const showName = displayName || name;
    if (item.deletedAt) {
      return (
        <View style={[styles.messageBubble, isOwn ? styles.ownMessage : styles.otherMessage, { backgroundColor: colors.background.secondary }]}>
          <Text style={{ fontStyle: 'italic', color: colors.text.secondary }}>This message was deleted</Text>
        </View>
      );
    }
    return (
      <TouchableOpacity
        onLongPress={() => handleMessageLongPress(item, isOwn)}
        activeOpacity={0.8}
        style={[styles.messageBubble, isOwn ? styles.ownMessage : styles.otherMessage, { 
          backgroundColor: isOwn ? colors.primary[500] : colors.background.secondary 
        }]}
      >
        {/* Avatar and sender */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          {avatar && !failedMessageAvatars.has(avatar) ? (
            <Image
              key={`avatar-${getBaseUrl(avatar)}`}
              source={{ uri: avatar }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="disk"
              transition={200}
              onError={(error: any) => {
                console.error('❌ ChatScreen: Avatar failed to load:', {
                  url: avatar?.substring(0, 50) + '...',
                  error,
                });
                setFailedMessageAvatars(prev => new Set([...prev, avatar]));
              }}
            />
          ) : (
            <View style={[styles.avatar, styles.messageAvatarPlaceholder, { backgroundColor: colors.primary[500] }]}>
              {name && name !== 'User' && name !== 'You' ? (
                <Text style={[styles.messageAvatarText, { color: '#ffffff' }]}>
                  {name.split(' ').length >= 2 
                    ? `${name.split(' ')[0][0]}${name.split(' ')[1][0]}`.toUpperCase()
                    : name[0]?.toUpperCase() || 'U'}
                </Text>
              ) : (
                <Icon name="user" size={14} color="#ffffff" />
              )}
            </View>
          )}
          <Text style={[styles.senderName, { color: isOwn ? '#ffffff' : colors.text.primary }]}>{showName}</Text>
        </View>
        {/* Reply preview */}
        {item.replyTo && (
          typeof item.replyTo === 'string'
            ? (() => {
                const repliedMsg = messages.find(m => m._id === item.replyTo);
                return repliedMsg ? (
                  <Text style={[styles.replyPreview, { color: isOwn ? 'rgba(255,255,255,0.8)' : colors.text.secondary }]}>
                    Replying to: {repliedMsg.content.slice(0, 30)}
                  </Text>
                ) : null;
              })()
            : typeof item.replyTo === 'object' && item.replyTo.content && Boolean(item.replyTo.content)
              ? <Text style={[styles.replyPreview, { color: isOwn ? 'rgba(255,255,255,0.8)' : colors.text.secondary }]}>
                  Replying to: {item.replyTo.content.slice(0, 30)}
                </Text>
              : null
        )}
        {/* Content - Only show if there's actual content or no attachments */}
        {(item.content || (!item.attachments || item.attachments.length === 0)) && (
          <Text style={[styles.messageText, { color: isOwn ? '#ffffff' : colors.text.primary }]}>
            {item.content || ''}{item.editedAt ? ' (edited)' : ''}
          </Text>
        )}
                 {/* Attachments */}
         {item.attachments && item.attachments.length > 0 && (
           <View style={styles.attachmentsContainer}>
             {item.attachments.map((att, idx) => {
               if (att.type === 'image') {
                 console.log('[ChatScreen] Rendering image attachment:', {
                   messageId: item._id,
                   attachmentUrl: att.url,
                   attachmentName: att.name,
                   hasUrl: !!att.url,
                   urlLength: att.url?.length
                 });
                 
                 if (!att.url) {
                   console.warn('[ChatScreen] Image attachment missing URL:', { att, messageId: item._id });
                   return (
                     <View key={idx} style={styles.mediaContainer}>
                       <Text style={{ color: colors.text.secondary }}>Image (loading...)</Text>
                     </View>
                   );
                 }
                 
                 return (
                   <TouchableOpacity 
                     key={idx} 
                     style={styles.mediaContainer}
                     onPress={() => openMediaViewer({ type: 'image', url: att.url, name: att.name })}
                     activeOpacity={0.8}
                   >
                     <Image 
                       source={{ uri: att.url }} 
                       style={styles.attachmentImage}
                       resizeMode="cover"
                       onLoad={() => console.log('[ChatScreen] Image loaded successfully:', att.url)}
                       onError={(error) => {
                         console.error('[ChatScreen] Image load error:', {
                           error,
                           url: att.url,
                           messageId: item._id
                         });
                       }}
                     />
                     {att.name && (
                       <Text style={[styles.mediaName, { color: isOwn ? 'rgba(255,255,255,0.8)' : colors.text.secondary }]}>
                         {att.name}
                       </Text>
                     )}
                   </TouchableOpacity>
                 );
               } else if (att.type === 'video') {
                 return (
                   <TouchableOpacity 
                     key={idx} 
                     style={styles.mediaContainer}
                     onPress={() => openMediaViewer({ type: 'video', url: att.url, name: att.name })}
                     activeOpacity={0.8}
                   >
                     <View style={styles.videoContainer}>
                       <Video
                         source={{ uri: att.url }}
                         style={styles.videoPlayer}
                         useNativeControls
                         resizeMode={ResizeMode.CONTAIN}
                         shouldPlay={false}
                         shouldCorrectPitch={false}
                         progressUpdateIntervalMillis={1000}
                         onError={(error) => {
                           console.log('Chat video error:', error);
                         }}
                         onLoad={() => {
                           console.log('Chat video loaded successfully');
                         }}
                       />
                       {/* Play button overlay */}
                       <View style={styles.playButtonOverlay}>
                         <Icon name="play" size={24} color="#fff" />
                       </View>
                       {/* Duration overlay */}
                       {att.duration && (
                         <View style={styles.durationOverlay}>
                           <Text style={styles.durationText}>
                             {Math.floor(att.duration / 60)}:{(att.duration % 60).toString().padStart(2, '0')}
                           </Text>
                         </View>
                       )}
                     </View>
                     {att.name && (
                       <Text style={[styles.mediaName, { color: isOwn ? 'rgba(255,255,255,0.8)' : colors.text.secondary }]}>
                         {att.name}
                       </Text>
                     )}
                   </TouchableOpacity>
                 );
               }
               return null;
             })}
           </View>
         )}
        {/* Timestamp */}
        <Text style={[styles.timestamp, { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.text.secondary }]}>
          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  // Add debug log in render
  console.log('[ChatScreen] Rendering messages:', messages.map(m => m._id));

  // Header for chat (other participant info)
  let otherName = 'User';
  let otherAvatarUrl: string | undefined = undefined;
  let otherUserId: string | undefined = undefined;
  
  // Helper function to get full name (firstName + lastName)
  const getFullName = (user: any): string => {
    if (!user) return 'User';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.username || 'User';
  };
  
  // 1. Use conversation.otherParticipant if present (frontend logic)
  const anyConv = conversation as any;
  if (anyConv.otherParticipant) {
    otherName = getFullName(anyConv.otherParticipant);
    otherUserId = anyConv.otherParticipant._id || anyConv.otherParticipant.id;
    otherAvatarUrl = anyConv.otherParticipant.profileImageUrl;
  } else if (conversation.isGroup && conversation.groupName) {
    otherName = conversation.groupName;
    otherAvatarUrl = conversation.groupImage;
  } else if (conversation.participants.length === 2) {
    const other = conversation.participants.find(u => u._id !== userId);
    if (other) {
      otherName = getFullName(other);
      otherUserId = other._id || other.id;
      otherAvatarUrl = other.profileImageUrl;
    }
  } else if (conversation.lastMessage && conversation.lastMessage.senderId && typeof conversation.lastMessage.senderId === 'object') {
    // Fallback: use last message sender if available
    const sender = conversation.lastMessage.senderId;
    otherName = getFullName(sender);
    otherUserId = sender._id || sender.id;
    otherAvatarUrl = sender.profileImageUrl;
  }
  
  // Get avatar from store first, then fallback to API data
  const storeAvatar = otherUserId ? getUserImage(otherUserId, 'profile', otherAvatarUrl) : otherAvatarUrl;
  const otherAvatar = storeAvatar ? getCacheBustedUrl(storeAvatar, false) : null;
  const otherAvatarKey = storeAvatar ? `header-avatar-${getBaseUrl(storeAvatar)}` : 'header-avatar-placeholder';

  return (
    <SafeAreaView 
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      edges={['left', 'right', 'bottom']}
    >
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background.primary}
      />
      {/* Chat header */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: colors.background.primary, 
          borderBottomColor: colors.border.light,
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: 12,
        }
      ]}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        
        {/* Avatar */}
        {otherAvatar && !failedAvatar ? (
          <Image
            key={otherAvatarKey}
            source={{ uri: otherAvatar }}
            style={styles.headerAvatar}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
            onError={(error: any) => {
              console.error('❌ ChatScreen: Header avatar failed to load:', {
                url: otherAvatar?.substring(0, 50) + '...',
                error,
              });
              setFailedAvatar(otherAvatar);
            }}
          />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder, { backgroundColor: colors.primary[500] }]}>
            {otherName && otherName !== 'User' ? (
              <Text style={[styles.headerAvatarText, { color: '#ffffff' }]}>
                {otherName.split(' ').length >= 2 
                  ? `${otherName.split(' ')[0][0]}${otherName.split(' ')[1][0]}`.toUpperCase()
                  : otherName[0]?.toUpperCase() || 'U'}
              </Text>
            ) : (
              <Icon name="user" size={20} color="#ffffff" />
            )}
          </View>
        )}
        
        {/* Name */}
        <Text style={[styles.headerName, { color: colors.text.primary }]}>{otherName}</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 44) + 60 : 0}
      >
        {loading && page === 1 ? (
          <ActivityIndicator style={{ marginTop: 32 }} size="large" color={colors.primary[500]} />
        ) : (
                     <FlatList
             ref={flatListRef}
             data={messages}
             renderItem={renderMessage}
             keyExtractor={item => item._id}
             contentContainerStyle={[
               styles.list,
               { paddingBottom: 20 } // Add extra padding at bottom
             ]}
             onEndReached={handleLoadMore}
             onEndReachedThreshold={0.2}
             ListFooterComponent={loading ? <ActivityIndicator size="small" color={colors.primary[500]} /> : null}
             inverted={false} // Show newest at bottom, not inverted
             showsVerticalScrollIndicator={false}
             keyboardShouldPersistTaps="handled"
             keyboardDismissMode="interactive"
             automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
           />
        )}
        {typingUsers.length > 0 && (
          <View style={styles.typingIndicator}>
            <Text style={[styles.typingText, { color: colors.text.secondary }]}>Typing...</Text>
          </View>
        )}
        {uploading && (
          <View style={[styles.uploadIndicator, { backgroundColor: colors.background.secondary }]}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
            <Text style={[styles.uploadText, { color: colors.text.secondary }]}>
              Uploading media... {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : ''}
            </Text>
          </View>
        )}
        {/* Preview UI for edit/reply */}
        {editingMessage || replyToMessage ? (
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: 8, 
            backgroundColor: colors.background.secondary, 
            borderBottomWidth: 1, 
            borderColor: colors.border.light 
          }}>
            <Text style={{ flex: 1, fontSize: 14, color: colors.text.primary, marginRight: 8 }}>
              {editingMessage ? `Editing: ${editingMessage.content.slice(0, 30)}` : `Replying to: ${replyToMessage?.content.slice(0, 30)}`}
            </Text>
            <TouchableOpacity onPress={() => { setEditingMessage(null); setReplyToMessage(null); setInput(''); }}>
              <Icon name="x" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        ) : null}
                 <View style={[
                   styles.inputContainer, 
                   { 
                     backgroundColor: colors.background.primary, 
                     borderColor: colors.border.light,
                     paddingBottom: Math.max(insets.bottom, 8),
                   }
                 ]}>
           <TouchableOpacity 
             onPress={handlePickMedia} 
             style={styles.mediaButton}
             disabled={uploading}
           >
             {uploading ? (
               <ActivityIndicator size="small" color={colors.primary[500]} />
             ) : (
               <Icon name="paperclip" size={24} color={colors.primary[500]} />
             )}
           </TouchableOpacity>
           <TextInput
             style={[styles.input, { 
               backgroundColor: colors.background.secondary, 
               color: colors.text.primary,
               borderColor: colors.border.light
             }]}
             value={input}
             onChangeText={handleInputChange}
             placeholder="Type a message..."
             placeholderTextColor={colors.text.secondary}
             editable={!sending}
             onSubmitEditing={editingMessage ? handleEditMessage : replyToMessage ? handleReplySend : sendMessage}
             returnKeyType="send"
             multiline={true}
             maxLength={1000}
             textAlignVertical="center"
             onFocus={() => {
               // Auto-scroll to bottom when input is focused
               setTimeout(() => {
                 flatListRef.current?.scrollToEnd({ animated: true });
               }, 100);
             }}
           />
           {/* Input actions */}
           <TouchableOpacity
             style={styles.sendButton}
             onPress={editingMessage ? handleEditMessage : replyToMessage ? handleReplySend : sendMessage}
             disabled={sending || !input.trim()}
           >
             <Icon name={editingMessage ? 'check' : 'send'} size={22} color={sending || !input.trim() ? colors.neutral[400] : colors.primary[500]} />
           </TouchableOpacity>
         </View>
      </KeyboardAvoidingView>
             <ActionSheet
         ref={actionSheetRef}
         options={actionSheetOptions}
         cancelButtonIndex={actionSheetOptions.length - 1}
         destructiveButtonIndex={actionSheetIsOwn ? actionSheetOptions.indexOf('Delete') : undefined}
         onPress={handleActionSheetPress}
       />
       
       {/* Full-screen Media Modal */}
       <Modal
         visible={mediaModalVisible}
         transparent={true}
         animationType="fade"
         onRequestClose={closeMediaViewer}
       >
         <View style={styles.mediaModalOverlay}>
           <TouchableOpacity 
             style={styles.mediaModalCloseButton}
             onPress={closeMediaViewer}
           >
             <Icon name="x" size={24} color="#fff" />
           </TouchableOpacity>
           
           {selectedMedia && (
             <View style={styles.mediaModalContent}>
               {selectedMedia.type === 'image' ? (
                 <Image
                   source={{ uri: selectedMedia.url }}
                   style={styles.fullScreenImage}
                   resizeMode="contain"
                 />
               ) : (
                 <Video
                   source={{ uri: selectedMedia.url }}
                   style={styles.fullScreenVideo}
                   useNativeControls
                   resizeMode={ResizeMode.CONTAIN}
                   shouldPlay={true}
                   shouldCorrectPitch={false}
                   progressUpdateIntervalMillis={1000}
                   onError={(error) => {
                     console.log('Full-screen video error:', error);
                   }}
                   onLoad={() => {
                     console.log('Full-screen video loaded successfully');
                   }}
                 />
               )}
               
               {selectedMedia.name && (
                 <Text style={styles.mediaModalFileName}>
                   {selectedMedia.name}
                 </Text>
               )}
             </View>
           )}
         </View>
       </Modal>
     </SafeAreaView>
   );
 }

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageText: { fontSize: 16 },
  typingIndicator: { padding: 8, alignItems: 'flex-start' },
  typingText: { fontSize: 14, fontStyle: 'italic' },
  uploadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    marginLeft: 8,
  },
     inputContainer: {
     flexDirection: 'row',
     alignItems: 'flex-end', // Align to bottom for better multiline support
     padding: 12,
     paddingTop: 12,
     borderTopWidth: 1,
     minHeight: 60, // Minimum height for input container
   },
   input: {
     flex: 1,
     fontSize: 16,
     padding: 12,
     paddingTop: 12,
     paddingBottom: 12,
     borderRadius: 20,
     marginRight: 8,
     borderWidth: 1,
     minHeight: 40, // Minimum height for input
     maxHeight: 100, // Maximum height for input (multiline)
   },
     sendButton: {
     padding: 12,
     borderRadius: 20,
     minWidth: 44,
     minHeight: 44,
     justifyContent: 'center',
     alignItems: 'center',
     backgroundColor: 'rgba(0,0,0,0.05)',
   },
  senderName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  replyPreview: {
    fontSize: 12,
    marginTop: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    overflow: 'hidden',
  },
  messageAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  attachmentsContainer: {
    marginTop: 8,
    gap: 8,
  },
  mediaContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  videoContainer: {
    width: 240,
    height: 180,
    borderRadius: 12,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  mediaName: {
    fontSize: 12,
    marginTop: 4,
    marginHorizontal: 8,
    marginBottom: 8,
    opacity: 0.8,
  },
  timestamp: {
    fontSize: 12,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 10,
    minHeight: 56, // Minimum touch target height
  },
  backButton: {
    marginRight: 4,
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  headerAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
     mediaButton: {
     padding: 10,
     borderRadius: 20,
     marginRight: 8,
     backgroundColor: 'rgba(0,0,0,0.05)',
     minWidth: 44,
     minHeight: 44,
     justifyContent: 'center',
     alignItems: 'center',
   },
   // Full-screen media modal styles
   mediaModalOverlay: {
     flex: 1,
     backgroundColor: 'rgba(0,0,0,0.9)',
     justifyContent: 'center',
     alignItems: 'center',
   },
   mediaModalContent: {
     flex: 1,
     width: '100%',
     justifyContent: 'center',
     alignItems: 'center',
   },
   mediaModalCloseButton: {
     position: 'absolute',
     top: 50,
     right: 20,
     zIndex: 10,
     width: 44,
     height: 44,
     borderRadius: 22,
     backgroundColor: 'rgba(0,0,0,0.5)',
     justifyContent: 'center',
     alignItems: 'center',
   },
   fullScreenImage: {
     width: Dimensions.get('window').width,
     height: Dimensions.get('window').height * 0.8,
   },
   fullScreenVideo: {
     width: Dimensions.get('window').width,
     height: Dimensions.get('window').height * 0.8,
   },
   mediaModalFileName: {
     position: 'absolute',
     bottom: 50,
     left: 20,
     right: 20,
     color: '#fff',
     fontSize: 16,
     textAlign: 'center',
     backgroundColor: 'rgba(0,0,0,0.5)',
     padding: 10,
     borderRadius: 8,
   },
 });