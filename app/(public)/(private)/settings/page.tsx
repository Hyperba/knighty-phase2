'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Shield, 
  User, 
  CreditCard, 
  Settings as SettingsIcon,
  Save,
  X,
  Check,
  Crown,
  Sparkles,
  Calendar,
  Clock,
  AlertCircle,
  ExternalLink,
  Download,
  FileText,
  ChevronRight,
  Mail,
  Bell,
} from 'lucide-react'
import { useAuth } from '@/components/contexts/AuthContext'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { TIER_LABELS, TIER_COLORS, UserTier } from '@/lib/types/product'
import styles from './page.module.css'

const MC_HEADS_PREFIX = 'https://mc-heads.net/avatar/'

function getMcIgnFromUrl(url: string): string {
  if (url.startsWith(MC_HEADS_PREFIX)) {
    return url.slice(MC_HEADS_PREFIX.length).split('/')[0]
  }
  return ''
}

function buildAvatarUrl(mcIgn: string): string {
  const cleaned = mcIgn.trim().replace(/[^a-zA-Z0-9_]/g, '')
  if (!cleaned) return ''
  return `${MC_HEADS_PREFIX}${cleaned}`
}

interface ProfileFormData {
  display_name: string
  bio: string
  minecraft_ign: string
}

interface SubscriptionData {
  id: string
  plan_id: string
  tier: string
  billing_period: string
  status: string
  provider: string
  provider_subscription_id: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  cancelled_at: string | null
  created_at: string
  plan_name: string
}

interface OrderData {
  id: string
  provider: string
  provider_order_id: string
  amount: number
  currency: string
  status: string
  plan_tier: string
  billing_period: string
  created_at: string
}

interface HandleChangeState {
  isEditing: boolean
  newHandle: string
  saving: boolean
  error: string | null
  success: boolean
}

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'billing'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: '',
    bio: '',
    minecraft_ign: ''
  })
  const [handleChange, setHandleChange] = useState<HandleChangeState>({
    isEditing: false,
    newHandle: '',
    saving: false,
    error: null,
    success: false
  })

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [orders, setOrders] = useState<OrderData[]>([])
  const [billingLoading, setBillingLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  const isAdmin = profile?.tier === 'admin'
  const userTier = (profile?.tier || 'explorer') as UserTier

  const fetchBillingData = useCallback(async () => {
    if (!user) return
    setBillingLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const [subRes, ordersRes] = await Promise.all([
        supabase.rpc('get_user_subscription'),
        supabase.rpc('get_user_orders', { p_limit: 20, p_offset: 0 }),
      ])

      if (subRes.data?.status === 'success' && subRes.data.subscription) {
        setSubscription(subRes.data.subscription)
      } else {
        setSubscription(null)
      }

      if (ordersRes.data?.status === 'success') {
        setOrders(ordersRes.data.orders || [])
      }
    } catch (err) {
      console.error('Failed to fetch billing data:', err)
    } finally {
      setBillingLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (activeTab === 'billing' && user) {
      fetchBillingData()
    }
  }, [activeTab, user, fetchBillingData])

  const handleCancelSubscription = async () => {
    if (!subscription) return
    setCancelling(true)

    try {
      const res = await fetch('/api/payments/paypal/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User requested cancellation from settings' }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setMessage({ type: 'error', text: data.error || 'Failed to cancel subscription' })
      } else {
        setMessage({ type: 'success', text: data.message || 'Subscription cancelled' })
        setCancelConfirm(false)
        await fetchBillingData()
        await refreshProfile()
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to cancel subscription. Please try again.' })
    } finally {
      setCancelling(false)
    }
  }

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        minecraft_ign: getMcIgnFromUrl(profile.avatar_url || '')
      })
    }
  }, [profile])

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    setMessage(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const avatarUrl = buildAvatarUrl(formData.minecraft_ign)

      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: formData.display_name.slice(0, 50),
          bio: formData.bio,
          avatar_url: avatarUrl
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      setIsEditing(false)
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (err) {
      console.error('Failed to update profile:', err)
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        minecraft_ign: getMcIgnFromUrl(profile.avatar_url || '')
      })
    }
  }

  const canChangeHandle = (): { allowed: boolean; daysRemaining: number | null } => {
    if (!profile?.handle_changed_at) {
      return { allowed: true, daysRemaining: null }
    }
    const lastChange = new Date(profile.handle_changed_at)
    const now = new Date()
    const diffMs = now.getTime() - lastChange.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays >= 14) {
      return { allowed: true, daysRemaining: null }
    }
    return { allowed: false, daysRemaining: 14 - diffDays }
  }

  const handleSaveHandle = async () => {
    if (!user || !handleChange.newHandle.trim()) return
    
    setHandleChange(prev => ({ ...prev, saving: true, error: null }))
    
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('update_user_handle', {
        p_new_handle: handleChange.newHandle.trim()
      })
      
      if (error) throw error
      
      if (data?.status === 'error') {
        setHandleChange(prev => ({ 
          ...prev, 
          saving: false, 
          error: data.message 
        }))
        return
      }
      
      await refreshProfile()
      setHandleChange({
        isEditing: false,
        newHandle: '',
        saving: false,
        error: null,
        success: true
      })
      setMessage({ type: 'success', text: 'Username updated successfully!' })
      
      setTimeout(() => {
        setHandleChange(prev => ({ ...prev, success: false }))
      }, 3000)
    } catch (err) {
      console.error('Failed to update handle:', err)
      setHandleChange(prev => ({ 
        ...prev, 
        saving: false, 
        error: 'Failed to update username. Please try again.' 
      }))
    }
  }

  const handleCancelHandleEdit = () => {
    setHandleChange({
      isEditing: false,
      newHandle: '',
      saving: false,
      error: null,
      success: false
    })
  }

  const getTierDescription = (tier: UserTier) => {
    const descriptions: Record<UserTier, string> = {
      explorer: 'Access to free community builds',
      access: 'Unlock additional builds and features',
      builder: 'Builder tier with premium content',
      architect: 'Full access to all builds and priority support',
      admin: 'Administrator with full platform access'
    }
    return descriptions[tier]
  }

  if (!profile) {
    return (
      <main className={styles.settings}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading your settings...</p>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.settings}>
      <div className={styles.header}>
        <h1 className={styles.title}>SETTINGS</h1>
        <p className={styles.subtitle}>Manage your profile, account, and subscription</p>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.profileCard}>
            <div className={styles.avatarWrapper}>
              {profile.avatar_url ? (
                <Image 
                  src={profile.avatar_url} 
                  alt={profile.display_name || 'Profile'} 
                  width={80} 
                  height={80}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {(profile.display_name || profile.handle || 'U')[0].toUpperCase()}
                </div>
              )}
              <div 
                className={styles.tierBadge}
                style={{ background: TIER_COLORS[userTier] }}
              >
                {userTier === 'admin' ? <Shield size={10} /> : <Crown size={10} />}
              </div>
            </div>
            <h3 className={styles.profileName}>{profile.display_name || profile.handle}</h3>
            <p className={styles.profileHandle}>@{profile.handle}</p>
            <span 
              className={styles.profileTier}
              style={{ color: TIER_COLORS[userTier] }}
            >
              {TIER_LABELS[userTier]}
            </span>
          </div>

          <nav className={styles.navTabs}>
            <button
              className={`${styles.navTab} ${activeTab === 'profile' ? styles.navTabActive : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={18} />
              Profile
              <ChevronRight size={16} className={styles.navChevron} />
            </button>
            <button
              className={`${styles.navTab} ${activeTab === 'account' ? styles.navTabActive : ''}`}
              onClick={() => setActiveTab('account')}
            >
              <SettingsIcon size={18} />
              Account
              <ChevronRight size={16} className={styles.navChevron} />
            </button>
            <button
              className={`${styles.navTab} ${activeTab === 'billing' ? styles.navTabActive : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              <CreditCard size={18} />
              Billing
              <ChevronRight size={16} className={styles.navChevron} />
            </button>
          </nav>
        </aside>

        <div className={styles.content}>
          {message && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              {message.text}
              <button onClick={() => setMessage(null)} className={styles.messageClose}>
                <X size={16} />
              </button>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Profile Information</h2>
                  <p className={styles.panelDescription}>Update your personal details and public profile</p>
                </div>
                {!isEditing ? (
                  <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </button>
                ) : (
                  <div className={styles.editActions}>
                    <button className={styles.cancelBtn} onClick={handleCancelEdit} disabled={saving}>
                      <X size={16} />
                      Cancel
                    </button>
                    <button className={styles.saveBtn} onClick={handleSaveProfile} disabled={saving}>
                      {saving ? <div className={styles.btnSpinner} /> : <Save size={16} />}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.panelBody}>
                <div className={styles.formSection}>
                  <div className={styles.avatarSection}>
                    <div className={styles.avatarEdit}>
                      {(() => {
                        const previewUrl = isEditing
                          ? buildAvatarUrl(formData.minecraft_ign)
                          : profile.avatar_url
                        return previewUrl ? (
                          <Image 
                            src={previewUrl} 
                            alt="Avatar" 
                            width={100} 
                            height={100}
                            className={styles.avatarLarge}
                          />
                        ) : (
                          <div className={styles.avatarLargePlaceholder}>
                            {(profile.display_name || profile.handle || 'U')[0].toUpperCase()}
                          </div>
                        )
                      })()}
                    </div>
                    {isEditing && (
                      <div className={styles.avatarUrlInput}>
                        <label>Minecraft Username</label>
                        <input
                          type="text"
                          placeholder="e.g. Notch"
                          value={formData.minecraft_ign}
                          onChange={(e) => setFormData(prev => ({ ...prev, minecraft_ign: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                          maxLength={16}
                        />
                        <span className={styles.fieldHint}>
                          Your Minecraft skin face will be used as your avatar
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Username</label>
                      {handleChange.isEditing ? (
                        <div className={styles.handleEditRow}>
                          <div className={styles.handleInputWrapper}>
                            <span className={styles.handlePrefix}>@</span>
                            <input
                              type="text"
                              placeholder="new_username"
                              value={handleChange.newHandle}
                              onChange={(e) => setHandleChange(prev => ({ 
                                ...prev, 
                                newHandle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                                error: null 
                              }))}
                              disabled={handleChange.saving}
                              maxLength={20}
                            />
                          </div>
                          <div className={styles.handleActions}>
                            <button 
                              className={styles.handleCancelBtn}
                              onClick={handleCancelHandleEdit}
                              disabled={handleChange.saving}
                            >
                              <X size={14} />
                            </button>
                            <button 
                              className={styles.handleSaveBtn}
                              onClick={handleSaveHandle}
                              disabled={handleChange.saving || !handleChange.newHandle.trim()}
                            >
                              {handleChange.saving ? <div className={styles.btnSpinner} /> : <Check size={14} />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.handleDisplayRow}>
                          <div className={styles.readOnlyField}>
                            <span>@{profile.handle}</span>
                          </div>
                          {canChangeHandle().allowed ? (
                            <button 
                              className={styles.changeHandleBtn}
                              onClick={() => setHandleChange(prev => ({ ...prev, isEditing: true, newHandle: '' }))}
                            >
                              Change
                            </button>
                          ) : (
                            <span className={styles.handleCooldown}>
                              <Clock size={12} />
                              {canChangeHandle().daysRemaining} days
                            </span>
                          )}
                        </div>
                      )}
                      {handleChange.error && (
                        <span className={styles.fieldError}>{handleChange.error}</span>
                      )}
                      <span className={styles.fieldHint}>
                        {canChangeHandle().allowed 
                          ? 'You can change your username once every 14 days'
                          : `You can change your username again in ${canChangeHandle().daysRemaining} days`
                        }
                      </span>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Display Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          placeholder="Your display name"
                          value={formData.display_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                          maxLength={50}
                        />
                      ) : (
                        <div className={styles.readOnlyField}>
                          <span>{profile.display_name || 'Not set'}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.formGroup + ' ' + styles.fullWidth}>
                      <label>Bio</label>
                      {isEditing ? (
                        <textarea
                          placeholder="Tell us about yourself..."
                          value={formData.bio}
                          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                          rows={4}
                        />
                      ) : (
                        <div className={styles.readOnlyField}>
                          <span>{profile.bio || 'No bio yet'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Account Settings</h2>
                  <p className={styles.panelDescription}>Manage your account security and preferences</p>
                </div>
              </div>

              <div className={styles.panelBody}>
                <div className={styles.accountSection}>
                  <h3 className={styles.sectionLabel}>Email Address</h3>
                  <div className={styles.accountItem}>
                    <div className={styles.accountItemIcon}>
                      <Mail size={20} />
                    </div>
                    <div className={styles.accountItemContent}>
                      <span className={styles.accountItemValue}>{user?.email}</span>
                      <span className={styles.accountItemHint}>Primary email for notifications</span>
                    </div>
                    <span className={styles.verifiedBadge}>
                      <Check size={12} /> Verified
                    </span>
                  </div>
                </div>

                <div className={styles.accountSection}>
                  <h3 className={styles.sectionLabel}>Current Membership</h3>
                  <div className={styles.tierCard}>
                    <div 
                      className={styles.tierCardIcon}
                      style={{ background: TIER_COLORS[userTier] }}
                    >
                      {userTier === 'admin' ? <Shield size={24} /> : <Crown size={24} />}
                    </div>
                    <div className={styles.tierCardContent}>
                      <span 
                        className={styles.tierCardName}
                        style={{ color: TIER_COLORS[userTier] }}
                      >
                        {TIER_LABELS[userTier]}
                      </span>
                      <span className={styles.tierCardDesc}>{getTierDescription(userTier)}</span>
                    </div>
                    {userTier !== 'admin' && userTier !== 'architect' && (
                      <Link href="/pricing" className={styles.upgradeBtn}>
                        <Sparkles size={16} />
                        Upgrade
                      </Link>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className={styles.adminSection}>
                    <div className={styles.adminCard}>
                      <div className={styles.adminCardHeader}>
                        <Shield size={20} />
                        <h3>Administrator Access</h3>
                      </div>
                      <p>You have full administrator privileges on this platform. Access the admin dashboard to manage content, users, and site settings.</p>
                      <Link href="/admin" className={styles.adminLink}>
                        <Shield size={16} />
                        Open Admin Dashboard
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                )}

                <div className={styles.accountSection}>
                  <h3 className={styles.sectionLabel}>Notification Preferences</h3>
                  <div className={styles.preferencesList}>
                    <div className={styles.preferenceItem}>
                      <div className={styles.preferenceInfo}>
                        <Bell size={18} />
                        <div>
                          <span>Email Notifications</span>
                          <p>Receive updates about new builds and features</p>
                        </div>
                      </div>
                      <label className={styles.toggle}>
                        <input type="checkbox" defaultChecked />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                    <div className={styles.preferenceItem}>
                      <div className={styles.preferenceInfo}>
                        <Sparkles size={18} />
                        <div>
                          <span>Newsletter</span>
                          <p>Weekly digest of new content and updates</p>
                        </div>
                      </div>
                      <label className={styles.toggle}>
                        <input type="checkbox" defaultChecked />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className={styles.dangerZone}>
                  <h3 className={styles.dangerTitle}>Danger Zone</h3>
                  <div className={styles.dangerItem}>
                    <div>
                      <span>Delete Account</span>
                      <p>Permanently delete your account and all associated data</p>
                    </div>
                    <button className={styles.dangerBtn}>Delete Account</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Billing & Subscription</h2>
                  <p className={styles.panelDescription}>Manage your subscription and payment history</p>
                </div>
              </div>

              <div className={styles.panelBody}>
                {billingLoading ? (
                  <div className={styles.billingLoading}>
                    <div className={styles.spinner} />
                    <p>Loading billing info...</p>
                  </div>
                ) : (
                  <>
                    <div className={styles.subscriptionCard}>
                      <div className={styles.subscriptionHeader}>
                        <div 
                          className={styles.subscriptionIcon}
                          style={{ background: TIER_COLORS[userTier] }}
                        >
                          {userTier === 'admin' ? <Shield size={28} /> : <Crown size={28} />}
                        </div>
                        <div className={styles.subscriptionInfo}>
                          <span className={styles.subscriptionPlan} style={{ color: TIER_COLORS[userTier] }}>
                            {subscription ? subscription.plan_name : TIER_LABELS[userTier]} Plan
                          </span>
                          <span className={styles.subscriptionStatus}>
                            {!subscription
                              ? (userTier === 'admin' ? 'Administrator' : 'No active subscription')
                              : subscription.cancel_at_period_end
                                ? 'Cancels at end of period'
                                : subscription.status === 'active'
                                  ? 'Active'
                                  : subscription.status === 'past_due'
                                    ? 'Past due'
                                    : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
                            }
                          </span>
                        </div>
                        {subscription && subscription.current_period_end && (
                          <div className={styles.subscriptionBilling}>
                            <span className={styles.billingDate}>
                              <Calendar size={14} />
                              {subscription.cancel_at_period_end ? 'Access until' : 'Renews'}{' '}
                              {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {subscription.billing_period && (
                              <span className={styles.billingPeriod}>
                                {subscription.billing_period === 'yearly' ? 'Annual billing' : 'Monthly billing'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {userTier !== 'admin' && (
                        <div className={styles.subscriptionActions}>
                          {!subscription ? (
                            <Link href="/pricing" className={styles.primaryBtn}>
                              <Sparkles size={16} />
                              Upgrade Your Plan
                            </Link>
                          ) : (
                            <>
                              <Link href="/pricing" className={styles.primaryBtn}>
                                <Sparkles size={16} />
                                Change Plan
                              </Link>
                              {!subscription.cancel_at_period_end && (
                                cancelConfirm ? (
                                  <div className={styles.cancelConfirmRow}>
                                    <span className={styles.cancelConfirmText}>Are you sure?</span>
                                    <button 
                                      className={styles.cancelConfirmBtn}
                                      onClick={handleCancelSubscription}
                                      disabled={cancelling}
                                    >
                                      {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                                    </button>
                                    <button 
                                      className={styles.cancelDismissBtn}
                                      onClick={() => setCancelConfirm(false)}
                                      disabled={cancelling}
                                    >
                                      Keep plan
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    className={styles.secondaryBtn}
                                    onClick={() => setCancelConfirm(true)}
                                  >
                                    Cancel Subscription
                                  </button>
                                )
                              )}
                              {subscription.cancel_at_period_end && (
                                <span className={styles.cancelledNote}>
                                  <AlertCircle size={14} />
                                  Your plan will remain active until the end of your billing period
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={styles.billingSection}>
                      <h3 className={styles.sectionLabel}>Payment Method</h3>
                      {!subscription ? (
                        <div className={styles.noPayment}>
                          <CreditCard size={24} />
                          <p>No payment method on file</p>
                          <span>Add a payment method when you upgrade your plan</span>
                        </div>
                      ) : (
                        <div className={styles.paymentMethod}>
                          <div className={styles.paymentCard}>
                            <div className={styles.paymentIcon}>
                              {subscription.provider === 'paypal' ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788l.038-.2.73-4.627.047-.256a.929.929 0 0 1 .917-.789h.578c3.757 0 6.695-1.528 7.552-5.949.36-1.847.174-3.388-.766-4.474z"/>
                                </svg>
                              ) : (
                                <CreditCard size={20} />
                              )}
                            </div>
                            <div className={styles.paymentDetails}>
                              <span className={styles.paymentProvider}>
                                {subscription.provider === 'paypal' ? 'PayPal' : 'Credit Card'}
                              </span>
                              <span className={styles.paymentHint}>
                                Managed via {subscription.provider === 'paypal' ? 'your PayPal account' : 'payment provider'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={styles.billingSection}>
                      <h3 className={styles.sectionLabel}>Payment History</h3>
                      {orders.length === 0 ? (
                        <div className={styles.noHistory}>
                          <FileText size={24} />
                          <p>No payment history</p>
                          <span>Your payments will appear here once you subscribe</span>
                        </div>
                      ) : (
                        <div className={styles.invoiceList}>
                          {orders.map((order) => (
                            <div key={order.id} className={styles.invoiceItem}>
                              <div className={styles.invoiceInfo}>
                                <span className={styles.invoiceDate}>
                                  {new Date(order.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className={styles.invoicePlan}>
                                  {TIER_LABELS[order.plan_tier as UserTier] || order.plan_tier} Plan
                                  {' — '}
                                  {order.billing_period === 'yearly' ? 'Annual' : 'Monthly'}
                                </span>
                              </div>
                              <div className={styles.invoiceRight}>
                                <span className={styles.invoiceAmount}>
                                  ${Number(order.amount).toFixed(2)} {order.currency}
                                </span>
                                <span className={`${styles.invoiceStatus} ${styles['invoiceStatus_' + order.status]}`}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={styles.billingNote}>
                      <AlertCircle size={16} />
                      <p>
                        Payments are processed securely via PayPal. We never store your payment details.
                        Need help? <Link href="/contact">Contact support</Link>
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
