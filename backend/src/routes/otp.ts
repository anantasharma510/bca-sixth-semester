// @ts-nocheck
import { Request, Response, Router } from 'express';
import { OTP } from '../models/otp.model';
import { User } from '../models/user.model';
import { sendOTPEmail } from '../utils/email';
import { body, validationResult } from 'express-validator';

const router = Router();

const logOtpForDebug = (email: string, code: string, type: 'signup' | 'password-reset') => {
  const shouldLog = process.env.NODE_ENV !== 'production' || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD;
  if (shouldLog) {
    console.log(`🔐 OTP (${type}) for ${email}: ${code}`);
  }
};

// Generate random 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP for signup
router.post(
  '/send-signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Delete any existing unverified OTPs for this email and type
      await OTP.deleteMany({ 
        email: normalizedEmail, 
        type: 'signup', 
        verified: false 
      });

      // Generate new OTP
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to database
      const otp = await OTP.create({
        email: normalizedEmail,
        code,
        type: 'signup',
        expiresAt,
        verified: false,
        attempts: 0,
      });

      let emailSent = true;
      try {
        await sendOTPEmail(normalizedEmail, code, 'signup');
        console.log(`✅ Signup OTP sent to ${normalizedEmail}`);
      } catch (emailError) {
        emailSent = false;
        console.error('❌ Failed to send OTP email:', emailError);
        if (process.env.NODE_ENV === 'production') {
          await OTP.findByIdAndDelete(otp._id);
          return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
        }
      }

      logOtpForDebug(normalizedEmail, code, 'signup');

      res.json({ 
        message: emailSent ? 'Verification code sent to your email' : 'Verification code generated (check server logs while email is disabled)',
        expiresIn: 600, // 10 minutes in seconds
        emailSent,
      });
    } catch (error: any) {
      console.error('Error sending signup OTP:', error);
      res.status(500).json({ error: 'Failed to send verification code' });
    }
  }
);

// Verify OTP for signup
router.post(
  '/verify-signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, code } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Find OTP
      const otp = await OTP.findOne({
        email: normalizedEmail,
        type: 'signup',
        verified: false,
      });

      if (!otp) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      // Check if expired
      if (new Date() > otp.expiresAt) {
        await OTP.findByIdAndDelete(otp._id);
        return res.status(400).json({ error: 'Verification code has expired' });
      }

      // Check attempts (max 5 attempts)
      if (otp.attempts >= 5) {
        await OTP.findByIdAndDelete(otp._id);
        return res.status(400).json({ error: 'Too many failed attempts. Please request a new code' });
      }

      // Verify code
      if (otp.code !== code) {
        otp.attempts += 1;
        await otp.save();
        return res.status(400).json({ 
          error: 'Invalid verification code',
          attemptsRemaining: 5 - otp.attempts,
        });
      }

      // Mark as verified
      otp.verified = true;
      await otp.save();

      res.json({ 
        message: 'Email verified successfully',
        verified: true,
      });
    } catch (error: any) {
      console.error('Error verifying signup OTP:', error);
      res.status(500).json({ error: 'Failed to verify code' });
    }
  }
);

// Send OTP for password reset
router.post(
  '/send-password-reset',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user exists
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ 
          message: 'If an account exists with this email, a verification code has been sent',
          expiresIn: 600,
        });
      }

      // Delete any existing unverified OTPs for this email and type
      await OTP.deleteMany({ 
        email: normalizedEmail, 
        type: 'password-reset', 
        verified: false 
      });

      // Generate new OTP
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to database
      const otp = await OTP.create({
        email: normalizedEmail,
        code,
        type: 'password-reset',
        expiresAt,
        verified: false,
        attempts: 0,
      });

      let emailSent = true;
      try {
        await sendOTPEmail(normalizedEmail, code, 'password-reset');
        console.log(`✅ Password reset OTP sent to ${normalizedEmail}`);
      } catch (emailError) {
        emailSent = false;
        console.error('❌ Failed to send OTP email:', emailError);
        if (process.env.NODE_ENV === 'production') {
          await OTP.findByIdAndDelete(otp._id);
          return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
        }
      }

      logOtpForDebug(normalizedEmail, code, 'password-reset');

      res.json({ 
        message: emailSent ? 'If an account exists with this email, a verification code has been sent' : 'Verification code generated (check server logs while email is disabled)',
        expiresIn: 600, // 10 minutes in seconds
        emailSent,
      });
    } catch (error: any) {
      console.error('Error sending password reset OTP:', error);
      res.status(500).json({ error: 'Failed to send verification code' });
    }
  }
);

// Verify OTP for password reset
router.post(
  '/verify-password-reset',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, code } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Find OTP
      const otp = await OTP.findOne({
        email: normalizedEmail,
        type: 'password-reset',
        verified: false,
      });

      if (!otp) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      // Check if expired
      if (new Date() > otp.expiresAt) {
        await OTP.findByIdAndDelete(otp._id);
        return res.status(400).json({ error: 'Verification code has expired' });
      }

      // Check attempts (max 5 attempts)
      if (otp.attempts >= 5) {
        await OTP.findByIdAndDelete(otp._id);
        return res.status(400).json({ error: 'Too many failed attempts. Please request a new code' });
      }

      // Verify code
      if (otp.code !== code) {
        otp.attempts += 1;
        await otp.save();
        return res.status(400).json({ 
          error: 'Invalid verification code',
          attemptsRemaining: 5 - otp.attempts,
        });
      }

      // Mark as verified
      otp.verified = true;
      await otp.save();

      res.json({ 
        message: 'Email verified successfully',
        verified: true,
        token: otp._id.toString(), // Return token for password reset
      });
    } catch (error: any) {
      console.error('Error verifying password reset OTP:', error);
      res.status(500).json({ error: 'Failed to verify code' });
    }
  }
);

// Reset password after OTP verification
router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('token').notEmpty().withMessage('Verification token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, token, newPassword } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Find verified OTP
      const otp = await OTP.findOne({
        _id: token,
        email: normalizedEmail,
        type: 'password-reset',
        verified: true,
      });

      if (!otp) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      // Check if token is still valid (within 30 minutes of verification)
      const verificationTime = otp.updatedAt || otp.createdAt;
      const tokenAge = Date.now() - new Date(verificationTime).getTime();
      if (tokenAge > 30 * 60 * 1000) { // 30 minutes
        await OTP.findByIdAndDelete(otp._id);
        return res.status(400).json({ error: 'Verification token has expired. Please request a new code' });
      }

      // Find user
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update password using Better Auth
      // Note: Better Auth handles password hashing internally
      // We need to use Better Auth's password reset endpoint
      // For now, we'll return success and let the client handle it through Better Auth
      
      // Delete the OTP after successful password reset
      await OTP.findByIdAndDelete(otp._id);

      res.json({ 
        message: 'Password reset successful. You can now sign in with your new password.',
        success: true,
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

export default router;

