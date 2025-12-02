"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from './socket-provider';
import { useMessageApi, useBlockApi } from '@/lib/api';
import { useBlockStatusListener } from '@/hooks/use-block-status-listener';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Smile, 
  MoreHorizontal,
  Edit,
  Trash2,
  Reply,
  Search,
  Phone,
  Video,
  Info,
  Loader2,
  AlertCircle,
  MessageCircle,
  Ban,
  Download,
  X,
  Check,
  ArrowLeft
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: string;
  attachments?: Array<{ 
    type: string; 
    url: string; 
    name?: string; 
    size?: number; 
    duration?: number; // For videos
    thumbnail?: string; // For videos
  }>;
  replyTo?: string;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  senderId_details?: {
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  readBy?: string[];
}

interface Conversation {
  _id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: string;
  };
  unreadCount: number;
  otherParticipant?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
}

interface User {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface MessageChatProps {
  conversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
}

export function MessageChat({ conversation, onConversationSelect }: MessageChatProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { socket } = useSocket();
  const messageApi = useMessageApi();
  const { checkMutualBlockStatus } = useBlockApi();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState({
    userBlockedOther: false,
    otherBlockedUser: false,
    isMutualBlock: false
  });
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string; isOwnImage: boolean } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const messageApiRef = useRef<typeof messageApi>(messageApi);
  const topOfMessagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  messageApiRef.current = messageApi;

  // Check block status when conversation changes
  useEffect(() => {
    if (!conversation || !userId) {
      setBlockStatus({
        userBlockedOther: false,
        otherBlockedUser: false,
        isMutualBlock: false
      });
      return;
    }

    const checkBlockStatus = async () => {
      try {
        const otherUserId = conversation.otherParticipant?._id;
        if (otherUserId) {
          const response = await checkMutualBlockStatus(otherUserId);
          setBlockStatus(response);
        }
      } catch (error) {
        console.error('Error checking block status:', error);
      }
    };

    checkBlockStatus();
  }, [conversation?._id, conversation?.otherParticipant?._id, userId, checkMutualBlockStatus]);

  // Use block status listener for real-time updates
  useBlockStatusListener(
    conversation?.otherParticipant?._id || '',
    (event) => {
      if (event.type === 'blockedByUser') {
        setBlockStatus(prev => ({
          ...prev,
          otherBlockedUser: true,
          isMutualBlock: true
        }));
      } else if (event.type === 'unblockedByUser') {
        setBlockStatus(prev => ({
          ...prev,
          otherBlockedUser: false,
          isMutualBlock: prev.userBlockedOther
        }));
      } else if (event.type === 'userBlocked') {
        setBlockStatus(prev => ({
          ...prev,
          userBlockedOther: true,
          isMutualBlock: true
        }));
      } else if (event.type === 'userUnblocked') {
        setBlockStatus(prev => ({
          ...prev,
          userBlockedOther: false,
          isMutualBlock: prev.otherBlockedUser
        }));
      }
    }
  );

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation) {
      setMessages([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setPage(1);
    setHasMoreMessages(true);
    loadMessages(conversation._id, 1);
    
    // Join socket room
    socket?.emit('joinConversations', [conversation._id]);
  }, [conversation?._id]);

  const ensureMessageSenderDetails = (message: Message): Message => {
    // If message already has sender details, return as is
    if (message.senderId_details && message.senderId_details.username) {
      return message;
    }
    
    // If it's our own message, add our details
    if (message.senderId === userId) {
      return {
        ...message,
        senderId_details: {
          username: 'You',
          firstName: 'You',
          lastName: '',
          profileImageUrl: ''
        }
      };
    }
    
    // If it's from the other participant, use conversation details
    if (conversation?.otherParticipant && message.senderId === conversation.otherParticipant._id) {
      return {
        ...message,
        senderId_details: {
          username: conversation.otherParticipant.username,
          firstName: conversation.otherParticipant.firstName,
          lastName: conversation.otherParticipant.lastName,
          profileImageUrl: conversation.otherParticipant.profileImageUrl
        }
      };
    }
    
    // Return message as is if we can't determine sender details
    return message;
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversation?._id) {
        // Ensure message has proper sender details
        const messageWithDetails = ensureMessageSenderDetails(message);
        
        setMessages(prev => {
          // Create a Set of existing message IDs for efficient lookup
          const existingIds = new Set(prev.map((m: Message) => m._id));
          
          // Check if message already exists
          if (existingIds.has(messageWithDetails._id)) {
            // Update existing message
            return deduplicateMessages(prev.map((m: Message) => m._id === messageWithDetails._id ? messageWithDetails : m));
          } else {
            // Check for temporary message with same content (for optimistic updates)
            const tempIndex = prev.findIndex((m: Message) => 
              m._id.startsWith('temp_') && 
              m.content === messageWithDetails.content && 
              m.senderId === messageWithDetails.senderId &&
              m.conversationId === messageWithDetails.conversationId
            );
            
            if (tempIndex !== -1) {
              // Replace temporary message with real message
              const newMessages = [...prev];
              newMessages[tempIndex] = messageWithDetails;
              return deduplicateMessages(newMessages);
            } else {
              // Add new message
              return deduplicateMessages([...prev, messageWithDetails]);
            }
          }
        });
        
        // Only mark as read if the message is not from the current user
        // and the conversation is currently active
        if (conversation && messageWithDetails.senderId !== userId) {
          // Mark as read after a short delay to avoid spam
          setTimeout(() => {
            messageApiRef.current.markMessageAsRead(conversation._id, messageWithDetails._id).catch(console.error);
          }, 1000);
        }
      }
    };

    const handleMessageEdited = (message: Message) => {
      if (message.conversationId === conversation?._id) {
        const messageWithDetails = ensureMessageSenderDetails(message);
        setMessages(prev => {
          // Find and update the specific message
          const updatedMessages = prev.map(m => {
            if (m._id === messageWithDetails._id) {
              // Return the updated message with all the new data
              return {
                ...messageWithDetails,
                // Ensure we preserve any existing fields that might not be in the socket event
                readBy: m.readBy || messageWithDetails.readBy || []
              };
            }
            return m;
          });
          
          // Log for debugging
          console.log('Message edited, updating state:', {
            messageId: messageWithDetails._id,
            oldContent: prev.find(m => m._id === messageWithDetails._id)?.content,
            newContent: messageWithDetails.content,
            editedAt: messageWithDetails.editedAt
          });
          
          return updatedMessages;
        });
      }
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
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
      if (typingUserId !== userId) {
        setTypingUsers(prev => prev.filter(id => id !== typingUserId));
      }
    };

    const handleUserStatusChange = ({ userId: statusUserId, isOnline, lastSeen }: { userId: string; isOnline: boolean; lastSeen: string }) => {
      // Update conversation's other participant status if it matches
      if (conversation?.otherParticipant?._id === statusUserId) {
        onConversationSelect({
          ...conversation,
          otherParticipant: {
            ...conversation.otherParticipant,
            isOnline,
            lastSeen
          }
        });
      }
    };

    const handleMessageError = ({ error }: { error: string }) => {
      // Removed message error toast - too technical for normal users
      console.error('Message error:', error);
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messageEdited', handleMessageEdited);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('userStatusChange', handleUserStatusChange);
    socket.on('messageError', handleMessageError);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageEdited', handleMessageEdited);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('userStatusChange', handleUserStatusChange);
      socket.off('messageError', handleMessageError);
    };
  }, [socket, conversation, userId, onConversationSelect]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper function to deduplicate messages by _id
  const deduplicateMessages = (messages: Message[]): Message[] => {
    const seen = new Map<string, Message>();
    
    messages.forEach((message: Message) => {
      const existingMessage = seen.get(message._id);
      
      if (!existingMessage) {
        // First time seeing this message ID
        seen.set(message._id, message);
      } else {
        // We have a duplicate, keep the one with the latest editedAt timestamp
        // or the one with more complete data
        const existingEditedAt = existingMessage.editedAt ? new Date(existingMessage.editedAt).getTime() : 0;
        const newEditedAt = message.editedAt ? new Date(message.editedAt).getTime() : 0;
        
        if (newEditedAt > existingEditedAt) {
          // New message is more recent (edited later)
          seen.set(message._id, message);
        } else if (newEditedAt === existingEditedAt) {
          // Same edit time, prefer the one with more complete data
          const existingFields = Object.keys(existingMessage).length;
          const newFields = Object.keys(message).length;
          
          if (newFields > existingFields) {
            seen.set(message._id, message);
          }
        }
        // Otherwise keep the existing message
      }
    });
    
    return Array.from(seen.values());
  };

  const loadMessages = async (conversationId: string, pageNum: number) => {
    try {
      const response = await messageApiRef.current.getMessages(conversationId, pageNum, 20);
      const newMessages = Array.isArray(response?.messages) ? response.messages : [];
      
      // Ensure all loaded messages have proper sender details
      const messagesWithDetails = newMessages.map((message: Message) => ensureMessageSenderDetails(message));
      
      setMessages(prev => {
        if (pageNum === 1) {
          return deduplicateMessages(messagesWithDetails);
        } else {
          // When loading more messages, filter out duplicates
          const existingIds = new Set(prev.map((m: Message) => m._id));
          const uniqueNewMessages = messagesWithDetails.filter((m: Message) => !existingIds.has(m._id));
          return deduplicateMessages([...uniqueNewMessages, ...prev]);
        }
      });
      
      // Check if we have more messages to load
      setHasMoreMessages(messagesWithDetails.length === 20);
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages');
      setLoading(false);
      // Ensure messages is always an array even on error
      setMessages(prev => pageNum === 1 ? [] : prev);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversation || !userId || sending) return;

    const messageData = {
      conversationId: conversation._id,
      senderId: userId,
      content: input.trim(),
      messageType: 'text',
      replyTo: replyToMessage?._id
    };

    // Optimistic update
    const optimisticMessage: Message = {
      _id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conversationId: conversation._id,
      senderId: userId,
      content: input.trim(),
      messageType: 'text',
      createdAt: new Date().toISOString(),
      replyTo: replyToMessage?._id,
      senderId_details: {
        username: 'You',
        firstName: 'You',
        lastName: '',
        profileImageUrl: ''
      }
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setInput('');
    setReplyToMessage(null);
    setSending(true);

    try {
      // Try socket first, fallback to HTTP API
      if (socket?.connected) {
        socket.emit('sendMessage', messageData);
        setSending(false);
      } else {
        // Fallback to HTTP API if socket is not connected
        // Removed debug log - not needed for production
        await messageApiRef.current.sendMessage(messageData);
        setSending(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setSending(false);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
      
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !conversation || !userId) {
      console.log('❌ Missing required data for upload:', { file: !!file, conversation: !!conversation, userId: !!userId });
      return;
    }
    
    console.log('📁 File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Validate file type - allow images and videos
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast({
        title: "Error",
        description: "Only image and video files are allowed",
        variant: "destructive"
      });
      return;
    }

    // Validate file size
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for videos, 10MB for images
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxSizeMB = isVideo ? '100' : '10';
      toast({
        title: "File Too Large",
        description: `"${file.name}" is ${fileSizeMB}MB. Maximum ${maxSizeMB}MB allowed for ${isVideo ? 'videos' : 'images'}.`,
        variant: "destructive"
      });
      return;
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      setSending(true);
      setUploadProgress(0);
      
      console.log('📁 Starting file upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isVideo,
        isImage
      });
      
      // Use real upload progress for images and videos
      const timeout = isVideo ? 5 * 60 * 1000 : 2 * 60 * 1000;
      let uploadResponse;
      try {
        uploadResponse = await Promise.race([
          messageApiRef.current.uploadMessageFileWithProgress(file, (percent) => {
            setUploadProgress(percent);
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), timeout))
        ]);
      } catch (uploadError) {
        throw uploadError;
      }
      
      setUploadProgress(100);
      
      const messageData = {
        conversationId: conversation._id,
        senderId: userId,
        content: '',
        messageType: isVideo ? 'video' : 'image',
        attachments: [{
          type: isVideo ? 'video' : 'image',
          url: uploadResponse.url,
          name: file.name,
          size: file.size,
          duration: uploadResponse.duration, // For videos
          thumbnail: uploadResponse.thumbnail // For videos
        }]
      };

      // Optimistic update
      const optimisticMessage: Message = {
        _id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        conversationId: conversation._id,
        senderId: userId,
        content: '',
        messageType: isVideo ? 'video' : 'image',
        createdAt: new Date().toISOString(),
        attachments: [{
          type: isVideo ? 'video' : 'image',
          url: uploadResponse.url,
          name: file.name,
          size: file.size,
          duration: uploadResponse.duration,
          thumbnail: uploadResponse.thumbnail
        }],
        senderId_details: {
          username: 'You',
          firstName: 'You',
          lastName: '',
          profileImageUrl: ''
        }
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setSending(false);

      // Send via API - the backend will handle persistence
      try {
        await messageApiRef.current.sendMessage(messageData);
        // Remove optimistic message since the real one will be added via socket
        setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
      } catch (error) {
        console.error('Failed to send message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      setSending(false);
      setUploadProgress(0);
      
      // Show more specific error message
      let errorTitle = "Upload Failed";
      let errorMessage = `Failed to upload ${isVideo ? 'video' : 'image'}`;
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorTitle = "Upload Timeout";
          errorMessage = `Upload took too long. Please try again with a smaller file or check your internet connection.`;
        } else if (error.message.includes('Network error')) {
          errorTitle = "Network Error";
          errorMessage = `Connection lost. Please check your internet and try again.`;
        } else if (error.message.includes('Failed to parse')) {
          errorTitle = "Server Error";
          errorMessage = `Server response was invalid. Please try again.`;
        } else {
          errorMessage = error.message;
        }
      } else if (typeof error === 'object' && error !== null && 'error' in error) {
        errorMessage = (error as any).error;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      console.log('Editing message:', { messageId, newContent });
      
      const response = await messageApiRef.current.editMessage(messageId, newContent);
      console.log('Edit response:', response);
      
      if (response && response.message) {
        const updatedMessage = response.message;
        console.log('Updated message from API:', updatedMessage);
        
        setMessages(prev => {
          const updatedMessages = prev.map(msg => {
            if (msg._id === messageId) {
              // Ensure we have all the necessary fields
              const messageWithDetails = ensureMessageSenderDetails(updatedMessage);
              console.log('Updating message in state:', {
                messageId,
                oldContent: msg.content,
                newContent: messageWithDetails.content,
                editedAt: messageWithDetails.editedAt
              });
              return messageWithDetails;
            }
            return msg;
          });
          return updatedMessages;
        });
      }
      
      setEditingMessage(null);
      setInput('');
      toast({
        title: "Success",
        description: "Message updated successfully!"
      });
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast({
        title: "Error",
        description: "Failed to edit message",
        variant: "destructive"
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await messageApiRef.current.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m._id !== messageId));
      toast({
        title: "Success",
        description: "Message deleted successfully!"
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  const handleTyping = useCallback(() => {
    if (!conversation || !socket) return;
    
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { conversationId: conversation._id });
    }
    
    // Clear typing indicator after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stopTyping', { conversationId: conversation._id });
    }, 3000);
  }, [conversation, socket, isTyping]);

  const loadMoreMessages = () => {
    if (!conversation || loading || !hasMoreMessages) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(conversation._id, nextPage);
  };

  const formatTime = (dateString: string) => {
    if (!dateString) {
      return 'Just now';
    }
    
    try {
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Just now';
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const getDisplayName = (message: Message) => {
    // If it's our own message, show "You"
    if (message.senderId === userId) {
      return 'You';
    }
    
    // If we have sender details, use them
    if (message.senderId_details) {
      if (message.senderId_details.firstName) {
        return message.senderId_details.firstName;
      }
      if (message.senderId_details.username) {
        return message.senderId_details.username;
      }
    }
    
    // If we have conversation participant info, use that
    if (conversation?.otherParticipant) {
      if (conversation.otherParticipant.firstName) {
        return conversation.otherParticipant.firstName;
      }
      if (conversation.otherParticipant.username) {
        return conversation.otherParticipant.username;
      }
    }
    
    // Debug logging for missing sender details
    console.warn('Missing sender details for message:', {
      messageId: message._id,
      senderId: message.senderId,
      senderDetails: message.senderId_details,
      conversationParticipant: conversation?.otherParticipant
    });
    
    // Final fallback
    return 'User';
  };

  const handleEditStart = (message: Message) => {
    setEditingMessage(message);
    setInput(message.content);
    setReplyToMessage(null);
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleEditCancel = () => {
    setEditingMessage(null);
    setInput('');
  };

  const handleEditSave = () => {
    if (editingMessage && input.trim() && input.trim() !== editingMessage.content) {
      editMessage(editingMessage._id, input.trim());
    } else {
      handleEditCancel();
    }
  };

  const handleReplyStart = (message: Message) => {
    setReplyToMessage(message);
    setEditingMessage(null);
    setInput('');
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleReplyCancel = () => {
    setReplyToMessage(null);
  };

  const handleReplySend = async () => {
    if (!input.trim() || !conversation || !userId || sending) return;

    const messageData = {
      conversationId: conversation._id,
      senderId: userId,
      content: input.trim(),
      messageType: 'text',
      replyTo: replyToMessage?._id
    };

    // Optimistic update
    const optimisticMessage: Message = {
      _id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conversationId: conversation._id,
      senderId: userId,
      content: input.trim(),
      messageType: 'text',
      createdAt: new Date().toISOString(),
      replyTo: replyToMessage?._id,
      senderId_details: {
        username: 'You',
        firstName: 'You',
        lastName: '',
        profileImageUrl: ''
      }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setInput('');
    setReplyToMessage(null);
    setSending(true);

    try {
      // Try socket first, fallback to HTTP API
      if (socket?.connected) {
        socket.emit('sendMessage', messageData);
        setSending(false);
      } else {
        // Fallback to HTTP API if socket is not connected
        // Removed debug log - not needed for production
        await messageApiRef.current.sendMessage(messageData);
        setSending(false);
      }
      
      // Removed success toast - visual feedback is enough
    } catch (error: any) {
      console.error('Failed to send reply:', error);
      setSending(false);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
      
      toast({
        title: "Error",
        description: error?.message || "Failed to send reply",
        variant: "destructive"
      });
    }
  };

  const handleInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleEditSave();
      } else if (replyToMessage) {
        handleReplySend();
      } else {
        sendMessage();
      }
    } else if (e.key === 'Escape') {
      if (editingMessage) {
        handleEditCancel();
      } else if (replyToMessage) {
        handleReplyCancel();
      }
    }
  };

  useEffect(() => {
    if (!topOfMessagesRef.current || !hasMoreMessages || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreMessages();
        }
      },
      { root: null as Element | null, rootMargin: '0px', threshold: 1.0 }
    );
    observer.observe(topOfMessagesRef.current);
    return () => observer.disconnect();
  }, [hasMoreMessages, loading, page, conversation?._id]);

  // Cleanup typing timeout on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
    };
  }, [conversation?._id]);

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.senderId === userId;
    const isDeleted = message.deletedAt;
    const isEdited = message.editedAt;

    if (isDeleted) {
      return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 lg:mb-2`} data-message-id={message._id}>
          <div className="text-gray-500 text-sm italic">
            This message was deleted
          </div>
        </div>
      );
    } 

    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3 lg:mb-2`} data-message-id={message._id}>
        <div className={`max-w-[85%] lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
          {!isOwnMessage && (
            <div className="flex items-center space-x-2 mb-2 lg:mb-1">
              <Avatar className="w-7 h-7 lg:w-6 lg:h-6">
                <AvatarImage 
                  src={message.senderId_details?.profileImageUrl} 
                  alt={getDisplayName(message)}
                />
                <AvatarFallback className="text-xs font-semibold">
                  {getDisplayName(message)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm lg:text-xs text-gray-500 font-medium">{getDisplayName(message)}</span>
            </div>
          )}
          
          <div className={`rounded-2xl lg:rounded-lg px-4 py-3 lg:px-3 lg:py-2 ${
            isOwnMessage 
              ? (message.messageType === 'image' || message.messageType === 'video')
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' 
                : 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
          }`}>
            {message.replyTo && (
              <div className="text-xs opacity-70 mb-2 lg:mb-1 border-l-2 pl-2 bg-black/10 dark:bg-white/10 rounded cursor-pointer hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                   onClick={() => {
                     // Find the replied message and scroll to it
                     const repliedMessage = messages.find(m => m._id === message.replyTo);
                     if (repliedMessage) {
                       const messageElement = document.querySelector(`[data-message-id="${message.replyTo}"]`);
                       if (messageElement) {
                         messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                         // Add a brief highlight effect
                         messageElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
                         setTimeout(() => {
                           messageElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
                         }, 2000);
                       }
                     }
                   }}>
                <div className="font-medium">Replying to {getDisplayName(messages.find(m => m._id === message.replyTo) || message)}</div>
                <div className="truncate">
                  {(() => {
                    const repliedMessage = messages.find(m => m._id === message.replyTo);
                    if (repliedMessage) {
                      return repliedMessage.content.length > 50 
                        ? `${repliedMessage.content.substring(0, 50)}...` 
                        : repliedMessage.content;
                    }
                    return 'Original message not found';
                  })()}
                </div>
              </div>
            )}
            
            <div className="text-base lg:text-sm leading-relaxed">
              {message.content}
              {isEdited && (
                <span className="text-xs opacity-70 ml-2 lg:ml-1">(edited)</span>
              )}
            </div>
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 lg:mt-2">
                {message.attachments.map((attachment, index) => (
                  <div key={index} className="mt-2 lg:mt-1 flex items-center gap-2">
                    {attachment.type === 'image' ? (
                      <>
                        <img 
                          src={attachment.url} 
                          alt={attachment.name || 'Image'} 
                          className="max-w-full rounded-lg lg:rounded cursor-pointer transition-transform hover:scale-105"
                          onClick={() => setPreviewImage({ url: attachment.url, alt: attachment.name || 'Image', isOwnImage: isOwnMessage })}
                          tabIndex={0}
                          aria-label="Preview image"
                          role="button"
                        />
                        {!isOwnMessage && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="ml-2 lg:ml-1 p-2 lg:p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            onClick={() => downloadImage(attachment.url, attachment.name || 'image')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    ) : attachment.type === 'video' ? (
                      <div className="relative">
                        <video 
                          src={attachment.url} 
                          poster={attachment.thumbnail}
                          controls
                          className="max-w-full rounded-lg lg:rounded cursor-pointer transition-transform hover:scale-105"
                          preload="metadata"
                        >
                          Your browser does not support the video tag.
                        </video>
                        {attachment.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {Math.floor(attachment.duration / 60)}:{(attachment.duration % 60).toString().padStart(2, '0')}
                          </div>
                        )}
                        {!isOwnMessage && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 p-2 lg:p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors bg-white/80 dark:bg-gray-800/80"
                            onClick={() => downloadImage(attachment.url, attachment.name || 'video')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 p-3 lg:p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm">{attachment.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2 lg:mt-1">
              <div className="text-xs opacity-70">
                {formatTime(message.createdAt)}
              </div>
              {isOwnMessage && message.readBy && conversation?.otherParticipant?._id && message.readBy.includes(conversation.otherParticipant._id) && (
                <span className="text-xs text-green-600 dark:text-green-400 ml-2" aria-label="Seen by recipient">Seen</span>
              )}
            </div>
          </div>
          
          {!isOwnMessage && (
            <div className="order-2 ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 lg:h-6 lg:w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20">
                    <MoreHorizontal className="h-4 w-4 lg:h-3 lg:w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 lg:w-36">
                  <DropdownMenuItem onClick={() => handleReplyStart(message)} className="cursor-pointer text-sm font-medium">
                    <Reply className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
                    Reply
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          
          {isOwnMessage && (
            <div className="order-1 mr-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 lg:h-6 lg:w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-none focus:bg-gray-100 dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20">
                    <MoreHorizontal className="h-4 w-4 lg:h-3 lg:w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 lg:w-40">
                  {message.messageType === 'text' && (
                    <DropdownMenuItem onClick={() => handleEditStart(message)} className="cursor-pointer text-sm font-medium">
                      <Edit className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleReplyStart(message)} className="cursor-pointer text-sm font-medium">
                    <Reply className="w-4 h-4 mr-3 text-green-600 dark:text-green-400" />
                    Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => deleteMessage(message._id)}
                    className="text-red-600 dark:text-red-400 cursor-pointer text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
          <p className="text-gray-500">Choose a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header - Hidden on mobile since we have custom mobile header */}
      <CardHeader className="border-b lg:block hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage 
                src={conversation.otherParticipant?.profileImageUrl} 
                alt={conversation.otherParticipant?.firstName || conversation.otherParticipant?.username}
              />
              <AvatarFallback>
                {conversation.otherParticipant?.firstName?.[0] || conversation.otherParticipant?.username?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">
                {conversation.otherParticipant?.firstName || conversation.otherParticipant?.username}
              </h3>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  conversation.otherParticipant?.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="text-sm text-gray-500">
                  {conversation.otherParticipant?.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-3 lg:p-4">
          <div ref={topOfMessagesRef} />
          
          {error && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}
          
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          
          {hasMoreMessages && !loading && (
            <div className="flex justify-center py-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadMoreMessages}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load more messages'}
              </Button>
            </div>
          )}
          
          {(Array.isArray(messages) ? messages : []).map((message, index) => {
            // Create a unique key combining _id and index to ensure uniqueness
            const uniqueKey = `${message._id}-${index}`;
            
            return (
              <div key={uniqueKey}>
                {renderMessage(message)}
              </div>
            );
          })}
          
          {typingUsers.length > 0 && (
            <div className="flex justify-start mb-2">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-3 py-2">
                <div className="text-sm text-gray-500">Typing...</div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </ScrollArea>
      </div>

      {/* Reply/Edit preview */}
      {(replyToMessage || editingMessage) && (
        <div className="border-t p-3 lg:p-2 bg-gray-50 dark:bg-gray-800 transition-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {editingMessage ? (
                <>
                  <Edit className="w-4 h-4 text-blue-500" />
                  <div className="text-sm text-blue-600 dark:text-blue-400 truncate">
                    Editing: {editingMessage.content.substring(0, 50)}...
                  </div>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4 text-gray-500" />
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    Replying to: {replyToMessage?.content.substring(0, 50)}...
                  </div>
                </>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={editingMessage ? handleEditCancel : handleReplyCancel}
              className="p-1 h-8 w-8 transition-none"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3 lg:p-4">
        {blockStatus.otherBlockedUser ? (
          <div className="flex items-center justify-center text-center text-red-600 gap-2 p-4">
            <Ban className="w-5 h-5" />
            <span className="font-semibold text-sm">You cannot send messages. This user has blocked you.</span>
          </div>
        ) : blockStatus.userBlockedOther ? (
          <div className="flex items-center justify-center text-center text-gray-500 gap-2 p-4">
            <Ban className="w-5 h-5" />
            <span className="font-semibold text-sm">You have blocked this user. Unblock to send messages.</span>
          </div>
        ) : (
          <>
            {/* Upload Progress Bar */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {uploadProgress === 100 ? 'Processing...' : 'Uploading...'}
                  </span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-3 lg:space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="p-2 lg:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-none"
                title="Send image or video (max 100MB)"
              >
                <div className="relative">
                  <ImageIcon className="w-5 h-5 lg:w-4 lg:h-4" />
                  <Video className="w-3 h-3 lg:w-2 lg:h-2 absolute -top-1 -right-1 text-blue-500" />
                </div>
              </Button>
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    handleTyping();
                  }}
                  placeholder={
                    editingMessage 
                      ? "Edit your message..." 
                      : replyToMessage 
                        ? "Write your reply..." 
                        : "Type a message..."
                  }
                  className="h-12 lg:h-9 text-base lg:text-sm transition-none"
                  onKeyPress={handleInputKeyPress}
                  disabled={sending}
                />
              </div>
              <Button 
                onClick={
                  editingMessage 
                    ? handleEditSave 
                    : replyToMessage 
                      ? handleReplySend 
                      : () => sendMessage()
                }
                disabled={!input.trim() || sending}
                className="p-2 lg:p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full transition-none"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 animate-spin" />
                ) : editingMessage ? (
                  <Check className="w-5 h-5 lg:w-4 lg:h-4" />
                ) : (
                  <Send className="w-5 h-5 lg:w-4 lg:h-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Hidden file input */}
              <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,video/mp4,video/avi,video/mov,video/wmv,video/flv,video/webm,video/mkv,video/m4v,video/3gp"
        />

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl flex flex-col items-center justify-center p-0">
          {previewImage && (
            <div className="relative">
              <img
                src={previewImage.url}
                alt={previewImage.alt}
                className="max-h-[80vh] w-auto rounded shadow-lg"
                aria-label="Full size image preview"
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white w-8 h-8 flex items-center justify-center rounded transition-colors"
                aria-label="Close image preview"
              >
                ×
              </button>
              {!previewImage.isOwnImage && (
                <button
                  onClick={() => downloadImage(previewImage.url, previewImage.alt)}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  aria-label="Download image"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 