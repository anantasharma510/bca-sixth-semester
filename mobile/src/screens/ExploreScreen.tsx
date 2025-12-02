import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { Post } from '../components/Post';
import { useApiService } from '../services/api';
import { useHashtagsApi } from '../services/api/hashtags';
import { Header } from '../components/Header';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaForContent } from '../hooks/useSafeAreaConfig';
import { resolveApiBaseUrl } from '../config/env';

const API_BASE_URL = resolveApiBaseUrl();

interface HashtagTrend {
  _id: string;
  topic: string;
  postCount: number;
}

export default function ExploreScreen({ navigation }: any) {
  const [posts, setPosts] = useState<any[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<HashtagTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { isSignedIn } = useAuth();
  const apiService = useApiService();
  const hashtagsApi = useHashtagsApi();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const contentSafeArea = useSafeAreaForContent();

  const loadExplorePosts = async () => {
    try {
      if (isSignedIn) {
        const response = await apiService.get('/posts/explore?limit=20');
        setPosts(response.posts || []);
      } else {
        const response = await fetch(`${API_BASE_URL}/posts/public?limit=20`);
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || []);
        }
      }
    } catch (error) {
      console.error('Error loading explore posts:', error);
    }
  };

  const loadTrendingTopics = async () => {
    try {
      setIsLoadingTrending(true);
      const response = await hashtagsApi.getTrendingHashtags(9);
      setTrendingTopics(response.hashtags || []);
    } catch (error) {
      console.error('Error loading trending topics:', error);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    await Promise.all([loadExplorePosts(), loadTrendingTopics()]);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadInitialData();
  }, [isSignedIn]);

  const navigateToHashtag = (hashtag: string) => {
    console.log('Navigate to hashtag:', hashtag);
  };

  const renderTrendingItem = ({ item }: { item: HashtagTrend }) => (
    <TouchableOpacity
      style={[styles.trendingItem, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}
      onPress={() => navigateToHashtag(item.topic)}
    >
      <View style={styles.trendingHeader}>
        <Icon name="hash" size={16} color={colors.primary[500]} />
        <Text style={[styles.trendingTopic, { color: colors.text.primary }]} numberOfLines={1}>
          {item.topic || item._id}
        </Text>
      </View>
      <Text style={[styles.trendingCount, { color: colors.text.secondary }]}>{item.postCount} posts</Text>
    </TouchableOpacity>
  );

  const renderPost = ({ item }: { item: any }) => <Post post={item} />;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading explore content...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Header navigation={navigation} title="Explore" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingLeft: contentSafeArea.paddingLeft,
          paddingRight: contentSafeArea.paddingRight,
          paddingBottom: Math.max(contentSafeArea.safeAreaInsets.bottom, 16) + 72,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="trending-up" size={20} color={colors.success[500]} />
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Trending Now</Text>
          </View>

          {isLoadingTrending ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={colors.success[500]} />
              <Text style={[styles.centerText, { color: colors.text.secondary }]}>Loading trending topics...</Text>
            </View>
          ) : (
            <FlatList
              data={trendingTopics}
              renderItem={renderTrendingItem}
              keyExtractor={(item) => item._id}
              numColumns={2}
              columnWrapperStyle={styles.trendingRow}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.centerContainer}>
                  <Text style={[styles.centerText, { color: colors.text.secondary }]}>No trending topics yet.</Text>
                </View>
              }
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="compass" size={20} color={colors.warning[500]} />
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Discover Posts</Text>
          </View>

          {posts.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={[styles.centerText, { color: colors.text.secondary }]}>No posts to show.</Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  trendingRow: {
    gap: 12,
    marginBottom: 12,
  },
  trendingItem: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  trendingTopic: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendingCount: {
    fontSize: 12,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  centerText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

