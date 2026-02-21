# Payment Integration Plan

> Blueprint for integrating PayPal (now) and Stripe (future) into knighty-app.
> This document serves as the architectural reference for current and future payment work.
>
> **Last updated:** Feb 2026

## Implementation Status

| Component | Status |
|-----------|--------|
| Database schema (enums, tables, RLS, RPCs) | ✅ Done (in `schema.sql`) |
| PayPal server library (`lib/payments/paypal.ts`) | ✅ Done |
| Activate subscription API (`/api/payments/paypal/activate-subscription`) | ✅ Done |
| PayPal webhook handler (`/api/webhooks/paypal`) | ✅ Done |
| Checkout page (`/checkout`) | ✅ Done |
| PlanAuthModal (unauthenticated prompt) | ✅ Done |
| Pricing page CTA wiring (onClick → checkout / modal) | ✅ Done |
| Signup/Login redirect support (`?redirect=`) | ✅ Done |
| PayPal env vars configured | ❌ Needs setup |
| Supabase service role key in env | ❌ Needs setup |
| PayPal subscription plans created in dashboard | ❌ Needs setup |
| PayPal plan IDs stored in `pricing_plans` table | ❌ Needs setup |
| PayPal webhook URL configured in dashboard | ❌ Needs setup |
| End-to-end sandbox test | ❌ Not yet tested |

---

## 1. Architecture Overview

### Payment Flow (Subscription-Based)

```
User selects plan on /pricing
        │
        ▼
  ┌─ Authenticated? ─┐
  │ NO               │ YES
  ▼                  ▼
Auth Modal       Redirect to
(sign in/up)     /checkout?plan=<tier>&billing=<period>
  │                  │
  ▼                  ▼
After auth →     Checkout Page
redirect to      loads plan details from DB
checkout         shows order summary
                     │
                     ▼
              PayPal Subscription Button
              (or Stripe in future)
                     │
                     ▼
         ┌── Client-side SDK ──┐
         │ createSubscription  │
         │ callback hits       │
         │ /api/payments/      │
         │ paypal/create-sub   │
         └─────────────────────┘
                     │
                     ▼
           PayPal processes payment
                     │
                     ▼
         ┌── onApprove callback ──┐
         │ Hits /api/payments/    │
         │ paypal/capture-sub     │
         │ → verifies with PayPal │
         │ → writes to orders +   │
         │   subscriptions table  │
         │ → upgrades user tier   │
         └────────────────────────┘
                     │
                     ▼
            Success → /checkout/success
            Failure → error state on checkout
```

### Webhook Flow (Renewals, Cancellations, Failures)

```
PayPal sends webhook POST to /api/webhooks/paypal
        │
        ▼
  Verify webhook signature
  (PAYPAL-TRANSMISSION-SIG header)
        │
        ▼
  Parse event type:
  ├─ BILLING.SUBSCRIPTION.ACTIVATED  → activate subscription
  ├─ BILLING.SUBSCRIPTION.CANCELLED  → mark cancelled, schedule tier downgrade
  ├─ BILLING.SUBSCRIPTION.SUSPENDED  → suspend subscription, downgrade tier
  ├─ BILLING.SUBSCRIPTION.EXPIRED    → expire subscription, downgrade tier
  ├─ PAYMENT.SALE.COMPLETED          → record renewal payment in orders
  └─ PAYMENT.SALE.DENIED/REFUNDED    → handle payment failure
        │
        ▼
  Update subscriptions + orders tables
  Update user_profiles.tier as needed
```

---

## 2. Database Schema

### Tables

#### `subscriptions`
Tracks active/past subscriptions. One active subscription per user at a time.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | |
| `plan_id` | uuid FK → pricing_plans | |
| `tier` | user_tier | Tier at time of subscription |
| `billing_period` | text | `'monthly'` or `'yearly'` |
| `status` | subscription_status enum | `active`, `cancelled`, `suspended`, `expired`, `past_due` |
| `provider` | payment_provider enum | `'paypal'` or `'stripe'` |
| `provider_subscription_id` | text | PayPal/Stripe subscription ID |
| `provider_plan_id` | text | PayPal/Stripe plan ID |
| `current_period_start` | timestamptz | |
| `current_period_end` | timestamptz | |
| `cancel_at_period_end` | boolean | If true, don't renew |
| `cancelled_at` | timestamptz | When user cancelled |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `orders`
Individual payment records (initial + renewals).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | |
| `subscription_id` | uuid FK → subscriptions | nullable for one-time |
| `provider` | payment_provider enum | |
| `provider_order_id` | text | PayPal/Stripe transaction ID |
| `amount` | numeric(10,2) | |
| `currency` | text | Default `'USD'` |
| `status` | order_status enum | `pending`, `completed`, `failed`, `refunded` |
| `plan_tier` | user_tier | What tier was purchased |
| `billing_period` | text | |
| `idempotency_key` | text UNIQUE | Prevents duplicate processing |
| `metadata` | jsonb | Provider-specific data |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Enums

```sql
CREATE TYPE payment_provider AS ENUM ('paypal', 'stripe');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'suspended', 'expired', 'past_due');
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
```

### RLS Policies
- Both tables: RLS enabled, block all direct client access.
- All writes via `SECURITY DEFINER` RPCs only.
- Users can read their own subscriptions/orders via RPC.

### Key RPCs
| RPC | Access | Purpose |
|-----|--------|---------|
| `create_subscription` | authenticated | Create subscription record after PayPal approval |
| `update_subscription_status` | service_role only (webhooks) | Update sub status from webhook events |
| `record_order` | service_role only | Record a payment/renewal |
| `get_user_subscription` | authenticated | Get current user's active subscription |
| `get_user_orders` | authenticated | Get current user's order history |
| `admin_get_subscriptions` | admin | Admin view of all subscriptions |
| `cancel_subscription` | authenticated | Mark subscription for cancellation at period end |
| `upgrade_user_tier` | service_role only | Change user tier after payment verified |

---

## 3. PayPal Integration (Current)

### Environment Variables Required
```env
PAYPAL_CLIENT_ID=<sandbox or live client ID>
PAYPAL_CLIENT_SECRET=<sandbox or live secret>
PAYPAL_WEBHOOK_ID=<webhook ID from PayPal dashboard>
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<same as PAYPAL_CLIENT_ID, exposed to client>
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com  # or https://api-m.paypal.com for live
```

### PayPal Setup Requirements
1. Create PayPal Developer account at https://developer.paypal.com
2. Create a REST API app (sandbox for dev, live for prod)
3. In PayPal dashboard, create **Subscription Plans** for each tier × billing period:
   - Access Monthly, Access Yearly
   - Builder Monthly, Builder Yearly
   - Architect Monthly, Architect Yearly
4. Store PayPal Plan IDs in a config or in `pricing_plans` table (new column: `paypal_plan_id_monthly`, `paypal_plan_id_yearly`)
5. Configure webhook URL: `https://yourdomain.com/api/webhooks/paypal`

### Client-Side Package
- `@paypal/react-paypal-js` — provides `PayPalScriptProvider` and `PayPalButtons` components.
- Load with `intent: 'subscription'` and `vault: true`.

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/payments/paypal/create-subscription` | POST | Validate plan, return PayPal plan ID for client |
| `/api/payments/paypal/activate-subscription` | POST | After PayPal approval, verify + activate in DB |
| `/api/webhooks/paypal` | POST | Handle PayPal webhook events |

### Security
- **Server-side verification**: Every payment is verified against PayPal's API before upgrading tier.
- **Webhook signature verification**: All webhook events verified using `PAYPAL-TRANSMISSION-SIG` headers.
- **Idempotency**: Orders use `idempotency_key` (PayPal transaction ID) to prevent double-processing.
- **Rate limiting**: API routes check IP hash + user ID for abuse prevention.
- **No client-side trust**: Client merely initiates — server confirms everything.

---

## 4. Stripe Integration (Future)

### When to Implement
When the user decides to add Stripe as a second payment option alongside PayPal.

### Architecture (Pre-Planned)
The `payment_provider` enum and `provider`/`provider_*` columns in `subscriptions` and `orders` tables already support Stripe.

### Stripe-Specific Steps
1. Install `@stripe/stripe-js` + `@stripe/react-stripe-js` + `stripe` (server SDK).
2. Add env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. Create Stripe Products + Prices in Stripe Dashboard (mirror PayPal plans).
4. Add `stripe_price_id_monthly`, `stripe_price_id_yearly` columns to `pricing_plans`.
5. Create API routes:
   - `/api/payments/stripe/create-checkout-session` — creates Stripe Checkout Session.
   - `/api/payments/stripe/customer-portal` — redirects to Stripe billing portal.
   - `/api/webhooks/stripe` — handles `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated/deleted`.
6. On checkout page, add Stripe payment button alongside PayPal buttons.
7. Same flow: server verifies → writes to DB → upgrades tier.

### Provider Abstraction
The `provider` field in both tables means:
- All subscription queries work regardless of provider.
- Admin dashboard can show unified subscription/revenue data.
- User can see all their orders in one place regardless of payment method.

---

## 5. Checkout Page Design

### Route: `/checkout` (under `(public)/(private)` — requires auth)

### URL Parameters
- `plan` — tier name (e.g., `access`, `builder`, `architect`)
- `billing` — `monthly` or `yearly`

### Layout
```
┌─────────────────────────────────────────────────┐
│  ← Back to Pricing          CHECKOUT            │
├─────────────────────┬───────────────────────────┤
│                     │                           │
│  ORDER SUMMARY      │   PAYMENT                 │
│  ─────────────      │   ───────                 │
│  Plan: Builder      │   [PayPal Button]         │
│  Tier: Builder      │                           │
│  Billing: Monthly   │   [Stripe Button - future]│
│  Price: $9.99/mo    │                           │
│                     │   Secure payment badge     │
│  Features:          │   SSL + encryption note    │
│  ✓ Feature 1        │                           │
│  ✓ Feature 2        │                           │
│  ✓ Feature 3        │                           │
│                     │                           │
│  Current: Explorer  │                           │
│  After: Builder     │                           │
│                     │                           │
└─────────────────────┴───────────────────────────┘
```

### Success Page: `/checkout/success`
- Confirmation message with order details.
- "Go to My Builds" CTA.
- Auto-refresh profile to reflect new tier.

---

## 6. Pricing Page Modal

### Behavior
1. User clicks CTA button on a plan card.
2. **If not logged in**: Modal appears with:
   - "Sign in to subscribe" heading
   - Sign In button (links to `/login?redirect=/checkout?plan=X&billing=Y`)
   - Sign Up button (links to `/signup?redirect=/checkout?plan=X&billing=Y`)
   - Close button
3. **If logged in**: Directly redirect to `/checkout?plan=X&billing=Y`.
4. **If clicking "Downgrade"**: Show a different modal explaining downgrade process (contact support or manage in settings).

---

## 7. Security Checklist

- [ ] Server-side payment verification (never trust client callbacks alone)
- [ ] Webhook signature verification for all providers
- [ ] Idempotency keys on all order records
- [ ] Rate limiting on all payment API routes
- [ ] CSRF protection via auth session checks on API routes
- [ ] No sensitive keys exposed to client (only public/publishable keys)
- [ ] SQL injection prevention via parameterized RPCs
- [ ] XSS prevention via React's built-in escaping
- [ ] Audit logging: all tier changes logged with reason + provider reference
- [ ] Graceful degradation: payment failures don't crash the app
- [ ] Sandbox/production environment separation via env vars

---

## 8. Environment Variable Summary

### Required Now (PayPal)
```
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
```

### Required Later (Stripe)
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## 9. Setup Checklist

> All migration SQL is consolidated into `schema.sql`. No separate migration files.

1. ✅ Run `schema.sql` in Supabase SQL Editor (creates all tables, enums, RLS, RPCs).
2. ✅ Run `seed-pricing.sql` to populate pricing plans and features.
3. ❌ Add PayPal environment variables to `.env.local` (dev) and production hosting:
   ```
   PAYPAL_CLIENT_ID=<from PayPal dashboard>
   PAYPAL_CLIENT_SECRET=<from PayPal dashboard>
   PAYPAL_WEBHOOK_ID=<from PayPal dashboard>
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=<same as PAYPAL_CLIENT_ID>
   PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
   ```
4. ❌ Add Supabase service role key to `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Settings → API>
   ```
5. ❌ Create PayPal subscription plans in PayPal Developer Dashboard:
   - Create a Product (e.g., "Knighty Builds Subscription")
   - Create 6 Plans under that product: Access Monthly, Access Yearly, Builder Monthly, Builder Yearly, Architect Monthly, Architect Yearly
   - Copy each Plan ID (starts with `P-`)
6. ❌ Store PayPal Plan IDs in `pricing_plans` table via Supabase Table Editor or SQL:
   ```sql
   UPDATE pricing_plans SET paypal_plan_id_monthly = 'P-xxxxx', paypal_plan_id_yearly = 'P-yyyyy' WHERE tier = 'access';
   UPDATE pricing_plans SET paypal_plan_id_monthly = 'P-xxxxx', paypal_plan_id_yearly = 'P-yyyyy' WHERE tier = 'builder';
   UPDATE pricing_plans SET paypal_plan_id_monthly = 'P-xxxxx', paypal_plan_id_yearly = 'P-yyyyy' WHERE tier = 'architect';
   ```
7. ❌ Configure PayPal webhook in PayPal Developer Dashboard:
   - URL: `https://yourdomain.com/api/webhooks/paypal`
   - Events: `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.SUSPENDED`, `BILLING.SUBSCRIPTION.EXPIRED`, `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.DENIED`, `PAYMENT.SALE.REFUNDED`
   - Copy the Webhook ID into `PAYPAL_WEBHOOK_ID` env var
8. ❌ Test full flow in PayPal sandbox before going live.
9. ❌ For production: switch `PAYPAL_API_BASE` to `https://api-m.paypal.com` and use live credentials.
