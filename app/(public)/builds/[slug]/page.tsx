'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Heart, Download, Share2, Monitor, Lock, Tag } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/contexts/AuthContext'
import { trackAll } from '@/lib/analytics/track'
import ConfirmModal from '@/components/ui/ConfirmModal/ConfirmModal'
import type { Product, UserTier } from '@/lib/types/product'
import { TIER_LABELS, TIER_COLORS, DIFFICULTY_LABELS } from '@/lib/types/product'
import styles from './page.module.css'

interface ProductResponse {
  status: string
  product?: Product
  message?: string
}

interface AccessResponse {
  has_access: boolean
  reason?: string
  user_tier?: UserTier
  required_tier?: UserTier
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user, profile } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'about' | 'guide'>('about')
  const [liked, setLiked] = useState(false)
  const [totalLikes, setTotalLikes] = useState(0)
  const [hasAccess, setHasAccess] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalAction, setAuthModalAction] = useState<string>('')

  const fetchProduct = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_product_by_slug', {
        p_slug: slug
      })

      if (error) throw error

      const result = data as ProductResponse
      if (result.status === 'found' && result.product) {
        setProduct(result.product)
        setLiked(result.product.user_liked)
        setTotalLikes(result.product.total_likes)
      } else {
        setProduct(null)
      }
    } catch (err) {
      console.error('Error fetching product:', err)
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }, [supabase, slug])

  const checkAccess = useCallback(async () => {
    if (!product || !user) {
      setHasAccess(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('check_product_access', {
        p_product_id: product.id
      })

      if (error) throw error

      const result = data as AccessResponse
      setHasAccess(result.has_access)
    } catch (err) {
      console.error('Error checking access:', err)
      setHasAccess(false)
    }
  }, [supabase, product, user])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  useEffect(() => {
    if (product) {
      checkAccess()
      trackAll('build_view', {
        build_id: product.id,
        slug: product.slug,
        title: product.title,
        tier: product.tier,
      })
    }
  }, [product, checkAccess])

  const handleLike = async () => {
    if (!user) {
      setAuthModalAction('like this build')
      setShowAuthModal(true)
      return
    }

    if (likeLoading) return
    setLikeLoading(true)

    try {
      const { data, error } = await supabase.rpc('toggle_product_like', {
        p_product_id: product!.id
      })

      if (error) throw error

      const result = data as { status: string; liked: boolean; total_likes: number }
      if (result.status === 'success') {
        setLiked(result.liked)
        setTotalLikes(result.total_likes)
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    } finally {
      setLikeLoading(false)
    }
  }

  const handleDownload = () => {
    if (!user) {
      setAuthModalAction('download this build')
      setShowAuthModal(true)
      return
    }

    if (!hasAccess) {
      setAuthModalAction(`access this download. You need the ${TIER_LABELS[product!.tier]} tier or higher`)
      setShowAuthModal(true)
      return
    }

    if (product?.download_url) {
      trackAll('download_click', {
        build_id: product.id,
        slug: product.slug,
        title: product.title,
        tier: product.tier,
      })
      window.open(product.download_url, '_blank')
    }
  }

  const handleGuideAccess = () => {
    if (!user) {
      setAuthModalAction('view this guide')
      setShowAuthModal(true)
      return
    }

    if (!hasAccess) {
      return
    }

    setActiveTab('guide')
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.title,
          text: product?.subtitle,
          url
        })
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days < 1) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    if (days < 365) return `${Math.floor(days / 30)} months ago`
    return `${Math.floor(days / 365)} years ago`
  }

  if (loading) {
    return (
      <main className={styles.productPage}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading build...</p>
        </div>
      </main>
    )
  }

  if (!product) {
    return (
      <main className={styles.productPage}>
        <div className={styles.notFound}>
          <h1>Build Not Found</h1>
          <p>The build you're looking for doesn't exist or has been removed.</p>
          <Link href="/builds" className={styles.backBtn}>
            <ArrowLeft size={18} />
            Back to Builds
          </Link>
        </div>
      </main>
    )
  }

  const userTier = profile?.tier || 'explorer'
  const canAccessGuide = user && hasAccess

  return (
    <main className={styles.productPage}>
      <Link href="/builds" className={styles.backLink}>
        <ArrowLeft size={18} />
        BACK TO BUILDS
      </Link>

      <h1 className={styles.title}>{product.title}</h1>

      <div className={styles.tags}>
        {product.tags.map(tag => (
          <Link 
            key={tag} 
            href={`/builds?q=${encodeURIComponent(tag)}`}
            className={styles.tag}
          >
            <Tag size={12} />
            {tag.toUpperCase()}
          </Link>
        ))}
      </div>

      <div className={styles.content}>
        <div className={styles.imageSection}>
          <div className={styles.imageWrapper}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} />
            ) : (
              <div style={{ width: '100%', height: '100%', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.08))', color: 'rgba(255,255,255,0.3)', fontSize: '1rem' }}>
                No image available
              </div>
            )}
            <div className={styles.likeBadge}>
              <Heart size={18} fill={liked ? '#ef4444' : 'none'} />
              {totalLikes.toLocaleString()}
            </div>
          </div>
        </div>

        <div className={styles.details}>
          <p className={styles.description}>{product.description}</p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>DIFFICULTY</span>
              <span className={styles.statValue}>{DIFFICULTY_LABELS[product.difficulty]}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>TIER</span>
              <span className={styles.statValue} style={{ color: TIER_COLORS[product.tier] }}>
                {TIER_LABELS[product.tier]}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>RELEASED</span>
              <span className={styles.statValue}>{getRelativeTime(product.created_at)}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button 
              className={`${styles.actionBtn} ${styles.downloadBtn}`}
              onClick={handleDownload}
            >
              DOWNLOAD
              {(!user || !hasAccess) ? <Lock size={16} /> : <Download size={16} />}
            </button>
            <button 
              className={`${styles.actionBtn} ${styles.likeBtn} ${liked ? styles.likeBtnActive : ''}`}
              onClick={handleLike}
              disabled={likeLoading}
            >
              {liked ? 'LIKED BUILD' : 'LIKE BUILD'}
              <Heart size={16} fill={liked ? '#fff' : 'none'} />
            </button>
          </div>

          <div className={styles.actions}>
            <button className={`${styles.actionBtn} ${styles.shareBtn}`} onClick={handleShare}>
              SHARE
              <Share2 size={16} />
            </button>
            <button 
              className={`${styles.actionBtn} ${styles.guideBtn}`}
              onClick={handleGuideAccess}
              disabled={!canAccessGuide}
            >
              BUILD GUIDE
              {canAccessGuide ? <Monitor size={16} /> : <Lock size={16} />}
            </button>
          </div>

          {product.publisher && (
            <div className={styles.publisher}>
              <span className={styles.publisherLabel}>Published by:</span>
              <Link href={`/${product.publisher.handle}`} className={styles.publisherInfo}>
                <img 
                  src={product.publisher.avatar_url || '/default-avatar.png'} 
                  alt={product.publisher.display_name}
                  className={styles.publisherAvatar}
                />
                <span>{product.publisher.display_name}</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'about' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('about')}
        >
          ABOUT
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'guide' ? styles.tabActive : ''}`}
          onClick={() => canAccessGuide ? setActiveTab('guide') : handleGuideAccess()}
        >
          GUIDE
          {!canAccessGuide && <Lock size={14} />}
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'about' ? (
          <div className={styles.aboutTab}>
            <h2 className={styles.tabTitle}>{product.title}</h2>
            <p className={styles.tabSubtitle}>{product.subtitle}</p>
            <p className={styles.tabDescription}>{product.description}</p>

            <div className={styles.tabMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>RELEASED:</span>
                <span className={styles.metaValue}>{formatDate(product.created_at)}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>BROWSE BY TAG:</span>
                <div className={styles.metaTags}>
                  {product.tags.map(tag => (
                    <Link 
                      key={tag}
                      href={`/builds?q=${encodeURIComponent(tag)}`}
                      className={styles.metaTag}
                    >
                      <Tag size={10} />
                      {tag.toUpperCase()}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : canAccessGuide ? (
          <div className={styles.guideTab}>
            {product.guide_url ? (
              <iframe 
                src={product.guide_url}
                className={styles.guideFrame}
                title={`${product.title} Guide`}
                allowFullScreen
              />
            ) : (
              <div className={styles.noGuide}>
                <p>No guide available for this build yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.lockedGuide}>
            <Lock size={48} />
            <h3>Guide Locked</h3>
            <p>
              {!user 
                ? 'Sign in to access this build guide.'
                : `This guide requires the ${TIER_LABELS[product.tier]} tier or higher. Your current tier is ${TIER_LABELS[userTier]}.`
              }
            </p>
            {!user ? (
              <div className={styles.lockedActions}>
                <Link href="/login" className={styles.lockedBtn}>Log In</Link>
                <Link href="/signup" className={styles.lockedBtnPrimary}>Sign Up</Link>
              </div>
            ) : (
              <Link href="/pricing" className={styles.lockedBtnPrimary}>
                Upgrade Your Plan
              </Link>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showAuthModal}
        title="Authentication Required"
        message={user 
          ? `You need to ${authModalAction}.`
          : `Please sign in or create an account to ${authModalAction}.`
        }
        confirmText={user ? 'View Pricing' : 'Sign Up'}
        cancelText={user ? 'Cancel' : 'Log In'}
        onConfirm={() => {
          setShowAuthModal(false)
          router.push(user ? '/pricing' : '/signup')
        }}
        onCancel={() => {
          setShowAuthModal(false)
          if (!user) router.push('/login')
        }}
      />
    </main>
  )
}
