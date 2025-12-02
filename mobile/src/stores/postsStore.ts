import { create } from 'zustand';

interface Post {
  _id: string;
  content?: string;
  media?: Array<{ type: 'image' | 'video'; url: string; thumbnailUrl?: string }>;
  author?: {
    _id: string;
    username?: string;
    displayName?: string;
    profileImageUrl?: string;
    coverImageUrl?: string;
  };
  isRepost?: boolean;
  originalPost?: Post;
  repostUser?: {
    _id: string;
    username?: string;
    displayName?: string;
    profileImageUrl?: string;
  };
  repostComment?: string;
  repostCreatedAt?: string;
  likeCount?: number;
  repostCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PostsStore {
  // Optimistic updates tracking
  optimisticLikes: Map<string, { count: number; isLiked: boolean }>;
  optimisticReposts: Map<string, { count: number; isReposted: boolean }>;
  optimisticComments: Map<string, number>;
  
  // Actions
  setOptimisticLike: (postId: string, isLiked: boolean, currentCount: number) => void;
  clearOptimisticLike: (postId: string) => void;
  setOptimisticRepost: (postId: string, isReposted: boolean, currentCount: number) => void;
  clearOptimisticRepost: (postId: string) => void;
  setOptimisticComment: (postId: string, count: number) => void;
  clearOptimisticComment: (postId: string) => void;
  clearAllOptimistic: () => void;
  
  // Get optimistic values
  getOptimisticLike: (postId: string) => { count: number; isLiked: boolean } | null;
  getOptimisticRepost: (postId: string) => { count: number; isReposted: boolean } | null;
  getOptimisticComment: (postId: string) => number | null;
}

export const usePostsStore = create<PostsStore>()(
    (set, get) => ({
      optimisticLikes: new Map(),
      optimisticReposts: new Map(),
      optimisticComments: new Map(),
      
      setOptimisticLike: (postId, isLiked, currentCount) => {
        const newCount = isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
        set((state) => {
          const newMap = new Map(state.optimisticLikes);
          newMap.set(postId, { count: newCount, isLiked });
          return { optimisticLikes: newMap };
        });
      },
      
      clearOptimisticLike: (postId) => {
        set((state) => {
          const newMap = new Map(state.optimisticLikes);
          newMap.delete(postId);
          return { optimisticLikes: newMap };
        });
      },
      
      setOptimisticRepost: (postId, isReposted, currentCount) => {
        const newCount = isReposted ? currentCount + 1 : Math.max(0, currentCount - 1);
        set((state) => {
          const newMap = new Map(state.optimisticReposts);
          newMap.set(postId, { count: newCount, isReposted });
          return { optimisticReposts: newMap };
        });
      },
      
      clearOptimisticRepost: (postId) => {
        set((state) => {
          const newMap = new Map(state.optimisticReposts);
          newMap.delete(postId);
          return { optimisticReposts: newMap };
        });
      },
      
      setOptimisticComment: (postId, count) => {
        set((state) => {
          const newMap = new Map(state.optimisticComments);
          newMap.set(postId, count);
          return { optimisticComments: newMap };
        });
      },
      
      clearOptimisticComment: (postId) => {
        set((state) => {
          const newMap = new Map(state.optimisticComments);
          newMap.delete(postId);
          return { optimisticComments: newMap };
        });
      },
      
      clearAllOptimistic: () => {
        set({
          optimisticLikes: new Map(),
          optimisticReposts: new Map(),
          optimisticComments: new Map(),
        });
      },
      
      getOptimisticLike: (postId) => {
        return get().optimisticLikes.get(postId) || null;
      },
      
      getOptimisticRepost: (postId) => {
        return get().optimisticReposts.get(postId) || null;
      },
      
      getOptimisticComment: (postId) => {
        return get().optimisticComments.get(postId) ?? null;
      },
    })
);

