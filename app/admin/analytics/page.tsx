'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Users, Search, Eye, Heart, Download, BarChart3, X } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { TIER_COLORS, TIER_LABELS } from '@/lib/types/product'
import styles from './page.module.css'

interface AnalyticsData {
  page_views_by_day: Array<{ date: string; views: number }>
  top_pages: Array<{ page_path: string; views: number }>
  traffic_sources: Array<{ source: string; visits: number; signups: number }>
  signups_by_day: Array<{ date: string; signups: number }>
}

interface MembersByTier {
  [tier: string]: number
}

interface BuildSearchResult {
  id: string
  title: string
  slug: string
  image_url: string | null
  tier: string
  is_published: boolean
}

interface BuildAnalytics {
  product: { id: string; title: string; slug: string; image_url: string | null }
  total_views: number
  unique_viewers: number
  total_likes: number
  total_downloads: number
  views_by_day: Array<{ date: string; views: number }>
}

const RANGE_OPTIONS: { label: string; value: number }[] = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1 Year', value: 365 },
  { label: 'Lifetime', value: 0 },
]

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminAnalyticsPage() {
  const supabase = getSupabaseBrowserClient()
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [membersByTier, setMembersByTier] = useState<MembersByTier>({})
  const [totalMembers, setTotalMembers] = useState(0)

  // Build analytics state
  const [buildQuery, setBuildQuery] = useState('')
  const [buildResults, setBuildResults] = useState<BuildSearchResult[]>([])
  const [buildSearching, setBuildSearching] = useState(false)
  const [selectedBuild, setSelectedBuild] = useState<BuildAnalytics | null>(null)
  const [buildLoading, setBuildLoading] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const [analyticsRes, statsRes] = await Promise.all([
        supabase.rpc('admin_get_analytics', { p_days: days === 0 ? 36500 : days }),
        supabase.rpc('admin_get_dashboard_stats'),
      ])

      if (analyticsRes.data?.status === 'success') {
        setData({
          page_views_by_day: analyticsRes.data.page_views_by_day || [],
          top_pages: analyticsRes.data.top_pages || [],
          traffic_sources: analyticsRes.data.traffic_sources || [],
          signups_by_day: analyticsRes.data.signups_by_day || []
        })
      }

      if (statsRes.data?.status === 'success' && statsRes.data.stats) {
        setMembersByTier(statsRes.data.stats.members_by_tier || {})
        setTotalMembers(statsRes.data.stats.total_members || 0)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, days])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Debounced build search
  const searchBuilds = useCallback(async (query: string) => {
    if (!query.trim()) {
      setBuildResults([])
      return
    }
    setBuildSearching(true)
    try {
      const { data: res } = await supabase.rpc('admin_search_builds', { p_query: query.trim() })
      if (res?.status === 'success') {
        setBuildResults(res.builds || [])
      }
    } catch {
      // ignore
    } finally {
      setBuildSearching(false)
    }
  }, [supabase])

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!buildQuery.trim()) {
      setBuildResults([])
      return
    }
    searchTimeoutRef.current = setTimeout(() => searchBuilds(buildQuery), 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [buildQuery, searchBuilds])

  const selectBuild = async (buildId: string) => {
    setBuildLoading(true)
    setBuildResults([])
    setBuildQuery('')
    try {
      const { data: res } = await supabase.rpc('admin_get_build_analytics', { p_product_id: buildId })
      if (res?.status === 'success') {
        setSelectedBuild({
          product: res.product,
          total_views: Number(res.total_views) || 0,
          unique_viewers: Number(res.unique_viewers) || 0,
          total_likes: Number(res.total_likes) || 0,
          total_downloads: Number(res.total_downloads) || 0,
          views_by_day: res.views_by_day || [],
        })
      }
    } catch {
      // ignore
    } finally {
      setBuildLoading(false)
    }
  }

  const totalPageViews = data?.page_views_by_day?.reduce((sum, d) => sum + Number(d.views), 0) || 0
  const totalSignups = data?.signups_by_day?.reduce((sum, d) => sum + Number(d.signups), 0) || 0
  const totalVisits = data?.traffic_sources?.reduce((sum, s) => sum + Number(s.visits), 0) || 0
  const maxSourceVisits = Math.max(...(data?.traffic_sources?.map(s => Number(s.visits)) || [1]))

  // Compute max for page views chart
  const maxPageViews = Math.max(...(data?.page_views_by_day?.map(d => Number(d.views)) || [1]))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>Platform performance overview</p>
        </div>
        <div className={styles.dateRange}>
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.rangeBtn} ${days === opt.value ? styles.active : ''}`}
              onClick={() => setDays(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}>Loading analytics...</div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Page Views</span>
              <span className={styles.statValue}>{totalPageViews.toLocaleString()}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>New Signups</span>
              <span className={styles.statValue}>{totalSignups.toLocaleString()}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Traffic Sources</span>
              <span className={styles.statValue}>{data?.traffic_sources?.length || 0}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Visits</span>
              <span className={styles.statValue}>{totalVisits.toLocaleString()}</span>
            </div>
          </div>

          {/* Member Tier Breakdown */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>
              <Users size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Members by Tier ({totalMembers.toLocaleString()} total)
            </h3>
            <div className={styles.tierGrid}>
              {Object.entries(membersByTier).map(([tier, count]) => {
                const color = TIER_COLORS[tier as keyof typeof TIER_COLORS] || '#8b5cf6'
                const label = TIER_LABELS[tier as keyof typeof TIER_LABELS] || tier
                const pct = totalMembers > 0 ? ((Number(count) / totalMembers) * 100).toFixed(1) : '0'
                return (
                  <div key={tier} className={styles.tierItem}>
                    <div className={styles.tierItemHeader}>
                      <span className={styles.tierDot} style={{ background: color }} />
                      <span className={styles.tierLabel}>{label}</span>
                      <span className={styles.tierCount}>{Number(count).toLocaleString()}</span>
                    </div>
                    <div className={styles.tierBar}>
                      <div
                        className={styles.tierBarFill}
                        style={{
                          width: `${totalMembers > 0 ? (Number(count) / totalMembers) * 100 : 0}%`,
                          background: color,
                        }}
                      />
                    </div>
                    <span className={styles.tierPct}>{pct}%</span>
                  </div>
                )
              })}
              {Object.keys(membersByTier).length === 0 && (
                <div className={styles.emptyState}>No member data available</div>
              )}
            </div>
          </div>

          {/* Page Views Over Time - real bar chart */}
          <div className={`${styles.chartCard} ${styles.full}`}>
            <h3 className={styles.chartTitle}>Page Views Over Time</h3>
            {!data?.page_views_by_day?.length ? (
              <div className={styles.emptyState}>No page view data for this period</div>
            ) : (
              <div className={styles.barChart}>
                <div className={styles.barChartBars}>
                  {data.page_views_by_day.map((d) => {
                    const pct = maxPageViews > 0 ? (Number(d.views) / maxPageViews) * 100 : 0
                    return (
                      <div key={d.date} className={styles.barCol} title={`${formatShortDate(d.date)}: ${Number(d.views).toLocaleString()} views`}>
                        <span className={styles.barValue}>{Number(d.views)}</span>
                        <div className={styles.bar} style={{ height: `${Math.max(pct, 2)}%` }} />
                        <span className={styles.barLabel}>{formatShortDate(d.date)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Traffic Sources</h3>
              {!data?.traffic_sources?.length ? (
                <div className={styles.emptyState}>No traffic data yet</div>
              ) : (
                <div className={styles.sourcesList}>
                  {data.traffic_sources.map((source) => (
                    <div key={source.source} className={styles.sourceItem}>
                      <span className={styles.sourceName}>{source.source}</span>
                      <div className={styles.sourceBar}>
                        <div 
                          className={styles.sourceBarFill}
                          style={{ width: `${(Number(source.visits) / maxSourceVisits) * 100}%` }}
                        />
                      </div>
                      <span className={styles.sourceValue}>{Number(source.visits).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Top Pages</h3>
              {!data?.top_pages?.length ? (
                <div className={styles.emptyState}>No page view data yet</div>
              ) : (
                <div className={styles.topPagesList}>
                  {data.top_pages.slice(0, 8).map((page) => (
                    <div key={page.page_path} className={styles.pageItem}>
                      <span className={styles.pagePath}>{page.page_path}</span>
                      <span className={styles.pageViews}>{Number(page.views).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Build Analytics Section */}
          <div className={`${styles.chartCard} ${styles.full}`}>
            <h3 className={styles.chartTitle}>
              <BarChart3 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Build Analytics
            </h3>

            <div className={styles.buildSearchWrapper}>
              <div className={styles.buildSearchBar}>
                <Search size={16} className={styles.buildSearchIcon} />
                <input
                  type="text"
                  placeholder="Search for a build by name or slug..."
                  value={buildQuery}
                  onChange={(e) => setBuildQuery(e.target.value)}
                  className={styles.buildSearchInput}
                />
                {buildQuery && (
                  <button type="button" className={styles.buildSearchClear} onClick={() => { setBuildQuery(''); setBuildResults([]) }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {buildResults.length > 0 && (
                <div className={styles.buildSearchDropdown}>
                  {buildResults.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={styles.buildSearchItem}
                      onClick={() => selectBuild(b.id)}
                    >
                      {b.image_url ? (
                        <img src={b.image_url} alt="" className={styles.buildSearchThumb} />
                      ) : (
                        <div className={styles.buildSearchThumbPlaceholder} />
                      )}
                      <div className={styles.buildSearchItemInfo}>
                        <span className={styles.buildSearchItemTitle}>{b.title}</span>
                        <span className={styles.buildSearchItemSlug}>/{b.slug}</span>
                      </div>
                      <span
                        className={styles.buildSearchItemTier}
                        style={{ color: TIER_COLORS[b.tier as keyof typeof TIER_COLORS] || '#8b5cf6' }}
                      >
                        {TIER_LABELS[b.tier as keyof typeof TIER_LABELS] || b.tier}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {buildSearching && <div className={styles.buildSearchHint}>Searching...</div>}
            </div>

            {buildLoading && <div className={styles.emptyState}>Loading build analytics...</div>}

            {!buildLoading && selectedBuild && (
              <div className={styles.buildAnalyticsResult}>
                <div className={styles.buildAnalyticsHeader}>
                  {selectedBuild.product.image_url ? (
                    <img src={selectedBuild.product.image_url} alt="" className={styles.buildAnalyticsImage} />
                  ) : (
                    <div className={styles.buildAnalyticsImagePlaceholder} />
                  )}
                  <div>
                    <h4 className={styles.buildAnalyticsName}>{selectedBuild.product.title}</h4>
                    <span className={styles.buildAnalyticsSlug}>/{selectedBuild.product.slug}</span>
                  </div>
                  <button type="button" className={styles.buildAnalyticsClose} onClick={() => setSelectedBuild(null)}>
                    <X size={16} />
                  </button>
                </div>

                <div className={styles.buildStatsGrid}>
                  <div className={styles.buildStatCard}>
                    <Eye size={18} className={styles.buildStatIcon} />
                    <span className={styles.buildStatValue}>{selectedBuild.total_views.toLocaleString()}</span>
                    <span className={styles.buildStatLabel}>Total Views</span>
                  </div>
                  <div className={styles.buildStatCard}>
                    <Users size={18} className={styles.buildStatIcon} />
                    <span className={styles.buildStatValue}>{selectedBuild.unique_viewers.toLocaleString()}</span>
                    <span className={styles.buildStatLabel}>Unique Viewers</span>
                  </div>
                  <div className={styles.buildStatCard}>
                    <Heart size={18} className={styles.buildStatIcon} />
                    <span className={styles.buildStatValue}>{selectedBuild.total_likes.toLocaleString()}</span>
                    <span className={styles.buildStatLabel}>Likes</span>
                  </div>
                  <div className={styles.buildStatCard}>
                    <Download size={18} className={styles.buildStatIcon} />
                    <span className={styles.buildStatValue}>{selectedBuild.total_downloads.toLocaleString()}</span>
                    <span className={styles.buildStatLabel}>Downloads</span>
                  </div>
                </div>

                {selectedBuild.views_by_day.length > 0 && (
                  <div className={styles.buildViewsChart}>
                    <h5 className={styles.buildViewsChartTitle}>Views (Last 30 Days)</h5>
                    <div className={styles.barChart}>
                      <div className={styles.barChartBars}>
                        {selectedBuild.views_by_day.map((d) => {
                          const maxV = Math.max(...selectedBuild.views_by_day.map(x => Number(x.views)))
                          const pct = maxV > 0 ? (Number(d.views) / maxV) * 100 : 0
                          return (
                            <div key={d.date} className={styles.barCol} title={`${formatShortDate(d.date)}: ${Number(d.views)} views`}>
                              <span className={styles.barValue}>{Number(d.views)}</span>
                              <div className={styles.bar} style={{ height: `${Math.max(pct, 2)}%` }} />
                              <span className={styles.barLabel}>{formatShortDate(d.date)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!buildLoading && !selectedBuild && !buildQuery && (
              <div className={styles.emptyState}>Search for a build above to view its analytics</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
