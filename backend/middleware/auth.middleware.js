import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

const isProd = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,                  // HTTPS only in production
  sameSite: isProd ? 'none' : 'lax', // cross-origin in prod (Vercel ↔ Render)
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
};

/**
 * Generate JWT token
 */
export const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Set auth cookie and return token
 */
export const setAuthCookie = (res, userId) => {
  const token = generateToken(userId);
  res.cookie('auth_token', token, COOKIE_OPTIONS);
  return token;
};

/**
 * Clear auth cookie
 */
export const clearAuthCookie = (res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

/**
 * Middleware: protect routes (requires valid JWT cookie or Authorization header)
 */
export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.auth_token;

    // Also support Bearer token in Authorization header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -otp -loginAttempts -lockUntil');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found. Please log in again.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please verify your email first.',
        needsVerification: true,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
  }
};

/**
 * Middleware: require email verification (less strict — allows unverified for certain routes)
 */
export const requireVerified = (req, res, next) => {
  if (!req.user?.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email to access this feature.',
    });
  }
  next();
};
