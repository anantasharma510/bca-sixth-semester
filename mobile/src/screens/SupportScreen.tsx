import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { supportAPI, CreateTicketData } from '../services/api/support';
import { useNavigation } from '@react-navigation/native';

export default function SupportScreen() {
  const { isSignedIn } = useAuth();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const navigation = useNavigation();
  const primaryColor = colors.primary[500];
  const primarySurface = theme === 'dark' ? 'rgba(255, 115, 0, 0.18)' : 'rgba(255, 115, 0, 0.12)';
  const neutralSurface = theme === 'dark' ? colors.background.tertiary : colors.background.secondary;
  const inputSurface = theme === 'dark' ? colors.background.tertiary : colors.background.secondary;
  const borderColor = theme === 'dark' ? colors.border.medium : colors.border.light;
  const infoSurface = theme === 'dark' ? 'rgba(255, 115, 0, 0.18)' : colors.primary[50];
  const infoTextColor = theme === 'dark' ? colors.primary[200] : colors.primary[700];

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'bug' | 'feature' | 'account' | 'billing' | 'other'>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'bug', label: '🐛 Bug Report', icon: 'bug-outline' },
    { value: 'feature', label: '✨ Feature Request', icon: 'bulb-outline' },
    { value: 'account', label: '👤 Account Issue', icon: 'person-outline' },
    { value: 'other', label: '💬 Other', icon: 'chatbox-outline' },
  ];

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please describe your issue');
      return;
    }

    if (subject.length > 200) {
      Alert.alert('Error', 'Subject must be less than 200 characters');
      return;
    }

    if (message.length > 5000) {
      Alert.alert('Error', 'Message must be less than 5000 characters');
      return;
    }

    if (!isSignedIn) {
      Alert.alert('Authentication required', 'Please sign in to contact support.');
      return;
    }

    setIsSubmitting(true);
    try {

      const ticketData: CreateTicketData = {
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority: 'medium',
      };

      await supportAPI.createTicket(undefined, ticketData);

      Alert.alert(
        'Success',
        'Your support ticket has been submitted. We will get back to you soon!',
        [
          {
            text: 'OK',
            onPress: () => {
              setSubject('');
              setMessage('');
              setCategory('other');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Support ticket submission error:', error);
      Alert.alert('Error', error.message || 'Failed to submit support ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Contact Support
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            We're here to help! Describe your issue and we'll get back to you as soon as possible.
          </Text>
          
          {/* Web Support Link */}
          <TouchableOpacity 
            style={[
              styles.webSupportButton,
              { backgroundColor: primarySurface, borderColor: primaryColor },
            ]}
            onPress={() => {
              // Open web support page in browser
              const { Linking } = require('react-native');
              Linking.openURL('https://airwig.ca/support');
            }}
          >
            <Ionicons name="globe-outline" size={16} color={primaryColor} />
            <Text style={[styles.webSupportText, { color: primaryColor }]}>
              Visit our web support page
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text.primary }]}>
            Category
          </Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: category === cat.value 
                      ? primaryColor
                      : neutralSurface,
                    borderColor: category === cat.value
                      ? primaryColor
                      : borderColor,
                  },
                ]}
                onPress={() => setCategory(cat.value as any)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={20}
                  color={category === cat.value ? colors.text.inverse : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: category === cat.value ? colors.text.inverse : colors.text.primary,
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subject Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text.primary }]}>
            Subject
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: inputSurface,
                borderColor,
                color: colors.text.primary,
              },
            ]}
            placeholder="Brief description of your issue"
            placeholderTextColor={colors.text.secondary}
            value={subject}
            onChangeText={setSubject}
            maxLength={200}
            returnKeyType="next"
            blurOnSubmit={false}
          />
          <Text style={[styles.charCount, { color: colors.text.secondary }]}>
            {subject.length}/200
          </Text>
        </View>

        {/* Message Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text.primary }]}>
            Message
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: inputSurface,
                borderColor,
                color: colors.text.primary,
              },
            ]}
            placeholder="Please provide as much detail as possible..."
            placeholderTextColor={colors.text.secondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={5000}
            returnKeyType="default"
            blurOnSubmit={true}
          />
          <Text style={[styles.charCount, { color: colors.text.secondary }]}>
            {message.length}/5000
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: primaryColor,
              opacity: isSubmitting ? 0.6 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={colors.text.inverse} />
              <Text style={[styles.submitButtonText, { color: colors.text.inverse }]}>Submit Ticket</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: infoSurface }]}>
          <Ionicons 
            name="information-circle" 
            size={20} 
            color={primaryColor} 
          />
          <Text style={[styles.infoText, { color: infoTextColor }]}>
            We typically respond within 24 hours. Thank You!
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Increased padding for keyboard
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minWidth: '48%',
    flex: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  webSupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
  },
  webSupportText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 150,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

