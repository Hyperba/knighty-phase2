-- ============================================
-- SEED DATA FOR SITE REVIEWS
-- Run this after schema.sql and after creating test user profiles
-- These reviews use placeholder user_ids that should be updated
-- to match actual auth.users IDs in your environment.
-- For development, you can insert directly with is_approved and is_featured set.
-- ============================================

-- Since seed reviews need real user_ids from auth.users, and we may not have them,
-- we insert via a helper that skips if no users exist.
-- In production, real users submit reviews through the RPC.

-- If you have test users, replace the UUIDs below with real user IDs.
-- Otherwise, these serve as a template.

-- For local dev: insert featured reviews directly (bypassing RPC)
-- You'll need to replace these user_id values with real ones from your auth.users table.

DO $$
DECLARE
  v_user_ids uuid[];
  v_count int;
BEGIN
  -- Get up to 6 user IDs from existing profiles
  SELECT array_agg(id) INTO v_user_ids
  FROM (
    SELECT id FROM public.user_profiles ORDER BY created_at LIMIT 6
  ) sub;

  v_count := coalesce(array_length(v_user_ids, 1), 0);

  IF v_count = 0 THEN
    RAISE NOTICE 'No user profiles found. Skipping review seed data. Create users first, then re-run.';
    RETURN;
  END IF;

  -- Review 1
  IF v_count >= 1 THEN
    INSERT INTO public.site_reviews (user_id, rating, title, body, is_featured, is_approved)
    VALUES (
      v_user_ids[1], 5,
      'Absolutely incredible builds',
      'I have been using Knighty Builds for months now and the quality is unmatched. Every build is detailed, well-documented, and easy to follow. The premium tier is worth every penny — the exclusive builds are on another level. Highly recommend to anyone serious about Minecraft building.',
      true, true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Review 2
  IF v_count >= 2 THEN
    INSERT INTO public.site_reviews (user_id, rating, title, body, is_featured, is_approved)
    VALUES (
      v_user_ids[2], 5,
      'Best Minecraft build resource online',
      'As someone who runs a Minecraft server, finding quality builds used to be a nightmare. Knighty Builds changed everything. The download process is seamless, the builds are stunning, and the community is amazing. This is the gold standard for Minecraft content.',
      true, true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Review 3
  IF v_count >= 3 THEN
    INSERT INTO public.site_reviews (user_id, rating, title, body, is_featured, is_approved)
    VALUES (
      v_user_ids[3], 4,
      'Great variety and quality',
      'Love the variety of builds available. From medieval castles to modern houses, there is something for every project. The free tier builds are surprisingly good too — they convinced me to upgrade to Builder tier for the full collection.',
      true, true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Review 4
  IF v_count >= 4 THEN
    INSERT INTO public.site_reviews (user_id, rating, title, body, is_featured, is_approved)
    VALUES (
      v_user_ids[4], 5,
      'Perfect for server owners',
      'Running a survival server and needed some spawn builds. The quality here is professional grade. My players constantly ask where I get these builds from. The schematic downloads work flawlessly with WorldEdit. Could not be happier!',
      true, true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Review 5
  IF v_count >= 5 THEN
    INSERT INTO public.site_reviews (user_id, rating, title, body, is_featured, is_approved)
    VALUES (
      v_user_ids[5], 5,
      'The community is amazing',
      'Beyond just the builds, the community here is what keeps me coming back. The Discord is active, Knighty is super responsive, and the early access to new builds makes the subscription totally worth it. This platform genuinely cares about its users.',
      true, true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Review 6
  IF v_count >= 6 THEN
    INSERT INTO public.site_reviews (user_id, rating, title, body, is_featured, is_approved)
    VALUES (
      v_user_ids[6], 4,
      'Learned so much from these builds',
      'As a beginner builder, studying the builds here has taught me more than any tutorial. The attention to detail in texturing and depth is inspiring. I went from basic boxes to actually decent builds thanks to Knighty. The guides that come with premium builds are super helpful.',
      true, true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Inserted up to % seed reviews.', v_count;
END;
$$;
