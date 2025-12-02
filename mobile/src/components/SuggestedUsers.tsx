import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, FlatList, Alert } from 'react-native';
import { useApiService } from '../services/api';
import { useAuth } from '../hooks/auth/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useFollowSuggestions, useBlockedUsers, useRefreshFollowStatus } from '../hooks/useFollows';

interface SuggestionUser {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  followerCount: number;
  bio?: string;
}

export const SuggestedUsers: React.FC = () => {
  const { post } = useApiService();
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const { theme } = useTheme();
  const colors = getColors(theme);
  const navigation = useNavigation<any>();

  // Use React Query hooks - prevents duplicate API calls
  const { data: suggestionsData = [], isLoading: suggestionsLoading, refetch: refetchSuggestions } = useFollowSuggestions(10);
  const { data: blockedIds = [], isLoading: blockedLoading } = useBlockedUsers();
  const { refreshAll: refreshFollowStatus } = useRefreshFollowStatus();
  
  const loading = suggestionsLoading || blockedLoading;

  // Filter out blocked users
  const suggestions = useMemo(() => {
    return suggestionsData.filter(u => !blockedIds.includes(u._id));
  }, [suggestionsData, blockedIds]);

  const handleFollow = async (userId: string) => {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('Invalid user ID for follow');
      return;
    }
    
    try {
      setFollowingIds(prev => [...prev, userId]);
      await post(`/follows/${userId}/follow`);
      // Invalidate follow status cache for this user (so FollowButton components update)
      refreshFollowStatus();
      // Refetch suggestions to update the list
      refetchSuggestions();
    } catch (e: any) {
      setFollowingIds(prev => prev.filter(id => id !== userId));
      console.error('Failed to follow user:', e);
      Alert.alert('Error', 'Failed to follow user. Please try again.');
    }
  };

  const handleRemove = (userId: string) => {
    // Just refetch to get updated list
    refetchSuggestions();
  };

  const handleRefresh = () => {
    refetchSuggestions();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading suggestions...</Text>
      </View>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  const renderUserItem = ({ item }: { item: SuggestionUser }) => {
    const isFollowing = followingIds.includes(item._id);
    
    return (
      <View style={[styles.userItem, { backgroundColor: colors.background.primary }]}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
          style={styles.userContent}
        >
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#ff9d6c', '#fe5f75']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatarWrapper}>
                <Image
                  source={{ 
                    uri: item.profileImageUrl || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(item.firstName || item.username)}&background=FF9D6C&color=ffffff` 
                  }}
                  style={styles.avatarImage}
                />
              </View>
            </LinearGradient>
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text.primary }]} numberOfLines={1}>
              {item.firstName ? `${item.firstName} ${item.lastName || ''}`.trim() : item.username}
            </Text>
            {item.followerCount > 0 && (
              <Text style={[styles.followerText, { color: colors.text.secondary }]} numberOfLines={1}>
                Followed by {item.followerCount.toLocaleString()}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleFollow(item._id)}
            disabled={isFollowing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isFollowing ? ['#10b981', '#059669'] : ['#FF7300', '#FF5A36']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addButtonGradient}
            >
              <Text style={styles.addButtonText}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: colors.background.secondary }]}
            onPress={() => handleRemove(item._id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.removeButtonText, { color: colors.text.primary }]}>
              Remove
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerText, { color: colors.text.primary }]}>Suggested for you</Text>
          <Text style={[styles.headerCaption, { color: colors.text.secondary }]}>
            People you may know
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleRefresh} disabled={loading} style={styles.refreshIcon}>
            <Ionicons
              name="refresh"
              size={18}
              color={colors.text.secondary}
              style={loading ? { opacity: 0.45 } : {}}
            />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={suggestions}
        keyExtractor={item => item._id}
        renderItem={renderUserItem}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerText: {
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  headerCaption: {
    marginTop: 2,
    fontSize: 13,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshIcon: {
    padding: 8,
    borderRadius: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
  },
  avatarWrapper: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  followerText: {
    fontSize: 13,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  addButton: {
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 90,
  },
  addButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  removeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  errorContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  retryLabel: {
    fontWeight: '600',
    fontSize: 13,
  },
});

