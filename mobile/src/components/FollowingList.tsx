import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { FollowButton } from './FollowButton';
import { useApiService } from '../services/api';
import Icon from 'react-native-vector-icons/Feather';
import { getDisplayName, getUserInitials } from '../utils/user';
import { useNavigation } from '@react-navigation/native';

interface FollowingListProps {
  userId: string;
  onClose: () => void;
}

interface Following {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  isFollowing: boolean;
  bio?: string;
}

export function FollowingList({ userId, onClose }: FollowingListProps) {
  const [following, setFollowing] = useState<Following[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const { theme } = useTheme();
  const colors = getColors(theme);
  const apiService = useApiService();
  const navigation = useNavigation<any>();

  const fetchFollowing = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const response = await apiService.get(`/follows/${userId}/following-list?page=${pageNum}&limit=20`);
      
      if (append) {
        setFollowing(prev => [...prev, ...response.following]);
      } else {
        setFollowing(response.following);
      }
      
      setHasMore(response.pagination?.hasNextPage ?? response.following.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch following:', error);
      Alert.alert('Error', 'Failed to load following');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchFollowing(page + 1, true);
    }
  };

  useEffect(() => {
    fetchFollowing(1, false);
  }, [userId]);

  const handleUserPress = (userId: string) => {
    onClose();
    navigation.navigate('UserProfile', { userId });
  };

  const renderFollowing = ({ item }: { item: Following }) => {
    if (!item || !item._id) return null;
    
    const displayName = getDisplayName(item, item.username);
    
    return (
      <TouchableOpacity 
        style={[styles.followingItem, { borderBottomColor: colors.border.light }]}
        onPress={() => handleUserPress(item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.followingInfo}>
          <View style={styles.avatarContainer}>
            {item.profileImageUrl ? (
              <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary[500] }]}>
                <Text style={styles.avatarText}>
                  {getUserInitials(item)}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text.primary }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.username, { color: colors.text.secondary }]} numberOfLines={1}>
              @{item.username}
            </Text>
            {item.bio && (
              <Text style={[styles.bio, { color: colors.text.secondary }]} numberOfLines={1}>
                {item.bio}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.followButtonContainer}>
          <FollowButton
            userId={item._id}
            size="sm"
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading following...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['top']}>
      <View style={{ flex: 1 }}>
        {/* Modern Header */}
        <View style={[styles.header, { 
          borderBottomColor: colors.border.light,
          backgroundColor: colors.background.primary 
        }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Icon name="arrow-left" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.title, { color: colors.text.primary }]}>Following</Text>
          <View style={styles.headerRight} />
        </View>

        {/* User List */}
        <FlatList
          data={following}
          renderItem={renderFollowing}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: colors.background.primary }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.border.light }]}>
                <Icon name="users" size={40} color={colors.text.secondary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text.primary }]}>
                Not following anyone yet
              </Text>
              <Text style={[styles.emptySubText, { color: colors.text.secondary }]}>
                When this user follows someone, they'll appear here
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary[500]} />
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  headerLeft: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerRight: {
    width: 40,
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  followingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  followingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  username: {
    fontSize: 15,
    marginBottom: 2,
  },
  bio: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 18,
  },
  followButtonContainer: {
    flexShrink: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 64,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  loadingMore: {
    paddingVertical: 24,
    alignItems: 'center',
  },
}); 