import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Platform, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { postsAPI } from '../services/api/posts';
import { useNavigation } from '@react-navigation/native';
import { useApiService } from '../services/api';
import { Video, ResizeMode } from 'expo-av';
import { filterContent } from '../utils/contentFilter';
import { validateImageWithFileInfo, getMobileImageViolationMessage } from '../utils/imageFilter';
import { getUserInitials } from '../utils/user';

interface ComposePostProps {
  onPostCreated?: () => void;
}

// Video validation function (same as frontend)
const validateVideoFile = (file: any) => {
  // More restrictive for mobile - smaller file size and fewer formats
  const maxSize = 50 * 1024 * 1024; // 50MB for mobile
  const allowedTypes = [
    'video/mp4', 
    'video/quicktime' // Only MP4 and MOV for better mobile compatibility
  ];
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'Video file size must be less than 50MB for mobile' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Only MP4 and MOV video formats are supported on mobile' };
  }
  
  return { isValid: true };
};

export const ComposePost = ({ onPostCreated }: ComposePostProps) => {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const { isSignedIn, user } = useAuth();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const { get: getApi } = useApiService();
  const navigation = useNavigation<any>();

  // Fetch user data when component mounts or comes into focus
  useEffect(() => {
    if (!isSignedIn) {
      setUserData(null);
      return;
    }

    let isActive = true;
    getApi('/protected')
      .then((response) => {
        if (isActive) {
          setUserData(response.user);
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.error('Protected user fetch failed:', error);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isSignedIn, getApi]);

  const getInitials = () => getUserInitials(userData || user);

  const remainingChars = 1500 - content.length; // Match frontend character limit
  const isOverLimit = remainingChars < 0;
  const hasContent = content.trim().length > 0;
  const hasImages = selectedImages.length > 0;
  const hasVideos = selectedVideos.length > 0;
  const canPost = (hasContent || hasImages || hasVideos) && !isOverLimit && !isPosting;
  
  const openSettingsAlert = (message: string) => {
    Alert.alert(
      'Permission Required',
      `${message}\n\nPlease enable access in your device settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings?.() },
      ],
    );
  };

  // Helper function to check and request permissions safely
  const checkPermissions = async (permissionType: 'camera' | 'mediaLibrary') => {
    try {
      const getPermissions =
        permissionType === 'camera'
          ? ImagePicker.getCameraPermissionsAsync
          : ImagePicker.getMediaLibraryPermissionsAsync;
      const requestPermissions =
        permissionType === 'camera'
          ? ImagePicker.requestCameraPermissionsAsync
          : ImagePicker.requestMediaLibraryPermissionsAsync;

      let permission = await getPermissions();

      const hasAccess =
        permission.granted ||
        (permission as any).accessPrivileges === 'limited';

      if (hasAccess) {
        return true;
      }

      permission = await requestPermissions();

      const grantedAfterRequest =
        permission.granted ||
        (permission as any).accessPrivileges === 'limited';

      if (grantedAfterRequest) {
        return true;
      }

      if (!permission.canAskAgain) {
        openSettingsAlert(
          `Airwig does not have access to your ${permissionType === 'camera' ? 'camera' : 'photo library'}.`,
        );
      } else {
        Alert.alert(
          'Permission Required',
          `Permission to access ${permissionType === 'camera' ? 'camera' : 'photo library'} is required to use this feature.`,
        );
      }
      return false;
    } catch (error) {
      console.error(`❌ Permission check error for ${permissionType}:`, error);
      Alert.alert('Error', `Failed to check ${permissionType} permissions. Please try again.`);
      return false;
    }
  };

  // iPad-specific safety wrapper for image picker operations
  const safeImagePickerOperation = async (operation: () => Promise<void>) => {
    try {
      // Add a small delay to ensure UI is stable before launching picker
      await new Promise(resolve => setTimeout(resolve, 100));
      await operation();
    } catch (error) {
      console.error('❌ Safe image picker operation failed:', error);
      Alert.alert(
        'Error', 
        'There was an issue accessing the media picker. Please try again or restart the app if the problem persists.'
      );
    }
  };

  const pickImages = async () => {
    await safeImagePickerOperation(async () => {
      const totalMedia = selectedImages.length + selectedVideos.length;
      if (totalMedia >= 4) {
        Alert.alert('Error', 'You can only upload up to 4 media files total');
        return;
      }

      // Enhanced media library permission check with better error handling
      try {
        const hasPermission = await checkPermissions('mediaLibrary');
        if (!hasPermission) {
          return;
        }
      } catch (permissionError) {
        console.error('❌ Media library permission error:', permissionError);
        Alert.alert('Permission Error', 'Unable to access photo library permissions. Please check your device settings.');
        return;
      }

      // Enhanced iPad-specific configuration to prevent crashes
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.7, // Reduced quality for better stability
        selectionLimit: Math.min(4 - totalMedia, 4),
        base64: false, // Reduce memory usage
        exif: false, // Disable EXIF data to reduce memory
      };

      // Enhanced iPad-specific configurations
      if (Platform.OS === 'ios') {
        // Use form sheet for iPad to prevent crashes (more stable than full screen)
        pickerOptions.presentationStyle = ImagePicker.UIImagePickerPresentationStyle.FORM_SHEET;
        
        // Additional iPad stability options
        pickerOptions.videoQuality = ImagePicker.UIImagePickerControllerQualityType.Medium;
      }

      console.log('📱 Launching image picker with enhanced iPad options:', pickerOptions);

      try {
        // Launch image picker with enhanced iPad-optimized settings
        const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

        console.log('📱 Image picker result:', { 
          canceled: result.canceled, 
          assetsCount: result.assets?.length,
          hasError: result.canceled && !result.canceled // Check for error state
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          // Enhanced asset validation with error handling
          const validImages: string[] = [];
          for (const asset of result.assets) {
            try {
              if (!asset || !asset.uri) {
                console.warn('⚠️ Skipping asset with no URI:', asset);
                continue;
              }

              const imageValidation = await validateImageWithFileInfo(
                asset.uri, 
                asset.fileSize, 
                asset.fileName || undefined
              );
              
              if (imageValidation.isClean) {
                validImages.push(asset.uri);
              } else {
                const message = getMobileImageViolationMessage(imageValidation.violations);
                Alert.alert('Image Blocked', `${asset.fileName || 'Image'}: ${message}`);
                // Continue with other images instead of stopping completely
              }
            } catch (validationError) {
              console.error('❌ Individual image validation error:', validationError);
              Alert.alert('Validation Error', `Unable to process ${asset.fileName || 'image'}. Skipping.`);
              continue;
            }
          }
          
          // Add valid images with enhanced error handling
          if (validImages.length > 0) {
            setSelectedImages(prev => [...prev, ...validImages].slice(0, 4 - selectedVideos.length));
          } else {
            Alert.alert('No Valid Images', 'None of the selected images passed validation. Please try different images.');
          }
        }
      } catch (libraryError) {
        console.error('❌ Image picker launch error:', libraryError);
        Alert.alert(
          'Image Picker Error', 
          'Unable to access photo library. Please ensure the app has permission and try again.'
        );
        return;
      }
    });
  };

  const takePhoto = async () => {
    await safeImagePickerOperation(async () => {
      const totalMedia = selectedImages.length + selectedVideos.length;
      if (totalMedia >= 4) {
        Alert.alert('Error', 'You can only upload up to 4 media files total');
        return;
      }

      // Enhanced camera permission check with better error handling
      try {
        const hasPermission = await checkPermissions('camera');
        if (!hasPermission) {
          return;
        }
      } catch (permissionError) {
        console.error('❌ Camera permission error:', permissionError);
        Alert.alert('Permission Error', 'Unable to access camera permissions. Please check your device settings.');
        return;
      }

      // Enhanced iPad-specific configuration to prevent crashes
      const cameraOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7, // Reduced quality for better stability
        base64: false, // Reduce memory usage
        exif: false, // Disable EXIF data to reduce memory
      };

      // Enhanced iPad-specific configurations
      if (Platform.OS === 'ios') {
        // Use form sheet for iPad to prevent crashes
        cameraOptions.presentationStyle = ImagePicker.UIImagePickerPresentationStyle.FORM_SHEET;
        
        // Additional iPad stability options
        cameraOptions.allowsMultipleSelection = false;
        cameraOptions.videoQuality = ImagePicker.UIImagePickerControllerQualityType.Medium;
      }

      console.log('📱 Launching camera with enhanced iPad options:', cameraOptions);

      try {
        // Launch camera with enhanced iPad-optimized settings
        const result = await ImagePicker.launchCameraAsync(cameraOptions);

        console.log('📱 Camera result:', { 
          canceled: result.canceled, 
          assetsCount: result.assets?.length,
          hasError: result.canceled && !result.canceled // Check for error state
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          // Enhanced asset validation with error handling
          const asset = result.assets[0];
          
          if (!asset || !asset.uri) {
            console.error('❌ Invalid asset received from camera');
            Alert.alert('Error', 'Invalid image received. Please try again.');
            return;
          }

          // Validate camera image with enhanced error handling
          try {
            const imageValidation = await validateImageWithFileInfo(
              asset.uri, 
              asset.fileSize, 
              asset.fileName || undefined
            );
            
            if (!imageValidation.isClean) {
              const message = getMobileImageViolationMessage(imageValidation.violations);
              Alert.alert('Image Blocked', message);
              return; // Don't add the image if it's blocked
            }
            
            // If image passes validation, add it
            const newImages = result.assets.map(asset => asset.uri).filter(uri => uri);
            if (newImages.length > 0) {
              setSelectedImages(prev => [...prev, ...newImages].slice(0, 4 - selectedVideos.length));
            }
          } catch (validationError) {
            console.error('❌ Image validation error:', validationError);
            Alert.alert('Validation Error', 'Unable to process the image. Please try again.');
            return;
          }
        }
      } catch (cameraError) {
        console.error('❌ Camera launch error:', cameraError);
        Alert.alert(
          'Camera Error', 
          'Unable to access camera. Please ensure the camera is not being used by another app and try again.'
        );
        return;
      }
    });
  };

  const pickVideos = async () => {
    await safeImagePickerOperation(async () => {
      const totalMedia = selectedImages.length + selectedVideos.length;
      if (totalMedia >= 4) {
        Alert.alert('Error', 'You can only upload up to 4 media files total');
        return;
      }

      // Check video count limit
      if (selectedVideos.length >= 2) {
        Alert.alert('Error', 'You can only upload up to 2 videos per post');
        return;
      }

      // Request permission for video library
      const hasPermission = await checkPermissions('mediaLibrary');
      if (!hasPermission) {
        return;
      }

      // iPad-specific configuration to prevent crashes
      const videoPickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: Math.min(2 - selectedVideos.length, 2),
        base64: false, // Reduce memory usage
      };

      // Add iPad-specific presentation style
      if (Platform.OS === 'ios') {
        videoPickerOptions.presentationStyle = ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN;
      }

      console.log('📱 Launching video picker with options:', videoPickerOptions);

      // Launch video picker with iPad-optimized settings
      const result = await ImagePicker.launchImageLibraryAsync(videoPickerOptions);

      console.log('📱 Video picker result:', { canceled: result.canceled, assetsCount: result.assets?.length });

      if (!result.canceled && result.assets) {
        const newVideos = result.assets.map(asset => asset.uri);
        
        // Check file sizes before adding
        for (const videoUri of newVideos) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(videoUri, { size: true });
            if (fileInfo.exists && 'size' in fileInfo) {
              const fileSizeInMB = fileInfo.size / (1024 * 1024);
              
              if (fileSizeInMB > 100) {
                Alert.alert(
                  'File Too Large', 
                  `File size is ${fileSizeInMB.toFixed(1)}MB. Maximum allowed size is 100MB.`
                );
                return;
              }
            }
          } catch (error) {
            console.log('Could not check file size, proceeding with upload');
          }
        }
        
        setSelectedVideos(prev => [...prev, ...newVideos].slice(0, 2));
      }
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setSelectedVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && selectedImages.length === 0 && selectedVideos.length === 0) {
      Alert.alert('Error', 'Please enter some content or select media');
      return;
    }
    if (!isSignedIn) {
      Alert.alert('Error', 'You must be signed in to post');
      return;
    }
    if (isOverLimit) {
      Alert.alert('Error', `Content is ${Math.abs(remainingChars)} characters over the limit`);
      return;
    }

    // Content filtering for Apple App Store compliance
    if (content.trim().length > 0) {
      try {
        const filterResult = await filterContent(content.trim());
        
        if (!filterResult.isClean) {
          Alert.alert(
            'Content Blocked',
            filterResult.message || 'Your content violates community guidelines'
          );
          return;
        }
      } catch (filterError) {
        console.error('Content filtering error:', filterError);
        Alert.alert('Error', 'Content verification failed. Please try again.');
        return;
      }
    }

    setIsPosting(true);
    try {
      // Better Auth uses cookies, no token needed - API client handles authentication

      // Create FormData
      const formData = new FormData();
      if (content.trim()) {
        formData.append('content', content.trim());
      }

      console.log('📱 Creating FormData with:', {
        contentLength: content.trim().length,
        imageCount: selectedImages.length,
        videoCount: selectedVideos.length
      });

      // Add images to FormData
      for (let index = 0; index < selectedImages.length; index++) {
        const imageUri = selectedImages[index];
        const filename = `image_${index}.jpg`;
        
        // Check if file exists (important for camera images)
        try {
          const fileInfo = await FileSystem.getInfoAsync(imageUri);
          if (!fileInfo.exists) {
            throw new Error(`Image file does not exist: ${imageUri}`);
          }
          
          console.log(`📱 Adding image ${index}:`, { 
            uri: imageUri, 
            filename, 
            exists: fileInfo.exists,
            size: fileInfo.size 
          });
          
          (formData as any).append('media', {
            uri: imageUri,
            type: 'image/jpeg',
            name: filename,
          });
        } catch (fileError: any) {
          console.error(`❌ Error processing image ${index}:`, fileError);
          throw new Error(`Failed to process image: ${fileError.message}`);
        }
      }

      // Add videos to FormData
      for (let index = 0; index < selectedVideos.length; index++) {
        const videoUri = selectedVideos[index];
        const filename = `video_${index}.mp4`;
        
        // Check if file exists
        try {
          const fileInfo = await FileSystem.getInfoAsync(videoUri);
          if (!fileInfo.exists) {
            throw new Error(`Video file does not exist: ${videoUri}`);
          }
          
          console.log(`📱 Adding video ${index}:`, { 
            uri: videoUri, 
            filename, 
            exists: fileInfo.exists,
            size: fileInfo.size 
          });
          
          (formData as any).append('media', {
            uri: videoUri,
            type: 'video/mp4',
            name: filename,
          });
        } catch (fileError: any) {
          console.error(`❌ Error processing video ${index}:`, fileError);
          throw new Error(`Failed to process video: ${fileError.message}`);
        }
      }

      // Make the API call with authentication (cookies are automatically included)
      const result = await postsAPI.createPost(undefined, formData);

      // Success feedback without alert
      setContent('');
      setSelectedImages([]);
      setSelectedVideos([]);
      if (onPostCreated) onPostCreated();
    } catch (error: any) {
      console.error('🚨 Post creation error:', error);
      console.error('🚨 Error details:', {
        message: error.message,
        status: error.status,
        response: error.response,
        stack: error.stack
      });
      
      let errorMessage = 'Failed to create post';
      
      // Handle specific error types
      if (error.message?.includes('413') || error.message?.includes('Payload Too Large') || error.message?.includes('exceeds the maximum allowed size')) {
        errorMessage = 'File size is too large. Please try a smaller file (maximum 100MB).';
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please sign in again.';
      } else if (error.message?.includes('400') || error.message?.includes('Bad Request')) {
        errorMessage = error.message || 'Invalid request. Please check your post content.';
      } else if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message?.includes('Network Error') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Upload Error', `${errorMessage}\n\nDebug: ${JSON.stringify({
        hasImages: selectedImages.length,
        hasVideos: selectedVideos.length,
        hasContent: !!content.trim(),
        tokenLength: authToken?.length || 0
      })}`);
    } finally {
      setIsPosting(false);
    }
  };

  // Combine all media for preview
  const allMedia = [
    ...selectedImages.map((uri, index) => ({ type: 'image', uri, index, originalIndex: index })),
    ...selectedVideos.map((uri, index) => ({ type: 'video', uri, index, originalIndex: index }))
  ];

  return (
    <View style={[styles.container, {
      backgroundColor: theme === 'light' ? '#ffffff' : '#111827', // Match frontend bg-white dark:bg-gray-900
      borderColor: theme === 'light' ? '#e5e7eb' : '#374151', // Match frontend border-gray-200 dark:border-gray-800
    }]}>
      {/* Text Input Section */}
      <View style={styles.inputSection}>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: '#FF7300' }]}>
            {(userData?.profileImageUrl || user?.imageUrl) ? (
              <Image 
                source={{ uri: userData?.profileImageUrl || user?.imageUrl }} 
                style={styles.avatarImage}
                onError={() => {
                  // Profile image failed to load, showing initials
                }}
              />
            ) : (
              <Text style={styles.avatarText}>{getInitials()}</Text>
            )}
          </View>
          <View style={[styles.textInputContainer, {
            backgroundColor: theme === 'light' ? '#f9fafb' : '#374151', // Match frontend bg-gray-50 dark:bg-gray-800
            borderColor: theme === 'light' ? '#e5e7eb' : '#4b5563', // Match frontend border-gray-200 dark:border-gray-700
          }]}>
            <TextInput
              style={[styles.textInput, { 
                color: theme === 'light' ? '#111827' : '#ffffff', // Match frontend text-gray-900 dark:text-white
              }]}
              placeholder="What's happening?"
              placeholderTextColor={theme === 'light' ? '#6b7280' : '#9ca3af'} // Match frontend placeholder-gray-500 dark:placeholder-gray-400
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={1500}
              editable={!isPosting}
              scrollEnabled={false} // Disable scroll to allow proper height expansion
            />
          </View>
        </View>
      </View>

      {/* Media Preview Section */}
      {allMedia.length > 0 && (
        <View style={styles.mediaPreviewSection}>
          {allMedia.length === 1 ? (
            // Single media - preserve aspect ratio like frontend
            <View style={styles.singleMediaContainer}>
              {allMedia[0].type === 'video' ? (
                <View style={styles.videoContainer}>
                  <Video
                    source={{ uri: allMedia[0].uri }}
                    style={styles.singleVideo}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={false}
                    isLooping={false}
                    shouldCorrectPitch={false}
                    progressUpdateIntervalMillis={1000}
                    onError={(error) => {
                      console.log('ComposePost single video error:', error);
                    }}
                    onLoad={() => {
                      console.log('ComposePost single video loaded successfully');
                    }}
                  />
                  
                  {/* Action buttons overlay */}
                  <View style={styles.actionButtonsOverlay}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.removeButton]}
                      onPress={() => removeVideo(allMedia[0].originalIndex)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Image
                  source={{ uri: allMedia[0].uri }}
                  style={[styles.singleImage, { 
                    backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151', // Match frontend bg-gray-200 dark:bg-gray-700
                    borderColor: theme === 'light' ? '#e5e7eb' : '#4b5563', // Match frontend border-gray-200 dark:border-gray-700
                  }]}
                  resizeMode="contain" // Match frontend object-contain
                />
              )}
            </View>
          ) : (
            // Multiple media - grid layout like frontend
            <View style={styles.multipleMediaGrid}>
              {allMedia.map((media, index) => {
                // Frontend grid logic: 2 cols for 2-4 media
                const isLast = index === allMedia.length - 1;
                const isThirdMedia = index === 2 && allMedia.length === 3;
                
                return (
                  <View 
                    key={`${media.type}-${media.originalIndex}`} 
                    style={[
                      styles.gridMediaContainer,
                      // For 3 media, make the 3rd media span full width (like frontend)
                      isThirdMedia && styles.gridMediaFullWidth
                    ]}
                  >
                    {media.type === 'video' ? (
                      <View style={styles.videoContainer}>
                        <Video
                          source={{ uri: media.uri }}
                          style={[
                            styles.gridVideo,
                            { 
                              backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151', // Match frontend bg-gray-200 dark:bg-gray-700
                              borderColor: theme === 'light' ? '#e5e7eb' : '#4b5563', // Match frontend border-gray-200 dark:border-gray-700
                            },
                            // Different aspect ratio for 3rd media when there are 3 total
                            isThirdMedia && styles.gridVideoWide
                          ]}
                          useNativeControls
                          resizeMode={ResizeMode.CONTAIN}
                          shouldPlay={false}
                          isLooping={false}
                          shouldCorrectPitch={false}
                          progressUpdateIntervalMillis={1000}
                          onError={(error) => {
                            console.log('ComposePost grid video error:', error);
                          }}
                          onLoad={() => {
                            console.log('ComposePost grid video loaded successfully');
                          }}
                        />
                      </View>
                    ) : (
                      <Image
                        source={{ uri: media.uri }}
                        style={[
                          styles.gridImage,
                          { 
                            backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151', // Match frontend bg-gray-200 dark:bg-gray-700
                            borderColor: theme === 'light' ? '#e5e7eb' : '#4b5563', // Match frontend border-gray-200 dark:border-gray-700
                          },
                          // Different aspect ratio for 3rd media when there are 3 total
                          isThirdMedia && styles.gridImageWide
                        ]}
                        resizeMode="cover"
                      />
                    )}
                    
                    {/* Action buttons */}
                    <View style={styles.actionButtonsOverlay}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.removeButton]}
                        onPress={() => media.type === 'video' ? removeVideo(media.originalIndex) : removeImage(media.originalIndex)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close" size={12} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          

        </View>
      )}

      {/* Action Row - Always visible at bottom */}
      <View style={[styles.actionRow, {
        borderTopColor: theme === 'light' ? '#f3f4f6' : '#374151', // Match frontend border-gray-100 dark:border-gray-800
      }]}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={[styles.mediaButton, {
              backgroundColor: 'transparent', // Match frontend transparent background
              borderColor: 'transparent', // No border like frontend
            }]}
            onPress={takePhoto}
            disabled={isPosting || allMedia.length >= 4}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="camera-outline"
              size={20}
              color={allMedia.length >= 4 
                ? (theme === 'light' ? '#d1d5db' : '#6b7280') // Match frontend disabled gray
                : (theme === 'light' ? '#ef4444' : '#f87171') // Match frontend red-500 dark:red-400
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mediaButton, {
              backgroundColor: 'transparent', // Match frontend transparent background
              borderColor: 'transparent', // No border like frontend
            }]}
            onPress={pickImages}
            disabled={isPosting || allMedia.length >= 4}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="image-outline"
              size={20}
              color={allMedia.length >= 4 
                ? (theme === 'light' ? '#d1d5db' : '#6b7280') // Match frontend disabled gray
                : (theme === 'light' ? '#3b82f6' : '#60a5fa') // Match frontend blue-500 dark:blue-400
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mediaButton, {
              backgroundColor: 'transparent', // Match frontend transparent background
              borderColor: 'transparent', // No border like frontend
            }]}
            onPress={pickVideos}
            disabled={isPosting || allMedia.length >= 4 || selectedVideos.length >= 2}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="videocam-outline"
              size={20}
              color={(allMedia.length >= 4 || selectedVideos.length >= 2)
                ? (theme === 'light' ? '#d1d5db' : '#6b7280') // Match frontend disabled gray
                : (theme === 'light' ? '#22c55e' : '#4ade80') // Match frontend green-500 dark:green-400
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles.rightActions}>
          <Text style={[styles.characterCount, {
            color: isOverLimit 
              ? '#ef4444' // Match frontend text-red-500
              : remainingChars <= 20 
                ? '#eab308' // Match frontend text-yellow-500
                : (theme === 'light' ? '#9ca3af' : '#6b7280') // Match frontend text-gray-400 dark:text-gray-500
          }]}>
            {remainingChars}
          </Text>
          
          <TouchableOpacity
            style={[styles.postButton, {
              backgroundColor: canPost 
                ? '#ff7300'
                : (theme === 'light' ? '#d1d5db' : '#6b7280'), // Disabled gray
              opacity: canPost ? 1 : 0.5,
            }]}
            onPress={handlePost}
            disabled={!canPost}
          >
            <Text style={styles.postButtonText}>
              {isPosting ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Remove card styling to match frontend's inline design
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    // Remove shadow, border radius, and margins to match frontend
  },
  inputSection: {
    marginBottom: 0, // Remove margin to let spacing be handled by other elements
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align to top for better multiline text handling
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: 2, // Slight offset to align with text baseline
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textInputContainer: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8, // Match frontend rounded-lg
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    fontSize: 16,
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 0,
    minHeight: 36,
    maxHeight: 120, // Allow expansion but with reasonable limit
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  mediaPreviewSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  singleMediaContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 8,
  },
  singleImage: {
    width: '100%',
    height: 240, // Match frontend max height ~300px
    borderRadius: 12,
    borderWidth: 1,
  },
  singleVideo: {
    width: '100%',
    height: 240, // Match frontend max height ~300px
    borderRadius: 12,
    borderWidth: 1,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    // Remove border to match frontend
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  characterCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    // Remove border to match frontend
    minWidth: 80,
    alignItems: 'center',
    // Remove shadow to match frontend's cleaner look
  },
  postButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  // Updated styles for media preview section to match frontend
  actionButtonsOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  removeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.95)', // Red color for remove
  },
  multipleMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  gridMediaContainer: {
    position: 'relative',
    width: '48%', // For 2 columns like frontend
    height: 96, // Match frontend h-24 (96px)
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridMediaFullWidth: {
    width: '100%', // For 3rd media when there are 3 total
    height: 96, // Keep same height for consistency
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 1,
  },
  gridImageWide: {
    // No additional styling needed, container handles the width
  },
  gridVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 1,
  },
  gridVideoWide: {
    // No additional styling needed, container handles the width
  },
  helpText: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 2,
    fontWeight: '400',
  },
}); 