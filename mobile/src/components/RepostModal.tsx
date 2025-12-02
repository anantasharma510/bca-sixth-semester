import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors, getColors } from '../constants/colors';
import { postsAPI } from '../services/api/posts';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { Video } from 'expo-av';
import { getDisplayName } from '../utils/user';

interface RepostModalProps {
  post: {
    _id: string;
    author: {
      username: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    };
    content: string;
    media?: Array<{
      type: 'image' | 'video';
      url: string;
      thumbnailUrl?: string;
    }>;
  };
  isOpen: boolean;
  onClose: () => void;
  onRepostSuccess?: () => void;
}

export function RepostModal({ post, isOpen, onClose, onRepostSuccess }: RepostModalProps) {
  const [comment, setComment] = useState('');
  const [isReposting, setIsReposting] = useState(false);
  const { user, isSignedIn } = useAuth();
  const { theme } = useTheme();
  const colors = getColors(theme);

  const characterLimit = 280;
  const remainingChars = characterLimit - comment.length;
  const isOverLimit = remainingChars < 0;

  // Reset comment when modal opens
  useEffect(() => {
    if (isOpen) {
      setComment('');
    }
  }, [isOpen]);

  const getAuthorName = () => getDisplayName(post?.author, 'Unknown User');

  const handleRepost = async () => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to repost');
      return;
    }

    if (isOverLimit) {
      Alert.alert('Error', `Comment is ${Math.abs(remainingChars)} characters over the limit`);
      return;
    }

    setIsReposting(true);
    try {
      await postsAPI.repost(undefined, post._id, comment.trim() || undefined);
      
      onRepostSuccess?.();
      onClose();
      setComment('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to repost');
    } finally {
      setIsReposting(false);
    }
  };

  const renderPostMedia = () => {
    if (!post?.media || post.media.length === 0) return null;

    return (
      <View style={styles.mediaContainer}>
        {post.media.slice(0, 2).map((mediaItem, index) => (
          mediaItem.type === 'video' ? (
            <Video
              key={index}
              source={{ uri: mediaItem.url }}
              style={[
                styles.mediaImage,
                post.media!.length === 1 ? styles.singleImage : styles.multipleImages
              ]}
              useNativeControls
              resizeMode="contain"
              shouldPlay={false}
              isLooping={false}
              shouldCorrectPitch={false}
              progressUpdateIntervalMillis={1000}
              onError={(error) => {
                console.log('RepostModal video error:', error);
              }}
              onLoad={() => {
                console.log('RepostModal video loaded successfully');
              }}
            />
          ) : (
            <Image
              key={index}
              source={{ uri: mediaItem.url }}
              style={[
                styles.mediaImage,
                post.media!.length === 1 ? styles.singleImage : styles.multipleImages
              ]}
              resizeMode="cover"
            />
          )
        ))}
        {post.media.length > 2 && (
          <View style={styles.moreMediaOverlay}>
            <Text style={styles.moreMediaText}>+{post.media.length - 2}</Text>
          </View>
        )}
      </View>
    );
  };

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
        <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Repost</Text>
          <TouchableOpacity
            style={[
              styles.repostButton,
              (isReposting || isOverLimit) && [styles.repostButtonDisabled, { backgroundColor: colors.neutral[300] }]
            ]}
            onPress={handleRepost}
            disabled={isReposting || isOverLimit}
          >
            <Text style={[
              styles.repostButtonText,
              (isReposting || isOverLimit) && [styles.repostButtonTextDisabled, { color: colors.neutral[500] }]
            ]}>
              {isReposting ? 'Posting...' : 'Repost'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User's comment section */}
          <View style={styles.commentSection}>
            <View style={styles.userInfo}>
              <Image
                source={{
                  uri: user?.image || 'https://via.placeholder.com/40',
                }}
                style={styles.userAvatar}
              />
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text.primary }]}>
                  {getDisplayName(user as any, user?.username || 'You')}
                </Text>
                <Text style={[styles.userHandle, { color: colors.text.secondary }]}>@{user?.username || 'user'}</Text>
              </View>
            </View>

            <View style={[styles.inputContainer, { 
              backgroundColor: colors.background.secondary, 
              borderColor: colors.border.light 
            }]}>
              <TextInput
                style={[
                  styles.commentInput, 
                  { color: colors.text.primary },
                  isOverLimit && { borderColor: colors.error[500] }
                ]}
                placeholder="Add a comment..."
                placeholderTextColor={colors.neutral[400]}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={300} // Allow buffer for error feedback
                textAlignVertical="top"
              />
              
              <View style={styles.characterCountContainer}>
                <Text style={[
                  styles.characterCount,
                  { color: colors.text.secondary },
                  isOverLimit && { color: colors.error[500] },
                  remainingChars < 20 && { color: Colors.warning[600] }
                ]}>
                  {remainingChars}
                </Text>
              </View>
            </View>
          </View>

          {/* Repost indicator */}
          <View style={styles.repostIndicator}>
            <Icon name="repeat" size={16} color={colors.text.secondary} />
            <Text style={[styles.repostText, { color: colors.text.secondary }]}>Reposting</Text>
          </View>

          {/* Original post */}
          <View style={[styles.originalPost, { 
            borderColor: colors.border.light, 
            backgroundColor: colors.background.secondary 
          }]}>
            <View style={styles.originalPostHeader}>
              <Image
                source={{
                  uri: post.author.profileImageUrl || 'https://via.placeholder.com/40',
                }}
                style={styles.originalAuthorAvatar}
              />
              <View style={styles.originalAuthorInfo}>
                <Text style={[styles.originalAuthorName, { color: colors.text.primary }]}>{getAuthorName()}</Text>
                <Text style={[styles.originalAuthorHandle, { color: colors.text.secondary }]}>@{post.author.username || 'user'}</Text>
              </View>
            </View>

            <Text style={[styles.originalPostContent, { color: colors.text.primary }]}>{post.content}</Text>
            {renderPostMedia()}
          </View>
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    // borderBottomColor will be set dynamically
    paddingTop: 50, // Account for status bar
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color will be set dynamically
  },
  repostButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  repostButtonDisabled: {
    // backgroundColor will be set dynamically
  },
  repostButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  repostButtonTextDisabled: {
    // color will be set dynamically
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  commentSection: {
    paddingVertical: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[200], // Keep static for placeholder
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    // color will be set dynamically
  },
  userHandle: {
    fontSize: 14,
    // color will be set dynamically
  },
  inputContainer: {
    position: 'relative',
    // backgroundColor will be set dynamically
    borderRadius: 12,
    borderWidth: 1,
    // borderColor will be set dynamically
    padding: 12,
    minHeight: 80,
  },
  commentInput: {
    fontSize: 16,
    lineHeight: 22,
    // color will be set dynamically
    backgroundColor: 'transparent',
    textAlignVertical: 'top',
    minHeight: 60,
    paddingBottom: 24,
  },
  commentInputError: {
    // borderColor will be set dynamically
  },
  characterCountContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  characterCount: {
    fontSize: 12,
    // color will be set dynamically
    fontWeight: '500',
  },
  characterCountWarning: {
    // color will be set dynamically
  },
  characterCountError: {
    // color will be set dynamically
    fontWeight: '600',
  },
  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  repostText: {
    fontSize: 14,
    // color will be set dynamically
    fontStyle: 'italic',
  },
  originalPost: {
    borderWidth: 1,
    // borderColor will be set dynamically
    borderRadius: 12,
    padding: 16,
    // backgroundColor will be set dynamically
    marginBottom: 20,
  },
  originalPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  originalAuthorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[200], // Keep static for placeholder
  },
  originalAuthorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  originalAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    // color will be set dynamically
  },
  originalAuthorHandle: {
    fontSize: 12,
    // color will be set dynamically
  },
  originalPostContent: {
    fontSize: 16,
    lineHeight: 22,
    // color will be set dynamically
    marginBottom: 12,
  },
  mediaContainer: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    backgroundColor: Colors.neutral[200], // Keep static for placeholder
  },
  singleImage: {
    width: '100%',
    height: 120,
  },
  multipleImages: {
    flex: 1,
    height: 80,
  },
  moreMediaOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMediaText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 