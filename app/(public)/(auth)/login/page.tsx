'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/components/contexts/AuthContext'
import styles from '../auth.module.css'

const SHOWCASE_IMAGES = [
  { src: '/builds/statues.png', alt: 'Statues' },
  { src: '/builds/houses.png', alt: 'Houses' },
  { src: '/builds/portals.png', alt: 'Portals' },
  { src: '/builds/vehicles.png', alt: 'Vehicles' },
  { src: '/builds/art.png', alt: 'Art' },
  { src: '/builds/assets.png', alt: 'Assets' },
]

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signInWithGoogle, loading: authLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const callbackError = searchParams.get('error')
  const redirectTo = searchParams.get('redirect') || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push(redirectTo)
  }

  const handleGoogleSignIn = async () => {
    setError('')
    const { error: googleError } = await signInWithGoogle()
    if (googleError) {
      setError(googleError.message)
    }
  }

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

  return (
    <div className={styles.authPage}>
      {/* Left — Showcase */}
      <div className={styles.showcasePanel}>
        <div className={styles.showcaseContent}>
          <div className={styles.showcaseBadge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
            Premium Minecraft Builds
          </div>
          <h2 className={styles.showcaseTitle}>
            Welcome back to <span>KnightyBuilds</span>
          </h2>
          <p className={styles.showcaseDescription}>
            Your builds, guides, and downloads are waiting for you. Sign in to pick up where you left off.
          </p>

          <div className={styles.benefitsList}>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              Access your downloaded builds
            </div>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
              </div>
              Continue with your saved favorites
            </div>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              Manage your subscription &amp; settings
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
          {/* Mobile-only header (showcase hidden on mobile) */}
          <div className={styles.mobileHeader}>
            <div className={styles.showcaseBadge}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
              Knighty Builds
            </div>
          </div>

          <h1 className={styles.authTitle}>Welcome Back</h1>
          <p className={styles.authSubtitle}>Sign in to your account to continue</p>

          {(error || callbackError) && (
            <div className={styles.errorBox}>
              {error || 'Authentication failed. Please try again.'}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
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
              <label htmlFor="email" className={styles.inputLabel}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.inputLabel}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className={styles.authFooter}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className={styles.authLink}>
              Create one for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
