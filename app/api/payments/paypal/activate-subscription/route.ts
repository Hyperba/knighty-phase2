import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPayPalSubscription } from '@/lib/payments/paypal'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/payments/paypal/activate-subscription
 *
 * Called after the user approves a PayPal subscription on the client.
 * Verifies the subscription with PayPal, then creates DB records.
 *
 * Body: { subscriptionId, planId, tier, billingPeriod }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user via session
    const supabase = await getSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Parse and validate body
    const body = await request.json()
    const { subscriptionId, planId, tier, billingPeriod } = body

    if (!subscriptionId || !planId || !tier || !billingPeriod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 })
    }

    if (!['access', 'builder', 'architect'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // 3. Verify subscription with PayPal
    let paypalSub: any
    try {
      paypalSub = await getPayPalSubscription(subscriptionId)
    } catch (err) {
      console.error('PayPal verification failed:', err)
      return NextResponse.json({ error: 'Failed to verify subscription with PayPal' }, { status: 502 })
    }

    if (paypalSub.status !== 'ACTIVE' && paypalSub.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Subscription is not active. Status: ${paypalSub.status}` },
        { status: 400 }
      )
    }

    // 4. Use service_role client for privileged DB operations
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 5. Calculate period dates from PayPal response
    const periodStart = paypalSub.billing_info?.last_payment?.time
      ? new Date(paypalSub.billing_info.last_payment.time).toISOString()
      : new Date().toISOString()

    const periodEnd = paypalSub.billing_info?.next_billing_time
      ? new Date(paypalSub.billing_info.next_billing_time).toISOString()
      : null

    // 6. Create subscription in DB
    const { data: subResult, error: subError } = await serviceClient.rpc('create_subscription', {
      p_user_id: session.user.id,
      p_plan_id: planId,
      p_tier: tier,
      p_billing_period: billingPeriod,
      p_provider: 'paypal',
      p_provider_subscription_id: subscriptionId,
      p_provider_plan_id: paypalSub.plan_id || '',
      p_period_start: periodStart,
      p_period_end: periodEnd,
    })

    if (subError) {
      console.error('Create subscription RPC error:', subError)
      return NextResponse.json({ error: 'Failed to create subscription record' }, { status: 500 })
    }

    if (subResult?.status === 'error') {
      return NextResponse.json({ error: subResult.message }, { status: 400 })
    }

    // 7. Record the initial order/payment
    const amount = paypalSub.billing_info?.last_payment?.amount?.value
      ? Number(paypalSub.billing_info.last_payment.amount.value)
      : 0

    const currency = paypalSub.billing_info?.last_payment?.amount?.currency_code || 'USD'

    const { error: orderError } = await serviceClient.rpc('record_order', {
      p_user_id: session.user.id,
      p_subscription_id: subResult.subscription_id,
      p_provider: 'paypal',
      p_provider_order_id: subscriptionId,
      p_amount: amount,
      p_currency: currency,
      p_status: 'completed',
      p_plan_tier: tier,
      p_billing_period: billingPeriod,
      p_idempotency_key: `paypal_sub_initial_${subscriptionId}`,
      p_metadata: JSON.stringify({
        paypal_subscription_id: subscriptionId,
        paypal_plan_id: paypalSub.plan_id,
        paypal_status: paypalSub.status,
      }),
    })

    if (orderError) {
      console.error('Record order RPC error:', orderError)
      // Subscription was already created, so don't fail entirely
    }

    return NextResponse.json({
      status: 'success',
      subscription_id: subResult.subscription_id,
      tier,
    })
  } catch (error) {
    console.error('Activate subscription error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
