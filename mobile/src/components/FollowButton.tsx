import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/auth/useAuth';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { useFollowStatus, useToggleFollow } from '../hooks/useFollows';

interface FollowButtonProps {
  userId: string;
  style?: any;
  textStyle?: any;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

export const FollowButton: React.FC<FollowButtonProps> = ({ 
  userId, 
  style, 
  textStyle, 
  size = 'sm',
  variant = 'default'
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = getColors(theme);
  
  // Use React Query hooks - prevents duplicate API calls and provides caching
  const { isFollowing, isFollowedBy, isLoading: isCheckingStatus } = useFollowStatus(userId);
  const toggleFollow = useToggleFollow(userId);

  // Calculate if this is a "Follow Back" scenario
  const isFollowBack = !isFollowing && isFollowedBy;
  const loading = toggleFollow.isPending;

  const handleFollowToggle = async () => {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('Invalid user ID for follow toggle');
      return;
    }
    
    try {
      await toggleFollow.mutateAsync(isFollowing);
      // React Query will automatically update the cache
    } catch (e: any) {
      // Error is handled by React Query's onError, but we should show user feedback
      console.error('Failed to update follow status:', e);
      // Note: In a production app, you might want to show a toast/alert here
      // For now, React Query's optimistic update rollback handles the UI state
    }
  };

  // Don't show follow button for own profile
  if (!user || user._id === userId) return null;

  // Get button styling based on state
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]];
    
    if (isCheckingStatus || loading) {
      return [...baseStyle, styles.loading];
    }
    
    if (isFollowing) {
      // Following state - white background with green border
      return [...baseStyle, styles.following];
    } else if (isFollowBack) {
      // Follow back state - green background
      return [...baseStyle, styles.followBack];
    } else {
      // Default follow state - blue background
      return [...baseStyle, styles.follow];
    }
  };

  const getTextStyle = () => {
    const baseTextStyle = [styles.buttonText, styles[`${size}Text`]];
    
    if (isFollowing) {
      return [...baseTextStyle, styles.followingText];
    } else {
      return [...baseTextStyle, styles.defaultText];
    }
  };

  const getIcon = () => {
    if (loading || isCheckingStatus) {
      return <ActivityIndicator size="small" color={isFollowing ? "#059669" : "#ffffff"} style={styles.icon} />;
    }
    
    if (isFollowing) {
      return <Ionicons name="person-remove" size={16} color="#059669" style={styles.icon} />;
    } else if (isFollowBack) {
      return <Ionicons name="repeat" size={16} color="#ffffff" style={styles.icon} />;
    } else {
      return <Ionicons name="person-add" size={16} color="#ffffff" style={styles.icon} />;
    }
  };

  const getLabel = () => {
    if (isCheckingStatus) return 'Loading...';
    if (loading) return 'Loading...';
    if (isFollowing) return 'Following';
    if (isFollowBack) return 'Follow Back';
    return 'Follow';
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={handleFollowToggle}
      disabled={isCheckingStatus || loading}
      activeOpacity={0.8}
    >
      {getIcon()}
      <Text style={[...getTextStyle(), textStyle]} numberOfLines={1}>
        {getLabel()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20, // Fully rounded like frontend
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    maxWidth: 120,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Size variants
  sm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 70,
    height: 32,
  },
  md: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 90,
    height: 36,
  },
  lg: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 100,
    height: 40,
  },
  // State styles matching frontend exactly
  follow: {
    backgroundColor: '#ff7300',
    borderColor: '#ff7300',
  },
  followBack: {
    backgroundColor: '#059669', // Green background
    borderColor: '#059669',
  },
  following: {
    backgroundColor: '#ffffff', // White background
    borderColor: '#10b981', // Green border
  },
  loading: {
    opacity: 0.7,
  },
  // Text styles
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  smText: {
    fontSize: 12,
  },
  mdText: {
    fontSize: 14,
  },
  lgText: {
    fontSize: 16,
  },
  defaultText: {
    color: '#ffffff',
  },
  followingText: {
    color: '#059669', // Green text for following state
  },
  icon: {
    marginRight: 4,
  },
}); 