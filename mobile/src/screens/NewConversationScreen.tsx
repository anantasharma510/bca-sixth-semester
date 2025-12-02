import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { Header } from '../components/Header';
import { useMessagesApi } from '../services/api/messages';
import { useSocket } from '../hooks/useSocket';
import { Conversation } from '../types/api';
import { getDisplayName, getUserInitials } from '../utils/user';
import { useUserStore } from '../stores/userStore';
import { getCacheBustedUrl, getBaseUrl } from '../utils/imageCache';

interface User {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export default function NewConversationScreen({ navigation, route }: any) {
  const { userId } = route.params || {};
  const { theme } = useTheme();
  const colors = getColors(theme);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesApi = useMessagesApi();
  const socket = useSocket();
  const { isSignedIn } = useAuth();
  const loadedOnce = useRef(false);
  
  // User store for profile images
  const getUserImage = useUserStore((state) => state.getUserImage);

  // Only load users once per mount
  useEffect(() => {
    if (!userId || loadedOnce.current) return;
    loadedOnce.current = true;
    setLoadingUsers(true);
    setError(null);
    messagesApi.getFollowingUsers(userId)
      .then((response) => {
        setUsers(response.users || []);
        setFilteredUsers(response.users || []);
      })
      .catch((err) => {
        setError('Failed to load users');
        Alert.alert('Error', 'Failed to load users');
      })
      .finally(() => setLoadingUsers(false));
  }, [userId, messagesApi]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleStartConversation = async (participantId: string) => {
    if (!userId) return;
    setCreating(participantId);
    try {
      const response = await messagesApi.createConversation(userId, participantId);
      const conversation = response.conversation;
      socket.joinConversations([conversation._id]);
      navigation.navigate('ChatScreen', { conversation, userId });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to start conversation');
    } finally {
      setCreating(null);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const displayName = getDisplayName(item, item.username);
    const initials = getUserInitials(item);
    const isCreating = creating === item._id;
    
    // Get profile image from store first, then fallback to API data
    const storeImage = getUserImage(item._id, 'profile', item.profileImageUrl);
    const avatar = storeImage ? getCacheBustedUrl(storeImage, false) : null;
    const avatarKey = storeImage ? `avatar-${getBaseUrl(storeImage)}` : 'avatar-placeholder';
    
    return (
      <TouchableOpacity
        style={[styles.userItem, { backgroundColor: colors.background.secondary }]}
        onPress={() => handleStartConversation(item._id)}
        disabled={isCreating}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary[500] }]}>
          {avatar ? (
            <Image
              key={avatarKey}
              source={{ uri: avatar }}
              style={styles.avatarImage}
              contentFit="cover"
              cachePolicy="disk"
              transition={200}
              onError={(error: any) => {
                console.error('❌ NewConversationScreen: Avatar failed to load:', {
                  url: avatar?.substring(0, 50) + '...',
                  error,
                });
              }}
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.displayName, { color: colors.text.primary }]}>{displayName}</Text>
          <Text style={[styles.username, { color: colors.text.secondary }]}>@{item.username}</Text>
        </View>
        <View style={[styles.actionButton, { backgroundColor: colors.primary[500] }]}>
          {isCreating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.messageButtonText}>Message</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!isSignedIn) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background.primary }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>New Conversation</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Sign in to start a conversation</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Header navigation={navigation} title="New Conversation" showBackButton />
      <View style={[styles.searchContainer, { borderBottomColor: colors.neutral[200] }]}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: colors.background.secondary,
            color: colors.text.primary,
            borderColor: colors.neutral[200]
          }]}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.text.secondary}
        />
      </View>
      {loadingUsers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading users...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No users found</Text>
              <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
                You can only message users you follow and who follow you back
              </Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInput: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: 'cover',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  messageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 