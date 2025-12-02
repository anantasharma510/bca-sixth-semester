import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, Image, Platform } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors, getColors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Feather';
import { useInteractionGuard } from '../hooks/useInteractionGuard';
import { notificationAPI, type Notification } from '../services/api/notifications';
import { useTheme } from '../context/ThemeContext';
import { useApiService } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocket } from '../hooks/useSocket';
import { useNotifications } from '../context/NotificationContext';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveApiBaseUrl } from '../config/env';
import { getUserInitials } from '../utils/user';

const API_BASE_URL = resolveApiBaseUrl();

interface HeaderProps {
  navigation: any;
  title?: string;
  showBackButton?: boolean;
  rightButton?: {
    icon: string;
    onPress: () => void;
  };
  showNotificationsIcon?: boolean;
  showMessagesIcon?: boolean;
  onBackPress?: () => void;
}

export const Header = ({
  navigation,
  title = 'Home',
  showBackButton = false,
  rightButton,
  showNotificationsIcon = true,
  showMessagesIcon = true,
  onBackPress,
}: HeaderProps) => {
  const { isSignedIn, user, signOut } = useAuth();
  const currentUserId = user?._id;
  const guardInteraction = useInteractionGuard();
  const { get: getApi } = useApiService();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { unreadCount } = useNotifications();
  const { socket, isConnected, on, off } = useSocket();
  // Use user from useAuth hook - it already uses React Query internally
  // No need to call useCurrentUser() again here to avoid duplicate API calls
  const userData = user;
  const { theme } = useTheme();
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();

  // unreadCount is provided by NotificationContext via useNotifications()
  // No need to fetch it separately - the context handles it

  // Initialize Socket.IO connection for real-time updates
  useEffect(() => {
    if (!socket || !isConnected || !isSignedIn || !currentUserId) return;

    console.log('Header: Setting up socket event listeners...');

    const handleNewNotification = (notification: any) => {
      console.log('Header: New notification received:', notification);
      // setUnreadCount(prev => prev + 1); // This line is removed as unreadCount is now from context
    };

    const handleNotificationRead = (data: any) => {
      console.log('Header: Notification marked as read:', data);
      // setUnreadCount(prev => Math.max(0, prev - 1)); // This line is removed as unreadCount is now from context
    };

    const handleAllNotificationsRead = () => {
      console.log('Header: All notifications marked as read');
      // setUnreadCount(0); // This line is removed as unreadCount is now from context
    };

    // Set up event listeners
    on('newNotification', handleNewNotification);
    on('notificationRead', handleNotificationRead);
    on('allNotificationsRead', handleAllNotificationsRead);

    return () => {
      // Clean up event listeners
      off('newNotification', handleNewNotification);
      off('notificationRead', handleNotificationRead);
      off('allNotificationsRead', handleAllNotificationsRead);
    };
  }, [socket, isConnected, isSignedIn, currentUserId, on, off]);

  // REMOVED useFocusEffect - React Query handles caching and refetching automatically
  // userData is provided by useAuth hook which uses React Query internally
  // unreadCount is provided by NotificationContext - no need to fetch separately

  const handleSignIn = () => {
    navigation.navigate('SignIn');
  };

  const handleNotifications = () => {
    if (!isSignedIn) {
      guardInteraction('access notifications');
      return;
    }
    navigation.navigate('Notifications');
  };

  const handleMessages = () => {
    if (!isSignedIn) {
      guardInteraction('access messages');
      return;
    }
    navigation.navigate('Messages');
  };

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleProfile = () => {
    setShowUserMenu(false);
    navigation.navigate('Profile');
  };

  const handleSettings = () => {
    setShowUserMenu(false);
    navigation.navigate('Settings');
  };

  const handleSignOut = () => {
    setShowUserMenu(false);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: () => signOut(), style: 'destructive' },
      ]
    );
  };

  const getInitials = () => getUserInitials(userData || user);

  return (
    <View style={[styles.header, {
      backgroundColor: colors.background.primary,
      borderBottomColor: colors.border.light,
      paddingTop: insets.top, // Add safe area top padding for status bar
    }]}>
      <View style={styles.container}>
        {/* Left Side - Back Button or Logo */}
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBackPress ?? (() => navigation.goBack())}
            >
              <Icon name="arrow-left" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <Image 
                  source={require('../../assets/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                {/* <Text
                  style={[
                    styles.logo,
                    {
                      color: theme === 'dark' ? colors.text.primary : '#FF7300',
                      letterSpacing: 1,
                    },
                  ]}
                >
                HamroCircle
                </Text> */}
              </View>
            </View>
          )}
        </View>

        {/* Center - Title (only show on certain screens) */}
        {showBackButton && (
          <View style={styles.titleContainer} pointerEvents="none">
            <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
          </View>
        )}

        {/* Right Side Actions */}
        <View style={styles.actions}>
          {isSignedIn ? (
            <>
              {/* Custom Right Button */}
              {rightButton && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={rightButton.onPress}
                >
                  <Icon name={rightButton.icon} size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              )}

              {/* Search Icon */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.navigate('Search')}
              >
                <Icon name="search" size={20} color={colors.text.secondary} />
              </TouchableOpacity>

              {/* Notifications */}
              {showNotificationsIcon && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleNotifications}
                >
                  <Icon name="bell" size={20} color={colors.text.secondary} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Messages */}
              {showMessagesIcon && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleMessages}
                >
                  <Icon name="send" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              )}

            </>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleSignIn}
              style={styles.signInWrapper}
            >
              <LinearGradient
                colors={['#FF914D', '#FF5C2C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.signInGradient}
              >
                <Icon name="log-in" size={16} color="#ffffff" style={styles.signInIcon} />
                <Text style={styles.signInButtonText}>Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* User Menu Modal */}
      <Modal
        visible={showUserMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserMenu(false)}
        >
          <View style={[styles.userMenu, { backgroundColor: colors.background.primary }]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleProfile}>
              <Icon name="user" size={20} color={colors.text.primary} />
              <Text style={[styles.menuText, { color: colors.text.primary }]}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
              <Icon name="settings" size={20} color={colors.text.primary} />
              <Text style={[styles.menuText, { color: colors.text.primary }]}>Settings</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: colors.border.light }]} />

            <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
              <Icon name="log-out" size={20} color={Colors.error[500]} />
              <Text style={[styles.menuText, { color: Colors.error[500] }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    // backgroundColor will be set dynamically
    borderBottomWidth: 1,
    // borderBottomColor will be set dynamically
    paddingTop: 50, // Account for status bar
    paddingBottom: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  logoContainer: {
    flex: 1,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    height: 32,
    width: 80,
  },
  logoImage: {
    position: 'absolute',
    height: 32,
    width: 80,
    left: -10,
    top: 0,
    zIndex: 1,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', // Decorative font similar to Pacifico
    zIndex: 10,
    position: 'relative',
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    // color will be set dynamically
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.error[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  signInWrapper: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  signInIcon: {
    marginRight: 6,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 16,
  },
  userMenu: {
    // backgroundColor will be set dynamically
    borderRadius: 12,
    padding: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuText: {
    fontSize: 16,
    // color will be set dynamically
    marginLeft: 12,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    // backgroundColor will be set dynamically
    marginVertical: 4,
  },
}); 