import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import api from '../../lib/api'
import toast from 'react-hot-toast'

// Avoid conflict with src/types/google.d.ts by using any cast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gsi = (): any => (window as any).google?.accounts?.id

export default function GoogleButton({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleCredential = useCallback(async (response: any) => {
    // Debug: log what Google returned
    console.log('[GoogleButton] GSI response keys:', Object.keys(response || {}))
    console.log('[GoogleButton] Has credential:', !!response?.credential)

    const credential = response?.credential

    if (!credential) {
      console.warn('[GoogleButton] No credential in response:', response)
      toast.error('Google did not return a credential. Try disabling Brave Shields or use email login.')
      return
    }

    try {
      const { data } = await api.post('/auth/google', { token: credential })
      if (data.success) {
        setUser(data.user, data.token)
        toast.success(`Welcome, ${data.user.name}!`)
        navigate('/dashboard')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Google sign-in failed. Try again.')
    }
  }, [setUser, navigate])

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.warn('[GoogleButton] VITE_GOOGLE_CLIENT_ID not set')
      return
    }

    const render = () => {
      const g = gsi()
      if (!g || !containerRef.current) return

      g.initialize({
        client_id: clientId,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',       // force popup mode (not redirect)
        itp_support: false,     // disable Intelligent Tracking Prevention workarounds
      })

      g.renderButton(containerRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: containerRef.current.offsetWidth || 400,
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      })
    }

    if (gsi()) { render(); return }

    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
    if (existing) {
      existing.addEventListener('load', render)
      return () => existing.removeEventListener('load', render)
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = render
    document.head.appendChild(script)
  }, [handleCredential])

  return (
    <div
      ref={containerRef}
      className={`w-full flex justify-center overflow-hidden rounded-xl ${className}`}
      style={{ minHeight: '44px' }}
    />
  )
}
