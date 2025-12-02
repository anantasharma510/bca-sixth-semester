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

export interface AuthState {
  isSignedIn: boolean;
  isLoaded: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface SuspensionCheckResponse {
  suspended: boolean;
  message?: string;
} 