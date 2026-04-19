-- ────────────────────────────────────────────────────────────────────────────────
-- Migration 017: Add trial fields to profiles table
-- ────────────────────────────────────────────────────────────────────────────────

-- Step 1: Add trial-related columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS is_trial_active boolean DEFAULT false;

-- Step 2: Create index for trial queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_active ON public.profiles(is_trial_active) WHERE is_trial_active = true;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN public.profiles.trial_start_date IS 'Start date of the 4-day free trial';
COMMENT ON COLUMN public.profiles.trial_end_date IS 'End date of the 4-day free trial (trial_start_date + 4 days)';
COMMENT ON COLUMN public.profiles.is_trial_active IS 'Whether the user is currently in an active trial period';

-- Step 4: Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.activate_trial(uuid);
DROP FUNCTION IF EXISTS public.expire_trials();

-- Step 5: Create function to activate trial for a user
CREATE OR REPLACE FUNCTION public.activate_trial(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user can start a trial and activate it in one query
  UPDATE public.profiles
  SET
    trial_start_date = now(),
    trial_end_date = now() + interval '4 days',
    is_trial_active = true,
    subscription_tier = 'trial'
  WHERE id = p_user_id
    AND subscription_tier NOT IN ('pro', 'business', 'trial')
    AND (is_trial_active IS NULL OR is_trial_active = false);

  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;

-- Step 6: Create function to expire trials
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    is_trial_active = false,
    subscription_tier = 'free'
  WHERE
    is_trial_active = true
    AND trial_end_date < now()
    AND subscription_tier = 'trial';
END;
$$;

-- Step 7: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.activate_trial(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_trials() TO service_role;
