'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Heart, Package, ExternalLink } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface LikedBuild {
  id: string
  title: string
  image_url: string
  slug: string
  liked_at: string
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

/**
 * Renders just the likes count stat (inline in the stats row).
 */
export function ProfileLikesStat({ userId }: { userId: string }) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabaseBrowserClient()

    supabase
      .from('product_likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count: c }) => {
        if (!cancelled) setCount(c || 0)
      })

    return () => { cancelled = true }
  }, [userId])

  return (
    <div className={styles.stat}>
      <Heart size={16} />
      <span className={styles.statValue}>{count !== null ? count : '...'}</span>
      <span className={styles.statLabel}>Likes</span>
    </div>
  )
}

/**
 * Renders the "Recently Liked Builds" grid section.
 */
export default function ProfileLikedBuilds({ userId }: { userId: string }) {
  const [builds, setBuilds] = useState<LikedBuild[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabaseBrowserClient()

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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (cancelled) return
        setBuilds(
          (data || [])
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
        setLoaded(true)
      })

    return () => { cancelled = true }
  }, [userId])

  if (!loaded) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recently Liked Builds</h2>
        <p className={styles.placeholder}>Loading...</p>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Recently Liked Builds</h2>
      {builds.length > 0 ? (
        <div className={styles.likedBuildsGrid}>
          {builds.map((build) => (
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
  )
}
