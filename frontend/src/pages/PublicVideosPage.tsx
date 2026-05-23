import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Lock, Search, Filter } from 'lucide-react'
import api from '../lib/api'
import Navbar from '../components/layout/Navbar'

interface PublicVideo {
  _id: string
  title: string
  description: string
  thumbnail: string
  tags: string[]
  uploader: { name: string; avatar: string }
  createdAt: string
}

export default function PublicVideosPage() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<PublicVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/videos/public')
      .then(({ data }) => setVideos(data.videos))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = videos.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.description?.toLowerCase().includes(search.toLowerCase()) ||
    v.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="text-xs tracking-[3px] uppercase text-muted-foreground mb-2">Library</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">All Videos</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Browse content — <span className="text-foreground font-medium flex items-center gap-1 inline-flex"><Lock size={11} /> Access token required to watch</span>
              </p>
            </div>
            {/* Search */}
            <div className="relative w-64">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search videos..."
                className="form-input !pl-9 text-sm"
              />
            </div>
          </div>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="liquid-glass rounded-2xl overflow-hidden">
                <div className="skeleton aspect-video" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-4 rounded w-3/4" />
                  <div className="skeleton h-3 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Play size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No videos found</h3>
            <p className="text-muted-foreground text-sm">
              {search ? 'Try a different search term' : 'No videos have been uploaded yet'}
            </p>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((video, i) => (
              <motion.div
                key={video._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group liquid-glass rounded-2xl overflow-hidden border border-border/20 hover:border-border/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/watch/${video._id}`)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-secondary">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play size={28} className="text-muted-foreground" />
                    </div>
                  )}

                  {/* Hover overlay with lock */}
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-foreground/90 flex items-center justify-center">
                        <Lock size={16} className="text-background" />
                      </div>
                      <span className="text-xs text-white font-medium bg-black/60 px-2 py-0.5 rounded-full">Token required</span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2">{video.title}</h3>
                  {video.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{video.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {video.uploader?.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(video.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {video.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {video.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
