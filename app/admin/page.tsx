'use client'

import { useState, useEffect } from 'react'
import { 
  Package, 
  Users, 
  Mail, 
  Newspaper,
  PlusCircle,
  Eye,
  Download,
  BarChart3,
  Heart,
  UserPlus
} from 'lucide-react'
import { useAuth } from '@/components/contexts/AuthContext'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import StatCard from '@/components/admin/StatCard'
import QuickAction from '@/components/admin/QuickAction'
import styles from './page.module.css'

interface DashboardStats {
  total_builds: number
  published_builds: number
  total_members: number
  members_by_tier: Record<string, number>
  total_subscribers: number
  total_messages: number
  unread_messages: number
  total_downloads: number
}

interface RecentActivity {
  recent_messages: Array<{
    id: string
    name: string
    email: string
    project_type: string
    is_read: boolean
    created_at: string
  }>
  recent_signups: Array<{
    id: string
    handle: string
    display_name: string
    avatar_url: string
    tier: string
    created_at: string
  }>
  recent_likes: Array<{
    id: string
    created_at: string
    user: { id: string; handle: string; avatar_url: string }
    product: { id: string; title: string; slug: string }
  }>
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function Admin() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<RecentActivity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabaseBrowserClient()

      try {
        const [statsRes, activityRes] = await Promise.all([
          supabase.rpc('admin_get_dashboard_stats'),
          supabase.rpc('admin_get_recent_activity', { p_limit: 5 })
        ])

        if (statsRes.data?.status === 'success') {
          setStats(statsRes.data.stats)
        }

        if (activityRes.data?.status === 'success') {
          setActivity({
            recent_messages: activityRes.data.recent_messages || [],
            recent_signups: activityRes.data.recent_signups || [],
            recent_likes: activityRes.data.recent_likes || []
          })
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>
          {getGreeting()}, {profile?.display_name || 'Admin'}
        </h1>
        <p className={styles.subtitle}>Here&apos;s your platform overview</p>
      </header>

      <div className={styles.statsGrid}>
        <StatCard
          title="Total Builds"
          value={loading ? '...' : stats?.total_builds || 0}
          subtitle={stats ? `${stats.published_builds} published` : undefined}
          icon={<Package size={24} />}
          iconColor="green"
          href="/admin/builds"
        />
        <StatCard
          title="Total Members"
          value={loading ? '...' : stats?.total_members || 0}
          icon={<Users size={24} />}
          iconColor="purple"
          href="/admin/members"
        />
        <StatCard
          title="Newsletter"
          value={loading ? '...' : stats?.total_subscribers || 0}
          subtitle="subscribers"
          icon={<Newspaper size={24} />}
          iconColor="blue"
          href="/admin/newsletter"
        />
        <StatCard
          title="Messages"
          value={loading ? '...' : stats?.total_messages || 0}
          subtitle={stats?.unread_messages ? `${stats.unread_messages} unread` : undefined}
          icon={<Mail size={24} />}
          iconColor={stats?.unread_messages ? 'red' : 'orange'}
          href="/admin/messages"
        />
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
        </div>
        <div className={styles.quickActionsGrid}>
          <QuickAction
            title="Publish New Build"
            description="Create and publish a new Minecraft build"
            icon={<PlusCircle size={18} />}
            href="/admin/publish-build"
            variant="primary"
          />
          <QuickAction
            title="View All Builds"
            description="Manage existing builds"
            icon={<Eye size={18} />}
            href="/admin/builds"
          />
          <QuickAction
            title="Export Newsletter"
            description="Download subscriber emails as CSV"
            icon={<Download size={18} />}
            href="/admin/newsletter"
          />
          <QuickAction
            title="View Analytics"
            description="Check platform performance"
            icon={<BarChart3 size={18} />}
            href="/admin/analytics"
          />
        </div>
      </section>

      <div className={styles.twoColumnLayout}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Messages</h2>
            <a href="/admin/messages" className={styles.sectionLink}>View all</a>
          </div>
          <div className={styles.activityList}>
            {!activity?.recent_messages?.length ? (
              <div className={styles.emptyState}>No recent messages</div>
            ) : (
              activity.recent_messages.map((msg) => (
                <div key={msg.id} className={styles.activityItem}>
                  <div className={`${styles.activityIcon} ${styles.message}`}>
                    <Mail size={16} />
                  </div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityTitle}>
                      {msg.name}
                      {!msg.is_read && <span className={styles.unreadBadge}>New</span>}
                    </div>
                    <div className={styles.activityMeta}>{msg.project_type}</div>
                  </div>
                  <span className={styles.activityTime}>{formatRelativeTime(msg.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Signups</h2>
            <a href="/admin/members" className={styles.sectionLink}>View all</a>
          </div>
          <div className={styles.activityList}>
            {!activity?.recent_signups?.length ? (
              <div className={styles.emptyState}>No recent signups</div>
            ) : (
              activity.recent_signups.slice(0, 5).map((user) => (
                <div key={user.id} className={styles.activityItem}>
                  <div className={`${styles.activityIcon} ${styles.signup}`}>
                    <UserPlus size={16} />
                  </div>
                  <div className={styles.activityContent}>
                    <a
                      href={`/${user.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.activityLink}
                    >
                      @{user.handle}
                    </a>
                    <div className={styles.activityMeta}>{user.display_name}</div>
                  </div>
                  <span className={styles.activityTime}>{formatRelativeTime(user.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {activity?.recent_likes && activity.recent_likes.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Likes</h2>
          </div>
          <div className={styles.activityList}>
            {activity.recent_likes.slice(0, 5).map((like) => (
              <div key={like.id} className={styles.activityItem}>
                <div className={`${styles.activityIcon} ${styles.like}`}>
                  <Heart size={16} />
                </div>
                <div className={styles.activityContent}>
                  <div className={styles.activityTitle}>
                    <a
                      href={`/${like.user.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.activityLink}
                    >
                      @{like.user.handle}
                    </a>
                    {' '}liked &quot;{like.product.title}&quot;
                  </div>
                </div>
                <span className={styles.activityTime}>{formatRelativeTime(like.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}