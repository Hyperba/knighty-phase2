'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import styles from './StatusModal.module.css'

export type StatusModalVariant = 'success' | 'error' | 'info'

interface StatusModalProps {
  open: boolean
  onClose: () => void
  heading: string
  description?: string
  icon?: ReactNode
  variant?: StatusModalVariant
}

export default function StatusModal({
  open,
  onClose,
  heading,
  description,
  icon,
  variant = 'info',
}: StatusModalProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <div
        className={`${styles.modal} ${styles[variant]}`}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {icon ? <div className={styles.icon}>{icon}</div> : null}
        <h2 className={styles.heading}>{heading}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}
        <button type="button" className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
