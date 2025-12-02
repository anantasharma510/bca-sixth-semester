import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';
import { LoadingScreen } from '../components/LoadingScreen';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { Platform, View, BackHandler, Alert, Pressable, Animated, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { PostCreationNavigator } from '../screens/create/PostCreationNavigator';
import { useUserStore } from '../stores/userStore';
import { getCacheBustedUrl, getBaseUrl } from '../utils/imageCache';
import { Image } from 'expo-image';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import OutfitFeedScreen from '../screens/OutfitFeedScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import SearchScreen from '../screens/SearchScreen';
import GenerateScreen from '../screens/GenerateScreen';
import OutfitDetailScreen from '../screens/OutfitDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SubscriptionHistoryScreen from '../screens/SubscriptionHistoryScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import SuspendedScreen from '../screens/SuspendedScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import ChatScreen from '../screens/ChatScreen';
import NewConversationScreen from '../screens/NewConversationScreen';
import SupportScreen from '../screens/SupportScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ICON_SIZE = 24;
const CENTER_BUTTON_SIZE = 56;
const CENTER_BUTTON_INNER = 48;

const CreatePostTab = ({ navigation }: any) => {
  const { theme } = useTheme();
  const colors = getColors(theme);

  const handlePostCreated = React.useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <PostCreationNavigator onPostCreated={handlePostCreated} />
    </View>
  );
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type FloatingTabBarProps = BottomTabBarProps & {
  theme: 'light' | 'dark';
  colors: ReturnType<typeof getColors>;
  user: any;
};

const FloatingTabBar: React.FC<FloatingTabBarProps> = ({ state, descriptors, navigation, theme, colors, user }) => {
  const insets = useSafeAreaInsets();
  const animatedValues = React.useRef(
    state.routes.map((_, index) => new Animated.Value(index === state.index ? 1 : 0))
  ).current;
  const fabTranslate = React.useRef(new Animated.Value(0)).current;
  const fabOpacity = React.useRef(new Animated.Value(1)).current;
  const fabScale = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    animatedValues.forEach((value, index) => {
      Animated.spring(value, {
        toValue: index === state.index ? 1 : 0,
        useNativeDriver: true,
        friction: 7,
        tension: 140,
      }).start();
    });

    const isCreateFocused = state.routes[state.index]?.name === 'Create';

    Animated.parallel([
      Animated.spring(fabTranslate, {
        toValue: isCreateFocused ? -6 : 0,
        useNativeDriver: true,
        friction: 5,
        tension: 120,
      }),
      Animated.spring(fabScale, {
        toValue: isCreateFocused ? 1.05 : 1,
        useNativeDriver: true,
        friction: 6,
        tension: 120,
      }),
      Animated.timing(fabOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [state.index, animatedValues, fabOpacity, fabScale, fabTranslate, state.routes]);

  const containerInset = insets.bottom;
  const ContainerComponent: React.ElementType = Platform.OS === 'ios' ? BlurView : View;

  const baseTopPadding = Platform.OS === 'ios' ? 12 : 14;
  const baseBottomPadding = Platform.OS === 'ios' ? 12 : 14;

  const containerBackground =
    Platform.OS === 'ios'
      ? theme === 'dark'
        ? 'rgba(17, 24, 39, 0.82)'
        : 'rgba(255, 255, 255, 0.94)'
      : theme === 'dark'
        ? colors.background.secondary
        : '#ffffff';

  const containerStyles = [
    {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      paddingHorizontal: 24,
      paddingTop: baseTopPadding,
      paddingBottom: baseBottomPadding + containerInset,
      overflow: 'hidden',
      backgroundColor: containerBackground,
      borderWidth: Platform.OS === 'ios' ? 0 : 1,
      borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)',
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    Platform.OS === 'ios'
      ? {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      }
      : {
        elevation: 12,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
  ];

  const createIndex = state.routes.findIndex((route) => route.name === 'Create');

  // Get user image from global store (for immediate updates)
  const getUserImage = useUserStore((state) => state.getUserImage);

  const renderProfileIcon = (isFocused: boolean) => {
    // Get fallback from auth user first
    const authImage = (user as any)?.profileImageUrl ||
      (user as any)?.imageUrl ||
      (user as any)?.profile?.profileImageUrl ||
      null;

    // Use global store for immediate updates, always fallback to auth image
    const storeImage = getUserImage('current', 'profile', authImage);

    // Always prefer store image if available, otherwise use auth image
    const profileImage = storeImage || authImage;

    // Only cache-bust if URL changed (not on every render)
    const imageUrl = profileImage ? getCacheBustedUrl(profileImage, false) : null;

    // Use stable key based on base URL to prevent flickering
    const baseUrl = getBaseUrl(profileImage);
    const imageKey = baseUrl ? `tab-profile-${baseUrl}` : 'tab-profile-placeholder';

    if (imageUrl) {
      return (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            overflow: 'hidden',
            borderWidth: isFocused ? 2 : 1,
            borderColor: isFocused ? '#FF7300' : 'rgba(148, 163, 184, 0.4)',
          }}
        >
          <Image
            key={imageKey}
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
          />
        </View>
      );
    }

    return (
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#FF7300',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: isFocused ? 2 : 1,
          borderColor: isFocused ? '#FF7300' : 'rgba(148, 163, 184, 0.4)',
        }}
      >
        <Icon name="user" size={20} color="#ffffff" />
      </View>
    );
  };

  const renderIcon = (routeName: string, isFocused: boolean) => {
    const tint = isFocused ? '#FF7300' : colors.text.secondary;

    switch (routeName) {
      case 'Home':
        return <Icon name="home" size={ICON_SIZE} color={tint} />;
      case 'Explore':
        return <Icon name="compass" size={ICON_SIZE} color={tint} />;
      case 'Outfits':
        return <Icon name="grid" size={ICON_SIZE} color={tint} />;
      case 'Profile':
        return renderProfileIcon(isFocused);
      default:
        return <Icon name="circle" size={ICON_SIZE} color={tint} />;
    }
  };

  const renderCreateButton = () => {
    if (createIndex === -1) return null;
    const route = state.routes[createIndex];
    const isFocused = state.index === createIndex;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const onLongPress = () => {
      navigation.emit({ type: 'tabLongPress', target: route.key });
    };

    return (
      <Pressable
        key={`${route.key}-fab`}
        accessibilityRole="button"
        accessibilityLabel="Create post"
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          {
            position: 'absolute',
            top: -18,
            alignSelf: 'center',
            shadowColor: '#FF7300',
            shadowOpacity: 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
          Platform.OS === 'android' ? { elevation: 16 } : {},
        ]}
      >
        <Animated.View
          style={{
            opacity: fabOpacity,
            transform: [{ translateY: fabTranslate }, { scale: fabScale }],
          }}
        >
          <LinearGradient
            colors={isFocused ? ['#FF8C00', '#FF4500'] : ['#FF7300', '#FF4500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: CENTER_BUTTON_SIZE,
              height: CENTER_BUTTON_SIZE,
              borderRadius: CENTER_BUTTON_SIZE / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: CENTER_BUTTON_INNER,
                height: CENTER_BUTTON_INNER,
                borderRadius: CENTER_BUTTON_INNER / 2,
                backgroundColor: theme === 'dark' ? colors.background.primary : '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="plus" size={28} color={isFocused ? '#FF4500' : '#FF7300'} />
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <ContainerComponent
        intensity={Platform.OS === 'ios' ? (theme === 'dark' ? 45 : 70) : undefined}
        tint={Platform.OS === 'ios' ? (theme === 'dark' ? 'dark' : 'light') : undefined}
        style={containerStyles as any}
      >
        {state.routes.map((route, index) => {
          if (route.name === 'Create') {
            return <View key={route.key} style={{ width: CENTER_BUTTON_SIZE, alignItems: 'center' }} />;
          }

          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;
          const animatedValue = animatedValues[index];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          const animatedStyle = {
            transform: [
              {
                scale: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.08],
                }),
              },
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -4],
                }),
              },
            ],
          };

          return (
            <AnimatedTouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.9}
              style={[
                {
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  paddingHorizontal: 4,
                },
                animatedStyle,
              ]}
            >
              {renderIcon(route.name, isFocused)}
              <Animated.Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: isFocused ? '#FF7300' : colors.text.secondary,
                }}
                numberOfLines={1}
              >
                {label as string}
              </Animated.Text>
            </AnimatedTouchableOpacity>
          );
        })}
      </ContainerComponent>
      {renderCreateButton()}
    </View>
  );
};

// Main Tab Navigator (for all users)
function MainTabNavigator() {
  const { isSignedIn, user } = useAuth();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const navigation = useNavigation();

  // Handle Android hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // If we're on a main tab screen, show exit confirmation
        if (navigation.canGoBack()) {
          // If we can go back in navigation stack, let it handle it
          return false;
        } else {
          // We're on a main tab, show exit confirmation
          Alert.alert(
            'Exit App',
            'Are you sure you want to exit?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Exit',
                style: 'destructive',
                onPress: () => BackHandler.exitApp(),
              },
            ],
            { cancelable: true }
          );
          return true; // Prevent default back action
        }
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [navigation])
  );

  // Glassy background color fallback
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} theme={theme} colors={colors} user={user} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Create" component={CreatePostTab} />
      <Tab.Screen name="Outfits" component={OutfitFeedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Root Navigator that handles authentication state
export function RootNavigator() {
  const { isSignedIn, isLoaded } = useAuth();
  const { theme } = useTheme();
  const colors = getColors(theme);

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // Enable Android hardware back button for stack navigation
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyle: { backgroundColor: colors.background.primary }, // Set card background to theme color
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="Generate" component={GenerateScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="Suspended" component={SuspendedScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="OutfitDetail" component={OutfitDetailScreen} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="NewConversationScreen" component={NewConversationScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Contact Support' }} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ title: 'Terms of Service' }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SubscriptionHistory" component={SubscriptionHistoryScreen} />
      <Stack.Screen name="WishlistOutfits" component={require('../screens/WishlistOutfitsScreen').default} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </Stack.Navigator>
  );
} 