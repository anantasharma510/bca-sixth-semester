import { useAuth } from './useAuth';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

export const useInteractionGuard = () => {
  const { isSignedIn } = useAuth();
  const navigation = useNavigation();

  return (actionName = 'this action') => {
    if (!isSignedIn) {
      Alert.alert(
        'Sign in required',
        `You need to sign in or sign up to ${actionName}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => (navigation as any).navigate('SignIn') },
          { text: 'Sign Up', onPress: () => (navigation as any).navigate('SignUp') },
        ]
      );
      return false;
    }
    return true;
  };
}; 