import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

// Shared sound instances across all components
let sharedLikeSound: Audio.Sound | null = null;
let sharedCommentSound: Audio.Sound | null = null;
let isLikeSoundLoaded = false;
let isCommentSoundLoaded = false;
let isLoadingLikeSound = false;
let isLoadingCommentSound = false;
let isLikeSoundPlaying = false; // Track if like sound is currently playing
let isCommentSoundPlaying = false; // Track if comment sound is currently playing
let likeSoundTimeout: NodeJS.Timeout | null = null; // Track timeout for cleanup
let commentSoundTimeout: NodeJS.Timeout | null = null; // Track timeout for cleanup

/**
 * Hook to play sound effects in the app
 * Uses a shared sound instance for better performance
 */
export function useSound() {
  const [isLikeLoaded, setIsLikeLoaded] = useState(isLikeSoundLoaded);
  const [isCommentLoaded, setIsCommentLoaded] = useState(isCommentSoundLoaded);

  // Load sounds once on first use
  useEffect(() => {
    if (!isLoadingLikeSound && !isLikeSoundLoaded && !sharedLikeSound) {
      loadLikeSound();
    } else if (isLikeSoundLoaded && !isLikeLoaded) {
      // Sync state if sound was loaded by another component
      setIsLikeLoaded(true);
    }
    
    if (!isLoadingCommentSound && !isCommentSoundLoaded && !sharedCommentSound) {
      loadCommentSound();
    } else if (isCommentSoundLoaded && !isCommentLoaded) {
      // Sync state if sound was loaded by another component
      setIsCommentLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  const loadCommentSound = async () => {
    if (isLoadingCommentSound || isCommentSoundLoaded) return;
    
    isLoadingCommentSound = true;
    
    try {
      // Audio mode is already set by loadLikeSound, but ensure it's set
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          allowsRecordingIOS: false,
        });
      } catch (e) {
        // Audio mode might already be set, ignore
      }

      // Load the comment sound file (using same sound as like for now)
      // You can add a separate comment.mp3 file later if needed
      try {
        const soundModule = require('../../assets/sounds/like.mp3');
        
        const { sound } = await Audio.Sound.createAsync(
          soundModule,
          { shouldPlay: false, volume: 0.6 } // Slightly quieter for comments
        );
        sharedCommentSound = sound;
        isCommentSoundLoaded = true;
        setIsCommentLoaded(true);
        console.log('✅ Comment sound loaded successfully');
      } catch (error: any) {
        const errorMessage = error?.message || String(error) || '';
        const isModuleNotFound = 
          errorMessage.includes('unknown module') || 
          errorMessage.includes('MODULE_NOT_FOUND') ||
          errorMessage.includes('Cannot find module');
        
        if (!isModuleNotFound) {
          console.warn('⚠️ Could not load comment sound:', errorMessage);
        }
        isCommentSoundLoaded = false;
        setIsCommentLoaded(false);
      }
    } catch (error) {
      isCommentSoundLoaded = false;
      setIsCommentLoaded(false);
    } finally {
      isLoadingCommentSound = false;
    }
  };

  const loadLikeSound = async () => {
    if (isLoadingLikeSound || isLikeSoundLoaded) return;
    
    isLoadingLikeSound = true;
    
    try {
      // Set audio mode for better sound playback
      // Use allowsRecordingIOS: false to avoid conflicts with video playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        allowsRecordingIOS: false, // Don't interfere with video audio
      });

      // Load the sound file
      // Sound file is located at mobile/assets/sounds/like.mp3
      try {
        const soundModule = require('../../assets/sounds/like.mp3');
        
        // If we got here, the file exists, try to load it
        const { sound } = await Audio.Sound.createAsync(
          soundModule,
          { shouldPlay: false, volume: 0.7 } // Set volume to 70% to avoid being too loud
        );
        sharedLikeSound = sound;
        isLikeSoundLoaded = true;
        setIsLikeLoaded(true);
        console.log('✅ Like sound loaded successfully');
      } catch (error: any) {
        // File doesn't exist or failed to load
        const errorMessage = error?.message || String(error) || '';
        const isModuleNotFound = 
          errorMessage.includes('unknown module') || 
          errorMessage.includes('MODULE_NOT_FOUND') ||
          errorMessage.includes('Cannot find module');
        
        if (isModuleNotFound) {
          // File doesn't exist - set ENABLE_LIKE_SOUND=false above to fix this error
          console.error('❌ Like sound file not found!');
          console.error('   Fix: Add mobile/assets/sounds/like.mp3 or set ENABLE_LIKE_SOUND=false');
        } else {
          // Different error (file exists but can't load)
          console.warn('⚠️ Could not load like sound:', errorMessage);
        }
        isLikeSoundLoaded = false;
        setIsLikeLoaded(false);
      }
    } catch (error) {
      // Fail silently for any other errors
      isLikeSoundLoaded = false;
      setIsLikeLoaded(false);
    } finally {
      isLoadingLikeSound = false;
    }
  };

  const playLikeSound = async () => {
    try {
      if (!isLikeSoundLoaded || !sharedLikeSound) {
        return; // Sound not loaded, fail silently
      }

      // Prevent overlapping sounds - if already playing, stop and restart
      if (isLikeSoundPlaying) {
        try {
          await sharedLikeSound.stopAsync();
        } catch (e) {
          // Ignore stop errors
        }
      }

      // Mark as playing and reset to beginning, then play
      isLikeSoundPlaying = true;
      
      // Clear any existing timeout
      if (likeSoundTimeout) {
        clearTimeout(likeSoundTimeout);
        likeSoundTimeout = null;
      }
      
      await sharedLikeSound.setPositionAsync(0); // Reset to start
      await sharedLikeSound.playAsync();
      
      // Reset playing flag after sound duration (estimate 0.3 seconds for click sound)
      likeSoundTimeout = setTimeout(() => {
        isLikeSoundPlaying = false;
        likeSoundTimeout = null;
      }, 300);
    } catch (error) {
      // Fail silently if sound can't play
      isLikeSoundPlaying = false;
      if (likeSoundTimeout) {
        clearTimeout(likeSoundTimeout);
        likeSoundTimeout = null;
      }
    }
  };

  const playCommentSound = async () => {
    try {
      if (!isCommentSoundLoaded || !sharedCommentSound) {
        return; // Sound not loaded, fail silently
      }

      // Prevent overlapping sounds - if already playing, stop and restart
      if (isCommentSoundPlaying) {
        try {
          await sharedCommentSound.stopAsync();
        } catch (e) {
          // Ignore stop errors
        }
      }

      // Mark as playing and reset to beginning, then play
      isCommentSoundPlaying = true;
      
      // Clear any existing timeout
      if (commentSoundTimeout) {
        clearTimeout(commentSoundTimeout);
        commentSoundTimeout = null;
      }
      
      await sharedCommentSound.setPositionAsync(0); // Reset to start
      await sharedCommentSound.playAsync();
      
      // Reset playing flag after sound duration
      commentSoundTimeout = setTimeout(() => {
        isCommentSoundPlaying = false;
        commentSoundTimeout = null;
      }, 300);
    } catch (error) {
      // Fail silently if sound can't play
      isCommentSoundPlaying = false;
      if (commentSoundTimeout) {
        clearTimeout(commentSoundTimeout);
        commentSoundTimeout = null;
      }
    }
  };

  return {
    playLikeSound,
    playCommentSound,
    isLikeSoundLoaded: isLikeLoaded,
    isCommentSoundLoaded: isCommentLoaded,
  };
}

