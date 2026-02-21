'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, User, Database, Shield, Globe, Clock } from 'lucide-react'
import { useAuth } from '@/components/contexts/AuthContext'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface DbCheck {
  status: 'ok' | 'error' | 'loading'
  latencyMs: number | null
  error: string | null
  productCount: number | null
}

interface SessionCheck {
  hasLocalSession: boolean
  accessTokenPrefix: string | null
  expiresAt: string | null
  isExpired: boolean
}

export default function TestPage() {
  const { user, profile, session, loading: authLoading } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [dbCheck, setDbCheck] = useState<DbCheck>({ status: 'loading', latencyMs: null, error: null, productCount: null })
  const [sessionCheck, setSessionCheck] = useState<SessionCheck | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [origin, setOrigin] = useState('—')
  const [userAgent, setUserAgent] = useState('—')

  const runDbCheck = useCallback(async () => {
    setDbCheck({ status: 'loading', latencyMs: null, error: null, productCount: null })
    const start = performance.now()
    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      const latencyMs = Math.round(performance.now() - start)

      if (error) {
        setDbCheck({ status: 'error', latencyMs, error: error.message, productCount: null })
      } else {
        setDbCheck({ status: 'ok', latencyMs, error: null, productCount: count ?? 0 })
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start)
      setDbCheck({ status: 'error', latencyMs, error: (err as Error).message, productCount: null })
    }
  }, [supabase])

  const runSessionCheck = useCallback(async () => {
    try {
      const { data: { session: localSession } } = await supabase.auth.getSession()
      if (localSession) {
        const expiresAt = localSession.expires_at
          ? new Date(localSession.expires_at * 1000).toISOString()
          : null
        const isExpired = localSession.expires_at
          ? Date.now() / 1000 > localSession.expires_at
          : false
        setSessionCheck({
          hasLocalSession: true,
          accessTokenPrefix: localSession.access_token?.substring(0, 20) + '...',
          expiresAt,
          isExpired,
        })
      } else {
        setSessionCheck({
          hasLocalSession: false,
          accessTokenPrefix: null,
          expiresAt: null,
          isExpired: false,
        })
      }
    } catch {
      setSessionCheck({
        hasLocalSession: false,
        accessTokenPrefix: null,
        expiresAt: null,
        isExpired: false,
      })
    }
  }, [supabase])

  const runAllChecks = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([runDbCheck(), runSessionCheck()])
    setLastRefresh(new Date())
    setRefreshing(false)
  }, [runDbCheck, runSessionCheck])

  useEffect(() => {
    runAllChecks()
    setOrigin(window.location.origin)
    setUserAgent(navigator.userAgent.substring(0, 60) + '...')
  }, [runAllChecks])

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  })

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>System Debug</h1>
      <p className={styles.subtitle}>Diagnostic information for troubleshooting</p>

      <div className={styles.grid}>
        {/* Auth Context State */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <User size={16} className={styles.cardIcon} />
            <span className={styles.cardTitle}>Auth Context</span>
            <span className={`${styles.statusBadge} ${
              authLoading ? styles.statusLoading :
              user ? styles.statusOk :
              styles.statusWarn
            }`}>
              <span className={
                authLoading ? styles.dotPurple :
                user ? styles.dotGreen :
                styles.dotYellow
              } />
              {authLoading ? 'Loading' : user ? 'Authenticated' : 'Not Authenticated'}
            </span>
          </div>
          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>loading</span>
              <span className={styles.rowValue}>{String(authLoading)}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>user.id</span>
              <span className={user?.id ? styles.rowValue : styles.rowValueNull}>
                {user?.id ?? 'null'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>user.email</span>
              <span className={user?.email ? styles.rowValue : styles.rowValueNull}>
                {user?.email ?? 'null'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>session</span>
              <span className={session ? styles.rowValue : styles.rowValueNull}>
                {session ? 'Active' : 'null'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile / Role */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Shield size={16} className={styles.cardIcon} />
            <span className={styles.cardTitle}>Profile &amp; Role</span>
            <span className={`${styles.statusBadge} ${
              authLoading ? styles.statusLoading :
              profile ? styles.statusOk :
              user ? styles.statusWarn :
              styles.statusError
            }`}>
              <span className={
                authLoading ? styles.dotPurple :
                profile ? styles.dotGreen :
                user ? styles.dotYellow :
                styles.dotRed
              } />
              {authLoading ? 'Loading' :
               profile ? profile.tier.toUpperCase() :
               user ? 'No Profile' :
               'N/A'}
            </span>
          </div>
          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>profile.id</span>
              <span className={profile?.id ? styles.rowValue : styles.rowValueNull}>
                {profile?.id ?? 'null'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>handle</span>
              <span className={profile?.handle ? styles.rowValue : styles.rowValueNull}>
                {profile?.handle ?? 'null'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>display_name</span>
              <span className={profile?.display_name ? styles.rowValue : styles.rowValueNull}>
                {profile?.display_name ?? 'null'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>tier</span>
              <span className={profile?.tier ? styles.rowValue : styles.rowValueNull}>
                {profile?.tier ?? 'null'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>is_admin</span>
              <span className={styles.rowValue}>
                {profile?.tier === 'admin' ? 'true' : 'false'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>created_at</span>
              <span className={profile?.created_at ? styles.rowValue : styles.rowValueNull}>
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'null'}
              </span>
            </div>
          </div>
        </div>

        {/* Local Session (raw Supabase) */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Clock size={16} className={styles.cardIcon} />
            <span className={styles.cardTitle}>Local Session (Supabase)</span>
            <span className={`${styles.statusBadge} ${
              !sessionCheck ? styles.statusLoading :
              sessionCheck.isExpired ? styles.statusError :
              sessionCheck.hasLocalSession ? styles.statusOk :
              styles.statusWarn
            }`}>
              <span className={
                !sessionCheck ? styles.dotPurple :
                sessionCheck.isExpired ? styles.dotRed :
                sessionCheck.hasLocalSession ? styles.dotGreen :
                styles.dotYellow
              } />
              {!sessionCheck ? 'Checking' :
               sessionCheck.isExpired ? 'Expired' :
               sessionCheck.hasLocalSession ? 'Valid' :
               'None'}
            </span>
          </div>
          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>has_local_session</span>
              <span className={styles.rowValue}>
                {sessionCheck ? String(sessionCheck.hasLocalSession) : '...'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>access_token</span>
              <span className={sessionCheck?.accessTokenPrefix ? styles.rowValue : styles.rowValueNull}>
                {sessionCheck?.accessTokenPrefix ?? 'null'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>expires_at</span>
              <span className={sessionCheck?.expiresAt ? styles.rowValue : styles.rowValueNull}>
                {sessionCheck?.expiresAt ?? 'null'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>is_expired</span>
              <span className={styles.rowValue}>
                {sessionCheck ? String(sessionCheck.isExpired) : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Database Connection */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Database size={16} className={styles.cardIcon} />
            <span className={styles.cardTitle}>Database Connection</span>
            <span className={`${styles.statusBadge} ${
              dbCheck.status === 'loading' ? styles.statusLoading :
              dbCheck.status === 'ok' ? styles.statusOk :
              styles.statusError
            }`}>
              <span className={
                dbCheck.status === 'loading' ? styles.dotPurple :
                dbCheck.status === 'ok' ? styles.dotGreen :
                styles.dotRed
              } />
              {dbCheck.status === 'loading' ? 'Checking' :
               dbCheck.status === 'ok' ? 'Connected' :
               'Error'}
            </span>
          </div>
          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>latency</span>
              <span className={dbCheck.latencyMs !== null ? styles.rowValue : styles.rowValueNull}>
                {dbCheck.latencyMs !== null ? `${dbCheck.latencyMs}ms` : '...'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>product_count</span>
              <span className={dbCheck.productCount !== null ? styles.rowValue : styles.rowValueNull}>
                {dbCheck.productCount !== null ? String(dbCheck.productCount) : dbCheck.error ? 'N/A' : '...'}
              </span>
            </div>
            {dbCheck.error && (
              <div className={styles.row}>
                <span className={styles.rowLabel}>error</span>
                <span className={styles.rowValue} style={{ color: '#ef4444' }}>
                  {dbCheck.error}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Environment */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Globe size={16} className={styles.cardIcon} />
            <span className={styles.cardTitle}>Environment</span>
          </div>
          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>supabase_url</span>
              <span className={styles.rowValue}>
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>supabase_anon_key</span>
              <span className={styles.rowValue}>
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>origin</span>
              <span className={styles.rowValue}>
                {origin}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>user_agent</span>
              <span className={styles.rowValue} style={{ fontSize: '0.7rem' }}>
                {userAgent}
              </span>
            </div>
          </div>
        </div>
      </div>

      <button
        className={styles.refreshBtn}
        onClick={runAllChecks}
        disabled={refreshing}
      >
        <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
        {refreshing ? 'Refreshing...' : 'Refresh All Checks'}
      </button>

      <p className={styles.timestamp}>
        Last refreshed: {formatTime(lastRefresh)}
      </p>
    </main>
  )
}
