import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Play, Shield, Key, BarChart2, ArrowRight, Lock, Upload } from 'lucide-react'
import Navbar from '../components/layout/Navbar'

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, delay, ease: 'easeOut' },
})

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_120549_0cd82c36-56b3-4dd9-b190-069cfc3a623f.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            {...fadeUp(0)}
            className="inline-flex items-center gap-2 liquid-glass px-4 py-2 rounded-full text-xs text-muted-foreground mb-8"
          >
            <Lock size={12} />
            <span>Private video sharing with token-gated access</span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.1)}
            className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-[-2px] leading-none mb-6"
          >
            Share Videos{' '}
            <em className="font-serif italic not-italic" style={{ fontStyle: 'italic' }}>
              Privately
            </em>
          </motion.h1>

          <motion.p
            {...fadeUp(0.2)}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload your videos to Cloudinary. Share with a unique access token. Control exactly
            how many times each token can be used — from 1 to unlimited.
          </motion.p>

          <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-full font-semibold text-sm hover:bg-foreground/90 transition-colors"
              >
                Get Started Free
                <ArrowRight size={16} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 liquid-glass px-8 py-3.5 rounded-full text-sm text-foreground"
              >
                <Play size={14} />
                See How It Works
              </Link>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-6xl mx-auto">
        <motion.div {...fadeUp(0)} className="text-center mb-16">
          <p className="text-xs tracking-[3px] uppercase text-muted-foreground mb-4">Features</p>
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
            Everything you need for{' '}
            <em className="font-serif italic">secure</em> sharing
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp(i * 0.1)}
              className="liquid-glass rounded-2xl p-6 space-y-4"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
                {f.icon}
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <h2 className="text-4xl font-medium tracking-tight mb-4">
              How It{' '}
              <em className="font-serif italic">Works</em>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div key={s.title} {...fadeUp(i * 0.15)} className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold mx-auto">
                  {i + 1}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6">
        <motion.div {...fadeUp(0)} className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
            Ready to share{' '}
            <em className="font-serif italic">privately</em>?
          </h2>
          <p className="text-muted-foreground">
            Join today — only Gmail accounts accepted for maximum security.
          </p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-foreground text-background px-10 py-4 rounded-full font-semibold hover:bg-foreground/90 transition-colors"
            >
              Create Account
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2026 PrivetVideo. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Contact'].map((link) => (
              <a key={link} href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: <Upload size={18} />,
    title: 'Upload to Cloudinary',
    desc: 'Videos stored securely on Cloudinary CDN with automatic optimization.',
  },
  {
    icon: <Key size={18} />,
    title: 'Token-Gated Access',
    desc: 'Generate unique access tokens with configurable usage limits (1–1000).',
  },
  {
    icon: <Shield size={18} />,
    title: 'Gmail-Only Auth',
    desc: 'Only verified @gmail.com accounts can access the platform.',
  },
  {
    icon: <BarChart2 size={18} />,
    title: 'Usage Analytics',
    desc: 'Track how many times each token has been used to watch your video.',
  },
]

const steps = [
  {
    title: 'Sign Up with Gmail',
    desc: 'Create an account using your @gmail.com email. Verify with OTP sent to your inbox.',
  },
  {
    title: 'Upload Your Video',
    desc: 'Upload any video file up to 500MB. It gets stored securely on Cloudinary.',
  },
  {
    title: 'Share with a Token',
    desc: 'Generate an access token, set usage limit, and share the URL. Only token holders can watch.',
  },
]
