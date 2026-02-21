import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Session is already validated/refreshed by middleware's getUser() call.
  // Use getSession() here to avoid a second getUser() which can corrupt cookies.
  const supabase = await getSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/login')
  }

  return <>{children}</>
}
