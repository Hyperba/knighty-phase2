'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Shield,
  Lock,
  CreditCard,
  AlertCircle,
  Zap,
  Star,
  Crown,
  Package,
  Sparkles,
} from 'lucide-react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { useAuth } from '@/components/contexts/AuthContext'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface CheckoutPlan {
  id: string
  tier: string
  name: string
  tagline: string
  monthly_price: number
  yearly_price: number
  paypal_plan_id_monthly: string
  paypal_plan_id_yearly: string
  features: { feature_text: string; included: boolean }[]
}

const TIER_ACCENT: Record<string, string> = {
  explorer: '#6b7280',
  access: '#3b82f6',
  builder: '#8b5cf6',
  architect: '#f59e0b',
}

const TIER_ICON: Record<string, React.ReactNode> = {
  access: <Zap size={22} />,
  builder: <Star size={22} />,
  architect: <Crown size={22} />,
  explorer: <Package size={22} />,
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuth()

  const planTier = searchParams.get('plan') || ''
  const billingPeriod = (searchParams.get('billing') || 'monthly') as 'monthly' | 'yearly'

  const [plan, setPlan] = useState<CheckoutPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [newTier, setNewTier] = useState('')
  const activatingRef = useRef(false)

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  // Fetch plan details
  useEffect(() => {
    if (!planTier) {
      setError('No plan selected')
      setLoading(false)
      return
    }

    if (planTier === 'explorer') {
      setError('The free plan does not require checkout')
      setLoading(false)
      return
    }

    if (!['access', 'builder', 'architect'].includes(planTier)) {
      setError('Invalid plan selected')
      setLoading(false)
      return
    }

    let cancelled = false
    const supabase = getSupabaseBrowserClient()

    async function fetchPlan() {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_checkout_plan', {
          p_tier: planTier,
          p_billing_period: billingPeriod,
        })

        if (cancelled) return

        if (rpcError || data?.status !== 'success') {
          setError(data?.message || 'Failed to load plan details')
          setLoading(false)
          return
        }

        setPlan(data.plan)
        setLoading(false)
      } catch {
        if (!cancelled) {
          setError('Failed to load plan details')
          setLoading(false)
        }
      }
    }

    fetchPlan()
    return () => { cancelled = true }
  }, [planTier, billingPeriod])

  // Activate subscription after PayPal approval
  const activateSubscription = useCallback(async (subscriptionId: string) => {
    if (activatingRef.current || !plan) return
    activatingRef.current = true
    setProcessing(true)

    try {
      const res = await fetch('/api/payments/paypal/activate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          planId: plan.id,
          tier: plan.tier,
          billingPeriod,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Failed to activate subscription')
        setProcessing(false)
        activatingRef.current = false
        return
      }

      // Refresh profile to get new tier
      await refreshProfile()
      setNewTier(plan.tier)
      setSuccess(true)
      setProcessing(false)
    } catch {
      setError('Failed to activate subscription. Please contact support.')
      setProcessing(false)
      activatingRef.current = false
    }
  }, [plan, billingPeriod, refreshProfile])

  // ─── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <main className={styles.checkout}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Loading checkout...</p>
        </div>
      </main>
    )
  }

  // ─── Success state ─────────────────────────────────────
  if (success) {
    return (
      <main className={styles.checkout}>
        <div className={styles.successState}>
          <div className={styles.successIconWrapper}>
            <Check size={32} />
          </div>
          <h1 className={styles.successTitle}>Welcome to {plan?.name}!</h1>
          <p className={styles.successMessage}>
            Your subscription is now active. You have full access to all {plan?.name}-tier 
            builds, guides, and exclusive content.
          </p>
          <span className={styles.successTier}>
            <Sparkles size={16} />
            {newTier.charAt(0).toUpperCase() + newTier.slice(1)} Member
          </span>
          <div className={styles.successActions}>
            <Link href="/builds" className={styles.successBtn}>
              Browse Builds
            </Link>
            <Link href="/settings" className={styles.successBtnSecondary}>
              Account Settings
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ─── Error state ───────────────────────────────────────
  if (error || !plan) {
    return (
      <main className={styles.checkout}>
        <div className={styles.errorState}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h2 className={styles.errorTitle}>Checkout Unavailable</h2>
          <p className={styles.errorMessage}>
            {error || 'Could not load plan details. Please try again.'}
          </p>
          <Link href="/pricing" className={styles.errorBtn}>
            <ArrowLeft size={16} />
            Back to Pricing
          </Link>
        </div>
      </main>
    )
  }

  const price = billingPeriod === 'yearly' ? plan.yearly_price : plan.monthly_price
  const paypalPlanId = billingPeriod === 'yearly'
    ? plan.paypal_plan_id_yearly
    : plan.paypal_plan_id_monthly
  const accent = TIER_ACCENT[plan.tier] || '#8b5cf6'
  const currentTier = profile?.tier || 'free'

  return (
    <main className={styles.checkout}>
      {/* Processing overlay */}
      {processing && (
        <div className={styles.processingOverlay}>
          <div className={styles.loadingSpinner} />
          <p className={styles.processingText}>Activating your subscription...</p>
          <p className={styles.processingSubtext}>Please do not close this page</p>
        </div>
      )}

      <Link href="/pricing" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to Pricing
      </Link>

      <h1 className={styles.heading}>Checkout</h1>

      <div className={styles.grid}>
        {/* ─── Order Summary ─────────────────────── */}
        <div className={styles.summaryCard}>
          <h2 className={styles.summaryTitle}>Order Summary</h2>

          <div className={styles.summaryPlanHeader}>
            <div className={styles.summaryPlanIcon} style={{ background: accent }}>
              {TIER_ICON[plan.tier] || <Package size={22} />}
            </div>
            <div>
              <h3 className={styles.summaryPlanName}>{plan.name}</h3>
              <p className={styles.summaryPlanTagline}>{plan.tagline}</p>
            </div>
          </div>

          <div className={styles.summaryDetails}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Plan</span>
              <span className={styles.summaryValue}>{plan.name}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Billing</span>
              <span className={styles.summaryValue}>
                {billingPeriod === 'yearly' ? 'Annual' : 'Monthly'}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Current tier</span>
              <span className={styles.summaryValue} style={{ textTransform: 'capitalize' }}>
                {currentTier}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>New tier</span>
              <span className={styles.summaryValue} style={{ color: accent, textTransform: 'capitalize' }}>
                {plan.tier}
              </span>
            </div>
          </div>

          <hr className={styles.summaryDivider} />

          <div className={styles.summaryTotal}>
            <span className={styles.summaryTotalLabel}>Total</span>
            <div>
              <span className={styles.summaryTotalPrice}>${Number(price).toFixed(2)}</span>
              <span className={styles.summaryTotalPeriod}>
                /{billingPeriod === 'yearly' ? 'yr' : 'mo'}
              </span>
            </div>
          </div>

          {billingPeriod === 'yearly' && plan.monthly_price > 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-color)', opacity: 0.5, marginTop: '0.5rem' }}>
              ${(plan.yearly_price / 12).toFixed(2)}/mo billed annually
            </p>
          )}

          {/* Features */}
          {plan.features && plan.features.length > 0 && (
            <div className={styles.summaryFeatures}>
              <h4 className={styles.summaryFeaturesTitle}>Included</h4>
              {plan.features.map((f, i) => (
                <div key={i} className={styles.featureItem}>
                  <Check size={14} className={styles.featureIcon} />
                  <span>{f.feature_text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Payment Section ───────────────────── */}
        <div className={styles.paymentCard}>
          <h2 className={styles.paymentTitle}>Payment</h2>

          {/* PayPal */}
          {paypalClientId && paypalPlanId ? (
            <div className={styles.paypalContainer}>
              <PayPalScriptProvider
                options={{
                  clientId: paypalClientId,
                  intent: 'subscription',
                  vault: true,
                }}
              >
                <PayPalButtons
                  style={{
                    shape: 'rect',
                    color: 'blue',
                    layout: 'vertical',
                    label: 'subscribe',
                  }}
                  createSubscription={(_data, actions) => {
                    return actions.subscription.create({
                      plan_id: paypalPlanId,
                    })
                  }}
                  onApprove={async (data) => {
                    if (data.subscriptionID) {
                      await activateSubscription(data.subscriptionID)
                    }
                  }}
                  onError={(err) => {
                    console.error('PayPal error:', err)
                    setError('Payment failed. Please try again.')
                  }}
                  onCancel={() => {
                    // User closed PayPal popup — do nothing
                  }}
                />
              </PayPalScriptProvider>
            </div>
          ) : !paypalClientId ? (
            <div className={styles.paypalLoading}>
              <AlertCircle size={18} />
              <span>PayPal is not configured. Please contact support.</span>
            </div>
          ) : (
            <div className={styles.paypalLoading}>
              <AlertCircle size={18} />
              <span>This plan is not yet available for purchase. Please contact support.</span>
            </div>
          )}

          {/* Stripe placeholder */}
          <div className={styles.stripeSection}>
            <div className={styles.stripePlaceholder}>
              <CreditCard size={16} />
              <span>Credit/Debit card coming soon</span>
            </div>
          </div>

          {/* Security note */}
          <div className={styles.securityNote}>
            <Lock size={14} className={styles.securityIcon} />
            <span>
              Your payment is processed securely by PayPal. We never store your payment details.
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
