'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User, Session, AuthError } from '@supabase/supabase-js'

export type UserTier = 'explorer' | 'access' | 'builder' | 'architect' | 'admin'

export interface UserProfile {
  id: string
  handle: string
  display_name: string
  bio: string
  avatar_url: string
  cover_url: string
  tier: UserTier
  handle_changed_at: string | null
  created_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, handle?: string, displayName?: string, redirectTo?: string, avatarUrl?: string) => Promise<{ error: AuthError | Error | null }>
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = getSupabaseBrowserClient()

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error.message)
        return null
      }

      return data as UserProfile | null
    } catch {
      return null
    }
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const profileData = await fetchProfile(user.id)
    setProfile(profileData)
  }, [user, fetchProfile])

  useEffect(() => {
    let mounted = true

    // Use onAuthStateChange as the single source of truth.
    // INITIAL_SESSION fires immediately with the current session from cookies.
    // This is fast (no network call) and reliable. The middleware already
    // validated/refreshed the token, so cookies are trustworthy.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return

        if (event === 'SIGNED_OUT' || !newSession) {
          setUser(null)
          setProfile(null)
          setSession(null)
          setLoading(false)
          return
        }

        // INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED
        setSession(newSession)
        setUser(newSession.user)

        if (newSession.user) {
          const profileData = await fetchProfile(newSession.user.id)
          if (mounted) setProfile(profileData)
        }

        if (mounted) setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (
    email: string,
    password: string,
    handle?: string,
    displayName?: string,
    redirectTo?: string,
    avatarUrl?: string
  ): Promise<{ error: AuthError | Error | null }> => {
    const callbackUrl = redirectTo
      ? `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`
      : `${window.location.origin}/api/auth/callback`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl,
      },
    })

    if (error) {
      return { error }
    }

    if (data.user) {
      try {
        const { data: profileResult, error: profileError } = await supabase.rpc('create_user_profile', {
          p_user_id: data.user.id,
          p_email: email,
          p_handle: handle || null,
          p_display_name: displayName || null,
          p_avatar_url: avatarUrl || null,
        })

        if (profileError) {
          return { error: new Error(profileError.message) }
        }

        if (profileResult?.status === 'error') {
          return { error: new Error(profileResult.message) }
        }
      } catch {
        console.warn('Profile creation failed, but user was created')
      }
    }

    return { error: null }
  }

  const signInWithGoogle = async (redirectTo?: string) => {
    const callbackUrl = redirectTo
      ? `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`
      : `${window.location.origin}/api/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    })
    return { error }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Sign out failed - clear local state anyway
    }
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
