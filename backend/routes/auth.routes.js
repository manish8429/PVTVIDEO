import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.model.js';
import { generateOTP, sendOTPEmail } from '../utils/email.js';
import { setAuthCookie, clearAuthCookie, protect } from '../middleware/auth.middleware.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Helper: validate Gmail ────────────────────────────────────────────────────
const isGmail = (email) => /^[^\s@]+@gmail\.com$/i.test(email?.trim());

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }
    if (!isGmail(email)) {
      return res.status(400).json({ success: false, message: 'Only @gmail.com email addresses are allowed' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.isVerified) {
        return res.status(409).json({ success: false, message: 'Email already registered. Please log in.' });
      }
      // Re-send OTP for unverified account
      const otp = generateOTP();
      existing.otp = { code: otp, expiresAt: new Date(Date.now() + 30 * 60 * 1000), attempts: 0 };
      await existing.save({ validateBeforeSave: false });
      await sendOTPEmail(email, otp, 'verify');
      return res.status(200).json({ success: true, message: 'OTP re-sent. Please verify your email.', email });
    }

    const otp = generateOTP();
    const isAdminEmail = process.env.ADMIN_EMAIL && email.toLowerCase().trim() === process.env.ADMIN_EMAIL.toLowerCase();
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      otp: { code: otp, expiresAt: new Date(Date.now() + 30 * 60 * 1000), attempts: 0 },
      role: isAdminEmail ? 'admin' : 'user',
      isUploader: isAdminEmail ? true : false, // admin can always upload
    });
    await user.save();
    await sendOTPEmail(email, otp, 'verify');

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your Gmail for the OTP.',
      email: user.email,
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.otp.attempts >= 5) {
      return res.status(429).json({ success: false, message: 'Too many OTP attempts. Please register again.' });
    }

    if (!user.otp.code || user.otp.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP expired. Click Resend OTP to get a new one.' });
    }

    if (user.otp.code !== otp.trim()) {
      user.otp.attempts += 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - user.otp.attempts} attempts remaining.`,
      });
    }

    // OTP correct
    user.isVerified = true;
    user.otp = { code: null, expiresAt: null, attempts: 0 };
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = setAuthCookie(res, user._id);

    res.json({
      success: true,
      message: 'Email verified successfully!',
      user: user.toSafeObject(),
      token,
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!isGmail(email)) {
      return res.status(400).json({ success: false, message: 'Only @gmail.com emails are allowed' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account already verified' });
    }

    const otp = generateOTP();
    user.otp = { code: otp, expiresAt: new Date(Date.now() + 30 * 60 * 1000), attempts: 0 };
    await user.save({ validateBeforeSave: false });
    await sendOTPEmail(email, otp, 'verify');

    res.json({ success: true, message: 'New OTP sent to your Gmail.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (!isGmail(email)) {
      return res.status(400).json({ success: false, message: 'Only @gmail.com email addresses are allowed' });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +loginAttempts +lockUntil');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check account lock
    if (user.isLocked()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minute(s).`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // lock 30 min
        user.loginAttempts = 0;
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      // Re-send OTP
      const otp = generateOTP();
      user.otp = { code: otp, expiresAt: new Date(Date.now() + 30 * 60 * 1000), attempts: 0 };
      await user.save({ validateBeforeSave: false });
      await sendOTPEmail(user.email, otp, 'verify');
      return res.status(403).json({
        success: false,
        message: 'Email not verified. A new OTP has been sent to your Gmail.',
        needsVerification: true,
        email: user.email,
      });
    }

    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = setAuthCookie(res, user._id);

    res.json({
      success: true,
      message: 'Login successful!',
      user: user.toSafeObject(),
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/auth/google ────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    // Accept both field names: 'token' (from GoogleButton) or 'idToken' (legacy)
    const idToken = req.body.token || req.body.idToken;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google ID token required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    let { sub: googleId, email, name, picture } = payload;

    // Upgrade Google profile picture to higher resolution (s96 → s400)
    if (picture) {
      picture = picture.replace(/=s\d+-c$/, '=s400-c');
    }

    if (!isGmail(email)) {
      return res.status(400).json({ success: false, message: 'Only @gmail.com accounts are allowed' });
    }

    const isAdminEmail = process.env.ADMIN_EMAIL &&
      email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (user) {
      user.googleId = googleId;
      user.isVerified = true;
      user.lastLogin = new Date();
      if (picture) user.avatar = picture;  // Always update Google profile picture
      // Ensure admin retains role on re-login
      if (isAdminEmail && user.role !== 'admin') {
        user.role = 'admin';
        user.isUploader = true;
      }
      await user.save({ validateBeforeSave: false });
    } else {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        avatar: picture || '',
        isVerified: true,
        lastLogin: new Date(),
        role: isAdminEmail ? 'admin' : 'user',
        isUploader: isAdminEmail ? true : false,
      });
    }

    const token = setAuthCookie(res, user._id);

    res.json({
      success: true,
      message: 'Google login successful!',
      user: user.toSafeObject(),
      token,
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ success: false, message: 'Invalid Google token' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

export default router;
