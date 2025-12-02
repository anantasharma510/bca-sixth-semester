import { useInfiniteQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { postsAPI } from '../services/api/posts';
import { useAuth } from './auth/useAuth';
import { resolveApiBaseUrl } from '../config/env';
import { usePostsStore } from '../stores/postsStore';

const API_BASE_URL = resolveApiBaseUrl();

/**
 * Helper functions to update TanStack Query cache from Socket.IO events
 * These ensure Socket.IO updates are reflected in the query cache
 */
export const updateCacheFromSocket = {
  /**
   * Add a new post to the cache (from Socket.IO newPost event)
   */
  addNewPost: (queryClient: QueryClient, isSignedIn: boolean, newPost: any) => {
    if (!queryClient || !newPost || !newPost._id) {
      console.warn('Invalid parameters for addNewPost');
      return;
    }
    
    try {
      queryClient.setQueryData(postsKeys.feed(isSignedIn), (old: any) => {
        if (!old || !old.pages || old.pages.length === 0) {
          return {
            pages: [{ posts: [newPost], pagination: { hasNextPage: true } }],
            pageParams: [1],
          };
        }
        
        // Check if post already exists
        const allPosts = old.pages.flatMap((page: any) => page.posts || []);
        if (allPosts.some((post: any) => post && post._id === newPost._id)) {
          return old; // Post already exists
        }
        
        // Add to first page
        const firstPage = old.pages[0];
        return {
          ...old,
          pages: [
            { ...firstPage, posts: [newPost, ...(firstPage.posts || [])] },
            ...old.pages.slice(1),
          ],
        };
      });
    } catch (error) {
      console.error('Error adding new post to cache:', error);
    }
  },

  /**
   * Remove a post from cache (from Socket.IO postDeleted/repostDeleted event)
   */
  removePost: (queryClient: QueryClient, isSignedIn: boolean, postId: string) => {
    if (!queryClient || !postId) {
      console.warn('Invalid parameters for removePost');
      return;
    }
    
    try {
      queryClient.setQueryData(postsKeys.feed(isSignedIn), (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || []).filter((post: any) => post && post._id !== postId),
          })),
        };
      });
    } catch (error) {
      console.error('Error removing post from cache:', error);
    }
  },

  /**
   * Update a post in cache (from Socket.IO postUpdated event)
   */
  updatePost: (queryClient: QueryClient, isSignedIn: boolean, updatedPost: any) => {
    if (!queryClient || !updatedPost || !updatedPost._id) {
      console.warn('Invalid parameters for updatePost');
      return;
    }
    
    try {
      queryClient.setQueryData(postsKeys.feed(isSignedIn), (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || []).map((post: any) =>
              post && post._id === updatedPost._id ? updatedPost : post
            ),
          })),
        };
      });
    } catch (error) {
      console.error('Error updating post in cache:', error);
    }
  },

  /**
   * Update like count (from Socket.IO postLikeCountUpdated event)
   * Socket.IO is source of truth - this overwrites optimistic updates
   */
  updateLikeCount: (queryClient: QueryClient, isSignedIn: boolean, postId: string, likeCount: number) => {
    if (!queryClient || !postId || typeof likeCount !== 'number' || likeCount < 0) {
      console.warn('Invalid parameters for updateLikeCount');
      return;
    }
    
    try {
      queryClient.setQueryData(postsKeys.feed(isSignedIn), (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || []).map((post: any) => {
              if (!post) return post;
              if (post._id === postId) {
                return { ...post, likeCount };
              }
              if (post.isRepost && post.originalPost && post.originalPost._id === postId) {
                return {
                  ...post,
                  originalPost: { ...post.originalPost, likeCount },
                };
              }
              return post;
            }),
          })),
        };
      });
    } catch (error) {
      console.error('Error updating like count in cache:', error);
    }
  },

  /**
   * Update repost count (from Socket.IO repostCountUpdated event)
   */
  updateRepostCount: (queryClient: QueryClient, isSignedIn: boolean, postId: string, repostCount: number) => {
    if (!queryClient || !postId || typeof repostCount !== 'number' || repostCount < 0) {
      console.warn('Invalid parameters for updateRepostCount');
      return;
    }
    
    try {
      queryClient.setQueryData(postsKeys.feed(isSignedIn), (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || []).map((post: any) => {
              if (!post) return post;
              if (post._id === postId) {
                return { ...post, repostCount };
              }
              if (post.isRepost && post.originalPost && post.originalPost._id === postId) {
                return {
                  ...post,
                  originalPost: { ...post.originalPost, repostCount },
                };
              }
              return post;
            }),
          })),
        };
      });
    } catch (error) {
      console.error('Error updating repost count in cache:', error);
    }
  },

  /**
   * Update comment count (from Socket.IO commentCountUpdated event)
   */
  updateCommentCount: (queryClient: QueryClient, isSignedIn: boolean, postId: string, commentCount: number) => {
    if (!queryClient || !postId || typeof commentCount !== 'number' || commentCount < 0) {
      console.warn('Invalid parameters for updateCommentCount');
      return;
    }
    
    try {
      queryClient.setQueryData(postsKeys.feed(isSignedIn), (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || []).map((post: any) => {
              if (!post) return post;
              if (post._id === postId) {
                return { ...post, commentCount };
              }
              if (post.isRepost && post.originalPost && post.originalPost._id === postId) {
                return {
                  ...post,
                  originalPost: { ...post.originalPost, commentCount },
                };
              }
              return post;
            }),
          })),
        };
      });
    } catch (error) {
      console.error('Error updating comment count in cache:', error);
    }
  },
};

// Query keys for posts
export const postsKeys = {
  all: ['posts'] as const,
  feeds: () => [...postsKeys.all, 'feed'] as const,
  feed: (isSignedIn: boolean) => [...postsKeys.feeds(), isSignedIn] as const,
  detail: (id: string) => [...postsKeys.all, 'detail', id] as const,
  public: () => [...postsKeys.all, 'public'] as const,
};

/**
 * Hook to fetch posts feed with infinite scroll
 */
export function usePostsFeed() {
  const { isSignedIn } = useAuth();

  return useInfiniteQuery({
    queryKey: postsKeys.feed(isSignedIn || false),
    queryFn: async ({ pageParam = 1 }) => {
      const limit = 20;
      
      if (isSignedIn) {
        const data = await postsAPI.getPosts(undefined, pageParam, limit);
        return {
          posts: data.posts || [],
          pagination: data.pagination || {
            hasNextPage: (data.posts || []).length === limit,
            totalPosts: (data.posts || []).length,
          },
        };
      } else {
        const res = await fetch(`${API_BASE_URL}/posts/public?limit=${limit}&page=${pageParam}`);
        if (!res.ok) {
          throw new Error(`Failed to load posts: ${res.status}`);
        }
        
        let data;
        try {
          data = await res.json();
        } catch (parseError) {
          throw new Error('Failed to parse posts response');
        }
        
        return {
          posts: data.posts || [],
          pagination: data.pagination || {
            hasNextPage: (data.posts || []).length === limit,
            totalPosts: (data.posts || []).length,
          },
        };
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.pagination?.hasNextPage) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    // Long stale time - Socket.IO is the source of truth for real-time updates
    // Only refetch on manual refresh or if data is very old
    staleTime: 10 * 60 * 1000, // 10 minutes - Socket.IO handles real-time
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    // Don't refetch automatically - Socket.IO handles updates
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Hook to like/unlike a post with optimistic updates
 */
export function useLikePost() {
  const queryClient = useQueryClient();
  const { setOptimisticLike, clearOptimisticLike } = usePostsStore();

  return useMutation({
    mutationFn: async ({ postId }: { postId: string; isLiked: boolean }) => {
      if (!postId || typeof postId !== 'string') {
        throw new Error('Invalid post ID');
      }
      // API endpoint toggles like/unlike, so we just call it
      // Token is undefined - API uses cookies (Better Auth)
      return await postsAPI.likePost(undefined, postId);
    },
    onMutate: async ({ postId, isLiked }) => {
      if (!postId) return;
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: postsKeys.all });

      // Snapshot previous values
      const previousFeeds = queryClient.getQueriesData({ queryKey: postsKeys.feeds() });

      // Optimistically update all feed queries
      queryClient.setQueriesData({ queryKey: postsKeys.feeds() }, (old: any) => {
        if (!old) return old;
        
        // Handle infinite query structure
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              posts: (page.posts || []).map((post: any) => {
                // Handle both regular posts and reposts
                if (post._id === postId) {
                  const currentCount = post.likeCount || 0;
                  const newCount = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
                  setOptimisticLike(postId, !isLiked, currentCount);
                  return {
                    ...post,
                    isLiked: !isLiked,
                    likeCount: newCount,
                  };
                }
                // Handle reposts
                if (post.isRepost && post.originalPost?._id === postId) {
                  const currentCount = post.originalPost.likeCount || 0;
                  const newCount = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
                  setOptimisticLike(postId, !isLiked, currentCount);
                  return {
                    ...post,
                    originalPost: {
                      ...post.originalPost,
                      isLiked: !isLiked,
                      likeCount: newCount,
                    },
                  };
                }
                return post;
              }),
            })),
          };
        }
        return old;
      });

      return { previousFeeds };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousFeeds) {
        context.previousFeeds.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      clearOptimisticLike(variables.postId);
    },
    onSettled: (data, error, variables) => {
      // Only invalidate if there was an error or if we need to sync
      // Don't invalidate on success - socket updates will handle it
      if (error) {
        queryClient.invalidateQueries({ queryKey: postsKeys.feeds() });
      }
      clearOptimisticLike(variables.postId);
    },
  });
}

/**
 * Hook to repost/unrepost with optimistic updates
 */
export function useRepost() {
  const queryClient = useQueryClient();
  const { setOptimisticRepost, clearOptimisticRepost } = usePostsStore();

  return useMutation({
    mutationFn: async ({ postId, comment, isReposting }: { postId: string; comment?: string; isReposting: boolean }) => {
      if (!postId || typeof postId !== 'string') {
        throw new Error('Invalid post ID');
      }
      if (isReposting) {
        // Token is undefined - API uses cookies (Better Auth)
        return await postsAPI.repost(undefined, postId, comment);
      } else {
        // You'll need to get the repostId first - this is simplified
        throw new Error('Unrepost not implemented in this hook');
      }
    },
    onMutate: async ({ postId, isReposting }) => {
      await queryClient.cancelQueries({ queryKey: postsKeys.all });

      const previousFeeds = queryClient.getQueriesData({ queryKey: postsKeys.feeds() });

      queryClient.setQueriesData({ queryKey: postsKeys.feeds() }, (old: any) => {
        if (!old || !old.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || []).map((post: any) => {
              if (post._id === postId || post.originalPost?._id === postId) {
                const currentCount = post.repostCount || 0;
                const newCount = isReposting ? currentCount + 1 : Math.max(0, currentCount - 1);
                setOptimisticRepost(postId, isReposting, currentCount);
                return {
                  ...post,
                  repostCount: newCount,
                };
              }
              return post;
            }),
          })),
        };
      });

      return { previousFeeds };
    },
    onError: (err, variables, context) => {
      if (context?.previousFeeds) {
        context.previousFeeds.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      clearOptimisticRepost(variables.postId);
    },
    onSettled: (data, error, variables) => {
      // Only invalidate on error - socket updates handle success
      if (error) {
        queryClient.invalidateQueries({ queryKey: postsKeys.feeds() });
      }
      clearOptimisticRepost(variables.postId);
    },
  });
}

/**
 * Hook to create a comment with optimistic updates
 */
export function useCreateComment() {
  const queryClient = useQueryClient();
  const { setOptimisticComment, clearOptimisticComment } = usePostsStore();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!postId || typeof postId !== 'string') {
        throw new Error('Invalid post ID');
      }
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new Error('Comment cannot be empty');
      }
      // Token is undefined - API uses cookies (Better Auth)
      return await postsAPI.createComment(undefined, postId, content.trim());
    },
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: postsKeys.all });

      const previousFeeds = queryClient.getQueriesData({ queryKey: postsKeys.feeds() });

      queryClient.setQueriesData({ queryKey: postsKeys.feeds() }, (old: any) => {
        if (!old || !old.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: (page.posts || []).map((post: any) => {
              if (post._id === postId || post.originalPost?._id === postId) {
                const currentCount = post.commentCount || 0;
                const newCount = currentCount + 1;
                setOptimisticComment(postId, newCount);
                return {
                  ...post,
                  commentCount: newCount,
                };
              }
              return post;
            }),
          })),
        };
      });

      return { previousFeeds };
    },
    onError: (err, variables, context) => {
      if (context?.previousFeeds) {
        context.previousFeeds.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      clearOptimisticComment(variables.postId);
    },
    onSuccess: (data, variables) => {
      // Invalidate comments query for this post
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
    },
    onSettled: (data, error, variables) => {
      // Only invalidate on error - socket updates handle success
      if (error) {
        queryClient.invalidateQueries({ queryKey: postsKeys.feeds() });
      }
      clearOptimisticComment(variables.postId);
    },
  });
}

