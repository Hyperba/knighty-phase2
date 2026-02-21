'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './PageTransition.module.css'

export default function PageTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const startTransition = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }

    rafRef.current = window.requestAnimationFrame(() => {
      setIsTransitioning(true)
      rafRef.current = null

      timeoutRef.current = window.setTimeout(() => {
        setIsTransitioning(false)
        timeoutRef.current = null
      }, 1000)
    })
  }

  useEffect(() => {
    const isModifiedClick = (e: MouseEvent) =>
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0

    const onClickCapture = (e: MouseEvent) => {
      if (isModifiedClick(e)) return

      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a') as HTMLAnchorElement | null
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return

      if (anchor.target === '_blank') return
      if (href.startsWith('#')) return
      if (href.startsWith('http://') || href.startsWith('https://')) return
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return

      startTransition()
    }

    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      startTransition()
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  if (!isTransitioning) return null

  return (
    <div className={styles.overlay} aria-hidden="true">
      <img className={styles.logo} src="/knighty-logo.png" alt="" />
    </div>
  )
}
