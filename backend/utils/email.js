import nodemailer from 'nodemailer';

const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // App password, not account password
    },
  });

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP email
 */
export const sendOTPEmail = async (to, otp, type = 'verify') => {
  const transporter = createTransporter();

  const subject =
    type === 'verify'
      ? 'Verify your PrivetVideo account'
      : 'PrivetVideo — Password Reset OTP';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #000; color: #fff; margin: 0; padding: 0; }
        .container { max-width: 480px; margin: 40px auto; padding: 40px; background: #0a0a0a; border: 1px solid #222; border-radius: 16px; }
        .logo { font-size: 24px; font-weight: 700; letter-spacing: -1px; margin-bottom: 32px; }
        .otp-box { background: #111; border: 1px solid #333; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .otp { font-size: 40px; font-weight: 700; letter-spacing: 8px; color: #fff; font-family: monospace; }
        .note { color: #666; font-size: 13px; margin-top: 8px; }
        .footer { color: #444; font-size: 12px; margin-top: 32px; border-top: 1px solid #222; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">⬤ PrivetVideo</div>
        <p style="color: #999; font-size: 14px; margin-bottom: 8px;">
          ${type === 'verify' ? 'Welcome! Please verify your email address.' : 'You requested a password reset.'}
        </p>
        <h2 style="font-size: 22px; margin: 0 0 24px;">Your One-Time Password</h2>
        <div class="otp-box">
          <div class="otp">${otp}</div>
          <div class="note">Valid for 30 minutes. Do not share this code.</div>
          <div class="note" style="margin-top:6px;font-size:11px;">📬 Not in inbox? Check your spam/junk folder.</div>
        </div>
        <p style="color: #666; font-size: 13px;">
          If you didn't request this, please ignore this email. Your account is safe.
        </p>
        <div class="footer">
          © 2026 PrivetVideo. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"PrivetVideo" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
