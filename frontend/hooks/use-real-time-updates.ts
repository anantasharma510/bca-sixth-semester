import { useEffect, useCallback } from 'react';

interface PostLikeEvent {
  postId: string;
  liked: boolean;
  likeCount: number;
  userId: string;
}

interface RepostCountEvent {
  postId: string;
  repostCount: number;
  action: 'incremented' | 'decremented';
}

interface CommentCountEvent {
  postId: string;
  commentCount: number;
  action: 'incremented' | 'decremented';
}

export function useRealTimeUpdates(currentUserId?: string) {
  const handlePostLikeCountUpdate = useCallback((event: CustomEvent<PostLikeEvent>) => {
    const { postId, likeCount } = event.detail;
    // Dispatch a more specific event for post components
    window.dispatchEvent(new CustomEvent('postLikeCountUpdate', {
      detail: { postId, likeCount }
    }));
  }, []);

  const handlePostLiked = useCallback((event: CustomEvent<PostLikeEvent>) => {
    const { postId, liked, likeCount } = event.detail;
    // Only dispatch isLiked update for the current user
    window.dispatchEvent(new CustomEvent('postLikedForCurrentUser', {
      detail: { postId, liked, likeCount }
    }));
  }, []);

  const handleRepostCountUpdate = useCallback((event: CustomEvent<RepostCountEvent>) => {
    const { postId, repostCount, action } = event.detail;
    // Removed debug log - not needed for production
    
    // Dispatch a more specific event for post components
    window.dispatchEvent(new CustomEvent('repostCountUpdate', {
      detail: { postId, repostCount, action }
    }));
  }, []);

  const handleCommentCountUpdate = useCallback((event: CustomEvent<CommentCountEvent>) => {
    const { postId, commentCount, action } = event.detail;
    // Removed debug log - not needed for production
    
    // Dispatch a more specific event for post components
    window.dispatchEvent(new CustomEvent('commentCountUpdate', {
      detail: { postId, commentCount, action }
    }));
  }, []);

  useEffect(() => {
    // Listen for post like count events
    window.addEventListener('postLikeCountUpdated', handlePostLikeCountUpdate as EventListener);
    // Listen for post liked events for the current user
    window.addEventListener('postLiked', handlePostLiked as EventListener);
    
    // Listen for repost count events
    window.addEventListener('repostCountUpdated', handleRepostCountUpdate as EventListener);

    // Listen for comment count events
    window.addEventListener('commentCountUpdated', handleCommentCountUpdate as EventListener);

    return () => {
      // Clean up event listeners
      window.removeEventListener('postLikeCountUpdated', handlePostLikeCountUpdate as EventListener);
      window.removeEventListener('postLiked', handlePostLiked as EventListener);
      window.removeEventListener('repostCountUpdated', handleRepostCountUpdate as EventListener);
      window.removeEventListener('commentCountUpdated', handleCommentCountUpdate as EventListener);
    };
  }, [handlePostLikeCountUpdate, handlePostLiked, handleRepostCountUpdate, handleCommentCountUpdate]);
}

// Hook for individual post components to listen for their specific updates
export function usePostRealTimeUpdates(postId: string, onLikeUpdate?: (data: PostLikeEvent) => void, onRepostCountUpdate?: (data: RepostCountEvent) => void, onCommentCountUpdate?: (data: CommentCountEvent) => void, onLikeCountUpdate?: (data: { postId: string, likeCount: number }) => void) {
  useEffect(() => {
    const handlePostLikeCountUpdate = (event: CustomEvent) => {
      const { postId: eventPostId, likeCount } = event.detail;
      if (eventPostId === postId) {
        onLikeCountUpdate?.({ postId: eventPostId, likeCount });
      }
    };
    const handlePostLikedForCurrentUser = (event: CustomEvent) => {
      const { postId: eventPostId, liked, likeCount } = event.detail;
      if (eventPostId === postId) {
        onLikeUpdate?.({ postId: eventPostId, liked, likeCount, userId: '' });
      }
    };

    const handleRepostCountUpdate = (event: CustomEvent) => {
      const { postId: eventPostId, repostCount, action } = event.detail;
      // Removed debug log - not needed for production
      
      if (eventPostId === postId) {
        onRepostCountUpdate?.({ postId: eventPostId, repostCount, action });
      }
    };

    const handleCommentCountUpdate = (event: CustomEvent) => {
      const { postId: eventPostId, commentCount, action } = event.detail;
      // Removed debug log - not needed for production
      
      if (eventPostId === postId) {
        onCommentCountUpdate?.({ postId: eventPostId, commentCount, action });
      }
    };

    // Listen for specific post updates
    window.addEventListener('postLikeCountUpdate', handlePostLikeCountUpdate as EventListener);
    window.addEventListener('postLikedForCurrentUser', handlePostLikedForCurrentUser as EventListener);
    window.addEventListener('repostCountUpdate', handleRepostCountUpdate as EventListener);
    window.addEventListener('commentCountUpdate', handleCommentCountUpdate as EventListener);

    return () => {
      // Clean up event listeners
      window.removeEventListener('postLikeCountUpdate', handlePostLikeCountUpdate as EventListener);
      window.removeEventListener('postLikedForCurrentUser', handlePostLikedForCurrentUser as EventListener);
      window.removeEventListener('repostCountUpdate', handleRepostCountUpdate as EventListener);
      window.removeEventListener('commentCountUpdate', handleCommentCountUpdate as EventListener);
    };
  }, [postId, onLikeUpdate, onRepostCountUpdate, onCommentCountUpdate, onLikeCountUpdate]);
} 