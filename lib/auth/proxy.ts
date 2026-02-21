import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'

// All these helpers use getSession() instead of getUser() because the
// middleware already validates/refreshes the token via getUser(). Calling
// getUser() again in server components causes a double-refresh that can
// corrupt auth cookies.

export async function requireAuth(redirectTo: string = '/login') {
  const supabase = await getSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect(`${redirectTo}?redirect=${encodeURIComponent(redirectTo)}`)
  }

  return session.user
}

export async function requireAdmin(redirectTo: string = '/') {
  const supabase = await getSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tier')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.tier !== 'admin') {
    redirect(redirectTo)
  }

  return session.user
}

export async function getAuthUser() {
  const supabase = await getSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

export async function getUserProfile(userId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return profile
}
