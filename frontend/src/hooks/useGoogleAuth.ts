import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/auth.store'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

export function useGoogleAuth() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

  const handleGoogleLogin = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your_google_client_id.apps.googleusercontent.com') {
      toast.error('Google Client ID not configured')
      return
    }

    // Wait for GSI script to load
    const tryGoogle = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(tryGoogle, 300)
        return
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential) {
            toast.error('Google sign-in was cancelled')
            return
          }
          const loadingToast = toast.loading('Signing in with Google...')
          try {
            const { data } = await api.post('/auth/google', {
              idToken: response.credential,
            })
            if (data.success) {
              setUser(data.user, data.token)
              toast.dismiss(loadingToast)
              toast.success(`Welcome, ${data.user.name}!`)
              navigate('/dashboard')
            }
          } catch (err: any) {
            toast.dismiss(loadingToast)
            const msg = err.response?.data?.message || 'Google sign-in failed'
            toast.error(msg)
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      // Show the One Tap prompt
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap was suppressed — fall back to popup via renderButton
          // This silently fails; we handle it by the button click showing a custom flow
        }
      })
    }

    tryGoogle()
  }, [navigate, setUser])

  /**
   * Render the official Google Sign-In button into a container element.
   * Call this when you want a rendered button instead of One Tap.
   */
  const renderGoogleButton = useCallback(
    (container: HTMLElement | null) => {
      if (!container || !GOOGLE_CLIENT_ID) return

      const tryRender = () => {
        if (!window.google?.accounts?.id) {
          setTimeout(tryRender, 300)
          return
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response.credential) return
            const loadingToast = toast.loading('Signing in with Google...')
            try {
              const { data } = await api.post('/auth/google', {
                idToken: response.credential,
              })
              if (data.success) {
                setUser(data.user, data.token)
                toast.dismiss(loadingToast)
                toast.success(`Welcome, ${data.user.name}!`)
                navigate('/dashboard')
              }
            } catch (err: any) {
              toast.dismiss(loadingToast)
              toast.error(err.response?.data?.message || 'Google sign-in failed')
            }
          },
          auto_select: false,
        })

        window.google.accounts.id.renderButton(container, {
          theme: 'filled_black',
          size: 'large',
          width: container.offsetWidth || 400,
          shape: 'rectangular',
          logo_alignment: 'center',
          text: 'continue_with',
        })
      }

      tryRender()
    },
    [navigate, setUser]
  )

  return { handleGoogleLogin, renderGoogleButton }
}
