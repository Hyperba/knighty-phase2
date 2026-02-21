'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

function getSessionId(): string {
  const key = 'kb_session_id'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}

export default function PageViewTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (pathname === lastPath.current) return
    lastPath.current = pathname

    // Don't track admin routes
    if (pathname.startsWith('/admin')) return

    const track = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        await supabase.rpc('record_page_view', {
          p_page_path: pathname,
          p_referrer: document.referrer || null,
          p_session_id: getSessionId(),
        })
      } catch {
        // Silently ignore tracking failures
      }
    }

    track()
  }, [pathname])

  return null
}
