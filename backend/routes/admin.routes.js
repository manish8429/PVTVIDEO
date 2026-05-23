import express from 'express';
import User from '../models/User.model.js';
import Video from '../models/Video.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// ── Admin-only guard ─────────────────────────────────────────────────────────
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// ── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', protect, isAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email avatar role isUploader isVerified createdAt lastLogin')
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PATCH /api/admin/users/:id/uploader ─────────────────────────────────────
// Toggle upload permission for a user
router.patch('/users/:id/uploader', protect, isAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot modify your own permissions' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isUploader = !user.isUploader;
    await user.save();

    res.json({
      success: true,
      message: `Upload permission ${user.isUploader ? 'granted' : 'revoked'} for ${user.name}`,
      isUploader: user.isUploader,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PATCH /api/admin/users/:id/role ─────────────────────────────────────────
// Promote/demote admin
router.patch('/users/:id/role', protect, isAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot modify your own role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.role = user.role === 'admin' ? 'user' : 'admin';
    if (user.role === 'admin') user.isUploader = true; // admins can always upload
    await user.save();

    res.json({ success: true, message: `Role set to ${user.role}`, role: user.role });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', protect, isAdmin, async (req, res) => {
  try {
    const [totalUsers, totalVideos, uploaders] = await Promise.all([
      User.countDocuments(),
      Video.countDocuments(),
      User.countDocuments({ isUploader: true }),
    ]);
    res.json({ success: true, stats: { totalUsers, totalVideos, uploaders } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
