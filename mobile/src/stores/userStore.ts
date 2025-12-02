import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserImageCache {
  [userId: string]: {
    profileImageUrl: string;
    coverImageUrl: string;
    lastUpdated: number;
  };
}

interface UserStore {
  // Current user's images (for immediate updates)
  currentUserImages: {
    profileImageUrl: string | null;
    coverImageUrl: string | null;
    lastUpdated: number;
  };
  
  // Cache for other users' images
  userImageCache: UserImageCache;
  
  // Actions
  updateCurrentUserImage: (type: 'profile' | 'cover', url: string) => void;
  updateUserImage: (userId: string, type: 'profile' | 'cover', url: string) => void;
  getUserImage: (userId: string, type: 'profile' | 'cover', fallbackUrl?: string | null) => string | null;
  clearCache: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      currentUserImages: {
        profileImageUrl: null,
        coverImageUrl: null,
        lastUpdated: 0,
      },
      userImageCache: {},
      
      updateCurrentUserImage: (type, url) => {
        // Validate URL before updating
        if (!url || typeof url !== 'string' || url.trim() === '') {
          console.warn(`⚠️ Cannot update ${type} image: Invalid URL provided:`, url);
          return;
        }
        
        const cleanUrl = url.trim();
        const timestamp = Date.now();
        set((state) => ({
          currentUserImages: {
            ...state.currentUserImages,
            [type === 'profile' ? 'profileImageUrl' : 'coverImageUrl']: cleanUrl,
            lastUpdated: timestamp,
          },
        }));
        console.log(`✅ Updated current user ${type} image immediately:`, cleanUrl.substring(0, 100) + '...');
      },
      
      updateUserImage: (userId, type, url) => {
        // Validate inputs
        if (!userId || typeof userId !== 'string') {
          console.warn(`⚠️ Cannot update user image: Invalid userId:`, userId);
          return;
        }
        if (!url || typeof url !== 'string' || url.trim() === '') {
          console.warn(`⚠️ Cannot update user ${userId} ${type} image: Invalid URL provided:`, url);
          return;
        }
        
        const cleanUrl = url.trim();
        const cleanUserId = String(userId).trim();
        const timestamp = Date.now();
        set((state) => ({
          userImageCache: {
            ...state.userImageCache,
            [cleanUserId]: {
              ...(state.userImageCache[cleanUserId] || {}),
              [type === 'profile' ? 'profileImageUrl' : 'coverImageUrl']: cleanUrl,
              lastUpdated: timestamp,
            },
          },
        }));
        console.log(`✅ Updated user ${cleanUserId} ${type} image:`, cleanUrl.substring(0, 100) + '...');
      },
      
      getUserImage: (userId, type, fallbackUrl) => {
        const state = get();
        
        // If it's current user (userId === 'current'), use currentUserImages
        if (userId === 'current') {
          const imageUrl = type === 'profile' 
            ? state.currentUserImages.profileImageUrl 
            : state.currentUserImages.coverImageUrl;
          // Always fallback to provided fallbackUrl if store is empty
          return imageUrl || fallbackUrl || null;
        }
        
        // For other users, check cache first
        if (userId && state.userImageCache[userId]) {
          const cached = state.userImageCache[userId];
          const imageUrl = type === 'profile' 
            ? cached.profileImageUrl 
            : cached.coverImageUrl;
          if (imageUrl) return imageUrl;
        }
        
        // Always return fallback if available, even if cache is empty
        return fallbackUrl || null;
      },
      
      clearCache: () => {
        set({
          currentUserImages: {
            profileImageUrl: null,
            coverImageUrl: null,
            lastUpdated: 0,
          },
          userImageCache: {},
        });
      },
    }),
    {
      name: 'user-image-cache',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist cache, not current user images (they come from auth)
      partialize: (state) => ({
        userImageCache: state.userImageCache,
      }),
    }
  )
);

