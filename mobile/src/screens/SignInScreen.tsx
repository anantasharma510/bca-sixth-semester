import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Image } from 'react-native';
import { authClient } from '../lib/auth-client';
import { useWarmUpBrowser } from '../hooks/useWarmUpBrowser';
import { useApiService } from '../services/api';
import { useOtpApi } from '../services/api/otp';
import { Button } from '../components/ui/Button';
import { Colors } from '../constants/colors';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

interface MissingFieldsData {
  username: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SignInScreen({ navigation }: any) {
  useWarmUpBrowser();
  const apiService = useApiService();
  const otpApi = useOtpApi();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password reset state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');
  const [isResetting, setIsResetting] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // OAuth result state (for handling missing fields if needed)
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false);
  const [missingFieldsData, setMissingFieldsData] = useState<MissingFieldsData>({
    username: '',
  });

  const syncWithBackend = async () => {
    // Note: The actual sync is handled by useSyncUserWithBackend hook
    // This is just a placeholder for immediate post-auth actions
    // console.log('Authentication completed, backend sync will happen automatically');
  };

  const onSignInPress = async () => {
    if (!emailAddress || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('[SignIn] Attempting email/password sign-in with Better Auth', {
        email: emailAddress,
        timestamp: new Date().toISOString(),
      });
      
      const result = await authClient.signIn.email({
        email: emailAddress,
        password,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Sign in failed');
      }

      console.log('[SignIn] Sign-in succeeded with Better Auth');
      
      // Sync with backend after successful sign in
      await syncWithBackend();
      
      // Navigate to Home tab after successful signin
      navigation.navigate('MainTabs', { 
        screen: 'Home'
      });
    } catch (err: any) {
      console.error('[SignIn] Sign-in error', {
        email: emailAddress,
        error: err?.message || err,
      });
      setError(err?.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMissingFieldsSubmit = async () => {
    // For Better Auth, missing fields are typically handled on the backend
    // If username is required, it should be collected during OAuth callback
    // This is a placeholder for future implementation if needed
    setShowMissingFieldsModal(false);
    setError('Please complete sign up through the OAuth provider.');
  };


  // Password reset functions
  const handleForgotPassword = () => {
    setShowPasswordReset(true);
    setResetEmail(emailAddress); // Pre-fill if email is entered
    setResetStep('email');
    setError('');
  };

  // Alternative: Redirect to Clerk's hosted password reset
  const handleForgotPasswordWeb = async () => {
    try {
      // Get the Clerk frontend API from app config
      const clerkFrontendApi = Constants.expoConfig?.extra?.clerkFrontendApi;
      
      if (!clerkFrontendApi) {
        // Fallback to native flow if domain not configured
        handleForgotPassword();
        return;
      }
      
      const clerkDomain = clerkFrontendApi.replace('https://', '');
      const resetUrl = `https://${clerkDomain}/sign-in#/?redirect_url=${encodeURIComponent('airwig://auth')}`;
      await WebBrowser.openBrowserAsync(resetUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to open password reset page. Please try again.');
    }
  };

  // Option 3: Redirect to your frontend website for password reset
  const handleForgotPasswordFrontend = async () => {
    try {
      const frontendUrl = Constants.expoConfig?.extra?.frontendUrl || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/sign-in?password_reset=true&email=${encodeURIComponent(emailAddress)}`;
      
      await WebBrowser.openBrowserAsync(resetUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to open password reset page. Please try again.');
    }
  };

  // Utility: Email and password validation
  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
  const isValidPassword = (pw: string) => pw.length >= 8;

  const sendPasswordResetCode = async () => {
    if (!resetEmail || !isValidEmail(resetEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsResetting(true);
    setError('');

    try {
      await otpApi.sendPasswordResetOtp(resetEmail);
      setOtpSent(true);
      setResetStep('code');
      Alert.alert('Success', 'Verification code sent to your email');
    } catch (err: any) {
      console.error('[SignIn] Error sending password reset OTP:', err);
      setError(err?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const verifyResetCode = async () => {
    if (!resetCode || resetCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsResetting(true);
    setError('');

    try {
      const result = await otpApi.verifyPasswordResetOtp(resetEmail, resetCode);
      setResetToken(result.token);
      setResetStep('password');
      Alert.alert('Success', 'Code verified successfully');
    } catch (err: any) {
      console.error('[SignIn] Error verifying password reset OTP:', err);
      setError(err?.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const resetPassword = async () => {
    if (!newPassword || !isValidPassword(newPassword)) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!resetToken) {
      setError('Verification token missing. Please start over.');
      return;
    }

    setIsResetting(true);
    setError('');

    try {
      await otpApi.resetPassword(resetEmail, resetToken, newPassword);
      Alert.alert('Success', 'Password reset successful. You can now sign in with your new password.', [
        { text: 'OK', onPress: () => {
          closePasswordReset();
          setPassword('');
        }}
      ]);
    } catch (err: any) {
      console.error('[SignIn] Error resetting password:', err);
      setError(err?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const closePasswordReset = () => {
    setShowPasswordReset(false);
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setResetStep('email');
    setResetToken('');
    setOtpSent(false);
    setError('');
  };

  // Removed isLoaded check - Better Auth doesn't require it

  return (
    <>
      <LinearGradient
        colors={['#FCFCFC', '#FCFCFC']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            activeOpacity={0.8}
            accessibilityLabel="返回主页"
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <ScrollView 
            contentContainerStyle={styles.scrollContainer} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="person-circle" size={80} color="#FF7300" />
              </View>
              <Text style={styles.title}>欢迎回来</Text>
              <Text style={styles.subtitle}>登录以继续您的旅程</Text>
            </View>

            <View style={styles.form}>
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
                    autoCapitalize="none"
                    keyboardType="email-address"
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
                    placeholder="输入您的密码"
                    placeholderTextColor={Colors.text.tertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
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

              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordLink}>
                <Text style={styles.forgotPasswordText}>忘记密码？</Text>
              </TouchableOpacity>

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={Colors.error[500]} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

          <TouchableOpacity
            style={[
              styles.signInButton, 
              (!emailAddress || !password || isLoading) && styles.signInButtonDisabled
            ]}
            onPress={onSignInPress}
            disabled={!emailAddress || !password || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signInButtonText}>登录</Text>
            )}
          </TouchableOpacity>


          <View style={styles.footer}>
            <Text style={styles.footerText}>
              没有账户吗？{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLink}>注册</Text>
            </TouchableOpacity>
          </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Password Reset Modal */}
      <Modal
        visible={showPasswordReset}
        transparent={true}
        animationType="slide"
        onRequestClose={closePasswordReset}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={closePasswordReset}
            >
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {resetStep === 'email' && 'Reset Password'}
              {resetStep === 'code' && 'Enter Verification Code'}
              {resetStep === 'password' && 'Create New Password'}
            </Text>
            
            {resetStep === 'email' && (
              <>
                <Text style={styles.modalSubtitle}>
                  输入您的电子邮件地址，我们将发送一个验证码来重置您的密码。
                </Text>
                <View style={styles.modalForm}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="mail-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        placeholderTextColor={Colors.text.tertiary}
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                      />
                    </View>
                  </View>
                </View>
              </>
            )}

            {resetStep === 'code' && (
              <>
                <Text style={styles.modalSubtitle}>
                  我们向 {resetEmail} 发送了一个验证码。输入下面的代码。
                </Text>
                <View style={styles.modalForm}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Verification Code</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="key-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit code"
                        placeholderTextColor={Colors.text.tertiary}
                        value={resetCode}
                        onChangeText={setResetCode}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}

            {resetStep === 'password' && (
              <>
                <Text style={styles.modalSubtitle}>
                  Create a new password for your account.
                </Text>
                <View style={styles.modalForm}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter new password"
                        placeholderTextColor={Colors.text.tertiary}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        autoComplete="password-new"
                      />
                    </View>
                  </View>
                </View>
              </>
            )}

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.error[500]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={closePasswordReset}
                disabled={isResetting}
              >
                <Text style={styles.modalButtonOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.modalButtonPrimary,
                  (isResetting || 
                  (resetStep === 'email' && !resetEmail.trim()) ||
                  (resetStep === 'code' && !resetCode.trim()) ||
                  (resetStep === 'password' && !newPassword.trim())) && styles.modalButtonDisabled
                ]}
                onPress={
                  resetStep === 'email' ? sendPasswordResetCode :
                  resetStep === 'code' ? verifyResetCode :
                  resetPassword
                }
                disabled={
                  isResetting || 
                  (resetStep === 'email' && !resetEmail.trim()) ||
                  (resetStep === 'code' && !resetCode.trim()) ||
                  (resetStep === 'password' && !newPassword.trim())
                }
              >
                {isResetting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>
                    {resetStep === 'email' ? 'Send Code' :
                    resetStep === 'code' ? 'Verify Code' :
                    'Reset Password'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Missing Fields Modal - Only Username - FIXED VERSION */}
      <Modal
        visible={showMissingFieldsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMissingFieldsModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContentScrollable}>
            <ScrollView 
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowMissingFieldsModal(false)}
              >
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>

              <View style={styles.modalIconContainer}>
                <Ionicons name="person-add" size={48} color={Colors.primary[500]} />
              </View>

              <Text style={styles.modalTitle}>Choose Your Username</Text>
              <Text style={styles.modalSubtitle}>
                Please choose a username to complete your account setup. Your name and email will be imported from Google.
              </Text>

              <View style={styles.modalForm}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Username *</Text>
                  <View style={[styles.inputWrapper, styles.usernameInputWrapper]}>
                    <Ionicons name="at" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.usernameInput]}
                      placeholder="Choose a unique username"
                      placeholderTextColor={Colors.text.tertiary}
                      value={missingFieldsData.username}
                      onChangeText={(text) => setMissingFieldsData(prev => ({ ...prev, username: text }))}
                      autoCapitalize="none"
                      autoComplete="username"
                      autoFocus={true}
                      returnKeyType="done"
                      onSubmitEditing={handleMissingFieldsSubmit}
                    />
                  </View>
                </View>

                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={Colors.error[500]} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
            
            {/* Fixed button positioning */}
            <View style={styles.modalButtonsFixed}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => setShowMissingFieldsModal(false)}
                disabled={false}
              >
                <Text style={styles.modalButtonOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.modalButtonPrimary,
                  !missingFieldsData.username.trim() && styles.modalButtonDisabled
                ]}
                onPress={handleMissingFieldsSubmit}
                disabled={!missingFieldsData.username.trim()}
              >
                <Text style={styles.modalButtonPrimaryText}>Complete Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 24,
    backgroundColor: '#F06C00',
    borderRadius: 999,
    padding: 10,
    zIndex: 2,
    shadowColor: '#F06C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
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
    opacity: 0.8,
  },
  form: {
    width: '100%',
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
  signInButton: {
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
  signInButtonDisabled: {
    backgroundColor: '#FFB380',
    shadowOpacity: 0,
    elevation: 0,
  },
  signInButtonText: {
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
    marginBottom: 16,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  googleLogo: {
    width: 22,
    height: 22,
    marginRight: 12,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  // NEW: Improved modal styles for username modal
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
  modalScrollContent: {
    padding: 24,
    paddingBottom: 100, // Extra space for fixed buttons
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16, // Added space for close button
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalForm: {
    width: '100%',
  },
  // NEW: Enhanced username input styles
  usernameInputWrapper: {
    borderWidth: 2,
    borderColor: Colors.primary[200],
    backgroundColor: '#FFFFFF',
  },
  usernameInput: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  // NEW: Fixed button positioning
  modalButtonsFixed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Consistent button height
  },
  modalButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.border.light,
  },
  modalButtonOutlineText: {
    color: Colors.text.secondary,
    fontSize: 15,
    fontWeight: '500',
  },
  modalButtonPrimary: {
    backgroundColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtonDisabled: {
    backgroundColor: Colors.primary[300],
    shadowOpacity: 0,
    elevation: 0,
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
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#FF7300',
    fontSize: 14,
    fontWeight: '500',
  },
});