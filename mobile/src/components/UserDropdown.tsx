import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { authClient } from '../lib/auth-client';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { Button } from './ui/Button';

export const UserDropdown = ({ navigation }: { navigation: any }) => {
  const { user, isSignedIn, isLoading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { theme } = useTheme();
  const colors = getColors(theme);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await authClient.signOut();
              navigation.navigate('AuthPrompt');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  if (!isSignedIn || !user) {
    return null;
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const profileImageUrl = user?.image || '/placeholder-user.jpg';

  return (
    <View style={{ backgroundColor: colors.background.primary, borderTopWidth: 1, borderTopColor: colors.border.light, padding: 16 }}>
      <TouchableOpacity 
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
        onPress={handleProfilePress}
        disabled={isLoading}
      >
        <View style={{ marginRight: 12 }}>
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
          ) : (
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary[500], justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.inverse }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginBottom: 2 }} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary }} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={{ alignItems: 'stretch' }}>
        <Button
          title={isSigningOut ? 'Signing out...' : 'Sign Out'}
          onPress={handleSignOut}
          disabled={isSigningOut || isLoading}
          variant="outline"
          style={{ borderColor: colors.error[500] }}
        />
      </View>
    </View>
  );
}; 