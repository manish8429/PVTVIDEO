import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Upload, ShieldCheck, ShieldOff, Crown, ToggleLeft, ToggleRight, Video, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import Navbar from '../components/layout/Navbar'

interface User {
  _id: string
  name: string
  email: string
  avatar: string
  role: string
  isUploader: boolean
  isVerified: boolean
  createdAt: string
  lastLogin?: string
}
interface Stats { totalUsers: number; totalVideos: number; uploaders: number }

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats'),
      ])
      setUsers(usersRes.data.users)
      setStats(statsRes.data.stats)
    } catch {
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const toggleUploader = async (userId: string) => {
    setTogglingId(userId)
    try {
      const { data } = await api.patch(`/admin/users/${userId}/uploader`)
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isUploader: data.isUploader } : u))
      toast.success(data.message)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update permission')
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const fadeUp = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: i * 0.06 },
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-10">
          <p className="text-xs tracking-[3px] uppercase text-muted-foreground mb-2">Admin Panel</p>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <Crown size={24} className="text-muted-foreground" /> User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Control who can upload videos. Public video browsing is open to everyone.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Users', value: stats?.totalUsers ?? '—', icon: <Users size={14} /> },
            { label: 'Total Videos', value: stats?.totalVideos ?? '—', icon: <Video size={14} /> },
            { label: 'Upload Access', value: stats?.uploaders ?? '—', icon: <Upload size={14} /> },
          ].map((card, i) => (
            <motion.div key={card.label} {...fadeUp(i)} className="liquid-glass rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</span>
                <div className="text-muted-foreground">{card.icon}</div>
              </div>
              <div className="text-3xl font-bold tracking-tight">{card.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Users Table */}
        <motion.div {...fadeUp(3)} className="liquid-glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/30">
            <h2 className="font-semibold">Registered Users</h2>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="form-input !pl-8 text-sm py-1.5 w-52"
              />
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground text-sm">No users found.</div>
          ) : (
            <div className="divide-y divide-border/20">
              {filtered.map((user) => (
                <div key={user._id} className="flex items-center gap-4 px-6 py-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {user.avatar
                      ? <img src={user.avatar} className="w-9 h-9 rounded-full object-cover" alt={user.name} />
                      : user.name.charAt(0).toUpperCase()
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{user.name}</span>
                      {user.role === 'admin' && (
                        <span className="text-xs px-1.5 py-0.5 bg-foreground/10 text-foreground rounded-full flex items-center gap-1">
                          <Crown size={9} /> Admin
                        </span>
                      )}
                      {!user.isVerified && (
                        <span className="text-xs px-1.5 py-0.5 bg-secondary text-muted-foreground rounded-full">Unverified</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>

                  {/* Upload permission badge */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      user.isUploader ? 'bg-foreground/10 text-foreground' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {user.isUploader ? <><ShieldCheck size={10} /> Can Upload</> : <><ShieldOff size={10} /> No Upload</>}
                    </span>

                    {/* Toggle button — hide for admin users */}
                    {user.role !== 'admin' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleUploader(user._id)}
                        disabled={togglingId === user._id}
                        title={user.isUploader ? 'Revoke upload access' : 'Grant upload access'}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          user.isUploader
                            ? 'hover:bg-red-500/10 text-muted-foreground hover:text-red-400'
                            : 'hover:bg-foreground/10 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {togglingId === user._id
                          ? <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                          : user.isUploader ? <ToggleRight size={18} /> : <ToggleLeft size={18} />
                        }
                      </motion.button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
