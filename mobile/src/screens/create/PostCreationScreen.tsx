import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  PermissionsAndroid,
  useWindowDimensions,
} from 'react-native';
import Constants from 'expo-constants';
import type { StackScreenProps } from '@react-navigation/stack';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeInDown,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { getColors } from '../../constants/colors';
import { CreationHeader } from './components/CreationHeader';
import type { PostCreationStackParamList } from './PostCreationNavigator';
import type {
  DeviceMediaAsset,
  SelectedMediaItem,
} from './types';
import { useAuth } from '../../hooks/useAuth';
import * as FileSystem from 'expo-file-system';
import { postsAPI } from '../../services/api/posts';
import { filterContent } from '../../utils/contentFilter';
import {
  validateImageWithFileInfo,
  getMobileImageViolationMessage,
} from '../../utils/imageFilter';
import { MediaGrid } from './components/MediaGrid';

type PostCreationScreenProps = StackScreenProps<PostCreationStackParamList, 'Composer'>;

const PAGE_SIZE = 60;
const MAX_SELECTION = 4;
const validateVideoFile = (file: { size?: number; type?: string }) => {
  const maxSize = 50 * 1024 * 1024;
  const allowedTypes = ['video/mp4', 'video/quicktime'];

  if (file.size && file.size > maxSize) {
    return {
      isValid: false,
      error: 'Video file size must be less than 50MB for mobile.',
    };
  }

  if (file.type && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only MP4 and MOV video formats are supported on mobile.',
    };
  }

  return { isValid: true };
};

export const PostCreationScreen: React.FC<PostCreationScreenProps> = ({
  navigation,
  route,
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const { isSignedIn } = useAuth();
  const { width, height } = useWindowDimensions();
  
  // Responsive scale factor based on screen size
  const scaleFactor = useMemo(() => Math.min(width / 375, height / 812), [width, height]);

  const [permissionStatus, setPermissionStatus] = useState<
    MediaLibrary.PermissionStatus | ImagePicker.PermissionStatus
  >('undetermined');
  const [accessLevel, setAccessLevel] =
    useState<MediaLibrary.PermissionResponse['accessPrivileges']>('none');
  const [permissionsResolved, setPermissionsResolved] = useState(false);
  const [assets, setAssets] = useState<DeviceMediaAsset[]>([]);
  const [selected, setSelected] = useState<SelectedMediaItem[]>([]);
  const assetsRef = useRef<DeviceMediaAsset[]>([]);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const galleryRef = useRef<View | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [initialFetchCompleted, setInitialFetchCompleted] = useState(false);

  const onPostCreatedRef = useRef(route.params?.onPostCreated);

  const isExpoGo = Constants.appOwnership === 'expo';

  const ensureAndroidRuntimePermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 33) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        ]);

        const denied = Object.values(result).some(
          (status) => status !== PermissionsAndroid.RESULTS.GRANTED,
        );

        return !denied;
      }

      const legacy = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );

      return legacy === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.warn('Android runtime permission request failed', error);
      return false;
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      let runtimeGranted = true;
      if (!isExpoGo) {
        runtimeGranted = await ensureAndroidRuntimePermission();
        if (!runtimeGranted) {
          setPermissionsResolved(true);
          setPermissionStatus('denied');
          return;
        }
      }

      const pickerPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[PostCreation] picker permission:', pickerPermission);
      const libraryPermission =
        Platform.OS === 'ios'
          ? await MediaLibrary.requestPermissionsAsync({ accessPrivileges: 'all' })
          : await MediaLibrary.requestPermissionsAsync();
      console.log('[PostCreation] media library permission:', libraryPermission);

      const resolvedStatus =
        libraryPermission.status === 'undetermined'
          ? pickerPermission.status
          : libraryPermission.status;

      setPermissionStatus(resolvedStatus);
      setAccessLevel(libraryPermission.accessPrivileges ?? 'none');
      setPermissionsResolved(true);

      if (
        resolvedStatus === 'granted' ||
        libraryPermission.granted ||
        libraryPermission.accessPrivileges === 'limited'
      ) {
        console.log('[PostCreation] permissions granted, loading assets');
        await loadAssets();
      }
    } catch (error) {
      console.error('Failed to request media permissions', error);
      Alert.alert(
        'Permission Error',
        'Unable to access your gallery. Please try again.',
      );
    } finally {
      setPermissionsResolved(true);
    }
  }, [ensureAndroidRuntimePermission, loadAssets]);

  const loadAssets = useCallback(
    async (afterCursor?: string | null) => {
      if (afterCursor && !hasNextPage) return;

      const isPaginating = Boolean(afterCursor);

      try {
        if (isPaginating) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }

        // Only load device gallery images (camera roll)
        // Do NOT include recently posted images or selected images
        const result = await MediaLibrary.getAssetsAsync({
          first: PAGE_SIZE,
          after: afterCursor ?? undefined,
          mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
          sortBy: [MediaLibrary.SortBy.creationTime],
        });
        console.log(
          '[PostCreation] fetched assets batch:',
          result.assets.length,
          'hasNextPage:',
          result.hasNextPage,
          'afterCursor param:',
          afterCursor,
        );

        const normalizedRaw = await Promise.all(
          result.assets.map(async (asset): Promise<DeviceMediaAsset | null> => {
            let uri = asset.uri || asset.localUri || '';
            let filename = asset.filename ?? null;

            const needsInfoLookup =
              !uri ||
              uri.startsWith('ph://') ||
              uri.startsWith('assets-library://');

            if (needsInfoLookup) {
              try {
                const info = await MediaLibrary.getAssetInfoAsync(asset.id);
                uri = info.localUri || info.uri || uri;
                filename = info.filename ?? filename;
              } catch (error) {
                console.warn('Unable to resolve asset uri', error);
              }
            }

            if (!uri) {
              return null;
            }

            return {
              id: asset.id,
              uri,
              filename,
              mediaType: asset.mediaType,
              width: asset.width,
              height: asset.height,
              duration: asset.duration,
              creationTime: asset.creationTime,
            };
          }),
        );

        const normalized = normalizedRaw.filter(Boolean) as DeviceMediaAsset[];

        setAssets((prev) => {
          const next = isPaginating ? [...prev, ...normalized] : normalized;
          assetsRef.current = next;
          console.log(
            '[PostCreation] normalized assets length:',
            normalized.length,
            'state length:',
            next.length,
          );
          return next;
        });
        setEndCursor(result.endCursor ?? null);
        setHasNextPage(result.hasNextPage);
        setInitialFetchCompleted(true);
      } catch (error) {
        console.error('Failed to load media assets', error);
        Alert.alert(
          'Error',
          'We could not load your recent photos. Please try again.',
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [hasNextPage],
  );

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const libraryPermission = await MediaLibrary.getPermissionsAsync();
        console.log('[PostCreation] existing media permissions:', libraryPermission);

        if (isMounted) {
          setPermissionStatus(libraryPermission.status);
          setAccessLevel(libraryPermission.accessPrivileges ?? 'none');
          setPermissionsResolved(true);
        }
      } catch (error) {
        console.error('Failed to retrieve media permissions', error);
        setPermissionsResolved(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (permissionStatus === 'undetermined') {
      requestPermissions();
    } else if (permissionsResolved) {
      const hasAccess =
        permissionStatus === 'granted' ||
        accessLevel === 'all' ||
        accessLevel === 'limited';
      if (hasAccess && !initialFetchCompleted) {
        loadAssets();
      }
    }
  }, [
    accessLevel,
    initialFetchCompleted,
    loadAssets,
    permissionStatus,
    permissionsResolved,
    requestPermissions,
  ]);

  useFocusEffect(
    useCallback(() => {
      const isGranted =
        permissionStatus === 'granted' ||
        accessLevel === 'all' ||
        accessLevel === 'limited';

      if (isGranted && !initialFetchCompleted) {
        if (!isExpoGo) {
          loadAssets();
        }
      }
    }, [accessLevel, permissionStatus, initialFetchCompleted, loadAssets, isExpoGo]),
  );

  const selectedOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    selected.forEach((item, index) => {
      map.set(item.id, index + 1);
    });
    return map;
  }, [selected]);

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

    if (
      asset.localUri.startsWith('ph://') ||
      asset.localUri.startsWith('content://')
    ) {
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

  const handleToggleAsset = useCallback(
    async (asset: DeviceMediaAsset) => {
      const existingIndex = selected.findIndex((item) => item.id === asset.id);

      if (existingIndex >= 0) {
        const updated = selected
          .filter((item) => item.id !== asset.id)
          .map((item, index) => ({ ...item, order: index + 1 }));
        setSelected(updated);
        return;
      }

      if (selected.length >= MAX_SELECTION) {
        Alert.alert(
          'Selection Limit',
          `You can attach up to ${MAX_SELECTION} items.`,
        );
        return;
      }

      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);
        const resolvedUri = info.localUri || info.uri || asset.uri;

        if (!resolvedUri) {
          Alert.alert(
            'Unavailable',
            'This media could not be accessed. Try a different one.',
          );
          return;
        }

        const mediaType =
          asset.mediaType === MediaLibrary.MediaType.video ? 'video' : 'image';

        const newItem: SelectedMediaItem = {
          id: asset.id,
          displayUri: asset.uri || resolvedUri,
          localUri: resolvedUri,
          filename: info.filename ?? asset.filename ?? null,
          mediaType,
          width: asset.width,
          height: asset.height,
          duration: asset.duration ?? info.duration,
          order: selected.length + 1,
        };

        setSelected((prev) => [...prev, newItem]);
      } catch (error) {
        console.error('Failed to select asset', error);
        Alert.alert(
          'Error',
          'We could not open this media. Please try another.',
        );
      }
    },
    [selected],
  );

  const handleRemoveMedia = useCallback((id: string) => {
    setSelected((prev) =>
      prev
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, order: index + 1 })),
    );
  }, []);

  const handleOpenSystemPicker = useCallback(async () => {
    try {
      const remainingSlots = MAX_SELECTION - selected.length;
      if (remainingSlots <= 0) {
        Alert.alert(
          'Selection Limit',
          `You can attach up to ${MAX_SELECTION} media items.`,
        );
        return;
      }

      // Scroll to gallery section when opening picker (expands the view)
      setTimeout(() => {
        if (galleryRef.current && scrollViewRef.current) {
          galleryRef.current.measureLayout(
            scrollViewRef.current as any,
            (x, y) => {
              scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
            },
            () => {}
          );
        }
      }, 100);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 1,
        selectionLimit: remainingSlots,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const assetsToUse = result.assets.slice(0, remainingSlots);

      const newSelections: SelectedMediaItem[] = assetsToUse.map(
        (asset, index) => {
          const id = asset.assetId ?? asset.uri ?? `picker-${Date.now()}-${index}`;
          const mediaType = asset.type?.startsWith('video') ? 'video' : 'image';
          return {
            id,
            displayUri: asset.uri,
            localUri: asset.localUri ?? asset.uri,
            filename:
              (asset as any).fileName ??
              asset.fileName ??
              asset.filename ??
              null,
            mediaType,
            width: asset.width ?? 0,
            height: asset.height ?? 0,
            duration: asset.duration,
            order: selected.length + index + 1,
          };
        },
      );

      if (!newSelections.length) {
        return;
      }

      // Only add to selected, NOT to the gallery assets
      // Gallery should only show device gallery images, not selected images
      setSelected((prev) => [...prev, ...newSelections]);
    } catch (error) {
      console.error('Failed to open system picker', error);
      Alert.alert(
        'Error',
        'Unable to open your library. Please try again.',
      );
    }
  }, [selected.length]);

  const canPost =
    (inputValue.trim().length > 0 || selected.length > 0) && !isPosting;

  const remainingChars = 280 - inputValue.length;

  const handlePost = useCallback(async () => {
    if (!canPost) return;

    if (!isSignedIn) {
      Alert.alert('Sign in required', 'Please sign in to share a post.');
      return;
    }

    if (inputValue.trim().length) {
      try {
        const check = await filterContent(inputValue.trim());
        if (!check.isClean) {
          Alert.alert(
            'Content blocked',
            check.message || 'Your post violates community guidelines.',
          );
          return;
        }
      } catch (error) {
        console.error('Content filtering error', error);
        Alert.alert(
          'Error',
          'We could not verify your content. Please try again.',
        );
        return;
      }
    }

    setIsPosting(true);

    try {
      const formData = new FormData();

      if (inputValue.trim()) {
        formData.append('content', inputValue.trim());
      }

      for (let index = 0; index < selected.length; index += 1) {
        const item = selected[index];
        const uploadUri = await ensureFileUri(item);
        const fileInfo = await FileSystem.getInfoAsync(uploadUri, {
          size: true,
        });

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
              filename,
            );

            if (!validation.isClean) {
              const message = getMobileImageViolationMessage(
                validation.violations,
              );
              Alert.alert('Image blocked', `${filename}: ${message}`);
              setIsPosting(false);
              return;
            }
          } catch (error) {
            console.error('Image validation failed', error);
            Alert.alert(
              'Error',
              `Unable to process ${filename}. Please try again.`,
            );
            setIsPosting(false);
            return;
          }
        } else {
          const validation = validateVideoFile({
            size: fileInfo.size,
            type: 'video/mp4',
          });
          if (!validation.isValid) {
            Alert.alert(
              'Video blocked',
              validation.error || 'This video is not supported.',
            );
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

      setInputValue('');
      setSelected([]);
      onPostCreatedRef.current?.();
      navigation.goBack();
    } catch (error: any) {
      console.error('Post creation failed', error);
      Alert.alert(
        'Upload failed',
        error?.message || 'We could not share your post. Please try again.',
      );
    } finally {
      setIsPosting(false);
    }
  }, [
    canPost,
    ensureFileUri,
    inputValue,
    isSignedIn,
    navigation,
    selected,
  ]);

  const renderPreviewItem = useCallback(
    (item: SelectedMediaItem) => {
      const chipSize = Math.max(70, width * 0.224); // ~84px on 375px
      const chipPadding = Math.max(4, width * 0.016); // ~6px on 375px
      const chipBorderRadius = Math.max(14, width * 0.048); // ~18px on 375px
      const innerBorderRadius = Math.max(12, width * 0.037); // ~14px on 375px
      const badgeSize = Math.max(18, width * 0.059); // ~22px on 375px
      const iconSize = Math.max(12, 14 * scaleFactor);
      const badgeFontSize = Math.max(10, 12 * scaleFactor);
      
      return (
        <Animated.View
          key={item.id}
          entering={FadeInDown.springify().stiffness(160).damping(18)}
          exiting={FadeOut.duration(120)}
          style={[
            styles.previewChip,
            {
              backgroundColor: colors.background.secondary,
              borderColor:
                theme === 'light'
                  ? 'rgba(148,163,184,0.32)'
                  : 'rgba(148,163,184,0.18)',
              width: chipSize,
              height: chipSize,
              borderRadius: chipBorderRadius,
              padding: chipPadding,
            },
          ]}
        >
          <Image
            source={{ uri: item.displayUri }}
            style={[
              styles.previewChipImage,
              { borderRadius: innerBorderRadius },
            ]}
          />
          <TouchableOpacity
            style={[
              styles.previewChipRemove,
              {
                top: chipPadding,
                right: chipPadding,
                width: badgeSize * 0.95,
                height: badgeSize * 0.95,
                borderRadius: (badgeSize * 0.95) / 2,
              },
            ]}
            onPress={() => handleRemoveMedia(item.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={iconSize} color="#ffffff" />
          </TouchableOpacity>
          <View style={[
            styles.previewChipBadge,
            {
              bottom: chipPadding,
              left: chipPadding,
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
            },
          ]}>
            <Text style={[
              styles.previewChipBadgeText,
              { fontSize: badgeFontSize },
            ]}>
              {item.order}
            </Text>
          </View>
        </Animated.View>
      );
    },
    [colors.background.secondary, handleRemoveMedia, theme, width, scaleFactor],
  );

  const headerContent = useMemo(() => {
    const remaining = remainingChars;
    // Responsive padding and sizes
    const headerPadding = width * 0.053; // ~20px on 375px
    const headerPaddingTop = Math.max(12, height * 0.02);
    const headerPaddingBottom = Math.max(12, height * 0.02);
    const inputPadding = width * 0.048; // ~18px on 375px
    const inputPaddingVertical = Math.max(12, height * 0.02);
    const borderRadius = width * 0.053; // ~20px on 375px
    const iconSize = Math.max(16, 18 * scaleFactor);
    const buttonFontSize = Math.max(13, 14 * scaleFactor);
    const charCountFontSize = Math.max(12, 13 * scaleFactor);
    const inputFontSize = Math.max(15, 16 * scaleFactor);
    const inputMinHeight = Math.max(80, height * 0.12);
    
    return (
      <View style={[
        styles.headerContent,
        {
          paddingHorizontal: headerPadding,
          paddingTop: headerPaddingTop,
          paddingBottom: headerPaddingBottom,
        },
      ]}>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor:
                theme === 'light' ? '#ffffff' : colors.background.secondary,
              borderColor:
                theme === 'light'
                  ? 'rgba(15,23,42,0.08)'
                  : 'rgba(255,255,255,0.08)',
              borderRadius,
              paddingHorizontal: inputPadding,
              paddingVertical: inputPaddingVertical,
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.text.primary,
                fontSize: inputFontSize,
                minHeight: inputMinHeight,
              },
            ]}
            placeholder="What's happening?"
            placeholderTextColor={colors.text.secondary}
            value={inputValue}
            onChangeText={setInputValue}
            multiline
            maxLength={280}
            editable={!isPosting}
            blurOnSubmit={false}
          />
          <View style={[
            styles.inputFooter,
            { marginTop: Math.max(10, height * 0.015) },
          ]}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.mediaPickerButton}
                onPress={handleOpenSystemPicker}
                disabled={selected.length >= MAX_SELECTION}
              >
                <Ionicons name="images-outline" size={iconSize} color="#1DA1F2" />
                <Text style={[
                  styles.mediaPickerButtonText,
                  { fontSize: buttonFontSize },
                ]}>
                  Browse library
                </Text>
              </TouchableOpacity>
              {/* Go Live button removed - Live streaming disabled */}
            </View>
            <Text
              style={[
                styles.charCount,
                {
                  color:
                    remaining < 0
                      ? '#ef4444'
                      : remaining <= 20
                        ? '#f59e0b'
                        : colors.text.secondary,
                  fontSize: charCountFontSize,
                },
              ]}
            >
              {remaining}
            </Text>
          </View>
        </View>

        {selected.length ? (
          <View style={[
            styles.previewRow,
            {
              marginTop: Math.max(12, height * 0.02),
              gap: Math.max(10, width * 0.032), // ~12px on 375px
            },
          ]}>
            {selected.map(renderPreviewItem)}
          </View>
        ) : null}
      </View>
    );
  }, [
    colors.background.secondary,
    colors.text.primary,
    colors.text.secondary,
    handleOpenSystemPicker,
    inputValue,
    isPosting,
    remainingChars,
    renderPreviewItem,
    selected.length,
    theme,
    width,
    height,
    scaleFactor,
  ]);

  const handlePermissionDenied = useCallback(() => {
    const containerPadding = Math.max(20, width * 0.064); // ~24px on 375px
    const containerBorderRadius = width * 0.064; // ~24px on 375px
    const titleFontSize = Math.max(16, 18 * scaleFactor);
    const messageFontSize = Math.max(13, 14 * scaleFactor);
    const buttonFontSize = Math.max(14, 15 * scaleFactor);
    const gap = Math.max(10, height * 0.015);
    
    return (
      <View style={[
        styles.permissionContainer,
        {
          borderRadius: containerBorderRadius,
          padding: containerPadding,
          gap,
        },
      ]}>
        <Text style={[
          styles.permissionTitle,
          {
            color: colors.text.primary,
            fontSize: titleFontSize,
          },
        ]}>
          Allow gallery access
        </Text>
        <Text style={[
          styles.permissionMessage,
          {
            color: colors.text.secondary,
            fontSize: messageFontSize,
          },
        ]}>
          We need permission to show your recent photos and videos. Enable access in
          Settings to continue.
        </Text>
        <View style={styles.permissionActions}>
          <Text
            onPress={() => Linking.openSettings()}
            style={[
              styles.permissionButton,
              {
                color: '#1DA1F2',
                fontSize: buttonFontSize,
              },
            ]}
          >
            Open Settings
          </Text>
          <Text
            onPress={requestPermissions}
            style={[
              styles.permissionButton,
              {
                color: colors.text.secondary,
                fontSize: buttonFontSize,
              },
            ]}
          >
            Try again
          </Text>
        </View>
      </View>
    );
  }, [colors.text.primary, colors.text.secondary, requestPermissions, width, height, scaleFactor]);

  const isPermissionGranted =
    permissionStatus === 'granted' ||
    accessLevel === 'all' ||
    accessLevel === 'limited';

  const fallbackPickerTriggered = useRef(false);

  useEffect(() => {
    if (
      permissionsResolved &&
      assets.length === 0 &&
      isPermissionGranted &&
      isExpoGo &&
      !fallbackPickerTriggered.current
    ) {
      fallbackPickerTriggered.current = true;
      // Expo Go cannot enumerate the library, so immediately prompt the user to choose media.
      handleOpenSystemPicker();
    }
  }, [assets.length, handleOpenSystemPicker, isExpoGo, isPermissionGranted, permissionsResolved]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      <CreationHeader
        title="What’s happening?"
        onBack={() => navigation.goBack()}
        rightLabel={isPosting ? 'Posting…' : 'Post'}
        rightDisabled={!canPost}
        onRightPress={handlePost}
      />

      {!permissionsResolved ? null : !isPermissionGranted ? (
        <View style={[
          styles.permissionWrapper,
          { paddingHorizontal: Math.max(20, width * 0.064) },
        ]}>
          {handlePermissionDenied()}
        </View>
      ) : (
        <ScrollView
          ref={(ref) => {
            scrollViewRef.current = ref;
          }}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
            if (isCloseToBottom && hasNextPage && !isLoadingMore && !isLoading) {
              loadAssets(endCursor);
            }
          }}
          scrollEventThrottle={400}
        >
          {headerContent}
          <View ref={galleryRef}>
            <MediaGrid
              assets={assets}
              selectedOrderMap={selectedOrderMap}
              onSelect={handleToggleAsset}
              isLoading={isLoading && !assets.length}
              isLoadingMore={isLoadingMore}
              canLoadMore={hasNextPage}
              onLoadMore={() => loadAssets(endCursor)}
            />
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  headerContent: {
    // Padding set dynamically
  },
  inputContainer: {
    borderWidth: 1,
    // Border radius and padding set dynamically
  },
  textInput: {
    lineHeight: undefined, // Let platform handle line height
    textAlignVertical: 'top',
    // Font size and min height set dynamically
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // marginTop set dynamically
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  mediaPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // goLiveButton style removed - Live streaming disabled
  mediaPickerButtonText: {
    fontWeight: '600',
    color: '#1DA1F2',
    // Font size set dynamically
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  charCount: {
    fontWeight: '500',
    // Font size set dynamically
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // gap and marginTop set dynamically
  },
  previewChip: {
    position: 'relative',
    overflow: 'hidden',
    // Dimensions set dynamically
  },
  previewChipImage: {
    width: '100%',
    height: '100%',
    // Border radius set dynamically
  },
  previewChipRemove: {
    position: 'absolute',
    backgroundColor: 'rgba(17,24,39,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    // Dimensions set dynamically
  },
  previewChipBadge: {
    position: 'absolute',
    backgroundColor: '#1DA1F2',
    alignItems: 'center',
    justifyContent: 'center',
    // Dimensions set dynamically
  },
  previewChipBadgeText: {
    color: '#ffffff',
    fontWeight: '600',
    // Font size set dynamically
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  permissionWrapper: {
    flex: 1,
    justifyContent: 'center',
    // paddingHorizontal set dynamically in component
  },
  permissionContainer: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    // Dimensions set dynamically in component
    ...Platform.select({
      ios: {
        borderRadius: 24,
      },
      android: {
        borderRadius: 20,
      },
    }),
  },
  permissionTitle: {
    fontWeight: '600',
    // Font size set dynamically
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  permissionMessage: {
    textAlign: 'center',
    // Font size and line height set dynamically
    ...Platform.select({
      ios: {
        fontFamily: 'System',
        lineHeight: 20,
      },
      android: {
        fontFamily: 'sans-serif',
        lineHeight: 22,
      },
    }),
  },
  permissionActions: {
    flexDirection: 'row',
    gap: 16,
  },
  permissionButton: {
    fontWeight: '600',
    // Font size set dynamically
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
});


