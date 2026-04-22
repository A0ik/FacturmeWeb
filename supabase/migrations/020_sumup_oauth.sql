-- SumUp OAuth 2.0 integration
-- Replace API key storage with OAuth tokens

-- Drop old columns if they exist (will be recreated with OAuth data)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS sumup_api_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS sumup_merchant_code;

-- Add OAuth token storage
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sumup_access_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sumup_refresh_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sumup_token_expires_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sumup_merchant_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sumup_merchant_code text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_sumup_merchant_id_idx ON public.profiles(sumup_merchant_id) WHERE sumup_merchant_id IS NOT NULL;
