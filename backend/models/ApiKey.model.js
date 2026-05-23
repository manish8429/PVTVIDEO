import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const usageLogSchema = new mongoose.Schema(
  {
    accessedAt: { type: Date, default: Date.now },
    ip: String,
    userAgent: String,
  },
  { _id: false }
);

const apiKeySchema = new mongoose.Schema(
  {
    token: {
      type: String,
      unique: true,
      default: () => `pvk_${uuidv4().replace(/-/g, '')}`,
      index: true,
    },
    label: {
      type: String,
      default: 'Access Token',
      maxlength: 50,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    maxUsage: {
      type: Number,
      required: true,
      min: [1, 'Max usage must be at least 1'],
      max: [1000, 'Max usage cannot exceed 1000'],
      default: 5,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    usageLog: [usageLogSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null, // null = never expires
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Virtual: remaining uses ────────────────────────────────────────────────
apiKeySchema.virtual('remaining').get(function () {
  return Math.max(0, this.maxUsage - this.usageCount);
});

// ── Virtual: usage percentage ─────────────────────────────────────────────
apiKeySchema.virtual('usagePercentage').get(function () {
  return Math.round((this.usageCount / this.maxUsage) * 100);
});

apiKeySchema.set('toJSON', { virtuals: true });
apiKeySchema.set('toObject', { virtuals: true });

export default mongoose.model('ApiKey', apiKeySchema);
