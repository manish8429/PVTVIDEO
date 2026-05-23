import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    cloudinaryUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    duration: {
      type: Number, // seconds
      default: 0,
    },
    size: {
      type: Number, // bytes
      default: 0,
    },
    format: {
      type: String,
      default: '',
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      default: false, // private by default — only via token
    },
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: API keys for this video ─────────────────────────────────────────
videoSchema.virtual('apiKeys', {
  ref: 'ApiKey',
  localField: '_id',
  foreignField: 'videoId',
});

// ── Index for fast uploader queries ──────────────────────────────────────────
videoSchema.index({ uploader: 1, createdAt: -1 });

export default mongoose.model('Video', videoSchema);
