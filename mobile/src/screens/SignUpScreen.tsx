import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Dimensions, Modal, Linking, Alert } from 'react-native';
import { authClient } from '../lib/auth-client';
import { useWarmUpBrowser } from '../hooks/useWarmUpBrowser';
import { useApiService } from '../services/api';
import { Colors } from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import TermsOfServiceScreen from './TermsOfServiceScreen';

const { width: screenWidth } = Dimensions.get('window');

export default function SignUpScreen({ navigation }: any) {
  useWarmUpBrowser();
  const apiService = useApiService();

  const syncWithBackend = async () => {
    // Note: The actual sync is handled by useSyncUserWithBackend hook
    // This is just a placeholder for immediate post-auth actions
    // console.log('Authentication completed, backend sync will happen automatically');
  };

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Legacy OAuth completion state (still used for modal)
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false);
  const [missingFieldsData, setMissingFieldsData] = useState<{ username: string }>({
    username: '',
  });
  const [currentOAuthResult, setCurrentOAuthResult] = useState<any>(null);
  const [isCompletingSignUp, setIsCompletingSignUp] = useState(false);

  const onSignUpPress = async () => {
    // Check if user has accepted terms
    if (!acceptedTerms) {
      setShowTermsModal(true);
      return;
    }

    if (!emailAddress || !password || !username || !firstName || !lastName) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await apiService.post('/otp/send-signup', { email: emailAddress });
      navigation.navigate('VerifyEmail', {
        email: emailAddress,
        password,
        firstName,
        lastName,
        username,
      });
    } catch (err: any) {
      console.error('[SignUp] Error initiating signup:', err);
      setError(err?.message || 'Failed to start signup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigation.navigate('MainTabs', {
      screen: 'Home',
    });
  };

  const handleMissingFieldsSubmit = async () => {
    // For Better Auth, missing fields are typically handled on the backend
    // If username is required, it should be collected during OAuth callback
    // This is a placeholder for future implementation if needed
    setShowMissingFieldsModal(false);
    setError('Please complete sign up through the OAuth provider.');
  };

  // Removed isLoaded check - Better Auth doesn't require it
  // Removed pendingVerification - Better Auth handles this differently
  // Removed email verification UI - Better Auth doesn't require email verification by default

  return (
    <LinearGradient
      colors={['#FCFCFC', '#FCFCFC']}
      style={styles.gradient}
    >
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToHome}
            activeOpacity={0.8}
            accessibilityLabel="返回主页"
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="rocket" size={60} color="#FF7300" />
              </View>
            <Text style={styles.title}>创建您的帐户</Text>
            <Text style={styles.subtitle}>加入AIRWIG数千名用户的行列</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.nameContainer}>
              <View style={[styles.inputContainer, styles.nameInput]}>
                <Text style={styles.label}>名</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="名"
                    placeholderTextColor={Colors.text.tertiary}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    editable={!isLoading}
                  />
                </View>
              </View>
              <View style={[styles.inputContainer, styles.nameInput, styles.lastNameInput]}>
                <Text style={styles.label}>姓</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.inputWithoutIcon]}
                    placeholder="姓"
                    placeholderTextColor={Colors.text.tertiary}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    autoComplete="family-name"
                    editable={!isLoading}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>用户名 *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="at" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="选择一个唯一的用户名"
                  placeholderTextColor={Colors.text.tertiary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoComplete="username"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>电子邮件</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="输入您的电子邮件"
                  placeholderTextColor={Colors.text.tertiary}
                  value={emailAddress}
                  onChangeText={setEmailAddress}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>密码</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="创建密码"
                  placeholderTextColor={Colors.text.tertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                  editable={!isLoading}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={Colors.text.secondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.error[500]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Terms Agreement */}
            <View style={styles.termsContainer}>
              <TouchableOpacity 
                style={styles.termsCheckbox}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked,
                  { borderColor: acceptedTerms ? '#FF7300' : Colors.border.light }
                ]}>
                  {acceptedTerms && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.termsTextContainer}>
                  <Text style={[styles.termsText, { color: Colors.text.secondary }]}>
                  我同意{' '}
                  </Text>
                  <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                    <Text style={[styles.termsLink, { color: '#FF7300' }]}>
                    服务条款
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.termsText, { color: Colors.text.secondary }]}>
                    {' '}和{' '}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    Linking.openURL('https://airwig.ca/privacy-policy').catch(err => {
                      Alert.alert('Error', 'Could not open link');
                    });
                  }}>
                    <Text style={[styles.termsLink, { color: '#FF7300' }]}>
                    隐私政策
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!emailAddress || !password || !firstName || !lastName || !username || !acceptedTerms || isLoading) && styles.primaryButtonDisabled
              ]}
              onPress={onSignUpPress}
              disabled={!emailAddress || !password || !firstName || !lastName || !username || !acceptedTerms || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>继续</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                已经有一个账户了吗？{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text style={styles.footerLink}>
                登入</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Missing Fields Modal */}
      <Modal
        visible={showMissingFieldsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMissingFieldsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
          >
            <ScrollView 
              contentContainerStyle={styles.modalContentScrollable}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="person-add" size={48} color={Colors.primary[500]} />
                </View>
                <Text style={styles.modalTitle}>Complete Your Profile</Text>
                <Text style={styles.modalSubtitle}>
                  我们需要一个用户名来完成您的登录
                </Text>
              </View>

              <View style={styles.modalForm}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Username *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="at" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Choose a unique username"
                      placeholderTextColor={Colors.text.tertiary}
                      value={missingFieldsData.username}
                      onChangeText={(text) => setMissingFieldsData({ ...missingFieldsData, username: text })}
                      autoCapitalize="none"
                      autoComplete="username"
                      editable={!isCompletingSignUp}
                      autoFocus={true}
                    />
                  </View>
                </View>

                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={Colors.error[500]} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setShowMissingFieldsModal(false);
                      setError('');
                      setMissingFieldsData({ username: '' });
                    }}
                    disabled={isCompletingSignUp}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalConfirmButton,
                      (!missingFieldsData.username || isCompletingSignUp) && styles.modalConfirmButtonDisabled
                    ]}
                    onPress={handleMissingFieldsSubmit}
                    disabled={!missingFieldsData.username || isCompletingSignUp}
                    activeOpacity={0.8}
                  >
                    {isCompletingSignUp ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmButtonText}>Complete Sign Up</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.termsModalOverlay}>
          <TermsOfServiceScreen
            showAcceptButton={true}
            onAccept={() => {
              setAcceptedTerms(true);
              setShowTermsModal(false);
            }}
            onDecline={() => {
              setAcceptedTerms(false);
              setShowTermsModal(false);
            }}
          />
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: Platform.OS === 'ios' ? 24 : 16,
    marginLeft: 16,
    marginBottom: 24,
    backgroundColor: '#F06C00',
    borderRadius: 999,
    padding: 10,
    shadowColor: '#F06C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  nameInput: {
    flex: 1,
    marginBottom: 16,
  },
  lastNameInput: {
    marginLeft: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.text.primary,
  },
  inputWithoutIcon: {
    paddingLeft: 16,
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error[50],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error[700],
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#FF7300',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#FF7300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#FFB380',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.light,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '500',
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  googleIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
  },
  googleButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  wechatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07C160',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  wechatIcon: {
    marginRight: 12,
  },
  wechatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  footerLink: {
    color: '#FF7300',
    fontWeight: '600',
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContentScrollable: {
    backgroundColor: Colors.background.primary,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalForm: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    color: Colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.primary[500],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmButtonDisabled: {
    backgroundColor: Colors.primary[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Terms agreement styles
  termsContainer: {
    marginBottom: 20,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#FF7300',
    borderColor: '#FF7300',
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});