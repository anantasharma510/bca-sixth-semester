/**
 * Hook to integrate Socket.IO events with TanStack Query cache
 * 
 * This hook should be used in components that need to sync Socket.IO updates
 * with the TanStack Query cache. It provides handlers that update the cache
 * when Socket.IO events fire.
 * 
 * Usage in HomeScreen or similar:
 * 
 * const queryClient = useQueryClient();
 * const { isSignedIn } = useAuth();
 * const socketHandlers = useSocketWithQuery(queryClient, isSignedIn);
 * 
 * // Then in your Socket.IO event listeners:
 * socket.on('newPost', socketHandlers.handleNewPost);
 * socket.on('postDeleted', socketHandlers.handlePostDeleted);
 * // etc...
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { updateCacheFromSocket, postsKeys } from './usePosts';

export function useSocketWithQuery(isSignedIn: boolean) {
  const queryClient = useQueryClient();

  const handleNewPost = useCallback((newPost: any) => {
    if (!newPost || !newPost._id) {
      console.warn('Invalid post received via socket:', newPost);
      return;
    }
    console.log('📝 Updating cache with new post from Socket.IO:', newPost._id);
    updateCacheFromSocket.addNewPost(queryClient, isSignedIn, newPost);
  }, [queryClient, isSignedIn]);

  const handlePostDeleted = useCallback((data: any) => {
    if (!data || !data.postId) {
      console.warn('Invalid post deletion data via socket:', data);
      return;
    }
    console.log('🗑️ Removing post from cache via Socket.IO:', data.postId);
    updateCacheFromSocket.removePost(queryClient, isSignedIn, data.postId);
  }, [queryClient, isSignedIn]);

  const handleRepostDeleted = useCallback((data: any) => {
    if (!data || !data.repostId) {
      console.warn('Invalid repost deletion data via socket:', data);
      return;
    }
    console.log('🗑️ Removing repost from cache via Socket.IO:', data.repostId);
    updateCacheFromSocket.removePost(queryClient, isSignedIn, data.repostId);
  }, [queryClient, isSignedIn]);

  const handlePostUpdated = useCallback((updatedPost: any) => {
    if (!updatedPost || !updatedPost._id) {
      console.warn('Invalid post update via socket:', updatedPost);
      return;
    }
    console.log('✏️ Updating post in cache via Socket.IO:', updatedPost._id);
    updateCacheFromSocket.updatePost(queryClient, isSignedIn, updatedPost);
  }, [queryClient, isSignedIn]);

  const handleNewRepost = useCallback((newRepost: any) => {
    if (!newRepost || !newRepost._id) {
      console.warn('Invalid repost received via socket:', newRepost);
      return;
    }
    console.log('🔄 Updating cache with new repost from Socket.IO:', newRepost._id);
    updateCacheFromSocket.addNewPost(queryClient, isSignedIn, newRepost);
  }, [queryClient, isSignedIn]);

  const handlePostLikeCountUpdated = useCallback((data: { postId: string; likeCount: number }) => {
    if (!data || !data.postId || typeof data.likeCount !== 'number') {
      console.warn('Invalid like count update via socket:', data);
      return;
    }
    console.log('❤️ Updating like count in cache via Socket.IO:', data.postId, data.likeCount);
    updateCacheFromSocket.updateLikeCount(queryClient, isSignedIn, data.postId, data.likeCount);
  }, [queryClient, isSignedIn]);

  const handleRepostCountUpdated = useCallback((data: { postId: string; repostCount: number }) => {
    if (!data || !data.postId || typeof data.repostCount !== 'number') {
      console.warn('Invalid repost count update via socket:', data);
      return;
    }
    console.log('🔄 Updating repost count in cache via Socket.IO:', data.postId, data.repostCount);
    updateCacheFromSocket.updateRepostCount(queryClient, isSignedIn, data.postId, data.repostCount);
  }, [queryClient, isSignedIn]);

  const handleCommentCountUpdated = useCallback((data: { postId: string; commentCount: number }) => {
    if (!data || !data.postId || typeof data.commentCount !== 'number') {
      console.warn('Invalid comment count update via socket:', data);
      return;
    }
    console.log('💬 Updating comment count in cache via Socket.IO:', data.postId, data.commentCount);
    updateCacheFromSocket.updateCommentCount(queryClient, isSignedIn, data.postId, data.commentCount);
  }, [queryClient, isSignedIn]);

  return {
    handleNewPost,
    handlePostDeleted,
    handleRepostDeleted,
    handlePostUpdated,
    handleNewRepost,
    handlePostLikeCountUpdated,
    handleRepostCountUpdated,
    handleCommentCountUpdated,
  };
}

