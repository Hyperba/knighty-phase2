"use client"

import { useEffect } from "react"
import Lenis from "@studio-freight/lenis"

export default function LenisProvider({ children }:{children: React.ReactNode}) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.history.scrollRestoration = 'manual'
      } catch {
        // ignore
      }
    }

    const lenis = new Lenis({
      duration: 1.2,       // how smooth it feels
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // premium ease
      infinite: false,
    })

    ;(window as any).__lenis = lenis

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      if ((window as any).__lenis === lenis) {
        ;(window as any).__lenis = null
      }
      lenis.destroy()
    }
  }, [])

  return children
}
