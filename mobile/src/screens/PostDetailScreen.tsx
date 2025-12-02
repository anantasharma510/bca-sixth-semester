import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Alert, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { postsAPI } from '../services/api/posts';
import { Post } from '../components/Post';
import { getColors } from '../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';

export default function PostDetailScreen({ navigation }: any) {
  const route = useRoute();
  const { postId } = route.params as { postId: string };
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const colors = getColors(theme);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await postsAPI.getPost(undefined, postId);
        setPost(result.post || result);
      } catch (err: any) {
        setError(err.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary }}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={{ marginTop: 16, color: colors.text.primary }}>Loading post...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary }}>
        <Text style={{ color: colors.error[500], marginBottom: 8 }}>Error: {error}</Text>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary }}>
        <Text style={{ color: colors.text.primary }}>No post found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <Header navigation={navigation} title="Post" showBackButton />
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <Post post={post} />
      </ScrollView>
    </SafeAreaView>
  );
} 