import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useOtpApi } from '../services/api/otp';
import { authClient } from '../lib/auth-client';
import { useWarmUpBrowser } from '../hooks/useWarmUpBrowser';

type VerifyEmailParams = {
  VerifyEmail: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username: string;
  };
};

export default function VerifyEmailScreen({ navigation }: any) {
  useWarmUpBrowser();
  const route = useRoute<RouteProp<VerifyEmailParams, 'VerifyEmail'>>();
  const params = route.params;

  const email = params?.email || '';
  const password = params?.password || '';
  const firstName = params?.firstName || '';
  const lastName = params?.lastName || '';
  const username = params?.username || '';

  const otpApi = useOtpApi();

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');

  const syncWithBackend = async () => {
    // Placeholder for future hooks (useSyncUserWithBackend)
  };

  useEffect(() => {
    if (!email) {
      navigation.replace('SignUp');
    }
  }, [email, navigation]);

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setError('');
    try {
      await otpApi.sendSignupOtp(email);
      Alert.alert('已发送', '验证码已重新发送到您的邮箱');
    } catch (err: any) {
      console.error('[VerifyEmail] Error resending OTP:', err);
      setError(err?.message || '发送验证码失败，请稍后重试');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    if (!email || !password) {
      setError('缺少注册信息，请重新开始注册流程');
      navigation.replace('SignUp');
      return;
    }

    if (code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await otpApi.verifySignupOtp(email, code);

      const result = await authClient.signUp.email({
        email,
        password,
        name: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || username,
      });

      if (result.error) {
        throw new Error(result.error.message || '注册失败，请重试');
      }

      await syncWithBackend();

      Alert.alert('成功', '邮箱验证成功，欢迎加入 AIRWIG！', [
        {
          text: '进入',
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
          }),
        },
      ]);
    } catch (err: any) {
      console.error('[VerifyEmail] Error verifying OTP:', err);
      setError(err?.message || '验证码无效或已过期，请重试');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChangeEmail = () => {
    navigation.goBack();
  };

  return (
    <LinearGradient colors={['#FCFCFC', '#FDE8D7']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Ionicons name="mail-open" size={64} color="#FF7300" style={styles.headerIcon} />
          <Text style={styles.title}>验证您的邮箱</Text>
          <Text style={styles.subtitle}>
            我们已向 {email} 发送验证码，请输入6位验证码完成注册。
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>验证码</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="输入6位验证码"
                placeholderTextColor={Colors.text.tertiary}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={Colors.error[500]} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.verifyButton,
              (code.length !== 6 || isVerifying) && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={code.length !== 6 || isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>完成注册</Text>
            )}
          </TouchableOpacity>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleResend} disabled={isResending}>
              <Text style={styles.linkText}>
                {isResending ? '重新发送中…' : '没有收到验证码？重新发送'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleChangeEmail}>
              <Text style={styles.linkText}>修改邮箱</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F06C00',
    borderRadius: 999,
    padding: 10,
    marginBottom: 16,
  },
  headerIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    backgroundColor: Colors.background.primary,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    letterSpacing: 6,
    color: Colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error[50],
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error[700],
    marginLeft: 8,
    flex: 1,
  },
  verifyButton: {
    backgroundColor: '#FF7300',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    backgroundColor: '#FFB380',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linkText: {
    color: '#FF7300',
    fontWeight: '600',
  },
});

