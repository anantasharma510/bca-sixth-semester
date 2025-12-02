import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import * as MediaLibrary from 'expo-media-library';
import type { DeviceMediaAsset } from '../types';
import { useTheme } from '../../../context/ThemeContext';
import { getColors } from '../../../constants/colors';

interface MediaGridProps {
  assets: DeviceMediaAsset[];
  selectedOrderMap: Map<string, number>;
  onSelect: (asset: DeviceMediaAsset) => void;
  isLoading: boolean;
  isLoadingMore?: boolean;
  canLoadMore?: boolean;
  onLoadMore?: () => void;
}

// Responsive column calculation based on screen width
const getColumns = (width: number): number => {
  if (width >= 768) return 4; // Tablets
  if (width >= 600) return 3; // Large phones
  return 3; // Standard phones
};

// Responsive spacing based on screen size
const getSpacing = (width: number): number => {
  const baseSpacing = width * 0.002; // 0.2% of screen width
  return Math.max(1, Math.round(baseSpacing));
};

export const MediaGrid: React.FC<MediaGridProps> = ({
  assets,
  selectedOrderMap,
  onSelect,
  isLoading,
  isLoadingMore = false,
  canLoadMore = false,
  onLoadMore,
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const { width, height } = useWindowDimensions();

  // Responsive calculations
  const numColumns = useMemo(() => getColumns(width), [width]);
  const tileSpacing = useMemo(() => getSpacing(width), [width]);
  const scaleFactor = useMemo(() => Math.min(width / 375, height / 812), [width, height]); // Base: iPhone X

  const data = useMemo(() => assets, [assets]);

  const renderItem = ({ item, index }: { item: DeviceMediaAsset; index: number }) => {
    const order = selectedOrderMap.get(item.id) ?? null;
    const isVideo = item.mediaType === MediaLibrary.MediaType.video;

    // Responsive badge sizes
    const badgeSize = Math.max(20, 24 * scaleFactor);
    const badgeIconSize = Math.max(8, 10 * scaleFactor);
    const badgePadding = Math.max(6, 8 * scaleFactor);
    const badgeFontSize = Math.max(10, 12 * scaleFactor);

    return (
      <Pressable
        onPress={() => onSelect(item)}
        style={({ pressed }) => [
          styles.tile,
          {
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        
        {/* Selection overlay - Instagram style */}
        {order ? (
          <Animated.View
            entering={ZoomIn.springify().damping(12)}
            exiting={ZoomOut.springify().damping(12)}
            style={[
              styles.selectionOverlay,
              { padding: badgePadding },
            ]}
          >
            <View style={[
              styles.selectionBadge,
              {
                width: badgeSize,
                height: badgeSize,
                borderRadius: badgeSize / 2,
                borderWidth: Math.max(1.5, 2 * scaleFactor),
              },
            ]}>
              <Text style={[
                styles.selectionText,
                { fontSize: badgeFontSize },
              ]}>
                {order}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Video indicator - Instagram style */}
        {isVideo ? (
          <View style={[
            styles.videoBadge,
            {
              bottom: badgePadding,
              right: badgePadding,
              width: badgeSize * 0.83,
              height: badgeSize * 0.83,
              borderRadius: (badgeSize * 0.83) / 2,
            },
          ]}>
            <Feather name="play" size={badgeIconSize} color="#ffffff" />
          </View>
        ) : null}
      </Pressable>
    );
  };

  // Group items into rows for grid layout
  const rows = useMemo(() => {
    const rowArray: DeviceMediaAsset[][] = [];
    for (let i = 0; i < data.length; i += numColumns) {
      rowArray.push(data.slice(i, i + numColumns));
    }
    return rowArray;
  }, [data, numColumns]);

  if (isLoading) {
    const loadingHeight = Math.max(180, height * 0.25);
    const loadingPadding = width * 0.04;
    const loadingFontSize = Math.max(13, 14 * scaleFactor);
    
    return (
      <View style={[
        styles.loadingContainer,
        {
          backgroundColor: colors.background.secondary,
          height: loadingHeight,
          marginHorizontal: loadingPadding,
          borderRadius: width * 0.053, // ~20px on 375px screen
        },
      ]}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
        <Text style={[
          styles.loadingText,
          {
            color: colors.text.secondary,
            fontSize: loadingFontSize,
            marginTop: height * 0.015,
          },
        ]}>
          Loading your gallery…
        </Text>
      </View>
    );
  }

  if (data.length === 0 && !isLoading) {
    return null; // Don't show anything if no assets
  }

  const gridPaddingBottom = Math.max(20, height * 0.03);
  const footerPadding = Math.max(10, height * 0.015);

  return (
    <View style={[styles.gridContainer, { paddingBottom: gridPaddingBottom }]}>
      {rows.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={[
            styles.row,
            { marginBottom: tileSpacing },
          ]}
        >
          {row.map((item, itemIndex) => {
            const index = rowIndex * numColumns + itemIndex;
            const isLastInRow = itemIndex === row.length - 1;
            return (
              <View
                key={item.id}
                style={[
                  styles.tileWrapper,
                  { marginRight: isLastInRow ? 0 : tileSpacing },
                ]}
              >
                {renderItem({ item, index })}
              </View>
            );
          })}
          {/* Fill remaining columns in the row */}
          {Array.from({ length: numColumns - row.length }).map((_, fillIndex) => {
            const isLastFill = fillIndex === numColumns - row.length - 1;
            return (
              <View
                key={`fill-${fillIndex}`}
                style={[
                  styles.tileWrapper,
                  { marginRight: isLastFill ? 0 : tileSpacing },
                ]}
              />
            );
          })}
        </View>
      ))}
      {isLoadingMore ? (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[styles.footerLoading, { paddingVertical: footerPadding }]}
        >
          <ActivityIndicator size="small" color={colors.primary[500]} />
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  selectionBadge: {
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#ffffff',
  },
  selectionText: {
    color: '#ffffff',
    fontWeight: '700',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  gridContainer: {
    // paddingBottom set dynamically
  },
  row: {
    flexDirection: 'row',
    // marginBottom set dynamically
  },
  tileWrapper: {
    flex: 1,
    // marginRight set dynamically
  },
  loadingContainer: {
    // Dimensions set dynamically
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    // fontSize and marginTop set dynamically
    textAlign: 'center',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif',
      },
    }),
  },
  footerLoading: {
    // paddingVertical set dynamically
    alignItems: 'center',
    justifyContent: 'center',
  },
});

