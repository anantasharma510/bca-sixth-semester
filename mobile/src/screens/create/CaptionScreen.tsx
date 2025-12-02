import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { getColors } from '../../constants/colors';
import { CreationHeader } from './components/CreationHeader';
import { SelectedPreview } from './components/SelectedPreview';
import type { PostCreationStackParamList } from './PostCreationNavigator';
import type { SelectedMediaItem } from './types';
import { filterContent } from '../../utils/contentFilter';
import { validateImageWithFileInfo, getMobileImageViolationMessage } from '../../utils/imageFilter';
import { postsAPI } from '../../services/api/posts';
import { useAuth } from '../../hooks/useAuth';

type CaptionScreenProps = StackScreenProps<PostCreationStackParamList, 'Caption'>;

const MAX_CAPTION_LENGTH = 1500;

const validateVideoFile = (file: { size?: number; type?: string }) => {
  const maxSize = 50 * 1024 * 1024; // 50MB for mobile
  const allowedTypes = ['video/mp4', 'video/quicktime'];

  if (file.size && file.size > maxSize) {
    return { isValid: false, error: 'Video file size must be less than 50MB for mobile' };
  }

  if (file.type && !allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Only MP4 and MOV video formats are supported on mobile' };
  }

  return { isValid: true };
};

export const CaptionScreen: React.FC<CaptionScreenProps> = ({ navigation, route }) => {
  const { selectedMedia: initialMedia, onPostCreated } = route.params;
  const [media, setMedia] = useState<SelectedMediaItem[]>(initialMedia);
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { theme } = useTheme();
  const colors = getColors(theme);
  const { isSignedIn } = useAuth();

  const primaryMedia = media[0];
  const remainingChars = MAX_CAPTION_LENGTH - caption.length;

  const handleRemoveMedia = useCallback(
    (id: string) => {
      const filtered = media.filter((item) => item.id !== id).map((item, index) => ({
        ...item,
        order: index + 1,
      }));
      setMedia(filtered);
    },
    [media]
  );

  const ensureFileUri = useCallback(async (asset: SelectedMediaItem) => {
    if (asset.localUri.startsWith('file://')) {
      return asset.localUri;
    }

    if (Platform.OS === 'android') {
      try {
        return await FileSystem.getContentUriAsync(asset.localUri);
      } catch (error) {
        console.warn('Failed to convert URI to content://', error);
      }
    }

    if (asset.localUri.startsWith('ph://') || asset.localUri.startsWith('content://')) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);
        if (info.localUri) {
          return info.localUri;
        }
      } catch (error) {
        console.warn('Failed to resolve asset info for upload', error);
      }
    }

    return asset.localUri;
  }, []);

  const handlePost = useCallback(async () => {
    if (isPosting) return;
    if (!media.length) {
      Alert.alert('Add media', 'Select at least one photo or video to share.');
      return;
    }
    if (!isSignedIn) {
      Alert.alert('Sign in required', 'Please sign in to share a post.');
      return;
    }
    if (caption.length > MAX_CAPTION_LENGTH) {
      Alert.alert('Caption too long', `Your caption is ${Math.abs(remainingChars)} characters over the limit.`);
      return;
    }

    if (caption.trim().length) {
      try {
        const check = await filterContent(caption.trim());
        if (!check.isClean) {
          Alert.alert('Content blocked', check.message || 'Your caption violates community guidelines.');
          return;
        }
      } catch (error) {
        console.error('Content filtering error', error);
        Alert.alert('Error', 'We could not verify your caption. Please try again.');
        return;
      }
    }

    setIsPosting(true);

    try {
      const formData = new FormData();

      if (caption.trim()) {
        formData.append('content', caption.trim());
      }

      for (let index = 0; index < media.length; index += 1) {
        const item = media[index];
        const uploadUri = await ensureFileUri(item);
        const fileInfo = await FileSystem.getInfoAsync(uploadUri, { size: true });

        if (!fileInfo.exists) {
          throw new Error('Selected media no longer exists on device');
        }

        const filename =
          item.filename ||
          `media_${index}.${item.mediaType === 'video' ? 'mp4' : 'jpg'}`;

        if (item.mediaType === 'image') {
          try {
            const validation = await validateImageWithFileInfo(
              uploadUri,
              fileInfo.size,
              filename
            );

            if (!validation.isClean) {
              const message = getMobileImageViolationMessage(validation.violations);
              Alert.alert('Image blocked', `${filename}: ${message}`);
              setIsPosting(false);
              return;
            }
          } catch (error) {
            console.error('Image validation failed', error);
            Alert.alert('Error', `Unable to process ${filename}. Please try again.`);
            setIsPosting(false);
            return;
          }
        } else {
          const validation = validateVideoFile({ size: fileInfo.size, type: 'video/mp4' });
          if (!validation.isValid) {
            Alert.alert('Video blocked', validation.error || 'This video is not supported.');
            setIsPosting(false);
            return;
          }
        }

        (formData as any).append('media', {
          uri: uploadUri,
          type: item.mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
          name: filename,
        });
      }

      await postsAPI.createPost(undefined, formData);

      setCaption('');
      setMedia([]);
      navigation.popToTop();
      onPostCreated?.();
    } catch (error: any) {
      console.error('Post creation failed', error);
      Alert.alert(
        'Upload failed',
        error?.message || 'We could not share your post. Please try again.'
      );
    } finally {
      setIsPosting(false);
    }
  }, [
    caption,
    ensureFileUri,
    media,
    navigation,
    onPostCreated,
    remainingChars,
    isSignedIn,
    isPosting,
  ]);

  const renderSelectedStrip = useMemo(() => {
    if (media.length <= 1) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripContainer}
      >
        {media.map((item) => {
          const isPrimary = item.id === primaryMedia?.id;
          return (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(item.order * 40)}
              style={[
                styles.stripItem,
                { borderColor: isPrimary ? '#FF6B2C' : 'transparent' },
              ]}
            >
              <View style={styles.stripThumbnail}>
                <Image
                  source={{ uri: item.displayUri }}
                  style={styles.stripImage}
                />
                {item.mediaType === 'video' ? (
                  <View style={styles.stripVideoBadge}>
                    <Ionicons name="play" size={14} color="#ffffff" />
                  </View>
                ) : null}
              </View>
              <View style={styles.stripActions}>
                <Text style={styles.stripLabel}>
                  {item.mediaType === 'video' ? 'Video' : 'Photo'} #{item.order}
                </Text>
                <Text
                  style={styles.stripRemove}
                  onPress={() => handleRemoveMedia(item.id)}
                >
                  Remove
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    );
  }, [handleRemoveMedia, media, primaryMedia?.id]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 32 : 0}
    >
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <CreationHeader
          title="New Post"
          onBack={() => navigation.goBack()}
          rightLabel={isPosting ? 'Posting…' : 'Post'}
          rightDisabled={isPosting || !media.length}
          onRightPress={handlePost}
        />

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <SelectedPreview asset={primaryMedia} placeholderLabel="Pick media to start crafting your story." />

          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: colors.background.secondary,
                borderColor: theme === 'light' ? 'rgba(148,163,184,0.2)' : 'rgba(255,255,255,0.05)',
              },
            ]}
          >
            <TextInput
              style={[styles.captionInput, { color: colors.text.primary }]}
              value={caption}
              onChangeText={setCaption}
              placeholder="What's happening?"
              placeholderTextColor={colors.text.secondary}
              multiline
              maxLength={MAX_CAPTION_LENGTH}
              editable={!isPosting}
            />
            <View style={styles.captionFooter}>
              <View style={styles.captionFooterLeft}>
                <Ionicons name="create-outline" size={16} color={colors.text.secondary} />
                <Text style={[styles.captionHint, { color: colors.text.secondary }]}>
                  Keep it short & uplifting.
                </Text>
              </View>
              <Text
                style={[
                  styles.charCount,
                  { color: remainingChars < 0 ? '#ef4444' : colors.text.secondary },
                ]}
              >
                {remainingChars}
              </Text>
            </View>
          </View>

          {renderSelectedStrip}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  inputCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 24,
  },
  captionInput: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  captionFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  captionFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  captionHint: {
    fontSize: 13,
  },
  charCount: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  stripContainer: {
    paddingVertical: 8,
    paddingRight: 16,
    gap: 12,
  },
  stripItem: {
    width: 160,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.02)',
  },
  stripThumbnail: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
  },
  stripImage: {
    width: '100%',
    height: '100%',
  },
  stripVideoBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripActions: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(15,23,42,0.04)',
  },
  stripLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  stripRemove: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
});

