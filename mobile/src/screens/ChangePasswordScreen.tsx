import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { Header } from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { useApiService } from '../services/api';
import Icon from 'react-native-vector-icons/Feather';

const MIN_PASSWORD_LENGTH = 8;

interface Requirement {
  id: string;
  label: string;
  check: (password: string) => boolean;
}

type RequirementResult = Requirement & { passed: boolean };

const PASSWORD_REQUIREMENTS: Requirement[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    check: (password) => password.length >= MIN_PASSWORD_LENGTH,
  },
  {
    id: 'upper',
    label: 'Contains an uppercase letter',
    check: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lower',
    label: 'Contains a lowercase letter',
    check: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'Contains a number',
    check: (password) => /\d/.test(password),
  },
  {
    id: 'symbol',
    label: 'Contains a symbol',
    check: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

export default function ChangePasswordScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const { isSignedIn } = useAuth();
  const { post: postApi } = useApiService();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requirementResults = useMemo<RequirementResult[]>(
    () =>
      PASSWORD_REQUIREMENTS.map((requirement) => ({
        ...requirement,
        passed: requirement.check(newPassword),
      })),
    [newPassword]
  );

  const passwordIsStrong = requirementResults.every((req: RequirementResult) => req.passed);

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword === confirmPassword &&
    passwordIsStrong &&
    !loading;

  const handleSubmit = async () => {
    if (!isSignedIn) {
      setError('Please sign in again before changing your password.');
      return;
    }

    if (!currentPassword || !newPassword) {
      setError('Please fill out all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await postApi('/protected/change-password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        'Password updated',
        'Your password has been changed successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      setError(err?.message || 'Unable to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <SafeAreaView style={[styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Header
        navigation={navigation}
        title="Change password"
        showBackButton
        showNotificationsIcon={false}
        showMessagesIcon={false}
        onBackPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.contentContainer, { backgroundColor: colors.background.primary }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.description, { color: colors.text.secondary }]}>
            Update your account password to keep your profile secure. You’ll need your current password to continue.
          </Text>

          <View style={styles.card}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Current password</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text.primary,
                  borderColor: colors.border.light,
                  backgroundColor: colors.background.secondary,
                },
              ]}
              secureTextEntry
              placeholder="Enter current password"
              placeholderTextColor={colors.text.tertiary}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
            />

            <Text style={[styles.label, { color: colors.text.secondary, marginTop: 20 }]}>New password</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text.primary,
                  borderColor: colors.border.light,
                  backgroundColor: colors.background.secondary,
                },
              ]}
              secureTextEntry
              placeholder="Enter new password"
              placeholderTextColor={colors.text.tertiary}
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />

            <Text style={[styles.label, { color: colors.text.secondary, marginTop: 20 }]}>Confirm new password</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text.primary,
                  borderColor: colors.border.light,
                  backgroundColor: colors.background.secondary,
                },
              ]}
              secureTextEntry
              placeholder="Confirm new password"
              placeholderTextColor={colors.text.tertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />

            <View style={styles.requirementsContainer}>
              <Text style={[styles.requirementsTitle, { color: colors.text.secondary }]}>Password requirements</Text>
              {requirementResults.map((req: RequirementResult) => (
                <RequirementRow key={req.id} label={req.label} passed={req.passed} colors={colors} />
              ))}
            </View>

            {error && (
              <View style={[styles.errorContainer, { backgroundColor: colors.error[50], borderColor: colors.error[200] }]}>
                <Text style={[styles.errorText, { color: colors.error[700] }]}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: canSubmit ? colors.primary[500] : colors.border.light,
                },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Update password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type RequirementRowProps = {
  label: string;
  passed: boolean;
  colors: ReturnType<typeof getColors>;
};

const RequirementRow: React.FC<RequirementRowProps> = (props: RequirementRowProps) => {
  const { label, passed, colors } = props;
  return (
    <View style={styles.requirementRow}>
      <View
        style={[
          styles.requirementIcon,
          {
            backgroundColor: passed ? 'rgba(34, 197, 94, 0.18)' : 'rgba(148, 163, 184, 0.18)',
          },
        ]}
      >
        <Icon
          name={passed ? 'check' : 'minus'}
          size={14}
          color={passed ? '#22c55e' : colors.text.secondary}
        />
      </View>
      <Text style={[styles.requirementText, { color: colors.text.secondary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  card: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
  },
  requirementsContainer: {
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.25)',
    paddingTop: 16,
    gap: 10,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requirementIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requirementText: {
    fontSize: 14,
  },
  errorContainer: {
    marginTop: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
