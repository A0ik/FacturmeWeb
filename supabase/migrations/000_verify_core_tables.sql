-- ────────────────────────────────────────────────────────────────────────────────
-- Master migration: ensure all core tables exist
-- Run this once on your Supabase project (SQL Editor)
-- ────────────────────────────────────────────────────────────────────────────────

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id                     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                  text NOT NULL,
  company_name           text DEFAULT '',
  first_name             text,
  last_name              text,
  siret                  text,
  address                text,
  city                   text,
  postal_code            text,
  country                text DEFAULT 'FR',
  phone                  text,
  vat_number             text,
  logo_url               text,
  template_id            int DEFAULT 1,
  accent_color           text DEFAULT '#1D9E75',
  legal_status           text DEFAULT 'auto-entrepreneur',
  subscription_tier      text DEFAULT 'free',
  invoice_count          int DEFAULT 0,
  monthly_invoice_count  int DEFAULT 0,
  invoice_month          text,
  invoice_prefix         text DEFAULT 'FACT',
  currency               text DEFAULT 'EUR',
  onboarding_done        boolean DEFAULT false,
  custom_template_html   text,
  stripe_account_id      text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  stripe_connect_id      text,
  signature_url          text,
  language               text DEFAULT 'fr',
  web_push_subscription  text,
  sector                 text,
  bank_name              text,
  iban                   text,
  bic                    text,
  payment_terms          text DEFAULT '30',
  legal_mention          text,
  created_at             timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "profiles_owner" ON public.profiles FOR ALL USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text,
  phone       text,
  siret       text,
  address     text,
  city        text,
  postal_code text,
  country     text DEFAULT 'FR',
  vat_number  text,
  notes       text,
  tags        text[],
  website     text,
  stripe_customer_id      text,
  stripe_sepa_mandate_id  text,
  sepa_iban_last4         text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "clients_owner" ON public.clients FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id             uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name_override  text,
  number                text NOT NULL,
  document_type         text DEFAULT 'invoice',
  status                text DEFAULT 'draft',
  issue_date            date NOT NULL,
  due_date              date,
  items                 jsonb DEFAULT '[]',
  subtotal              numeric DEFAULT 0,
  vat_amount            numeric DEFAULT 0,
  discount_percent      numeric,
  discount_amount       numeric,
  total                 numeric DEFAULT 0,
  notes                 text,
  pdf_url               text,
  payment_link          text,
  payment_method        text,
  stripe_payment_url    text,
  amount_paid           numeric DEFAULT 0,
  voice_transcript      text,
  linked_invoice_id     uuid,
  sent_at               timestamptz,
  paid_at               timestamptz,
  client_signature_url  text,
  signed_at             timestamptz,
  signed_ip             text,
  signed_by             text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "invoices_owner" ON public.invoices FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(user_id, status);

-- 4. RECURRING INVOICES
CREATE TABLE IF NOT EXISTS public.recurring_invoices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id             uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name_override  text,
  document_type         text DEFAULT 'invoice',
  frequency             text DEFAULT 'monthly',
  items                 jsonb DEFAULT '[]',
  notes                 text,
  next_run_date         date NOT NULL,
  last_run_date         date,
  is_active             boolean DEFAULT true,
  auto_send             boolean DEFAULT false,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "recurring_invoices_owner" ON public.recurring_invoices FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  unit_price  numeric DEFAULT 0,
  vat_rate    numeric DEFAULT 20,
  unit        text DEFAULT 'unité',
  category    text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "products_owner" ON public.products FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 6. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       text NOT NULL,
  amount      numeric NOT NULL,
  category    text,
  date        date NOT NULL,
  receipt_url text,
  notes       text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "expenses_owner" ON public.expenses FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 7. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  message     text,
  type        text DEFAULT 'info',
  read        boolean DEFAULT false,
  link        text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "notifications_owner" ON public.notifications FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 8. OPPORTUNITIES (CRM)
CREATE TABLE IF NOT EXISTS public.opportunities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title       text NOT NULL,
  amount      numeric DEFAULT 0,
  stage       text DEFAULT 'lead',
  probability int DEFAULT 50,
  close_date  date,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "opportunities_owner" ON public.opportunities FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 9. WORKSPACES
CREATE TABLE IF NOT EXISTS public.workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "workspaces_owner" ON public.workspaces FOR ALL USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 10. WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text DEFAULT 'member',
  created_at    timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "workspace_members_access" ON public.workspace_members FOR ALL USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT owner_id FROM public.workspaces WHERE id = workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 11. WORKSPACE INVITATIONS
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email         text NOT NULL,
  role          text DEFAULT 'member',
  token         text NOT NULL UNIQUE,
  accepted      boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- 12. PARTIAL PAYMENTS (migration 001)
CREATE TABLE IF NOT EXISTS public.partial_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount      numeric NOT NULL,
  paid_at     date NOT NULL DEFAULT CURRENT_DATE,
  method      text,
  note        text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.partial_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "partial_payments_select" ON public.partial_payments FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id)
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "partial_payments_insert" ON public.partial_payments FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id)
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "partial_payments_delete" ON public.partial_payments FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM public.invoices WHERE id = invoice_id)
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 13. CLIENT NOTES (migration 002)
CREATE TABLE IF NOT EXISTS public.client_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "client_notes_owner" ON public.client_notes FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 14. CRM TASKS (migration 003)
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  done            boolean DEFAULT false,
  due_date        date,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "crm_tasks_owner" ON public.crm_tasks FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 15. WEBHOOK ENDPOINTS (migration 004)
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url         text NOT NULL,
  events      text[] NOT NULL DEFAULT '{}',
  secret      text,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "webhook_endpoints_owner" ON public.webhook_endpoints FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 16. CLIENT PORTAL TOKENS (migration 005)
CREATE TABLE IF NOT EXISTS public.client_portal_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  expires_at  timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- 17. APPOINTMENTS (migration 006)
CREATE TABLE IF NOT EXISTS public.appointments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id         uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title             text NOT NULL,
  description       text,
  location          text,
  appointment_date  date NOT NULL,
  start_time        time NOT NULL,
  end_time          time NOT NULL,
  color             text DEFAULT 'blue',
  google_event_id   text,
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "appointments_owner" ON public.appointments FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON public.appointments(user_id, appointment_date);

-- ─── RPC: auto-increment invoice counter per month ────────────────────────────
DROP FUNCTION IF EXISTS increment_invoice_count(uuid, text);
CREATE OR REPLACE FUNCTION increment_invoice_count(p_user_id uuid, p_month text)
RETURNS TABLE(invoice_count int) AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.profiles
  SET monthly_invoice_count = CASE WHEN invoice_month = p_month THEN monthly_invoice_count + 1 ELSE 1 END,
      invoice_month = p_month,
      invoice_count = invoice_count + 1
  WHERE id = p_user_id
  RETURNING monthly_invoice_count INTO v_count;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── STORAGE BUCKET ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;
