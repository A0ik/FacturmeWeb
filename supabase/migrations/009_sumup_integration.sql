-- SumUp integration fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sumup_api_key text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sumup_merchant_code text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sumup_checkout_id text;
