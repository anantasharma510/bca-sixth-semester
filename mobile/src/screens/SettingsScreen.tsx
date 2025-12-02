import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  RefreshControl,
  StatusBar,
  Platform,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApiService } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUser } from '../hooks/useUser';
import { Header } from '../components/Header';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { getDisplayName, getUserInitials } from '../utils/user';
import { useUserStore } from '../stores/userStore';
import { getCacheBustedUrl, getBaseUrl } from '../utils/imageCache';

// Enhanced interfaces
interface UserData {
  _id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
}

interface BlockCounts {
  blockedUsers: number;
  blockedBy: number;
}

interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  iconBgColor: string;
  onPress?: () => void;
  showChevron?: boolean;
  badge?: string | number;
  destructive?: boolean;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: () => void;
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { get: getApi, delete: deleteApi } = useApiService();
  const { user: authUser, signOut, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [blockCounts, setBlockCounts] = useState<BlockCounts>({ blockedUsers: 0, blockedBy: 0 });
  const { theme, toggleTheme } = useTheme();
  const colors = getColors(theme);
  
  // Subscribe to store changes for immediate updates
  const currentUserImages = useUserStore((state) => state.currentUserImages);
  const getUserImage = useUserStore((state) => state.getUserImage);

  const handleBackToProfile = useCallback(() => {
    const parentNavigator = navigation.getParent?.();

    if (navigation.canGoBack()) {
      navigation.goBack();
      if (parentNavigator && typeof parentNavigator.navigate === 'function') {
        setTimeout(() => {
          parentNavigator.navigate('MainTabs', { screen: 'Profile' });
        }, 0);
      }
      return;
    }

    if (parentNavigator && typeof parentNavigator.navigate === 'function') {
      parentNavigator.navigate('MainTabs', { screen: 'Profile' });
    } else {
      navigation.navigate('MainTabs', { screen: 'Profile' });
    }
  }, [navigation]);

  // Use React Query for user data - prevents duplicate API calls
  const { data: currentUser, isLoading: userLoading, refetch: refetchUser } = useCurrentUser();
  
  const fetchBlockCounts = useCallback(async (): Promise<BlockCounts> => {
    try {
      const response = await getApi('/blocks/counts');
      return {
        blockedUsers: response.blockedUsersCount || 0,
        blockedBy: response.blockedByCount || 0,
      };
    } catch (err) {
      console.error('Failed to fetch block counts:', err);
      return { blockedUsers: 0, blockedBy: 0 };
    }
  }, [getApi]);

  // Load block counts only on mount, not on every focus
  useEffect(() => {
    if (isSignedIn) {
      fetchBlockCounts().then(setBlockCounts).catch(console.error);
    } else {
      // Clear block counts when signed out
      setBlockCounts({ blockedUsers: 0, blockedBy: 0 });
    }
  }, [isSignedIn, fetchBlockCounts]); // Include fetchBlockCounts in dependencies

  // Use React Query user data instead of fetching separately
  // Use useMemo to prevent unnecessary re-renders when object reference changes but content is same
  useEffect(() => {
    if (currentUser) {
      // Only update if data actually changed (prevent infinite loops)
      setUserData(prev => {
        // Check if user ID exists and matches, and images haven't changed
        if (prev?._id && currentUser._id && 
            prev._id === currentUser._id && 
            prev?.profileImageUrl === currentUser.profileImageUrl &&
            prev?.coverImageUrl === currentUser.coverImageUrl) {
          return prev; // No change, return previous to prevent re-render
        }
        return currentUser;
      });
      
      // Sync with global store
      const { updateCurrentUserImage } = useUserStore.getState();
      if (currentUser.profileImageUrl) {
        updateCurrentUserImage('profile', currentUser.profileImageUrl);
      }
      if (currentUser.coverImageUrl) {
        updateCurrentUserImage('cover', currentUser.coverImageUrl);
      }
    } else if (!currentUser && !userLoading) {
      // Clear user data if not loading and no user
      setUserData(null);
    }
  }, [currentUser, userLoading]);

  // Sync with global store when authUser changes (from useAuth hook)
  useEffect(() => {
    if (authUser) {
      const { updateCurrentUserImage } = useUserStore.getState();
      if (authUser.profileImageUrl) {
        updateCurrentUserImage('profile', authUser.profileImageUrl);
      }
      if (authUser.coverImageUrl) {
        updateCurrentUserImage('cover', authUser.coverImageUrl);
      }
    }
  }, [authUser]);

  // Update loading state based on React Query
  useEffect(() => {
    setLoading(userLoading);
  }, [userLoading]);

  // REMOVED useFocusEffect - React Query handles caching and refetching automatically
  // Only refresh block counts on manual pull-to-refresh if needed

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your posts, comments, messages, and data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Final Confirmation',
      'Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete Forever',
          style: 'destructive',
          onPress: deleteAccount,
        },
      ]
    );
  };

  const deleteAccount = async () => {
    try {
      const response = await deleteApi('/protected/account');
      
      if (response.success) {
        Alert.alert(
          'Account Deleted',
          'Your account has been successfully deleted. You will be redirected to the login screen.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Sign out and redirect to login
                signOut();
                // Explicit navigation to ensure redirect happens
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'SignIn' }],
                });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to delete account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    }
  };

  const onRefresh = async () => {
    if (!isSignedIn) {
      setRefreshing(false);
      return;
    }
    
    setRefreshing(true);
    try {
      // Refetch user data and block counts
      const results = await Promise.allSettled([
        refetchUser(),
        fetchBlockCounts().then(setBlockCounts),
      ]);
      
      // Check for errors
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to refresh ${index === 0 ? 'user data' : 'block counts'}:`, result.reason);
        }
      });
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Memoize profile image URL to prevent flickering
  const profileImageMemo = useMemo(() => {
    const storeProfileImage = currentUserImages.profileImageUrl || getUserImage('current', 'profile', null);
    const userDataImage = userData?.profileImageUrl;
    const authUserImage = authUser?.profileImageUrl;
    const profileImageUrl = storeProfileImage || userDataImage || authUserImage;
    const finalProfileUrl = profileImageUrl ? getCacheBustedUrl(profileImageUrl, false) : null;
    const baseUrl = getBaseUrl(profileImageUrl);
    return {
      imageUrl: finalProfileUrl,
      baseUrl: baseUrl,
      imageKey: baseUrl ? `profile-${baseUrl}` : 'profile-placeholder'
    };
  }, [currentUserImages.profileImageUrl, userData?.profileImageUrl, authUser?.profileImageUrl, getUserImage]);

  const primaryUser = userData || authUser || null;
  const displayName = getDisplayName(primaryUser, 'User');
  const profileInitial = getUserInitials(primaryUser);

  const themeLabel = theme === 'dark' ? 'Dark mode' : 'Light mode';
  const themeIcon = theme === 'dark' ? 'moon' : 'sun';
  const blockedSummary =
    blockCounts.blockedUsers === 0
      ? 'No blocked users'
      : `${blockCounts.blockedUsers} blocked`;

  const settingSections: Array<{ title: string; items: SettingItem[] }> = [
    {
      title: 'Other Settings',
      items: [
        {
          id: 'profile',
          title: 'Profile details',
          description: 'Manage your profile information',
          icon: 'user',
          iconColor: '#EF4444',
          iconBgColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          onPress: handleBackToProfile,
          showChevron: true,
        },
        {
          id: 'darkMode',
          title: 'Dark mode',
          description: theme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled',
          icon: theme === 'dark' ? 'moon' : 'sun',
          iconColor: '#EF4444',
          iconBgColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          isToggle: true,
          toggleValue: theme === 'dark',
          onToggle: toggleTheme,
          showChevron: false,
        },
      ],
    },
    {
      title: '',
      items: [
        {
          id: 'subscription',
          title: 'Subscription & Billing',
          description: 'View your plan and payments',
          icon: 'diamond',
          iconColor: '#FBBF24',
          iconBgColor: theme === 'dark' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.1)',
          onPress: () => navigation.navigate('SubscriptionHistory'),
          showChevron: true,
        },
        {
          id: 'wishlist',
          title: 'Saved outfits',
          description: 'View and manage your outfit wishlist',
          icon: 'heart',
          iconColor: '#EF4444',
          iconBgColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          onPress: () => navigation.navigate('WishlistOutfits'),
          showChevron: true,
        },
        {
          id: 'blocked',
          title: 'Blocked Users',
          description:
            blockCounts.blockedUsers === 0
              ? 'No users blocked'
              : `${blockCounts.blockedUsers} user${blockCounts.blockedUsers === 1 ? '' : 's'} blocked`,
          icon: 'slash',
          iconColor: '#EF4444',
          iconBgColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          onPress: () => navigation.navigate('BlockedUsers'),
          showChevron: true,
          badge: blockCounts.blockedUsers > 0 ? blockCounts.blockedUsers : undefined,
        },
        {
          id: 'about',
          title: 'About application',
          description: 'Version 1.0.2 (Build 6)',
          icon: 'info',
          iconColor: '#EF4444',
          iconBgColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          showChevron: true,
        },
        {
          id: 'support',
          title: 'Help/FAQ',
          description: 'Get support and answers',
          icon: 'help-circle',
          iconColor: '#EF4444',
          iconBgColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          onPress: () => navigation.navigate('Support'),
          showChevron: true,
        },
      ],
    },
    {
      title: '',
      items: [
        {
          id: 'terms',
          title: '服务条款',
          description: '阅读平台规则与使用约定',
          icon: 'file-text',
          iconColor: '#EF4444',
          iconBgColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          onPress: () => navigation.navigate('TermsOfService'),
          showChevron: true,
        },
        {
          id: 'privacy',
          title: '隐私政策',
          description: '了解数据收集与保护方式',
          icon: 'shield',
          iconColor: '#EF4444',
          iconBgColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          onPress: () => navigation.navigate('PrivacyPolicy'),
          showChevron: true,
        },
      ],
    },
    {
      title: '',
      items: [
        {
          id: 'deleteAccount',
          title: 'Deactivate my account',
          description: 'Permanently delete your account',
          icon: 'trash-2',
          iconColor: '#EF4444',
          iconBgColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          onPress: handleDeleteAccount,
          showChevron: true,
          destructive: true,
        },
      ],
    },
    {
      title: '',
      items: [
        {
          id: 'signout',
          title: 'Sign Out',
          description: `Sign out of ${displayName}'s account`,
          icon: 'log-out',
          iconColor: '#EF4444',
          iconBgColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          onPress: handleSignOut,
          showChevron: true,
          destructive: true,
        },
      ],
    },
  ];

  if (loading && !userData) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]} edges={['top']}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading settings...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <Header
        navigation={navigation}
        title="Settings"
        showBackButton
        onBackPress={handleBackToProfile}
      />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      >
        {/* User Profile Card */}
        <TouchableOpacity 
          style={styles.headerSection}
          onPress={handleBackToProfile}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={theme === 'dark' ? ['#5B21B6', '#7C3AED'] : ['#6366f1', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCard}
          >
            <View style={styles.userInfo}>
              <View style={styles.profilePicture}>
                {profileImageMemo.imageUrl ? (
                  <Image
                    key={profileImageMemo.imageKey}
                    source={{ uri: profileImageMemo.imageUrl }}
                    style={styles.profileImage}
                    contentFit="cover"
                    cachePolicy="disk"
                    transition={200}
                    onError={(error: any) => {
                      console.error('❌ SettingsScreen: Profile image failed to load:', {
                        url: profileImageMemo.imageUrl?.substring(0, 50) + '...',
                        error,
                      });
                    }}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileImageText}>{profileInitial}</Text>
                  </View>
                )}
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{displayName}</Text>
                <Text style={styles.userEmail}>
                  {userData?.email || authUser?.email || 'No email'}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Settings Sections */}
        {settingSections.map((section, sectionIndex) => (
          <View key={section.title || sectionIndex} style={styles.section}>
            {section.title && (
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
                {section.title.toUpperCase()}
              </Text>
            )}
            <View style={[styles.sectionContainer, { backgroundColor: colors.background.secondary }]}>
              {section.items.map((item, itemIndex) => (
                <SettingRow
                  key={item.id}
                  item={item}
                  colors={colors}
                  isLast={itemIndex === section.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footerSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Separate component for setting rows
const SettingRow: React.FC<{
  item: SettingItem;
  colors: any;
  isLast: boolean;
}> = ({ item, colors, isLast }) => (
  <TouchableOpacity
    style={[
      styles.settingItem,
      { backgroundColor: colors.background.primary },
      !isLast && { borderBottomColor: colors.border.light, borderBottomWidth: StyleSheet.hairlineWidth },
    ]}
    onPress={item.isToggle ? undefined : item.onPress}
    activeOpacity={item.onPress && !item.isToggle ? 0.6 : 1}
    disabled={item.isToggle || !item.onPress}
  >
    <View style={styles.settingContent}>
      {/* Icon */}
      <View style={[styles.settingIcon, { backgroundColor: item.iconBgColor }]}>
        <Icon name={item.icon} size={22} color={item.iconColor} />
      </View>

      {/* Content */}
      <View style={styles.settingInfo}>
        <Text
          style={[
            styles.settingTitle,
            { color: item.destructive ? colors.error[500] : item.iconColor },
          ]}
        >
          {item.title}
        </Text>
        <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
          {item.description}
        </Text>
      </View>

      {/* Right side - Badge, Toggle, and/or Chevron */}
      <View style={styles.settingRight}>
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: colors.primary[500] }]}>
            <Text style={[styles.badgeText, { color: colors.background.primary }]}>
              {item.badge}
            </Text>
          </View>
        )}
        {item.isToggle && item.onToggle && (
          <Switch
            value={item.toggleValue}
            onValueChange={item.onToggle}
            trackColor={{ false: colors.border.light, true: item.iconColor }}
            thumbColor={item.toggleValue ? '#FFFFFF' : '#F3F4F6'}
            ios_backgroundColor={colors.border.light}
          />
        )}
        {item.showChevron && (
          <Icon name="chevron-right" size={20} color={colors.text.secondary} />
        )}
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profilePicture: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    overflow: 'hidden',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  profileImageText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginHorizontal: 20,
    textTransform: 'uppercase',
  },
  sectionContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  settingItem: {
    backgroundColor: 'transparent',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingIconText: {
    fontSize: 20,
  },
  settingInfo: {
    flex: 1,
    minWidth: 0,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 19,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chevronText: {
    fontSize: 20,
    fontWeight: '300',
  },
  footerSpace: {
    height: 100,
  },
});