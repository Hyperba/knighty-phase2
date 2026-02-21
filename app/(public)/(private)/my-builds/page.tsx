'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Heart, 
  Crown, 
  Sparkles, 
  ArrowRight, 
  MessageSquare,
  Package,
  Search,
  BookmarkCheck,
  Unlock,
  Star,
  ChevronLeft,
  ChevronRight,
  Layers,
  Zap
} from 'lucide-react'
import { useAuth } from '@/components/contexts/AuthContext'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import BuildCard from '@/components/ui/BuildCard/BuildCard'
import { ProductCard, TIER_LABELS, TIER_COLORS, UserTier } from '@/lib/types/product'
import styles from './page.module.css'

const TIER_ORDER: UserTier[] = ['explorer', 'access', 'builder', 'architect']
const ITEMS_PER_PAGE = 16

function getTierLevel(tier: UserTier): number {
  const levels: Record<UserTier, number> = {
    explorer: 0,
    access: 1,
    builder: 2,
    architect: 3,
    admin: 4
  }
  return levels[tier] ?? 0
}

export default function MyBuildsPage() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'liked'>('all')
  const [likedBuilds, setLikedBuilds] = useState<ProductCard[]>([])
  const [accessibleBuilds, setAccessibleBuilds] = useState<ProductCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const userTier = profile?.tier || 'explorer'
  const userTierLevel = getTierLevel(userTier as UserTier)

  useEffect(() => {
    const fetchBuilds = async () => {
      if (!user) return
      setLoading(true)

      const supabase = getSupabaseBrowserClient()

      try {
        const { data: likedIds } = await supabase
          .from('product_likes')
          .select('product_id')
          .eq('user_id', user.id)

        if (likedIds && likedIds.length > 0) {
          const productIds = likedIds.map(l => l.product_id)
          const { data: likedProducts } = await supabase
            .from('products')
            .select('id, slug, title, subtitle, image_url, tags, build_type, theme_category, difficulty, tier, minimum_likes, created_at')
            .in('id', productIds)
            .eq('is_published', true)

          if (likedProducts) {
            const formatted = likedProducts.map(p => ({
              ...p,
              total_likes: p.minimum_likes || 0
            }))
            setLikedBuilds(formatted as ProductCard[])
          }
        }

        const { data: accessibleData } = await supabase.rpc('browse_products', {
          p_page: 1,
          p_per_page: 200
        })
        if (accessibleData?.status === 'success') {
          const accessible = (accessibleData.products || []).filter((p: ProductCard) => {
            const buildTierLevel = getTierLevel(p.tier)
            return buildTierLevel <= userTierLevel
          })
          setAccessibleBuilds(accessible)
        }
      } catch (err) {
        console.error('Failed to fetch builds:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBuilds()
  }, [user, userTierLevel])

  const filteredLikedBuilds = likedBuilds.filter(build =>
    build.title.toLowerCase().includes(search.toLowerCase())
  )

  const filteredAccessibleBuilds = accessibleBuilds.filter(build =>
    build.title.toLowerCase().includes(search.toLowerCase())
  )

  const allDisplayBuilds = activeTab === 'liked' ? filteredLikedBuilds : filteredAccessibleBuilds
  const totalPages = Math.ceil(allDisplayBuilds.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const displayBuilds = allDisplayBuilds.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, search])

  const tierInfo = {
    explorer: { icon: <Package size={20} />, desc: 'Access to all free community builds' },
    access: { icon: <Unlock size={20} />, desc: 'Access tier unlocks additional builds' },
    builder: { icon: <Star size={20} />, desc: 'Builder tier with premium content' },
    architect: { icon: <Crown size={20} />, desc: 'Full access to all builds' },
    admin: { icon: <Sparkles size={20} />, desc: 'Administrator access' }
  }

  return (
    <main className={styles.myBuilds}>
      <div className={styles.heroSection}>
        <div className={styles.heroGlow} />
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerBadge}>
              <Layers size={14} />
              Personal Library
            </div>
            <h1 className={styles.title}>My <span className={styles.titleAccent}>Builds</span></h1>
            <p className={styles.subtitle}>
              Your liked and accessible builds, all in one place
            </p>
          </div>
          <div className={styles.tierCard}>
            <div className={styles.tierCardGlow} style={{ background: TIER_COLORS[userTier as UserTier] }} />
            <div className={styles.tierIcon} style={{ background: TIER_COLORS[userTier as UserTier] }}>
              {tierInfo[userTier as keyof typeof tierInfo]?.icon}
            </div>
            <div className={styles.tierInfo}>
              <span className={styles.tierLabel}>Current Tier</span>
              <span className={styles.tierName} style={{ color: TIER_COLORS[userTier as UserTier] }}>
                {TIER_LABELS[userTier as UserTier]}
              </span>
            </div>
            <span className={styles.tierDesc}>
              {tierInfo[userTier as keyof typeof tierInfo]?.desc}
            </span>
          </div>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <div className={styles.statIconWrap}>
              <Heart size={16} />
            </div>
            <div className={styles.statText}>
              <span className={styles.statValue}>{likedBuilds.length}</span>
              <span className={styles.statLabel}>Liked</span>
            </div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <div className={styles.statIconWrap}>
              <Unlock size={16} />
            </div>
            <div className={styles.statText}>
              <span className={styles.statValue}>{accessibleBuilds.length}</span>
              <span className={styles.statLabel}>Accessible</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.controls}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Unlock size={16} />
              Accessible
              <span className={styles.tabCount}>{filteredAccessibleBuilds.length}</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'liked' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('liked')}
            >
              <Heart size={16} />
              Liked
              <span className={styles.tabCount}>{filteredLikedBuilds.length}</span>
            </button>
          </div>

          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search your builds..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading your builds...</p>
          </div>
        ) : displayBuilds.length === 0 ? (
          <div className={styles.emptyState}>
            {activeTab === 'liked' ? (
              <>
                <div className={styles.emptyIconWrap}>
                  <Heart size={28} />
                </div>
                <h3>No Liked Builds Yet</h3>
                <p>Explore the build catalog and heart the ones you love — they&apos;ll appear here for easy access.</p>
                <Link href="/builds" className={styles.browseBtn}>
                  Browse Builds
                  <ArrowRight size={16} />
                </Link>
              </>
            ) : (
              <>
                <div className={styles.emptyIconWrap}>
                  <Package size={28} />
                </div>
                <h3>No Builds Available</h3>
                <p>Upgrade your tier to unlock premium builds and exclusive content.</p>
                <Link href="/pricing" className={styles.browseBtn}>
                  View Plans
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <div className={styles.buildsGrid}>
              {displayBuilds.map((build) => (
                <BuildCard key={build.id} product={build} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
                <div className={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`${styles.pageNumBtn} ${page === currentPage ? styles.pageNumActive : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <section className={styles.bottomCards}>
        <div className={styles.upgradeCard}>
          <div className={styles.upgradeCardGlow} />
          <Crown size={28} className={styles.upgradeIcon} />
          <h3>Unlock More Builds</h3>
          <p>
            Upgrade your tier to access premium builds, exclusive content, 
            and priority support.
          </p>
          <div className={styles.tierBadges}>
            {TIER_ORDER.map((tier) => (
              <span 
                key={tier} 
                className={`${styles.tierBadge} ${getTierLevel(tier) <= userTierLevel ? styles.unlocked : ''}`}
                style={{ borderColor: TIER_COLORS[tier] }}
              >
                {getTierLevel(tier) <= userTierLevel && <BookmarkCheck size={12} />}
                {TIER_LABELS[tier]}
              </span>
            ))}
          </div>
          <Link href="/pricing" className={styles.upgradeBtn}>
            <Sparkles size={16} />
            View Plans
          </Link>
        </div>

        <div className={styles.ctaCard}>
          <MessageSquare size={28} className={styles.ctaCardIcon} />
          <h3>Custom Build Request</h3>
          <p>
            Need something unique? Our team creates custom Minecraft builds 
            tailored to your vision.
          </p>
          <div className={styles.ctaFeatures}>
            <span><Star size={13} /> Pro Quality</span>
            <span><Zap size={13} /> Fast Delivery</span>
          </div>
          <Link href="/contact" className={styles.ctaBtn}>
            Get in Touch
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  )
}
