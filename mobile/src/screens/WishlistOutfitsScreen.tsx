import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStyleApi } from '../services/api/style';
import Icon from 'react-native-vector-icons/Feather';
import { Image } from 'expo-image';

export default function WishlistOutfitsScreen() {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const api = useStyleApi();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  const loadPage = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const res: any = await api.getWishlistOutfits(pageNum, 20);
        const outfits = res?.data?.outfits || [];
        const pagination = res?.data?.pagination;

        if (pageNum === 1) {
          setItems(outfits);
        } else {
          setItems(prev => {
            const existing = new Set(prev.map(o => o._id));
            const merged = [...prev, ...outfits.filter((o: any) => !existing.has(o._id))];
            return merged;
          });
        }

        if (pagination) {
          setHasNextPage(pagination.hasNextPage);
          setPage(pagination.currentPage + 1);
        } else {
          setHasNextPage(false);
        }
      } catch (e) {
        console.error('Failed to load wishlist outfits', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api]
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const handleRefresh = () => {
    setPage(1);
    setHasNextPage(true);
    loadPage(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && !refreshing && hasNextPage) {
      loadPage(page);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}
        onPress={() => navigation.navigate('OutfitDetail', { outfitId: item._id })}
      >
        <View style={styles.cardImageWrapper}>
          {item.bannerImageUrl ? (
            <Image
              source={{ uri: item.bannerImageUrl }}
              style={styles.cardImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.cardImage, { backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center' }]}>
              <Icon name="image" size={18} color={colors.text.tertiary} />
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {item.name}
          </Text>
          {!!item.description && (
            <Text style={[styles.cardSubtitle, { color: colors.text.secondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={[styles.cardMeta, { color: colors.text.tertiary }]}>
            Saved outfit · {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top + 16 }]}>
        <ActivityIndicator size="large" color="#FF7300" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Icon name="arrow-left" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Saved outfits</Text>
        <View style={{ width: 30 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          paddingTop: 8,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No saved outfits yet</Text>
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                Save outfits you like and they will appear here.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardImageWrapper: {
    width: 90,
    height: 90,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 11,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    marginTop: 64,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});


