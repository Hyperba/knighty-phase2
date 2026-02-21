'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Check, 
  X, 
  Sparkles, 
  Crown, 
  Shield, 
  Zap,
  ChevronDown,
  Package,
  Star,
  MessageSquare,
  Download,
  BookOpen,
  Clock,
  CreditCard,
  Lock,
  ArrowRight,
  Eye,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/contexts/AuthContext'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { UserTier } from '@/lib/types/product'
import PlanAuthModal from '@/components/modals/PlanAuthModal'
import styles from './page.module.css'

// ─── PRICING CONSTANTS ──────────────────────────────────────────────

const BILLING_DISCOUNT_LABEL = 'Save 17%'

const TIER_ACCENT: Record<string, string> = {
  explorer: '#6b7280',
  access: '#3b82f6',
  builder: '#8b5cf6',
  architect: '#f59e0b',
}

interface PlanConfig {
  id: string
  name: string
  tier: UserTier
  monthlyPrice: number
  yearlyPrice: number
  tagline: string
  description: string
  features: { text: string; included: boolean; isNew?: boolean }[]
  popular?: boolean
  cta: string
  showcaseImage: string
}

const COMPARISON_ROWS: { label: string; icon: React.ReactNode; minTier: number }[] = [
  { label: 'Free Builds', icon: <Download size={16} />, minTier: 0 },
  { label: 'Community Discord', icon: <MessageSquare size={16} />, minTier: 0 },
  { label: 'Access Tier Builds', icon: <Zap size={16} />, minTier: 1 },
  { label: 'Build Guides', icon: <BookOpen size={16} />, minTier: 1 },
  { label: 'Builder Tier Builds', icon: <Star size={16} />, minTier: 2 },
  { label: 'Early Access Drops', icon: <Eye size={16} />, minTier: 2 },
  { label: 'Architect Tier Builds', icon: <Crown size={16} />, minTier: 3 },
  { label: 'Priority Support', icon: <Shield size={16} />, minTier: 3 },
]

const TRUST_ITEMS = [
  { icon: <Lock size={22} />, title: 'Secure Payments', desc: 'Encrypted transactions via Stripe' },
  { icon: <Clock size={22} />, title: 'Instant Access', desc: 'Download builds immediately' },
  { icon: <CreditCard size={22} />, title: 'Cancel Anytime', desc: 'No lock-in, no commitments' },
  { icon: <Shield size={22} />, title: '7-Day Guarantee', desc: 'Full refund, no questions asked' },
]

const FAQS = [
  { q: 'Can I cancel my subscription anytime?', a: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.' },
  { q: 'What payment methods do you accept?', a: 'We accept PayPal and all major credit cards including Visa, Mastercard, and American Express.' },
  { q: 'Do I keep access to builds if I cancel?', a: 'You keep access to any builds you downloaded while subscribed. However, you won\'t be able to download new premium builds after cancellation.' },
  { q: 'Is there a student discount?', a: 'Contact us with valid student ID and we\'ll provide a discount code for your subscription.' },
  { q: 'Can I upgrade or downgrade my plan?', a: 'Yes! You can change your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, the change takes effect at the next billing cycle.' },
  { q: 'Do you offer refunds?', a: 'We offer a 7-day money-back guarantee if you\'re not satisfied with your subscription.' },
]

const SHOWCASE_IMAGES = [
  '/projects/hall-of-fame-resort.png',
  '/projects/head-in-clouds.png',
  '/projects/mrbeast-lair.png',
  '/projects/the-explorer.png',
]

// ─── HELPERS ────────────────────────────────────────────────────────

const TIER_LEVELS: Record<UserTier, number> = { explorer: 0, access: 1, builder: 2, architect: 3, admin: 4 }

function transformDbPlans(dbPlans: any[]): PlanConfig[] {
  return dbPlans.map((p) => ({
    id: p.id,
    name: p.name,
    tier: p.tier as UserTier,
    monthlyPrice: Number(p.monthly_price),
    yearlyPrice: Number(p.yearly_price),
    tagline: p.tagline || '',
    description: p.description || '',
    features: (p.features || []).map((f: any) => ({
      text: f.feature_text,
      included: f.included,
      isNew: f.is_new,
    })),
    popular: p.is_popular || false,
    cta: p.cta_label || 'Subscribe',
    showcaseImage: p.showcase_image || '',
  }))
}

// ─── COMPONENT ──────────────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [plans, setPlans] = useState<PlanConfig[] | null>(null)
  const [authModal, setAuthModal] = useState<{ name: string; tier: string } | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  const userTier = (profile?.tier || 'explorer') as UserTier

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabaseBrowserClient()

    async function fetchPlans() {
      try {
        const { data, error } = await supabase.rpc('get_pricing_plans')
        if (cancelled) return
        if (!error && data?.status === 'success' && data.plans?.length > 0) {
          const fetched = transformDbPlans(data.plans)
          setPlans(fetched)
          setExpandedCards(new Set(fetched.map(p => p.id)))
        } else {
          setPlans([])
        }
      } catch {
        setPlans([])
      }
    }

    fetchPlans()
    return () => { cancelled = true }
  }, [])

  const getButtonState = useCallback((planTier: UserTier) => {
    const current = TIER_LEVELS[userTier]
    const target = TIER_LEVELS[planTier]
    if (userTier === 'admin') return { text: 'Admin Access', disabled: true }
    if (current === target) return { text: 'Current Plan', disabled: true }
    if (current > target) return { text: 'Downgrade', disabled: false }
    return { text: (plans ?? []).find(p => p.tier === planTier)?.cta || 'Subscribe', disabled: false }
  }, [userTier, plans])

  const handlePlanSelect = useCallback((plan: PlanConfig) => {
    const btn = getButtonState(plan.tier)
    if (btn.disabled) return

    // Explorer (free) plan doesn't need checkout
    if (plan.tier === 'explorer') return

    const checkoutUrl = `/checkout?plan=${plan.tier}&billing=${billingPeriod}`

    if (user) {
      router.push(checkoutUrl)
    } else {
      setAuthModal({ name: plan.name, tier: plan.tier })
    }
  }, [user, billingPeriod, router, getButtonState])

  if (plans === null) {
    return (
      <main className={styles.pricing}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p>Loading plans...</p>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.pricing}>
      {/* ─── HERO ───────────────────────────────────── */}
      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroGlow} />
        <div className={styles.heroImageStrip}>
          {SHOWCASE_IMAGES.map((src, i) => (
            <div key={i} className={styles.heroImageItem}>
              <Image src={src} alt="" width={320} height={180} className={styles.heroImg} />
            </div>
          ))}
        </div>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>
            <Sparkles size={14} />
            Premium Minecraft Builds
          </span>
          <h1 className={styles.heroTitle}>
            UNLOCK THE FULL
            <br />
            <span className={styles.heroTitleAccent}>KNIGHTY EXPERIENCE</span>
          </h1>
          <p className={styles.heroSubtitle}>
            From stunning statues to intricate portals — get instant access to premium builds, 
            step-by-step guides, and exclusive content.
          </p>
          <div className={styles.billingToggle}>
            <div className={styles.toggleTrack}>
              <button
                className={`${styles.toggleBtn} ${billingPeriod === 'monthly' ? styles.toggleActive : ''}`}
                onClick={() => setBillingPeriod('monthly')}
              >
                Monthly
              </button>
              <button
                className={`${styles.toggleBtn} ${billingPeriod === 'yearly' ? styles.toggleActive : ''}`}
                onClick={() => setBillingPeriod('yearly')}
              >
                Yearly
                <span className={styles.saveBadge}>{BILLING_DISCOUNT_LABEL}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PLAN CARDS ─────────────────────────────── */}
      <section className={styles.plansSection}>
        <div className={styles.plansGrid}>
          {(plans ?? []).map((plan) => {
            const btn = getButtonState(plan.tier)
            const price = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
            const isCurrent = userTier === plan.tier
            const isExpanded = expandedCards.has(plan.id)
            const accent = TIER_ACCENT[plan.tier] || '#8b5cf6'

            return (
              <div
                key={plan.id}
                className={`${styles.card} ${plan.popular ? styles.cardPopular : ''} ${isCurrent ? styles.cardCurrent : ''}`}
                style={{ '--card-accent': accent } as React.CSSProperties}
              >
                {plan.popular && (
                  <div className={styles.popularRibbon}>
                    <Star size={11} />
                    Most Popular
                  </div>
                )}
                {isCurrent && !plan.popular && (
                  <div className={styles.currentRibbon}>
                    <Check size={11} />
                    Your Plan
                  </div>
                )}

                <div className={styles.cardShowcase}>
                  <Image
                    src={plan.showcaseImage}
                    alt={plan.name}
                    width={400}
                    height={200}
                    className={styles.cardShowcaseImg}
                  />
                  <div className={styles.cardShowcaseOverlay} />
                  <div className={styles.cardShowcaseName}>
                    <div className={styles.cardIcon} style={{ background: accent }}>
                      {plan.tier === 'explorer' && <Package size={18} />}
                      {plan.tier === 'access' && <Zap size={18} />}
                      {plan.tier === 'builder' && <Star size={18} />}
                      {plan.tier === 'architect' && <Crown size={18} />}
                    </div>
                    <div>
                      <h3 className={styles.cardTitle}>{plan.name}</h3>
                      <span className={styles.cardTagline}>{plan.tagline}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardPricing}>
                    {plan.monthlyPrice === 0 ? (
                      <span className={styles.priceFree}>Free Forever</span>
                    ) : (
                      <>
                        <span className={styles.priceCurrency}>$</span>
                        <span className={styles.priceAmount}>{price}</span>
                        <span className={styles.pricePeriod}>
                          /{billingPeriod === 'yearly' ? 'yr' : 'mo'}
                        </span>
                      </>
                    )}
                  </div>
                  {billingPeriod === 'yearly' && plan.monthlyPrice > 0 && (
                    <p className={styles.priceMonthly}>
                      ${(plan.yearlyPrice / 12).toFixed(2)}/mo billed annually
                    </p>
                  )}

                  <p className={styles.cardDescription}>{plan.description}</p>

                  <button
                    className={styles.cardFeatureToggle}
                    onClick={() => {
                      setExpandedCards(prev => {
                        const next = new Set(prev)
                        if (next.has(plan.id)) next.delete(plan.id)
                        else next.add(plan.id)
                        return next
                      })
                    }}
                  >
                    <span>{isExpanded ? 'Hide features' : 'View all features'}</span>
                    <ChevronDown size={16} className={isExpanded ? styles.chevronUp : ''} />
                  </button>

                  <div className={`${styles.cardFeatures} ${isExpanded ? styles.cardFeaturesOpen : ''}`}>
                    <div className={styles.cardFeaturesInner}>
                      {plan.features.map((f, i) => (
                        <div
                          key={i}
                          className={`${styles.featureRow} ${!f.included ? styles.featureRowDisabled : ''}`}
                        >
                          {f.included ? (
                            <Check size={15} className={styles.featureCheckIcon} />
                          ) : (
                            <X size={15} className={styles.featureXIcon} />
                          )}
                          <span>{f.text}</span>
                          {f.isNew && f.included && (
                            <span className={styles.featureNew}>NEW</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    className={`${styles.cardCta} ${plan.popular ? styles.cardCtaPrimary : ''}`}
                    disabled={btn.disabled}
                    style={!btn.disabled && !plan.popular ? { borderColor: accent } : undefined}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    {btn.disabled ? btn.text : (
                      <>
                        {btn.text}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ─── TRUST STRIP ────────────────────────────── */}
      <section className={styles.trustStrip}>
        {TRUST_ITEMS.map((item, i) => (
          <div key={i} className={styles.trustPill}>
            {item.icon}
            <div>
              <strong>{item.title}</strong>
              <span>{item.desc}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ─── COMPARISON ACCORDION ───────────────────── */}
      <section className={styles.comparisonSection}>
        <button
          className={styles.comparisonToggle}
          onClick={() => setComparisonOpen(!comparisonOpen)}
        >
          <h2 className={styles.comparisonToggleTitle}>Compare All Plans</h2>
          <ChevronDown size={22} className={comparisonOpen ? styles.chevronUp : ''} />
        </button>
        <div className={`${styles.comparisonBody} ${comparisonOpen ? styles.comparisonBodyOpen : ''}`}>
          <div className={styles.comparisonInner}>
            <div className={styles.compTable}>
              <div className={styles.compHeader}>
                <div className={styles.compFeatureCol}>Feature</div>
                {(plans ?? []).map(p => (
                  <div key={p.id} className={styles.compPlanCol} style={{ color: TIER_ACCENT[p.tier] }}>
                    {p.name}
                  </div>
                ))}
              </div>
              {COMPARISON_ROWS.map((row, i) => (
                <div key={i} className={styles.compRow}>
                  <div className={styles.compFeatureCol}>
                    {row.icon}
                    <span>{row.label}</span>
                  </div>
                  {(plans ?? []).map(p => {
                    const level = TIER_LEVELS[p.tier]
                    return (
                      <div key={p.id} className={styles.compValueCol}>
                        {level >= row.minTier ? (
                          <Check size={16} className={styles.compCheck} />
                        ) : (
                          <span className={styles.compDash}>—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────── */}
      <section className={styles.faqSection}>
        <h2 className={styles.sectionHeading}>Frequently Asked Questions</h2>
        <div className={styles.faqGrid}>
          {FAQS.map((faq, i) => (
            <div key={i} className={`${styles.faqCard} ${openFaq === i ? styles.faqCardOpen : ''}`}>
              <button
                className={styles.faqQ}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{faq.q}</span>
                <ChevronDown size={18} className={styles.faqChevron} />
              </button>
              <div className={styles.faqA}>
                <div className={styles.faqAInner}>{faq.a}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBanner}>
          <Image
            src="/knighty.png"
            alt=""
            width={120}
            height={120}
            className={styles.ctaImage}
          />
          <div className={styles.ctaText}>
            <h2>Still have questions?</h2>
            <p>Reach out and we&apos;ll help you pick the perfect plan.</p>
          </div>
          <Link href="/contact" className={styles.ctaBtn}>
            <MessageSquare size={18} />
            Contact Us
          </Link>
        </div>
      </section>
      {/* ─── AUTH MODAL ─────────────────────────── */}
      {authModal && (
        <PlanAuthModal
          planName={authModal.name}
          planTier={authModal.tier}
          billingPeriod={billingPeriod}
          onClose={() => setAuthModal(null)}
        />
      )}
    </main>
  )
}
