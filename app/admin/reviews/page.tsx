'use client'

import { useState, useEffect } from 'react'
import { Star, CheckCircle, XCircle, Trash2, RefreshCw, Award, Eye, EyeOff } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface Review {
  id: string
  user_id: string
  rating: number
  title: string
  body: string
  is_featured: boolean
  is_approved: boolean
  created_at: string
  updated_at: string
  handle: string
  display_name: string
  avatar_url: string | null
  tier: string
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'featured'>('all')
  const [total, setTotal] = useState(0)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchReviews = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data } = await supabase.rpc('admin_get_reviews', {
        p_status: filter === 'all' ? null : filter,
        p_limit: 100,
        p_offset: 0
      })

      if (data?.status === 'success') {
        setReviews(data.reviews || [])
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [filter])

  const toggleApproved = async (review: Review) => {
    setActionLoading(review.id)
    const supabase = getSupabaseBrowserClient()
    
    const { data } = await supabase.rpc('admin_update_review', {
      p_review_id: review.id,
      p_is_approved: !review.is_approved
    })

    if (data?.status === 'success') {
      setReviews(prev => prev.map(r => 
        r.id === review.id 
          ? { ...r, is_approved: !r.is_approved, is_featured: !review.is_approved ? r.is_featured : false }
          : r
      ))
      if (selectedReview?.id === review.id) {
        setSelectedReview({ ...selectedReview, is_approved: !review.is_approved })
      }
    }
    setActionLoading(null)
  }

  const toggleFeatured = async (review: Review) => {
    if (!review.is_approved) return
    setActionLoading(review.id)
    const supabase = getSupabaseBrowserClient()
    
    const { data } = await supabase.rpc('admin_update_review', {
      p_review_id: review.id,
      p_is_featured: !review.is_featured
    })

    if (data?.status === 'success') {
      setReviews(prev => prev.map(r => 
        r.id === review.id ? { ...r, is_featured: !r.is_featured } : r
      ))
      if (selectedReview?.id === review.id) {
        setSelectedReview({ ...selectedReview, is_featured: !review.is_featured })
      }
    }
    setActionLoading(null)
  }

  const deleteReview = async (review: Review) => {
    if (!confirm(`Delete review "${review.title}" by ${review.display_name || review.handle}?`)) return
    
    setActionLoading(review.id)
    const supabase = getSupabaseBrowserClient()
    
    const { data } = await supabase.rpc('admin_delete_review', {
      p_review_id: review.id
    })

    if (data?.status === 'success') {
      setReviews(prev => prev.filter(r => r.id !== review.id))
      if (selectedReview?.id === review.id) {
        setSelectedReview(null)
      }
      setTotal(prev => prev - 1)
    }
    setActionLoading(null)
  }

  const pendingCount = reviews.filter(r => !r.is_approved).length
  const featuredCount = reviews.filter(r => r.is_featured).length

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Reviews</h1>
          <p className={styles.subtitle}>
            {total} total • {pendingCount} pending • {featuredCount} featured
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchReviews} disabled={loading}>
          <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          Refresh
        </button>
      </header>

      <div className={styles.filters}>
        {(['all', 'pending', 'approved', 'featured'] as const).map(f => (
          <button 
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        <div className={styles.list}>
          <div className={styles.listScroll}>
            {loading ? (
              <div className={styles.loadingState}>Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className={styles.emptyState}>No reviews found</div>
            ) : (
              reviews.map(review => (
                <div 
                  key={review.id} 
                  className={`${styles.reviewItem} ${selectedReview?.id === review.id ? styles.selected : ''} ${!review.is_approved ? styles.pending : ''}`}
                  onClick={() => setSelectedReview(review)}
                >
                  <div className={styles.reviewItemHeader}>
                    <div className={styles.reviewAuthor}>
                      {review.avatar_url ? (
                        <img src={review.avatar_url} alt="" className={styles.avatar} />
                      ) : (
                        <div className={styles.avatarFallback}>
                          {(review.display_name || review.handle || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className={styles.authorName}>{review.display_name || review.handle}</span>
                        <span className={styles.authorTier}>{review.tier}</span>
                      </div>
                    </div>
                    <div className={styles.reviewRating}>
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} size={12} fill="#fbbf24" color="#fbbf24" />
                      ))}
                    </div>
                  </div>
                  <h4 className={styles.reviewItemTitle}>{review.title}</h4>
                  <p className={styles.reviewItemBody}>{review.body}</p>
                  <div className={styles.reviewItemMeta}>
                    <span className={styles.reviewDate}>{formatDate(review.created_at)}</span>
                    <div className={styles.reviewBadges}>
                      {review.is_featured && (
                        <span className={styles.featuredBadge}>
                          <Award size={10} /> Featured
                        </span>
                      )}
                      {!review.is_approved && (
                        <span className={styles.pendingBadge}>Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.detail}>
          {selectedReview ? (
            <>
              <div className={styles.detailHeader}>
                <div className={styles.detailAuthor}>
                  {selectedReview.avatar_url ? (
                    <img src={selectedReview.avatar_url} alt="" className={styles.detailAvatar} />
                  ) : (
                    <div className={styles.detailAvatarFallback}>
                      {(selectedReview.display_name || selectedReview.handle || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className={styles.detailAuthorName}>
                      {selectedReview.display_name || selectedReview.handle}
                    </h3>
                    <span className={styles.detailAuthorInfo}>
                      @{selectedReview.handle} • {selectedReview.tier} tier
                    </span>
                  </div>
                </div>
                <div className={styles.detailRating}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      size={18} 
                      fill={i < selectedReview.rating ? "#fbbf24" : "transparent"} 
                      color="#fbbf24" 
                    />
                  ))}
                </div>
              </div>

              <div className={styles.detailContent}>
                <h2 className={styles.detailTitle}>{selectedReview.title}</h2>
                <p className={styles.detailBody}>{selectedReview.body}</p>
                <div className={styles.detailMeta}>
                  <span>Created: {formatDate(selectedReview.created_at)}</span>
                  {selectedReview.updated_at !== selectedReview.created_at && (
                    <span>Updated: {formatDate(selectedReview.updated_at)}</span>
                  )}
                </div>
              </div>

              <div className={styles.detailActions}>
                <button 
                  className={`${styles.actionBtn} ${selectedReview.is_approved ? styles.dangerBtn : styles.successBtn}`}
                  onClick={() => toggleApproved(selectedReview)}
                  disabled={actionLoading === selectedReview.id}
                >
                  {selectedReview.is_approved ? (
                    <>
                      <EyeOff size={16} />
                      Unapprove
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Approve
                    </>
                  )}
                </button>

                <button 
                  className={`${styles.actionBtn} ${selectedReview.is_featured ? styles.warningBtn : styles.featureBtn}`}
                  onClick={() => toggleFeatured(selectedReview)}
                  disabled={actionLoading === selectedReview.id || !selectedReview.is_approved}
                  title={!selectedReview.is_approved ? 'Approve first to feature' : ''}
                >
                  {selectedReview.is_featured ? (
                    <>
                      <XCircle size={16} />
                      Unfeature
                    </>
                  ) : (
                    <>
                      <Award size={16} />
                      Feature
                    </>
                  )}
                </button>

                <button 
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={() => deleteReview(selectedReview)}
                  disabled={actionLoading === selectedReview.id}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </>
          ) : (
            <div className={styles.emptyDetail}>
              <Eye size={48} />
              <p>Select a review to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
