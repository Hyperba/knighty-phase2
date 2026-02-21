'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, LogIn, UserPlus, Shield } from 'lucide-react'
import styles from './PlanAuthModal.module.css'

interface PlanAuthModalProps {
  planName: string
  planTier: string
  billingPeriod: 'monthly' | 'yearly'
  onClose: () => void
}

export default function PlanAuthModal({ planName, planTier, billingPeriod, onClose }: PlanAuthModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const redirectUrl = encodeURIComponent(`/checkout?plan=${planTier}&billing=${billingPeriod}`)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className={styles.iconWrapper}>
          <Shield size={28} />
        </div>

        <h2 className={styles.title}>Sign in to subscribe</h2>
        <p className={styles.message}>
          Create an account or sign in to subscribe to the <strong>{planName}</strong> plan.
        </p>

        <div className={styles.actions}>
          <Link href={`/login?redirect=${redirectUrl}`} className={styles.primaryBtn} onClick={onClose}>
            <LogIn size={16} />
            Sign In
          </Link>
          <Link href={`/signup?redirect=${redirectUrl}`} className={styles.secondaryBtn} onClick={onClose}>
            <UserPlus size={16} />
            Create Account
          </Link>
        </div>
      </div>
    </div>
  )
}
