import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPayPalWebhook } from '@/lib/payments/paypal'

/**
 * POST /api/webhooks/paypal
 *
 * Handles PayPal webhook events for subscription lifecycle.
 * Uses service_role for DB writes. Verifies webhook signature.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    // 1. Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID
    if (!webhookId) {
      console.error('PAYPAL_WEBHOOK_ID not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const isValid = await verifyPayPalWebhook(headers, rawBody, webhookId)
    if (!isValid) {
      console.error('PayPal webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. Parse event
    const event = JSON.parse(rawBody)
    const eventType = event.event_type as string
    const resource = event.resource

    // 3. Service role client for privileged operations
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. Handle event types
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const subId = resource.id
        await serviceClient.rpc('update_subscription_status', {
          p_provider_subscription_id: subId,
          p_status: 'active',
          p_period_start: resource.billing_info?.last_payment?.time || null,
          p_period_end: resource.billing_info?.next_billing_time || null,
        })
        break
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        const subId = resource.id
        await serviceClient.rpc('update_subscription_status', {
          p_provider_subscription_id: subId,
          p_status: 'cancelled',
        })
        break
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const subId = resource.id
        await serviceClient.rpc('update_subscription_status', {
          p_provider_subscription_id: subId,
          p_status: 'suspended',
        })
        break
      }

      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const subId = resource.id
        await serviceClient.rpc('update_subscription_status', {
          p_provider_subscription_id: subId,
          p_status: 'expired',
        })
        break
      }

      case 'PAYMENT.SALE.COMPLETED': {
        // Renewal payment
        const billingAgreementId = resource.billing_agreement_id
        if (!billingAgreementId) break

        // Find the subscription
        const { data: subs } = await serviceClient
          .from('subscriptions')
          .select('id, user_id, tier, billing_period')
          .eq('provider_subscription_id', billingAgreementId)
          .limit(1)
          .single()

        if (subs) {
          await serviceClient.rpc('record_order', {
            p_user_id: subs.user_id,
            p_subscription_id: subs.id,
            p_provider: 'paypal',
            p_provider_order_id: resource.id,
            p_amount: Number(resource.amount?.total || 0),
            p_currency: resource.amount?.currency || 'USD',
            p_status: 'completed',
            p_plan_tier: subs.tier,
            p_billing_period: subs.billing_period,
            p_idempotency_key: `paypal_sale_${resource.id}`,
            p_metadata: JSON.stringify({
              paypal_sale_id: resource.id,
              paypal_subscription_id: billingAgreementId,
              event_type: eventType,
            }),
          })
        }
        break
      }

      case 'PAYMENT.SALE.DENIED':
      case 'PAYMENT.SALE.REFUNDED': {
        const billingAgreementId = resource.billing_agreement_id
        if (!billingAgreementId) break

        // Mark subscription as past_due for denied, handle refund
        if (eventType === 'PAYMENT.SALE.DENIED') {
          await serviceClient.rpc('update_subscription_status', {
            p_provider_subscription_id: billingAgreementId,
            p_status: 'past_due',
          })
        }

        // Record the failed/refunded order
        const { data: subs } = await serviceClient
          .from('subscriptions')
          .select('id, user_id, tier, billing_period')
          .eq('provider_subscription_id', billingAgreementId)
          .limit(1)
          .single()

        if (subs) {
          const orderStatus = eventType === 'PAYMENT.SALE.REFUNDED' ? 'refunded' : 'failed'
          await serviceClient.rpc('record_order', {
            p_user_id: subs.user_id,
            p_subscription_id: subs.id,
            p_provider: 'paypal',
            p_provider_order_id: resource.id,
            p_amount: Number(resource.amount?.total || 0),
            p_currency: resource.amount?.currency || 'USD',
            p_status: orderStatus,
            p_plan_tier: subs.tier,
            p_billing_period: subs.billing_period,
            p_idempotency_key: `paypal_${eventType.toLowerCase()}_${resource.id}`,
            p_metadata: JSON.stringify({
              paypal_sale_id: resource.id,
              paypal_subscription_id: billingAgreementId,
              event_type: eventType,
            }),
          })
        }
        break
      }

      default:
        // Unhandled event type — acknowledge but do nothing
        break
    }

    // Always return 200 to PayPal so they don't retry
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('PayPal webhook error:', error)
    // Still return 200 to prevent retry loops for malformed events
    return NextResponse.json({ status: 'error' }, { status: 200 })
  }
}
