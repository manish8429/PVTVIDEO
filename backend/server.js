import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import crypto from 'crypto';
import https from 'https';
import http from 'http';

import authRoutes from './routes/auth.routes.js';
import videoRoutes from './routes/video.routes.js';
import apiKeyRoutes from './routes/apikey.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';

dotenv.config();

const app = express();

// ── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-access-token', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// ── Global Rate Limiter ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
  skip: () => process.env.NODE_ENV !== 'production',
});

app.use(globalLimiter);

// ── Health check (for UptimeRobot / keepalive ping) ─────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/apikeys', apiKeyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// ── Stream Signature Helpers ─────────────────────────────────────────────────
const STREAM_SECRET = process.env.JWT_SECRET || 'stream-secret';
const STREAM_TTL = 2 * 60 * 60; // 2 hours in seconds

function generateStreamSig(videoId) {
  const exp = Math.floor(Date.now() / 1000) + STREAM_TTL;
  const sig = crypto
    .createHmac('sha256', STREAM_SECRET)
    .update(`${videoId}:${exp}`)
    .digest('hex');
  return { sig, exp };
}

function verifyStreamSig(videoId, sig, exp) {
  if (!sig || !exp) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now > parseInt(exp)) return false;
  const expected = crypto
    .createHmac('sha256', STREAM_SECRET)
    .update(`${videoId}:${exp}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// ── Public video access via API token ───────────────────────────────────────
app.get('/api/watch/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const token = req.headers['x-access-token'] || req.query.token;

    const { default: ApiKey } = await import('./models/ApiKey.model.js');
    const { default: Video } = await import('./models/Video.model.js');

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    // Find token — check conditions separately for clear error messages
    const apiKey = await ApiKey.findOne({ token, videoId });

    if (!apiKey) {
      console.log('[Watch] Token not found:', { token: token?.slice(0, 20), videoId });
      return res.status(401).json({ success: false, message: 'Invalid access token. Check the link and try again.' });
    }

    if (!apiKey.isActive) {
      return res.status(403).json({ success: false, message: 'This token has been deactivated or already used up.' });
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      apiKey.isActive = false;
      await apiKey.save();
      return res.status(403).json({ success: false, message: 'This access token has expired.' });
    }

    if (apiKey.usageCount >= apiKey.maxUsage) {
      apiKey.isActive = false;
      await apiKey.save();
      return res.status(403).json({
        success: false,
        message: `Token usage limit reached (${apiKey.maxUsage} view${apiKey.maxUsage !== 1 ? 's' : ''}).`,
      });
    }

    const video = await Video.findById(videoId).populate('uploader', 'name email');
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Increment usage
    apiKey.usageCount += 1;
    apiKey.lastUsedAt = new Date();
    apiKey.usageLog.push({ accessedAt: new Date(), ip: req.ip });

    // Auto-expire after last use
    if (apiKey.usageCount >= apiKey.maxUsage) {
      apiKey.isActive = false;
    }
    await apiKey.save();

    const remaining = Math.max(0, apiKey.maxUsage - apiKey.usageCount);

    // ── Generate short-lived stream signature ──────────────────────────────
    // The actual Cloudinary URL is NEVER sent to the client.
    // Instead we return a signed backend proxy URL.
    const { sig, exp } = generateStreamSig(videoId);
    const streamUrl = `/api/stream/${videoId}?sig=${sig}&exp=${exp}`;

    res.json({
      success: true,
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        // cloudinaryUrl intentionally omitted — use streamUrl instead
        streamUrl,
        thumbnail: video.thumbnail,
        uploader: video.uploader,
        createdAt: video.createdAt,
      },
      tokenInfo: {
        usageCount: apiKey.usageCount,
        maxUsage: apiKey.maxUsage,
        remaining,
        isLastUse: remaining === 0,
        watcherLabel: apiKey.label,
      },
    });
  } catch (err) {
    console.error('Watch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Secure Video Stream Proxy ────────────────────────────────────────────────
// Streams video from Cloudinary through the backend — URL never exposed to browser.
app.get('/api/stream/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { sig, exp } = req.query;

    // Verify HMAC signature
    if (!verifyStreamSig(videoId, sig, exp)) {
      return res.status(403).json({ success: false, message: 'Invalid or expired stream token' });
    }

    const { default: Video } = await import('./models/Video.model.js');
    const video = await Video.findById(videoId).select('cloudinaryUrl');
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const cloudinaryUrl = video.cloudinaryUrl;
    const parsedUrl = new URL(cloudinaryUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    // Forward Range header for video seeking support
    const rangeHeader = req.headers.range;
    const requestHeaders = {};
    if (rangeHeader) requestHeaders['Range'] = rangeHeader;

    const proxyReq = client.get(
      {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: requestHeaders,
      },
      (proxyRes) => {
        // Protective response headers — prevent download, caching, embedding
        const responseHeaders = {
          'Content-Type': proxyRes.headers['content-type'] || 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'Pragma': 'no-cache',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'Content-Disposition': 'inline',
          // Prevent CDN/proxy caching
          'Surrogate-Control': 'no-store',
        };

        if (proxyRes.headers['content-length']) {
          responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
        }
        if (proxyRes.headers['content-range']) {
          responseHeaders['Content-Range'] = proxyRes.headers['content-range'];
        }

        res.writeHead(proxyRes.statusCode, responseHeaders);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      console.error('Stream proxy error:', err.message);
      if (!res.headersSent) res.status(502).end();
    });

    // Clean up on client disconnect
    req.on('close', () => proxyReq.destroy());
  } catch (err) {
    console.error('Stream route error:', err);
    if (!res.headersSent) res.status(500).end();
  }
});

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date() });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Connect DB & Start ────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });
