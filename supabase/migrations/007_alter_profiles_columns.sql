-- ────────────────────────────────────────────────────────────────────────────────
-- Add missing columns to profiles table
-- Run this in Supabase SQL Editor
-- ────────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Personal info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_name' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_name' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN last_name text;
  END IF;

  -- Company info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_name' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN company_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'siret' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN siret text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'city' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'postal_code' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN postal_code text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'country' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN country text DEFAULT 'FR';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'vat_number' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN vat_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'legal_status' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN legal_status text DEFAULT 'auto-entrepreneur';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'sector' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN sector text;
  END IF;

  -- Branding
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'logo_url' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN logo_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'template_id' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN template_id int DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'accent_color' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN accent_color text DEFAULT '#1D9E75';
  END IF;

  -- Subscription
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_tier text DEFAULT 'free';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'invoice_count' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN invoice_count int DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'monthly_invoice_count' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN monthly_invoice_count int DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'invoice_month' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN invoice_month text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'invoice_prefix' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN invoice_prefix text DEFAULT 'FACT';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'currency' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN currency text DEFAULT 'EUR';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_done' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_done boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'custom_template_html' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN custom_template_html text;
  END IF;

  -- Stripe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_account_id' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_account_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_subscription_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_connect_id' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_connect_id text;
  END IF;

  -- Signature & preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'signature_url' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN signature_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'language' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN language text DEFAULT 'fr';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'web_push_subscription' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN web_push_subscription text;
  END IF;

  -- Banking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bank_name' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN bank_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'iban' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN iban text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bic' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN bic text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'payment_terms' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN payment_terms text DEFAULT '30';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'legal_mention' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN legal_mention text;
  END IF;

  -- Created at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

END $$;
