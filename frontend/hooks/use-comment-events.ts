import { useEffect, useCallback } from 'react';
import { useSocket } from '@/components/socket-provider';

interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string;
  };
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseCommentEventsProps {
  postId: string;
  onNewComment?: (comment: Comment) => void;
  onNewReply?: (reply: Comment, parentCommentId: string) => void;
  onCommentLiked?: (commentId: string, liked: boolean, likeCount: number) => void;
  onCommentDeleted?: (commentId: string) => void;
  onCommentUpdated?: (commentId: string, content: string, updatedAt: string) => void;
}

export const useCommentEvents = ({
  postId,
  onNewComment,
  onNewReply,
  onCommentLiked,
  onCommentDeleted,
  onCommentUpdated
}: UseCommentEventsProps) => {
  const { joinPost, leavePost } = useSocket();

  // Join post room when component mounts
  useEffect(() => {
    joinPost(postId);
    
    // Leave post room when component unmounts
    return () => {
      leavePost(postId);
    };
  }, [postId, joinPost, leavePost]);

  // Handle new comment event
  const handleNewComment = useCallback((event: CustomEvent) => {
    const comment = event.detail;
    onNewComment?.(comment);
  }, [onNewComment]);

  // Handle new reply event
  const handleNewReply = useCallback((event: CustomEvent) => {
    const { reply, parentCommentId } = event.detail;
    onNewReply?.(reply, parentCommentId);
  }, [onNewReply]);

  // Handle comment like event
  const handleCommentLiked = useCallback((event: CustomEvent) => {
    const { commentId, liked, likeCount } = event.detail;
    onCommentLiked?.(commentId, liked, likeCount);
  }, [onCommentLiked]);

  // Handle comment deletion event
  const handleCommentDeleted = useCallback((event: CustomEvent) => {
    const { commentId } = event.detail;
    onCommentDeleted?.(commentId);
  }, [onCommentDeleted]);

  // Handle comment update event
  const handleCommentUpdated = useCallback((event: CustomEvent) => {
    const { commentId, content, updatedAt } = event.detail;
    onCommentUpdated?.(commentId, content, updatedAt);
  }, [onCommentUpdated]);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('newComment', handleNewComment as EventListener);
    window.addEventListener('newReply', handleNewReply as EventListener);
    window.addEventListener('commentLiked', handleCommentLiked as EventListener);
    window.addEventListener('commentDeleted', handleCommentDeleted as EventListener);
    window.addEventListener('commentUpdated', handleCommentUpdated as EventListener);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('newComment', handleNewComment as EventListener);
      window.removeEventListener('newReply', handleNewReply as EventListener);
      window.removeEventListener('commentLiked', handleCommentLiked as EventListener);
      window.removeEventListener('commentDeleted', handleCommentDeleted as EventListener);
      window.removeEventListener('commentUpdated', handleCommentUpdated as EventListener);
    };
  }, [handleNewComment, handleNewReply, handleCommentLiked, handleCommentDeleted, handleCommentUpdated]);
}; 