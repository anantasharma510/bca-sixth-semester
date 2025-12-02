import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import { commentsAPI } from '../services/api/comments';
import { Colors, getColors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Feather';
import { RepliesSection } from './RepliesSection';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { getDisplayName, getUserInitials } from '../utils/user';
import { useSound } from '../hooks/useSound';

interface CommentProps {
  comment: any;
  onCommentUpdate?: (updatedComment: any) => void;
  onCommentDelete?: (commentId: string) => void;
  onReplyCreated?: (reply: any) => void;
}

export function Comment({ comment, onCommentUpdate, onCommentDelete, onReplyCreated }: CommentProps) {
  const { isSignedIn, user } = useAuth();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const { playCommentSound } = useSound();

  // Safety check
  if (!comment) {
    console.warn('Comment component received undefined comment');
    return null;
  }

  // State management
  const [isLiked, setIsLiked] = useState(comment?.isLiked || false);
  const [likeCount, setLikeCount] = useState(comment?.likeCount || 0);
  const [currentContent, setCurrentContent] = useState(comment?.content || '');
  
  // UI states
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Input states
  const [editText, setEditText] = useState(comment?.content || '');
  const [replyText, setReplyText] = useState('');

  // User permissions
  const isOwnComment = user?._id === comment?.author?._id;

  // Sync state when comment prop changes
  useEffect(() => {
    setIsLiked(comment?.isLiked || false);
    setLikeCount(comment?.likeCount || 0);
    setCurrentContent(comment?.content || '');
    setEditText(comment?.content || '');
  }, [comment?.isLiked, comment?.likeCount, comment?.content]);

  const getAuthorName = () => getDisplayName(comment?.author, 'Unknown User');

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'unknown';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'unknown';
      
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'now';
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d`;
      
      return date.toLocaleDateString();
    } catch (error) {
      console.warn('Error formatting timestamp:', timestamp, error);
      return 'unknown';
    }
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const handleLike = async () => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to like comments');
      return;
    }

    if (isLiking) return;

    const originalIsLiked = isLiked;
    const originalLikeCount = likeCount;

    // Optimistic update
    setIsLiked(!originalIsLiked);
    setLikeCount(originalIsLiked ? originalLikeCount - 1 : originalLikeCount + 1);
    setIsLiking(true);

    try {
      const response = await commentsAPI.likeComment(undefined, comment._id);
      setIsLiked(response.liked);
      setLikeCount(response.likeCount);
    } catch (error: any) {
      // Revert optimistic update on error
      setIsLiked(originalIsLiked);
      setLikeCount(originalLikeCount);
      Alert.alert('Error', error.message || 'Failed to like comment');
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (!isSignedIn) {
                throw new Error('Authentication required');
              }

              await commentsAPI.deleteComment(undefined, comment._id);
              onCommentDelete?.(comment._id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete comment');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(currentContent);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(currentContent);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText.trim() === currentContent) {
      setIsEditing(false);
      return;
    }

    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to edit comments');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await commentsAPI.updateComment(undefined, comment._id, editText.trim());
      setCurrentContent(editText.trim());
      setIsEditing(false);
      onCommentUpdate?.(response.comment);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = () => {
    setIsReplying(true);
    setReplyText('');
  };

  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyText('');
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      Alert.alert('Error', 'Reply content cannot be empty');
      return;
    }

    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to reply.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await commentsAPI.createReply(undefined, comment._id, replyText.trim());
      setReplyText('');
      setIsReplying(false);
      onReplyCreated?.(response.comment);
      // Play sound effect on successful reply
      playCommentSound().catch(() => {
        // Ignore errors - sound is optional
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: colors.background.primary, 
      borderBottomColor: colors.border.light 
    }]}>
      {/* Comment Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: Colors.primary[500], justifyContent: 'center', alignItems: 'center' }]}>
          {comment?.author?.profileImageUrl ? (
            <Image
              source={{ uri: comment.author.profileImageUrl }}
              style={styles.avatarImage}
              onError={() => console.log('Comment author image failed to load')}
            />
          ) : (
            <Text style={styles.avatarText}>{getUserInitials(comment?.author)}</Text>
          )}
        </View>
        <View style={styles.headerContent}>
          <View style={styles.authorRow}>
            <Text style={[styles.authorName, { color: colors.text.primary }]} numberOfLines={1}>
              {getAuthorName()}
            </Text>
            <Text style={[styles.username, { color: colors.text.secondary }]} numberOfLines={1}>
              @{comment?.author?.username || 'user'}
            </Text>
            <Text style={[styles.dot, { color: colors.text.secondary }]}>·</Text>
            <Text style={[styles.timestamp, { color: colors.text.secondary }]}>{formatTimestamp(comment?.createdAt)}</Text>
          </View>
        </View>
        {isOwnComment && (
          <TouchableOpacity 
            onPress={handleDelete} 
            disabled={isDeleting}
            style={styles.moreButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="more-horizontal" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Comment Content */}
      <View style={styles.content}>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[styles.editInput, { 
                color: colors.text.primary, 
                borderColor: colors.border.light 
              }]}
              value={editText}
              onChangeText={setEditText}
              multiline
              placeholder="Edit your comment..."
              placeholderTextColor={colors.text.secondary}
              maxLength={280}
            />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSaveEdit} 
                disabled={isSubmitting}
                style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
              >
                <Text style={styles.saveButtonText}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={[styles.commentText, { color: colors.text.primary }]}>{currentContent}</Text>
        )}
      </View>

      {/* Actions */}
      {!isEditing && (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleReply}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="message-circle" size={14} color={colors.text.secondary} />
            {comment?.replyCount > 0 && (
              <Text style={[styles.actionCount, { color: colors.text.secondary }]}>{formatCount(comment.replyCount)}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleLike}
            disabled={isLiking}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon 
              name="heart" 
              size={14} 
              color={isLiked ? Colors.error[500] : colors.text.secondary}
            />
            {likeCount > 0 && (
              <Text style={[
                styles.actionCount,
                { color: isLiked ? Colors.error[500] : colors.text.secondary },
                isLiked && styles.actionCountActive
              ]}>
                {formatCount(likeCount)}
              </Text>
            )}
          </TouchableOpacity>

          {isOwnComment && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleEdit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="edit" size={14} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Reply Input */}
      {isReplying && (
        <View style={styles.replyContainer}>
          <TextInput
            style={[styles.replyInput, { 
              color: colors.text.primary, 
              borderColor: colors.border.light 
            }]}
            value={replyText}
            onChangeText={setReplyText}
            placeholder={`Reply to ${getAuthorName()}...`}
            placeholderTextColor={colors.text.secondary}
            multiline
            maxLength={280}
          />
          <View style={styles.replyActions}>
            <TouchableOpacity onPress={handleCancelReply} style={styles.cancelButton}>
              <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSubmitReply} 
              disabled={isSubmitting || !replyText.trim()}
              style={[
                styles.saveButton, 
                (isSubmitting || !replyText.trim()) && styles.saveButtonDisabled
              ]}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? 'Replying...' : 'Reply'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Replies Section */}
      <RepliesSection 
        commentId={comment._id}
        replyCount={comment?.replyCount || 0}
        postId={comment?.post || ''}
        onReplyCreated={onReplyCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor will be set dynamically
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    // borderBottomColor will be set dynamically
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    // color will be set dynamically
  },
  username: {
    fontSize: 13,
    // color will be set dynamically
  },
  dot: {
    fontSize: 13,
    // color will be set dynamically
  },
  timestamp: {
    fontSize: 13,
    // color will be set dynamically
  },
  moreButton: {
    padding: 4,
  },
  content: {
    marginLeft: 44, // Align with text after avatar
    marginBottom: 8,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
    // color will be set dynamically
  },
  editContainer: {
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    // borderColor will be set dynamically
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    // color will be set dynamically
    backgroundColor: 'transparent',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
  },
  cancelButtonText: {
    fontSize: 14,
    // color will be set dynamically
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.primary[500],
  },
  saveButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  saveButtonText: {
    fontSize: 14,
    color: Colors.background.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginLeft: 44, // Align with content
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 12,
    // color will be set dynamically
    fontWeight: '500',
  },
  actionCountActive: {
    // color will be set dynamically
  },
  replyContainer: {
    marginLeft: 44,
    marginTop: 8,
  },
  replyInput: {
    borderWidth: 1,
    // borderColor will be set dynamically
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    // color will be set dynamically
    backgroundColor: 'transparent',
    textAlignVertical: 'top',
    minHeight: 60,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
}); 