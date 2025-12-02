import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import type { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { getColors } from '../../constants/colors';
import { CreationHeader } from './components/CreationHeader';
import { SelectedPreview } from './components/SelectedPreview';
import { MediaGrid } from './components/MediaGrid';
import type { DeviceMediaAsset, SelectedMediaItem } from './types';
import type { PostCreationStackParamList } from './PostCreationNavigator';

type PermissionState = 'undetermined' | 'denied' | 'granted' | 'limited';

type PickerAsset = ImagePicker.ImagePickerAsset & {
  localUri?: string;
  filename?: string;
  fileName?: string;
};

const mapPermissionStatus = (
  status: MediaLibrary.PermissionStatus | ImagePicker.PermissionStatus,
  access?: MediaLibrary.PermissionResponse['accessPrivileges'] | null
): PermissionState => {
  if (status === 'granted' && access === 'limited') {
    return 'limited';
  }
  return status as PermissionState;
};

type MediaPickerScreenProps = StackScreenProps<PostCreationStackParamList, 'MediaPicker'>;

const PAGE_SIZE = 60;
const MAX_SELECTION = 10;

export const MediaPickerScreen: React.FC<MediaPickerScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const colors = getColors(theme);

  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('undetermined');
  const [assets, setAssets] = useState<DeviceMediaAsset[]>([]);
  const [selected, setSelected] = useState<SelectedMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [initialFetchCompleted, setInitialFetchCompleted] = useState(false);

  const onPostCreated = route.params?.onPostCreated;

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

        const result = await MediaLibrary.getAssetsAsync({
          first: PAGE_SIZE,
          after: afterCursor ?? undefined,
          mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        const normalizedRaw = await Promise.all(
          result.assets.map(async (asset): Promise<DeviceMediaAsset | null> => {
            const assetWithLocalUri = asset as MediaLibrary.Asset & { localUri?: string };
            let uri = assetWithLocalUri.uri || assetWithLocalUri.localUri || '';
            let filename = asset.filename ?? null;

            if (!uri) {
              try {
                const info = await MediaLibrary.getAssetInfoAsync(asset.id);
                uri = info.localUri || info.uri || '';
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
              duration: asset.duration ?? undefined,
              creationTime: asset.creationTime,
            };
          })
        );

        const normalized = normalizedRaw.filter(Boolean) as DeviceMediaAsset[];

        setAssets((prev) =>
          isPaginating ? [...prev, ...normalized] : normalized
        );
        setEndCursor(result.endCursor ?? null);
        setHasNextPage(result.hasNextPage);
        setInitialFetchCompleted(true);
      } catch (error) {
        console.error('Failed to load media assets', error);
        Alert.alert('Error', 'We could not load your recent photos. Please try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [hasNextPage]
  );

  const requestPermissions = useCallback(async () => {
    try {
      const pickerPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const libraryPermission =
        Platform.OS === 'ios'
          ? await MediaLibrary.requestPermissionsAsync({ accessPrivileges: 'all' } as any)
          : await MediaLibrary.requestPermissionsAsync();

      const resolvedStatus = mapPermissionStatus(
        libraryPermission.status === 'undetermined'
          ? pickerPermission.status
          : libraryPermission.status,
        libraryPermission.accessPrivileges
      );

      setPermissionStatus(resolvedStatus);

      if (resolvedStatus === 'granted' || resolvedStatus === 'limited') {
        await loadAssets();
      }
    } catch (error) {
      console.error('Failed to request media library permissions', error);
      Alert.alert('Permission Error', 'Unable to access your gallery. Please try again.');
    }
  }, [loadAssets]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const libraryPermission = await MediaLibrary.getPermissionsAsync();
        if (isMounted) {
          const normalizedStatus = mapPermissionStatus(
            libraryPermission.status,
            libraryPermission.accessPrivileges
          );
          setPermissionStatus(normalizedStatus);
        }
      } catch (error) {
        console.error('Failed to retrieve media library permissions', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (permissionStatus === 'undetermined') {
      requestPermissions();
    }
  }, [permissionStatus, requestPermissions]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshPermissions = async () => {
        try {
          const libraryPermission = await MediaLibrary.getPermissionsAsync();
          const pickerPermission = await ImagePicker.getMediaLibraryPermissionsAsync();

          if (!isActive) {
            return;
          }

          const resolvedStatus = mapPermissionStatus(
            libraryPermission.status === 'undetermined'
              ? pickerPermission.status
              : libraryPermission.status,
            libraryPermission.accessPrivileges
          );

          setPermissionStatus(resolvedStatus);

          const isGranted = resolvedStatus === 'granted' || resolvedStatus === 'limited';
          if (isGranted && !initialFetchCompleted) {
            await loadAssets();
          }
        } catch (error) {
          console.error('Failed to refresh media permissions on focus', error);
        }
      };

      refreshPermissions();

      return () => {
        isActive = false;
      };
    }, [initialFetchCompleted, loadAssets])
  );

  const selectedOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    selected.forEach((item, index) => {
      map.set(item.id, index + 1);
    });
    return map;
  }, [selected]);

  const handleSelectAsset = useCallback(
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
        Alert.alert('Selection Limit', `You can select up to ${MAX_SELECTION} items at once.`);
        return;
      }

      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);
        const resolvedUri = info.localUri || info.uri || asset.uri;

        if (!resolvedUri) {
          Alert.alert('Unavailable', 'This media could not be accessed. Try a different one.');
          return;
        }

        const mediaType = asset.mediaType === MediaLibrary.MediaType.video ? 'video' : 'image';

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
        Alert.alert('Error', 'We could not open this media. Please try another.');
      }
    },
    [selected]
  );

  const handleOpenSystemPicker = useCallback(async () => {
    try {
      const remainingSlots = MAX_SELECTION - selected.length;
      if (remainingSlots <= 0) {
        Alert.alert('Selection Limit', `You can select up to ${MAX_SELECTION} items at once.`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 1,
        selectionLimit: remainingSlots,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const availableSlots = MAX_SELECTION - selected.length;
      const assetsToUse = result.assets.slice(0, availableSlots) as PickerAsset[];

      const newSelections: SelectedMediaItem[] = assetsToUse.map((asset, index) => {
        const id = asset.assetId ?? asset.uri ?? `picker-${Date.now()}-${index}`;
        const mediaType = asset.type?.startsWith('video') ? 'video' : 'image';
        const localUri = asset.localUri ?? asset.uri;
        const filename = asset.fileName ?? asset.filename ?? null;

        return {
          id,
          displayUri: asset.uri,
          localUri,
          filename,
          mediaType,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
          duration: asset.duration ?? undefined,
          order: selected.length + index + 1,
        };
      });

      if (!newSelections.length) {
        return;
      }

      setSelected((prev) => [...prev, ...newSelections]);
      setAssets((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const mapped = newSelections
          .filter((item) => !existingIds.has(item.id))
          .map<DeviceMediaAsset>((item) => ({
            id: item.id,
            uri: item.displayUri,
            filename: item.filename ?? null,
            mediaType: item.mediaType === 'video' ? MediaLibrary.MediaType.video : MediaLibrary.MediaType.photo,
            width: item.width,
            height: item.height,
            duration: item.duration,
            creationTime: Date.now(),
          }));

        return mapped.length ? [...mapped, ...prev] : prev;
      });
    } catch (error) {
      console.error('Failed to open system picker', error);
      Alert.alert('Error', 'Unable to open your library. Please try again.');
    }
  }, [selected]);

  const handleProceed = useCallback(() => {
    if (!selected.length) return;
    navigation.navigate('Caption', {
      selectedMedia: selected,
      onPostCreated,
    });
  }, [navigation, onPostCreated, selected]);

  const handlePermissionDenied = () => {
    return (
      <View style={styles.permissionContainer}>
        <Text style={[styles.permissionTitle, { color: colors.text.primary }]}>
          Allow gallery access
        </Text>
        <Text style={[styles.permissionMessage, { color: colors.text.secondary }]}>
          We need permission to show your recent photos and videos. Enable access in Settings to continue.
        </Text>
        <View style={styles.permissionActions}>
          <Text
            onPress={() => Linking.openSettings()}
            style={[styles.permissionButton, { color: '#FF6B2C' }]}
          >
            Open Settings
          </Text>
          <Text
            onPress={requestPermissions}
            style={[styles.permissionButton, { color: colors.text.secondary }]}
          >
            Try again
          </Text>
        </View>
      </View>
    );
  };

  const isPermissionGranted = permissionStatus === 'granted' || permissionStatus === 'limited';

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <CreationHeader
        title="New Post"
        onBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Composer', { onPostCreated });
          }
        }}
        rightLabel="Next"
        rightDisabled={selected.length === 0}
        onRightPress={handleProceed}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <SelectedPreview
          asset={selected[0]}
          placeholderLabel={isPermissionGranted ? 'Tap to browse your gallery.' : 'Enable access to start sharing.'}
          onPlaceholderPress={isPermissionGranted ? handleOpenSystemPicker : requestPermissions}
        />

        {!isPermissionGranted ? (
          handlePermissionDenied()
        ) : (
          <MediaGrid
            assets={assets}
            selectedOrderMap={selectedOrderMap}
            onSelect={handleSelectAsset}
            isLoading={isLoading && !assets.length}
            isLoadingMore={isLoadingMore}
            canLoadMore={hasNextPage}
            onLoadMore={() => loadAssets(endCursor)}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default MediaPickerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  permissionContainer: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  permissionMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  permissionActions: {
    flexDirection: 'row',
    gap: 16,
  },
  permissionButton: {
    fontSize: 15,
    fontWeight: '600',
  },
});

