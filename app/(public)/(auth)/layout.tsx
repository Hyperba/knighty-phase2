import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import styles from './layout.module.css'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Session is already validated/refreshed by middleware's getUser() call.
  // Use getSession() here to avoid a second getUser() which can corrupt cookies.
  const supabase = await getSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user) {
    redirect('/')
  }

  return (
    <div className={styles.authLayout}>
      <main className={styles.authMain}>
        {children}
      </main>
    </div>
  )
}
