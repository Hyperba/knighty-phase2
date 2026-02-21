create extension if not exists "pgcrypto";

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  ip_hash text,
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_unique
  on public.newsletter_subscribers (email_normalized);

create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  project_type text not null,
  message text not null,
  ip_hash text,
  is_read boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contact_submissions_created_at_idx
  on public.contact_submissions (created_at desc);

create index if not exists contact_submissions_email_idx
  on public.contact_submissions (email_normalized);

alter table public.newsletter_subscribers enable row level security;
alter table public.contact_submissions enable row level security;

create policy "no direct access to newsletter_subscribers"
  on public.newsletter_subscribers
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "no direct access to contact_submissions"
  on public.contact_submissions
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.subscribe_newsletter(
  p_email text,
  p_ip_hash text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_norm text;
  v_exists boolean;
  v_recent boolean;
  v_id uuid;
begin
  v_email_norm := lower(trim(p_email));

  if v_email_norm is null or v_email_norm = '' then
    return json_build_object('status', 'error', 'message', 'Email is required');
  end if;

  select exists(
    select 1
    from public.newsletter_subscribers ns
    where ns.email_normalized = v_email_norm
  ) into v_exists;

  if v_exists then
    return json_build_object('status', 'exists', 'message', 'You are already subscribed');
  end if;

  select exists(
    select 1
    from public.newsletter_subscribers ns
    where (
      ns.email_normalized = v_email_norm
      or (p_ip_hash is not null and p_ip_hash <> '' and ns.ip_hash = p_ip_hash)
    )
    and ns.created_at > now() - interval '3 minutes'
  ) into v_recent;

  if v_recent then
    return json_build_object('status', 'rate_limited', 'message', 'Please wait before subscribing again');
  end if;

  insert into public.newsletter_subscribers (email, ip_hash)
  values (p_email, nullif(p_ip_hash, ''))
  returning id into v_id;

  return json_build_object('status', 'subscribed', 'id', v_id);
end;
$$;

revoke all on function public.subscribe_newsletter(text, text) from public;
grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;

create or replace function public.can_submit_contact(
  p_email text,
  p_ip_hash text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_norm text;
  v_recent boolean;
begin
  v_email_norm := lower(trim(p_email));

  if coalesce(v_email_norm, '') = '' then
    return json_build_object('ok', false, 'status', 'error', 'message', 'Email is required');
  end if;

  select exists(
    select 1
    from public.contact_submissions cs
    where (
      cs.email_normalized = v_email_norm
      or (p_ip_hash is not null and p_ip_hash <> '' and cs.ip_hash = p_ip_hash)
    )
    and cs.created_at > now() - interval '10 minutes'
  ) into v_recent;

  if v_recent then
    return json_build_object('ok', false, 'status', 'rate_limited', 'message', 'Please wait before submitting again');
  end if;

  return json_build_object('ok', true, 'status', 'ok');
end;
$$;

revoke all on function public.can_submit_contact(text, text) from public;
grant execute on function public.can_submit_contact(text, text) to anon, authenticated;

create or replace function public.insert_contact_submission(
  p_name text,
  p_email text,
  p_project_type text,
  p_message text,
  p_ip_hash text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_norm text;
  v_id uuid;
begin
  v_email_norm := lower(trim(p_email));

  if coalesce(trim(p_name), '') = ''
    or coalesce(v_email_norm, '') = ''
    or coalesce(trim(p_project_type), '') = ''
    or coalesce(trim(p_message), '') = '' then
    return json_build_object('status', 'error', 'message', 'Missing required fields');
  end if;

  insert into public.contact_submissions (name, email, project_type, message, ip_hash)
  values (p_name, p_email, p_project_type, p_message, nullif(p_ip_hash, ''))
  returning id into v_id;

  return json_build_object('status', 'created', 'id', v_id);
end;
$$;

revoke all on function public.insert_contact_submission(text, text, text, text, text) from public;
grant execute on function public.insert_contact_submission(text, text, text, text, text) to anon, authenticated;

-- ============================================
-- USER PROFILES & AUTHENTICATION
-- ============================================

-- User tier enum
create type public.user_tier as enum ('explorer', 'access', 'builder', 'architect', 'admin');

-- Payment enums
create type public.payment_provider as enum ('paypal', 'stripe');
create type public.subscription_status as enum ('active', 'cancelled', 'suspended', 'expired', 'past_due');
create type public.order_status as enum ('pending', 'completed', 'failed', 'refunded');

-- Profanity blocklist for handles
create table if not exists public.blocked_handles (
  word text primary key
);

-- Insert common blocked words (expand as needed)
insert into public.blocked_handles (word) values
  ('admin'), ('administrator'), ('mod'), ('moderator'), ('staff'),
  ('knighty'), ('xknighty'), ('knightybuilds'),
  ('fuck'), ('shit'), ('ass'), ('bitch'), ('cunt'), ('dick'), ('pussy'),
  ('nigger'), ('nigga'), ('faggot'), ('retard'),
  ('root'), ('system'), ('null'), ('undefined'), ('anonymous')
on conflict do nothing;

-- User profiles table (extends auth.users)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  handle_normalized text generated always as (lower(trim(handle))) stored,
  display_name text not null default '',
  bio text default '',
  avatar_url text default '',
  cover_url text default '',
  tier public.user_tier not null default 'explorer',
  handle_changed_at timestamptz,
  signup_source text,
  signup_medium text,
  signup_campaign text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for user_profiles
create unique index if not exists user_profiles_handle_normalized_idx
  on public.user_profiles (handle_normalized);

create index if not exists user_profiles_tier_idx
  on public.user_profiles (tier);

create index if not exists user_profiles_created_at_idx
  on public.user_profiles (created_at desc);

-- Enable RLS
alter table public.user_profiles enable row level security;
alter table public.blocked_handles enable row level security;

-- RLS Policies for user_profiles
create policy "Users can view all profiles"
  on public.user_profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users can update own profile"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Block direct inserts (use RPC)
create policy "No direct insert to user_profiles"
  on public.user_profiles
  for insert
  to anon, authenticated
  with check (false);

-- RLS for blocked_handles (read-only for functions)
create policy "no direct access to blocked_handles"
  on public.blocked_handles
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ============================================
-- ADMIN HELPER FUNCTION (must be defined before RLS policies that reference it)
-- ============================================

-- Verify if current user is admin
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier public.user_tier;
begin
  select tier into v_tier
  from public.user_profiles
  where id = auth.uid();
  
  return v_tier = 'admin';
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ============================================
-- HANDLE VALIDATION & GENERATION FUNCTIONS
-- ============================================

-- Validate a handle against all rules
create or replace function public.validate_handle(p_handle text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
  v_blocked boolean;
  v_exists boolean;
begin
  -- Normalize
  v_handle := lower(trim(coalesce(p_handle, '')));
  
  -- Remove @ prefix if present
  if left(v_handle, 1) = '@' then
    v_handle := substring(v_handle from 2);
  end if;

  -- Check empty
  if v_handle = '' then
    return json_build_object('valid', false, 'error', 'Handle is required');
  end if;

  -- Check minimum length (4 chars)
  if length(v_handle) < 4 then
    return json_build_object('valid', false, 'error', 'Handle must be at least 4 characters');
  end if;

  -- Check maximum length (20 chars)
  if length(v_handle) > 20 then
    return json_build_object('valid', false, 'error', 'Handle must be at most 20 characters');
  end if;

  -- Check for valid characters (lowercase alphanumeric + underscore only)
  if v_handle !~ '^[a-z0-9_]+$' then
    return json_build_object('valid', false, 'error', 'Handle can only contain lowercase letters, numbers, and underscores');
  end if;

  -- Check cannot start with number or underscore
  if v_handle ~ '^[0-9_]' then
    return json_build_object('valid', false, 'error', 'Handle must start with a letter');
  end if;

  -- Check against blocklist
  select exists(
    select 1 from public.blocked_handles bh
    where v_handle like '%' || bh.word || '%'
  ) into v_blocked;

  if v_blocked then
    return json_build_object('valid', false, 'error', 'This handle is not allowed');
  end if;

  -- Check uniqueness
  select exists(
    select 1 from public.user_profiles up
    where up.handle_normalized = v_handle
  ) into v_exists;

  if v_exists then
    return json_build_object('valid', false, 'error', 'This handle is already taken');
  end if;

  return json_build_object('valid', true, 'handle', v_handle);
end;
$$;

revoke all on function public.validate_handle(text) from public;
grant execute on function public.validate_handle(text) to anon, authenticated;

-- Generate a unique handle from email
create or replace function public.generate_unique_handle(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_handle text;
  v_suffix int := 0;
  v_exists boolean;
begin
  -- Extract username from email and clean it
  v_base := lower(split_part(p_email, '@', 1));
  v_base := regexp_replace(v_base, '[^a-z0-9]', '', 'g');
  
  -- Ensure minimum length
  if length(v_base) < 4 then
    v_base := v_base || 'user';
  end if;
  
  -- Ensure starts with letter
  if v_base ~ '^[0-9]' then
    v_base := 'u' || v_base;
  end if;
  
  -- Truncate if too long (leave room for suffix)
  if length(v_base) > 16 then
    v_base := left(v_base, 16);
  end if;

  v_handle := v_base;

  -- Find unique handle
  loop
    select exists(
      select 1 from public.user_profiles up
      where up.handle_normalized = v_handle
    ) into v_exists;

    if not v_exists then
      -- Also check blocklist
      select exists(
        select 1 from public.blocked_handles bh
        where v_handle like '%' || bh.word || '%'
      ) into v_exists;
    end if;

    exit when not v_exists;

    v_suffix := v_suffix + 1;
    v_handle := v_base || v_suffix::text;
  end loop;

  return v_handle;
end;
$$;

revoke all on function public.generate_unique_handle(text) from public;
grant execute on function public.generate_unique_handle(text) to anon, authenticated;

-- Create user profile on signup
create or replace function public.create_user_profile(
  p_user_id uuid,
  p_email text,
  p_handle text default null,
  p_display_name text default null,
  p_avatar_url text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
  v_display_name text;
  v_avatar_url text;
  v_validation json;
begin
  -- Check if profile already exists
  if exists(select 1 from public.user_profiles where id = p_user_id) then
    return json_build_object('status', 'exists', 'message', 'Profile already exists');
  end if;

  -- Generate or validate handle
  if p_handle is not null and trim(p_handle) <> '' then
    v_validation := public.validate_handle(p_handle);
    if not (v_validation->>'valid')::boolean then
      return json_build_object('status', 'error', 'message', v_validation->>'error');
    end if;
    v_handle := v_validation->>'handle';
  else
    v_handle := public.generate_unique_handle(p_email);
  end if;

  -- Set display name
  v_display_name := coalesce(nullif(trim(p_display_name), ''), split_part(p_email, '@', 1));

  -- Validate avatar URL (only allow mc-heads.net)
  v_avatar_url := null;
  if p_avatar_url is not null and p_avatar_url like 'https://mc-heads.net/avatar/%' then
    v_avatar_url := p_avatar_url;
  end if;

  -- Insert profile
  insert into public.user_profiles (id, handle, display_name, avatar_url)
  values (p_user_id, v_handle, v_display_name, v_avatar_url);

  return json_build_object(
    'status', 'created',
    'handle', v_handle,
    'display_name', v_display_name
  );
end;
$$;

revoke all on function public.create_user_profile(uuid, text, text, text, text) from public;
grant execute on function public.create_user_profile(uuid, text, text, text, text) to authenticated;

-- Update user handle (with 14-day cooldown)
create or replace function public.update_user_handle(p_new_handle text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_last_change timestamptz;
  v_validation json;
  v_days_remaining int;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    return json_build_object('status', 'error', 'message', 'Not authenticated');
  end if;

  -- Get last handle change
  select handle_changed_at into v_last_change
  from public.user_profiles
  where id = v_user_id;

  -- Check 14-day cooldown
  if v_last_change is not null and v_last_change > now() - interval '14 days' then
    v_days_remaining := ceil(extract(epoch from (v_last_change + interval '14 days' - now())) / 86400);
    return json_build_object(
      'status', 'error',
      'message', 'You can only change your handle once every 14 days. ' || v_days_remaining || ' days remaining.'
    );
  end if;

  -- Validate new handle
  v_validation := public.validate_handle(p_new_handle);
  if not (v_validation->>'valid')::boolean then
    return json_build_object('status', 'error', 'message', v_validation->>'error');
  end if;

  -- Update handle
  update public.user_profiles
  set 
    handle = v_validation->>'handle',
    handle_changed_at = now(),
    updated_at = now()
  where id = v_user_id;

  return json_build_object('status', 'updated', 'handle', v_validation->>'handle');
end;
$$;

revoke all on function public.update_user_handle(text) from public;
grant execute on function public.update_user_handle(text) to authenticated;

-- Get user profile by handle
create or replace function public.get_profile_by_handle(p_handle text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
  v_profile record;
begin
  v_handle := lower(trim(coalesce(p_handle, '')));
  
  -- Remove @ prefix if present
  if left(v_handle, 1) = '@' then
    v_handle := substring(v_handle from 2);
  end if;

  select 
    id,
    handle,
    display_name,
    bio,
    avatar_url,
    cover_url,
    tier,
    created_at
  into v_profile
  from public.user_profiles
  where handle_normalized = v_handle;

  if not found then
    return json_build_object('status', 'not_found', 'message', 'User not found');
  end if;

  return json_build_object(
    'status', 'found',
    'profile', json_build_object(
      'id', v_profile.id,
      'handle', v_profile.handle,
      'display_name', v_profile.display_name,
      'bio', v_profile.bio,
      'avatar_url', v_profile.avatar_url,
      'cover_url', v_profile.cover_url,
      'tier', v_profile.tier,
      'created_at', v_profile.created_at
    )
  );
end;
$$;

revoke all on function public.get_profile_by_handle(text) from public;
grant execute on function public.get_profile_by_handle(text) to anon, authenticated;

-- Update user profile
create or replace function public.update_user_profile(
  p_display_name text default null,
  p_bio text default null,
  p_avatar_url text default null,
  p_cover_url text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    return json_build_object('status', 'error', 'message', 'Not authenticated');
  end if;

  -- Validate display name length
  if p_display_name is not null and length(trim(p_display_name)) > 50 then
    return json_build_object('status', 'error', 'message', 'Display name must be at most 50 characters');
  end if;

  -- Validate bio length
  if p_bio is not null and length(p_bio) > 500 then
    return json_build_object('status', 'error', 'message', 'Bio must be at most 500 characters');
  end if;

  update public.user_profiles
  set
    display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
    bio = coalesce(p_bio, bio),
    avatar_url = coalesce(p_avatar_url, avatar_url),
    cover_url = coalesce(p_cover_url, cover_url),
    updated_at = now()
  where id = v_user_id;

  return json_build_object('status', 'updated');
end;
$$;

revoke all on function public.update_user_profile(text, text, text, text) from public;
grant execute on function public.update_user_profile(text, text, text, text) to authenticated;

-- ============================================
-- PRODUCTS (BUILDS) SYSTEM
-- ============================================

-- Build type enum
create type public.build_type as enum (
  'statues', 'houses', 'portals', 'vehicles', 'fountains', 
  'organics', 'asset_packs', 'maps', 'other'
);

-- Theme category enum
create type public.theme_category as enum (
  'fantasy', 'medieval', 'modern', 'ancient', 'christmas',
  'halloween', 'brutalist', 'sci_fi', 'nature', 'other'
);

-- Difficulty enum
create type public.difficulty_level as enum ('easy', 'medium', 'hard', 'expert');

-- Products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text default '',
  description text default '',
  image_url text not null,
  tags text[] default '{}',
  build_type public.build_type not null default 'other',
  theme_category public.theme_category not null default 'other',
  difficulty public.difficulty_level not null default 'medium',
  tier public.user_tier not null default 'explorer',
  minimum_likes int not null default 0,
  guide_url text default '',
  download_url text default '',
  published_by uuid references public.user_profiles(id) on delete set null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for products
create index if not exists products_slug_idx on public.products (slug);
create index if not exists products_tier_idx on public.products (tier);
create index if not exists products_build_type_idx on public.products (build_type);
create index if not exists products_theme_category_idx on public.products (theme_category);
create index if not exists products_difficulty_idx on public.products (difficulty);
create index if not exists products_published_by_idx on public.products (published_by);
create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_is_published_idx on public.products (is_published);
create index if not exists products_tags_idx on public.products using gin (tags);

-- Product likes table
create table if not exists public.product_likes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(product_id, user_id)
);

-- Indexes for likes
create index if not exists product_likes_product_id_idx on public.product_likes (product_id);
create index if not exists product_likes_user_id_idx on public.product_likes (user_id);

-- Enable RLS
alter table public.products enable row level security;
alter table public.product_likes enable row level security;

-- RLS Policies for products (readable by all, writable only by admins via RPC)
create policy "Anyone can view published products"
  on public.products
  for select
  to anon, authenticated
  using (is_published = true);

create policy "Admin can insert products"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

create policy "No direct update to products"
  on public.products
  for update
  to anon, authenticated
  using (false)
  with check (false);

create policy "No direct delete to products"
  on public.products
  for delete
  to anon, authenticated
  using (false);

-- RLS Policies for product_likes
create policy "Users can view all likes"
  on public.product_likes
  for select
  to anon, authenticated
  using (true);

create policy "Users can insert own likes"
  on public.product_likes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own likes"
  on public.product_likes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================
-- PRODUCT FUNCTIONS
-- ============================================

-- Get total likes for a product (minimum_likes + actual likes)
create or replace function public.get_product_likes(p_product_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minimum_likes int;
  v_actual_likes int;
begin
  select minimum_likes into v_minimum_likes
  from public.products
  where id = p_product_id;

  if not found then
    return 0;
  end if;

  select count(*)::int into v_actual_likes
  from public.product_likes
  where product_id = p_product_id;

  return v_minimum_likes + v_actual_likes;
end;
$$;

revoke all on function public.get_product_likes(uuid) from public;
grant execute on function public.get_product_likes(uuid) to anon, authenticated;

-- Check if user has liked a product
create or replace function public.has_user_liked_product(p_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    return false;
  end if;

  return exists(
    select 1 from public.product_likes
    where product_id = p_product_id and user_id = v_user_id
  );
end;
$$;

revoke all on function public.has_user_liked_product(uuid) from public;
grant execute on function public.has_user_liked_product(uuid) to anon, authenticated;

-- Toggle like on a product
create or replace function public.toggle_product_like(p_product_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_liked boolean;
  v_total_likes int;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    return json_build_object('status', 'error', 'message', 'Not authenticated');
  end if;

  -- Check if product exists
  if not exists(select 1 from public.products where id = p_product_id and is_published = true) then
    return json_build_object('status', 'error', 'message', 'Product not found');
  end if;

  -- Check if already liked
  if exists(select 1 from public.product_likes where product_id = p_product_id and user_id = v_user_id) then
    -- Unlike
    delete from public.product_likes
    where product_id = p_product_id and user_id = v_user_id;
    v_liked := false;
  else
    -- Like
    insert into public.product_likes (product_id, user_id)
    values (p_product_id, v_user_id);
    v_liked := true;
  end if;

  -- Get new total
  v_total_likes := public.get_product_likes(p_product_id);

  return json_build_object(
    'status', 'success',
    'liked', v_liked,
    'total_likes', v_total_likes
  );
end;
$$;

revoke all on function public.toggle_product_like(uuid) from public;
grant execute on function public.toggle_product_like(uuid) to authenticated;

-- Get product by slug with likes and publisher info
create or replace function public.get_product_by_slug(p_slug text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product record;
  v_publisher record;
  v_total_likes int;
  v_user_liked boolean;
begin
  select * into v_product
  from public.products
  where slug = lower(trim(p_slug)) and is_published = true;

  if not found then
    return json_build_object('status', 'not_found', 'message', 'Product not found');
  end if;

  -- Get publisher info
  select id, handle, display_name, avatar_url into v_publisher
  from public.user_profiles
  where id = v_product.published_by;

  -- Get likes
  v_total_likes := public.get_product_likes(v_product.id);
  v_user_liked := public.has_user_liked_product(v_product.id);

  return json_build_object(
    'status', 'found',
    'product', json_build_object(
      'id', v_product.id,
      'slug', v_product.slug,
      'title', v_product.title,
      'subtitle', v_product.subtitle,
      'description', v_product.description,
      'image_url', v_product.image_url,
      'tags', v_product.tags,
      'build_type', v_product.build_type,
      'theme_category', v_product.theme_category,
      'difficulty', v_product.difficulty,
      'tier', v_product.tier,
      'guide_url', v_product.guide_url,
      'download_url', v_product.download_url,
      'total_likes', v_total_likes,
      'user_liked', v_user_liked,
      'created_at', v_product.created_at,
      'publisher', case when v_publisher.id is not null then json_build_object(
        'id', v_publisher.id,
        'handle', v_publisher.handle,
        'display_name', v_publisher.display_name,
        'avatar_url', v_publisher.avatar_url
      ) else null end
    )
  );
end;
$$;

revoke all on function public.get_product_by_slug(text) from public;
grant execute on function public.get_product_by_slug(text) to anon, authenticated;

-- Browse products with filters, search, and pagination
create or replace function public.browse_products(
  p_search text default null,
  p_build_types text[] default null,
  p_theme_categories text[] default null,
  p_tiers text[] default null,
  p_difficulties text[] default null,
  p_sort_by text default 'newest',
  p_page int default 1,
  p_per_page int default 12
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offset int;
  v_total int;
  v_products json;
begin
  v_offset := (p_page - 1) * p_per_page;

  -- Get total count
  select count(*) into v_total
  from public.products p
  where p.is_published = true
    and (p_search is null or p_search = '' or 
         p.title ilike '%' || p_search || '%' or 
         p.subtitle ilike '%' || p_search || '%' or
         p.description ilike '%' || p_search || '%' or
         exists (select 1 from unnest(p.tags) t where t ilike '%' || p_search || '%'))
    and (p_build_types is null or array_length(p_build_types, 1) is null or p.build_type::text = any(p_build_types))
    and (p_theme_categories is null or array_length(p_theme_categories, 1) is null or p.theme_category::text = any(p_theme_categories))
    and (p_tiers is null or array_length(p_tiers, 1) is null or p.tier::text = any(p_tiers))
    and (p_difficulties is null or array_length(p_difficulties, 1) is null or p.difficulty::text = any(p_difficulties));

  -- Get products
  select json_agg(product_data) into v_products
  from (
    select json_build_object(
      'id', p.id,
      'slug', p.slug,
      'title', p.title,
      'subtitle', p.subtitle,
      'image_url', p.image_url,
      'tags', p.tags,
      'build_type', p.build_type,
      'theme_category', p.theme_category,
      'difficulty', p.difficulty,
      'tier', p.tier,
      'total_likes', p.minimum_likes + (select count(*) from public.product_likes pl where pl.product_id = p.id)::int,
      'created_at', p.created_at
    ) as product_data
    from public.products p
    where p.is_published = true
      and (p_search is null or p_search = '' or 
           p.title ilike '%' || p_search || '%' or 
           p.subtitle ilike '%' || p_search || '%' or
           p.description ilike '%' || p_search || '%' or
           exists (select 1 from unnest(p.tags) t where t ilike '%' || p_search || '%'))
      and (p_build_types is null or array_length(p_build_types, 1) is null or p.build_type::text = any(p_build_types))
      and (p_theme_categories is null or array_length(p_theme_categories, 1) is null or p.theme_category::text = any(p_theme_categories))
      and (p_tiers is null or array_length(p_tiers, 1) is null or p.tier::text = any(p_tiers))
      and (p_difficulties is null or array_length(p_difficulties, 1) is null or p.difficulty::text = any(p_difficulties))
    order by
      case when p_sort_by = 'newest' then p.created_at end desc,
      case when p_sort_by = 'oldest' then p.created_at end asc,
      case when p_sort_by = 'popular' then p.minimum_likes + (select count(*) from public.product_likes pl where pl.product_id = p.id)::int end desc,
      case when p_sort_by = 'title_asc' then p.title end asc,
      case when p_sort_by = 'title_desc' then p.title end desc,
      p.created_at desc
    limit p_per_page
    offset v_offset
  ) sub;

  return json_build_object(
    'status', 'success',
    'products', coalesce(v_products, '[]'::json),
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', ceil(v_total::float / p_per_page)::int
  );
end;
$$;

revoke all on function public.browse_products(text, text[], text[], text[], text[], text, int, int) from public;
grant execute on function public.browse_products(text, text[], text[], text[], text[], text, int, int) to anon, authenticated;

-- Check if user has access to a product's guide/download based on tier
create or replace function public.check_product_access(p_product_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_tier public.user_tier;
  v_product_tier public.user_tier;
  v_tier_levels int[] := array[1, 2, 3, 4, 5]; -- free, basic, premium, ultimate, admin
  v_user_level int;
  v_product_level int;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    return json_build_object('has_access', false, 'reason', 'not_authenticated');
  end if;

  -- Get user tier
  select tier into v_user_tier
  from public.user_profiles
  where id = v_user_id;

  if not found then
    return json_build_object('has_access', false, 'reason', 'no_profile');
  end if;

  -- Get product tier
  select tier into v_product_tier
  from public.products
  where id = p_product_id and is_published = true;

  if not found then
    return json_build_object('has_access', false, 'reason', 'product_not_found');
  end if;

  -- Map tiers to levels
  v_user_level := case v_user_tier
    when 'explorer' then 1
    when 'access' then 2
    when 'builder' then 3
    when 'architect' then 4
    when 'admin' then 5
  end;

  v_product_level := case v_product_tier
    when 'explorer' then 1
    when 'access' then 2
    when 'builder' then 3
    when 'architect' then 4
    when 'admin' then 5
  end;

  -- Check access
  if v_user_level >= v_product_level then
    return json_build_object('has_access', true, 'user_tier', v_user_tier, 'product_tier', v_product_tier);
  else
    return json_build_object('has_access', false, 'reason', 'insufficient_tier', 'user_tier', v_user_tier, 'required_tier', v_product_tier);
  end if;
end;
$$;

revoke all on function public.check_product_access(uuid) from public;
grant execute on function public.check_product_access(uuid) to anon, authenticated;

-- ============================================
-- ANALYTICS & TRAFFIC TRACKING
-- ============================================

-- Generic analytics events table
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,        -- 'build_view', 'download_click', 'signup_complete', etc.
  properties jsonb,                -- flexible metadata (build_id, slug, tier, etc.)
  page_path text,
  referrer text,
  user_id uuid references public.user_profiles(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_session_id_idx on public.analytics_events (session_id);

-- Page views tracking
create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  referrer text,
  user_agent text,
  ip_hash text,
  user_id uuid references public.user_profiles(id) on delete set null,
  session_id text,
  country text,
  device_type text, -- 'desktop', 'mobile', 'tablet'
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_page_path_idx on public.page_views (page_path);
create index if not exists page_views_session_id_idx on public.page_views (session_id);

-- Traffic sources (daily aggregated)
create table if not exists public.traffic_sources (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- 'instagram', 'reddit', 'google', 'direct', 'twitter', etc.
  medium text, -- 'social', 'organic', 'referral', 'direct'
  campaign text, -- UTM campaign name
  visits int not null default 0,
  unique_visitors int not null default 0,
  signups int not null default 0, -- conversions
  date date not null default current_date,
  unique(source, medium, campaign, date)
);

create index if not exists traffic_sources_date_idx on public.traffic_sources (date desc);
create index if not exists traffic_sources_source_idx on public.traffic_sources (source);

-- Product downloads tracking
create table if not exists public.product_downloads (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists product_downloads_product_id_idx on public.product_downloads (product_id);
create index if not exists product_downloads_user_id_idx on public.product_downloads (user_id);
create index if not exists product_downloads_created_at_idx on public.product_downloads (created_at desc);

-- Enable RLS on new tables
alter table public.analytics_events enable row level security;
alter table public.page_views enable row level security;
alter table public.traffic_sources enable row level security;
alter table public.product_downloads enable row level security;

-- RLS: No direct access (admin-only via RPCs)
create policy "no direct access to analytics_events"
  on public.analytics_events for all to anon, authenticated
  using (false) with check (false);

create policy "no direct access to page_views"
  on public.page_views for all to anon, authenticated
  using (false) with check (false);

create policy "no direct access to traffic_sources"
  on public.traffic_sources for all to anon, authenticated
  using (false) with check (false);

create policy "no direct access to product_downloads"
  on public.product_downloads for all to anon, authenticated
  using (false) with check (false);

-- ============================================
-- ADMIN RPCs - DASHBOARD STATS
-- ============================================

-- Get admin dashboard overview stats
create or replace function public.admin_get_dashboard_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_builds int;
  v_published_builds int;
  v_total_members int;
  v_total_subscribers int;
  v_total_messages int;
  v_unread_messages int;
  v_total_downloads int;
  v_members_by_tier json;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  -- Builds count
  select count(*) into v_total_builds from public.products;
  select count(*) into v_published_builds from public.products where is_published = true;

  -- Members count
  select count(*) into v_total_members from public.user_profiles;
  
  -- Members by tier
  select json_object_agg(tier, cnt) into v_members_by_tier
  from (
    select tier, count(*) as cnt
    from public.user_profiles
    group by tier
  ) t;

  -- Newsletter subscribers
  select count(*) into v_total_subscribers from public.newsletter_subscribers;

  -- Contact messages
  select count(*) into v_total_messages from public.contact_submissions where is_archived = false;
  select count(*) into v_unread_messages from public.contact_submissions where is_read = false and is_archived = false;

  -- Downloads
  select count(*) into v_total_downloads from public.product_downloads;

  return json_build_object(
    'status', 'success',
    'stats', json_build_object(
      'total_builds', v_total_builds,
      'published_builds', v_published_builds,
      'total_members', v_total_members,
      'members_by_tier', coalesce(v_members_by_tier, '{}'::json),
      'total_subscribers', v_total_subscribers,
      'total_messages', v_total_messages,
      'unread_messages', v_unread_messages,
      'total_downloads', v_total_downloads
    )
  );
end;
$$;

revoke all on function public.admin_get_dashboard_stats() from public;
grant execute on function public.admin_get_dashboard_stats() to authenticated;

-- ============================================
-- ADMIN RPCs - PRODUCTS/BUILDS
-- ============================================

-- List all products (including unpublished) for admin
create or replace function public.admin_list_products(
  p_search text default null,
  p_is_published boolean default null,
  p_page int default 1,
  p_per_page int default 20
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offset int;
  v_total int;
  v_products json;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  v_offset := (p_page - 1) * p_per_page;

  -- Count total
  select count(*) into v_total
  from public.products p
  where (p_search is null or p_search = '' or p.title ilike '%' || p_search || '%' or p.slug ilike '%' || p_search || '%')
    and (p_is_published is null or p.is_published = p_is_published);

  -- Get products
  select json_agg(row_to_json(t)) into v_products
  from (
    select 
      p.id, p.slug, p.title, p.subtitle, p.image_url, p.build_type, p.theme_category,
      p.difficulty, p.tier, p.is_published, p.created_at, p.updated_at,
      p.minimum_likes + (select count(*) from public.product_likes pl where pl.product_id = p.id)::int as total_likes,
      (select count(*) from public.product_downloads pd where pd.product_id = p.id)::int as download_count
    from public.products p
    where (p_search is null or p_search = '' or p.title ilike '%' || p_search || '%' or p.slug ilike '%' || p_search || '%')
      and (p_is_published is null or p.is_published = p_is_published)
    order by p.created_at desc
    limit p_per_page offset v_offset
  ) t;

  return json_build_object(
    'status', 'success',
    'products', coalesce(v_products, '[]'::json),
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', ceil(v_total::float / p_per_page)::int
  );
end;
$$;

revoke all on function public.admin_list_products(text, boolean, int, int) from public;
grant execute on function public.admin_list_products(text, boolean, int, int) to authenticated;

-- Create a new product
create or replace function public.admin_create_product(
  p_title text,
  p_subtitle text,
  p_slug text,
  p_description text,
  p_image_url text,
  p_tags text[],
  p_build_type text,
  p_theme_category text,
  p_difficulty text,
  p_tier text,
  p_download_url text,
  p_guide_url text default '',
  p_minimum_likes int default 0,
  p_is_published boolean default true
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  -- Normalize slug
  v_slug := lower(trim(regexp_replace(p_slug, '[^a-zA-Z0-9-]', '-', 'g')));
  
  -- Check slug uniqueness
  if exists(select 1 from public.products where slug = v_slug) then
    return json_build_object('status', 'error', 'message', 'Slug already exists');
  end if;

  insert into public.products (
    title, subtitle, slug, description, image_url, tags,
    build_type, theme_category, difficulty, tier,
    download_url, guide_url, minimum_likes, is_published, published_by
  ) values (
    p_title, p_subtitle, v_slug, p_description, p_image_url, p_tags,
    p_build_type::public.build_type, p_theme_category::public.theme_category,
    p_difficulty::public.difficulty_level, p_tier::public.user_tier,
    p_download_url, p_guide_url, p_minimum_likes, p_is_published, auth.uid()
  )
  returning id into v_id;

  return json_build_object('status', 'created', 'id', v_id, 'slug', v_slug);
end;
$$;

revoke all on function public.admin_create_product(text, text, text, text, text, text[], text, text, text, text, text, text, int, boolean) from public;
grant execute on function public.admin_create_product(text, text, text, text, text, text[], text, text, text, text, text, text, int, boolean) to authenticated;

-- Update a product
create or replace function public.admin_update_product(
  p_id uuid,
  p_title text default null,
  p_subtitle text default null,
  p_slug text default null,
  p_description text default null,
  p_image_url text default null,
  p_tags text[] default null,
  p_build_type text default null,
  p_theme_category text default null,
  p_difficulty text default null,
  p_tier text default null,
  p_download_url text default null,
  p_guide_url text default null,
  p_minimum_likes int default null,
  p_is_published boolean default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  -- Check product exists
  if not exists(select 1 from public.products where id = p_id) then
    return json_build_object('status', 'error', 'message', 'Product not found');
  end if;

  -- Handle slug change
  if p_slug is not null then
    v_slug := lower(trim(regexp_replace(p_slug, '[^a-zA-Z0-9-]', '-', 'g')));
    if exists(select 1 from public.products where slug = v_slug and id <> p_id) then
      return json_build_object('status', 'error', 'message', 'Slug already exists');
    end if;
  end if;

  update public.products set
    title = coalesce(p_title, title),
    subtitle = coalesce(p_subtitle, subtitle),
    slug = coalesce(v_slug, slug),
    description = coalesce(p_description, description),
    image_url = coalesce(p_image_url, image_url),
    tags = coalesce(p_tags, tags),
    build_type = coalesce(p_build_type::public.build_type, build_type),
    theme_category = coalesce(p_theme_category::public.theme_category, theme_category),
    difficulty = coalesce(p_difficulty::public.difficulty_level, difficulty),
    tier = coalesce(p_tier::public.user_tier, tier),
    download_url = coalesce(p_download_url, download_url),
    guide_url = coalesce(p_guide_url, guide_url),
    minimum_likes = coalesce(p_minimum_likes, minimum_likes),
    is_published = coalesce(p_is_published, is_published),
    updated_at = now()
  where id = p_id;

  return json_build_object('status', 'updated', 'id', p_id);
end;
$$;

revoke all on function public.admin_update_product(uuid, text, text, text, text, text, text[], text, text, text, text, text, text, int, boolean) from public;
grant execute on function public.admin_update_product(uuid, text, text, text, text, text, text[], text, text, text, text, text, text, int, boolean) to authenticated;

-- Delete a product
create or replace function public.admin_delete_product(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  if not exists(select 1 from public.products where id = p_id) then
    return json_build_object('status', 'error', 'message', 'Product not found');
  end if;

  delete from public.products where id = p_id;

  return json_build_object('status', 'deleted', 'id', p_id);
end;
$$;

revoke all on function public.admin_delete_product(uuid) from public;
grant execute on function public.admin_delete_product(uuid) to authenticated;

-- Get single product for editing
create or replace function public.admin_get_product(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product record;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  select * into v_product from public.products where id = p_id;

  if not found then
    return json_build_object('status', 'error', 'message', 'Product not found');
  end if;

  return json_build_object(
    'status', 'success',
    'product', row_to_json(v_product)
  );
end;
$$;

revoke all on function public.admin_get_product(uuid) from public;
grant execute on function public.admin_get_product(uuid) to authenticated;

-- ============================================
-- ADMIN RPCs - CONTACT SUBMISSIONS
-- ============================================

-- List contact submissions
create or replace function public.admin_list_contact_submissions(
  p_is_read boolean default null,
  p_is_archived boolean default false,
  p_page int default 1,
  p_per_page int default 20
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offset int;
  v_total int;
  v_submissions json;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  v_offset := (p_page - 1) * p_per_page;

  select count(*) into v_total
  from public.contact_submissions
  where (p_is_read is null or is_read = p_is_read)
    and is_archived = p_is_archived;

  select json_agg(row_to_json(t)) into v_submissions
  from (
    select id, name, email, project_type, message, is_read, is_archived, created_at
    from public.contact_submissions
    where (p_is_read is null or is_read = p_is_read)
      and is_archived = p_is_archived
    order by created_at desc
    limit p_per_page offset v_offset
  ) t;

  return json_build_object(
    'status', 'success',
    'submissions', coalesce(v_submissions, '[]'::json),
    'total', v_total,
    'page', p_page,
    'total_pages', ceil(v_total::float / p_per_page)::int
  );
end;
$$;

revoke all on function public.admin_list_contact_submissions(boolean, boolean, int, int) from public;
grant execute on function public.admin_list_contact_submissions(boolean, boolean, int, int) to authenticated;

-- Mark contact submission as read
create or replace function public.admin_mark_submission_read(p_id uuid, p_is_read boolean default true)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  update public.contact_submissions set is_read = p_is_read where id = p_id;

  return json_build_object('status', 'updated');
end;
$$;

revoke all on function public.admin_mark_submission_read(uuid, boolean) from public;
grant execute on function public.admin_mark_submission_read(uuid, boolean) to authenticated;

-- Archive contact submission
create or replace function public.admin_archive_submission(p_id uuid, p_archive boolean default true)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  update public.contact_submissions set is_archived = p_archive where id = p_id;

  return json_build_object('status', 'updated');
end;
$$;

revoke all on function public.admin_archive_submission(uuid, boolean) from public;
grant execute on function public.admin_archive_submission(uuid, boolean) to authenticated;

-- ============================================
-- ADMIN RPCs - NEWSLETTER
-- ============================================

-- List newsletter subscribers
create or replace function public.admin_list_newsletter_subscribers(
  p_search text default null,
  p_page int default 1,
  p_per_page int default 50
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offset int;
  v_total int;
  v_subscribers json;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  v_offset := (p_page - 1) * p_per_page;

  select count(*) into v_total
  from public.newsletter_subscribers
  where p_search is null or p_search = '' or email ilike '%' || p_search || '%';

  select json_agg(row_to_json(t)) into v_subscribers
  from (
    select id, email, created_at
    from public.newsletter_subscribers
    where p_search is null or p_search = '' or email ilike '%' || p_search || '%'
    order by created_at desc
    limit p_per_page offset v_offset
  ) t;

  return json_build_object(
    'status', 'success',
    'subscribers', coalesce(v_subscribers, '[]'::json),
    'total', v_total,
    'page', p_page,
    'total_pages', ceil(v_total::float / p_per_page)::int
  );
end;
$$;

revoke all on function public.admin_list_newsletter_subscribers(text, int, int) from public;
grant execute on function public.admin_list_newsletter_subscribers(text, int, int) to authenticated;

-- Export all newsletter emails (for CSV)
create or replace function public.admin_export_newsletter_emails()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emails json;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  select json_agg(json_build_object('email', email, 'subscribed_at', created_at))
  into v_emails
  from public.newsletter_subscribers
  order by created_at desc;

  return json_build_object(
    'status', 'success',
    'emails', coalesce(v_emails, '[]'::json)
  );
end;
$$;

revoke all on function public.admin_export_newsletter_emails() from public;
grant execute on function public.admin_export_newsletter_emails() to authenticated;

-- Remove newsletter subscriber
create or replace function public.admin_remove_subscriber(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  delete from public.newsletter_subscribers where id = p_id;

  return json_build_object('status', 'deleted');
end;
$$;

revoke all on function public.admin_remove_subscriber(uuid) from public;
grant execute on function public.admin_remove_subscriber(uuid) to authenticated;

-- ============================================
-- ADMIN RPCs - BLOCKED HANDLES
-- ============================================

-- List blocked handles
create or replace function public.admin_list_blocked_handles()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handles json;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  select json_agg(word order by word) into v_handles
  from public.blocked_handles;

  return json_build_object(
    'status', 'success',
    'handles', coalesce(v_handles, '[]'::json)
  );
end;
$$;

revoke all on function public.admin_list_blocked_handles() from public;
grant execute on function public.admin_list_blocked_handles() to authenticated;

-- Add blocked handle
create or replace function public.admin_add_blocked_handle(p_word text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_word text;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  v_word := lower(trim(p_word));
  
  if v_word = '' then
    return json_build_object('status', 'error', 'message', 'Word cannot be empty');
  end if;

  insert into public.blocked_handles (word) values (v_word)
  on conflict do nothing;

  return json_build_object('status', 'added', 'word', v_word);
end;
$$;

revoke all on function public.admin_add_blocked_handle(text) from public;
grant execute on function public.admin_add_blocked_handle(text) to authenticated;

-- Remove blocked handle
create or replace function public.admin_remove_blocked_handle(p_word text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  delete from public.blocked_handles where word = lower(trim(p_word));

  return json_build_object('status', 'deleted');
end;
$$;

revoke all on function public.admin_remove_blocked_handle(text) from public;
grant execute on function public.admin_remove_blocked_handle(text) to authenticated;

-- ============================================
-- ADMIN RPCs - MEMBERS
-- ============================================

-- List all members
create or replace function public.admin_list_members(
  p_search text default null,
  p_tier text default null,
  p_page int default 1,
  p_per_page int default 20
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offset int;
  v_total int;
  v_members json;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  v_offset := (p_page - 1) * p_per_page;

  select count(*) into v_total
  from public.user_profiles up
  join auth.users au on au.id = up.id
  where (p_search is null or p_search = '' or up.handle ilike '%' || p_search || '%' or up.display_name ilike '%' || p_search || '%' or au.email ilike '%' || p_search || '%')
    and (p_tier is null or up.tier::text = p_tier);

  select json_agg(row_to_json(t)) into v_members
  from (
    select 
      up.id, up.handle, up.display_name, up.avatar_url, up.tier, up.created_at,
      au.email,
      (select count(*) from public.product_likes pl where pl.user_id = up.id)::int as total_likes
    from public.user_profiles up
    join auth.users au on au.id = up.id
    where (p_search is null or p_search = '' or up.handle ilike '%' || p_search || '%' or up.display_name ilike '%' || p_search || '%' or au.email ilike '%' || p_search || '%')
      and (p_tier is null or up.tier::text = p_tier)
    order by up.created_at desc
    limit p_per_page offset v_offset
  ) t;

  return json_build_object(
    'status', 'success',
    'members', coalesce(v_members, '[]'::json),
    'total', v_total,
    'page', p_page,
    'total_pages', ceil(v_total::float / p_per_page)::int
  );
end;
$$;

revoke all on function public.admin_list_members(text, text, int, int) from public;
grant execute on function public.admin_list_members(text, text, int, int) to authenticated;

-- Update member tier
create or replace function public.admin_update_member_tier(p_user_id uuid, p_tier text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  if not exists(select 1 from public.user_profiles where id = p_user_id) then
    return json_build_object('status', 'error', 'message', 'User not found');
  end if;

  update public.user_profiles
  set tier = p_tier::public.user_tier, updated_at = now()
  where id = p_user_id;

  return json_build_object('status', 'updated', 'tier', p_tier);
end;
$$;

revoke all on function public.admin_update_member_tier(uuid, text) from public;
grant execute on function public.admin_update_member_tier(uuid, text) to authenticated;

-- ============================================
-- ADMIN RPCs - ANALYTICS
-- ============================================

-- Record page view (can be called by anyone, but data is admin-only)
create or replace function public.record_page_view(
  p_page_path text,
  p_referrer text default null,
  p_session_id text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.page_views (page_path, referrer, user_id, session_id)
  values (p_page_path, p_referrer, auth.uid(), p_session_id);

  return json_build_object('status', 'recorded');
end;
$$;

revoke all on function public.record_page_view(text, text, text) from public;
grant execute on function public.record_page_view(text, text, text) to anon, authenticated;

-- Track generic analytics event
create or replace function public.track_event(
  p_event_name text,
  p_properties text default null,
  p_page_path text default null,
  p_session_id text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_events (event_name, properties, page_path, referrer, user_id, session_id)
  values (
    p_event_name,
    case when p_properties is not null then p_properties::jsonb else null end,
    p_page_path,
    null,
    auth.uid(),
    p_session_id
  );

  return json_build_object('status', 'recorded');
end;
$$;

revoke all on function public.track_event(text, text, text, text) from public;
grant execute on function public.track_event(text, text, text, text) to anon, authenticated;

-- Get analytics overview
create or replace function public.admin_get_analytics(
  p_days int default 7
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page_views_by_day json;
  v_top_pages json;
  v_traffic_sources json;
  v_signups_by_day json;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  -- Page views by day (exclude admin routes)
  select json_agg(row_to_json(t)) into v_page_views_by_day
  from (
    select date_trunc('day', created_at)::date as date, count(*) as views
    from public.page_views
    where created_at >= now() - (p_days || ' days')::interval
      and page_path not like '/admin%'
    group by date_trunc('day', created_at)::date
    order by date
  ) t;

  -- Top pages (exclude admin routes)
  select json_agg(row_to_json(t)) into v_top_pages
  from (
    select page_path, count(*) as views
    from public.page_views
    where created_at >= now() - (p_days || ' days')::interval
      and page_path not like '/admin%'
    group by page_path
    order by views desc
    limit 10
  ) t;

  -- Traffic sources (derived from page_views referrer)
  select json_agg(row_to_json(t)) into v_traffic_sources
  from (
    select
      case
        when referrer is null or referrer = '' then 'Direct'
        when referrer ilike '%google%' then 'Google'
        when referrer ilike '%bing%' then 'Bing'
        when referrer ilike '%facebook%' or referrer ilike '%fb.com%' then 'Facebook'
        when referrer ilike '%twitter%' or referrer ilike '%t.co%' then 'Twitter / X'
        when referrer ilike '%instagram%' then 'Instagram'
        when referrer ilike '%reddit%' then 'Reddit'
        when referrer ilike '%youtube%' then 'YouTube'
        when referrer ilike '%tiktok%' then 'TikTok'
        when referrer ilike '%discord%' then 'Discord'
        when referrer ilike '%linkedin%' then 'LinkedIn'
        when referrer ilike '%pinterest%' then 'Pinterest'
        when referrer ilike '%github%' then 'GitHub'
        else coalesce(substring(referrer from '://([^/]+)'), 'Other')
      end as source,
      count(*) as visits,
      0 as signups
    from public.page_views
    where created_at >= now() - (p_days || ' days')::interval
      and page_path not like '/admin%'
    group by source
    order by visits desc
    limit 15
  ) t;

  -- Signups by day
  select json_agg(row_to_json(t)) into v_signups_by_day
  from (
    select date_trunc('day', created_at)::date as date, count(*) as signups
    from public.user_profiles
    where created_at >= now() - (p_days || ' days')::interval
    group by date_trunc('day', created_at)::date
    order by date
  ) t;

  return json_build_object(
    'status', 'success',
    'page_views_by_day', coalesce(v_page_views_by_day, '[]'::json),
    'top_pages', coalesce(v_top_pages, '[]'::json),
    'traffic_sources', coalesce(v_traffic_sources, '[]'::json),
    'signups_by_day', coalesce(v_signups_by_day, '[]'::json)
  );
end;
$$;

revoke all on function public.admin_get_analytics(int) from public;
grant execute on function public.admin_get_analytics(int) to authenticated;

-- Get analytics for a specific build
create or replace function public.admin_get_build_analytics(
  p_product_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product record;
  v_total_views bigint;
  v_total_likes bigint;
  v_total_downloads bigint;
  v_views_by_day json;
  v_unique_viewers bigint;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  -- Verify product exists
  select id, title, slug, image_url into v_product
  from public.products
  where id = p_product_id;

  if not found then
    return json_build_object('status', 'error', 'message', 'Product not found');
  end if;

  -- Total views from analytics_events
  select count(*) into v_total_views
  from public.analytics_events
  where event_name = 'build_view'
    and properties->>'build_id' = p_product_id::text;

  -- Unique viewers (distinct sessions)
  select count(distinct session_id) into v_unique_viewers
  from public.analytics_events
  where event_name = 'build_view'
    and properties->>'build_id' = p_product_id::text
    and session_id is not null;

  -- Total likes
  select count(*) into v_total_likes
  from public.product_likes
  where product_id = p_product_id;

  -- Total downloads from analytics_events
  select count(*) into v_total_downloads
  from public.analytics_events
  where event_name = 'download_click'
    and properties->>'build_id' = p_product_id::text;

  -- Views by day (last 30 days)
  select json_agg(row_to_json(t)) into v_views_by_day
  from (
    select date_trunc('day', created_at)::date as date, count(*) as views
    from public.analytics_events
    where event_name = 'build_view'
      and properties->>'build_id' = p_product_id::text
      and created_at >= now() - interval '30 days'
    group by date_trunc('day', created_at)::date
    order by date
  ) t;

  return json_build_object(
    'status', 'success',
    'product', json_build_object(
      'id', v_product.id,
      'title', v_product.title,
      'slug', v_product.slug,
      'image_url', v_product.image_url
    ),
    'total_views', v_total_views,
    'unique_viewers', v_unique_viewers,
    'total_likes', v_total_likes,
    'total_downloads', v_total_downloads,
    'views_by_day', coalesce(v_views_by_day, '[]'::json)
  );
end;
$$;

revoke all on function public.admin_get_build_analytics(uuid) from public;
grant execute on function public.admin_get_build_analytics(uuid) to authenticated;

-- Search builds for analytics (lightweight search)
create or replace function public.admin_search_builds(
  p_query text default ''
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  return json_build_object(
    'status', 'success',
    'builds', coalesce((
      select json_agg(row_to_json(t))
      from (
        select id, title, slug, image_url, tier, is_published
        from public.products
        where (p_query = '' or title ilike '%' || p_query || '%' or slug ilike '%' || p_query || '%')
        order by created_at desc
        limit 10
      ) t
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.admin_search_builds(text) from public;
grant execute on function public.admin_search_builds(text) to authenticated;

-- Get recent activity for dashboard
create or replace function public.admin_get_recent_activity(p_limit int default 10)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_messages json;
  v_recent_signups json;
  v_recent_likes json;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  -- Recent contact messages
  select json_agg(row_to_json(t)) into v_recent_messages
  from (
    select id, name, email, project_type, is_read, created_at
    from public.contact_submissions
    where is_archived = false
    order by created_at desc
    limit p_limit
  ) t;

  -- Recent signups
  select json_agg(row_to_json(t)) into v_recent_signups
  from (
    select id, handle, display_name, avatar_url, tier, created_at
    from public.user_profiles
    order by created_at desc
    limit p_limit
  ) t;

  -- Recent likes
  select json_agg(row_to_json(t)) into v_recent_likes
  from (
    select 
      pl.id, pl.created_at,
      json_build_object('id', up.id, 'handle', up.handle, 'avatar_url', up.avatar_url) as user,
      json_build_object('id', p.id, 'title', p.title, 'slug', p.slug) as product
    from public.product_likes pl
    join public.user_profiles up on up.id = pl.user_id
    join public.products p on p.id = pl.product_id
    order by pl.created_at desc
    limit p_limit
  ) t;

  return json_build_object(
    'status', 'success',
    'recent_messages', coalesce(v_recent_messages, '[]'::json),
    'recent_signups', coalesce(v_recent_signups, '[]'::json),
    'recent_likes', coalesce(v_recent_likes, '[]'::json)
  );
end;
$$;

revoke all on function public.admin_get_recent_activity(int) from public;
grant execute on function public.admin_get_recent_activity(int) to authenticated;

-- ============================================
-- PRICING PLANS (Dynamic, Admin-Editable)
-- ============================================

create table if not exists public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  tier public.user_tier not null unique,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  monthly_price numeric(10,2) not null default 0,
  yearly_price numeric(10,2) not null default 0,
  cta_label text not null default 'Subscribe',
  showcase_image text not null default '',
  is_popular boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  paypal_plan_id_monthly text not null default '',
  paypal_plan_id_yearly text not null default '',
  stripe_price_id_monthly text not null default '',
  stripe_price_id_yearly text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pricing_plans_sort_order_idx on public.pricing_plans (sort_order);
create index if not exists pricing_plans_is_active_idx on public.pricing_plans (is_active);

create table if not exists public.pricing_plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.pricing_plans(id) on delete cascade,
  feature_text text not null,
  included boolean not null default true,
  is_new boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pricing_plan_features_plan_id_idx on public.pricing_plan_features (plan_id);
create index if not exists pricing_plan_features_sort_order_idx on public.pricing_plan_features (sort_order);

-- Enable RLS
alter table public.pricing_plans enable row level security;
alter table public.pricing_plan_features enable row level security;

-- RLS: Anyone can read active plans (public pricing page)
create policy "Anyone can view active pricing plans"
  on public.pricing_plans
  for select
  to anon, authenticated
  using (is_active = true);

create policy "Anyone can view pricing plan features"
  on public.pricing_plan_features
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.pricing_plans pp
      where pp.id = plan_id and pp.is_active = true
    )
  );

-- Block direct writes (admin-only via RPCs)
create policy "No direct insert to pricing_plans"
  on public.pricing_plans for insert
  to anon, authenticated with check (false);

create policy "No direct update to pricing_plans"
  on public.pricing_plans for update
  to anon, authenticated using (false) with check (false);

create policy "No direct delete to pricing_plans"
  on public.pricing_plans for delete
  to anon, authenticated using (false);

create policy "No direct insert to pricing_plan_features"
  on public.pricing_plan_features for insert
  to anon, authenticated with check (false);

create policy "No direct update to pricing_plan_features"
  on public.pricing_plan_features for update
  to anon, authenticated using (false) with check (false);

create policy "No direct delete to pricing_plan_features"
  on public.pricing_plan_features for delete
  to anon, authenticated using (false);

-- ─── Public RPC: Fetch all pricing data ─────────────

create or replace function public.get_pricing_plans()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plans json;
begin
  select json_agg(plan_data order by sort_order) into v_plans
  from (
    select json_build_object(
      'id', pp.id,
      'tier', pp.tier,
      'name', pp.name,
      'tagline', pp.tagline,
      'description', pp.description,
      'monthly_price', pp.monthly_price,
      'yearly_price', pp.yearly_price,
      'cta_label', pp.cta_label,
      'showcase_image', pp.showcase_image,
      'is_popular', pp.is_popular,
      'sort_order', pp.sort_order,
      'features', coalesce((
        select json_agg(
          json_build_object(
            'id', pf.id,
            'feature_text', pf.feature_text,
            'included', pf.included,
            'is_new', pf.is_new,
            'sort_order', pf.sort_order
          ) order by pf.sort_order
        )
        from public.pricing_plan_features pf
        where pf.plan_id = pp.id
      ), '[]'::json)
    ) as plan_data,
    pp.sort_order
    from public.pricing_plans pp
    where pp.is_active = true
    order by pp.sort_order
  ) sub;

  return json_build_object(
    'status', 'success',
    'plans', coalesce(v_plans, '[]'::json)
  );
end;
$$;

revoke all on function public.get_pricing_plans() from public;
grant execute on function public.get_pricing_plans() to anon, authenticated;

-- ─── Admin RPC: Fetch ALL pricing plans (including inactive) ─────────────

create or replace function public.admin_get_all_pricing_plans()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plans json;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  select json_agg(plan_data order by sort_order) into v_plans
  from (
    select json_build_object(
      'id', pp.id,
      'tier', pp.tier,
      'name', pp.name,
      'tagline', pp.tagline,
      'description', pp.description,
      'monthly_price', pp.monthly_price,
      'yearly_price', pp.yearly_price,
      'cta_label', pp.cta_label,
      'showcase_image', pp.showcase_image,
      'is_popular', pp.is_popular,
      'is_active', pp.is_active,
      'sort_order', pp.sort_order,
      'features', coalesce((
        select json_agg(
          json_build_object(
            'id', pf.id,
            'feature_text', pf.feature_text,
            'included', pf.included,
            'is_new', pf.is_new,
            'sort_order', pf.sort_order
          ) order by pf.sort_order
        )
        from public.pricing_plan_features pf
        where pf.plan_id = pp.id
      ), '[]'::json)
    ) as plan_data,
    pp.sort_order
    from public.pricing_plans pp
    order by pp.sort_order
  ) sub;

  return json_build_object(
    'status', 'success',
    'plans', coalesce(v_plans, '[]'::json)
  );
end;
$$;

revoke all on function public.admin_get_all_pricing_plans() from public;
grant execute on function public.admin_get_all_pricing_plans() to authenticated;

-- ─── Admin RPC: Upsert a pricing plan ───────────────

create or replace function public.admin_upsert_pricing_plan(
  p_id uuid default null,
  p_tier text default null,
  p_name text default null,
  p_tagline text default '',
  p_description text default '',
  p_monthly_price numeric default 0,
  p_yearly_price numeric default 0,
  p_cta_label text default 'Subscribe',
  p_showcase_image text default '',
  p_is_popular boolean default false,
  p_sort_order int default 0,
  p_is_active boolean default true
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  if p_id is not null then
    -- Update existing plan
    update public.pricing_plans
    set
      name = coalesce(nullif(trim(p_name), ''), name),
      tagline = coalesce(p_tagline, tagline),
      description = coalesce(p_description, description),
      monthly_price = p_monthly_price,
      yearly_price = p_yearly_price,
      cta_label = coalesce(nullif(trim(p_cta_label), ''), cta_label),
      showcase_image = coalesce(p_showcase_image, showcase_image),
      is_popular = p_is_popular,
      sort_order = p_sort_order,
      is_active = p_is_active,
      updated_at = now()
    where id = p_id
    returning id into v_plan_id;

    if v_plan_id is null then
      return json_build_object('status', 'error', 'message', 'Plan not found');
    end if;
  else
    -- Insert new plan
    if p_tier is null or p_name is null then
      return json_build_object('status', 'error', 'message', 'Tier and name are required');
    end if;

    insert into public.pricing_plans (tier, name, tagline, description, monthly_price, yearly_price, cta_label, showcase_image, is_popular, sort_order, is_active)
    values (p_tier::public.user_tier, p_name, p_tagline, p_description, p_monthly_price, p_yearly_price, p_cta_label, p_showcase_image, p_is_popular, p_sort_order, p_is_active)
    returning id into v_plan_id;
  end if;

  return json_build_object('status', 'success', 'id', v_plan_id);
end;
$$;

revoke all on function public.admin_upsert_pricing_plan(uuid, text, text, text, text, numeric, numeric, text, text, boolean, int, boolean) from public;
grant execute on function public.admin_upsert_pricing_plan(uuid, text, text, text, text, numeric, numeric, text, text, boolean, int, boolean) to authenticated;

-- ─── Admin RPC: Set features for a plan ─────────────
-- Replaces all features for a plan in one call (delete + insert).

create or replace function public.admin_set_plan_features(
  p_plan_id uuid,
  p_features json
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feature json;
  v_count int := 0;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  -- Verify plan exists
  if not exists(select 1 from public.pricing_plans where id = p_plan_id) then
    return json_build_object('status', 'error', 'message', 'Plan not found');
  end if;

  -- Delete existing features
  delete from public.pricing_plan_features where plan_id = p_plan_id;

  -- Insert new features
  for v_feature in select * from json_array_elements(p_features)
  loop
    insert into public.pricing_plan_features (plan_id, feature_text, included, is_new, sort_order)
    values (
      p_plan_id,
      v_feature->>'feature_text',
      coalesce((v_feature->>'included')::boolean, true),
      coalesce((v_feature->>'is_new')::boolean, false),
      coalesce((v_feature->>'sort_order')::int, v_count)
    );
    v_count := v_count + 1;
  end loop;

  return json_build_object('status', 'success', 'features_count', v_count);
end;
$$;

revoke all on function public.admin_set_plan_features(uuid, json) from public;
grant execute on function public.admin_set_plan_features(uuid, json) to authenticated;

-- ─── Admin RPC: Delete a pricing plan ───────────────

create or replace function public.admin_delete_pricing_plan(p_plan_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  delete from public.pricing_plans where id = p_plan_id;

  if not found then
    return json_build_object('status', 'error', 'message', 'Plan not found');
  end if;

  return json_build_object('status', 'success');
end;
$$;

revoke all on function public.admin_delete_pricing_plan(uuid) from public;
grant execute on function public.admin_delete_pricing_plan(uuid) to authenticated;

-- ============================================
-- PAYMENT SYSTEM: Subscriptions & Orders
-- ============================================

-- Subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.pricing_plans(id),
  tier public.user_tier not null,
  billing_period text not null check (billing_period in ('monthly', 'yearly')),
  status public.subscription_status not null default 'active',
  provider public.payment_provider not null,
  provider_subscription_id text not null,
  provider_plan_id text not null default '',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_provider_sub_id_idx on public.subscriptions (provider_subscription_id);
create unique index if not exists subscriptions_provider_sub_id_unique on public.subscriptions (provider_subscription_id);

-- Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id),
  provider public.payment_provider not null,
  provider_order_id text not null default '',
  amount numeric(10,2) not null default 0,
  currency text not null default 'USD',
  status public.order_status not null default 'pending',
  plan_tier public.user_tier not null,
  billing_period text not null check (billing_period in ('monthly', 'yearly')),
  idempotency_key text unique,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_subscription_id_idx on public.orders (subscription_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_idempotency_key_idx on public.orders (idempotency_key);

-- RLS
alter table public.subscriptions enable row level security;
alter table public.orders enable row level security;

-- Block all direct access (writes via RPCs only)
create policy "No direct access to subscriptions"
  on public.subscriptions for all
  to anon, authenticated
  using (false) with check (false);

create policy "No direct access to orders"
  on public.orders for all
  to anon, authenticated
  using (false) with check (false);

-- ============================================
-- PAYMENT RPCs
-- ============================================

-- Get the current user's active subscription
create or replace function public.get_user_subscription()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub json;
begin
  if auth.uid() is null then
    return json_build_object('status', 'error', 'message', 'Not authenticated');
  end if;

  select json_build_object(
    'id', s.id,
    'plan_id', s.plan_id,
    'tier', s.tier,
    'billing_period', s.billing_period,
    'status', s.status,
    'provider', s.provider,
    'provider_subscription_id', s.provider_subscription_id,
    'current_period_start', s.current_period_start,
    'current_period_end', s.current_period_end,
    'cancel_at_period_end', s.cancel_at_period_end,
    'cancelled_at', s.cancelled_at,
    'created_at', s.created_at,
    'plan_name', pp.name
  ) into v_sub
  from public.subscriptions s
  join public.pricing_plans pp on pp.id = s.plan_id
  where s.user_id = auth.uid()
    and s.status in ('active', 'past_due')
  order by s.created_at desc
  limit 1;

  return json_build_object(
    'status', 'success',
    'subscription', v_sub
  );
end;
$$;

revoke all on function public.get_user_subscription() from public;
grant execute on function public.get_user_subscription() to authenticated;

-- Get the current user's order history
create or replace function public.get_user_orders(
  p_limit int default 20,
  p_offset int default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orders json;
  v_total bigint;
begin
  if auth.uid() is null then
    return json_build_object('status', 'error', 'message', 'Not authenticated');
  end if;

  select count(*) into v_total
  from public.orders
  where user_id = auth.uid();

  select json_agg(row_to_json(t)) into v_orders
  from (
    select
      o.id,
      o.provider,
      o.provider_order_id,
      o.amount,
      o.currency,
      o.status,
      o.plan_tier,
      o.billing_period,
      o.created_at
    from public.orders o
    where o.user_id = auth.uid()
    order by o.created_at desc
    limit p_limit offset p_offset
  ) t;

  return json_build_object(
    'status', 'success',
    'orders', coalesce(v_orders, '[]'::json),
    'total', v_total
  );
end;
$$;

revoke all on function public.get_user_orders(int, int) from public;
grant execute on function public.get_user_orders(int, int) to authenticated;

-- Create subscription (called from server-side API routes using service_role key)
create or replace function public.create_subscription(
  p_user_id uuid,
  p_plan_id uuid,
  p_tier text,
  p_billing_period text,
  p_provider text,
  p_provider_subscription_id text,
  p_provider_plan_id text default '',
  p_period_start timestamptz default now(),
  p_period_end timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub_id uuid;
begin
  -- Validate inputs
  if p_user_id is null or p_plan_id is null then
    return json_build_object('status', 'error', 'message', 'Missing required fields');
  end if;

  if p_billing_period not in ('monthly', 'yearly') then
    return json_build_object('status', 'error', 'message', 'Invalid billing period');
  end if;

  -- Cancel any existing active subscriptions for this user
  update public.subscriptions
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where user_id = p_user_id and status in ('active', 'past_due');

  -- Create new subscription
  insert into public.subscriptions (
    user_id, plan_id, tier, billing_period, status,
    provider, provider_subscription_id, provider_plan_id,
    current_period_start, current_period_end
  ) values (
    p_user_id,
    p_plan_id,
    p_tier::public.user_tier,
    p_billing_period,
    'active',
    p_provider::public.payment_provider,
    p_provider_subscription_id,
    p_provider_plan_id,
    p_period_start,
    p_period_end
  )
  returning id into v_sub_id;

  -- Upgrade user tier
  update public.user_profiles
  set tier = p_tier::public.user_tier, updated_at = now()
  where id = p_user_id;

  return json_build_object('status', 'success', 'subscription_id', v_sub_id);
end;
$$;

revoke all on function public.create_subscription(uuid, uuid, text, text, text, text, text, timestamptz, timestamptz) from public;
grant execute on function public.create_subscription(uuid, uuid, text, text, text, text, text, timestamptz, timestamptz) to service_role;

-- Record an order (payment)
create or replace function public.record_order(
  p_user_id uuid,
  p_subscription_id uuid,
  p_provider text,
  p_provider_order_id text,
  p_amount numeric,
  p_currency text default 'USD',
  p_status text default 'completed',
  p_plan_tier text default 'explorer',
  p_billing_period text default 'monthly',
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_exists boolean;
begin
  -- Idempotency check
  if p_idempotency_key is not null then
    select exists(
      select 1 from public.orders where idempotency_key = p_idempotency_key
    ) into v_exists;

    if v_exists then
      return json_build_object('status', 'duplicate', 'message', 'Order already processed');
    end if;
  end if;

  insert into public.orders (
    user_id, subscription_id, provider, provider_order_id,
    amount, currency, status, plan_tier, billing_period,
    idempotency_key, metadata
  ) values (
    p_user_id,
    p_subscription_id,
    p_provider::public.payment_provider,
    p_provider_order_id,
    p_amount,
    p_currency,
    p_status::public.order_status,
    p_plan_tier::public.user_tier,
    p_billing_period,
    p_idempotency_key,
    p_metadata
  )
  returning id into v_order_id;

  return json_build_object('status', 'success', 'order_id', v_order_id);
end;
$$;

revoke all on function public.record_order(uuid, uuid, text, text, numeric, text, text, text, text, text, jsonb) from public;
grant execute on function public.record_order(uuid, uuid, text, text, numeric, text, text, text, text, text, jsonb) to service_role;

-- Update subscription status (called from webhooks via service_role)
create or replace function public.update_subscription_status(
  p_provider_subscription_id text,
  p_status text,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_cancel_at_period_end boolean default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
begin
  select * into v_sub
  from public.subscriptions
  where provider_subscription_id = p_provider_subscription_id;

  if not found then
    return json_build_object('status', 'error', 'message', 'Subscription not found');
  end if;

  update public.subscriptions
  set
    status = p_status::public.subscription_status,
    current_period_start = coalesce(p_period_start, current_period_start),
    current_period_end = coalesce(p_period_end, current_period_end),
    cancel_at_period_end = coalesce(p_cancel_at_period_end, cancel_at_period_end),
    cancelled_at = case when p_status in ('cancelled', 'expired') then coalesce(cancelled_at, now()) else cancelled_at end,
    updated_at = now()
  where provider_subscription_id = p_provider_subscription_id;

  -- If subscription is no longer active, downgrade user to free
  if p_status in ('cancelled', 'suspended', 'expired') then
    -- Only downgrade if user has no other active subscription
    if not exists (
      select 1 from public.subscriptions
      where user_id = v_sub.user_id
        and status = 'active'
        and id != v_sub.id
    ) then
      update public.user_profiles
      set tier = 'explorer', updated_at = now()
      where id = v_sub.user_id;
    end if;
  end if;

  return json_build_object('status', 'success');
end;
$$;

revoke all on function public.update_subscription_status(text, text, timestamptz, timestamptz, boolean) from public;
grant execute on function public.update_subscription_status(text, text, timestamptz, timestamptz, boolean) to service_role;

-- User cancels subscription (marks for end-of-period cancellation)
create or replace function public.cancel_user_subscription()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
begin
  if auth.uid() is null then
    return json_build_object('status', 'error', 'message', 'Not authenticated');
  end if;

  select * into v_sub
  from public.subscriptions
  where user_id = auth.uid() and status = 'active'
  order by created_at desc
  limit 1;

  if not found then
    return json_build_object('status', 'error', 'message', 'No active subscription');
  end if;

  update public.subscriptions
  set cancel_at_period_end = true, updated_at = now()
  where id = v_sub.id;

  return json_build_object(
    'status', 'success',
    'subscription_id', v_sub.id,
    'provider', v_sub.provider,
    'provider_subscription_id', v_sub.provider_subscription_id,
    'current_period_end', v_sub.current_period_end
  );
end;
$$;

revoke all on function public.cancel_user_subscription() from public;
grant execute on function public.cancel_user_subscription() to authenticated;

-- Admin: list all subscriptions
create or replace function public.admin_get_subscriptions(
  p_status text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subs json;
  v_total bigint;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  select count(*) into v_total
  from public.subscriptions s
  where (p_status is null or s.status = p_status::public.subscription_status);

  select json_agg(row_to_json(t)) into v_subs
  from (
    select
      s.id,
      s.user_id,
      up.handle,
      up.display_name,
      up.avatar_url,
      s.tier,
      s.billing_period,
      s.status,
      s.provider,
      s.provider_subscription_id,
      s.current_period_start,
      s.current_period_end,
      s.cancel_at_period_end,
      s.created_at,
      pp.name as plan_name
    from public.subscriptions s
    join public.user_profiles up on up.id = s.user_id
    join public.pricing_plans pp on pp.id = s.plan_id
    where (p_status is null or s.status = p_status::public.subscription_status)
    order by s.created_at desc
    limit p_limit offset p_offset
  ) t;

  return json_build_object(
    'status', 'success',
    'subscriptions', coalesce(v_subs, '[]'::json),
    'total', v_total
  );
end;
$$;

revoke all on function public.admin_get_subscriptions(text, int, int) from public;
grant execute on function public.admin_get_subscriptions(text, int, int) to authenticated;

-- Get plan details for checkout
create or replace function public.get_checkout_plan(
  p_tier text,
  p_billing_period text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan json;
begin
  if auth.uid() is null then
    return json_build_object('status', 'error', 'message', 'Not authenticated');
  end if;

  if p_billing_period not in ('monthly', 'yearly') then
    return json_build_object('status', 'error', 'message', 'Invalid billing period');
  end if;

  select json_build_object(
    'id', pp.id,
    'tier', pp.tier,
    'name', pp.name,
    'tagline', pp.tagline,
    'monthly_price', pp.monthly_price,
    'yearly_price', pp.yearly_price,
    'paypal_plan_id_monthly', pp.paypal_plan_id_monthly,
    'paypal_plan_id_yearly', pp.paypal_plan_id_yearly,
    'stripe_price_id_monthly', pp.stripe_price_id_monthly,
    'stripe_price_id_yearly', pp.stripe_price_id_yearly,
    'features', coalesce((
      select json_agg(
        json_build_object(
          'feature_text', pf.feature_text,
          'included', pf.included
        ) order by pf.sort_order
      )
      from public.pricing_plan_features pf
      where pf.plan_id = pp.id and pf.included = true
    ), '[]'::json)
  ) into v_plan
  from public.pricing_plans pp
  where pp.tier = p_tier::public.user_tier
    and pp.is_active = true;

  if v_plan is null then
    return json_build_object('status', 'error', 'message', 'Plan not found');
  end if;

  return json_build_object('status', 'success', 'plan', v_plan);
end;
$$;

revoke all on function public.get_checkout_plan(text, text) from public;
grant execute on function public.get_checkout_plan(text, text) to authenticated;

-- ============================================
-- REVIEWS SYSTEM
-- ============================================

create table if not exists public.site_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  title text not null check (char_length(title) between 3 and 100),
  body text not null check (char_length(body) between 10 and 1000),
  is_featured boolean not null default false,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_reviews_user_id_idx on public.site_reviews (user_id);
create index if not exists site_reviews_featured_idx on public.site_reviews (is_featured) where is_featured = true;
create index if not exists site_reviews_approved_idx on public.site_reviews (is_approved) where is_approved = true;
-- One review per user
create unique index if not exists site_reviews_user_unique on public.site_reviews (user_id);

-- RLS
alter table public.site_reviews enable row level security;

-- Anyone can read approved reviews
create policy "Anyone can read approved reviews"
  on public.site_reviews for select
  to anon, authenticated
  using (is_approved = true);

-- Admins can read all reviews
create policy "Admins can read all reviews"
  on public.site_reviews for select
  to authenticated
  using (public.is_admin());

-- Users can insert their own review
create policy "Users can insert own review"
  on public.site_reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own review
create policy "Users can update own review"
  on public.site_reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins can update any review (for featuring/approving)
create policy "Admins can update any review"
  on public.site_reviews for update
  to authenticated
  using (public.is_admin());

-- Admins can delete any review
create policy "Admins can delete any review"
  on public.site_reviews for delete
  to authenticated
  using (public.is_admin());

-- ============================================
-- REVIEWS RPCs
-- ============================================

-- Get featured reviews for homepage (public, no auth required)
create or replace function public.get_featured_reviews(
  p_limit int default 6
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviews json;
begin
  select json_agg(row_to_json(t)) into v_reviews
  from (
    select
      sr.id,
      sr.rating,
      sr.title,
      sr.body,
      sr.created_at,
      up.handle,
      up.display_name,
      up.avatar_url,
      up.tier
    from public.site_reviews sr
    join public.user_profiles up on up.id = sr.user_id
    where sr.is_featured = true and sr.is_approved = true
    order by sr.created_at desc
    limit p_limit
  ) t;

  return json_build_object(
    'status', 'success',
    'reviews', coalesce(v_reviews, '[]'::json)
  );
end;
$$;

revoke all on function public.get_featured_reviews(int) from public;
grant execute on function public.get_featured_reviews(int) to anon, authenticated;

-- Submit a review (authenticated users only, one per user)
create or replace function public.submit_review(
  p_rating int,
  p_title text,
  p_body text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review_id uuid;
  v_exists boolean;
begin
  if auth.uid() is null then
    return json_build_object('status', 'error', 'message', 'Not authenticated');
  end if;

  -- Validate rating
  if p_rating < 1 or p_rating > 5 then
    return json_build_object('status', 'error', 'message', 'Rating must be between 1 and 5');
  end if;

  -- Validate title length
  if char_length(trim(p_title)) < 3 or char_length(trim(p_title)) > 100 then
    return json_build_object('status', 'error', 'message', 'Title must be between 3 and 100 characters');
  end if;

  -- Validate body length
  if char_length(trim(p_body)) < 10 or char_length(trim(p_body)) > 1000 then
    return json_build_object('status', 'error', 'message', 'Review must be between 10 and 1000 characters');
  end if;

  -- Check if user already has a review
  select exists(
    select 1 from public.site_reviews where user_id = auth.uid()
  ) into v_exists;

  if v_exists then
    -- Update existing review
    update public.site_reviews
    set rating = p_rating,
        title = trim(p_title),
        body = trim(p_body),
        is_approved = false,
        updated_at = now()
    where user_id = auth.uid()
    returning id into v_review_id;

    return json_build_object('status', 'success', 'review_id', v_review_id, 'message', 'Review updated and pending approval');
  end if;

  -- Insert new review
  insert into public.site_reviews (user_id, rating, title, body)
  values (auth.uid(), p_rating, trim(p_title), trim(p_body))
  returning id into v_review_id;

  return json_build_object('status', 'success', 'review_id', v_review_id, 'message', 'Review submitted and pending approval');
end;
$$;

revoke all on function public.submit_review(int, text, text) from public;
grant execute on function public.submit_review(int, text, text) to authenticated;

-- Admin: list all reviews with filtering
create or replace function public.admin_get_reviews(
  p_status text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviews json;
  v_total bigint;
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  select count(*) into v_total
  from public.site_reviews sr
  where (p_status is null
    or (p_status = 'pending' and sr.is_approved = false)
    or (p_status = 'approved' and sr.is_approved = true)
    or (p_status = 'featured' and sr.is_featured = true));

  select json_agg(row_to_json(t)) into v_reviews
  from (
    select
      sr.id,
      sr.user_id,
      sr.rating,
      sr.title,
      sr.body,
      sr.is_featured,
      sr.is_approved,
      sr.created_at,
      sr.updated_at,
      up.handle,
      up.display_name,
      up.avatar_url,
      up.tier
    from public.site_reviews sr
    join public.user_profiles up on up.id = sr.user_id
    where (p_status is null
      or (p_status = 'pending' and sr.is_approved = false)
      or (p_status = 'approved' and sr.is_approved = true)
      or (p_status = 'featured' and sr.is_featured = true))
    order by sr.created_at desc
    limit p_limit offset p_offset
  ) t;

  return json_build_object(
    'status', 'success',
    'reviews', coalesce(v_reviews, '[]'::json),
    'total', v_total
  );
end;
$$;

revoke all on function public.admin_get_reviews(text, int, int) from public;
grant execute on function public.admin_get_reviews(text, int, int) to authenticated;

-- Admin: toggle review approval/featured status
create or replace function public.admin_update_review(
  p_review_id uuid,
  p_is_approved boolean default null,
  p_is_featured boolean default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  update public.site_reviews
  set
    is_approved = coalesce(p_is_approved, is_approved),
    is_featured = coalesce(p_is_featured, is_featured),
    updated_at = now()
  where id = p_review_id;

  if not found then
    return json_build_object('status', 'error', 'message', 'Review not found');
  end if;

  return json_build_object('status', 'success');
end;
$$;

revoke all on function public.admin_update_review(uuid, boolean, boolean) from public;
grant execute on function public.admin_update_review(uuid, boolean, boolean) to authenticated;

-- Admin: delete a review
create or replace function public.admin_delete_review(p_review_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return json_build_object('status', 'error', 'message', 'Unauthorized');
  end if;

  delete from public.site_reviews where id = p_review_id;

  if not found then
    return json_build_object('status', 'error', 'message', 'Review not found');
  end if;

  return json_build_object('status', 'success');
end;
$$;

revoke all on function public.admin_delete_review(uuid) from public;
grant execute on function public.admin_delete_review(uuid) to authenticated;

-- Get review statistics for homepage (public)
create or replace function public.get_review_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_avg numeric;
begin
  select count(*), coalesce(round(avg(rating)::numeric, 1), 0)
  into v_total, v_avg
  from public.site_reviews
  where is_approved = true;

  return json_build_object(
    'status', 'success',
    'total_reviews', v_total,
    'average_rating', v_avg
  );
end;
$$;

revoke all on function public.get_review_stats() from public;
grant execute on function public.get_review_stats() to anon, authenticated;

-- Get current user's review (for editing)
create or replace function public.get_user_review()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review json;
begin
  if auth.uid() is null then
    return json_build_object('status', 'error', 'message', 'Not authenticated');
  end if;

  select json_build_object(
    'id', sr.id,
    'rating', sr.rating,
    'title', sr.title,
    'body', sr.body,
    'is_featured', sr.is_featured,
    'is_approved', sr.is_approved,
    'created_at', sr.created_at,
    'updated_at', sr.updated_at
  ) into v_review
  from public.site_reviews sr
  where sr.user_id = auth.uid();

  return json_build_object(
    'status', 'success',
    'review', v_review
  );
end;
$$;

revoke all on function public.get_user_review() from public;
grant execute on function public.get_user_review() to authenticated;
