-- ============================================
-- SEED DATA FOR PRICING PLANS
-- Run this after the pricing tables are created in schema.sql
-- ============================================

-- Explorer (Free)
insert into public.pricing_plans (tier, name, tagline, description, monthly_price, yearly_price, cta_label, showcase_image, is_popular, sort_order)
values ('explorer', 'Explorer', 'Start your journey', 'Browse the collection and download free community builds. No credit card needed.', 0, 0, 'Get Started Free', '/builds/statues.png', false, 0)
on conflict (tier) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  monthly_price = excluded.monthly_price, yearly_price = excluded.yearly_price,
  cta_label = excluded.cta_label, showcase_image = excluded.showcase_image,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order, updated_at = now();

-- Access (Basic)
insert into public.pricing_plans (tier, name, tagline, description, monthly_price, yearly_price, cta_label, showcase_image, is_popular, sort_order)
values ('access', 'Access', 'Unlock more', 'Step up with access-tier builds, complete build guides, and tutorials.', 3, 30, 'Get Access', '/builds/houses.png', false, 1)
on conflict (tier) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  monthly_price = excluded.monthly_price, yearly_price = excluded.yearly_price,
  cta_label = excluded.cta_label, showcase_image = excluded.showcase_image,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order, updated_at = now();

-- Builder (Premium)
insert into public.pricing_plans (tier, name, tagline, description, monthly_price, yearly_price, cta_label, showcase_image, is_popular, sort_order)
values ('builder', 'Builder', 'For serious builders', 'Unlock builder-tier builds, early access to new drops, and detailed guides.', 7, 70, 'Get Builder', '/builds/portals.png', true, 2)
on conflict (tier) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  monthly_price = excluded.monthly_price, yearly_price = excluded.yearly_price,
  cta_label = excluded.cta_label, showcase_image = excluded.showcase_image,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order, updated_at = now();

-- Architect (Ultimate)
insert into public.pricing_plans (tier, name, tagline, description, monthly_price, yearly_price, cta_label, showcase_image, is_popular, sort_order)
values ('architect', 'Architect', 'The full experience', 'Everything unlocked. Every build, every guide, priority support, exclusive content.', 15, 150, 'Get Architect', '/builds/vehicles.png', false, 3)
on conflict (tier) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  monthly_price = excluded.monthly_price, yearly_price = excluded.yearly_price,
  cta_label = excluded.cta_label, showcase_image = excluded.showcase_image,
  is_popular = excluded.is_popular, sort_order = excluded.sort_order, updated_at = now();

-- ─── Features for Explorer (Free) ───────────────
do $$
declare v_plan_id uuid;
begin
  select id into v_plan_id from public.pricing_plans where tier = 'explorer';
  delete from public.pricing_plan_features where plan_id = v_plan_id;
  insert into public.pricing_plan_features (plan_id, feature_text, included, is_new, sort_order) values
    (v_plan_id, 'Browse & download free builds', true, false, 0),
    (v_plan_id, 'Community Discord access', true, false, 1),
    (v_plan_id, 'Basic email support', true, false, 2),
    (v_plan_id, 'Access tier builds', false, false, 3),
    (v_plan_id, 'Build guides & tutorials', false, false, 4),
    (v_plan_id, 'Builder tier builds', false, false, 5),
    (v_plan_id, 'Architect tier builds', false, false, 6),
    (v_plan_id, 'Priority 1-on-1 support', false, false, 7);
end $$;

-- ─── Features for Access (Basic) ────────────────
do $$
declare v_plan_id uuid;
begin
  select id into v_plan_id from public.pricing_plans where tier = 'access';
  delete from public.pricing_plan_features where plan_id = v_plan_id;
  insert into public.pricing_plan_features (plan_id, feature_text, included, is_new, sort_order) values
    (v_plan_id, 'Browse & download free builds', true, false, 0),
    (v_plan_id, 'Community Discord access', true, false, 1),
    (v_plan_id, 'Basic email support', true, false, 2),
    (v_plan_id, 'Access tier builds', true, true, 3),
    (v_plan_id, 'Build guides & tutorials', true, true, 4),
    (v_plan_id, 'Builder tier builds', false, false, 5),
    (v_plan_id, 'Architect tier builds', false, false, 6),
    (v_plan_id, 'Priority 1-on-1 support', false, false, 7);
end $$;

-- ─── Features for Builder (Premium) ─────────────
do $$
declare v_plan_id uuid;
begin
  select id into v_plan_id from public.pricing_plans where tier = 'builder';
  delete from public.pricing_plan_features where plan_id = v_plan_id;
  insert into public.pricing_plan_features (plan_id, feature_text, included, is_new, sort_order) values
    (v_plan_id, 'Browse & download free builds', true, false, 0),
    (v_plan_id, 'Community Discord access', true, false, 1),
    (v_plan_id, 'Basic email support', true, false, 2),
    (v_plan_id, 'Access tier builds', true, false, 3),
    (v_plan_id, 'Build guides & tutorials', true, false, 4),
    (v_plan_id, 'Builder tier builds', true, true, 5),
    (v_plan_id, 'Early access to new builds', true, true, 6),
    (v_plan_id, 'Architect tier builds', false, false, 7),
    (v_plan_id, 'Priority 1-on-1 support', false, false, 8);
end $$;

-- ─── Features for Architect (Ultimate) ──────────
do $$
declare v_plan_id uuid;
begin
  select id into v_plan_id from public.pricing_plans where tier = 'architect';
  delete from public.pricing_plan_features where plan_id = v_plan_id;
  insert into public.pricing_plan_features (plan_id, feature_text, included, is_new, sort_order) values
    (v_plan_id, 'Browse & download free builds', true, false, 0),
    (v_plan_id, 'Community Discord access', true, false, 1),
    (v_plan_id, 'Basic email support', true, false, 2),
    (v_plan_id, 'Access tier builds', true, false, 3),
    (v_plan_id, 'Build guides & tutorials', true, false, 4),
    (v_plan_id, 'Builder tier builds', true, false, 5),
    (v_plan_id, 'Early access to new builds', true, false, 6),
    (v_plan_id, 'Architect tier builds', true, true, 7),
    (v_plan_id, 'Priority 1-on-1 support', true, true, 8),
    (v_plan_id, 'Exclusive behind-the-scenes content', true, true, 9);
end $$;
