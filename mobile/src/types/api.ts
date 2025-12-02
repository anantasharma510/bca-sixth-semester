// Base API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

// Pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Paginated Response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

// User Types
export interface User {
  _id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  website?: string;
  location?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  isPrivate: boolean;
  isOnline: boolean;
  lastSeen: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Post Types
export interface Media {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

export interface Post {
  _id: string;
  author: User;
  content: string;
  media?: Media[];
  hashtags?: string[];
  mentions?: string[];
  likeCount: number;
  commentCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isRepost: boolean;
  repostUser?: User;
  originalPost?: Post;
  isReplyTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Comment Types
export interface Comment {
  _id: string;
  post: string;
  author: User;
  content: string;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  isReplyTo?: string;
  replies?: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

// Follow Types
export interface Follow {
  _id: string;
  followerId: User;
  followingId: User;
  createdAt: Date;
}

// Block Types
export interface Block {
  _id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

// Message Types
export interface Message {
  _id: string;
  conversationId: string;
  senderId: string | User;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'video';
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
    size?: number;
    duration?: number; // For video/audio
    thumbnail?: string; // For video/image previews
  }>;
  replyTo?: string | Message;
  reactions?: Array<{
    userId: string;
    reaction: string;
  }>;
  isRead: boolean;
  isDelivered: boolean;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

// Conversation Types
export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  groupImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Types
export interface Notification {
  _id: string;
  recipientId: string;
  senderId: User;
  type: 'follow' | 'like' | 'comment' | 'repost' | 'mention' | 'message';
  postId?: string;
  commentId?: string;
  messageId?: string;
  isRead: boolean;
  createdAt: Date;
}

// API Error Types
export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

// Auth Types
export interface AuthResponse {
  user: User;
  token: string;
}

export interface SuspensionCheckResponse {
  suspended: boolean;
  message?: string;
}

// Search Types
export interface SearchResult {
  users: User[];
  posts: Post[];
  hashtags: Array<{
    tag: string;
    postCount: number;
  }>;
}

// Analytics Types
export interface Analytics {
  userCount: number;
  postCount: number;
  commentCount: number;
  trendingHashtags: Array<{
    topic: string;
    postCount: number;
  }>;
  recentSignups: User[];
} 