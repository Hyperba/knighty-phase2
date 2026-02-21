# Knighty Builds - Developer Context

## 🚀 Architecture Overview
- **Framework**: Next.js 16 (App Router) with React 19.
- **Auth**: Supabase Auth (Email/Password + Google OAuth) with `AuthContext`.
- **Rendering**: Hybrid strategy. Landing page is client-rendered (fetches builds from DB). Portfolio uses SSG; Project details use SSR.
- **Smooth Scrolling**: [Lenis](https://github.com/darkroomengineering/lenis) manages the global scroll loop.
- **Styling**: Scoped CSS Modules. Global variables in `app/globals.css`.

---

## 📂 Project Structure
- **`/app`**: Routing & Layouts.
  - `(public)`: Route group sharing `NavFootLayout`.
  - `(public)/(auth)`: Login/Signup pages with dedicated layout.
  - `(public)/(private)`: Auth-protected routes (my-builds, settings).
  - `admin/`: Admin-only routes with tier check.
  - `api/`: Serverless handlers for Auth, Newsletter, Contact.
  - Note: In Next.js App Router, folders prefixed with `@` are reserved for parallel route slots; do not name normal route segments with `@`.
- **`/components`**:
  - `contexts/`: Global state providers (`AuthContext`).
  - `layout/`: Global Shell (`Navbar`, `Footer`).
  - `sections/`: Hero and high-level page blocks.
  - `ui/`: Interactive atoms (`Comparison`, `Carousel`, `MainButton`).
- **`/lib`**:
  - `projects.ts`: Central source of truth for build data.
  - `supabase/`: Browser and server Supabase clients.
  - `auth/`: Auth protection utilities (`proxy.ts`).
  - `security/`: IP hashing and rate limiting utilities.

---

## 🏠 Homepage (Landing Page)
- **Client-rendered** (`'use client'`) — fetches real build data from Supabase on mount.
- **Scroll-cover effect**: Hero is `position: sticky; top: 0` inside `.heroStickyWrapper`. All subsequent sections have `z-index: 10` and solid `#0a0a0a` backgrounds, so they scroll over the hero.
- **Hero**: Background slideshow of project images with Ken Burns zoom. Tagline "The Builds Catalog", title "DISCOVER PREMIUM MINECRAFT BUILDS", CTA button → `/builds`. Creators carousel at bottom.
- **Top Builds carousel**: Fetches 10 most popular builds via `browse_products({ p_sort_by: 'popular', p_per_page: 10 })`. Horizontal scroll with `BuildCard` components and left/right arrow buttons. "View All" links to `/builds`.
- **Latest Builds carousel**: Same pattern, `p_sort_by: 'newest'`.
- **Community Join section** (non-logged-in users only): Split layout with content on left (badge, title with gradient text, subtitle, stats row, CTAs) and free builds showcase on right. Fetches 3 explorer-tier builds via `browse_products({ p_tiers: ['explorer'], p_per_page: 3 })`. Free builds use card layout with image, hover overlay ("View Build"), title, "Free" tag badge, and like count. Mobile: stacks vertically with free builds on top; at 768px cards switch to horizontal row layout.
- **Upgrade section** (logged-in users with tier < architect): Card with glow effect, gold badge "Exclusive Access", "Unlock Your Full Potential" title, perk pills (Unlimited Downloads, Premium Builds, Discord Access, Early Access), and gold CTA button → `/pricing`.
- **Showcase Projects**: Horizontal scroll strip of 4 portfolio projects with numbered badges. Each card has image with hover zoom, project number overlay, title, brief, and "View Project" link. Gold "Premium Collection" badge in header. "View Full Portfolio" CTA at bottom.
- **About section**: Now has a shared `sectionBadge` ("About the Creator" with Palette icon) above content. Image + copy about Knighty. "Learn More" → `/about`.
- **Support/Pricing section**: Uses shared `sectionBadge` ("Premium Access" with Shield icon) instead of old eyebrow text. "Unlock Premium Builds" messaging with "View Plans" → `/pricing`. Perks pills and server hosting card.
- **Testimonials section**: Fetches featured reviews via `get_featured_reviews` RPC. Displays a 3-column grid (1-column on mobile) of review cards with quote icon, star rating, title, body (4-line clamp), and author info (avatar, name, tier). Shown only when reviews exist. Logged-in users see "Write Your Review" CTA → `/review`.
- **What We Build**: Now has shared `sectionBadge` ("Categories" with Sparkles icon). Auto-scrolling infinite category carousel (portals, statues, houses, etc.) using CSS `@keyframes scroll`.
- **CTA**: `CTASection` component with "Browse All Builds" messaging → `/builds`.
- **Consistent section badges**: All sections use shared `.sectionBadge` CSS class — purple pill with icon + uppercase text. Specific sections have accent colors (gold for showcase/upgrade, green for free builds).
- Responsive: 768px hides scroll buttons, single-column testimonials grid, vertical free builds. 520px smaller padding, 3-line clamp on testimonials.

---

## 🔐 Authentication System
### User Tiers
- `explorer` (default), `access`, `builder`, `architect`, `admin`
- Stored in `user_profiles.tier` column.
- Display names match enum values: Explorer, Access, Builder, Architect, Admin.

### Handle System
- Auto-generated from email on signup via `generate_unique_handle` RPC.
- Validation rules: 4-20 chars, lowercase, alphanumeric + underscore, starts with letter.
- Stored WITHOUT `@` prefix in DB. All RPCs (`validate_handle`, `get_profile_by_handle`, `update_user_handle`) strip `@` if provided.
- Displayed WITH `@` prefix in UI everywhere.
- Profanity filtered via `blocked_handles` table.
- 14-day cooldown on handle changes.
- Profile routing: canonical public profile route is `/(public)/[handle]` (e.g. `/knighty`). Legacy/vanity `/<@handle>` URLs redirect to `/<handle>` via `middleware.ts`.
- **Profile page is fully client-rendered** (`'use client'`). Zero server-side Supabase calls. All data (profile, likes count, liked builds) fetched client-side via the browser Supabase singleton. This avoids the AbortError and multi-tab cookie corruption issues that occurred when it was a server component. Uses `cancelled` flag pattern for cleanup.

### Avatar System (Minecraft Heads)
- Avatars use Minecraft skin faces from `https://mc-heads.net/avatar/{username}`.
- Users enter their Minecraft IGN (not a URL) — the system constructs the avatar URL.
- `avatar_url` column in `user_profiles` stores the full mc-heads.net URL.
- Signup page includes optional MC IGN field with **live avatar preview** (shows skin face inline); settings page has MC IGN input.
- Avatar URL is passed through `create_user_profile` RPC (`p_avatar_url` param) during signup — this works because the RPC is `SECURITY DEFINER` and runs before email confirmation (no active session needed). The RPC validates that the URL matches `https://mc-heads.net/avatar/%` before storing.
- Avatar shape: square with small border radius (not circle) — matches Minecraft head aesthetic.
- `mc-heads.net` is allowed in `next.config.ts` image remote patterns.

### Validation Consistency (Signup ↔ Settings)
- **Handle**: 4-20 chars, lowercase alphanumeric + underscore, starts with letter. `maxLength={20}`.
- **Display Name**: max 50 chars. `maxLength={50}`.
- **Minecraft IGN**: alphanumeric + underscore only, max 16 chars. `maxLength={16}`.

### Auth Pages UI (Split Layout)
- Both `/login` and `/signup` use a **split-layout** design: left showcase panel + right form panel.
- **Showcase panel** (hidden on ≤1024px): gradient background, animated badge, title with gradient text, benefits list with icons, 3×2 grid of build images from `/public/builds/`.
- **Form panel**: Google OAuth button first (with colored Google logo), divider, then email/password form. Inputs have purple focus ring (`box-shadow`).
- **Signup page extras**: two-column rows for handle/display name and password/confirm, MC IGN with live avatar preview, "Create Free Account" CTA button with shimmer effect.
- **Mobile**: showcase panel hidden, replaced by compact `mobileHeader` with floating badge. Form panel fills full width.
- Animations: `fadeInUp` on form, `slideInLeft` on showcase, staggered `fadeInUp` on benefit items, `float` on badge, `shimmer` on submit hover.
- CSS module: `app/(public)/(auth)/auth.module.css`.

### Auth Flow
1. User signs up via `/signup` (email/password) or Google OAuth.
2. OAuth callback at `/api/auth/callback` exchanges code for session.
3. Profile created via `create_user_profile` RPC (includes optional `p_avatar_url` for MC IGN).
4. `AuthContext` provides global `user`, `profile`, `signIn`, `signUp`, `signOut`.

### Client-Side Auth (`AuthContext`)
- Uses `onAuthStateChange` as single source of truth — handles `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`.
- **No `getUser()` call on client** — reads session from cookies (already validated by middleware). Fast, no network dependency.
- **Strict-mode safe**: uses a `mounted` flag (not `useRef`) — cleanup sets `mounted = false`, no stuck refs.
- Browser Supabase client is a **singleton** (`lib/supabase/client.ts`).

### Middleware (`middleware.ts`)
- Runs on page routes only (skips API routes, static files, Next.js internals).
- **Only place that calls `getUser()`** — validates/refreshes auth token and sets updated cookies.
- Also handles `/@handle` → `/handle` redirects.
- **Multi-tab safety**: Creates a `cleanResponse` (original cookies untouched) before attempting auth refresh. Only returns the cookie-modified response if `getUser()` succeeds and returns a user. If the refresh fails (e.g. another tab already consumed the single-use refresh token), the clean response is returned so the browser keeps its existing session cookies and the client-side Supabase client can recover. This prevents the "signed out in other tab" bug.

### CRITICAL: `getUser()` vs `getSession()` Rule
- **`getUser()`** (network call, refreshes token) — used **ONLY in middleware**.
- **`getSession()`** (reads cookies, no network call) — used in **all server components/layouts**.
- Calling `getUser()` in both middleware AND server components causes a double-refresh that corrupts auth cookies. Never do this.
- **Multi-tab caveat**: Supabase refresh tokens are single-use. When two tabs are open, both middlewares may race to refresh the same token — one succeeds, the other fails. The middleware fix above handles this gracefully.

### Debug Page (`/test`)
- Client-side diagnostic page showing auth context state, profile/role, local session, DB connection latency, and environment vars.
- Use this to troubleshoot auth or connectivity issues.

### Route Protection
- **Private routes**: `(private)/layout.tsx` checks session via `getSession()`.
- **Admin routes**: `app/admin/layout.tsx` checks session + admin tier via `getSession()`.
- **Auth proxy** (`lib/auth/proxy.ts`): Helper functions `requireAuth()`, `requireAdmin()`, `getAuthUser()` all use `getSession()`.
- **Auth-aware Navbar**: Conditionally renders links based on `isLoggedIn` from `useAuth()`.

---

## 🏗️ Products (Builds) System
### Database Schema
- **`products`**: Stores all build data (title, subtitle, description, image_url, tags[], tier, difficulty, guide_url, download_url, published_by).
- **`product_likes`**: Tracks user likes (product_id, user_id). Unique constraint prevents duplicate likes.

### Enums
- **`build_type`**: statues, houses, portals, vehicles, fountains, organics, asset_packs, maps, other
- **`theme_category`**: fantasy, medieval, modern, ancient, christmas, halloween, brutalist, sci_fi, nature, other
- **`difficulty_level`**: easy, medium, hard, expert

### Key RPCs
| Function | Purpose |
|----------|---------|
| `browse_products` | Paginated search with filters (type, theme, tier, difficulty, sort) |
| `get_product_by_slug` | Fetch single product with publisher info and like status |
| `toggle_product_like` | Like/unlike a product (auth required) |
| `check_product_access` | Verify user tier allows guide/download access |
| `get_product_likes` | Returns minimum_likes + actual likes count |

### Tier-Based Access
- **Likes**: Any authenticated user can like any product.
- **Guide/Download**: User tier must be >= product tier.
- Tier hierarchy: explorer < access < builder < architect < admin

### Browse Page (`/builds`)
- Sidebar filters for build type, theme category, and tier.
- URL-based filter state for shareable links.
- Pagination with 12 items per page.
- Sort options: newest, oldest, popular, title A-Z/Z-A.

### Product Detail Page (`/builds/[slug]`)
- About tab: Full description, release date, tags.
- Guide tab: Embedded iframe (tier-restricted).
- Like button with optimistic UI.
- Download and share functionality.
- Auth modal prompts for non-authenticated users.

---

## � Pricing System (Dynamic, Admin-Editable)
### Database Schema
- **`pricing_plans`**: Stores plan metadata (tier unique, name, tagline, description, monthly_price, yearly_price, cta_label, showcase_image, is_popular, sort_order, is_active).
- **`pricing_plan_features`**: Per-plan feature rows (plan_id FK, feature_text, included, is_new, sort_order). Cascade-deletes with parent plan.

### Key RPCs
| Function | Access | Purpose |
|----------|--------|---------|
| `get_pricing_plans` | public | Returns all active plans with nested features array, ordered by sort_order |
| `admin_upsert_pricing_plan` | admin | Create or update a plan (pass `p_id` to update, omit for insert) |
| `admin_set_plan_features` | admin | Replace all features for a plan in one call (delete + bulk insert) |
| `admin_delete_pricing_plan` | admin | Delete a plan and its features |

### Frontend Integration
- **`/pricing` page** fetches from `get_pricing_plans` RPC on mount via `useEffect`.
- **No hardcoded fallback** — starts with `null` (loading spinner), shows empty state if DB returns no plans.
- `transformDbPlans()` maps DB snake_case to component's `PlanConfig` interface.
- Feature dropdowns are **independent** (multiple can be open simultaneously via `Set<string>` state) and **open by default** on load.
- Seed file: `seed-pricing.sql` populates all 4 plans with features.

### Admin Pricing Page (`/admin/pricing`)
- Accordion-style plan editor — click a plan to expand its edit form.
- Editable fields: name, tagline, description, monthly/yearly price, CTA text, showcase image, sort order, popular flag, active/hidden toggle.
- Feature management: add/remove/reorder features, toggle included/excluded and NEW badge per feature.
- **Explorer plan protection**: price fields hidden (always $0), delete button disabled.
- **Create New Plan**: modal with tier selector (only unused tiers shown) and plan name.
- **Delete Plan**: confirmation modal via `ConfirmModal`, cascade-deletes features.
- Uses `admin_get_all_pricing_plans` RPC (returns ALL plans including inactive, with `is_active` field).
- `normalizePlan()` defaults all fields to prevent undefined/controlled-input errors.
- Saves via `admin_upsert_pricing_plan` + `admin_set_plan_features` RPCs.
- Toast notifications for success/error feedback.
- Sidebar nav link added under bottom nav items with `DollarSign` icon.

### Admin Dashboard Patterns
- **StatCard**: `height: 100%` ensures consistent card heights across grid.
- **Recent activity**: limited to 5 items; usernames link to `/{handle}` in new tab.
- **Members page**: square avatars (`border-radius: 0.375rem`), tier shown as badge (not editable dropdown), Visit Profile button links to `/{handle}`.
- **Messages page**: read/unread toggle shows `Mail`/`MailOpen` icons with color states; archive/unarchive toggle based on current filter.
- **Newsletter page**: CSV export with proper quote escaping and error handling.
- **Analytics page**: time ranges include 7d, 14d, 30d, 90d, 1 Year, Lifetime; member tier breakdown section; Page Views Over Time bar chart; Traffic Sources derived from referrer; Build Analytics search section.
- **Builds page**: `buildImagePlaceholder` style for products without images (prevents empty `src` warning).
- **All dropdowns/inputs**: use `font-family: var(--primary-font)` for Outfit font consistency.
- **Products RLS**: `"Admin can insert products"` policy uses `is_admin()` check (not blanket block).
- **Next Image**: `next.config.ts` allows any HTTPS hostname via wildcard `hostname: '**'`.

### Pricing Page UI
- Hero with project showcase image strip, gradient title, billing toggle.
- Cards with showcase images, expandable feature lists, "NEW" badges.
- Comparison table as collapsible accordion.
- 2-column FAQ grid, trust pills, CTA banner.
- Fully responsive at 1200px, 1000px, 768px, 600px breakpoints.

---

## ⭐ Reviews System
### Database Schema
- **`site_reviews`**: Stores user reviews for the whole service (not per-build). Columns: id (uuid PK), user_id (FK auth.users, unique — one review per user), rating (1–5), title (3–100 chars), body (10–1000 chars), is_featured, is_approved, created_at, updated_at.
- Indexes: user_id, featured (partial), approved (partial), user_unique constraint.

### RLS Policies
- **Anon + Authenticated**: Can SELECT approved reviews (`is_approved = true`).
- **Admins**: Can SELECT all reviews, UPDATE any review (approve/feature), DELETE any review.
- **Authenticated users**: Can INSERT own review, UPDATE own review.

### RPCs
| Function | Access | Purpose |
|----------|--------|---------|
| `get_featured_reviews(p_limit)` | anon, authenticated | Fetches featured + approved reviews with user profile info (handle, display_name, avatar_url, tier) |
| `submit_review(p_rating, p_title, p_body)` | authenticated | Inserts or updates user's review. Validates all inputs. New/updated reviews default to `is_approved = false` |
| `admin_get_reviews(p_status, p_limit, p_offset)` | authenticated (admin check) | Lists reviews filtered by status (pending/approved/featured) with pagination |
| `admin_update_review(p_review_id, p_is_approved, p_is_featured)` | authenticated (admin check) | Toggles approval/featured flags |
| `admin_delete_review(p_review_id)` | authenticated (admin check) | Deletes a review |

### Seed Data
- `seed-reviews.sql`: Auto-discovers up to 6 existing user profiles and inserts featured+approved seed reviews. Uses `ON CONFLICT DO NOTHING` for idempotency. Skips gracefully if no users exist.

### Frontend Integration
- Homepage fetches featured reviews via `get_featured_reviews` AND review stats via `get_review_stats` in the same `Promise.all` as build data.
- Testimonials section uses **horizontal auto-scrolling carousel** (45s infinite loop, pauses on hover) for displaying many reviews.
- Stats row shows total reviews count + average rating (fetched from `get_review_stats` RPC).
- Review cards: quote icon, star rating, title, body (4-line clamp), author avatar/name/tier.
- Logged-in users see "Write Your Review" CTA → `/contact#review`.

### Contact Page Review Section
- Added review submission section at bottom of `/contact` page (id="review" for anchor linking).
- Auth-gated: non-logged-in users see sign-in prompt with button → `/login`.
- Logged-in users see rating stars (1-5), title input (3-100 chars), body textarea (10-1000 chars), submit button.
- If user already has a review, form pre-fills with existing data and shows "Editing your existing review" notice.
- Featured/pending status badges shown when editing (warns that editing a featured review requires re-approval).
- Uses `get_user_review` RPC to fetch existing review, `submit_review` RPC to create/update.

### Admin Reviews Page
- Route: `/admin/reviews` — added to admin sidebar under Communication group.
- List/detail layout: left panel shows review list with filters (All/Pending/Approved/Featured), right panel shows selected review details.
- Actions: Approve/Unapprove, Feature/Unfeature (requires approval first), Delete with confirmation.
- Stats in header: total count, pending count, featured count.
- Uses `admin_get_reviews`, `admin_update_review`, `admin_delete_review` RPCs.

---

## �🔒 Security & Database (Supabase)
### 1. Zero-Trust RLS
Tables (`newsletter_subscribers`, `contact_submissions`, `user_profiles`, `blocked_handles`, `products`, `product_likes`, `pricing_plans`, `pricing_plan_features`, `site_reviews`) have **Row Level Security enabled** and policies that block direct client access. Pricing tables allow public SELECT for active plans but block all direct writes. Reviews allow public SELECT for approved reviews only.

### 2. Security Definer RPCs
All database writes happen through **PostgreSQL functions (RPCs)** marked `SECURITY DEFINER`.
- These functions run with owner privileges in a safe `search_path`.
- They are revoked from `public` and granted only to `anon`/`authenticated` roles.

### 3. Anonymous Rate Limiting
To prevent spam without user accounts:
- Client IP is extracted in API routes.
- IP is salted and hashed (SHA-256) via `getIpHashFromRequest`.
- Database RPCs check for existing hashes within a time window (3-10 mins).

### 4. Input Validation
- API routes validate email formats (Regex) and length limits.
- Handle validation: format, profanity, uniqueness via `validate_handle` RPC.

---

## 🖱️ Interactive Logic
### Comparison Slider
Uses **Linear Interpolation (Lerp)** for a "gliding" feel.
- **Handle Logic**: Uses `pointerCapture` to prevent drag-drop glitches.
- **Performance**: Updates run inside a `requestAnimationFrame` loop.
- **Constants**: `GLIDE_FACTOR` and `SNAP_EPSILON` in `Comparison.tsx` control the weight.

### Scroll & Navigation
Lenis smooth scrolling overrides native behavior, requiring custom management:
- **`ScrollToTop`**: Triggers `lenis.scrollTo(0)` on route change.
- **`Navbar` Same-Page Handle**: Intercepts clicks to the current route to force a scroll-to-top (Next.js native behavior doesn't trigger navigation for the same path).
- **`history.scrollRestoration`**: Set to `'manual'` in `LenisProvider`.

---

## � Analytics & Tracking
### Dual-layer approach: GA4 + Supabase

**Google Analytics 4**:
- `components/analytics/GoogleAnalytics.tsx` — loads GA4 script via `next/script` with `afterInteractive` strategy.
- Requires `NEXT_PUBLIC_GA_MEASUREMENT_ID` env var (format `G-XXXXXXXXXX`). Component renders nothing if var is missing.
- Handles broad traffic analytics: referrers, geography, devices, sessions, bounce rate, UTM params.

**Supabase custom tracking**:
- `components/analytics/PageViewTracker.tsx` — client component in root layout, fires `record_page_view` RPC on every route change via `usePathname()`. Uses `sessionStorage` session ID. Deduplicates with `lastPath` ref. **Skips `/admin/*` routes.**
- `lib/analytics/track.ts` — fire-and-forget utility functions:
  - `trackEvent(name, properties)` — writes to `analytics_events` table via `track_event` RPC. **Skips `/admin/*` routes.**
  - `gtagEvent(action, params)` — sends event to GA4 if loaded.
  - `trackAll(name, properties)` — fires both Supabase + GA4.
- All tracking is silent (never throws, never blocks UI).
- **Admin routes are excluded from all analytics tracking** (both page views and custom events).

**Database tables**:
- `page_views` — every page load (path, referrer, session, user).
- `analytics_events` — generic events with JSONB properties (build_view, download_click, etc.).
- `traffic_sources` — daily aggregated table (exists but unused; traffic sources are now derived from `page_views.referrer` in the `admin_get_analytics` RPC).
- `product_downloads` — per-download records.
- All tables have RLS blocking direct access; writes happen via `security definer` RPCs.

**Tracked events**:
- `build_view` — fired on `/builds/[slug]` page load (includes build_id, slug, title, tier).
- `download_click` — fired when user clicks download (same properties).

**Admin analytics RPCs**:
- `admin_get_analytics(p_days)` — returns page_views_by_day, top_pages, traffic_sources, signups_by_day. Excludes admin routes. Derives traffic sources from `page_views.referrer` using a `CASE` statement to classify referrer URLs into named sources (Google, Facebook, Reddit, Direct, etc.).
- `admin_get_build_analytics(p_product_id)` — returns per-build stats: total_views, unique_viewers, total_likes, total_downloads, views_by_day (last 30 days). Queries `analytics_events` by `properties->>'build_id'` and `product_likes` table.
- `admin_search_builds(p_query)` — lightweight build search by title or slug for the analytics page dropdown.

**Admin analytics page** (`/admin/analytics`):
- Time ranges: 7d, 14d, 30d, 90d, 1 Year, Lifetime.
- Member tier breakdown section with colored progress bars.
- **Page Views Over Time**: CSS-only bar chart rendering `page_views_by_day` data.
- **Traffic Sources**: horizontal bar chart with source name, bar, and visit count. Sources derived from `page_views.referrer`.
- **Top Pages**: list of most-visited pages.
- **Build Analytics**: search dropdown to select a build, then displays 4-stat grid (views, unique viewers, likes, downloads) + views-by-day mini bar chart.

- **Flow**: Contact form -> API Route -> Resend -> Supabase (log).

---

## 🛠️ Performance Optimizations
- **Static Asset Strategy**: Large build images served from `/public`.
- **CSS Animations**: GPU-accelerated `opacity` and `transform` via `@keyframes`.
- **Global RAF**: Single requestAnimationFrame loop in `LenisProvider` handles all page easing.

---

## 💳 Payment System (PayPal, Stripe)

### Architecture
- **Providers**: PayPal Subscriptions API (active), Stripe Checkout (planned).
- **Flow**: Pricing page → Auth check → `/checkout?plan=<tier>&billing=<period>` → PayPal SDK → `/api/payments/paypal/activate-subscription` → DB update → Tier upgrade.
- **Server library**: `lib/payments/paypal.ts` — OAuth2 token caching, subscription verification, cancellation, webhook verification.

### API Routes
| Route | Purpose |
|-------|--------|
| `POST /api/payments/paypal/activate-subscription` | Called after PayPal approval; verifies with PayPal, creates subscription + order in DB, upgrades user tier |
| `POST /api/payments/paypal/cancel-subscription` | User cancellation: calls `cancel_user_subscription` RPC (marks `cancel_at_period_end`), then `cancelPayPalSubscription()` on PayPal's side |
| `POST /api/webhooks/paypal` | Receives PayPal webhook events (renewals, cancellations, etc.) |

### Database Tables
- **`subscriptions`**: user_id, plan_id, tier, billing_period, provider, status, period dates.
- **`orders`**: user_id, subscription_id, provider, amount, currency, status, idempotency_key.
- Payment enums: `payment_provider` (paypal, stripe), `subscription_status`, `order_status`.

### Key RPCs
| Function | Purpose |
|----------|--------|
| `create_subscription` | Creates subscription record + upgrades user tier |
| `record_order` | Records payment with idempotency protection |
| `update_subscription_status` | Updates status; downgrades to `explorer` on cancellation |
| `cancel_user_subscription` | User-initiated cancellation |
| `get_user_subscription` | Fetch active subscription for current user |
| `get_checkout_plan` | Fetch plan details + PayPal plan IDs for checkout page |

### Pricing Page Integration
- CTA buttons call `handlePlanSelect()` which checks auth state.
- Unauthenticated → `PlanAuthModal` (sign in / create account with redirect to checkout).
- Authenticated → direct redirect to `/checkout`.
- `PlanAuthModal` passes `?redirect=/checkout?plan=X&billing=Y` to login/signup.
- Signup page reads `?redirect=` and passes it through email confirmation flow and Google OAuth.

### Settings Billing Tab
- Billing section in `/settings` fetches **real data** from `get_user_subscription()` and `get_user_orders()` RPCs on tab activation.
- **No hardcoded fake data** — subscription status, renewal dates, billing period, and payment history all come from DB.
- Shows actual PayPal as payment provider (with SVG icon), not fake credit card numbers.
- Cancel flow: "Cancel Subscription" → inline confirmation ("Are you sure?" / "Yes, cancel" / "Keep plan") → `POST /api/payments/paypal/cancel-subscription` → marks `cancel_at_period_end` in DB + cancels on PayPal.
- After cancellation, shows "Access until [date]" instead of "Renews on [date]", and a yellow note about remaining access.
- Payment history shows real orders with amount, currency, status badges (completed/failed/refunded), and dates.
- Explorer (free) users see "No active subscription", "No payment method", and "Upgrade Your Plan" CTA.

### Environment Variables (Payment)
```
PAYPAL_CLIENT_ID=          # PayPal REST API client ID
PAYPAL_CLIENT_SECRET=      # PayPal REST API secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=  # Same as PAYPAL_CLIENT_ID (client-side)
PAYPAL_API_BASE=           # https://api-m.sandbox.paypal.com or https://api-m.paypal.com
PAYPAL_WEBHOOK_ID=         # From PayPal webhook configuration
SUPABASE_SERVICE_ROLE_KEY= # For privileged DB operations in payment routes
```

### Stripe (Future)
- DB already prepared: `payment_provider` enum includes `'stripe'`, `pricing_plans` has `stripe_price_id_monthly/yearly` columns.
- Approach: Stripe Checkout Sessions (server-side redirect), not in-page elements.
- Files to create: `lib/payments/stripe.ts`, `app/api/payments/stripe/create-checkout/route.ts`, `app/api/webhooks/stripe/route.ts`.
- Env vars needed: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- Full implementation plan in `PAYMENT-SETUP-GUIDE.md` → "Future: Stripe Integration" section.

### Setup Guide
See `PAYMENT-SETUP-GUIDE.md` for complete step-by-step instructions (PayPal + Stripe roadmap).

---

## 📘 Documentation
- **Primary doc**: `README.md` (project overview, routes, security, setup).
- **Developer context**: this file (`developer-context.md`) must stay in sync with the architecture, security, and interaction logic.
- **Payment setup**: `PAYMENT-SETUP-GUIDE.md` — step-by-step PayPal integration guide.
- **Payment plan**: `payment-implementation-plan.md` — architectural blueprint and status tracking.
