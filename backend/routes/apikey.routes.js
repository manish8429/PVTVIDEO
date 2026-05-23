import express from 'express';
import ApiKey from '../models/ApiKey.model.js';
import Video from '../models/Video.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// ── POST /api/apikeys/generate ────────────────────────────────────────────────
router.post('/generate', protect, async (req, res) => {
  try {
    const { videoId, maxUsage, label, expiresInDays } = req.body;

    if (!videoId) {
      return res.status(400).json({ success: false, message: 'Video ID is required' });
    }

    const parsedMax = parseInt(maxUsage);
    if (isNaN(parsedMax) || parsedMax < 1 || parsedMax > 1000) {
      return res.status(400).json({ success: false, message: 'Max usage must be between 1 and 1000' });
    }

    // Verify user owns the video
    const video = await Video.findOne({ _id: videoId, uploader: req.user._id });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found or unauthorized' });
    }

    // Max 20 active keys per video
    const activeKeyCount = await ApiKey.countDocuments({ videoId, createdBy: req.user._id, isActive: true });
    if (activeKeyCount >= 20) {
      return res.status(400).json({ success: false, message: 'Maximum 20 active tokens per video' });
    }

    const expiresAt = expiresInDays
      ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await ApiKey.create({
      videoId,
      createdBy: req.user._id,
      maxUsage: parsedMax,
      label: label?.trim() || 'Access Token',
      expiresAt,
    });

    // Build shareable URL
    const shareUrl = `${process.env.CLIENT_URL}/watch/${videoId}?token=${apiKey.token}`;

    res.status(201).json({
      success: true,
      message: 'Access token generated!',
      apiKey: {
        ...apiKey.toObject(),
        shareUrl,
      },
    });
  } catch (err) {
    console.error('Generate API key error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/apikeys/video/:videoId ───────────────────────────────────────────
router.get('/video/:videoId', protect, async (req, res) => {
  try {
    // Verify ownership
    const video = await Video.findOne({ _id: req.params.videoId, uploader: req.user._id });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found or unauthorized' });
    }

    const apiKeys = await ApiKey.find({
      videoId: req.params.videoId,
      createdBy: req.user._id,
    }).sort({ createdAt: -1 });

    const enriched = apiKeys.map((k) => ({
      ...k.toObject(),
      shareUrl: `${process.env.CLIENT_URL}/watch/${req.params.videoId}?token=${k.token}`,
    }));

    res.json({ success: true, apiKeys: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/apikeys (all my keys) ────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate('videoId', 'title thumbnail cloudinaryUrl');

    const enriched = apiKeys.map((k) => ({
      ...k.toObject(),
      shareUrl: `${process.env.CLIENT_URL}/watch/${k.videoId?._id}?token=${k.token}`,
    }));

    res.json({ success: true, apiKeys: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/apikeys/:id ───────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    res.json({ success: true, message: 'Token deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PATCH /api/apikeys/:id/toggle ─────────────────────────────────────────────
router.patch('/:id/toggle', protect, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    apiKey.isActive = !apiKey.isActive;
    await apiKey.save();

    res.json({
      success: true,
      message: `Token ${apiKey.isActive ? 'activated' : 'deactivated'}`,
      isActive: apiKey.isActive,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/apikeys/:id/logs ─────────────────────────────────────────────────
router.get('/:id/logs', protect, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    res.json({
      success: true,
      logs: apiKey.usageLog,
      stats: {
        usageCount: apiKey.usageCount,
        maxUsage: apiKey.maxUsage,
        remaining: apiKey.remaining,
        usagePercentage: apiKey.usagePercentage,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
