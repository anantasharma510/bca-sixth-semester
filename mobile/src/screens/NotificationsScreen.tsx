import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Platform, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { getColors } from '../constants/colors';
import { Header } from '../components/Header';
import type { Notification } from '../services/api/notifications';
import { useSocket } from '../hooks/useSocket';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { getDisplayName, getUserInitials } from '../utils/user';

// Skeleton placeholder for loading state
const NotificationSkeleton = ({ theme, colors }: { theme: string; colors: any }) => {
  // Render 6 skeleton items
  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {[...Array(6)].map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.notificationItem,
            { backgroundColor: theme === 'dark' ? colors.primary[900] + '20' : colors.primary[50] },
          ]}
        >
          <View style={styles.notificationContent}>
            {/* Icon skeleton */}
            <View style={[
              styles.notificationIcon,
              { backgroundColor: theme === 'dark' ? colors.primary[800] + '40' : colors.primary[100] },
            ]} />
            {/* Avatar skeleton */}
            <View style={[styles.avatarContainer]}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary[200], opacity: 0.5 }]} />
            </View>
            {/* Text skeletons */}
            <View style={styles.notificationBody}>
              <View style={{ width: 120, height: 14, backgroundColor: colors.neutral[200], borderRadius: 6, marginBottom: 8, opacity: 0.5 }} />
              <View style={{ width: 180, height: 12, backgroundColor: colors.neutral[200], borderRadius: 6, marginBottom: 6, opacity: 0.4 }} />
              <View style={{ width: 80, height: 10, backgroundColor: colors.neutral[200], borderRadius: 6, opacity: 0.3 }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export default function NotificationsScreen({ navigation }: any) {
  const { isSignedIn, userId } = useAuth();
  const { socket, isConnected, on, off } = useSocket();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification, loadNotifications, currentPage, hasMoreNotifications } = useNotifications();
  const { theme } = useTheme();
  const colors = getColors(theme);

  const loadMoreNotifications = useCallback(async () => {
    if (!hasMoreNotifications || isLoading) return;
    await loadNotifications(currentPage + 1, true);
  }, [isLoading, hasMoreNotifications, currentPage, loadNotifications]);

  // Load notifications on component mount and when auth state changes

  const handleNotificationPress = async (notification: any) => {
    try {
      // Mark as read if not already read
      if (!notification.isRead) {
        await markAsRead(notification._id);
      }

      // Navigate to the relevant content based on notification type
      switch (notification.type) {
        case 'like':
        case 'comment':
        case 'repost':
          if (notification.post?._id) {
            navigation.navigate('PostDetail', { postId: notification.post._id });
          }
          break;
        case 'follow':
          if (notification.sender?._id) {
            navigation.navigate('UserProfile', { userId: notification.sender._id });
          }
          break;
        case 'mention':
          if (notification.post?._id) {
            navigation.navigate('PostDetail', { postId: notification.post._id });
          }
          break;
        default:
          // For other types, navigate to the sender's profile
          if (notification.sender?._id) {
            navigation.navigate('UserProfile', { userId: notification.sender._id });
          }
          break;
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
      Alert.alert('Error', 'Failed to process notification');
    }
  };

  // Initialize Socket.IO for real-time updates
  useEffect(() => {
    if (!socket || !isConnected || !isSignedIn || !userId) return;

    console.log('NotificationsScreen: Setting up socket event listeners...');

    const handleNewNotification = (notification: any) => {
      console.log('NotificationsScreen: New notification received:', notification);
      const transformedNotification = {
        ...notification,
        message: generateNotificationMessage(notification)
      };
      
      // setNotifications(prev => [transformedNotification, ...prev]); // This is now managed by the context
      // setUnreadCount(prev => prev + 1); // This is now managed by the context
    };

    const handleNotificationUpdate = (data: { notificationId: string; isRead: boolean }) => {
      console.log('NotificationsScreen: Notification update received:', data);
      if (data.isRead) {
        // setNotifications(prev => 
        //   prev.map(notif => 
        //     notif._id === data.notificationId 
        //       ? { ...notif, isRead: true }
        //       : notif
        // )
        // );
        // setUnreadCount(prev => Math.max(0, prev - 1)); // This is now managed by the context
      }
    };

    const handleNotificationDelete = (data: { notificationId: string }) => {
      console.log('NotificationsScreen: Notification delete received:', data);
      // setNotifications(prev => prev.filter(notif => notif._id !== data.notificationId)); // This is now managed by the context
    };

    // Set up event listeners
    on('newNotification', handleNewNotification);
    on('notificationUpdate', handleNotificationUpdate);
    on('notificationDelete', handleNotificationDelete);

    return () => {
      // Clean up event listeners
      off('newNotification', handleNewNotification);
      off('notificationUpdate', handleNotificationUpdate);
      off('notificationDelete', handleNotificationDelete);
    };
  }, [socket, isConnected, isSignedIn, userId, on, off]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const generateNotificationMessage = (notification: any): string => {
    const senderName = notification?.sender 
      ? `${notification.sender.firstName || ''} ${notification.sender.lastName || ''}`.trim()
      : 'Someone';

    switch (notification.type) {
      case 'like':
        return `${senderName} liked your post`;
      case 'comment':
        return `${senderName} commented on your post`;
      case 'repost':
        return `${senderName} reposted your post`;
      case 'follow':
        return `${senderName} started following you`;
      case 'mention':
        return `${senderName} mentioned you in a post`;
      default:
        return `${senderName} interacted with your content`;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return 'heart';
      case 'comment': return 'message-circle';
      case 'follow': return 'user-plus';
      case 'repost': return 'repeat';
      case 'mention': return 'at-sign';
      case 'reply': return 'corner-up-left';
      default: return 'bell';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    return (
      <TouchableOpacity 
        style={[
          styles.notificationItem,
          { 
            backgroundColor: colors.background.primary, 
            borderBottomColor: colors.border.light 
          },
          !item.isRead && [
            styles.unreadNotification,
            { 
              backgroundColor: theme === 'dark' 
                ? `${colors.primary[900]}40` // Semi-transparent dark blue
                : colors.primary[50] 
            }
          ]
        ]}
        activeOpacity={0.7}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => 
          Alert.alert(
            'Delete Notification',
            'Are you sure you want to delete this notification?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', onPress: () => deleteNotification(item._id), style: 'destructive' },
            ]
          )
        }
      >
      <View style={styles.notificationContent}>
        {/* Notification type icon */}
        <View style={[
          styles.notificationIcon,
          { 
            backgroundColor: theme === 'dark' 
              ? `${colors.primary[800]}60` // More transparent for dark mode
              : colors.primary[100] 
          }
        ]}>
          <Icon 
            name={getNotificationIcon(item.type)} 
            size={16} 
            color={theme === 'dark' ? colors.primary[300] : colors.primary[500]} 
          />
        </View>
        
        {/* User avatar */}
        <View style={styles.avatarContainer}>
          {item.sender?.profileImageUrl ? (
            <Image 
              source={{ uri: item.sender.profileImageUrl }} 
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary[500] }]}>
              <Text style={styles.avatarText}>
                {getUserInitials(item.sender)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.notificationBody}>
          <View style={styles.notificationHeader}>
            <Text style={[
              styles.senderName,
              !item.isRead && styles.unreadText,
              { 
                color: colors.text.primary,
                fontWeight: !item.isRead ? '600' : '500'
              }
            ]}>
              {getDisplayName(item.sender, 'Unknown User')}
            </Text>
            <Text style={[
              styles.notificationAction,
              { color: colors.text.secondary }
            ]}>
              {generateNotificationMessage(item).replace(/^[^ ]+ /, '')}
            </Text>
            <Text style={[styles.notificationTime, { color: colors.text.secondary }]}>
              {item.timeAgo || formatTimeAgo(item.createdAt)}
            </Text>
          </View>
          
          {/* Show post content preview */}
          {item.post && (
            <Text style={[
              styles.postPreview,
              { color: colors.text.secondary }
            ]}>
              "{item.post.content.length > 50 ? item.post.content.substring(0, 50) + '...' : item.post.content}"
            </Text>
          )}
          
          {/* Show comment content preview */}
          {item.comment && (
            <Text style={[
              styles.commentPreview,
              { color: colors.text.secondary }
            ]}>
              "{item.comment.content.length > 50 ? item.comment.content.substring(0, 50) + '...' : item.comment.content}"
            </Text>
          )}
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!item.isRead && (
            <View 
              style={[
                styles.unreadDot, 
                { 
                  backgroundColor: theme === 'dark' 
                    ? colors.primary[300] 
                    : colors.primary[500],
                  shadowColor: theme === 'dark' ? colors.primary[300] : colors.primary[500],
                }
              ]} 
            />
          )}
          <TouchableOpacity
            style={{ padding: 4, borderRadius: 4 }}
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                'Delete Notification',
                'Are you sure you want to delete this notification?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', onPress: () => deleteNotification(item._id), style: 'destructive' },
                ]
              );
            }}
          >
            <Icon name="trash-2" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  if (!isSignedIn) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background.primary }]}>
        <Icon name="bell" size={48} color={colors.text.secondary} />
        <Text style={[styles.emptyText, { color: colors.text.primary }]}>Notifications</Text>
        <Text style={[styles.emptySubText, { color: colors.text.secondary }]}>Sign in to view your notifications</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <NotificationSkeleton theme={theme} colors={colors} />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Header
        navigation={navigation}
        title="Notifications"
        showBackButton
        showNotificationsIcon={false}
      />
      
      {/* Mark all as read button */}
      {unreadCount > 0 && notifications.length > 0 && (
        <View style={[styles.actionBar, { borderBottomColor: colors.border.light }]}>
          <TouchableOpacity
            style={[styles.markAllReadButton, { backgroundColor: colors.neutral[100] }]}
            onPress={markAllAsRead}
          >
            <Icon name="check" size={16} color={colors.primary[500]} />
            <Text style={[styles.markAllReadText, { color: colors.primary[500] }]}>
              Mark all as read
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item, index) => item?._id || `notification-${index}`}
        contentContainerStyle={[styles.listContainer, { backgroundColor: colors.background.primary }]}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (hasMoreNotifications) loadMoreNotifications(); }}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="bell" size={48} color={colors.text.secondary} />
            <Text style={[styles.emptyText, { color: colors.text.primary }]}>No notifications yet</Text>
            <Text style={[styles.emptySubText, { color: colors.text.secondary }]}>
              When someone likes, comments, or follows you, you'll see it here
            </Text>
          </View>
        }
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  markAllReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  markAllReadText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    borderBottomWidth: 1,
    minHeight: 72, // Ensure consistent height
  },
  unreadNotification: {
    // Styling applied inline for theme support
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingVertical: 14, // Slightly more padding for better touch targets
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    // Add subtle shadow for better visual separation
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationBody: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 15,
    lineHeight: 20,
    marginRight: 4,
  },
  notificationAction: {
    fontSize: 15,
    lineHeight: 20,
    marginRight: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 13,
    opacity: 0.8,
  },
  postPreview: {
    fontSize: 13,
    lineHeight: 16,
    marginTop: 2,
    fontStyle: 'italic',
  },
  commentPreview: {
    fontSize: 13,
    lineHeight: 16,
    marginTop: 2,
    fontStyle: 'italic',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 4,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 6,
    // Add subtle shadow for better visibility
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
}); 