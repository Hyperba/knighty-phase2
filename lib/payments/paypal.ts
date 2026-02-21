/**
 * PayPal server-side utilities.
 * Used by API routes only — never import this in client components.
 */

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!

/** Cache the access token for its lifetime minus a buffer. */
let cachedToken: { token: string; expiresAt: number } | null = null

/** Get an OAuth2 access token from PayPal. */
export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal auth failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 60s buffer
  }

  return data.access_token
}

/** Fetch subscription details from PayPal. */
export async function getPayPalSubscription(subscriptionId: string) {
  const token = await getPayPalAccessToken()

  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal get subscription failed: ${res.status} ${text}`)
  }

  return res.json()
}

/** Cancel a subscription on PayPal's side. */
export async function cancelPayPalSubscription(subscriptionId: string, reason: string) {
  const token = await getPayPalAccessToken()

  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })

  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    throw new Error(`PayPal cancel subscription failed: ${res.status} ${text}`)
  }

  return true
}

/** Verify a PayPal webhook signature. */
export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  body: string,
  webhookId: string
): Promise<boolean> {
  const token = await getPayPalAccessToken()

  const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  })

  if (!res.ok) return false

  const data = await res.json()
  return data.verification_status === 'SUCCESS'
}
