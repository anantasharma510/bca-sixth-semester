"use client";
import React, { useState, useEffect } from "react";
import { SocketProvider, useSocket } from "@/components/socket-provider";
import { ConversationList } from "@/components/conversation-list";
import { MessageChat } from "@/components/message-chat";
import { Sidebar } from "@/components/sidebar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { useMessageApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Conversation {
  _id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: string;
    messageType?: string;
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

function MessagesPageInner() {
  const { user } = useAuth();
  const userId = user?._id ?? user?.id ?? user?.userId;
  const { socket } = useSocket();
  const messageApi = useMessageApi();
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileChatView, setIsMobileChatView] = useState(false);

  // Load unread count on mount
  useEffect(() => {
    if (!userId) return;
    
    loadUnreadCount();
  }, [userId]);

  const loadUnreadCount = async () => {
    try {
      const response = await messageApi.getUnreadCount(userId!);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    
    // On mobile, switch to chat view when conversation is selected
    if (window.innerWidth < 1024) { // lg breakpoint
      setIsMobileChatView(true);
    }
    
    // Mark conversation as read when selected
    if (conversation.unreadCount > 0) {
      messageApi.markConversationAsRead(conversation._id);
      // Update local state
      setSelectedConversation(prev => prev ? { ...prev, unreadCount: 0 } : null);
    }
  };

  const handleNewConversation = (user: User) => {
    // This will be handled by the ConversationList component
    // The conversation will be created and selected automatically
  };

  const handleBackToConversations = () => {
    setIsMobileChatView(false);
  };

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: any) => {
      // Update unread count if message is not from current user
      if (message.senderId !== userId) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleConversationRead = ({ conversationId, userId: readUserId }: { conversationId: string; userId: string }) => {
      if (readUserId === userId && selectedConversation?._id === conversationId) {
        setSelectedConversation(prev => prev ? { ...prev, unreadCount: 0 } : null);
      }
    };

    const handleMessageRead = ({ messageId, userId: readUserId }: { messageId: string; userId: string }) => {
      if (readUserId === userId) {
        // Decrement unread count when message is read
        setUnreadCount(prev => Math.max(0, prev - 1));
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
  }, [socket, userId, selectedConversation]);

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Sign in to use messages</h3>
          <p className="text-gray-500">Please sign in to access your conversations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - visible on lg and above */}
      <Sidebar />
      
      {/* Main content area - starts after sidebar on PC */}
      <div className="flex-1 lg:ml-64 flex flex-col">
        {/* Mobile: Show either conversation list or chat */}
        <div className="lg:hidden flex h-full">
          {!isMobileChatView ? (
            // Mobile: Conversation List View
            <div className="w-full">
              <ConversationList
                selectedConversation={selectedConversation}
                onConversationSelect={handleConversationSelect}
                onNewConversation={handleNewConversation}
              />
            </div>
          ) : (
            // Mobile: Chat View with back button
            <div className="w-full flex flex-col">
              {/* Mobile Chat Header with Back Button */}
              {selectedConversation && (
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToConversations}
                      className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                          {selectedConversation.otherParticipant?.profileImageUrl ? (
                            <img 
                              src={selectedConversation.otherParticipant.profileImageUrl} 
                              alt={selectedConversation.otherParticipant.firstName || selectedConversation.otherParticipant.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-base font-semibold text-gray-600 dark:text-gray-300">
                              {selectedConversation.otherParticipant?.firstName?.[0] || 
                               selectedConversation.otherParticipant?.username?.[0] || '?'}
                            </span>
                          )}
                        </div>
                        {selectedConversation.otherParticipant?.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate">
                          {selectedConversation.otherParticipant?.firstName || 
                           selectedConversation.otherParticipant?.username}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            selectedConversation.otherParticipant?.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <span className="text-sm text-gray-500 truncate">
                            {selectedConversation.otherParticipant?.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Mobile Chat Content */}
              <div className="flex-1 pb-16">
                <MessageChat
                  conversation={selectedConversation}
                  onConversationSelect={handleConversationSelect}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Desktop: Show both conversation list and chat side by side */}
        <div className="hidden lg:flex h-full">
          <ConversationList
            selectedConversation={selectedConversation}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
          />
          
          <div className="flex-1 flex flex-col">
            <MessageChat
              conversation={selectedConversation}
              onConversationSelect={handleConversationSelect}
            />
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation - visible on mobile */}
      <MobileNavigation />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <SocketProvider>
      <MessagesPageInner />
    </SocketProvider>
  );
}