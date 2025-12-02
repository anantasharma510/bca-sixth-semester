import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Image,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useInteractionGuard } from '../hooks/useInteractionGuard';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { useUsersApi } from '../services/api/users';
import { Header } from '../components/Header';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaForContent } from '../hooks/useSafeAreaConfig';
import { getDisplayName, getUserInitials } from '../utils/user';
import { SuggestedUsers } from '../components/SuggestedUsers';

interface User {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
  role?: string;
}

export default function SearchScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const lastSearchedQueryRef = useRef('');
  const hasResultsRef = useRef(false);

  const { isSignedIn } = useAuth();
  const guardInteraction = useInteractionGuard();
  const usersApi = useUsersApi();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const contentSafeArea = useSafeAreaForContent();

  const navigateToUserProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays < 7) return `${diffDays - 1} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const searchUsers = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSearchResults([]);
        setLastSearchedQuery('');
        return;
      }

      if (lastSearchedQueryRef.current === trimmed) {
        return;
      }

      if (!isSignedIn) {
        guardInteraction('search for users');
        return;
      }

      try {
        setIsSearching(true);
        const response = await usersApi.searchUsers(trimmed, 1, 20);
        const results = response.users || [];
        hasResultsRef.current = results.length > 0;
        setSearchResults(results);
        lastSearchedQueryRef.current = trimmed;
      } catch (error) {
        console.error('Error searching users:', error);
        hasResultsRef.current = false;
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [guardInteraction, isSignedIn, usersApi]
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      if (hasResultsRef.current) {
        hasResultsRef.current = false;
        setSearchResults([]);
      }
      lastSearchedQueryRef.current = '';
      return;
    }

    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchUsers]);

  const handleSubmit = () => {
    Keyboard.dismiss();
    searchUsers(searchQuery);
  };

  const renderUserItem = ({ item: user }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}
      onPress={() => navigateToUserProfile(user._id)}
    >
      <View style={[styles.userAvatar, { backgroundColor: colors.primary[500] }]}>
        {user.profileImageUrl ? (
          <Image
            source={{ uri: user.profileImageUrl }}
            style={styles.userAvatarImage}
            onError={() => console.log('User image failed to load')}
          />
        ) : (
          <Text style={styles.userAvatarText}>{getUserInitials(user)}</Text>
        )}
      </View>

      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={[styles.userName, { color: colors.text.primary }]} numberOfLines={1}>
            {getDisplayName(user, user.username)}
          </Text>
          {user.role === 'admin' && (
            <View style={[styles.adminBadge, { backgroundColor: colors.primary[500] }]}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>

        <Text style={[styles.userHandle, { color: colors.text.secondary }]} numberOfLines={1}>
          @{user.username}
        </Text>

        {user.bio && (
          <Text style={[styles.userBio, { color: colors.text.primary }]} numberOfLines={2}>
            {user.bio}
          </Text>
        )}

        <View style={styles.userMeta}>
          {user.location && (
            <View style={styles.userMetaItem}>
              <Icon name="map-pin" size={12} color={colors.text.secondary} />
              <Text style={[styles.userMetaText, { color: colors.text.secondary }]}>{user.location}</Text>
            </View>
          )}

          <View style={styles.userMetaItem}>
            <Icon name="calendar" size={12} color={colors.text.secondary} />
            <Text style={[styles.userMetaText, { color: colors.text.secondary }]}>
              Joined {formatDate(user.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      <Icon name="chevron-right" size={20} color={colors.text.secondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Header navigation={navigation} title="Search" />

      <View
        style={[
          styles.searchContainer,
          {
            borderBottomColor: colors.border.light,
            paddingLeft: contentSafeArea.paddingLeft,
            paddingRight: contentSafeArea.paddingRight,
          },
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.background.secondary,
                color: colors.text.primary,
                borderColor: colors.border.light,
              },
            ]}
            placeholder="Search for users..."
            placeholderTextColor={colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
          />
        </View>
      </View>

      {searchQuery.trim().length === 0 ? (
        <ScrollView
          contentContainerStyle={[
            styles.emptyStateContainer,
            {
              paddingLeft: contentSafeArea.paddingLeft,
              paddingRight: contentSafeArea.paddingRight,
              paddingBottom: Math.max(contentSafeArea.safeAreaInsets.bottom, 16) + 72,
            },
          ]}
        >
          <View style={styles.centerContainer}>
            <Icon name="search" size={42} color={colors.text.secondary} />
            <Text style={[styles.centerTitle, { color: colors.text.primary }]}>Start typing to find people</Text>
            <Text style={[styles.centerText, { color: colors.text.secondary }]}>
              Discover new creators and connections across the community.
            </Text>
          </View>
          
          {isSignedIn && <SuggestedUsers />}
        </ScrollView>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingLeft: contentSafeArea.paddingLeft + 20,
              paddingRight: contentSafeArea.paddingRight + 20,
            },
          ]}
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              {isSearching ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                  <Text style={[styles.centerText, { color: colors.text.secondary }]}>Searching users...</Text>
                </View>
              ) : searchResults.length === 0 ? (
                <View style={styles.centerContainer}>
                  <Icon name="users" size={42} color={colors.text.secondary} />
                  <Text style={[styles.centerTitle, { color: colors.text.primary }]}>No users found</Text>
                  <Text style={[styles.centerText, { color: colors.text.secondary }]}>
                    Try different keywords or check your spelling.
                  </Text>
                </View>
              ) : (
                <View style={styles.resultsMeta}>
                  <Text style={[styles.resultsCount, { color: colors.text.secondary }]}>
                    Showing {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
                  </Text>
                </View>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 28,
    borderWidth: 1,
    fontSize: 15,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
  },
  resultsHeader: {
    marginBottom: 12,
  },
  resultsMeta: {
    paddingBottom: 8,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  userHandle: {
    fontSize: 13,
    marginTop: 2,
  },
  userBio: {
    fontSize: 12,
    marginTop: 6,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  userMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userMetaText: {
    fontSize: 11,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  centerText: {
    fontSize: 13,
    textAlign: 'center',
  },
  centerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyStateContainer: {
    paddingTop: 16,
  },
});

