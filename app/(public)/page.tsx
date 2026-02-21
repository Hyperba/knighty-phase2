'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowRight, TrendingUp, Clock, Users, Star, Download, Zap, Crown, Sparkles, MessageSquare, Quote, Palette, Shield } from 'lucide-react'
import Hero from '@/components/sections/Hero/Hero'
import styles from "./page.module.css"
import { projects } from '@/lib/projects'
import MainButton from '@/components/ui/MainButton/MainButton'
import CTASection from "@/components/sections/CTASection/CTASection"
import BuildCard from '@/components/ui/BuildCard/BuildCard'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ProductCard } from '@/lib/types/product'
import { useAuth } from '@/components/contexts/AuthContext'

interface Review {
  id: string
  rating: number
  title: string
  body: string
  created_at: string
  handle: string
  display_name: string
  avatar_url: string | null
  tier: string
}

function BuildRowCarousel({ builds, label, icon }: { builds: ProductCard[], label: string, icon: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => el.removeEventListener('scroll', checkScroll)
  }, [builds])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.75
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  if (builds.length === 0) return null

  return (
    <div className={styles.buildRowSection}>
      <div className={styles.buildRowHeader}>
        <div className={styles.buildRowLabel}>
          {icon}
          <h2>{label}</h2>
        </div>
        <Link href="/builds" className={styles.buildRowViewAll}>
          View All <ArrowRight size={14} />
        </Link>
      </div>
      <div className={styles.buildRowWrapper}>
        {canScrollLeft && (
          <button className={`${styles.scrollBtn} ${styles.scrollBtnLeft}`} onClick={() => scroll('left')}>
            <ChevronLeft size={20} />
          </button>
        )}
        <div className={styles.buildRowTrack} ref={scrollRef}>
          {builds.map((build) => (
            <div key={build.id} className={styles.buildRowItem}>
              <BuildCard product={build} />
            </div>
          ))}
        </div>
        {canScrollRight && (
          <button className={`${styles.scrollBtn} ${styles.scrollBtnRight}`} onClick={() => scroll('right')}>
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function Landing() {
  const { user, profile } = useAuth()
  const [topBuilds, setTopBuilds] = useState<ProductCard[]>([])
  const [latestBuilds, setLatestBuilds] = useState<ProductCard[]>([])
  const [freeBuilds, setFreeBuilds] = useState<ProductCard[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewStats, setReviewStats] = useState<{ total_reviews: number; average_rating: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabaseBrowserClient()

    async function fetchData() {
      const [topRes, latestRes, freeRes, reviewsRes, statsRes] = await Promise.all([
        supabase.rpc('browse_products', { p_sort_by: 'popular', p_per_page: 10 }),
        supabase.rpc('browse_products', { p_sort_by: 'newest', p_per_page: 10 }),
        supabase.rpc('browse_products', { p_tiers: ['explorer'], p_sort_by: 'popular', p_per_page: 3 }),
        supabase.rpc('get_featured_reviews', { p_limit: 12 }),
        supabase.rpc('get_review_stats'),
      ])

      if (cancelled) return

      if (topRes.data?.status === 'success') {
        setTopBuilds(topRes.data.products || [])
      }
      if (latestRes.data?.status === 'success') {
        setLatestBuilds(latestRes.data.products || [])
      }
      if (freeRes.data?.status === 'success') {
        setFreeBuilds(freeRes.data.products || [])
      }
      if (reviewsRes.data?.status === 'success') {
        setReviews(reviewsRes.data.reviews || [])
      }
      if (statsRes.data?.status === 'success') {
        setReviewStats({
          total_reviews: statsRes.data.total_reviews || 0,
          average_rating: statsRes.data.average_rating || 0
        })
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  return (
    <main className={styles.main}>
      <div className={styles.heroStickyWrapper}>
        <Hero />
      </div>

      {/* Community / Join Section - Show to non-logged-in users */}
      {!user && (
        <section className={styles.nextSection}>
          <div className={`${styles.nextInner} ${styles.communityInner}`}>
            <div className={styles.communityLeft}>
              <div className={styles.communityBadge}>
                <Sparkles size={14} />
                <span>Join the Community</span>
              </div>
              <h2 className={styles.communityTitle}>
                Become Part of Something <span className={styles.gradientText}>Extraordinary</span>
              </h2>
              <p className={styles.communitySubtitle}>
                Join thousands of Minecraft enthusiasts who trust Knighty Builds for premium content and exclusive downloads.
              </p>
              <div className={styles.communityStats}>
                <div className={styles.communityStat}>
                  <Users size={20} />
                  <div>
                    <span className={styles.statNumber}>10K+</span>
                    <span className={styles.statLabel}>Members</span>
                  </div>
                </div>
                <div className={styles.communityStat}>
                  <Download size={20} />
                  <div>
                    <span className={styles.statNumber}>500+</span>
                    <span className={styles.statLabel}>Builds</span>
                  </div>
                </div>
                <div className={styles.communityStat}>
                  <Star size={20} />
                  <div>
                    <span className={styles.statNumber}>4.9</span>
                    <span className={styles.statLabel}>Rating</span>
                  </div>
                </div>
              </div>
              <div className={styles.communityActions}>
                <Link href="/signup" className={styles.communityPrimaryBtn}>
                  <Zap size={18} />
                  Create Free Account
                </Link>
                <Link href="/builds" className={styles.communitySecondaryBtn}>
                  Browse Builds
                </Link>
              </div>
            </div>
            <div className={styles.communityRight}>
              <div className={styles.freeBuildsShowcase}>
                <div className={styles.freeShowcaseHeader}>
                  <div className={styles.freeBadge}>
                    <Download size={12} />
                    <span>Free to Download</span>
                  </div>
                  <p>Get started with these popular builds — completely free</p>
                </div>
                <div className={styles.freeBuildsGrid}>
                  {freeBuilds.slice(0, 3).map((build) => (
                    <Link key={build.id} href={`/builds/${build.slug}`} className={styles.freeBuildCard}>
                      <div className={styles.freeBuildImageWrap}>
                        <img src={build.image_url} alt={build.title} />
                        <div className={styles.freeBuildOverlay}>
                          <span>View Build</span>
                        </div>
                      </div>
                      <div className={styles.freeBuildInfo}>
                        <span className={styles.freeBuildTitle}>{build.title}</span>
                        <div className={styles.freeBuildMeta}>
                          <span className={styles.freeBuildTag}>Free</span>
                          <span className={styles.freeBuildLikes}>
                            <Star size={10} /> {build.total_likes}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Latest Builds */}
      <section className={styles.nextSection}>
        <div className={`${styles.nextInner} ${styles.buildsCarouselInner}`}>
          <BuildRowCarousel
            builds={latestBuilds}
            label="Latest Builds"
            icon={<Clock size={22} />}
          />
        </div>
      </section>

      {/* Top Builds */}
      <section className={styles.nextSection}>
        <div className={`${styles.nextInner} ${styles.buildsCarouselInner}`}>
          <BuildRowCarousel
            builds={topBuilds}
            label="Top Builds"
            icon={<TrendingUp size={22} />}
          />
        </div>
      </section>

     
      {/* Upgrade Section - Show to logged-in users who aren't on highest tier */}
      {user && profile?.tier !== 'architect' && profile?.tier !== 'admin' && (
        <section className={styles.nextSection}>
          <div className={`${styles.nextInner} ${styles.upgradeInner}`}>
            <div className={styles.upgradeCard}>
              <div className={styles.upgradeGlow} />
              <div className={styles.upgradeContent}>
                <div className={styles.upgradeBadge}>
                  <Crown size={14} />
                  <span>Exclusive Access</span>
                </div>
                <h2 className={styles.upgradeTitle}>Unlock Your Full Potential</h2>
                <p className={styles.upgradeSubtitle}>
                  Take your Minecraft experience to the next level with premium builds, unlimited downloads, and exclusive member perks.
                </p>
                <div className={styles.upgradePerks}>
                  <div className={styles.upgradePerk}>
                    <Download />
                    <span>Unlimited Downloads</span>
                  </div>
                  <div className={styles.upgradePerk}>
                    <Star />
                    <span>Premium Builds</span>
                  </div>
                  <div className={styles.upgradePerk}>
                    <Users />
                    <span>Discord Access</span>
                  </div>
                  <div className={styles.upgradePerk}>
                    <Zap />
                    <span>Early Access</span>
                  </div>
                </div>
                <div className={styles.upgradeActions}>
                  <Link href="/pricing" className={styles.upgradeBtn}>
                    <Crown size={18} />
                    View Plans
                  </Link>
                  <Link href="/builds" className={styles.upgradeSecondaryBtn}>
                    Browse Builds
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Projects — Showcase Strip */}
      <section className={styles.nextSection}>
        <div className={`${styles.nextInner} ${styles.showcaseInner}`}>
          <div className={styles.showcaseHeader}>
            <div className={styles.showcaseBadge}>
              <Star size={14} />
              <span>Premium Collection</span>
            </div>
            <h2 className={styles.showcaseTitle}>Commission-Grade Projects</h2>
            <p className={styles.showcaseSubtitle}>
              Explore our portfolio of large-scale Minecraft commissions — the same quality available in our builds catalog
            </p>
          </div>
          <div className={styles.showcaseStrip}>
            {projects.map((project, index) => (
              <Link
                key={project.id}
                href={`/portfolio/${project.slug}`}
                className={styles.showcaseCard}
              >
                <div className={styles.showcaseImageWrapper}>
                  <img src={project.imageSrc} alt={project.name} />
                  <div className={styles.showcaseNumber}>{String(index + 1).padStart(2, '0')}</div>
                </div>
                <div className={styles.showcaseInfo}>
                  <h3>{project.name}</h3>
                  <p>{project.brief}</p>
                  <span className={styles.showcaseLink}>
                    View Project <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/portfolio" className={styles.showcaseViewAll}>
            View Full Portfolio <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className={styles.nextSection}>
        <div className={`${styles.nextInner} ${styles.aboutInner}`}>
          <div className={styles.aboutHeader}>
            <div className={styles.sectionBadge}>
              <Palette size={14} />
              <span>About the Creator</span>
            </div>
          </div>
          <div className={styles.aboutContainer}>
            <img src="/about-image.png" alt="knighty looking at a luxury house he built" />
            <div className={styles.aboutCopy}>
              <h1>MAKING MINECRAFT PREMIUM</h1>
              <p>I&apos;m Knighty, a digital artist and professional Minecraft builder.</p>
              <p>I&apos;ve been passionate about art since I was five years old, exploring creativity through many different mediums before discovering Minecraft as my canvas for the first time in 2016. I began creating content to share my work, build my name, and inspire others to see what&apos;s truly possible through this game.</p>
              <p>My goal is to make Minecraft art truly mainstream, to show the world that it&apos;s more than just blocks, but a powerful platform for endless creativity, design, and storytelling.</p>
            </div>
          </div>
          <MainButton href="/about" text="Learn More" />
        </div>
      </section>

      {/* Support Section */}
      <section className={styles.nextSection}>
        <div className={`${styles.nextInner} ${styles.supportInner}`}>
          <div className={styles.supportShell}>
            <div className={styles.supportTop}>
              <div className={styles.supportSideLeft}>
                <img
                  src="/hologram.png"
                  alt="Minecraft Hologram Building"
                  className={styles.supportSideImg}
                />
              </div>

              <div className={styles.supportHeader}>
                <div className={styles.sectionBadge}>
                  <Shield size={14} />
                  <span>Premium Access</span>
                </div>
                <h1 className={styles.supportTitle}>Unlock Premium Builds</h1>
                <p className={styles.supportLead}>
                  Get access to hundreds of high-quality builds and templates designed to upgrade your world to new levels.
                </p>
                <MainButton href="/pricing" text="View Plans" />
              </div>

              <div className={styles.supportSideRight}>
                <img
                  src="/knighty.png"
                  alt="Knighty with a hologram cube"
                  className={styles.supportSideImg}
                />
              </div>
            </div>

            <div className={styles.perksBlock}>
              <h2 className={styles.perksHeading}>
                Gain These <span className={styles.perksAccent}>Awesome</span> Perks
              </h2>

              <div className={styles.perksPills}>
                <div className={styles.perkPill}>
                  <span className={styles.perkIcon} />
                  <span className={styles.perkText}>Access to all build downloads</span>
                </div>
                <div className={styles.perkPill}>
                  <span className={styles.perkIcon} />
                  <span className={styles.perkText}>Access to all asset downloads</span>
                </div>
                <div className={styles.perkPill}>
                  <span className={styles.perkIcon} />
                  <span className={styles.perkText}>Access to Knighty&apos;s Minecraft city map</span>
                </div>
                <div className={styles.perkPill}>
                  <span className={styles.perkIcon} />
                  <span className={styles.perkText}>Private 1-on-1 calls with Knighty</span>
                </div>
                <div className={styles.perkPill}>
                  <span className={styles.perkIcon} />
                  <span className={styles.perkText}>Exclusive Discord server access</span>
                </div>
              </div>
            </div>

            <div className={styles.serverCard}>
              <h2 className={styles.serverCardTitle}>Interested in hosting your own Minecraft server?</h2>
              <a
                href="https://billing.bloom.host/aff.php?aff=552"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.serverCardButton}
              >
                Starting at JUST $3/mo!
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {reviews.length > 0 && (
        <section className={styles.nextSection}>
          <div className={`${styles.nextInner} ${styles.testimonialsInner}`}>
            <div className={styles.testimonialsHeader}>
              <div className={styles.sectionBadge}>
                <MessageSquare size={14} />
                <span>Testimonials</span>
              </div>
              <h2 className={styles.testimonialsTitle}>What Our Community Says</h2>
              <p className={styles.testimonialsSubtitle}>
                Real reviews from real builders who use Knighty Builds
              </p>
              {reviewStats && reviewStats.total_reviews > 0 && (
                <div className={styles.reviewStatsRow}>
                  <div className={styles.reviewStat}>
                    <Star size={18} fill="#fbbf24" color="#fbbf24" />
                    <span className={styles.reviewStatValue}>{reviewStats.average_rating}</span>
                    <span className={styles.reviewStatLabel}>Average Rating</span>
                  </div>
                  <div className={styles.reviewStatDivider} />
                  <div className={styles.reviewStat}>
                    <Users size={18} />
                    <span className={styles.reviewStatValue}>{reviewStats.total_reviews}</span>
                    <span className={styles.reviewStatLabel}>Total Reviews</span>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.testimonialsCarouselWrapper}>
              <div className={styles.testimonialsCarouselTrack}>
                {/* Double the reviews for seamless infinite scroll */}
                {[...reviews, ...reviews].map((review, idx) => (
                  <div key={`${review.id}-${idx}`} className={styles.testimonialCard}>
                    <div className={styles.testimonialQuote}>
                      <Quote size={20} />
                    </div>
                    <div className={styles.testimonialStars}>
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} size={14} />
                      ))}
                    </div>
                    <h4 className={styles.testimonialTitle}>{review.title}</h4>
                    <p className={styles.testimonialBody}>{review.body}</p>
                    <div className={styles.testimonialAuthor}>
                      {review.avatar_url ? (
                        <img src={review.avatar_url} alt={review.display_name || review.handle} className={styles.testimonialAvatar} />
                      ) : (
                        <div className={styles.testimonialAvatarFallback}>
                          {(review.display_name || review.handle || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className={styles.testimonialName}>{review.display_name || review.handle}</span>
                        <span className={styles.testimonialTier}>{review.tier} tier</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {user && (
              <Link href="/contact#review" className={styles.testimonialCta}>
                <MessageSquare size={16} />
                Write Your Review
              </Link>
            )}
          </div>
        </section>
      )}

      {/* What We Build — Category Carousel */}
      <section className={styles.nextSection}>
        <div className={`${styles.nextInner} ${styles.buildsInner}`}>
          <div className={styles.buildsHeader}>
            <div className={styles.sectionBadge}>
              <Sparkles size={14} />
              <span>Categories</span>
            </div>
            <h2 className={styles.buildsTitle}>What We Build</h2>
          </div>
          <div className={styles.carouselWrapper}>
            <div className={styles.carouselTrack}>
              {[
                { name: 'Portals', image: '/builds/portals.png' },
                { name: 'Statues', image: '/builds/statues.png' },
                { name: 'Houses', image: '/builds/houses.png' },
                { name: 'Vehicles', image: '/builds/vehicles.png' },
                { name: 'Art', image: '/builds/art.png' },
                { name: 'Assets', image: '/builds/assets.png' },
                { name: 'Portals', image: '/builds/portals.png' },
                { name: 'Statues', image: '/builds/statues.png' },
                { name: 'Houses', image: '/builds/houses.png' },
                { name: 'Vehicles', image: '/builds/vehicles.png' },
                { name: 'Art', image: '/builds/art.png' },
                { name: 'Assets', image: '/builds/assets.png' },
              ].map((build, index) => (
                <div key={index} className={styles.buildCard}>
                  <img
                    src={build.image}
                    alt={build.name}
                    className={styles.buildCardImage}
                  />
                  <div className={styles.buildCardLabel}>
                    <h3>{build.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className={styles.nextSection}>
        <div className={`${styles.nextInner} ${styles.projectsInner}`}>
          <CTASection
            brief="Explore our full collection of premium Minecraft builds"
            title="Browse All Builds"
            buttonText="Browse Builds"
            buttonHref="/builds"
          />
        </div>
      </div>

    </main>
  )
}
