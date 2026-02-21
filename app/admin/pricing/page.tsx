'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign,
  Plus,
  Save,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Star,
  AlertCircle,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { TIER_COLORS, TIER_LABELS } from '@/lib/types/product'
import ConfirmModal from '@/components/ui/ConfirmModal/ConfirmModal'
import styles from './page.module.css'

// ─── Types ───────────────────────────────────────────

interface PlanFeature {
  id?: string
  feature_text: string
  included: boolean
  is_new: boolean
  sort_order: number
}

interface PricingPlan {
  id: string
  tier: string
  name: string
  tagline: string
  description: string
  monthly_price: number
  yearly_price: number
  cta_label: string
  showcase_image: string
  is_popular: boolean
  sort_order: number
  is_active: boolean
  features: PlanFeature[]
}

type ToastType = 'success' | 'error'

const AVAILABLE_TIERS = ['explorer', 'access', 'builder', 'architect'] as const
const FREE_TIER = 'explorer'

function normalizePlan(p: any): PricingPlan {
  return {
    id: p.id || '',
    tier: p.tier || 'explorer',
    name: p.name || '',
    tagline: p.tagline || '',
    description: p.description || '',
    monthly_price: Number(p.monthly_price) || 0,
    yearly_price: Number(p.yearly_price) || 0,
    cta_label: p.cta_label || 'Subscribe',
    showcase_image: p.showcase_image || '',
    is_popular: Boolean(p.is_popular),
    sort_order: Number(p.sort_order) || 0,
    is_active: p.is_active !== undefined ? Boolean(p.is_active) : true,
    features: Array.isArray(p.features)
      ? p.features.map((f: any) => ({
          id: f.id,
          feature_text: f.feature_text || '',
          included: Boolean(f.included),
          is_new: Boolean(f.is_new),
          sort_order: Number(f.sort_order) || 0,
        }))
      : [],
  }
}

// ─── Component ───────────────────────────────────────

export default function AdminPricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [showNewPlanModal, setShowNewPlanModal] = useState(false)
  const [newPlanTier, setNewPlanTier] = useState('')
  const [newPlanName, setNewPlanName] = useState('')
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PricingPlan | null>(null)

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ─── Fetch Plans ───────────────────────────────────

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data, error } = await supabase.rpc('admin_get_all_pricing_plans')
      if (error) throw error

      if (data?.status === 'success' && data.plans) {
        setPlans(data.plans.map(normalizePlan))
      } else {
        setPlans([])
      }
    } catch (err) {
      console.error('Failed to fetch pricing plans:', err)
      showToast('Failed to load pricing plans', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  // ─── Create Plan ───────────────────────────────────

  const createPlan = async () => {
    if (!newPlanTier || !newPlanName.trim()) {
      showToast('Please select a tier and enter a plan name', 'error')
      return
    }

    setCreatingPlan(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data, error } = await supabase.rpc('admin_upsert_pricing_plan', {
        p_tier: newPlanTier,
        p_name: newPlanName.trim(),
        p_tagline: '',
        p_description: '',
        p_monthly_price: 0,
        p_yearly_price: 0,
        p_cta_label: 'Subscribe',
        p_showcase_image: '',
        p_is_popular: false,
        p_sort_order: plans.length,
        p_is_active: true,
      })

      if (error) throw error
      if (data?.status !== 'success') throw new Error(data?.message || 'Failed to create plan')

      showToast(`${newPlanName.trim()} plan created`, 'success')
      setShowNewPlanModal(false)
      setNewPlanTier('')
      setNewPlanName('')
      await fetchPlans()
      setExpandedPlan(data.id)
    } catch (err: any) {
      console.error('Failed to create plan:', err)
      showToast(err.message || 'Failed to create plan', 'error')
    } finally {
      setCreatingPlan(false)
    }
  }

  // ─── Delete Plan ───────────────────────────────────

  const deletePlan = async (plan: PricingPlan) => {
    const supabase = getSupabaseBrowserClient()

    try {
      const { data, error } = await supabase.rpc('admin_delete_pricing_plan', {
        p_plan_id: plan.id,
      })

      if (error) throw error
      if (data?.status !== 'success') throw new Error(data?.message || 'Failed to delete plan')

      showToast(`${plan.name} plan deleted`, 'success')
      setDeleteTarget(null)
      if (expandedPlan === plan.id) setExpandedPlan(null)
      await fetchPlans()
    } catch (err: any) {
      console.error('Failed to delete plan:', err)
      showToast(err.message || 'Failed to delete plan', 'error')
    }
  }

  // ─── Save Plan ─────────────────────────────────────

  const savePlan = async (plan: PricingPlan) => {
    setSaving(plan.id)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data: planResult, error: planError } = await supabase.rpc('admin_upsert_pricing_plan', {
        p_id: plan.id,
        p_tier: plan.tier,
        p_name: plan.name.trim(),
        p_tagline: plan.tagline.trim(),
        p_description: plan.description.trim(),
        p_monthly_price: plan.monthly_price,
        p_yearly_price: plan.yearly_price,
        p_cta_label: plan.cta_label.trim(),
        p_showcase_image: plan.showcase_image.trim(),
        p_is_popular: plan.is_popular,
        p_sort_order: plan.sort_order,
        p_is_active: plan.is_active,
      })

      if (planError) throw planError
      if (planResult?.status !== 'success') throw new Error(planResult?.message || 'Failed to save plan')

      const featuresPayload = plan.features
        .filter(f => f.feature_text.trim() !== '')
        .map((f, i) => ({
          feature_text: f.feature_text.trim(),
          included: f.included,
          is_new: f.is_new,
          sort_order: i,
        }))

      const { data: featResult, error: featError } = await supabase.rpc('admin_set_plan_features', {
        p_plan_id: plan.id,
        p_features: featuresPayload,
      })

      if (featError) throw featError
      if (featResult?.status !== 'success') throw new Error(featResult?.message || 'Failed to save features')

      showToast(`${plan.name} plan saved successfully`, 'success')
      await fetchPlans()
    } catch (err: any) {
      console.error('Failed to save plan:', err)
      showToast(err.message || 'Failed to save plan', 'error')
    } finally {
      setSaving(null)
    }
  }

  // ─── Update local plan state ───────────────────────

  const updatePlan = (planId: string, field: keyof PricingPlan, value: any) => {
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, [field]: value } : p
    ))
  }

  const updateFeature = (planId: string, featureIndex: number, field: keyof PlanFeature, value: any) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p
      const features = [...p.features]
      features[featureIndex] = { ...features[featureIndex], [field]: value }
      return { ...p, features }
    }))
  }

  const addFeature = (planId: string) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p
      return {
        ...p,
        features: [...p.features, {
          feature_text: '',
          included: true,
          is_new: false,
          sort_order: p.features.length,
        }],
      }
    }))
  }

  const removeFeature = (planId: string, featureIndex: number) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p
      return {
        ...p,
        features: p.features.filter((_, i) => i !== featureIndex),
      }
    }))
  }

  const moveFeature = (planId: string, fromIndex: number, direction: 'up' | 'down') => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p
      const features = [...p.features]
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
      if (toIndex < 0 || toIndex >= features.length) return p
      ;[features[fromIndex], features[toIndex]] = [features[toIndex], features[fromIndex]]
      return { ...p, features }
    }))
  }

  // ─── Derived data ──────────────────────────────────

  const usedTiers = new Set(plans.map(p => p.tier))
  const availableTiers = AVAILABLE_TIERS.filter(t => !usedTiers.has(t))

  // ─── Render ────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <DollarSign size={22} />
            Pricing Plans
          </h1>
          <p className={styles.subtitle}>
            Manage your pricing tiers, features, and display settings
          </p>
        </div>
        <button
          className={styles.createPlanBtn}
          onClick={() => setShowNewPlanModal(true)}
          disabled={availableTiers.length === 0}
          title={availableTiers.length === 0 ? 'All tiers already have plans' : 'Create a new plan'}
        >
          <Plus size={16} />
          New Plan
        </button>
      </header>

      {/* Plans List */}
      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <p>Loading pricing plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className={styles.emptyState}>
          <AlertCircle size={32} />
          <p>No pricing plans found.</p>
          <p className={styles.emptyHint}>Click <strong>New Plan</strong> above to create your first plan, or run <code>seed-pricing.sql</code> in Supabase.</p>
        </div>
      ) : (
        <div className={styles.plansList}>
          {plans.map((plan) => {
            const isExpanded = expandedPlan === plan.id
            const isSaving = saving === plan.id
            const tierColor = TIER_COLORS[plan.tier as keyof typeof TIER_COLORS] || '#8b5cf6'

            return (
              <div
                key={plan.id}
                className={`${styles.planCard} ${!plan.is_active ? styles.planInactive : ''}`}
                style={{ '--plan-color': tierColor } as React.CSSProperties}
              >
                {/* Plan Header (always visible) */}
                <div className={styles.planHeader} onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}>
                  <div className={styles.planHeaderLeft}>
                    <div className={styles.planColorDot} />
                    <div className={styles.planHeaderInfo}>
                      <div className={styles.planHeaderTitle}>
                        <span className={styles.planName}>{plan.name}</span>
                        <span className={styles.planTierBadge} style={{ background: tierColor }}>
                          {TIER_LABELS[plan.tier as keyof typeof TIER_LABELS] || plan.tier}
                        </span>
                        {plan.is_popular && (
                          <span className={styles.popularBadge}>
                            <Star size={10} /> Popular
                          </span>
                        )}
                        {!plan.is_active && (
                          <span className={styles.inactiveBadge}>
                            <EyeOff size={10} /> Hidden
                          </span>
                        )}
                      </div>
                      <div className={styles.planHeaderMeta}>
                        <span>${plan.monthly_price}/mo</span>
                        <span className={styles.metaDivider}>·</span>
                        <span>${plan.yearly_price}/yr</span>
                        <span className={styles.metaDivider}>·</span>
                        <span>{plan.features.length} features</span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={18} className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`} />
                </div>

                {/* Expanded Edit Form */}
                {isExpanded && (
                  <div className={styles.planBody}>
                    {/* Basic Info */}
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>Plan Details</h3>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>Plan Name</label>
                          <input
                            type="text"
                            value={plan.name}
                            onChange={(e) => updatePlan(plan.id, 'name', e.target.value)}
                            maxLength={50}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Tagline</label>
                          <input
                            type="text"
                            value={plan.tagline}
                            onChange={(e) => updatePlan(plan.id, 'tagline', e.target.value)}
                            maxLength={100}
                          />
                        </div>
                        <div className={styles.formGroup + ' ' + styles.formGroupFull}>
                          <label>Description</label>
                          <textarea
                            value={plan.description}
                            onChange={(e) => updatePlan(plan.id, 'description', e.target.value)}
                            maxLength={300}
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>Pricing</h3>
                      {plan.tier === FREE_TIER ? (
                        <p className={styles.lockedNote}>The free plan is always $0 and cannot be changed.</p>
                      ) : (
                        <div className={styles.formGrid}>
                          <div className={styles.formGroup}>
                            <label>Monthly Price ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={plan.monthly_price}
                              onChange={(e) => updatePlan(plan.id, 'monthly_price', Number(e.target.value))}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Yearly Price ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={plan.yearly_price}
                              onChange={(e) => updatePlan(plan.id, 'yearly_price', Number(e.target.value))}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Display Settings */}
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>Display Settings</h3>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>CTA Button Text</label>
                          <input
                            type="text"
                            value={plan.cta_label}
                            onChange={(e) => updatePlan(plan.id, 'cta_label', e.target.value)}
                            maxLength={50}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Showcase Image Path</label>
                          <input
                            type="text"
                            value={plan.showcase_image}
                            onChange={(e) => updatePlan(plan.id, 'showcase_image', e.target.value)}
                            placeholder="/builds/example.png"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Sort Order</label>
                          <input
                            type="number"
                            min="0"
                            value={plan.sort_order}
                            onChange={(e) => updatePlan(plan.id, 'sort_order', Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className={styles.toggleRow}>
                        <label className={styles.toggleLabel}>
                          <input
                            type="checkbox"
                            checked={plan.is_popular}
                            onChange={(e) => updatePlan(plan.id, 'is_popular', e.target.checked)}
                          />
                          <Star size={14} />
                          Mark as Popular
                        </label>
                        <label className={styles.toggleLabel}>
                          <input
                            type="checkbox"
                            checked={plan.is_active}
                            onChange={(e) => updatePlan(plan.id, 'is_active', e.target.checked)}
                          />
                          {plan.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                          {plan.is_active ? 'Visible on pricing page' : 'Hidden from pricing page'}
                        </label>
                      </div>
                    </div>

                    {/* Features */}
                    <div className={styles.section}>
                      <div className={styles.sectionHeader}>
                        <h3 className={styles.sectionTitle}>Features ({plan.features.length})</h3>
                        <button
                          className={styles.addFeatureBtn}
                          onClick={() => addFeature(plan.id)}
                        >
                          <Plus size={14} />
                          Add Feature
                        </button>
                      </div>

                      {plan.features.length === 0 ? (
                        <p className={styles.noFeatures}>No features added yet.</p>
                      ) : (
                        <div className={styles.featuresList}>
                          {plan.features.map((feature, idx) => (
                            <div key={idx} className={styles.featureItem}>
                              <div className={styles.featureReorder}>
                                <button
                                  className={styles.reorderBtn}
                                  onClick={() => moveFeature(plan.id, idx, 'up')}
                                  disabled={idx === 0}
                                  title="Move up"
                                >
                                  <ChevronUp size={14} />
                                </button>
                                <GripVertical size={14} className={styles.gripIcon} />
                                <button
                                  className={styles.reorderBtn}
                                  onClick={() => moveFeature(plan.id, idx, 'down')}
                                  disabled={idx === plan.features.length - 1}
                                  title="Move down"
                                >
                                  <ChevronDown size={14} />
                                </button>
                              </div>

                              <input
                                type="text"
                                className={styles.featureInput}
                                value={feature.feature_text}
                                onChange={(e) => updateFeature(plan.id, idx, 'feature_text', e.target.value)}
                                placeholder="Feature description..."
                                maxLength={200}
                              />

                              <label className={styles.featureToggle} title="Included in plan">
                                <input
                                  type="checkbox"
                                  checked={feature.included}
                                  onChange={(e) => updateFeature(plan.id, idx, 'included', e.target.checked)}
                                />
                                {feature.included ? (
                                  <Check size={14} className={styles.featureIncluded} />
                                ) : (
                                  <X size={14} className={styles.featureExcluded} />
                                )}
                              </label>

                              <label className={styles.featureNewToggle} title="Show NEW badge">
                                <input
                                  type="checkbox"
                                  checked={feature.is_new}
                                  onChange={(e) => updateFeature(plan.id, idx, 'is_new', e.target.checked)}
                                />
                                <span className={`${styles.newBadge} ${feature.is_new ? styles.newBadgeActive : ''}`}>
                                  NEW
                                </span>
                              </label>

                              <button
                                className={styles.removeFeatureBtn}
                                onClick={() => removeFeature(plan.id, idx)}
                                title="Remove feature"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer: Save + Delete */}
                    <div className={styles.planFooter}>
                      {plan.tier === FREE_TIER ? (
                        <span className={styles.lockedNote}>Free plan cannot be deleted</span>
                      ) : (
                        <button
                          className={styles.deletePlanBtn}
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(plan) }}
                        >
                          <Trash2 size={14} />
                          Delete Plan
                        </button>
                      )}
                      <button
                        className={styles.saveBtn}
                        onClick={() => savePlan(plan)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 size={16} className={styles.spinner} />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* New Plan Modal */}
      {showNewPlanModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewPlanModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Create New Plan</h2>

            <div className={styles.formGroup}>
              <label>Tier</label>
              {availableTiers.length === 0 ? (
                <p className={styles.noTiersMsg}>All tiers already have plans assigned.</p>
              ) : (
                <select
                  className={styles.tierSelect}
                  value={newPlanTier}
                  onChange={(e) => setNewPlanTier(e.target.value)}
                >
                  <option value="">Select a tier...</option>
                  {availableTiers.map(tier => (
                    <option key={tier} value={tier}>
                      {TIER_LABELS[tier as keyof typeof TIER_LABELS] || tier}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Plan Name</label>
              <input
                type="text"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="e.g. Explorer, Builder..."
                maxLength={50}
              />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowNewPlanModal(false)}>
                Cancel
              </button>
              <button
                className={styles.modalConfirm}
                onClick={createPlan}
                disabled={creatingPlan || !newPlanTier || !newPlanName.trim()}
              >
                {creatingPlan ? (
                  <><Loader2 size={14} className={styles.spinner} /> Creating...</>
                ) : (
                  <><Plus size={14} /> Create Plan</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Plan"
        message={`Are you sure you want to delete the "${deleteTarget?.name}" plan? This will also delete all its features. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => deleteTarget && deletePlan(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        confirmVariant="danger"
      />
    </div>
  )
}
