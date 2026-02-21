'use client'

import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Disable the Web Locks API for cross-tab token refresh coordination.
          // The default lock uses navigator.locks which throws AbortError when
          // multiple tabs compete for the same lock. This no-op lock lets each
          // tab refresh its own token independently — no more AbortError.
          lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
            return await fn()
          },
        } as any,
      }
    )
  }
  return client
}
