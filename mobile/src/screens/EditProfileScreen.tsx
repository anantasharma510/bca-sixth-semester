import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useApiService } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Button } from '../components/ui/Button';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUser, useRefreshUser } from '../hooks/useUser';
import * as WebBrowser from 'expo-web-browser';
import { useAllowBackNavigation } from '../hooks/useAndroidBackHandler';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../stores/userStore';
import { markImageUpdated, getCacheBustedUrl, getBaseUrl } from '../utils/imageCache';

// Utility functions (same as original)
function isValidUrl(url: string) {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Simple Modern Input Component
interface SimpleInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'url' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  maxLength?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  [key: string]: any; // For other TextInput props
}

const SimpleInput: React.FC<SimpleInputProps> = ({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default', maxLength, icon, ...props }) => {
  const { theme } = useTheme();
  const colors = getColors(theme);

  return (
    <View style={styles.simpleInputContainer}>
      <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>{label}</Text>
      <View style={[styles.simpleInputWrapper, { backgroundColor: colors.background.secondary }]}>
        <TextInput
          style={[
            styles.simpleInput,
            {
              color: colors.text.primary,
              textAlignVertical: multiline ? 'top' : 'center',
            }
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          multiline={multiline}
          keyboardType={keyboardType}
          maxLength={maxLength}
          {...props}
        />
        {icon && (
          <Ionicons 
            name={icon} 
            size={20} 
            color={colors.text.secondary} 
            style={styles.rightIcon}
          />
        )}
      </View>
    </View>
  );
};


type EditProfileRouteParams = {
  onProfileUpdated?: (updatedUser?: any) => void;
};

export default function EditProfileScreen({ route }: { route: { params?: EditProfileRouteParams } }) {
  const navigation = useNavigation();
  const { get: getApi, put: putApi, upload: uploadApi } = useApiService();
  const { onProfileUpdated } = route?.params || {};
  const { user } = useAuth();
  // Use React Query for user data - prevents duplicate API calls
  const { data: currentUser, isLoading: userLoading, refetch: refetchUser } = useCurrentUser();
  const { refreshUser } = useRefreshUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  useAllowBackNavigation();
  
  // State variables (same as original)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [initialProfile, setInitialProfile] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    bio: '',
    website: '',
    location: '',
    profileImageUrl: '',
    coverImageUrl: '',
  });
  const { theme } = useTheme();
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();

  // Use React Query user data instead of direct API call
  useEffect(() => {
    if (currentUser) {
      // Get images from store first (for immediate updates), fallback to API response
      const { getUserImage } = useUserStore.getState();
      const storeProfileImage = getUserImage('current', 'profile', currentUser.profileImageUrl);
      const storeCoverImage = getUserImage('current', 'cover', currentUser.coverImageUrl);
      
      // Use store image if available, otherwise use API response
      const finalProfileImage = storeProfileImage || currentUser.profileImageUrl || '';
      const finalCoverImage = storeCoverImage || currentUser.coverImageUrl || '';
      
      setFormData({
        bio: currentUser.bio || '',
        website: currentUser.website || '',
        location: currentUser.location || '',
        profileImageUrl: finalProfileImage,
        coverImageUrl: finalCoverImage,
      });
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
      setUsername(currentUser.username || '');
      setInitialProfile({
        bio: currentUser.bio || '',
        website: currentUser.website || '',
        location: currentUser.location || '',
        profileImageUrl: finalProfileImage,
        coverImageUrl: finalCoverImage,
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        username: currentUser.username || '',
      });
    }
  }, [currentUser]);
  
  // Update loading state
  useEffect(() => {
    setLoading(userLoading);
  }, [userLoading]);
  
  // Get images from store as fallback
  const currentUserImages = useUserStore((state) => state.currentUserImages);
  
  // Memoize cover image URL with cache-busting (after all hooks, before early returns)
  // Use formData first (for immediate updates after upload), then store as fallback
  const coverImageMemo = useMemo(() => {
    const coverImageUrl = formData.coverImageUrl || currentUserImages.coverImageUrl;
    if (!coverImageUrl) return null;
    // Always cache-bust to ensure fresh image after upload
    const finalUrl = getCacheBustedUrl(coverImageUrl, true);
    const baseUrl = getBaseUrl(coverImageUrl);
    return {
      imageUrl: finalUrl,
      imageKey: baseUrl ? `edit-cover-${baseUrl}` : 'edit-cover-placeholder'
    };
  }, [formData.coverImageUrl, currentUserImages.coverImageUrl]);
  
  // Memoize profile image URL with cache-busting (after all hooks, before early returns)
  // Use formData first (for immediate updates after upload), then store as fallback
  const profileImageMemo = useMemo(() => {
    const profileImageUrl = formData.profileImageUrl || currentUserImages.profileImageUrl;
    if (!profileImageUrl) return null;
    // Always cache-bust to ensure fresh image after upload
    const finalUrl = getCacheBustedUrl(profileImageUrl, true);
    const baseUrl = getBaseUrl(profileImageUrl);
    return {
      imageUrl: finalUrl,
      imageKey: baseUrl ? `edit-profile-${baseUrl}` : 'edit-profile-placeholder'
    };
  }, [formData.profileImageUrl, currentUserImages.profileImageUrl]);

  const pickImage = async (type: 'profile' | 'cover') => {
    const aspect: [number, number] = type === 'cover' ? [3, 1] : [1, 1];
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const image = result.assets[0];
      if (image.uri) {
        if (type === 'profile') {
          setFormData((prev) => ({ ...prev, profileImageUrl: image.uri }));
        } else {
          setFormData((prev) => ({ ...prev, coverImageUrl: image.uri }));
        }
        uploadImage(image.uri, type);
      }
    }
  };

  // Include all other original functions (uploadImage, testConnection, etc.)
  // ... (keeping all the original logic functions)

  const uploadImage = async (uri: string, type: 'profile' | 'cover') => {
    try {
      console.log(`🔄 Starting ${type} image upload...`, { uri, type });
      
      if (!uri) {
        throw new Error('No image URI provided');
      }
      
      if (type === 'profile') setUploadingProfile(true);
      if (type === 'cover') setUploadingCover(true);
      
      // Verify file exists before uploading (important for camera images)
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error(`Image file does not exist: ${uri}`);
        }
        console.log(`📁 File verified:`, { 
          uri: uri.substring(0, 50) + '...', 
          exists: fileInfo.exists,
          size: fileInfo.size 
        });
      } catch (fileError: any) {
        console.error(`❌ Error verifying file:`, fileError);
        throw new Error(`Failed to verify image file: ${fileError.message}`);
      }
      
      const uploadFormData = new FormData();
      const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${type}-image-${Date.now()}.${fileExtension}`;
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      
      // React Native FormData format - use URI directly (same as ComposePost)
      (uploadFormData as any).append('image', {
        uri: uri, // Use URI directly without Platform check or file:// replacement
        type: mimeType,
        name: fileName,
      });
      
      uploadFormData.append('type', type);
      
      console.log(`📤 Uploading ${type} image with FormData:`, {
        fileName,
        mimeType,
        uri: uri.substring(0, 50) + '...',
      });
      
      const result = await uploadApi('/protected/profile/upload-image', uploadFormData, {
        timeout: 120000, // 120 second timeout for large image uploads
      });
      
      console.log(`✅ Upload successful:`, JSON.stringify(result, null, 2));
      
      // Handle different response formats - check all possible locations
      const imageUrl = result?.imageUrl || 
                      result?.data?.imageUrl || 
                      result?.url || 
                      result?.data?.url ||
                      (result?.data && typeof result.data === 'string' ? result.data : null) ||
                      null;
      
      console.log(`🔍 Extracted ${type} image URL:`, {
        hasResult: !!result,
        resultKeys: result ? Object.keys(result) : [],
        imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : null,
        imageUrlType: typeof imageUrl,
        imageUrlLength: imageUrl ? imageUrl.length : 0,
      });
      
      if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
        console.error('❌ Upload succeeded but invalid image URL returned:', {
          result,
          extractedUrl: imageUrl,
          resultType: typeof result,
        });
        throw new Error('Upload succeeded but no valid image URL returned');
      }
      
      console.log(`📸 Received ${type} image URL:`, imageUrl.substring(0, 100) + '...');
      
      // Update profile formData state with new image URL
      if (type === 'profile') {
        setFormData((prev) => ({ ...prev, profileImageUrl: imageUrl }));
      } else {
        setFormData((prev) => ({ ...prev, coverImageUrl: imageUrl }));
      }
      
      // IMMEDIATE UPDATE: Update global store for instant UI updates
      // Zustand updates are synchronous, no delay needed
      const { updateCurrentUserImage } = useUserStore.getState();
      updateCurrentUserImage(type, imageUrl);
      // Mark as updated to force cache-bust on next render
      markImageUpdated(imageUrl);
      console.log(`🚀 Immediate update: ${type} image updated globally - URL:`, imageUrl.substring(0, 100) + '...');
      
      // Show alert asking user to click Save Changes
      Alert.alert(
        'Image Uploaded', 
        `Your ${type === 'profile' ? 'profile' : 'cover'} image has been uploaded successfully. Please click "Save Changes" button to save it to your profile.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error(`❌ Upload error for ${type} image:`, error);
      
      // Check if it's a network timeout - the upload might have succeeded on backend
      const isNetworkError = error.message?.includes('Network error') || 
                            error.message?.includes('timeout') ||
                            error.message?.includes('Network Error');
      
      if (isNetworkError) {
        // For network errors, automatically check if upload succeeded
        console.log(`🔍 Network error detected, checking if ${type} image upload succeeded...`);
        try {
          // Wait a moment for backend to process
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Use React Query to refetch instead of direct API call
          const result = await refetchUser();
          const currentProfile = result.data;
          const imageUrl = type === 'profile' 
            ? currentProfile?.profileImageUrl 
            : currentProfile?.coverImageUrl;
          
          // Validate imageUrl
          const validImageUrl = imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '' 
            ? imageUrl 
            : null;
            
          if (validImageUrl && validImageUrl !== (type === 'profile' ? formData.profileImageUrl : formData.coverImageUrl)) {
            // Upload succeeded! Update profile formData state
            console.log(`✅ Upload succeeded! Image URL:`, validImageUrl.substring(0, 100) + '...');
            if (type === 'profile') {
              setFormData((prev) => ({ ...prev, profileImageUrl: validImageUrl }));
            } else {
              setFormData((prev) => ({ ...prev, coverImageUrl: validImageUrl }));
            }
            
            // IMMEDIATE UPDATE: Update global store for instant UI updates
            const { updateCurrentUserImage } = useUserStore.getState();
            updateCurrentUserImage(type, validImageUrl);
            markImageUpdated(validImageUrl);
            console.log(`🚀 Immediate update: ${type} image updated globally - URL:`, validImageUrl.substring(0, 100) + '...');
            
            // Show alert asking user to click Save Changes
            Alert.alert(
              'Image Uploaded', 
              `Your ${type === 'profile' ? 'profile' : 'cover'} image has been uploaded successfully. Please click "Save Changes" button to save it to your profile.`,
              [{ text: 'OK' }]
            );
          } else {
            // Upload might not have succeeded, show alert
            Alert.alert(
              'Upload Status Unknown', 
              'The upload may have succeeded but we couldn\'t verify it. The image will be saved when you click "Save Changes".',
              [{ text: 'OK' }]
            );
          }
        } catch (fetchError) {
          console.error('Error checking upload status:', fetchError);
          Alert.alert(
            'Upload Status Unknown', 
            'We couldn\'t verify if the upload succeeded. The image will be saved when you click "Save Changes".',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Upload Failed', `Failed to upload ${type} image: ${error.message}`);
      }
    } finally {
      if (type === 'profile') setUploadingProfile(false);
      if (type === 'cover') setUploadingCover(false);
    }
  };

  const isChanged = () => {
    if (!initialProfile) return false;
    return (
      formData.bio !== initialProfile.bio ||
      formData.website !== initialProfile.website ||
      formData.location !== initialProfile.location ||
      formData.profileImageUrl !== initialProfile.profileImageUrl ||
      formData.coverImageUrl !== initialProfile.coverImageUrl ||
      firstName !== initialProfile.firstName ||
      lastName !== initialProfile.lastName ||
      username !== initialProfile.username
    );
  };

  const handleDeleteCoverPhoto = () => {
    Alert.alert(
      'Delete Cover Photo',
      'Are you sure you want to remove your cover photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setFormData(prev => ({ ...prev, coverImageUrl: '' }));
              // Update on backend
              await putApi('/protected/profile/update', {
                ...formData,
                coverImageUrl: '',
              });
              Alert.alert('Success', 'Cover photo removed successfully!');
              onProfileUpdated?.({ coverImageUrl: '' });
            } catch (error) {
              Alert.alert('Error', 'Failed to remove cover photo');
            }
          },
        },
      ]
    );
  };

  const handleDeleteProfilePhoto = () => {
    Alert.alert(
      'Delete Profile Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setFormData(prev => ({ ...prev, profileImageUrl: '' }));
              // Update on backend
              await putApi('/protected/profile/update', {
                ...formData,
                profileImageUrl: '',
              });
              Alert.alert('Success', 'Profile photo removed successfully!');
              onProfileUpdated?.({ profileImageUrl: '' });
            } catch (error) {
              Alert.alert('Error', 'Failed to remove profile photo');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!isValidUrl(formData.website)) {
      Alert.alert('Invalid Website', 'Please enter a valid website URL.');
      return;
    }
    
    if (username && username.length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters long.');
      return;
    }
    
    setSaving(true);
    // Store original values for rollback on error
    const originalFormData = { ...formData };
    const originalFirstName = firstName;
    const originalLastName = lastName;
    const originalUsername = username;
    const originalInitialProfile = initialProfile ? { ...initialProfile } : null;
    
    try {
      const response = await putApi('/protected/profile/update', {
        ...formData,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
      });

      const updatedUser = response?.user || response?.data?.user || response;

      // Only update state on successful save
      setInitialProfile({
        bio: updatedUser?.bio ?? formData.bio,
        website: updatedUser?.website ?? formData.website,
        location: updatedUser?.location ?? formData.location,
        profileImageUrl: updatedUser?.profileImageUrl ?? formData.profileImageUrl,
        coverImageUrl: updatedUser?.coverImageUrl ?? formData.coverImageUrl,
        firstName: updatedUser?.firstName ?? firstName.trim(),
        lastName: updatedUser?.lastName ?? lastName.trim(),
        username: updatedUser?.username ?? username.trim(),
      });

      // Invalidate React Query cache to trigger refetch (with small delay to ensure backend is ready)
      setTimeout(() => {
        refreshUser();
      }, 500);

      // IMMEDIATE UPDATE: Ensure global store is updated after save
      const { updateCurrentUserImage } = useUserStore.getState();
      if (updatedUser?.profileImageUrl) {
        updateCurrentUserImage('profile', updatedUser.profileImageUrl);
        markImageUpdated(updatedUser.profileImageUrl);
        console.log('✅ Profile image saved and updated in store:', updatedUser.profileImageUrl);
      }
      if (updatedUser?.coverImageUrl) {
        updateCurrentUserImage('cover', updatedUser.coverImageUrl);
        markImageUpdated(updatedUser.coverImageUrl);
        console.log('✅ Cover image saved and updated in store:', updatedUser.coverImageUrl);
      }
      
      // Also update if images are in formData (in case updatedUser doesn't have them)
      if (formData.profileImageUrl && !updatedUser?.profileImageUrl) {
        updateCurrentUserImage('profile', formData.profileImageUrl);
        markImageUpdated(formData.profileImageUrl);
        console.log('✅ Profile image from formData updated in store:', formData.profileImageUrl);
      }
      if (formData.coverImageUrl && !updatedUser?.coverImageUrl) {
        updateCurrentUserImage('cover', formData.coverImageUrl);
        markImageUpdated(formData.coverImageUrl);
        console.log('✅ Cover image from formData updated in store:', formData.coverImageUrl);
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            onProfileUpdated?.(updatedUser);
            navigation.goBack();
          }
        },
      ]);
    } catch (error: any) {
      // Rollback to original values on error
      setFormData(originalFormData);
      setFirstName(originalFirstName);
      setLastName(originalLastName);
      setUsername(originalUsername);
      setInitialProfile(originalInitialProfile);
      
      Alert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Simple Clean Header */}
      <View style={[styles.header, { backgroundColor: colors.background.primary, borderBottomColor: colors.border.light }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Photo Section - At Top */}
        <View style={styles.coverPhotoSection}>
          <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>Cover Photo</Text>
          <TouchableOpacity
            onPress={() => pickImage('cover')}
            style={[styles.coverPhotoButton, { backgroundColor: colors.background.secondary }]}
            activeOpacity={0.8}
          >
            <View style={styles.coverPhotoContent}>
              {coverImageMemo?.imageUrl ? (
                <Image 
                  key={coverImageMemo.imageKey}
                  source={{ uri: coverImageMemo.imageUrl }} 
                  style={styles.coverPhotoPreview}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={200}
                />
              ) : (
                <View style={styles.coverPhotoPlaceholder}>
                  <Ionicons name="image-outline" size={32} color={colors.text.secondary} />
                </View>
              )}
              {uploadingCover && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color="white" />
                </View>
              )}
              <View style={styles.coverPhotoActions}>
                {formData.coverImageUrl && (
                  <TouchableOpacity
                    onPress={handleDeleteCoverPhoto}
                    style={[styles.deletePhotoBadge, { backgroundColor: colors.error[500] }]}
                  >
                    <Ionicons name="trash-outline" size={18} color="white" />
                  </TouchableOpacity>
                )}
                <View style={[styles.editPhotoBadge, { backgroundColor: colors.primary[500] }]}>
                  <Ionicons name="pencil" size={18} color="white" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Centered Profile Photo */}
        <View style={styles.profilePhotoSection}>
          <TouchableOpacity
            onPress={() => pickImage('profile')}
            style={styles.profilePhotoContainer}
            activeOpacity={0.8}
          >
            {profileImageMemo?.imageUrl ? (
              <Image 
                key={profileImageMemo.imageKey}
                source={{ uri: profileImageMemo.imageUrl }} 
                style={styles.profilePhoto}
                contentFit="cover"
                cachePolicy="disk"
                transition={200}
              />
            ) : (
              <View style={[styles.profilePhotoPlaceholder, { backgroundColor: colors.primary[100] }]}>
                <Ionicons name="person" size={48} color={colors.primary[400]} />
              </View>
            )}
            {uploadingProfile && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="white" />
              </View>
            )}
            <View style={[styles.editPhotoButton, { backgroundColor: colors.primary[500] }]}>
              <Ionicons name="camera" size={18} color="white" />
            </View>
          </TouchableOpacity>
          
          {/* Delete Profile Photo Button - Below the profile photo */}
          {formData.profileImageUrl && (
            <TouchableOpacity
              onPress={handleDeleteProfilePhoto}
              style={[styles.deleteProfileButton, { backgroundColor: colors.error[500] }]}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="white" />
              <Text style={styles.deleteButtonText}>Delete Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <SimpleInput
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter first name"
            icon="person-outline"
          />

          <SimpleInput
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter last name"
            icon="person-outline"
          />

          <SimpleInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            icon="at-outline"
            autoCapitalize="none"
          />

          {/* Change Password Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ChangePassword' as never)}
            style={[styles.passwordButton, { backgroundColor: colors.background.secondary }]}
            activeOpacity={0.7}
          >
            <View style={styles.passwordButtonContent}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.text.primary} />
              <Text style={[styles.passwordButtonText, { color: colors.text.primary }]}>
                Change Password
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <SimpleInput
            label="Bio"
            value={formData.bio}
            onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
            placeholder="Tell us about yourself"
            icon="text-outline"
            multiline
          />

          <SimpleInput
            label="Website"
            value={formData.website}
            onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
            placeholder="Enter your website URL"
            icon="globe-outline"
            keyboardType="url"
            autoCapitalize="none"
          />

          <SimpleInput
            label="Location"
            value={formData.location}
            onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
            placeholder="Enter your location"
            icon="location-outline"
          />
        </View>
      </ScrollView>

      {/* Sticky Save Button */}
      <View 
        style={[
          styles.saveButtonContainer, 
          { 
            backgroundColor: colors.background.primary,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopColor: colors.border.light,
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.stickyButton,
            { 
              backgroundColor: isChanged() && !saving ? colors.primary[500] : colors.background.secondary,
              opacity: isChanged() && !saving ? 1 : 0.6,
            }
          ]}
          onPress={handleSave}
          disabled={!isChanged() || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.stickyButtonText}>SAVE CHANGES</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  coverPhotoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  profilePhotoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profilePhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    position: 'relative',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  deleteProfileButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  coverPhotoActions: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 10,
  },
  deletePhotoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  formSection: {
    paddingHorizontal: 20,
  },
  simpleInputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  simpleInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  simpleInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  rightIcon: {
    marginLeft: 12,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  passwordButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passwordButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  coverPhotoButton: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 120,
  },
  editPhotoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  coverPhotoContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  coverPhotoPreview: {
    width: '100%',
    height: '100%',
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  stickyButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
});