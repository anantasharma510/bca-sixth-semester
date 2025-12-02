import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { PostCreationScreen } from './PostCreationScreen';
import { MediaPickerScreen } from './MediaPickerScreen';
// import { GoLiveScreen } from './GoLiveScreen'; // COMMENTED OUT - Live streaming disabled
import type { SelectedMediaItem } from './types';

export type PostCreationStackParamList = {
  Composer: {
    onPostCreated?: () => void;
  };
  MediaPicker?: {
    onPostCreated?: () => void;
  };
  Caption?: {
    selectedMedia: SelectedMediaItem[];
    onPostCreated?: () => void;
  };
  // GoLive: { // COMMENTED OUT - Live streaming disabled
  //   onStreamCreated?: () => void;
  // };
};

const Stack = createStackNavigator<PostCreationStackParamList>();

interface PostCreationNavigatorProps {
  onPostCreated?: () => void;
}

export const PostCreationNavigator: React.FC<PostCreationNavigatorProps> = ({
  onPostCreated,
}) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="Composer"
        component={PostCreationScreen}
        initialParams={{ onPostCreated }}
      />
      <Stack.Screen
        name="MediaPicker"
        component={MediaPickerScreen}
        initialParams={{ onPostCreated }}
      />
      {/* GoLive screen removed - Live streaming disabled */}
    </Stack.Navigator>
  );
};

