import { getSupabaseBrowserClient } from '@/lib/supabase/client'

/**
 * Track a custom event in Supabase.
 * Fires and forgets — never blocks the UI or throws.
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null>
) {
  try {
    // Don't track events on admin routes
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return

    const supabase = getSupabaseBrowserClient()
    Promise.resolve(
      supabase.rpc('track_event', {
        p_event_name: eventName,
        p_properties: properties ? JSON.stringify(properties) : null,
        p_page_path: typeof window !== 'undefined' ? window.location.pathname : null,
        p_session_id: getSessionId(),
      })
    ).catch(() => {})
  } catch {
    // Silently ignore
  }
}

/**
 * Send a custom event to Google Analytics (if loaded).
 */
export function gtagEvent(
  action: string,
  params?: Record<string, string | number | boolean>
) {
  try {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', action, params)
    }
  } catch {
    // Silently ignore
  }
}

/**
 * Track in both Supabase and GA4 at once.
 */
export function trackAll(
  eventName: string,
  properties?: Record<string, string | number | boolean | null>
) {
  trackEvent(eventName, properties)
  gtagEvent(eventName, properties as Record<string, string | number | boolean> | undefined)
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'kb_session_id'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}
