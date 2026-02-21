-- Migration: Rename tier enum values
-- free → explorer, basic → access, premium → builder, ultimate → architect
--
-- PostgreSQL does not support ALTER TYPE ... RENAME VALUE directly.
-- We must: create new enum, migrate columns, drop old enum, rename new.
-- This is wrapped in a transaction for safety.

BEGIN;

-- 1. Create the new enum type
CREATE TYPE public.user_tier_new AS ENUM ('explorer', 'access', 'builder', 'architect', 'admin');

-- 2. Migrate user_profiles.tier
ALTER TABLE public.user_profiles
  ALTER COLUMN tier DROP DEFAULT;

ALTER TABLE public.user_profiles
  ALTER COLUMN tier TYPE public.user_tier_new
  USING (
    CASE tier::text
      WHEN 'free' THEN 'explorer'::public.user_tier_new
      WHEN 'basic' THEN 'access'::public.user_tier_new
      WHEN 'premium' THEN 'builder'::public.user_tier_new
      WHEN 'ultimate' THEN 'architect'::public.user_tier_new
      WHEN 'admin' THEN 'admin'::public.user_tier_new
    END
  );

ALTER TABLE public.user_profiles
  ALTER COLUMN tier SET DEFAULT 'explorer'::public.user_tier_new;

-- 3. Migrate products.tier
ALTER TABLE public.products
  ALTER COLUMN tier DROP DEFAULT;

ALTER TABLE public.products
  ALTER COLUMN tier TYPE public.user_tier_new
  USING (
    CASE tier::text
      WHEN 'free' THEN 'explorer'::public.user_tier_new
      WHEN 'basic' THEN 'access'::public.user_tier_new
      WHEN 'premium' THEN 'builder'::public.user_tier_new
      WHEN 'ultimate' THEN 'architect'::public.user_tier_new
      WHEN 'admin' THEN 'admin'::public.user_tier_new
    END
  );

ALTER TABLE public.products
  ALTER COLUMN tier SET DEFAULT 'explorer'::public.user_tier_new;

-- 4. Migrate pricing_plans.tier
ALTER TABLE public.pricing_plans
  ALTER COLUMN tier DROP DEFAULT;

ALTER TABLE public.pricing_plans
  ALTER COLUMN tier TYPE public.user_tier_new
  USING (
    CASE tier::text
      WHEN 'free' THEN 'explorer'::public.user_tier_new
      WHEN 'basic' THEN 'access'::public.user_tier_new
      WHEN 'premium' THEN 'builder'::public.user_tier_new
      WHEN 'ultimate' THEN 'architect'::public.user_tier_new
      WHEN 'admin' THEN 'admin'::public.user_tier_new
    END
  );

-- pricing_plans.tier has no default, so no need to re-set one

-- 5. Migrate subscriptions.tier (if the table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'tier') THEN
    EXECUTE 'ALTER TABLE public.subscriptions ALTER COLUMN tier DROP DEFAULT';
    EXECUTE '
      ALTER TABLE public.subscriptions
        ALTER COLUMN tier TYPE public.user_tier_new
        USING (
          CASE tier::text
            WHEN ''free'' THEN ''explorer''::public.user_tier_new
            WHEN ''basic'' THEN ''access''::public.user_tier_new
            WHEN ''premium'' THEN ''builder''::public.user_tier_new
            WHEN ''ultimate'' THEN ''architect''::public.user_tier_new
            WHEN ''admin'' THEN ''admin''::public.user_tier_new
          END
        )';
  END IF;
END $$;

-- 6. Drop the old enum and rename the new one
DROP TYPE public.user_tier;
ALTER TYPE public.user_tier_new RENAME TO user_tier;

-- 7. Update existing pricing_plans tier values to match new names
UPDATE public.pricing_plans SET tier = 'explorer' WHERE tier = 'explorer';  -- no-op, already migrated by USING clause
-- The USING clause above already converted the values, so no extra UPDATE needed.

-- 8. Recreate functions that reference tier values (they use text casts internally)
-- The check_product_access RPC and other functions reference tier values as strings
-- in CASE statements. They were updated in schema.sql but need to be re-deployed.
-- Run the updated schema.sql RPCs or use the statements below:

-- Re-create check_product_access with new tier names
CREATE OR REPLACE FUNCTION public.check_product_access(p_product_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_user_id uuid;
  v_user_tier public.user_tier;
  v_product_tier public.user_tier;
  v_user_level int;
  v_product_level int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('has_access', false, 'reason', 'not_authenticated');
  END IF;

  SELECT tier INTO v_user_tier FROM public.user_profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('has_access', false, 'reason', 'no_profile');
  END IF;

  SELECT tier INTO v_product_tier FROM public.products WHERE id = p_product_id AND is_published = true;
  IF NOT FOUND THEN
    RETURN json_build_object('has_access', false, 'reason', 'product_not_found');
  END IF;

  v_user_level := CASE v_user_tier
    WHEN 'explorer' THEN 1
    WHEN 'access' THEN 2
    WHEN 'builder' THEN 3
    WHEN 'architect' THEN 4
    WHEN 'admin' THEN 5
  END;

  v_product_level := CASE v_product_tier
    WHEN 'explorer' THEN 1
    WHEN 'access' THEN 2
    WHEN 'builder' THEN 3
    WHEN 'architect' THEN 4
    WHEN 'admin' THEN 5
  END;

  IF v_user_level >= v_product_level THEN
    RETURN json_build_object('has_access', true, 'user_tier', v_user_tier, 'product_tier', v_product_tier);
  ELSE
    RETURN json_build_object('has_access', false, 'reason', 'insufficient_tier', 'user_tier', v_user_tier, 'required_tier', v_product_tier);
  END IF;
END;
$func$;

-- Re-create update_subscription_status with new tier names
CREATE OR REPLACE FUNCTION public.update_subscription_status(
  p_provider_subscription_id text,
  p_status text,
  p_period_start timestamptz DEFAULT NULL,
  p_period_end timestamptz DEFAULT NULL,
  p_auto_renew boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_sub record;
BEGIN
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE provider_subscription_id = p_provider_subscription_id;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'error', 'message', 'Subscription not found');
  END IF;

  UPDATE public.subscriptions SET
    status = p_status::public.subscription_status,
    current_period_start = COALESCE(p_period_start, current_period_start),
    current_period_end = COALESCE(p_period_end, current_period_end),
    auto_renew = COALESCE(p_auto_renew, auto_renew),
    cancelled_at = CASE WHEN p_status = 'cancelled' THEN now() ELSE cancelled_at END,
    updated_at = now()
  WHERE id = v_sub.id;

  IF p_status IN ('cancelled', 'suspended', 'expired') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = v_sub.user_id
        AND status = 'active'
        AND id != v_sub.id
    ) THEN
      UPDATE public.user_profiles
      SET tier = 'explorer', updated_at = now()
      WHERE id = v_sub.user_id;
    END IF;
  END IF;

  RETURN json_build_object('status', 'success');
END;
$func$;

-- Re-create record_order with new default tier
CREATE OR REPLACE FUNCTION public.record_order(
  p_user_id uuid,
  p_subscription_id uuid,
  p_provider text,
  p_provider_order_id text,
  p_amount numeric,
  p_currency text DEFAULT 'USD',
  p_status text DEFAULT 'completed',
  p_plan_tier text DEFAULT 'explorer',
  p_billing_period text DEFAULT 'monthly',
  p_idempotency_key text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_order_id uuid;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN json_build_object('status', 'duplicate', 'order_id', v_order_id);
    END IF;
  END IF;

  INSERT INTO public.orders (
    user_id, subscription_id, provider, provider_order_id,
    amount, currency, status, plan_tier, billing_period,
    idempotency_key, metadata
  ) VALUES (
    p_user_id, p_subscription_id, p_provider::public.payment_provider, p_provider_order_id,
    p_amount, p_currency, p_status::public.order_status, p_plan_tier, p_billing_period,
    p_idempotency_key, p_metadata
  )
  RETURNING id INTO v_order_id;

  RETURN json_build_object('status', 'success', 'order_id', v_order_id);
END;
$func$;

COMMIT;
