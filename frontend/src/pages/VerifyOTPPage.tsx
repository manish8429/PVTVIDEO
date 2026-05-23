import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/auth.store'

export default function VerifyOTPPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const email = location.state?.email || ''

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!email) {
      navigate('/login')
      return
    }
    inputRefs.current[0]?.focus()
  }, [email, navigate])

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    // Auto-submit when all filled
    if (newOtp.every((d) => d !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code: string) => {
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp: code })
      if (data.success) {
        setUser(data.user, data.token)
        toast.success('Email verified! Welcome to PrivetVideo.')
        navigate('/dashboard')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Verification failed'
      toast.error(msg)
      // If OTP expired, reset boxes and highlight resend
      if (msg.toLowerCase().includes('expired')) {
        setOtp(['', '', '', '', '', ''])
        setCountdown(0) // immediately allow resend
        inputRefs.current[0]?.focus()
      } else {
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setResending(true)
    try {
      await api.post('/auth/resend-otp', { email })
      toast.success('New OTP sent to your Gmail!')
      setCountdown(30)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border border-foreground/20" />
              <div className="absolute inset-1.5 rounded-full border border-foreground/40" />
              <div className="absolute inset-3 rounded-full bg-foreground" />
            </div>
            <span className="font-bold text-foreground tracking-tight">PrivetVideo</span>
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Check your Gmail</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
            We sent a 6-digit code to{' '}
            <span className="text-foreground font-medium">{email}</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="liquid-glass rounded-2xl p-8 space-y-8"
        >
          {/* OTP Input Grid */}
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <motion.input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleOTPChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                maxLength={1}
                whileFocus={{ scale: 1.05 }}
                className="w-12 h-14 text-center text-xl font-bold bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-ring focus:shadow-[0_0_0_2px_rgba(255,255,255,0.06)] transition-all"
              />
            ))}
          </div>

          {/* Submit */}
          <motion.button
            onClick={() => handleVerify(otp.join(''))}
            disabled={loading || otp.some((d) => !d)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-foreground text-background py-3 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              'Verify OTP'
            )}
          </motion.button>

          {/* Resend */}
          <div className="text-center space-y-2">
            <motion.button
              onClick={handleResend}
              disabled={countdown > 0 || resending}
              whileHover={countdown === 0 ? { scale: 1.03 } : {}}
              whileTap={countdown === 0 ? { scale: 0.97 } : {}}
              animate={countdown === 0 ? { opacity: [0.7, 1, 0.7] } : {}}
              transition={countdown === 0 ? { duration: 1.5, repeat: Infinity } : {}}
              className={`inline-flex items-center gap-2 text-sm transition-colors rounded-lg px-3 py-1.5 ${
                countdown === 0
                  ? 'text-foreground bg-secondary cursor-pointer'
                  : 'text-muted-foreground opacity-50 cursor-not-allowed'
              }`}
            >
              <RotateCcw size={13} className={resending ? 'animate-spin' : ''} />
              {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
            </motion.button>
            <p className="text-xs text-muted-foreground">OTP valid for 30 minutes</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
