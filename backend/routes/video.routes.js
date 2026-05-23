import express from 'express';
import Video from '../models/Video.model.js';
import ApiKey from '../models/ApiKey.model.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadVideo, deleteFromCloudinary, cloudinary } from '../config/cloudinary.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Upload limit reached. Max 10 uploads per hour.' },
});

// ── GET /api/videos/public — public listing (no auth, no stream URL) ────────────
// Anyone can see the list but canNOT play without a token
router.get('/public', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      Video.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploader', 'name avatar')
        // Only select safe fields — cloudinaryUrl intentionally excluded
        .select('title description thumbnail tags uploader createdAt'),
      Video.countDocuments(),
    ]);

    res.json({
      success: true,
      videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Public videos error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/videos/upload ───────────────────────────────────────────────────
router.post(
  '/upload',
  protect,
  uploadLimiter,
  uploadVideo.single('video'),
  async (req, res) => {
    try {
      // Check upload permission
      if (!req.user.isUploader && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You do not have upload permission. Contact the admin to request access.',
        });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No video file uploaded' });
      }

      const { title, description, tags } = req.body;
      if (!title?.trim()) {
        return res.status(400).json({ success: false, message: 'Video title is required' });
      }

      const video = await Video.create({
        title: title.trim(),
        description: description?.trim() || '',
        cloudinaryUrl: req.file.path,
        cloudinaryPublicId: req.file.filename,
        thumbnail: req.file.path.replace('/upload/', '/upload/so_0,w_640/').replace(/\.[^.]+$/, '.jpg'),
        size: req.file.size || 0,
        format: req.file.mimetype?.split('/')[1] || 'mp4',
        uploader: req.user._id,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });

      await video.populate('uploader', 'name email avatar');

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully!',
        video,
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ success: false, message: err.message || 'Upload failed' });
    }
  }
);

// ── GET /api/videos/upload-signature — generate signed Cloudinary params ─────
// Frontend uses this to upload DIRECTLY to Cloudinary (bypasses Render timeout)
router.get('/upload-signature', protect, (req, res) => {
  try {
    if (!req.user.isUploader && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No upload permission.' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `privetvideosite/videos/${req.user._id}`;
    const public_id = `video_${Date.now()}`;

    // Sign only the params that the client will send to Cloudinary
    const paramsToSign = { folder, public_id, timestamp };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      success: true,
      signature,
      timestamp,
      folder,
      public_id,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (err) {
    console.error('Signature error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate upload signature' });
  }
});

// ── POST /api/videos/save — save metadata after direct Cloudinary upload ──────
router.post('/save', protect, uploadLimiter, async (req, res) => {
  try {
    if (!req.user.isUploader && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No upload permission.' });
    }

    const { title, description, tags, cloudinaryUrl, cloudinaryPublicId, size, format } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Video title is required' });
    }
    if (!cloudinaryUrl || !cloudinaryPublicId) {
      return res.status(400).json({ success: false, message: 'Cloudinary upload data missing' });
    }

    // Generate thumbnail from Cloudinary URL
    const thumbnail = cloudinaryUrl
      .replace('/upload/', '/upload/so_0,w_640/')
      .replace(/\.[^.]+$/, '.jpg');

    const video = await Video.create({
      title: title.trim(),
      description: description?.trim() || '',
      cloudinaryUrl,
      cloudinaryPublicId,
      thumbnail,
      size: size || 0,
      format: format || 'mp4',
      uploader: req.user._id,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });

    await video.populate('uploader', 'name email avatar');

    res.status(201).json({ success: true, message: 'Video uploaded successfully!', video });
  } catch (err) {
    console.error('Save video error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to save video' });
  }
});

// ── GET /api/videos (my videos) ──────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      Video.find({ uploader: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploader', 'name email avatar'),
      Video.countDocuments({ uploader: req.user._id }),
    ]);

    // Attach API key stats for each video
    const videoIds = videos.map((v) => v._id);
    const apiKeyStats = await ApiKey.aggregate([
      { $match: { videoId: { $in: videoIds } } },
      {
        $group: {
          _id: '$videoId',
          totalKeys: { $sum: 1 },
          totalUsage: { $sum: '$usageCount' },
          activeKeys: { $sum: { $cond: ['$isActive', 1, 0] } },
        },
      },
    ]);

    const statsMap = {};
    apiKeyStats.forEach((s) => {
      statsMap[s._id.toString()] = s;
    });

    const enrichedVideos = videos.map((v) => ({
      ...v.toObject(),
      apiStats: statsMap[v._id.toString()] || { totalKeys: 0, totalUsage: 0, activeKeys: 0 },
    }));

    res.json({
      success: true,
      videos: enrichedVideos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get videos error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/videos/:id ───────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      uploader: req.user._id,
    }).populate('uploader', 'name email avatar');

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const apiKeys = await ApiKey.find({ videoId: video._id, createdBy: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, video, apiKeys });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PATCH /api/videos/:id ─────────────────────────────────────────────────────
router.patch('/:id', protect, async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    const video = await Video.findOneAndUpdate(
      { _id: req.params.id, uploader: req.user._id },
      {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(tags && { tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }),
      },
      { new: true, runValidators: true }
    );

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    res.json({ success: true, message: 'Video updated', video });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/videos/:id ────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const video = await Video.findOne({ _id: req.params.id, uploader: req.user._id });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(video.cloudinaryPublicId);

    // Delete all API keys for this video
    await ApiKey.deleteMany({ videoId: video._id });

    // Delete video document
    await video.deleteOne();

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (err) {
    console.error('Delete video error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/videos/dashboard/stats ──────────────────────────────────────────
router.get('/dashboard/stats', protect, async (req, res) => {
  try {
    const [totalVideos, totalApiKeys, usageAgg] = await Promise.all([
      Video.countDocuments({ uploader: req.user._id }),
      ApiKey.countDocuments({ createdBy: req.user._id }),
      ApiKey.aggregate([
        { $match: { createdBy: req.user._id } },
        {
          $group: {
            _id: null,
            totalAccesses: { $sum: '$usageCount' },
            activeTokens: { $sum: { $cond: ['$isActive', 1, 0] } },
          },
        },
      ]),
    ]);

    // Per-video usage breakdown
    const videoUsage = await ApiKey.aggregate([
      { $match: { createdBy: req.user._id } },
      {
        $group: {
          _id: '$videoId',
          accessCount: { $sum: '$usageCount' },
          tokenCount: { $sum: 1 },
        },
      },
      { $sort: { accessCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'videos',
          localField: '_id',
          foreignField: '_id',
          as: 'video',
        },
      },
      { $unwind: '$video' },
      {
        $project: {
          videoTitle: '$video.title',
          thumbnail: '$video.thumbnail',
          accessCount: 1,
          tokenCount: 1,
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        totalVideos,
        totalApiKeys,
        totalAccesses: usageAgg[0]?.totalAccesses || 0,
        activeTokens: usageAgg[0]?.activeTokens || 0,
        topVideos: videoUsage,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
