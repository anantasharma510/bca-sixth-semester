import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Colors, getColors } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { reportsAPI } from '../services/api/reports';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId?: string;
  reportedPostId?: string;
  reportedCommentId?: string;
  reporterUsername?: string;
  reportedContent?: string;
}

const REPORT_REASONS = [
  {
    value: 'spam',
    label: 'Spam',
    description: 'Repetitive, unwanted, or promotional content',
    icon: 'flag',
    color: '#f97316', // orange-500
  },
  {
    value: 'harassment',
    label: 'Harassment',
    description: 'Bullying, threats, or targeted abuse',
    icon: 'alert-triangle',
    color: '#ef4444', // red-500
  },
  {
    value: 'hate_speech',
    label: 'Hate Speech',
    description: 'Content that attacks or incites hatred',
    icon: 'shield',
    color: '#dc2626', // red-600
  },
  {
    value: 'violence',
    label: 'Violence',
    description: 'Content that promotes or depicts violence',
    icon: 'alert-triangle',
    color: '#b91c1c', // red-700
  },
  {
    value: 'inappropriate_content',
    label: 'Inappropriate Content',
    description: 'Sexual, graphic, or disturbing content',
    icon: 'shield',
    color: '#a855f7', // purple-500
  },
  {
    value: 'fake_news',
    label: 'Misinformation',
    description: 'False or misleading information',
    icon: 'message-square',
    color: '#eab308', // yellow-500
  },
  {
    value: 'copyright',
    label: 'Copyright',
    description: 'Unauthorized use of copyrighted material',
    icon: 'copy',
    color: '#3b82f6', // blue-500
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Something else that violates our guidelines',
    icon: 'help-circle',
    color: '#6b7280', // gray-500
  },
];

export function ReportModal({
  isOpen,
  onClose,
  reportedUserId,
  reportedPostId,
  reportedCommentId,
  reporterUsername,
  reportedContent,
}: ReportModalProps) {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const { isSignedIn } = useAuth();
  
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    if (!isSignedIn) {
      Alert.alert('Error', 'Authentication required to submit a report.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine entity type and ID
      let reportedEntityType: 'Post' | 'User' | 'Comment' = 'Post';
      let reportedEntityId = reportedPostId || '';
      
      if (reportedUserId) {
        reportedEntityType = 'User';
        reportedEntityId = reportedUserId;
      } else if (reportedCommentId) {
        reportedEntityType = 'Comment';
        reportedEntityId = reportedCommentId;
      }

      await reportsAPI.createReport({
        reportedEntityType,
        reportedEntityId,
        reason: selectedReason as any,
        description: description.trim() || undefined,
      }, undefined);

      Alert.alert(
        'Report Submitted',
        'Thank you for reporting this content. Our team will review it within 24 hours.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error: any) {
      console.error('Failed to submit report:', error);
      Alert.alert('Error', error?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    onClose();
  };

  const getReportTarget = () => {
    if (reportedUserId) return `user @${reporterUsername}`;
    if (reportedPostId) return 'this post';
    if (reportedCommentId) return 'this comment';
    return 'this content';
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background.primary}
        />
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: colors.primary[500] }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text.primary }]}>Report Content</Text>
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            style={[
              styles.submitButton,
              (!selectedReason || isSubmitting) && styles.submitButtonDisabled
            ]}
          >
            <Text style={[
              styles.submitButtonText,
              (!selectedReason || isSubmitting) && styles.submitButtonTextDisabled
            ]}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Report target info */}
          <View style={[styles.infoContainer, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.infoText, { color: colors.text.secondary }]}>
              You are reporting {getReportTarget()} for violating our community guidelines.
            </Text>
            {reportedContent && (
              <View style={[styles.contentPreview, { backgroundColor: colors.background.primary, borderColor: colors.border.medium }]}>
                <Text style={[styles.contentText, { color: colors.text.primary }]} numberOfLines={3}>
                  "{reportedContent}"
                </Text>
              </View>
            )}
          </View>

          {/* Reason selection */}
          <View style={styles.reasonsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>What's the issue?</Text>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonButton,
                  { borderColor: colors.border.medium },
                  selectedReason === reason.value && { borderColor: colors.primary[500], backgroundColor: colors.primary[50] }
                ]}
                onPress={() => setSelectedReason(reason.value)}
              >
                <View style={styles.reasonContent}>
                  <Icon name={reason.icon} size={20} color={reason.color} />
                  <View style={styles.reasonText}>
                    <Text style={[styles.reasonLabel, { color: colors.text.primary }]}>
                      {reason.label}
                    </Text>
                    <Text style={[styles.reasonDescription, { color: colors.text.secondary }]}>
                      {reason.description}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Additional details */}
          <View style={styles.descriptionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Additional details (optional)
            </Text>
            <TextInput
              style={[
                styles.descriptionInput,
                {
                  backgroundColor: colors.background.primary,
                  borderColor: colors.border.medium,
                  color: colors.text.primary,
                }
              ]}
              placeholder="Provide any additional context that might help our review team..."
              placeholderTextColor={colors.text.tertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={[styles.characterCount, { color: colors.text.tertiary }]}>
              {description.length}/1000 characters
            </Text>
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimerContainer}>
            <Text style={[styles.disclaimerText, { color: colors.text.tertiary }]}>
              Reports are reviewed by our moderation team within 24 hours. 
              False reports may result in account restrictions.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#d1d5db',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoContainer: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  contentPreview: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  reasonsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  reasonButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reasonContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reasonText: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reasonDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  disclaimerContainer: {
    paddingBottom: 32,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
