import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Pressable, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const DISMISSED_KEY = '@suggestions_dismissed';
const DISMISS_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

export const WhoToFollow: React.FC = () => {
  const { post } = useApiService();
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const { theme } = useTheme();
  const colors = getColors(theme);
  const navigation = useNavigation<any>();

  // Use React Query hooks - prevents duplicate API calls
  const { data: suggestionsData = [], isLoading: suggestionsLoading, refetch: refetchSuggestions } = useFollowSuggestions(5);
  const { data: blockedIds = [], isLoading: blockedLoading } = useBlockedUsers();
  const { refreshAll: refreshFollowStatus } = useRefreshFollowStatus();
  
  const loading = suggestionsLoading || blockedLoading;
  const refreshing = false; // React Query handles refreshing

  // Filter out blocked users
  const suggestions = useMemo(() => {
    return suggestionsData.filter(u => !blockedIds.includes(u._id));
  }, [suggestionsData, blockedIds]);

  useEffect(() => {
    const checkDismissed = async () => {
      if (!user?._id) return;
      
      try {
        const dismissedData = await AsyncStorage.getItem(DISMISSED_KEY);
        if (dismissedData) {
          const parsed = JSON.parse(dismissedData);
          const currentTime = Date.now();
          
          // Check if dismissed by current user and if it's still within the dismiss duration
          if (parsed.userId === user._id && currentTime - parsed.timestamp < DISMISS_DURATION) {
            setIsDismissed(true);
          } else {
            // Clear old/expired dismissal data
            await AsyncStorage.removeItem(DISMISSED_KEY);
            setIsDismissed(false);
          }
        } else {
          setIsDismissed(false);
        }
      } catch (error) {
        console.error('Failed to check dismissed status:', error);
      }
    };
    
    checkDismissed();
    
    // Check every 30 seconds if dismiss period has expired
    const interval = setInterval(() => {
      checkDismissed();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  const handleFollow = async (userId: string) => {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('Invalid user ID for follow');
      return;
    }
    
    try {
      await post(`/follows/${userId}/follow`);
      // Invalidate follow status cache for this user (so FollowButton components update)
      refreshFollowStatus();
      // Refetch suggestions to update the list
      refetchSuggestions();
    } catch (e: any) {
      console.error('Failed to follow user:', e);
      Alert.alert('Error', 'Failed to follow user. Please try again.');
    }
  };

  const handleRefresh = () => {
    refetchSuggestions();
  };

  const handleDismiss = async () => {
    if (!user?._id) return;
    
    try {
      const dismissData = {
        userId: user._id,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissData));
      setIsDismissed(true);
    } catch (error) {
      console.error('Failed to save dismissed status:', error);
    }
  };

  const visibleSuggestions = useMemo(() => suggestions.slice(0, 10), [suggestions]);

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading suggestions...</Text>
      </View>
    );
  }

  if (isDismissed || visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.headerText, { color: colors.text.primary }]}>Suggested for you</Text>
          <Text style={[styles.headerCaption, { color: colors.text.secondary }]}>Popular creators to follow</Text>
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
          <TouchableOpacity onPress={handleDismiss} style={styles.closeIcon}>
            <Ionicons
              name="close"
              size={20}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={visibleSuggestions}
        keyExtractor={item => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.suggestionCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}
            onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
          >
            <LinearGradient
              colors={['#ff9d6c', '#fe5f75']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatarWrapper}>
                <Image
                  source={{ uri: item.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.firstName || item.username)}&background=FF9D6C&color=ffffff` }}
                  style={styles.avatarImage}
                />
              </View>
            </LinearGradient>
            <View style={styles.nameBlock}>
              <Text style={[styles.nameText, { color: colors.text.primary }]} numberOfLines={1}>
                {item.firstName ? `${item.firstName} ${item.lastName || ''}`.trim() : item.username}
              </Text>
              <Text style={[styles.usernameText, { color: colors.text.secondary }]} numberOfLines={1}>
                @{item.username}
              </Text>
              <Text style={[styles.metaText, { color: colors.text.secondary }]} numberOfLines={1}>
                {item.followerCount > 0
                  ? `${Number(item.followerCount).toLocaleString()} followers`
                  : 'Suggested for you'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.followButton}
              onPress={() => handleFollow(item._id)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF7300', '#FF5A36']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.followGradient}
              >
                <Text style={styles.followLabel}>Follow</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerText: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  headerCaption: {
    marginTop: 2,
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshIcon: {
    padding: 6,
    borderRadius: 16,
    marginRight: 4,
  },
  closeIcon: {
    padding: 6,
    borderRadius: 16,
  },
  carouselContent: {
    paddingVertical: 4,
  },
  suggestionCard: {
    width: 160,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    alignSelf: 'center',
  },
  avatarWrapper: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  nameBlock: {
    alignItems: 'center',
    marginTop: 12,
    flex: 1,
    minWidth: 0,
  },
  nameText: {
    fontWeight: '600',
    fontSize: 14,
  },
  usernameText: {
    fontSize: 12,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    marginTop: 6,
  },
  followButton: {
    marginTop: 14,
    borderRadius: 999,
    overflow: 'hidden',
  },
  followGradient: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  followLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
  },
  errorText: {
    marginBottom: 8,
    fontSize: 13,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  retryLabel: {
    fontWeight: '600',
    fontSize: 13,
  },
}); 