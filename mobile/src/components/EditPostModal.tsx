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
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../hooks/useAuth';

interface EditPostModalProps {
  post: {
    _id: string;
    content: string;
    media?: Array<{
      type: 'image' | 'video';
      url: string;
    }>;
    author: {
      username: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function EditPostModal({ post, isOpen, onClose, onPostUpdated }: EditPostModalProps) {
  const { isSignedIn } = useAuth();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [content, setContent] = useState(post.content);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<any[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [removedImageIndices, setRemovedImageIndices] = useState<number[]>([]);
  const [removedVideoIndices, setRemovedVideoIndices] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setContent(post.content);
      setSelectedImages([]);
      setSelectedVideos([]);
      setImagePreviews([]);
      setVideoPreviews([]);
      setRemovedImageIndices([]);
      setRemovedVideoIndices([]);
    }
  }, [isOpen, post.content]);

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets) {
        const currentMediaCount = (post.media?.length || 0) - removedImageIndices.length - removedVideoIndices.length + selectedImages.length + selectedVideos.length;
        if (currentMediaCount + result.assets.length > 4) {
          Alert.alert('Error', 'You can only upload up to 4 media files total');
          return;
        }

        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image/jpeg',
          name: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
        }));

        setSelectedImages(prev => [...prev, ...newImages]);
        setImagePreviews(prev => [...prev, ...result.assets.map(asset => asset.uri)]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleVideoPicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets) {
        const currentMediaCount = (post.media?.length || 0) - removedImageIndices.length - removedVideoIndices.length + selectedImages.length + selectedVideos.length;
        if (currentMediaCount + result.assets.length > 4) {
          Alert.alert('Error', 'You can only upload up to 4 media files total');
          return;
        }

        // Check video count limit
        const existingVideos = (post.media?.filter((item: any) => item.type === 'video').length || 0) - removedVideoIndices.length;
        if (existingVideos + selectedVideos.length + result.assets.length > 2) {
          Alert.alert('Error', 'You can only upload up to 2 videos per post');
          return;
        }

        const newVideos = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'video/mp4',
          name: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`,
        }));

        setSelectedVideos(prev => [...prev, ...newVideos]);
        setVideoPreviews(prev => [...prev, ...result.assets.map(asset => asset.uri)]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const removeExistingImage = (originalIndex: number) => {
    console.log('Mobile: Removing existing image at index:', originalIndex);
    setRemovedImageIndices(prev => [...prev, originalIndex]);
  };

  const removeExistingVideo = (originalIndex: number) => {
    console.log('Mobile: Removing existing video at index:', originalIndex);
    setRemovedVideoIndices(prev => [...prev, originalIndex]);
  };

  const removeNewImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewVideo = (index: number) => {
    setSelectedVideos(prev => prev.filter((_, i) => i !== index));
    setVideoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdate = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Post content cannot be empty');
      return;
    }

    if (content.length > 1500) {
      Alert.alert('Error', 'Post content cannot exceed 1500 characters');
      return;
    }

    if (!isSignedIn) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    setIsUpdating(true);
    try {

      const formData = new FormData();
      formData.append('content', content.trim());
      
      if (removedImageIndices.length > 0) {
        formData.append('removeImages', JSON.stringify(removedImageIndices));
      }
      
      if (removedVideoIndices.length > 0) {
        formData.append('removeVideos', JSON.stringify(removedVideoIndices));
      }
      
      if (selectedImages.length > 0) {
        selectedImages.forEach((image) => {
          formData.append('media', {
            uri: image.uri,
            type: image.type,
            name: image.name,
          } as any);
        });
      }
      
      if (selectedVideos.length > 0) {
        selectedVideos.forEach((video) => {
          formData.append('media', {
            uri: video.uri,
            type: video.type,
            name: video.name,
          } as any);
        });
      }

      await postsAPI.updatePost(undefined, post._id, formData);

      Alert.alert('Success', 'Post updated successfully!');
      onPostUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating post:', error);
      Alert.alert('Error', error.message || 'Failed to update post');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderExistingMedia = () => {
    if (!post.media?.length) return null;

    return post.media
      .filter((_, index) => {
        const media = post.media![index];
        if (media.type === 'image') {
          return !removedImageIndices.includes(index);
        } else if (media.type === 'video') {
          return !removedVideoIndices.includes(index);
        }
        return true;
      })
      .map((media, index) => {
        const originalIndex = post.media!.findIndex(m => m === media);
        return (
          <View key={`existing-${originalIndex}`} style={styles.mediaContainer}>
            {media.type === 'video' ? (
              <Video
                source={{ uri: media.url }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping={false}
                shouldCorrectPitch={false}
                progressUpdateIntervalMillis={1000}
                onError={(error) => {
                  console.log('EditPostModal existing video error:', error);
                }}
                onLoad={() => {
                  console.log('EditPostModal existing video loaded successfully');
                }}
              />
            ) : (
              <Image source={{ uri: media.url }} style={styles.image} />
            )}
            <TouchableOpacity
              style={styles.removeMediaButton}
              onPress={() => media.type === 'video' ? removeExistingVideo(originalIndex) : removeExistingImage(originalIndex)}
            >
              <Icon name="x" size={16} color="white" />
            </TouchableOpacity>
          </View>
        );
      });
  };

  const renderNewMedia = () => {
    const allNewMedia = [
      ...imagePreviews.map((uri, index) => ({ type: 'image', uri, index, originalIndex: index })),
      ...videoPreviews.map((uri, index) => ({ type: 'video', uri, index, originalIndex: index }))
    ];

    if (!allNewMedia.length) return null;

    return allNewMedia.map((media) => (
      <View key={`new-${media.type}-${media.originalIndex}`} style={styles.mediaContainer}>
        {media.type === 'video' ? (
          <Video
            source={{ uri: media.uri }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
            isLooping={false}
            shouldCorrectPitch={false}
            progressUpdateIntervalMillis={1000}
            onError={(error) => {
              console.log('EditPostModal new video error:', error);
            }}
            onLoad={() => {
              console.log('EditPostModal new video loaded successfully');
            }}
          />
        ) : (
          <Image source={{ uri: media.uri }} style={styles.image} />
        )}
        <TouchableOpacity
          style={styles.removeMediaButton}
          onPress={() => media.type === 'video' ? removeNewVideo(media.originalIndex) : removeNewImage(media.originalIndex)}
        >
          <Icon name="x" size={16} color="white" />
        </TouchableOpacity>
      </View>
    ));
  };

  const characterLimit = 1500;
  const remainingChars = characterLimit - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background.primary, borderBottomColor: colors.neutral[200] }]}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: colors.text.secondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text.primary }]}>Edit Post</Text>
          <TouchableOpacity 
            onPress={handleUpdate} 
            disabled={isUpdating || !content.trim() || isOverLimit}
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary[500] },
              (isUpdating || !content.trim() || isOverLimit) && { backgroundColor: colors.neutral[300] }
            ]}
          >
            <Text style={[
              styles.saveText,
              { color: 'white' },
              (isUpdating || !content.trim() || isOverLimit) && { color: colors.neutral[500] }
            ]}>
              {isUpdating ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Content Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.textInput, { color: colors.text.primary }]}
              value={content}
              onChangeText={setContent}
              placeholder="What's happening?"
              placeholderTextColor={colors.text.secondary}
              multiline
              maxLength={1500}
              textAlignVertical="top"
            />
          </View>

          {/* Character Count */}
          <View style={styles.characterCount}>
            <Text style={[
              styles.characterCountText,
              { color: colors.text.secondary },
              isOverLimit && { color: colors.error[500] }
            ]}>
              {content.length}/1500
            </Text>
          </View>

          {/* Media */}
          {(post.media?.length || imagePreviews.length || videoPreviews.length) && (
            <View style={styles.mediaContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {renderExistingMedia()}
                {renderNewMedia()}
              </ScrollView>
            </View>
          )}

          {/* Add Media Buttons */}
          <View style={styles.addMediaButtons}>
            <TouchableOpacity 
              style={[styles.addImageButton, { 
                borderColor: colors.primary[500],
                backgroundColor: `${colors.primary[500]}10`
              }]} 
              onPress={handleImagePicker}
              disabled={isUpdating}
            >
              <Icon name="image" size={20} color={colors.primary[500]} />
              <Text style={[styles.addImageText, { color: colors.primary[500] }]}>Add Image</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.addVideoButton, { 
                borderColor: colors.primary[500],
                backgroundColor: `${colors.primary[500]}10`
              }]} 
              onPress={handleVideoPicker}
              disabled={isUpdating}
            >
              <Icon name="video" size={20} color={colors.primary[500]} />
              <Text style={[styles.addVideoText, { color: colors.primary[500] }]}>Add Video</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    // Background color applied dynamically
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveTextDisabled: {
    // Color applied dynamically
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
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  characterCountText: {
    fontSize: 14,
  },
  characterCountError: {
    // Color applied dynamically
  },
  mediaContainer: {
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  video: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addImageText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  addMediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  addVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addVideoText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
}); 