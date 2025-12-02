import { useApiService } from '../api';

export const useOtpApi = () => {
  const api = useApiService();

  const sendSignupOtp = async (email: string) => {
    return api.post('/otp/send-signup', { email });
  };

  const verifySignupOtp = async (email: string, code: string) => {
    return api.post('/otp/verify-signup', { email, code });
  };

  const sendPasswordResetOtp = async (email: string) => {
    return api.post('/otp/send-password-reset', { email });
  };

  const verifyPasswordResetOtp = async (email: string, code: string) => {
    return api.post('/otp/verify-password-reset', { email, code });
  };

  const resetPassword = async (email: string, token: string, newPassword: string) => {
    return api.post('/otp/reset-password', { email, token, newPassword });
  };

  return {
    sendSignupOtp,
    verifySignupOtp,
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPassword,
  };
};

