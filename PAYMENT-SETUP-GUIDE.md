# Payment System Setup Guide

> Step-by-step instructions to get the Knighty Builds payment system fully operational.
> Last updated: Feb 2026

---

## Prerequisites

- A **Supabase** project with the database schema deployed (`schema.sql`)
- A **PayPal Developer** account (https://developer.paypal.com)
- The app deployed or running locally with access to environment variables

---

## Step 1: Add Supabase Service Role Key

The payment activation API route needs privileged database access to create subscriptions and update user tiers.

1. Go to **Supabase Dashboard → Settings → API**
2. Copy the **service_role** key (under "Project API keys")
3. Add it to your `.env` (local) or hosting environment variables:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

> ⚠️ **Never expose this key client-side.** It bypasses Row Level Security.

---

## Step 2: Create a PayPal REST API App

1. Go to https://developer.paypal.com/dashboard/applications/sandbox
2. Click **Create App**
3. Name it (e.g. "Knighty Builds")
4. Select **Merchant** as the app type
5. After creation, copy the **Client ID** and **Secret**
6. Add to your `.env`:

```env
PAYPAL_CLIENT_ID=AZnD7JBR...
PAYPAL_CLIENT_SECRET=ECMHUTJk...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AZnD7JBR...
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
```

> `NEXT_PUBLIC_PAYPAL_CLIENT_ID` must equal `PAYPAL_CLIENT_ID` — it's the same value, but the `NEXT_PUBLIC_` prefix makes it available to the client-side PayPal SDK.

---

## Step 3: Create PayPal Subscription Plans

PayPal subscriptions require a **Product** and **Plans** created in the PayPal dashboard.

### 3a. Create a Product

1. Go to https://developer.paypal.com/dashboard/applications/sandbox → your app
2. Navigate to **Subscriptions** → **Products** → **Create Product**
3. Fill in:
   - **Name**: `Knighty Builds Subscription`
   - **Type**: `SERVICE`
   - **Category**: `SOFTWARE` (or `DIGITAL_MEDIA_BOOKS_MOVIES_MUSIC`)
4. Save and note the Product ID

### 3b. Create 6 Plans

Under your product, create these plans:

| Plan Name | Tier | Billing | Price |
|-----------|------|---------|-------|
| Access Monthly | access | Monthly | $3.00/month |
| Access Yearly | access | Yearly | $30.00/year |
| Builder Monthly | builder | Monthly | $7.00/month |
| Builder Yearly | builder | Yearly | $70.00/year |
| Architect Monthly | architect | Monthly | $15.00/month |
| Architect Yearly | architect | Yearly | $150.00/year |

For each plan:
1. Click **Create Plan**
2. Select your product
3. Set the billing cycle (Monthly = 1 month interval, Yearly = 1 year interval)
4. Set the price
5. Save and **copy the Plan ID** (starts with `P-`)

---

## Step 4: Store PayPal Plan IDs in Database

Run these SQL statements in the **Supabase SQL Editor**, replacing `P-xxxxx` with your actual Plan IDs from Step 3b:

```sql
-- Access tier
UPDATE public.pricing_plans
SET paypal_plan_id_monthly = 'P-REPLACE_ACCESS_MONTHLY',
    paypal_plan_id_yearly  = 'P-REPLACE_ACCESS_YEARLY'
WHERE tier = 'access';

-- Builder tier
UPDATE public.pricing_plans
SET paypal_plan_id_monthly = 'P-REPLACE_BUILDER_MONTHLY',
    paypal_plan_id_yearly  = 'P-REPLACE_BUILDER_YEARLY'
WHERE tier = 'builder';

-- Architect tier
UPDATE public.pricing_plans
SET paypal_plan_id_monthly = 'P-REPLACE_ARCHITECT_MONTHLY',
    paypal_plan_id_yearly  = 'P-REPLACE_ARCHITECT_YEARLY'
WHERE tier = 'architect';
```

### Verify the data was stored:

```sql
SELECT tier, name, paypal_plan_id_monthly, paypal_plan_id_yearly
FROM public.pricing_plans
WHERE tier IN ('access', 'builder', 'architect');
```

You should see all 6 Plan IDs populated.

---

## Step 5: Configure PayPal Webhook

Webhooks allow PayPal to notify your app about subscription events (renewals, cancellations, etc).

1. Go to **PayPal Developer Dashboard → Your App → Webhooks**
2. Click **Add Webhook**
3. Set the **Webhook URL**:
   - Local dev: Use a tunnel like ngrok (e.g. `https://abc123.ngrok.io/api/webhooks/paypal`)
   - Production: `https://yourdomain.com/api/webhooks/paypal`
4. Select these **event types**:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.DENIED`
   - `PAYMENT.SALE.REFUNDED`
5. Save and **copy the Webhook ID**
6. Add to your `.env`:

```env
PAYPAL_WEBHOOK_ID=5GP028...
```

---

## Step 6: Run the Database Migration (Existing Database Only)

If your database was created **before** the tier rename (i.e. it still has `free/basic/premium/ultimate` values), run the migration:

1. Open **Supabase SQL Editor**
2. Paste and run the contents of `migrations/rename-tiers.sql`
3. Then re-run `seed-pricing.sql` to update the pricing plan data

If you're creating the database **from scratch**, just run `schema.sql` followed by `seed-pricing.sql` — the new tier names are already in place.

---

## Step 7: Verify Your `.env` File

Your complete `.env` should include all of these payment-related variables:

```env
# Supabase (already present)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# PayPal
PAYPAL_CLIENT_ID=AZnD7JBR...
PAYPAL_CLIENT_SECRET=ECMHUTJk...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AZnD7JBR...
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=5GP028...
```

---

## Step 8: Test the Full Flow

1. **Restart your dev server** after adding/changing env vars
2. Go to `/pricing`
3. Click a paid plan card (e.g. Builder)
   - If **not logged in** → auth modal appears with Sign In / Create Account links
   - If **logged in** → redirects to `/checkout?plan=builder&billing=monthly`
4. On the checkout page, PayPal buttons should appear
5. Click **PayPal** → log in with a **sandbox test account**
   - Find sandbox accounts at: https://developer.paypal.com/dashboard/accounts
6. Approve the subscription
7. The app should:
   - Call `/api/payments/paypal/activate-subscription`
   - Create a subscription record in the DB
   - Upgrade the user's tier
   - Show a success message
8. Verify in **Supabase Table Editor**:
   - `user_profiles` → user's `tier` column should be updated
   - `subscriptions` → new row with status `active`
   - `orders` → new row with the payment details

---

## Step 9: Go Live (Production)

When ready to accept real payments:

1. Switch from sandbox to live in PayPal Developer Dashboard
2. Create a **live** REST API app and get live credentials
3. Re-create the Product and Plans under the live app
4. Update your production environment variables:

```env
PAYPAL_CLIENT_ID=<live client ID>
PAYPAL_CLIENT_SECRET=<live secret>
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<live client ID>
PAYPAL_API_BASE=https://api-m.paypal.com
PAYPAL_WEBHOOK_ID=<live webhook ID>
```

5. Update the PayPal Plan IDs in the `pricing_plans` table with the live Plan IDs
6. Configure the live webhook URL

---

## Tier Reference

| Tier Enum Value | Display Name | Price (Monthly) | Price (Yearly) |
|-----------------|--------------|-----------------|----------------|
| `explorer` | Explorer | $0 (free) | $0 (free) |
| `access` | Access | $3 | $30 |
| `builder` | Builder | $7 | $70 |
| `architect` | Architect | $15 | $150 |
| `admin` | Admin | N/A (internal) | N/A (internal) |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| PayPal buttons don't appear | Check `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set and not empty |
| "Failed to verify subscription" error | Check `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are correct |
| User tier doesn't update after payment | Check `SUPABASE_SERVICE_ROLE_KEY` is set |
| Webhook events not received | Verify webhook URL is publicly accessible and `PAYPAL_WEBHOOK_ID` matches |
| "Invalid plan selected" on checkout | Ensure `paypal_plan_id_monthly/yearly` are set in `pricing_plans` table |

---

## Future: Stripe Integration

This section outlines how to add Stripe as a second payment provider alongside PayPal. The database schema already supports Stripe — the `payment_provider` enum includes `'stripe'`, and the `pricing_plans` table has `stripe_price_id_monthly` and `stripe_price_id_yearly` columns.

### Overview of Approach

Stripe uses **Checkout Sessions** (one-time redirect) or **Customer Portal** (self-service) for subscriptions, which is a different model from PayPal's client-side SDK. The recommended approach:

1. **Stripe Checkout** — Redirect users to Stripe's hosted payment page
2. **Stripe Webhooks** — Handle subscription lifecycle events server-side
3. **Stripe Customer Portal** — Let users manage billing themselves

### Step-by-Step Plan

#### 1. Install the Stripe SDK

```bash
npm install stripe @stripe/stripe-js
```

- `stripe` — Server-side Node.js SDK (API routes only)
- `@stripe/stripe-js` — Client-side loader (for redirecting to Checkout)

#### 2. Create a Stripe Account & Get Keys

1. Go to https://dashboard.stripe.com
2. Get your **API keys** from Developers → API Keys:
   - **Publishable key** (`pk_test_...`) — client-side
   - **Secret key** (`sk_test_...`) — server-side only

3. Add to `.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### 3. Create Stripe Products & Prices

In the Stripe Dashboard → Products:

1. Create a Product (e.g. "Knighty Builds Subscription")
2. Create 6 **Prices** (recurring):
   - Access Monthly ($3/mo), Access Yearly ($30/yr)
   - Builder Monthly ($7/mo), Builder Yearly ($70/yr)
   - Architect Monthly ($15/mo), Architect Yearly ($150/yr)
3. Copy each Price ID (starts with `price_`)

4. Store in database:

```sql
UPDATE pricing_plans SET stripe_price_id_monthly = 'price_xxxxx', stripe_price_id_yearly = 'price_yyyyy' WHERE tier = 'access';
UPDATE pricing_plans SET stripe_price_id_monthly = 'price_xxxxx', stripe_price_id_yearly = 'price_yyyyy' WHERE tier = 'builder';
UPDATE pricing_plans SET stripe_price_id_monthly = 'price_xxxxx', stripe_price_id_yearly = 'price_yyyyy' WHERE tier = 'architect';
```

#### 4. Create Server-Side Stripe Library

Create `lib/payments/stripe.ts` (mirrors the PayPal pattern):

```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia', // use latest stable
})
```

#### 5. Create Checkout Session API Route

Create `app/api/payments/stripe/create-checkout/route.ts`:

```typescript
// POST /api/payments/stripe/create-checkout
// Body: { planId, tier, billingPeriod, stripePriceId }
//
// 1. Authenticate user via session
// 2. Validate inputs
// 3. Look up or create Stripe Customer (store stripe_customer_id on user_profiles)
// 4. Create Stripe Checkout Session with:
//    - mode: 'subscription'
//    - line_items: [{ price: stripePriceId, quantity: 1 }]
//    - success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
//    - cancel_url: `${origin}/pricing`
//    - metadata: { user_id, plan_id, tier, billing_period }
// 5. Return { url: session.url } → client redirects to Stripe
```

#### 6. Create Stripe Webhook Handler

Create `app/api/webhooks/stripe/route.ts`:

```typescript
// POST /api/webhooks/stripe
//
// 1. Verify webhook signature using STRIPE_WEBHOOK_SECRET
// 2. Handle events:
//    - checkout.session.completed → create subscription in DB, upgrade tier
//    - invoice.payment_succeeded → record order, extend period
//    - customer.subscription.deleted → downgrade to explorer
//    - customer.subscription.updated → update status
// 3. Use metadata from the Checkout Session to map back to user/plan
```

Key events to subscribe to:
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

#### 7. Update Checkout Page

Modify `app/(public)/(private)/checkout/page.tsx`:

- The page already fetches `stripe_price_id_monthly` / `stripe_price_id_yearly` from `get_checkout_plan`
- Add a **Stripe button** alongside the PayPal button
- On click: `POST /api/payments/stripe/create-checkout` → redirect to `session.url`
- Stripe handles the entire payment UI on their hosted page

#### 8. Create Success Handler

The `success_url` includes `?session_id={CHECKOUT_SESSION_ID}`. On the success page:

1. Call a new API route to verify the session: `GET /api/payments/stripe/verify-session?session_id=xxx`
2. The API route calls `stripe.checkout.sessions.retrieve(sessionId)` to confirm payment
3. If confirmed, the webhook should have already created the subscription — just show success UI

> **Important**: Never trust the client-side redirect alone. The webhook is the source of truth for subscription creation. The success page is just UX.

#### 9. Configure Stripe Webhook in Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select the events listed in Step 6
4. Copy the **Signing Secret** (`whsec_...`) → set as `STRIPE_WEBHOOK_SECRET`

#### 10. Add Stripe Customer Portal (Optional)

For self-service billing management:

```typescript
// POST /api/payments/stripe/create-portal
const session = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${origin}/settings`,
})
// Return { url: session.url } → redirect user
```

Link this from the Settings page billing section.

### Database Changes Needed for Stripe

The schema already has the columns. You may want to add:

```sql
-- Optional: store Stripe customer ID on user profiles for portal/reuse
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
```

### Key Differences: PayPal vs Stripe

| Aspect | PayPal | Stripe |
|--------|--------|--------|
| Client integration | PayPal JS SDK renders buttons in-page | Redirect to Stripe Checkout hosted page |
| Subscription creation | Client-side `createSubscription` callback | Server-side Checkout Session |
| Payment confirmation | `onApprove` callback → your API | Webhook `checkout.session.completed` |
| Customer management | PayPal Dashboard | Stripe Customer Portal |
| Webhook verification | Verify signature via PayPal API call | Verify signature locally with `whsec_` secret |
| Currency support | Limited | 135+ currencies |

### Files to Create for Stripe

```
lib/payments/stripe.ts                              — Stripe client singleton
app/api/payments/stripe/create-checkout/route.ts     — Create Checkout Session
app/api/payments/stripe/verify-session/route.ts      — Verify completed session
app/api/webhooks/stripe/route.ts                     — Webhook handler
app/api/payments/stripe/create-portal/route.ts       — Customer Portal (optional)
```

### Environment Variables Summary (Stripe)

```env
STRIPE_SECRET_KEY=sk_test_...              # Server-side only
STRIPE_WEBHOOK_SECRET=whsec_...            # Webhook signature verification
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Client-side (for redirect)
```
