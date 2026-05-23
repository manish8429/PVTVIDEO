import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key, Copy, Trash2, ToggleLeft, ToggleRight,
  ExternalLink, ChevronLeft, Sparkles, Link2, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import Navbar from '../components/layout/Navbar'

interface Video {
  _id: string; title: string; description: string; cloudinaryUrl: string; thumbnail: string; createdAt: string; tags: string[]
}
interface ApiKey {
  _id: string; token: string; label: string; maxUsage: number; usageCount: number; isActive: boolean; createdAt: string; usageLog: { accessedAt: string; ip: string }[]
}

// Build share URL from token and videoId
const buildShareUrl = (videoId: string, token: string) =>
  `${window.location.origin}/watch/${videoId}?token=${token}`

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [video, setVideo] = useState<Video | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showGenForm, setShowGenForm] = useState(false)
  const [genForm, setGenForm] = useState({ label: '', maxUsage: 1, expiresInDays: '', singleUse: true })

  useEffect(() => { fetchData() }, [id])

  const fetchData = async () => {
    try {
      const [vidRes, keyRes] = await Promise.all([
        api.get(`/videos/${id}`),
        api.get(`/apikeys/video/${id}`),
      ])
      setVideo(vidRes.data.video)
      setApiKeys(keyRes.data.apiKeys)
    } catch {
      toast.error('Video not found')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    try {
      const { data } = await api.post('/apikeys/generate', {
        videoId: id,
        maxUsage: genForm.singleUse ? 1 : genForm.maxUsage,
        label: genForm.label,
        expiresInDays: genForm.expiresInDays || undefined,
      })
      setApiKeys((prev) => [data.apiKey, ...prev])
      setShowGenForm(false)
      setGenForm({ label: '', maxUsage: 1, expiresInDays: '', singleUse: true })

      // Auto-copy share URL on generate
      const shareUrl = buildShareUrl(id!, data.apiKey.token)
      navigator.clipboard.writeText(shareUrl)
      toast.success('Token generated! Share URL copied to clipboard 📋')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate token')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    toast.success('Token copied!')
  }

  const handleCopyShareUrl = (token: string) => {
    const url = buildShareUrl(id!, token)
    navigator.clipboard.writeText(url)
    toast.success('Share link copied! 🔗')
  }

  const handleToggle = async (keyId: string) => {
    try {
      const { data } = await api.patch(`/apikeys/${keyId}/toggle`)
      setApiKeys((prev) => prev.map((k) => k._id === keyId ? { ...k, isActive: data.isActive } : k))
      toast.success(`Token ${data.isActive ? 'activated' : 'deactivated'}`)
    } catch { toast.error('Failed to toggle token') }
  }

  const handleDelete = async (keyId: string) => {
    if (!confirm('Delete this access token?')) return
    try {
      await api.delete(`/apikeys/${keyId}`)
      setApiKeys((prev) => prev.filter((k) => k._id !== keyId))
      toast.success('Token deleted')
    } catch { toast.error('Failed to delete token') }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 pt-24">
          <div className="skeleton h-8 w-48 mb-4 rounded" />
          <div className="skeleton h-64 w-full rounded-2xl mb-6" />
          <div className="skeleton h-40 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!video) return null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Dashboard
        </button>

        {/* Video Player */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="rounded-2xl overflow-hidden bg-black aspect-video">
            <video controls src={video.cloudinaryUrl} className="video-player" poster={video.thumbnail} />
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{video.title}</h1>
              {video.description && <p className="text-muted-foreground text-sm mt-1">{video.description}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {video.tags?.map((tag) => (
                  <span key={tag} className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(video.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </motion.div>

        {/* Token Manager */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="liquid-glass rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/30">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><Key size={15} /> Access Tokens</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Single-use by default — token auto-expires after being watched once.
              </p>
            </div>
            <motion.button
              onClick={() => setShowGenForm(!showGenForm)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 liquid-glass px-4 py-2 rounded-full text-sm text-foreground"
            >
              <Sparkles size={13} />
              Generate Token
            </motion.button>
          </div>

          {/* Generate Form */}
          <AnimatePresence>
            {showGenForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleGenerate} className="px-6 py-5 border-b border-border/30 bg-secondary/20">
                  {/* Single-use toggle */}
                  <div className="flex items-center gap-3 mb-4 p-3 bg-secondary/30 rounded-xl">
                    <Zap size={15} className="text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Single-use token</p>
                      <p className="text-xs text-muted-foreground">Token expires after 1 view</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGenForm((f) => ({ ...f, singleUse: !f.singleUse, maxUsage: !f.singleUse ? 1 : 5 }))}
                      className={`w-10 h-5 rounded-full transition-colors relative ${genForm.singleUse ? 'bg-foreground' : 'bg-border'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all ${genForm.singleUse ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className={`grid gap-4 mb-4 ${genForm.singleUse ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Label</label>
                      <input
                        type="text"
                        value={genForm.label}
                        onChange={(e) => setGenForm((f) => ({ ...f, label: e.target.value }))}
                        placeholder="e.g. Client A"
                        maxLength={50}
                        className="form-input text-sm py-2"
                      />
                    </div>

                    {!genForm.singleUse && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Max Uses (1–1000)</label>
                        <input
                          type="number"
                          value={genForm.maxUsage}
                          onChange={(e) => setGenForm((f) => ({ ...f, maxUsage: Number(e.target.value) }))}
                          min={1}
                          max={1000}
                          className="form-input text-sm py-2"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Expires in (days, optional)</label>
                      <input
                        type="number"
                        value={genForm.expiresInDays}
                        onChange={(e) => setGenForm((f) => ({ ...f, expiresInDays: e.target.value }))}
                        min={1}
                        placeholder="Never"
                        className="form-input text-sm py-2"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      type="submit"
                      disabled={generating}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="bg-foreground text-background px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      {generating ? 'Generating...' : 'Generate & Copy Link'}
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => setShowGenForm(false)}
                      className="text-sm text-muted-foreground hover:text-foreground px-3"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Keys List */}
          {apiKeys.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-muted-foreground text-sm">No access tokens yet. Generate one to share this video.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {apiKeys.map((key) => {
                const shareUrl = buildShareUrl(id!, key.token)
                const isExhausted = key.usageCount >= key.maxUsage

                return (
                  <motion.div
                    key={key._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-6 py-4"
                  >
                    {/* Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{key.label || 'Access Token'}</span>
                          {key.maxUsage === 1 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground flex items-center gap-1">
                              <Zap size={9} /> Single-use
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isExhausted
                              ? 'bg-red-500/10 text-red-400'
                              : key.isActive
                              ? 'bg-foreground/10 text-foreground'
                              : 'bg-secondary text-muted-foreground'
                          }`}>
                            {isExhausted ? 'Exhausted' : key.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <code className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded">
                          {key.token.slice(0, 24)}•••
                        </code>

                        {/* Usage bar */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{key.usageCount} / {key.maxUsage} {key.maxUsage === 1 ? 'view' : 'views'}</span>
                            <span>{Math.min(100, Math.round((key.usageCount / key.maxUsage) * 100))}%</span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className={`progress-bar-fill ${isExhausted ? 'bg-red-400/60' : ''}`}
                              style={{ width: `${Math.min(100, (key.usageCount / key.maxUsage) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1">
                          Created {new Date(key.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleCopyToken(key.token)}
                          title="Copy token"
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleCopyShareUrl(key.token)}
                          title="Copy share link"
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Link2 size={13} />
                        </button>
                        <button
                          onClick={() => handleToggle(key._id)}
                          title={key.isActive ? 'Deactivate' : 'Activate'}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {key.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(key._id)}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Share URL bar */}
                    <div className="mt-3 flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2">
                      <ExternalLink size={11} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground flex-1 font-mono truncate">{shareUrl}</span>
                      <button
                        onClick={() => handleCopyShareUrl(key.token)}
                        className="text-xs text-foreground/70 hover:text-foreground transition-colors whitespace-nowrap font-medium"
                      >
                        Copy link
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
