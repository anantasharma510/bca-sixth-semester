import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { Colors } from '../constants/colors';

const logo = require('../../assets/logo.png');

export const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={logo} style={styles.logoImage} resizeMode="contain" />

        <ActivityIndicator size="large" color={Colors.primary[500]} style={styles.spinner} />

        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 40,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
});