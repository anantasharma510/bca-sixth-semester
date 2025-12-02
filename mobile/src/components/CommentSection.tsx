import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { commentsAPI } from '../services/api/comments';
import { Comment } from './Comment';
import { Colors, getColors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Feather';
import { useSocket } from '../hooks/useSocket';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useSound } from '../hooks/useSound';

interface CommentSectionProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  commentCount: number;
  onCommentCountUpdate?: (newCount: number) => void;
}

export function CommentSection({ 
  postId, 
  isOpen, 
  onClose, 
  commentCount, 
  onCommentCountUpdate 
}: CommentSectionProps) {
  const { isSignedIn, user } = useAuth();
  const { socket, joinPost, leavePost } = useSocket();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const { playCommentSound } = useSound();

  // State management
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Character limit
  const characterLimit = 280;
  const remainingChars = characterLimit - commentText.length;
  const isOverLimit = remainingChars < 0;

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && postId) {
      loadComments();
    }
  }, [isOpen, postId]);

  // Join post room and handle Socket.IO events
  useEffect(() => {
    if (isOpen && postId && socket) {
      // Join the post room for real-time updates
      joinPost(postId);

      const handleNewComment = (comment: any) => {
        if (comment.post === postId) {
          console.log('💬 Adding new comment via Socket.IO:', comment._id);
          setComments(prev => [comment, ...prev]);
          // Don't update count here - let the global commentCountUpdated event handle it
          // This ensures consistency across all devices viewing the feed
        }
      };

      const handleCommentDeleted = (data: any) => {
        if (data.postId === postId) {
          console.log('🗑️ Removing deleted comment via Socket.IO:', data.commentId);
          setComments(prev => prev.filter(c => c._id !== data.commentId));
          // Don't update count here - let the global commentCountUpdated event handle it
          // This ensures consistency across all devices viewing the feed
        }
      };

      const handleCommentUpdated = (data: any) => {
        console.log('✏️ Updating comment via Socket.IO:', data.commentId);
        setComments(prev => prev.map(comment => 
          comment._id === data.commentId 
            ? { ...comment, content: data.content, updatedAt: data.updatedAt }
            : comment
        ));
      };

      const handleCommentLiked = (data: any) => {
        console.log('❤️ Updating comment like via Socket.IO:', data.commentId);
        setComments(prev => prev.map(comment => 
          comment._id === data.commentId 
            ? { ...comment, isLiked: data.liked, likeCount: data.likeCount }
            : comment
        ));
      };

      const handleNewReply = (data: any) => {
        console.log('💬 New reply via Socket.IO:', data.reply._id, 'to:', data.parentCommentId);
        setComments(prev => prev.map(comment => 
          comment._id === data.parentCommentId 
            ? { ...comment, replyCount: (comment.replyCount || 0) + 1 }
            : comment
        ));
      };

      // Add Socket.IO event listeners
      socket.on('newComment', handleNewComment);
      socket.on('commentDeleted', handleCommentDeleted);
      socket.on('commentUpdated', handleCommentUpdated);
      socket.on('commentLiked', handleCommentLiked);
      socket.on('newReply', handleNewReply);

      return () => {
        // Cleanup: remove event listeners and leave post room
        socket.off('newComment', handleNewComment);
        socket.off('commentDeleted', handleCommentDeleted);
        socket.off('commentUpdated', handleCommentUpdated);
        socket.off('commentLiked', handleCommentLiked);
        socket.off('newReply', handleNewReply);
        leavePost(postId);
      };
    }
  }, [isOpen, postId, socket, joinPost, leavePost, commentCount, onCommentCountUpdate]);

  const loadComments = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      if (!isSignedIn) {
        throw new Error('Please sign in to view comments.');
      }

      const response = await commentsAPI.getComments(undefined, postId);
      setComments(response.comments || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load comments');
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }

    if (isOverLimit) {
      Alert.alert('Error', `Comment is ${Math.abs(remainingChars)} characters over the limit`);
      return;
    }

    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to comment');
      return;
    }

    setIsSubmitting(true);
    try {
      await commentsAPI.createComment(undefined, postId, commentText.trim());
      setCommentText('');
      // Play sound effect on successful comment
      playCommentSound().catch(() => {
        // Ignore errors - sound is optional
      });
      // Don't manually add to comments - Socket.IO will handle it
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentUpdate = (updatedComment: any) => {
    setComments(prev => prev.map(comment => 
      comment._id === updatedComment._id ? updatedComment : comment
    ));
  };

  const handleCommentDelete = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment._id !== commentId));
  };

  const handleReplyCreated = (reply: any) => {
    // Handle reply creation if needed
    console.log('Reply created:', reply);
  };

  const renderComment = ({ item }: { item: any }) => (
    <Comment
      comment={item}
      onCommentUpdate={handleCommentUpdate}
      onCommentDelete={handleCommentDelete}
      onReplyCreated={handleReplyCreated}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="message-circle" size={48} color={colors.neutral[300]} />
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No comments yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>Be the first to comment on this post</Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={Colors.primary[500]} />
      <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading comments...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Icon name="alert-circle" size={48} color={Colors.error[500]} />
      <Text style={[styles.errorTitle, { color: colors.text.primary }]}>Failed to load comments</Text>
      <Text style={[styles.errorText, { color: colors.text.secondary }]}>{error}</Text>
      <TouchableOpacity onPress={() => loadComments()} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: colors.background.primary }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { 
          backgroundColor: colors.background.primary, 
          borderBottomColor: colors.border.light 
        }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text.primary }]}>Comments ({commentCount})</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Comments List */}
        <View style={styles.commentsContainer}>
          {isLoading ? renderLoadingState() : 
           error ? renderErrorState() :
           <FlatList
             data={comments}
             renderItem={renderComment}
             keyExtractor={(item, index) => item?._id || `comment-${index}`}
             showsVerticalScrollIndicator={false}
             ListEmptyComponent={renderEmptyState}
             refreshControl={
               <RefreshControl
                 refreshing={refreshing}
                 onRefresh={() => loadComments(true)}
                 colors={[Colors.primary[500]]}
                 tintColor={Colors.primary[500]}
               />
             }
           />
          }
        </View>

        {/* Comment Input */}
        <View style={[styles.inputContainer, { 
          backgroundColor: colors.background.primary, 
          borderTopColor: colors.border.light 
        }]}>
          <View style={[styles.inputWrapper, { 
            backgroundColor: colors.background.primary, 
            borderColor: colors.border.medium 
          }]}>
            <TextInput
              style={[
                styles.textInput, 
                { color: colors.text.primary },
                isOverLimit && { borderColor: colors.error[500] }
              ]}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment..."
              placeholderTextColor={colors.text.secondary}
              multiline
              maxLength={characterLimit + 50} // Allow buffer for error feedback
              textAlignVertical="top"
            />
            <View style={styles.inputFooter}>
              <Text style={[
                styles.characterCount,
                { color: colors.text.secondary },
                isOverLimit && { color: colors.error[500] },
                remainingChars < 20 && { color: Colors.warning[500] }
              ]}>
                {remainingChars}
              </Text>
              <TouchableOpacity
                onPress={handleSubmitComment}
                disabled={isSubmitting || !commentText.trim() || isOverLimit}
                style={[
                  styles.submitButton,
                  (isSubmitting || !commentText.trim() || isOverLimit) && [styles.submitButtonDisabled, { backgroundColor: colors.neutral[300] }]
                ]}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be set dynamically
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    // borderBottomColor will be set dynamically
    // backgroundColor will be set dynamically
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    // color will be set dynamically
  },
  headerSpacer: {
    width: 40, // Balance the close button
  },
  commentsContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color will be set dynamically
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    // color will be set dynamically
    textAlign: 'center',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    // color will be set dynamically
    marginTop: 16,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color will be set dynamically
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    // color will be set dynamically
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    borderTopWidth: 1,
    // borderTopColor will be set dynamically
    // backgroundColor will be set dynamically
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    borderWidth: 1,
    // borderColor will be set dynamically
    borderRadius: 12,
    // backgroundColor will be set dynamically
  },
  textInput: {
    padding: 12,
    fontSize: 16,
    // color will be set dynamically
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  textInputError: {
    // borderColor will be set dynamically
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  characterCount: {
    fontSize: 12,
    // color will be set dynamically
  },
  characterCountWarning: {
    // color will be set dynamically
  },
  characterCountError: {
    // color will be set dynamically
  },
  submitButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitButtonDisabled: {
    // backgroundColor will be set dynamically
  },
  submitButtonText: {
    color: Colors.background.primary,
    fontSize: 14,
    fontWeight: '600',
  },
}); 