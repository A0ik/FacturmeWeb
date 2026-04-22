-- ────────────────────────────────────────────────────────────────────────────────
-- Add Google Calendar columns to profiles table
-- Run this in Supabase SQL Editor
-- ────────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Google OAuth state for CSRF protection
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'google_oauth_state' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN google_oauth_state text;
  END IF;

  -- Google access token
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'google_access_token' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN google_access_token text;
  END IF;

  -- Google refresh token
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'google_refresh_token' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN google_refresh_token text;
  END IF;

  -- Google token expiration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'google_token_expires_at' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN google_token_expires_at timestamptz;
  END IF;

  -- Google account email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'google_email' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN google_email text;
  END IF;

  -- Google account name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'google_name' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN google_name text;
  END IF;

  -- Google profile picture
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'google_picture' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN google_picture text;
  END IF;

  -- Google connection timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'google_connected_at' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN google_connected_at timestamptz;
  END IF;

END $$;
