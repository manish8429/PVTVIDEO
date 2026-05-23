import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Upload, LayoutDashboard, Crown, Globe, Menu, X } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [imgError, setImgError] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    setMobileOpen(false)
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const canUpload = user?.isUploader || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'
  const showAvatar = !!(user?.avatar) && !imgError

  const navLinks = [
    { to: '/videos', label: 'Browse', icon: <Globe size={14} />, always: true },
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} />, always: false },
    ...(canUpload ? [{ to: '/upload', label: 'Upload', icon: <Upload size={14} />, always: false }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: <Crown size={14} />, always: false }] : []),
  ].filter(l => l.always || isAuthenticated)

  const isActive = (to: string) => location.pathname === to

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 px-4 md:px-10 py-3 md:py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* ── Logo ─────────────────────────────────────────── */}
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-2.5 group"
            onClick={() => setMobileOpen(false)}
          >
            <div className="relative w-7 h-7 md:w-8 md:h-8">
              <div className="absolute inset-0 rounded-full border border-foreground/20 group-hover:border-foreground/40 transition-colors" />
              <div className="absolute inset-1.5 rounded-full border border-foreground/40 group-hover:border-foreground/60 transition-colors" />
              <div className="absolute inset-3 rounded-full bg-foreground" />
            </div>
            <span className="font-bold text-foreground tracking-tight text-base md:text-lg">PrivetVideo</span>
          </Link>

          {/* ── Desktop nav links (hidden on mobile) ─────────── */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link, i) => (
              <span key={link.to} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/40 text-xs">•</span>}
                <NavLink to={link.to} icon={link.icon} active={isActive(link.to)}>
                  {link.label}
                </NavLink>
              </span>
            ))}
          </div>

          {/* ── Right side ───────────────────────────────────── */}
          <div className="flex items-center gap-2 md:gap-3">
            {isAuthenticated ? (
              <>
                {/* Avatar + name (desktop only shows name) */}
                <div className="flex items-center gap-2">
                  {showAvatar ? (
                    <img
                      src={user!.avatar}
                      alt={user!.name}
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                      className="w-8 h-8 rounded-full object-cover border border-border/50 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary border border-border/50 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-foreground leading-none">{user?.name}</p>
                    {isAdmin && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Crown size={9} /> Admin
                      </p>
                    )}
                  </div>
                </div>

                {/* Logout (desktop) */}
                <motion.button
                  onClick={handleLogout}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="hidden md:flex liquid-glass w-9 h-9 rounded-full items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title="Logout"
                >
                  <LogOut size={15} />
                </motion.button>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                  Login
                </Link>
                <Link to="/register" className="liquid-glass text-sm text-foreground px-4 py-1.5 rounded-full">
                  Sign Up
                </Link>
              </div>
            )}

            {/* Hamburger button (mobile only) */}
            <motion.button
              onClick={() => setMobileOpen(o => !o)}
              whileTap={{ scale: 0.9 }}
              className="md:hidden liquid-glass w-9 h-9 rounded-full flex items-center justify-center text-foreground"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ── Mobile Drawer ──────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-16 left-4 right-4 z-50 liquid-glass rounded-2xl p-4 md:hidden"
            >
              {/* User info */}
              {isAuthenticated && (
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border/30">
                  {showAvatar ? (
                    <img
                      src={user!.avatar}
                      alt={user!.name}
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                      className="w-10 h-10 rounded-full object-cover border border-border/50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary border border-border/50 flex items-center justify-center text-sm font-semibold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Crown size={9} /> Admin
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Nav links */}
              <div className="space-y-1">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive(link.to)
                        ? 'bg-foreground text-background font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Auth actions */}
              <div className="mt-4 pt-4 border-t border-border/30">
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-center px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground border border-border/30 hover:bg-secondary/50 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-center px-4 py-2.5 rounded-xl text-sm bg-foreground text-background font-medium"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function NavLink({
  to, children, icon, active
}: {
  to: string; children: React.ReactNode; icon?: React.ReactNode; active?: boolean
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-lg ${
        active
          ? 'text-foreground bg-secondary/60'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
      }`}
    >
      {icon}
      {children}
    </Link>
  )
}
