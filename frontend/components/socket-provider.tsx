"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io as socketIO, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  reconnect: () => void;
  joinPost: (postId: string) => void;
  leavePost: (postId: string) => void;
  joinConversations: (conversationIds: string[]) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const connectionAttemptedRef = useRef(false);
  // Removed token ref - Better Auth uses cookies

  const createSocketConnection = useCallback(async () => {
    if (!userId || isConnecting) return;
    
    setIsConnecting(true);
    
    try {
      // Better Auth uses cookies, not tokens
      // Cookies are automatically sent with the socket connection
      const newSocket = socketIO(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
        withCredentials: true, // Include cookies
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
      });
      
      // Connection event handlers
      newSocket.on('connect', () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
      });
      
      newSocket.on('connect_error', async (error) => {
        setIsConnected(false);
        setIsConnecting(false);
        
        if (error.message.includes('Authentication failed') || error.message.includes('Invalid session')) {
          // Better Auth uses cookies - if auth fails, user needs to sign in again
          console.error('❌ Socket authentication failed:', error.message);
          
          toast({
            title: "Authentication Error",
            description: "Please refresh the page to reconnect",
            variant: "destructive"
          });
        } else {
          // Removed connection error toast - too technical for normal users
        }
      });
      
      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          newSocket.connect();
        } else if (reason === 'io client disconnect') {
          // Client disconnected intentionally
        } else {
          // Network error or other issues
        }
      });
      
      newSocket.on('reconnect', async (attemptNumber) => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
      });
      
      newSocket.on('reconnect_attempt', (attemptNumber) => {
        reconnectAttemptsRef.current = attemptNumber;
        setIsConnecting(true);
        
        if (attemptNumber >= maxReconnectAttempts) {
          // Removed reconnection attempt toast - too technical for normal users
        }
      });
      
      newSocket.on('reconnect_error', (error) => {
        setIsConnecting(false);
      });
      
      newSocket.on('reconnect_failed', () => {
        setIsConnected(false);
        setIsConnecting(false);
        
        // Removed reconnection failed toast - too technical for normal users
      });
      
      // Message delivery events
      newSocket.on('messageDelivered', (data) => {
        // Removed debug log - not needed for production
      });
      
      newSocket.on('messageRead', (data) => {
        // Removed debug log - not needed for production
      });

      // Post-related events for real-time feed updates
      newSocket.on('newPost', (post) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for post feed to listen to
        window.dispatchEvent(new CustomEvent('newPost', { detail: post }));
      });

      newSocket.on('postDeleted', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for post feed to listen to
        window.dispatchEvent(new CustomEvent('postDeleted', { detail: data }));
      });

      newSocket.on('postUpdated', (post) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for post feed to listen to
        window.dispatchEvent(new CustomEvent('postUpdated', { detail: post }));
      });

      newSocket.on('newRepost', (repost) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for post feed to listen to
        window.dispatchEvent(new CustomEvent('newRepost', { detail: repost }));
      });

      newSocket.on('repostDeleted', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for post feed to listen to
        window.dispatchEvent(new CustomEvent('repostDeleted', { detail: data }));
      });

      // Block-related events for real-time updates
      newSocket.on('userBlockedYou', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('userBlockedYou', { detail: data }));
      });

      newSocket.on('userUnblockedYou', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('userUnblockedYou', { detail: data }));
        
        // Removed unblock toast - not critical for normal users
      });

      newSocket.on('blockConfirmed', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('blockConfirmed', { detail: data }));
      });

      newSocket.on('unblockConfirmed', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('unblockConfirmed', { detail: data }));
      });

      // Comment-related events for real-time updates
      newSocket.on('newComment', (comment) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for comment sections to listen to
        window.dispatchEvent(new CustomEvent('newComment', { detail: comment }));
      });

      newSocket.on('newConversation', (conversation: any) => {
        // Dispatch custom event for conversation list to listen to
        window.dispatchEvent(new CustomEvent('newConversation', { detail: conversation }));
      });

      newSocket.on('newReply', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for comment sections to listen to
        window.dispatchEvent(new CustomEvent('newReply', { detail: data }));
      });

      newSocket.on('commentLiked', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for comment sections to listen to
        window.dispatchEvent(new CustomEvent('commentLiked', { detail: data }));
      });

      newSocket.on('commentDeleted', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for comment sections to listen to
        window.dispatchEvent(new CustomEvent('commentDeleted', { detail: data }));
      });

      newSocket.on('commentUpdated', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for comment sections to listen to
        window.dispatchEvent(new CustomEvent('commentUpdated', { detail: data }));
      });

      // Post like events for real-time updates
      newSocket.on('postLiked', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for post components to listen to
        window.dispatchEvent(new CustomEvent('postLiked', { detail: data }));
      });

      // Repost count events for real-time updates
      newSocket.on('repostCountUpdated', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for post components to listen to
        window.dispatchEvent(new CustomEvent('repostCountUpdated', { detail: data }));
      });

      // Comment count events for real-time updates
      newSocket.on('commentCountUpdated', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for post components to listen to
        window.dispatchEvent(new CustomEvent('commentCountUpdated', { detail: data }));
      });

      // Maintenance events for real-time updates
      newSocket.on('maintenance:update', (data) => {
        // Removed debug log - not needed for production
        // Dispatch custom event for maintenance check component to listen to
        window.dispatchEvent(new CustomEvent('maintenance:update', { detail: data }));
      });
      
      // Post like count events for real-time updates
      newSocket.on('postLikeCountUpdated', (data) => {
        window.dispatchEvent(new CustomEvent('postLikeCountUpdated', { detail: data }));
      });
      
      // Error handling
      newSocket.on('error', (error) => {
        console.error('❌ Socket.IO error:', error);
        toast({
          title: "Connection Error",
          description: "An error occurred with the messaging service",
          variant: "destructive"
        });
      });
      
      // Connection health monitoring
      newSocket.on('ping', () => {
        // Removed debug log - not needed for production
        newSocket.emit('pong');
      });
      
      setSocket(newSocket);
      
    } catch (error) {
      console.error('❌ Failed to create socket connection:', error);
      setIsConnecting(false);
      connectionAttemptedRef.current = false;
      toast({
        title: "Connection Error",
        description: "Failed to establish connection",
        variant: "destructive"
      });
    }
  }, [userId]);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    reconnectAttemptsRef.current = 0;
    // Reset connection state
    createSocketConnection();
  }, [socket, createSocketConnection]);

  const joinPost = useCallback((postId: string) => {
    if (socket && isConnected) {
      socket.emit('joinPost', postId);
    }
  }, [socket, isConnected]);

  const leavePost = useCallback((postId: string) => {
    if (socket && isConnected) {
      socket.emit('leavePost', postId);
    }
  }, [socket, isConnected]);

  const joinConversations = useCallback((conversationIds: string[]) => {
    if (socket && isConnected) {
      socket.emit('joinConversations', conversationIds);
    }
  }, [socket, isConnected]);

  // Create connection when user is available
  useEffect(() => {
    if (userId && !socket && !isConnecting) {
      createSocketConnection();
    } else if (!userId && socket) {
      // Clean up socket when user logs out
      // Removed debug log - not needed for production
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
      // Reset connection state
    }
  }, [userId, socket, isConnecting, createSocketConnection]);

  // Better Auth uses cookies which are automatically managed
  // No need for token refresh intervals

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        // Removed debug log - not needed for production
        socket.disconnect();
      }
    };
  }, [socket]);

  useEffect(() => {
    if (socket && userId) {
      socket.emit('joinUserRoom', userId);
    }
  }, [socket, userId]);

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    isConnecting,
    reconnect,
    joinPost,
    leavePost,
    joinConversations,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};