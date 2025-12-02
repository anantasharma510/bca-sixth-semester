import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useApiService } from '../services/api';
import { Colors, getColors } from '../constants/colors';
import { Button } from '../components/ui/Button';
import { Header } from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { getDisplayName, getUserInitials } from '../utils/user';

export default function BlockedUsersScreen({ navigation }: any) {
  const apiService = useApiService();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const fetchBlockedUsers = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      const response = await apiService.get(`/blocks/blocked-users?page=${pageNum}&limit=20`);
      if (append) {
        setBlockedUsers(prev => [...prev, ...response.blockedUsers]);
      } else {
        setBlockedUsers(response.blockedUsers);
      }
      setHasMore(response.pagination?.hasNextPage ?? false);
    } catch (error) {
      Alert.alert('Error', 'Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers(1, false);
  }, []);

  const handleUnblock = async (userId: string) => {
    setUnblocking(userId);
    try {
      await apiService.delete(`/blocks/${userId}/block`);
      setBlockedUsers(prev => prev.filter(u => u._id !== userId));
      Alert.alert('Success', 'User unblocked');
    } catch (error) {
      Alert.alert('Error', 'Failed to unblock user');
    } finally {
      setUnblocking(null);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchBlockedUsers(nextPage, true);
    }
  };

  if (loading && blockedUsers.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <Header navigation={navigation} title="Blocked Users" showBackButton />
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading blocked users...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Header navigation={navigation} title="Blocked Users" showBackButton />
      <View style={styles.content}>
        {blockedUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>🚫</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No blocked users</Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              You haven't blocked any users yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={blockedUsers}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ backgroundColor: colors.background.primary }}
            style={{ backgroundColor: colors.background.primary }}
            renderItem={({ item }) => (
              <View style={[styles.userItem, { 
                backgroundColor: colors.background.primary, 
                borderBottomColor: colors.border.light 
              }]}>
                <View style={styles.userContent}>
                  <View style={styles.avatarContainer}>
                    {item.profileImageUrl ? (
                      <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[
                        styles.avatar, 
                        { 
                          backgroundColor: Colors.primary[500], 
                          justifyContent: 'center', 
                          alignItems: 'center' 
                        }
                      ]}> 
                        <Text style={[styles.avatarText, { color: 'white' }]}>
                          {getUserInitials(item)}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.userInfo}>
                    <Text style={[styles.username, { color: colors.text.primary }]} numberOfLines={1}>
                      {getDisplayName(item, item.username)}
                    </Text>
                    <Text style={[styles.userHandle, { color: colors.text.secondary }]} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.unblockButton, {
                      backgroundColor: colors.background.primary,
                      borderColor: colors.border.light,
                    }]}
                    onPress={() => handleUnblock(item._id)}
                    disabled={unblocking === item._id}
                  >
                    <Text style={[styles.unblockButtonText, { 
                      color: unblocking === item._id ? colors.text.secondary : colors.primary[500] 
                    }]}>
                      {unblocking === item._id ? 'Unblocking...' : 'Unblock'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListFooterComponent={hasMore ? (
              <TouchableOpacity onPress={loadMore} style={styles.loadMoreButton}>
                <Text style={[styles.loadMoreText, { color: Colors.primary[500] }]}>Load More</Text>
              </TouchableOpacity>
            ) : null}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  // Empty state styles - matching post feed design
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  // User item styles - matching post component design
  userItem: {
    borderBottomWidth: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarContainer: {
    // Container for avatar
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 