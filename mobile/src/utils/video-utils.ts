import { Video } from 'expo-av';

export const checkVideoCompatibility = async (uri: string) => {
  // For now, assume all videos are compatible
  // The actual compatibility will be determined by the Video component's onError callback
  return true;
};

export const getVideoInfo = async (uri: string) => {
  // This function is kept for future use but currently returns basic info
  return {
    duration: null,
    width: null,
    height: null,
    isLoaded: false
  };
};
