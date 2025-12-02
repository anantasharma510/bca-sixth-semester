var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// @ts-nocheck
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
// Create reusable transporter
let transporter = null;
const getTransporter = () => {
    const smtpDisabled = process.env.SMTP_DISABLED === 'true';
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPassword = process.env.SMTP_PASSWORD || '';
    if (smtpDisabled || !smtpUser || !smtpPassword) {
        return null;
    }
    if (!transporter) {
        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = parseInt(process.env.SMTP_PORT || '587');
        const smtpSecure = process.env.SMTP_SECURE === 'true';
        transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
                user: smtpUser,
                pass: smtpPassword,
            },
        });
    }
    return transporter;
};
export const sendEmail = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const activeTransporter = getTransporter();
    if (!activeTransporter) {
        console.warn(`✉️ Email disabled - subject "${options.subject}" to ${options.to}`);
        return;
    }
    try {
        const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME || 'Airwig'}" <${process.env.SMTP_USER || process.env.SMTP_FROM_EMAIL || 'noreply@airwig.ca'}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, ''),
        };
        const info = yield activeTransporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
    }
    catch (error) {
        console.error('❌ Error sending email:', error);
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Failed to send email');
        }
    }
});
export const sendOTPEmail = (email, code, type) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = type === 'signup'
        ? 'Verify your Airwig account'
        : 'Reset your Airwig password';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #FF7300 0%, #FF9500 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 28px;">Airwig</h1>
      </div>
      <div style="background: #FFFFFF; padding: 30px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1F2937; margin-top: 0;">${subject}</h2>
        <p style="color: #4B5563; font-size: 16px;">
          ${type === 'signup'
        ? 'Thank you for signing up for Airwig! Please use the verification code below to complete your registration:'
        : 'You requested to reset your password. Please use the verification code below to reset your password:'}
        </p>
        <div style="background: #F9FAFB; border: 2px dashed #FF7300; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
          <div style="font-size: 32px; font-weight: bold; color: #FF7300; letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${code}
          </div>
        </div>
        <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
          This code will expire in 10 minutes. If you didn't request this, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0;">
          © ${new Date().getFullYear()} Airwig. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;
    yield sendEmail({
        to: email,
        subject,
        html,
    });
});
