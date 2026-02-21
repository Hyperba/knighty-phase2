# Knighty Builds

Premium Minecraft builds platform built with **Next.js 16 (App Router)**, featuring user authentication, tiered subscriptions, and a modern UI with smooth scrolling.

## Table of Contents
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Routes & Pages](#routes--pages)
- [Authentication](#authentication)
- [Project Structure](#project-structure)
- [Data & Content](#data--content)
- [APIs & Security](#apis--security)
- [Database Schema](#database-schema)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Development Notes](#development-notes)

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, CSS Modules
- **Auth**: Supabase Auth (Email/Password + Google OAuth)
- **Smooth Scroll**: Lenis
- **Email**: Resend + React Email
- **Database**: Supabase (PostgreSQL)
- **Tooling**: TypeScript, Biome (lint/format)

## Architecture Overview
- **Hybrid Rendering**: Static pages for fast browsing, dynamic pages for SEO-friendly deep links.
- **Auth Context**: Global `AuthProvider` wraps the app, providing user/profile state.
- **Lenis Scroll**: Global smooth scrolling loop in `components/ui/Lenis/LenisProvider.tsx`.
- **Route Shell**: Public routes share `NavFootLayout` with auth-aware `Navbar`.
- **Content**: Project data in `lib/projects.ts`, user profiles in Supabase.

## Routes & Pages
App Router uses `/app` as the source of truth.

### Public Routes (app/(public))
- `/` — Landing page with Hero, Projects, About, Support, Builds carousel, CTA.
- `/about` — About page with timeline and "Why Choose Knighty" cards.
- `/portfolio` — Portfolio grid overview.
- `/portfolio/[slug]` — Project detail page (optionally uses Comparison slider).
- `/contact` — Contact form and submission flow.
- `/builds` — Browse all builds with filters.
- `/pricing` — Subscription tiers and pricing.
- `/[handle]` — User profile page (e.g., `/knighty`).
- `/@handle` — Redirects to `/handle` via `middleware.ts` for legacy/vanity links.

### Auth Routes (app/(public)/(auth))
- `/login` — Email/password + Google OAuth login.
- `/signup` — Registration with auto-generated handle.

### Private Routes (app/(public)/(private)) - Requires Auth
- `/my-builds` — User's unlocked builds based on tier.
- `/settings` — Profile and account settings.

### Admin Routes (app/admin) - Admin Only
- `/admin` — Admin dashboard.
- `/admin/analytics` — Site statistics.
- `/admin/builds` — Manage all builds.
- `/admin/members` — Manage users.
- `/admin/publish-build` — Add new builds.
- `/admin/main-projects` — Manage featured projects.

### API Routes (app/api)
- `POST /api/contact` — Contact form submission.
- `POST /api/newsletter` — Newsletter subscription.
- `GET /api/auth/callback` — OAuth callback handler.

## Authentication
### User Tiers
- **free** — Default tier, access to free builds.
- **basic** — Access to basic tier builds.
- **premium** — Access to premium tier builds.
- **ultimate** — Full access to all builds.
- **admin** — Full access + admin panel.

### Handle System
- Auto-generated from email on signup.
- Rules: 4-20 chars, lowercase, alphanumeric + underscore, no profanity.
- Can be changed once every 14 days.

### Auth Flow
1. User signs up via email/password or Google OAuth.
2. Profile created via `create_user_profile` RPC.
3. Handle auto-generated or user-specified.
4. Session managed by Supabase Auth + `AuthContext`.

## Project Structure
```
app/
  (public)/
    (auth)/ (login, signup)
    (private)/ (my-builds, settings)
    [handle]/
    about/
    builds/
    contact/
    portfolio/
    pricing/
  admin/
  api/
    auth/callback/
    contact/
    newsletter/

components/
  contexts/AuthContext.tsx
  layout/public/ (Navbar, Footer, NavFootLayout)
  sections/ (Hero, CTASection)
  ui/ (Comparison, Carousel, Lenis, ScrollToTop)

lib/
  auth/proxy.ts
  supabase/ (client.ts, server.ts)
  security/ipHash.ts
  projects.ts

schema.sql
```

## Data & Content
- **Project data**: `lib/projects.ts` — Metadata, images, comparisons.
- **User profiles**: `user_profiles` table in Supabase.
- **Builds**: Will be stored in Supabase (future).

## APIs & Security
### Security Principles
- **No direct table access**: RLS policies deny all direct operations.
- **RPC-only access**: All writes go through `SECURITY DEFINER` functions.
- **Rate limiting**: Email + hashed IP checks.
- **Input validation**: Strict regex and length checks.
- **Handle validation**: Profanity filter, uniqueness, format rules.

### Auth Protection
- Private routes use server-side auth check in layout.
- Admin routes require `admin` tier.
- `lib/auth/proxy.ts` provides `requireAuth()` and `requireAdmin()`.

## Database Schema
See `schema.sql` for full definitions:

### Tables
- `newsletter_subscribers` — Email subscriptions.
- `contact_submissions` — Contact form entries.
- `user_profiles` — User profiles (extends auth.users).
- `blocked_handles` — Profanity/reserved words blocklist.

### Key RPCs
- `subscribe_newsletter` — Rate-limited subscription.
- `can_submit_contact` / `insert_contact_submission` — Contact flow.
- `validate_handle` — Handle validation with all rules.
- `generate_unique_handle` — Auto-generate from email.
- `create_user_profile` — Create profile on signup.
- `update_user_handle` — Change handle (14-day cooldown).
- `get_profile_by_handle` — Fetch public profile.
- `update_user_profile` — Update profile fields.

## Local Development
```bash
npm install
npm run dev
```
Open http://localhost:3000

### Supabase Setup
1. Create a Supabase project.
2. Run `schema.sql` in the SQL editor.
3. Enable Google OAuth in Auth settings.
4. Set redirect URL to `http://localhost:3000/api/auth/callback`.

## Environment Variables
Create a `.env` file (do not commit). Required:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
IP_HASH_SALT=
RESEND_API_KEY=
```

## Deployment
- Recommended: Vercel or similar Node hosting.
- Build command: `npm run build`
- Start command: `npm run start`
- Set all env vars in hosting dashboard.

## Development Notes
- **Auth state**: Use `useAuth()` hook from `AuthContext`.
- **Navbar**: Auto-switches between public/logged-in views.
- **Scroll management**: Lenis-aware scroll-to-top.
- **Comparison slider**: Tweak `GLIDE_FACTOR` and `SNAP_EPSILON`.
- **Global styling**: Keep CSS variables in `app/globals.css` in sync.
- **Profile URLs**: Canonical route is `/<handle>`. `/<@handle>` redirects to `/<handle>` via `middleware.ts`.

---

For deeper architectural details, see `developer-context.md` and `BUILD_PLAN.md`.
