import { useState, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Video, X, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import Navbar from '../components/layout/Navbar'

export default function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', tags: '' })
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploaded, setUploaded] = useState(false)
  const [uploadedVideoId, setUploadedVideoId] = useState('')

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type.startsWith('video/')) {
      setFile(dropped)
    } else {
      toast.error('Only video files are supported')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { toast.error('Please select a video file'); return }
    if (!form.title.trim()) { toast.error('Please enter a title'); return }
    if (file.size > 500 * 1024 * 1024) { toast.error('File size cannot exceed 500MB'); return }

    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('video', file)
    formData.append('title', form.title.trim())
    formData.append('description', form.description.trim())
    formData.append('tags', form.tags)

    try {
      const { data } = await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / (e.total ?? 1))
          setProgress(pct)
        },
      })

      if (data.success) {
        setUploaded(true)
        setUploadedVideoId(data.video._id)
        toast.success('Video uploaded successfully!')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (uploaded) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-lg mx-auto px-6 pt-32 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-foreground" />
            </div>
            <h1 className="text-3xl font-semibold">Video Uploaded!</h1>
            <p className="text-muted-foreground">
              Your video is live. Now generate access tokens to share it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={`/videos/${uploadedVideoId}`}
                className="inline-flex items-center justify-center gap-2 bg-foreground text-background px-6 py-3 rounded-full font-semibold text-sm"
              >
                Manage Tokens
              </Link>
              <Link
                to="/upload"
                onClick={() => { setUploaded(false); setFile(null); setForm({ title: '', description: '', tags: '' }) }}
                className="inline-flex items-center justify-center gap-2 liquid-glass px-6 py-3 rounded-full text-sm text-foreground"
              >
                Upload Another
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-xs tracking-[3px] uppercase text-muted-foreground mb-2">Upload</p>
          <h1 className="text-3xl font-semibold tracking-tight">Upload Video</h1>
          <p className="text-muted-foreground text-sm mt-1">MP4, MOV, AVI, MKV, WebM — max 500 MB</p>
        </motion.div>

        <form onSubmit={handleUpload} className="space-y-6">
          {/* Drop Zone */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
              dragOver
                ? 'border-foreground bg-secondary/30'
                : file
                ? 'border-border/50 cursor-default'
                : 'border-border/40 hover:border-border'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <Video size={20} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                    <Upload size={24} className="text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Drop video here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">MP4 • MOV • AVI • MKV • WebM</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Form Fields */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="liquid-glass rounded-2xl p-6 space-y-5"
          >
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="My private video"
                maxLength={100}
                className="form-input"
              />
              <div className="text-right text-xs text-muted-foreground">{form.title.length}/100</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description..."
                rows={3}
                maxLength={500}
                className="form-input resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Tags (comma-separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="tech, demo, private"
                className="form-input"
              />
            </div>
          </motion.div>

          {/* Upload Progress */}
          <AnimatePresence>
            {uploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading to Cloudinary...</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-bar-fill"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'linear' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={!file || uploading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-foreground text-background py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Uploading {progress}%...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Upload size={16} />
                Upload Video
              </span>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  )
}
