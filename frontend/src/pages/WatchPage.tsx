import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, AlertCircle, Shield, ChevronRight, Eye, Key, Clock, CheckCircle2, Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

interface VideoData {
  _id: string
  title: string
  description: string
  streamUrl: string
  thumbnail: string
  uploader: { name: string; email: string }
  createdAt: string
}
interface TokenInfo {
  usageCount: number
  maxUsage: number
  remaining: number
  isLastUse: boolean
  watcherLabel: string
}

function blockDevToolKeys(e: KeyboardEvent) {
  const blocked =
    (e.ctrlKey && ['s', 'u'].includes(e.key.toLowerCase())) ||
    (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) ||
    e.key === 'F12'
  if (blocked) { e.preventDefault(); e.stopPropagation() }
}

// Inject print-block CSS once at module level
const printStyle = document.createElement('style')
printStyle.textContent = `@media print { body { display: none !important; } }`
document.head.appendChild(printStyle)

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [video, setVideo] = useState<VideoData | null>(null)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [manualToken, setManualToken] = useState('')
  const [activeToken, setActiveToken] = useState(token)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fetchedRef = useRef<string>('')
  const [isWindowFocused, setIsWindowFocused] = useState(true)

  useEffect(() => {
    document.addEventListener('keydown', blockDevToolKeys, true)
    return () => document.removeEventListener('keydown', blockDevToolKeys, true)
  }, [])

  useEffect(() => {
    const prevent = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', prevent)
    return () => document.removeEventListener('contextmenu', prevent)
  }, [])

  // ── PrtScn — clear clipboard, show warning ──────────────────────────────────
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('⚠ Screenshot blocked — PrivetVideo protected content').catch(() => {})
        toast.error('Screenshots are not allowed on protected content.', { duration: 3000 })
      }
    }
    document.addEventListener('keyup', handleKeyUp, true)
    return () => document.removeEventListener('keyup', handleKeyUp, true)
  }, [])

  // ── Window blur — blur video when user opens screenshot/snipping tool ─────────
  useEffect(() => {
    const onFocus = () => setIsWindowFocused(true)
    const onBlur = () => setIsWindowFocused(false)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    if (!activeToken) { setLoading(false); return }
    if (fetchedRef.current === activeToken) return
    fetchedRef.current = activeToken
    fetchVideo(activeToken)
  }, [activeToken, videoId])

  useEffect(() => {
    if (!video?.streamUrl || !videoRef.current) return
    const fullUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${video.streamUrl}`
    videoRef.current.src = fullUrl
  }, [video])

  const fetchVideo = async (tok: string) => {
    setLoading(true); setError('')
    try {
      const { data } = await api.get(`/watch/${videoId}`, { headers: { 'x-access-token': tok } })
      setVideo(data.video); setTokenInfo(data.tokenInfo)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Access denied'); setVideo(null)
    } finally { setLoading(false) }
  }

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualToken.trim()) { fetchedRef.current = ''; setActiveToken(manualToken.trim()) }
  }

  const blockDrag = useCallback((e: React.DragEvent) => e.preventDefault(), [])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col">
      <WatchHeader />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Verifying access...</p>
        </div>
      </div>
    </div>
  )

  // ── No token ───────────────────────────────────────────────────────────────
  if (!activeToken && !video) return (
    <div className="min-h-screen bg-background flex flex-col">
      <WatchHeader />
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Lock size={22} className="text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold">Private Video</h1>
            <p className="text-muted-foreground text-sm mt-1">You need an access token to watch this.</p>
          </div>
          <form onSubmit={handleTokenSubmit} className="space-y-3">
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="pvk_••••••••••••••••"
                className="form-input !pl-9 font-mono text-sm"
                autoFocus
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full bg-foreground text-background py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Shield size={14} /> Access Video
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  )

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="min-h-screen bg-background flex flex-col">
      <WatchHeader />
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={22} className="text-red-400" />
            </div>
            <h1 className="text-xl font-semibold">Access Denied</h1>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{error}</p>
          </div>
          <form onSubmit={handleTokenSubmit} className="space-y-3">
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Try a different token..."
                className="form-input !pl-9 font-mono text-sm"
              />
            </div>
            <button type="submit" className="w-full bg-foreground text-background py-3 rounded-xl font-semibold text-sm">
              Try Again
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )

  // ── Video Player ───────────────────────────────────────────────────────────
  const usagePercent = tokenInfo ? Math.min(100, Math.round((tokenInfo.usageCount / tokenInfo.maxUsage) * 100)) : 0

  return (
    <div
      className="min-h-screen bg-background flex flex-col select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={blockDrag}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
    >
      <WatchHeader />

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-7xl mx-auto w-full px-4 py-6">

        {/* ── Video Column ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Video Container */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl"
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Watermark */}
            {video && tokenInfo && <WatermarkOverlay label={tokenInfo.watcherLabel || 'Viewer'} />}

            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              controlsList="nodownload nofullscreen noremoteplayback"
              disablePictureInPicture
              disableRemotePlayback
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-full transition-all duration-300"
              poster={video?.thumbnail}
              style={{
                userSelect: 'none',
                filter: isWindowFocused ? 'none' : 'blur(24px) brightness(0.3)',
              }}
            />

            {/* Blur overlay shown when window loses focus */}
            {!isWindowFocused && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-md">
                <div className="text-center space-y-2">
                  <Shield size={28} className="text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Protected content — click to resume</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Title & Meta */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 pb-4 border-b border-border/30"
          >
            <h1 className="text-xl font-semibold leading-snug">{video?.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>By <span className="text-foreground font-medium">{video?.uploader?.name}</span></span>
              <span>·</span>
              <span>{video?.createdAt ? new Date(video.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
            </div>
            {video?.description && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{video.description}</p>
            )}
          </motion.div>

          {/* Privacy notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-secondary/20 border border-border/20"
          >
            <Shield size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              This video is <strong className="text-foreground">access-protected</strong>. Downloading,
              screen-recording, or sharing this link is prohibited.
            </p>
          </motion.div>
        </div>

        {/* ── Sidebar: Token Info ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:w-72 lg:ml-6 mt-5 lg:mt-0 flex-shrink-0"
        >
          {tokenInfo && (
            <div className="liquid-glass rounded-2xl p-5 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-2">
                <Key size={13} className="text-muted-foreground" />
                <span className="text-sm font-medium">Access Token</span>
              </div>

              {/* Label badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs bg-secondary px-2.5 py-1 rounded-full text-muted-foreground font-mono">
                  {tokenInfo.watcherLabel || 'Access Token'}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  tokenInfo.isLastUse ? 'bg-red-500/10 text-red-400' : 'bg-foreground/10 text-foreground'
                }`}>
                  {tokenInfo.isLastUse ? '⚠ Expired' : '✓ Active'}
                </span>
              </div>

              {/* Usage progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Views used</span>
                  <span className="font-medium text-foreground">{tokenInfo.usageCount} / {tokenInfo.maxUsage}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`h-full rounded-full ${tokenInfo.isLastUse ? 'bg-red-400' : 'bg-foreground'}`}
                  />
                </div>
              </div>

              {/* Remaining */}
              <div className={`flex items-start gap-3 p-3 rounded-xl ${
                tokenInfo.isLastUse ? 'bg-red-500/8 border border-red-500/20' : 'bg-secondary/40'
              }`}>
                {tokenInfo.isLastUse
                  ? <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                  : <CheckCircle2 size={13} className="text-foreground/60 mt-0.5 flex-shrink-0" />
                }
                <p className={`text-xs leading-relaxed ${tokenInfo.isLastUse ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {tokenInfo.isLastUse
                    ? 'This was your last allowed view. Token has been deactivated.'
                    : `${tokenInfo.remaining} view${tokenInfo.remaining !== 1 ? 's' : ''} remaining on this token.`
                  }
                </p>
              </div>

              {/* Divider */}
              <div className="h-px bg-border/30" />

              {/* Token metadata */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Eye size={11} />
                  <span>Session protected · PrivetVideo</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock size={11} />
                  <span>Stream expires in 2 hours</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

// ── Branded Header ────────────────────────────────────────────────────────────
function WatchHeader() {
  return (
    <header className="flex items-center px-6 py-4 border-b border-border/20 bg-background/80 backdrop-blur-sm">
      <Link to="/" className="inline-flex items-center gap-2.5">
        <div className="relative w-7 h-7">
          <div className="absolute inset-0 rounded-full border border-foreground/20" />
          <div className="absolute inset-1 rounded-full border border-foreground/40" />
          <div className="absolute inset-2.5 rounded-full bg-foreground" />
        </div>
        <span className="font-bold text-sm tracking-tight">PrivetVideo</span>
      </Link>
      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <Shield size={11} />
        <span>Secure Viewing</span>
      </div>
    </header>
  )
}

// ── Floating Watermark ────────────────────────────────────────────────────────
function WatermarkOverlay({ label }: { label: string }) {
  const [pos, setPos] = useState({ x: 10, y: 10 })

  useEffect(() => {
    const move = () => setPos({ x: Math.random() * 70 + 5, y: Math.random() * 70 + 5 })
    const interval = setInterval(move, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      transition={{ duration: 2.5, ease: 'easeInOut' }}
      className="absolute z-20 pointer-events-none"
      style={{
        opacity: 0.22,
        fontSize: '12px',
        color: 'white',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        textShadow: '0 1px 8px rgba(0,0,0,1), 0 0 2px rgba(0,0,0,1)',
        userSelect: 'none',
        letterSpacing: '0.02em',
      }}
    >
      🔒 {label} · PrivetVideo
    </motion.div>
  )
}
