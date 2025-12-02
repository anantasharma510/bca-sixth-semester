"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from './socket-provider';
import { useMessageApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MessageNotificationProps {
  className?: string;
}

export function MessageNotification({ className }: MessageNotificationProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { socket } = useSocket();
  const messageApi = useMessageApi();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial unread count
  useEffect(() => {
    if (!userId) return;
    
    loadUnreadCount();
  }, [userId]);

  // Listen for new messages to update count
  useEffect(() => {
    if (!socket) return;

    // Helper to always fetch the latest unread count from backend
    const refreshUnreadCount = () => {
      if (userId) {
        messageApi.getUnreadCount(userId).then(response => {
          setUnreadCount(response.unreadCount || 0);
        }).catch(error => {
          console.error('Failed to refresh unread count:', error);
        });
      }
    };

    const handleNewMessage = (message: any) => {
      // Only show toast if message is not from current user
      if (message.senderId !== userId) {
        refreshUnreadCount();
        // Show notification toast for new messages (only if not on messages page)
        if (!window.location.pathname.includes('/messages')) {
          toast({
            title: "New Message",
            description: `You have a new message from ${message.senderId_details?.firstName || 'someone'}`,
          });
        }
      }
    };

    const handleConversationRead = ({ conversationId, userId: readUserId }: { conversationId: string; userId: string }) => {
      if (readUserId === userId) {
        refreshUnreadCount();
      }
    };

    const handleMessageRead = ({ messageId, userId: readUserId }: { messageId: string; userId: string }) => {
      if (readUserId === userId) {
        refreshUnreadCount();
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('conversationRead', handleConversationRead);
    socket.on('messageRead', handleMessageRead);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('conversationRead', handleConversationRead);
      socket.off('messageRead', handleMessageRead);
    };
  }, [socket, userId, messageApi]);

  const loadUnreadCount = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const response = await messageApi.getUnreadCount(userId);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => {
          // Navigate to messages page
          window.location.href = '/messages';
        }}
      >
        <MessageCircle className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
} 