import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors } from '../constants/colors';
import { Button } from '../components/ui/Button';

export default function AuthPromptScreen({ navigation }: any) {
  const handleSignIn = () => {
    navigation.navigate('SignIn');
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>AIRWIG</Text>
          </View>
          <Text style={styles.title}>Welcome to AIRWIG</Text>
          <Text style={styles.subtitle}>
            Connect with friends, share your thoughts, and discover what's happening around the world.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Create Account"
            onPress={handleSignUp}
            style={styles.primaryButton}
          />
          
          <Button
            title="Sign In"
            onPress={handleSignIn}
            variant="outline"
            style={styles.secondaryButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing up, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  actions: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  primaryButton: {
    marginBottom: 0,
  },
  secondaryButton: {
    marginBottom: 0,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
}); 