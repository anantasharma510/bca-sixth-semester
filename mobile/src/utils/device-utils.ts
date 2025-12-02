import { Platform } from 'react-native';
import * as Device from 'expo-device';

export const shouldUseFallbackVideoPlayer = () => {
  if (Platform.OS === 'android') {
    // Use fallback for devices with known decoder issues
    const brand = Device.brand;
    const model = Device.modelName;
    
    // Add known problematic devices
    const problematicDevices = [
      'SM-G950F', // Samsung Galaxy S8
      'SM-G960F', // Samsung Galaxy S9
      // Add more as you identify them
    ];
    
    return problematicDevices.includes(model);
  }
  return false;
};
