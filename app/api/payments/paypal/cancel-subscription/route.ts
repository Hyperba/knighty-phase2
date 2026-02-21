import { NextRequest, NextResponse } from 'next/server'
import { cancelPayPalSubscription } from '@/lib/payments/paypal'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/payments/paypal/cancel-subscription
 *
 * Cancels the user's active subscription:
 *   1. Calls cancel_user_subscription RPC (marks cancel_at_period_end = true in DB)
 *   2. Cancels the subscription on PayPal's side
 *
 * Body: { reason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user via session
    const supabase = await getSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Parse optional reason
    let reason = 'User requested cancellation'
    try {
      const body = await request.json()
      if (body.reason && typeof body.reason === 'string') {
        reason = body.reason.slice(0, 500)
      }
    } catch {
      // Empty body is fine, use default reason
    }

    // 3. Mark subscription for cancellation in DB
    const { data: rpcResult, error: rpcError } = await supabase.rpc('cancel_user_subscription')

    if (rpcError) {
      console.error('cancel_user_subscription RPC error:', rpcError)
      return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
    }

    if (rpcResult?.status === 'error') {
      return NextResponse.json({ error: rpcResult.message }, { status: 400 })
    }

    // 4. Cancel on PayPal's side
    const providerSubId = rpcResult?.provider_subscription_id
    if (providerSubId) {
      try {
        await cancelPayPalSubscription(providerSubId, reason)
      } catch (err) {
        console.error('PayPal cancel failed:', err)
        // DB is already marked — PayPal webhook will also handle this
        // Don't fail the request, but log the issue
      }
    }

    return NextResponse.json({
      status: 'success',
      current_period_end: rpcResult?.current_period_end,
      message: 'Subscription will be cancelled at the end of the current billing period',
    })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
