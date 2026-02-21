'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Heart, Shield, Award, Crown, Zap, Package, ExternalLink } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { TIER_LABELS, TIER_COLORS, UserTier } from '@/lib/types/product'
import styles from './page.module.css'

interface ProfileData {
  id: string
  handle: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  tier: UserTier
  created_at: string
}

interface LikedBuild {
  id: string
  title: string
  image_url: string
  slug: string
  liked_at: string
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function formatRelativeDate(dateString: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

function TierIcon({ tier }: { tier: UserTier }) {
  switch (tier) {
    case 'admin':
      return <Shield size={14} />
    case 'architect':
      return <Crown size={14} />
    case 'builder':
      return <Award size={14} />
    case 'access':
      return <Zap size={14} />
    default:
      return <Package size={14} />
  }
}

export default function ProfilePage() {
  const params = useParams()
  const handle = params.handle as string
  const supabase = getSupabaseBrowserClient()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const [likesCount, setLikesCount] = useState(0)
  const [likedBuilds, setLikedBuilds] = useState<LikedBuild[]>([])

  // Fetch profile data
  useEffect(() => {
    let cancelled = false

    const fetchProfile = async () => {
      setLoading(true)
      setNotFound(false)

      try {
        const { data, error } = await supabase.rpc('get_profile_by_handle', {
          p_handle: handle,
        })

        if (cancelled) return

        if (error || !data || data.status === 'not_found') {
          setNotFound(true)
          setLoading(false)
          return
        }

        const p = data.profile as ProfileData
        setProfile(p)
        setLoading(false)

        // Fetch likes in parallel once we have the profile ID
        const [countRes, buildsRes] = await Promise.all([
          supabase
            .from('product_likes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', p.id),
          supabase
            .from('product_likes')
            .select(`
              created_at,
              products:product_id (
                id,
                title,
                image_url,
                slug
              )
            `)
            .eq('user_id', p.id)
            .order('created_at', { ascending: false })
            .limit(6),
        ])

        if (cancelled) return

        setLikesCount(countRes.count || 0)
        setLikedBuilds(
          (buildsRes.data || [])
            .filter((item) => item.products)
            .map((item) => {
              const product = item.products as unknown as {
                id: string; title: string; image_url: string; slug: string
              }
              return {
                id: product.id,
                title: product.title,
                image_url: product.image_url,
                slug: product.slug,
                liked_at: item.created_at,
              }
            })
        )
      } catch {
        if (!cancelled) {
          setNotFound(true)
          setLoading(false)
        }
      }
    }

    fetchProfile()
    return () => { cancelled = true }
  }, [handle, supabase])

  // --- Loading state ---
  if (loading) {
    return (
      <main className={styles.profile}>
        <div className={styles.coverSection}>
          <div className={styles.coverPlaceholder} />
        </div>
        <div className={styles.profileContent}>
          <div className={styles.headerRow}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarPlaceholder} style={{ opacity: 0.4 }} />
            </div>
          </div>
          <p className={styles.handle} style={{ opacity: 0.3 }}>Loading profile...</p>
        </div>
      </main>
    )
  }

  // --- Not found state ---
  if (notFound || !profile) {
    return (
      <main className={styles.profile}>
        <div className={styles.coverSection}>
          <div className={styles.coverPlaceholder} />
        </div>
        <div className={styles.profileContent}>
          <div className={styles.placeholder} style={{ marginTop: '2rem' }}>
            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--heading-color)' }}>User Not Found</h2>
            <p style={{ margin: 0 }}>The user <strong>@{handle}</strong> doesn&apos;t exist or their profile has been removed.</p>
          </div>
        </div>
      </main>
    )
  }

  const tier = profile.tier

  return (
    <main className={styles.profile}>
      <div className={styles.coverSection}>
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="" className={styles.coverImage} />
        ) : (
          <div className={styles.coverPlaceholder} />
        )}
      </div>

      <div className={styles.profileContent}>
        <div className={styles.headerRow}>
          <div className={styles.avatarSection}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {profile.display_name?.charAt(0)?.toUpperCase() || '@'}
              </div>
            )}
          </div>
        </div>

        <div className={styles.info}>
          <div className={styles.nameRow}>
            <h1 className={styles.displayName}>
              {profile.display_name || profile.handle}
            </h1>
            <div
              className={styles.tierBadge}
              data-tier={tier}
              style={{ background: TIER_COLORS[tier] }}
            >
              <TierIcon tier={tier} />
              {TIER_LABELS[tier]}
            </div>
          </div>
          <p className={styles.handle}>@{profile.handle}</p>

          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <Heart size={16} />
              <span className={styles.statValue}>{likesCount}</span>
              <span className={styles.statLabel}>Likes</span>
            </div>
            <div className={styles.stat}>
              <Calendar size={16} />
              <span className={styles.statLabel}>Member since {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>

        <div className={styles.sections}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>About</h2>
            <div className={styles.aboutCard}>
              {profile.bio ? (
                <p className={styles.aboutText}>{profile.bio}</p>
              ) : (
                <p className={styles.emptyText}>This user hasn&apos;t added a bio yet.</p>
              )}

              <div className={styles.memberInfo}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Membership</span>
                  <span
                    className={styles.infoValue}
                    style={{ color: TIER_COLORS[tier] }}
                  >
                    {TIER_LABELS[tier]}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Joined</span>
                  <span className={styles.infoValue}>{formatDate(profile.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Recently Liked Builds</h2>
            {likedBuilds.length > 0 ? (
              <div className={styles.likedBuildsGrid}>
                {likedBuilds.map((build) => (
                  <Link
                    key={build.id}
                    href={`/builds/${build.slug}`}
                    className={styles.likedBuildCard}
                  >
                    <div className={styles.likedBuildImage}>
                      {build.image_url ? (
                        <img src={build.image_url} alt={build.title} />
                      ) : (
                        <div className={styles.likedBuildPlaceholder}>
                          <Package size={24} />
                        </div>
                      )}
                      <div className={styles.likedBuildOverlay}>
                        <ExternalLink size={16} />
                      </div>
                    </div>
                    <div className={styles.likedBuildInfo}>
                      <h4 className={styles.likedBuildTitle}>{build.title}</h4>
                      <span className={styles.likedBuildDate}>
                        <Heart size={12} />
                        {formatRelativeDate(build.liked_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={styles.placeholder}>No liked builds yet.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
