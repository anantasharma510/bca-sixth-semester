import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView, 
  Image,
  Alert,
  Dimensions
} from 'react-native';
import { postsAPI } from '../services/api/posts';
import { Colors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../hooks/useAuth';
import { getDisplayName } from '../utils/user';

interface EditRepostModalProps {
  repost: {
    _id: string;
    repostComment?: string;
    comment?: string;
    originalPost: {
      _id: string;
      content: string;
      author: {
        username: string;
        firstName?: string;
        lastName?: string;
        profileImageUrl?: string;
      };
      media?: Array<{
        type: 'image' | 'video';
        url: string;
      }>;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  onRepostUpdated: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function EditRepostModal({ repost, isOpen, onClose, onRepostUpdated }: EditRepostModalProps) {
  const { isSignedIn } = useAuth();
  const initialComment = repost.repostComment || repost.comment || '';
  const [comment, setComment] = useState(initialComment);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentComment = repost.repostComment || repost.comment || '';
      console.log('EditRepostModal: Modal opened with repost data:', repost);
      console.log('EditRepostModal: Current comment:', currentComment);
      setComment(currentComment);
    }
  }, [isOpen, repost.repostComment, repost.comment]);

  const handleUpdate = async () => {
    if (comment.length > 1500) {
      Alert.alert('Error', 'Repost comment cannot exceed 1500 characters');
      return;
    }

    console.log('EditRepostModal: Starting update for repost:', repost._id);
    console.log('EditRepostModal: Comment to update:', comment);

    if (!isSignedIn) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await postsAPI.updateRepost(undefined, repost._id, comment.trim() || undefined);
      console.log('EditRepostModal: Update successful:', result);

      Alert.alert('Success', 'Repost updated successfully!');
      onRepostUpdated();
      onClose();
    } catch (error: any) {
      console.error('EditRepostModal: Update failed:', error);
      const errorMessage = error?.message || 'Failed to update repost';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatAuthorName = (author: any) => getDisplayName(author, author?.username || 'User');

  const characterLimit = 1500;
  const remainingChars = characterLimit - comment.length;
  const isOverLimit = remainingChars < 0;

  const renderOriginalPostImages = () => {
    if (!repost.originalPost.media?.length) return null;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.originalImagesContainer}>
        {repost.originalPost.media.map((media, index) => (
          <Image key={index} source={{ uri: media.url }} style={styles.originalImage} />
        ))}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Repost</Text>
          <TouchableOpacity 
            onPress={handleUpdate} 
            disabled={isUpdating || isOverLimit}
            style={[
              styles.saveButton,
              (isUpdating || isOverLimit) && styles.saveButtonDisabled
            ]}
          >
            <Text style={[
              styles.saveText,
              (isUpdating || isOverLimit) && styles.saveTextDisabled
            ]}>
              {isUpdating ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Comment Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Add your thoughts..."
              placeholderTextColor={Colors.text.secondary}
              multiline
              maxLength={1500}
              textAlignVertical="top"
            />
          </View>

          {/* Character Count */}
          <View style={styles.characterCount}>
            <Text style={[
              styles.characterCountText,
              isOverLimit && styles.characterCountError
            ]}>
              {comment.length}/1500
            </Text>
          </View>

          {/* Original Post Preview */}
          <View style={styles.originalPostContainer}>
            <View style={styles.originalPostHeader}>
              <View style={styles.originalPostAuthorInfo}>
                <Image 
                  source={{ 
                    uri: repost.originalPost.author.profileImageUrl || 
                         'https://via.placeholder.com/40x40.png?text=User'
                  }} 
                  style={styles.originalPostAvatar} 
                />
                <View style={styles.originalPostAuthorDetails}>
                  <Text style={styles.originalPostAuthorName} numberOfLines={1}>
                    {formatAuthorName(repost.originalPost.author)}
                  </Text>
                  <Text style={styles.originalPostUsername} numberOfLines={1}>
                    @{repost.originalPost.author.username}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.originalPostContent}>
              <Text style={styles.originalPostText}>{repost.originalPost.content}</Text>
              {renderOriginalPostImages()}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    backgroundColor: Colors.background.primary,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  saveButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  saveText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: Colors.neutral[500],
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  textInput: {
    fontSize: 16,
    color: Colors.text.primary,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    paddingBottom: 12,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  characterCountText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  characterCountError: {
    color: Colors.error[500],
  },
  originalPostContainer: {
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    padding: 16,
    backgroundColor: Colors.neutral[50],
  },
  originalPostHeader: {
    marginBottom: 12,
  },
  originalPostAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[200],
  },
  originalPostAuthorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  originalPostAuthorName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  originalPostUsername: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  originalPostContent: {
    gap: 12,
  },
  originalPostText: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  originalImagesContainer: {
    maxHeight: 200,
  },
  originalImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: Colors.neutral[100],
  },
}); 