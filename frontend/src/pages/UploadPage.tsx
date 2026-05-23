import { useState, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Video, X, CheckCircle2, AlertCircle, Wifi } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import Navbar from '../components/layout/Navbar'

const CHUNK_SIZE = 20 * 1024 * 1024 // 20MB per chunk
const MAX_RETRIES = 3

async function uploadChunk(
  cloudName: string, fd: FormData, uploadId: string,
  start: number, end: number, total: number,
  onProgress: (pct: number) => void, attempt = 0
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.timeout = 10 * 60 * 1000
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)) }
        catch { reject(new Error('Invalid response from Cloudinary')) }
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          reject(new Error(err.error?.message || `Cloudinary error ${xhr.status}`))
        } catch { reject(new Error(`Upload failed (HTTP ${xhr.status})`)) }
      }
    }
    xhr.onerror = async () => {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        uploadChunk(cloudName, fd, uploadId, start, end, total, onProgress, attempt + 1)
          .then(resolve).catch(reject)
      } else {
        reject(new Error(`Network error after ${MAX_RETRIES} retries. Check your connection.`))
      }
    }
    xhr.ontimeout = () => reject(new Error('Chunk upload timed out (10 min)'))
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`)
    xhr.setRequestHeader('X-Unique-Upload-Id', uploadId)
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end}/${total}`)
    xhr.send(fd)
  })
}

async function uploadToCloudinary(
  file: File,
  sigData: { cloud_name: string; api_key: string; timestamp: number; signature: string; folder: string; public_id: string },
  onProgress: (pct: number) => void,
  onChunk: (current: number, total: number) => void
): Promise<{ secure_url: string; public_id: string; bytes: number; format: string }> {
  if (!sigData.cloud_name) throw new Error('Cloudinary cloud_name missing — check Render env vars')

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const uploadId = `pvt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  let result: any = null

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size) - 1
    const chunk = file.slice(start, end + 1)

    const fd = new FormData()
    fd.append('file', chunk, file.name)
    fd.append('api_key', sigData.api_key)
    fd.append('timestamp', String(sigData.timestamp))
    fd.append('signature', sigData.signature)
    fd.append('folder', sigData.folder)
    fd.append('public_id', sigData.public_id)

    onChunk(i + 1, totalChunks)

    result = await uploadChunk(
      sigData.cloud_name, fd, uploadId, start, end, file.size,
      (chunkPct) => {
        const overall = ((i + chunkPct / 100) / totalChunks) * 95
        onProgress(Math.round(overall))
      }
    )
  }
  return result
}

export default function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', tags: '' })
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [chunk, setChunk] = useState({ current: 0, total: 0 })
  const [error, setError] = useState('')
  const [uploaded, setUploaded] = useState(false)
  const [uploadedVideoId, setUploadedVideoId] = useState('')

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f?.type.startsWith('video/')) setFile(f)
    else toast.error('Only video files are supported')
  }, [])

  const formatBytes = (b: number) => b < 1024 * 1024
    ? `${(b / 1024).toFixed(1)} KB`
    : `${(b / (1024 * 1024)).toFixed(1)} MB`

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return toast.error('Select a video file')
    if (!form.title.trim()) return toast.error('Enter a title')

    setUploading(true); setProgress(0); setError(''); setStatus('Getting upload signature...')

    try {
      // Step 1: Get Cloudinary signature
      const { data: sigData } = await api.get('/videos/upload-signature')
      if (!sigData.success) throw new Error('Failed to get upload signature')

      // Step 2: Upload directly to Cloudinary in chunks
      setStatus('Uploading to Cloudinary...')
      const result = await uploadToCloudinary(file, sigData, setProgress, (cur, tot) => {
        setChunk({ current: cur, total: tot })
        setStatus(tot > 1 ? `Uploading chunk ${cur} of ${tot}...` : 'Uploading to Cloudinary...')
      })

      // Step 3: Save to DB
      setStatus('Saving video...'); setProgress(98)
      const { data } = await api.post('/videos/save', {
        title: form.title.trim(),
        description: form.description.trim(),
        tags: form.tags,
        cloudinaryUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        size: result.bytes,
        format: result.format,
      })

      if (data.success) {
        setProgress(100); setUploaded(true); setUploadedVideoId(data.video._id)
        toast.success('Video uploaded!')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Upload failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setUploading(false); setStatus('')
    }
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (uploaded) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="max-w-lg mx-auto px-4 pt-32 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6">
          <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-foreground" />
          </div>
          <h1 className="text-3xl font-semibold">Video Uploaded!</h1>
          <p className="text-muted-foreground">Now generate access tokens to share it.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/videos/${uploadedVideoId}`}
              className="inline-flex items-center justify-center gap-2 bg-foreground text-background px-6 py-3 rounded-full font-semibold text-sm">
              Manage Tokens
            </Link>
            <button onClick={() => { setUploaded(false); setFile(null); setForm({ title: '', description: '', tags: '' }) }}
              className="inline-flex items-center justify-center gap-2 liquid-glass px-6 py-3 rounded-full text-sm text-foreground">
              Upload Another
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-20 md:pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs tracking-[3px] uppercase text-muted-foreground mb-2">Upload</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Upload Video</h1>
          <p className="text-muted-foreground text-sm mt-1">MP4, MOV, AVI, MKV, WebM · Chunked upload · Auto retry on error</p>
        </motion.div>

        <form onSubmit={handleUpload} className="space-y-6">
          {/* Drop Zone */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
              dragOver ? 'border-foreground bg-secondary/30' : file ? 'border-border/50 cursor-default' : 'border-border/40 hover:border-border'
            }`}
          >
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
            <AnimatePresence mode="wait">
              {file ? (
                <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <Video size={20} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatBytes(file.size)}</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <X size={16} />
                  </button>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 md:p-12 flex flex-col items-center gap-4">
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
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="liquid-glass rounded-2xl p-5 md:p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="My private video" maxLength={100} className="form-input" />
              <div className="text-right text-xs text-muted-foreground">{form.title.length}/100</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Description</label>
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description..." rows={3} maxLength={500} className="form-input resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Tags (comma-separated)</label>
              <input type="text" value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="tech, demo, private" className="form-input" />
            </div>
          </motion.div>

          {/* Progress */}
          <AnimatePresence>
            {uploading && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="liquid-glass rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Wifi size={14} className="text-muted-foreground animate-pulse" />
                  <span className="text-muted-foreground flex-1 truncate">{status}</span>
                  <span className="font-mono font-medium text-xs">{progress}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full bg-foreground rounded-full" animate={{ width: `${progress}%` }} transition={{ ease: 'linear' }} />
                </div>
                {chunk.total > 1 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Chunk {chunk.current} of {chunk.total} · Auto-retry on error</span>
                    <span>{Math.round((chunk.current - 1) / chunk.total * 100)}% done</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && !uploading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-400 font-medium">Upload failed</p>
                  <p className="text-xs text-red-400/70 mt-1">{error}</p>
                  <p className="text-xs text-muted-foreground mt-2">Check: Render env vars (CLOUDINARY_*), internet connection, then retry.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button type="submit" disabled={!file || uploading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full bg-foreground text-background py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                {progress}% — {status || 'Uploading...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2"><Upload size={16} /> Upload Video</span>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  )
}
