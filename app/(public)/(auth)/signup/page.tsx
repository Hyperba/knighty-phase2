'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/components/contexts/AuthContext'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

const SHOWCASE_IMAGES = [
  { src: '/builds/statues.png', alt: 'Statues' },
  { src: '/builds/houses.png', alt: 'Houses' },
  { src: '/builds/portals.png', alt: 'Portals' },
  { src: '/builds/vehicles.png', alt: 'Vehicles' },
  { src: '/builds/art.png', alt: 'Art' },
  { src: '/builds/assets.png', alt: 'Assets' },
]

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, signInWithGoogle, loading: authLoading } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const redirectTo = searchParams.get('redirect') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [minecraftIgn, setMinecraftIgn] = useState('')
  const [error, setError] = useState('')
  const [handleError, setHandleError] = useState('')
  const [handleValid, setHandleValid] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [checkingHandle, setCheckingHandle] = useState(false)

  const validateHandle = useCallback(async (value: string) => {
    if (!value || value.length < 4) {
      setHandleError(value ? 'Handle must be at least 4 characters' : '')
      setHandleValid(false)
      return
    }

    setCheckingHandle(true)
    
    try {
      const { data, error } = await supabase.rpc('validate_handle', {
        p_handle: value,
      })

      if (error) {
        setHandleError('Error validating handle')
        setHandleValid(false)
      } else if (data?.valid) {
        setHandleError('')
        setHandleValid(true)
      } else {
        setHandleError(data?.error || 'Invalid handle')
        setHandleValid(false)
      }
    } catch {
      setHandleError('Error validating handle')
      setHandleValid(false)
    } finally {
      setCheckingHandle(false)
    }
  }, [supabase])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (handle) {
        validateHandle(handle)
      } else {
        setHandleError('')
        setHandleValid(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [handle, validateHandle])

  const generateHandleFromEmail = useCallback(async (emailValue: string) => {
    if (!emailValue || !emailValue.includes('@')) return

    try {
      const { data } = await supabase.rpc('generate_unique_handle', {
        p_email: emailValue,
      })
      
      if (data) {
        setHandle(data)
      }
    } catch {
      // Ignore errors, user can set handle manually
    }
  }, [supabase])

  const handleEmailBlur = () => {
    if (email && !handle) {
      generateHandleFromEmail(email)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (handle && !handleValid) {
      setError('Please choose a valid handle')
      setLoading(false)
      return
    }

    // Build avatar URL from Minecraft IGN (passed to RPC which runs as SECURITY DEFINER)
    const cleanIgn = minecraftIgn.trim().replace(/[^a-zA-Z0-9_]/g, '')
    const avatarUrl = cleanIgn ? `https://mc-heads.net/avatar/${cleanIgn}` : undefined

    const { error: signUpError } = await signUp(
      email,
      password,
      handle || undefined,
      displayName || undefined,
      redirectTo || undefined,
      avatarUrl
    )

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
  }

  const handleGoogleSignUp = async () => {
    setError('')
    const { error: googleError } = await signInWithGoogle(redirectTo || undefined)
    if (googleError) {
      setError(googleError.message)
    }
  }

  const cleanIgnForPreview = minecraftIgn.trim().replace(/[^a-zA-Z0-9_]/g, '')

  if (authLoading) {
    return (
      <div className={styles.authPage}>
        <div className={styles.formPanel}>
          <div className={styles.formWrapper}>
            <p className={styles.loadingText}>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className={styles.authPage}>
        <div className={styles.showcasePanel}>
          <div className={styles.showcaseContent}>
            <h2 className={styles.showcaseTitle}>
              You&apos;re almost in!
            </h2>
            <p className={styles.showcaseDescription}>
              Just one more step — verify your email and you&apos;ll have instant access to free Minecraft builds, guides, and downloads.
            </p>
            <div className={styles.imageGrid}>
              {SHOWCASE_IMAGES.map((img) => (
                <div key={img.alt} className={styles.imageGridItem}>
                  <Image src={img.src} alt={img.alt} width={140} height={140} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.formPanel}>
          <div className={styles.formWrapper}>
            <h1 className={styles.authTitle}>Check Your Email</h1>
            <div className={styles.successBox}>
              We&apos;ve sent a confirmation link to <strong>{email}</strong>. 
              Please check your inbox and click the link to verify your account.
            </div>
            <p className={styles.authFooter}>
              Already verified?{' '}
              <Link href="/login" className={styles.authLink}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.authPage}>
      {/* Left — Showcase */}
      <div className={styles.showcasePanel}>
        <div className={styles.showcaseContent}>
          <div className={styles.showcaseBadge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Free builds on sign up
          </div>
          <h2 className={styles.showcaseTitle}>
            Unlock <span>premium builds</span> for your Minecraft world
          </h2>
          <p className={styles.showcaseDescription}>
            Join thousands of builders and get instant access to free builds, step-by-step guides, and downloadable schematics.
          </p>

          <div className={styles.benefitsList}>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              Download free builds instantly
            </div>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                </svg>
              </div>
              Step-by-step building guides
            </div>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </div>
              Save and like your favorite builds
            </div>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              Join the Knighty builder community
            </div>
          </div>

          <div className={styles.imageGrid}>
            {SHOWCASE_IMAGES.map((img) => (
              <div key={img.alt} className={styles.imageGridItem}>
                <Image src={img.src} alt={img.alt} width={140} height={140} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className={styles.formPanel}>
        <div className={styles.formWrapper}>
          {/* Mobile-only header */}
          <div className={styles.mobileHeader}>
            <div className={styles.showcaseBadge}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Free builds on sign up
            </div>
          </div>

          <h1 className={styles.authTitle}>Create Your Account</h1>
          <p className={styles.authSubtitle}>Start building something incredible today</p>

          {error && <div className={styles.errorBox}>{error}</div>}

          <button
            type="button"
            onClick={handleGoogleSignUp}
            className={styles.googleButton}
            disabled={loading}
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.inputLabel}>
                Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                className={styles.input}
                placeholder="you@example.com"
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="handle" className={styles.inputLabel}>
                Handle
              </label>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className={styles.input}
                placeholder="your_handle"
                disabled={loading}
                autoComplete="username"
                maxLength={20}
              />
              {handle && (
                <div className={styles.handlePreview}>
                  Profile: <span>@{handle}</span>
                </div>
              )}
              {checkingHandle && (
                <p className={styles.inputHint}>Checking...</p>
              )}
              {handleError && !checkingHandle && (
                <p className={styles.inputError}>{handleError}</p>
              )}
              {handleValid && !checkingHandle && (
                <p className={styles.inputSuccess}>Available!</p>
              )}
              {!handle && (
                <p className={styles.inputHint}>Auto-generated if blank</p>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="displayName" className={styles.inputLabel}>
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={styles.input}
                placeholder="Your name"
                disabled={loading}
                autoComplete="name"
                maxLength={50}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="minecraftIgn" className={styles.inputLabel}>
                Minecraft Username
              </label>
              <input
                id="minecraftIgn"
                type="text"
                value={minecraftIgn}
                onChange={(e) => setMinecraftIgn(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className={styles.input}
                placeholder="e.g. Notch"
                disabled={loading}
                maxLength={16}
              />
              {cleanIgnForPreview ? (
                <div className={styles.mcPreview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://mc-heads.net/avatar/${cleanIgnForPreview}`}
                    alt={`${cleanIgnForPreview}'s Minecraft skin`}
                    className={styles.mcAvatar}
                    width={36}
                    height={36}
                  />
                  <div className={styles.mcPreviewText}>
                    <span className={styles.mcPreviewName}>{cleanIgnForPreview}</span>
                    <span className={styles.mcPreviewHint}>This will be your profile picture</span>
                  </div>
                </div>
              ) : (
                <p className={styles.inputHint}>
                  Your Minecraft skin will be your profile avatar
                </p>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.inputLabel}>
                Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="new-password"
                required
                minLength={6}
              />
              <p className={styles.inputHint}>Min. 6 characters</p>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.inputLabel}>
                Confirm Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || (handle !== '' && !handleValid)}
            >
              {loading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>

          <p className={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Link href="/terms">Terms of Service</Link> and{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>

          <p className={styles.authFooter}>
            Already have an account?{' '}
            <Link href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'} className={styles.authLink}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
