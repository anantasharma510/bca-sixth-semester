"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from './socket-provider';
import { useMessageApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Plus, 
  MoreHorizontal,
  MessageCircle,
  Users,
  Filter,
  Loader2,
  X,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

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

interface ConversationListProps {
  selectedConversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
  onNewConversation: (user: User) => void;
  onConversationDeleted?: (conversationId: string) => void;
}

// Helper function (not a component, so no React.memo needed)
const getDisplayName = (conversation: Conversation): string => {
  if (conversation.otherParticipant) {
    return conversation.otherParticipant.firstName || conversation.otherParticipant.username;
  }
  return 'Unknown User';
};

// Memoized conversation item component
const ConversationItem = React.memo(({ 
  conversation, 
  isSelected, 
  onSelect,
  onDelete
}: { 
  conversation: Conversation; 
  isSelected: boolean; 
  onSelect: (conversation: Conversation) => void;
  onDelete: (conversationId: string) => void;
}) => {
  const displayName = useMemo(() => getDisplayName(conversation), [conversation]);
  const [isSwiped, setIsSwiped] = useState(false);
  
  const formatTime = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        const diffInMinutes = Math.max(0, Math.floor(diffInHours * 60));
        return `${diffInMinutes}m`;
      } else if (diffInHours < 24) {
        const hours = Math.max(0, Math.floor(diffInHours));
        return `${hours}h`;
      } else {
        const diffInDays = Math.max(0, Math.floor(diffInHours / 24));
        return `${diffInDays}d`;
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid date';
    }
  }, []);

  const getLastMessagePreview = useCallback((conversation: Conversation) => {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }
    
    // Check if it's a media message
    if (conversation.lastMessage.content === '' && conversation.lastMessage.messageType) {
      if (conversation.lastMessage.messageType === 'image') {
        return '📷 Image';
      } else if (conversation.lastMessage.messageType === 'video') {
        return '🎥 Video';
      }
    }
    
    const content = conversation.lastMessage.content;
    return content.length > 30 ? `${content.substring(0, 30)}...` : content;
  }, []);

  // Safe unread count display
  const unreadCount = useMemo(() => {
    const count = conversation.unreadCount;
    if (typeof count !== 'number' || isNaN(count) || count < 0) {
      return 0;
    }
    return count;
  }, [conversation.unreadCount]);

  // Mobile swipe handlers
  const handleSwipeStart = () => {
    setIsSwiped(true);
  };

  const handleSwipeEnd = () => {
    setIsSwiped(false);
  };

  return (
    <div className="relative">
      {/* Conversation content with swipe gesture */}
      <div
        className={`p-4 lg:p-3 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        } ${
          isSwiped ? 'translate-x-16' : 'translate-x-0'
        }`}
        onClick={() => onSelect(conversation)}
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
        onMouseDown={handleSwipeStart}
        onMouseUp={handleSwipeEnd}
        onMouseLeave={handleSwipeEnd}
      >
        <div className="flex items-center space-x-4 lg:space-x-3">
          <div className="relative flex-shrink-0">
            <Avatar className="w-12 h-12 lg:w-10 lg:h-10">
              <AvatarImage src={conversation.otherParticipant?.profileImageUrl} alt={displayName} />
              <AvatarFallback className="text-base lg:text-sm font-semibold">
                {displayName[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {conversation.otherParticipant?.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 lg:w-3 lg:h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-base lg:text-sm text-gray-900 dark:text-gray-100 truncate">
                {displayName}
              </h4>
              {conversation.lastMessage && conversation.lastMessage.timestamp && (
                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                  {formatTime(conversation.lastMessage.timestamp)}
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-sm lg:text-sm text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
                {getLastMessagePreview(conversation)}
              </p>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-2 py-1 flex-shrink-0 min-w-[20px] h-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Dropdown menu for conversation actions */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 lg:h-6 lg:w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105 active:scale-95 focus:bg-gray-100 dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4 lg:h-3 lg:w-3" />
                </Button>
              </DropdownMenuTrigger>
              {/* <DropdownMenuContent align="end" className="w-48 lg:w-44">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conversation._id);
                  }}
                  className="text-red-600 dark:text-red-400 cursor-pointer text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  Delete Conversation
                </DropdownMenuItem>
              </DropdownMenuContent> */}
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
});

ConversationItem.displayName = 'ConversationItem';

// Memoized user item component
const UserItem = React.memo(({ 
  user, 
  onStartConversation 
}: { 
  user: User; 
  onStartConversation: (user: User) => void;
}) => {
  const displayName = useMemo(() => user.firstName || user.username, [user.firstName, user.username]);

  return (
    <div
      className="p-4 lg:p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 active:scale-95"
      onClick={() => onStartConversation(user)}
    >
      <div className="flex items-center space-x-4 lg:space-x-3">
        <div className="relative flex-shrink-0">
          <Avatar className="w-12 h-12 lg:w-10 lg:h-10">
            <AvatarImage src={user.profileImageUrl} alt={displayName} />
            <AvatarFallback className="text-base lg:text-sm font-semibold">
              {displayName[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          {user.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 lg:w-3 lg:h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-base lg:text-sm text-gray-900 dark:text-gray-100">
            {displayName}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            @{user.username}
          </p>
        </div>
      </div>
    </div>
  );
});

UserItem.displayName = 'UserItem';

export function ConversationList({ 
  selectedConversation, 
  onConversationSelect, 
  onNewConversation,
  onConversationDeleted
}: ConversationListProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { socket, joinConversations } = useSocket();
  const { getConversations, getFollowingUsers, createConversation } = useMessageApi();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [swipedConversationId, setSwipedConversationId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to avoid dependency issues
  const allConversationsRef = useRef<Conversation[]>([]);
  const searchConversationsRef = useRef<((userId: string, query: string, page?: number, limit?: number) => Promise<any>) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when values change
  useEffect(() => {
    allConversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    searchConversationsRef.current = getConversations;
  }, [getConversations]);

  // Optimized debounced search with cleanup
  const debouncedSearch = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      if (!userId) return;
      
      if (!query.trim()) {
        setFilteredConversations(allConversationsRef.current);
        setShowSearch(false);
        return;
      }
      
      setShowSearch(true);
      setLoading(true);
      
      try {
        if (!searchConversationsRef.current) {
          throw new Error('Search function not available');
        }
        const response = await searchConversationsRef.current(userId, query);
        setFilteredConversations(response.conversations || []);
      } catch (error) {
        console.error('Failed to search conversations:', error);
        // Fallback to client-side search
        const filtered = allConversationsRef.current.filter(conv => {
          const displayName = getDisplayName(conv).toLowerCase();
          return displayName.includes(query.toLowerCase());
        });
        setFilteredConversations(filtered);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [userId]);

  // Optimized search effect
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(allConversationsRef.current);
      setShowSearch(false);
      return;
    }
    
    debouncedSearch(searchQuery);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery, debouncedSearch]);

  // Optimized conversation updates
  const updateConversationInList = useCallback((conversationId: string, updater: (conv: Conversation) => Conversation) => {
    setConversations(prev => prev.map(conv => 
      conv._id === conversationId ? updater(conv) : conv
    ));
    setFilteredConversations(prev => prev.map(conv => 
      conv._id === conversationId ? updater(conv) : conv
    ));
  }, []);

  // Optimized socket event handlers
  const handleUserStatusChange = useCallback(({ userId: statusUserId, isOnline, lastSeen }: { userId: string; isOnline: boolean; lastSeen: string }) => {
    setConversations(prev => 
      prev.map(conv => {
        if (conv.otherParticipant?._id === statusUserId) {
          return {
            ...conv,
            otherParticipant: {
              ...conv.otherParticipant,
              isOnline,
              lastSeen
            }
          };
        }
        return conv;
      })
    );

    setFilteredConversations(prev => 
      prev.map(conv => {
        if (conv.otherParticipant?._id === statusUserId) {
          return {
            ...conv,
            otherParticipant: {
              ...conv.otherParticipant,
              isOnline,
              lastSeen
            }
          };
        }
        return conv;
      })
    );

    setFollowingUsers(prev => 
      prev.map(user => {
        if (user._id === statusUserId) {
          return { ...user, isOnline, lastSeen };
        }
        return user;
      })
    );
  }, []);

  const handleNewMessage = useCallback((message: any) => {
    if (!message || !message.conversationId) return;
    
    if (message.senderId !== userId && message.conversationId) {
      updateConversationInList(message.conversationId, conv => {
        const currentUnread = typeof conv.unreadCount === 'number' && !isNaN(conv.unreadCount) ? conv.unreadCount : 0;
        return {
          ...conv,
          lastMessage: message,
          unreadCount: Math.max(0, currentUnread + 1)
        };
      });
    } else if (message.senderId === userId && message.conversationId) {
      updateConversationInList(message.conversationId, conv => ({
        ...conv,
        lastMessage: message
      }));
    }
  }, [userId, updateConversationInList]);

  const handleConversationRead = useCallback(({ conversationId, userId: readUserId }: { conversationId: string; userId: string }) => {
    if (readUserId === userId && conversationId) {
      updateConversationInList(conversationId, conv => ({
        ...conv,
        unreadCount: 0
      }));
    }
  }, [userId, updateConversationInList]);

  // Socket event listeners with cleanup
  useEffect(() => {
    if (!socket) return;

    socket.on('userStatusChange', handleUserStatusChange);
    socket.on('newMessage', handleNewMessage);
    socket.on('conversationRead', handleConversationRead);

    return () => {
      socket.off('userStatusChange', handleUserStatusChange);
      socket.off('newMessage', handleNewMessage);
      socket.off('conversationRead', handleConversationRead);
    };
  }, [socket, handleUserStatusChange, handleNewMessage, handleConversationRead]);

  // Listen for newConversation event from socket
  useEffect(() => {
    if (!socket || !userId) return;
    
    const handleNewConversation = (conversation: Conversation) => {
      // Only add if the conversation is not already in the list
      setConversations(prev => {
        if (prev.some((conv: Conversation) => conv._id === conversation._id)) return prev;
        return [conversation, ...prev];
      });
      setFilteredConversations(prev => {
        if (prev.some((conv: Conversation) => conv._id === conversation._id)) return prev;
        return [conversation, ...prev];
      });
    };
    socket.on('newConversation', handleNewConversation);
    return () => {
      socket.off('newConversation', handleNewConversation);
    };
  }, [socket, userId]);

  // Load conversations
  const loadConversations = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await getConversations(userId);
      const conversations = response.conversations || [];
      
      setConversations(conversations);
      setFilteredConversations(conversations);
      
      // Join all conversation rooms for real-time updates
      if (conversations.length > 0) {
        const conversationIds = conversations.map((conv: Conversation) => conv._id);
        joinConversations(conversationIds);
      }
      
      setError(null);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  // Load following users
  const loadFollowingUsers = async () => {
    if (!userId) return;
    
    try {
      const response = await getFollowingUsers(userId);
      setFollowingUsers(response.users || []);
    } catch (error) {
      console.error('Failed to load following users:', error);
    }
  };

  // Start new conversation
  const startNewConversation = async (user: User) => {
    if (!userId) return;
    
    try {
      const response = await createConversation(userId, user._id);
      const newConversation = response.conversation;
      
      setConversations(prev => [newConversation, ...prev]);
      setFilteredConversations(prev => [newConversation, ...prev]);
      
      // Join the conversation room for real-time updates
      joinConversations([newConversation._id]);
      
      onConversationSelect(newConversation);
      setShowNewConversation(false);
      
      toast({
        title: "Success",
        description: `Started conversation with ${user.firstName || user.username}`,
      });
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
    }
  };

  // Load data on mount - only run once
  useEffect(() => {
    if (!userId) return;
    
    loadConversations();
    loadFollowingUsers();
  }, [userId]); // Only depend on userId

  // Memoized handlers
  const handleConversationSelect = useCallback((conversation: Conversation) => {
    onConversationSelect(conversation);
  }, [onConversationSelect]);

  const handleDeleteConversation = useCallback((conversationId: string) => {
    // Delete functionality not implemented yet
    // Removed debug log - not needed for production
  }, []);

  const confirmDelete = async (conversationId: string) => {
    setShowDeleteConfirm(null);
    toast({
      title: "Not Available",
      description: "Delete conversation functionality is not available yet",
      variant: "destructive",
    });
  };

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Mobile swipe gesture handlers
  const handleSwipeStart = (conversationId: string) => {
    setSwipedConversationId(conversationId);
  };

  const handleSwipeEnd = () => {
    setSwipedConversationId(null);
  };

  // Mobile-optimized conversation actions
  const handleConversationAction = (action: 'delete', conversation: Conversation) => {
    switch (action) {
      case 'delete':
        setShowDeleteConfirm(conversation._id);
        break;
    }
    setSwipedConversationId(null);
  };

  const renderConversation = (conversation: Conversation) => {
    return (
      <ConversationItem
        key={conversation._id}
        conversation={conversation}
        isSelected={selectedConversation?._id === conversation._id}
        onSelect={handleConversationSelect}
        onDelete={handleDeleteConversation}
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 lg:p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4 lg:mb-3">
          <h2 className="text-xl lg:text-lg font-semibold text-gray-900 dark:text-white">
            Messages
          </h2>
          <div className="flex items-center space-x-2">
            {/* Mobile search toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className="lg:hidden h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle search"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewConversation(true)}
              className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="New conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search bar - always visible on desktop, toggleable on mobile */}
        <div className={`${showSearch ? 'block' : 'hidden'} lg:block`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 h-10 lg:h-9 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal - Not implemented yet */}
      {/* {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Conversation
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => confirmDelete(showDeleteConfirm)}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )} */}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-2">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setShowNewConversation(true)}
                      className="mt-4"
                    >
                      Start a conversation
                    </Button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  renderConversation(conversation)
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                New Conversation
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewConversation(false)}
                className="h-8 w-8 p-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {followingUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No users to start a conversation with
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {followingUsers.map((user) => (
                    <UserItem
                      key={user._id}
                      user={user}
                      onStartConversation={(user) => {
                        startNewConversation(user);
                        setShowNewConversation(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 