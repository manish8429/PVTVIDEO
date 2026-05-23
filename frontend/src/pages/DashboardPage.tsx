import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload, Play, Key, BarChart2, Trash2, Plus, ExternalLink, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import Navbar from '../components/layout/Navbar'
import { VideoCardSkeleton, StatCardSkeleton } from '../components/ui/Skeleton'

interface Video {
  _id: string
  title: string
  description: string
  cloudinaryUrl: string
  thumbnail: string
  createdAt: string
  apiStats: { totalKeys: number; totalUsage: number; activeKeys: number }
}

interface Stats {
  totalVideos: number
  totalApiKeys: number
  totalAccesses: number
  activeTokens: number
  topVideos: { videoTitle: string; thumbnail: string; accessCount: number; tokenCount: number }[]
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' },
})

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [videos, setVideos] = useState<Video[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    fetchVideos()
    fetchStats()
  }, [])

  const fetchVideos = async () => {
    try {
      const { data } = await api.get('/videos')
      setVideos(data.videos)
    } catch {
      toast.error('Failed to load videos')
    } finally {
      setLoadingVideos(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/videos/dashboard/stats')
      setStats(data.stats)
    } catch {}
    finally {
      setLoadingStats(false)
    }
  }

  const [sharingId, setSharingId] = useState<string | null>(null)

  const handleQuickShare = async (videoId: string) => {
    setSharingId(videoId)
    try {
      const { data } = await api.post('/apikeys/generate', {
        videoId,
        maxUsage: 1,
        label: 'Quick Share',
      })
      const shareUrl = `${window.location.origin}/watch/${videoId}?token=${data.apiKey.token}`
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Single-use link copied! 🔗 Send it to your recipient.')
      fetchVideos() // refresh token count
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate share link')
    } finally {
      setSharingId(null)
    }
  }

  const handleDelete = async (videoId: string) => {
    if (!confirm('Delete this video? All access tokens will be revoked.')) return
    try {
      await api.delete(`/videos/${videoId}`)
      setVideos((v) => v.filter((vid) => vid._id !== videoId))
      toast.success('Video deleted')
      fetchStats()
    } catch {
      toast.error('Failed to delete video')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-20 md:pt-24 pb-16">
        {/* Header */}
        <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-10">
          <div>
            <p className="text-xs tracking-[3px] uppercase text-muted-foreground mb-2">Dashboard</p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Hello, <em className="font-serif italic">{user?.name?.split(' ')[0]}</em>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">{user?.email}</p>
          </div>
          {(user?.isUploader || user?.role === 'admin') && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-shrink-0">
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 bg-foreground text-background px-4 md:px-5 py-2.5 rounded-full font-semibold text-sm"
              >
                <Upload size={14} />
                <span className="hidden sm:inline">Upload Video</span>
                <span className="sm:hidden">Upload</span>
              </Link>
            </motion.div>
          )}
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
          {loadingStats
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCards(stats).map((card, i) => (
                <motion.div key={card.label} {...fadeUp(i * 0.05)} className="liquid-glass rounded-xl p-3 md:p-5">
                  <div className="flex items-start justify-between mb-2 md:mb-3">
                    <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">{card.label}</span>
                    <div className="text-muted-foreground">{card.icon}</div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold tracking-tight">{card.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>
                </motion.div>
              ))}
        </div>

        {/* Top Videos by Access */}
        {stats?.topVideos && stats.topVideos.length > 0 && (
          <motion.div {...fadeUp(0.2)} className="liquid-glass rounded-2xl p-6 mb-10">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart2 size={16} />
              Most Accessed Videos
            </h2>
            <div className="space-y-3">
              {stats.topVideos.map((v, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground w-5">{i + 1}</div>
                  {v.thumbnail ? (
                    <img src={v.thumbnail} className="w-16 h-9 rounded object-cover bg-secondary" alt={v.videoTitle} />
                  ) : (
                    <div className="w-16 h-9 rounded bg-secondary flex items-center justify-center">
                      <Play size={12} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.videoTitle}</p>
                    <p className="text-xs text-muted-foreground">{v.tokenCount} token(s)</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{v.accessCount}</div>
                    <div className="text-xs text-muted-foreground">accesses</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Videos Grid */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Your Videos</h2>
          <span className="text-sm text-muted-foreground">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
        </div>

        {loadingVideos ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)}
          </div>
        ) : videos.length === 0 ? (
          <motion.div {...fadeUp(0.1)} className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Play size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Upload your first video to get started</p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-2.5 rounded-full font-semibold text-sm"
            >
              <Plus size={14} />
              Upload Video
            </Link>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos.map((video, i) => (
              <motion.div
                key={video._id}
                {...fadeUp(i * 0.05)}
                className="group liquid-glass rounded-2xl overflow-hidden border border-border/20 hover:border-border/60 transition-colors"
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-video bg-secondary cursor-pointer"
                  onClick={() => navigate(`/videos/${video._id}`)}
                >
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play size={32} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 rounded-full bg-foreground/90 flex items-center justify-center">
                      <Play size={18} className="text-background ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3
                    className="font-semibold text-sm truncate cursor-pointer hover:text-muted-foreground transition-colors"
                    onClick={() => navigate(`/videos/${video._id}`)}
                  >
                    {video.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(video.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Key size={11} />
                      {video.apiStats.totalKeys} tokens
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart2 size={11} />
                      {video.apiStats.totalUsage} accesses
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30">
                    <button
                      onClick={() => navigate(`/videos/${video._id}`)}
                      className="flex-1 text-xs flex items-center justify-center gap-1 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Key size={11} />
                      Manage
                    </button>
                    <button
                      onClick={() => handleQuickShare(video._id)}
                      disabled={sharingId === video._id}
                      title="Generate single-use link & copy"
                      className="flex-1 text-xs flex items-center justify-center gap-1 py-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground transition-colors disabled:opacity-50"
                    >
                      {sharingId === video._id ? (
                        <><div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> Copying...</>
                      ) : (
                        <><Share2 size={11} /> Quick Share</>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(video._id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function statCards(stats: Stats | null) {
  return [
    { label: 'Total Videos', value: stats?.totalVideos ?? 0, icon: <Play size={14} />, sub: 'Uploaded' },
    { label: 'Access Tokens', value: stats?.totalApiKeys ?? 0, icon: <Key size={14} />, sub: 'Generated' },
    { label: 'Total Accesses', value: stats?.totalAccesses ?? 0, icon: <BarChart2 size={14} />, sub: 'Via tokens' },
    { label: 'Active Tokens', value: stats?.activeTokens ?? 0, icon: <ExternalLink size={14} />, sub: 'In use' },
  ]
}
