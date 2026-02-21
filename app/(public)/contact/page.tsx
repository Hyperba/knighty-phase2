'use client'

import { useState, useEffect } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { CheckCircle2, TriangleAlert, Star, Lock, Edit3, Award, Clock } from 'lucide-react'
import { useAuth } from '@/components/contexts/AuthContext'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import styles from './page.module.css'
import StatusModal, { type StatusModalVariant } from '@/components/ui/StatusModal/StatusModal'
import Link from 'next/link'

interface UserReview {
  id: string
  rating: number
  title: string
  body: string
  is_featured: boolean
  is_approved: boolean
  created_at: string
  updated_at: string
}

export default function Contact() {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    projectType: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Review form state
  const [reviewData, setReviewData] = useState({
    rating: 5,
    title: '',
    body: ''
  })
  const [existingReview, setExistingReview] = useState<UserReview | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalHeading, setModalHeading] = useState('')
  const [modalDescription, setModalDescription] = useState<string | undefined>(undefined)
  const [modalVariant, setModalVariant] = useState<StatusModalVariant>('info')
  const [modalIcon, setModalIcon] = useState<ReactNode>(null)

  const openModal = (next: {
    heading: string
    description?: string
    variant: StatusModalVariant
    icon: ReactNode
  }) => {
    setModalHeading(next.heading)
    setModalDescription(next.description)
    setModalVariant(next.variant)
    setModalIcon(next.icon)
    setModalOpen(true)
  }

  // Fetch existing review on mount if user is logged in
  useEffect(() => {
    const fetchUserReview = async () => {
      if (!user) return
      setReviewLoading(true)
      const supabase = getSupabaseBrowserClient()
      
      try {
        const { data } = await supabase.rpc('get_user_review')
        if (data?.status === 'success' && data.review) {
          setExistingReview(data.review)
          setReviewData({
            rating: data.review.rating,
            title: data.review.title,
            body: data.review.body
          })
        }
      } catch (err) {
        console.error('Failed to fetch user review:', err)
      } finally {
        setReviewLoading(false)
      }
    }

    fetchUserReview()
  }, [user])

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setReviewSubmitting(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data } = await supabase.rpc('submit_review', {
        p_rating: reviewData.rating,
        p_title: reviewData.title.trim(),
        p_body: reviewData.body.trim()
      })

      if (data?.status === 'success') {
        const isEdit = !!existingReview
        openModal({
          heading: isEdit ? 'Review Updated!' : 'Review Submitted!',
          description: isEdit 
            ? 'Your review has been updated and will be reviewed by our team.'
            : 'Thanks for your feedback! Your review will be reviewed before appearing on the site.',
          variant: 'success',
          icon: <CheckCircle2 size={24} />
        })
        // Refetch the review to get updated state
        const { data: updated } = await supabase.rpc('get_user_review')
        if (updated?.status === 'success' && updated.review) {
          setExistingReview(updated.review)
        }
      } else {
        throw new Error(data?.message || 'Failed to submit review')
      }
    } catch (error) {
      openModal({
        heading: 'Something went wrong',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
        icon: <TriangleAlert size={24} />
      })
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleReviewChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setReviewData({
      ...reviewData,
      [e.target.name]: e.target.value
    })
  }

  const setRating = (rating: number) => {
    setReviewData({ ...reviewData, rating })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429 && data?.status === 'rate_limited') {
          openModal({
            heading: 'Please wait',
            description: data?.error || 'You can only submit once every 10 minutes.',
            variant: 'info',
            icon: <TriangleAlert size={24} />,
          })
          return
        }

        throw new Error(data?.error || 'Failed to send message')
      }

      openModal({
        heading: 'Message sent!',
        description: "Thanks for reaching out — we'll get back to you soon.",
        variant: 'success',
        icon: <CheckCircle2 size={24} />,
      })
      setFormData({
        name: '',
        email: '',
        projectType: '',
        message: ''
      })
    } catch (error) {
      openModal({
        heading: 'Something went wrong',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
        icon: <TriangleAlert size={24} />,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <main className={styles.contact}>
      <div className={styles.heroSection}>
        <h1 className={styles.title}>INTERESTED IN A CUSTOM BUILD?</h1>
        <p className={styles.subtitle}>Let's bring your vision to life. Fill out the form below or reach out through any of our channels.</p>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.formSection}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="Your name"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="your@email.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="projectType" className={styles.label}>Project Type *</label>
              <select
                id="projectType"
                name="projectType"
                value={formData.projectType}
                onChange={handleChange}
                required
                className={styles.select}
              >
                <option value="">Select a project type</option>
                <option value="Custom Build">Custom Build</option>
                <option value="Map/World">Map/World</option>
                <option value="Statue/Sculpture">Statue/Sculpture</option>
                <option value="Architecture">Architecture</option>
                <option value="Other">Other</option>
              </select>
            </div>


            <div className={styles.formGroup}>
              <label htmlFor="message" className={styles.label}>Message *</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                className={styles.textarea}
                placeholder="Tell us about your project..."
                rows={6}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`${styles.submitButton} ${isSubmitting ? styles.submitButtonLoading : ''}`}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          <StatusModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            heading={modalHeading}
            description={modalDescription}
            variant={modalVariant}
            icon={modalIcon}
          />
        </div>

        <div className={styles.socialSection}>
          <h2 className={styles.socialTitle}>Other Ways to Reach Out</h2>
          <p className={styles.socialDescription}>Connect with us on your preferred platform</p>

          <div className={styles.socialLinks}>
             <a
              href="https://instagram.com/knighty"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              <div className={styles.socialIcon}>
                <img src="/social/instagram.svg" alt="Instagram" />
              </div>
              <div className={styles.socialContent}>
                <h3 className={styles.socialLinkTitle}>Instagram</h3>
                <p className={styles.socialLinkText}>@knighty</p>
              </div>
            </a>
            <a
              href="mailto:contact@knighty.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              <div className={styles.socialIcon}>
                <img src="/social/gmail.svg" alt="Email" />
              </div>
              <div className={styles.socialContent}>
                <h3 className={styles.socialLinkTitle}>Email</h3>
                <p className={styles.socialLinkText}>knighty@knightybuilds.com</p>
              </div>
            </a>

            <a
              href="#"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              <div className={styles.socialIcon}>
                <img src="/social/discord.svg" alt="Discord" />
              </div>
              <div className={styles.socialContent}>
                <h3 className={styles.socialLinkTitle}>Discord</h3>
                <p className={styles.socialLinkText}>xKnighty</p>
              </div>
            </a>

            <a
              href="https://youtube.com/@knighty"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              <div className={styles.socialIcon}>
                <img src="/social/youtube.svg" alt="YouTube" />
              </div>
              <div className={styles.socialContent}>
                <h3 className={styles.socialLinkTitle}>YouTube</h3>
                <p className={styles.socialLinkText}>@knighty</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <section id="review" className={styles.reviewSection}>
        <div className={styles.reviewHeader}>
          <span className={styles.reviewBadge}>
            <Star size={14} />
            Share Your Experience
          </span>
          <h2 className={styles.reviewTitle}>Leave a Review</h2>
          <p className={styles.reviewSubtitle}>
            Help others discover Knighty Builds by sharing your experience
          </p>
        </div>

        {!user ? (
          <div className={styles.reviewAuthGate}>
            <Lock size={32} />
            <h3>Sign in to Leave a Review</h3>
            <p>You need to be logged in to submit a review.</p>
            <Link href="/login" className={styles.reviewAuthBtn}>
              Sign In
            </Link>
          </div>
        ) : reviewLoading ? (
          <div className={styles.reviewLoading}>Loading...</div>
        ) : (
          <form onSubmit={handleReviewSubmit} className={styles.reviewForm}>
            {existingReview && (
              <div className={styles.existingReviewNotice}>
                <Edit3 size={18} />
                <div>
                  <strong>Editing your existing review</strong>
                  <span>
                    {existingReview.is_featured && (
                      <span className={styles.featuredNotice}>
                        <Award size={12} /> Currently featured — editing will require re-approval
                      </span>
                    )}
                    {!existingReview.is_approved && (
                      <span className={styles.pendingNotice}>
                        <Clock size={12} /> Pending approval
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className={styles.ratingGroup}>
              <label className={styles.reviewLabel}>Rating <span>*</span></label>
              <div className={styles.starRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`${styles.starBtn} ${star <= reviewData.rating ? styles.starActive : ''}`}
                    onClick={() => setRating(star)}
                  >
                    <Star size={32} fill={star <= reviewData.rating ? '#fbbf24' : 'transparent'} />
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.reviewFormGroup}>
              <label htmlFor="reviewTitle" className={styles.reviewLabel}>Title <span>*</span></label>
              <input
                type="text"
                id="reviewTitle"
                name="title"
                value={reviewData.title}
                onChange={handleReviewChange}
                required
                minLength={3}
                maxLength={100}
                className={styles.reviewInput}
                placeholder="Sum up your experience in a few words"
              />
            </div>

            <div className={styles.reviewFormGroup}>
              <label htmlFor="reviewBody" className={styles.reviewLabel}>Your Review <span>*</span></label>
              <textarea
                id="reviewBody"
                name="body"
                value={reviewData.body}
                onChange={handleReviewChange}
                required
                minLength={10}
                maxLength={1000}
                className={styles.reviewTextarea}
                placeholder="Share your experience with Knighty Builds. What did you like? How did it help your server or world?"
              />
              <span className={styles.charCount}>{reviewData.body.length}/1000</span>
            </div>

            <div className={styles.reviewActions}>
              <button
                type="submit"
                disabled={reviewSubmitting}
                className={styles.reviewSubmitBtn}
              >
                {reviewSubmitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}
