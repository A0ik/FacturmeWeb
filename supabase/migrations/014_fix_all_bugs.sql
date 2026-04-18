-- ────────────────────────────────────────────────────────────────────────────────
-- 014  FIX ALL BUGS - Clean up migration issues
-- ────────────────────────────────────────────────────────────────────────────────

-- 1. Drop any problematic views/functions that might cause issues
DROP VIEW IF EXISTS public.workspace_documents CASCADE;
DROP FUNCTION IF EXISTS public.user_is_workspace_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_workspace_documents();

-- 2. Ensure workspace_id columns exist (with proper constraints)
DO $$
BEGIN
  -- Add workspace_id to captured_documents if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captured_documents' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.captured_documents
    ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
  END IF;

  -- Add workspace_id to bank_transactions if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_transactions' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.bank_transactions
    ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Add missing columns to captured_documents
DO $$
BEGIN
  -- Line items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captured_documents' AND column_name = 'line_items'
  ) THEN
    ALTER TABLE public.captured_documents
    ADD COLUMN line_items JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Invoice type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captured_documents' AND column_name = 'invoice_type'
  ) THEN
    ALTER TABLE public.captured_documents
    ADD COLUMN invoice_type VARCHAR(20) DEFAULT 'purchase';
  END IF;

  -- SEPA fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captured_documents' AND column_name = 'supplier_iban'
  ) THEN
    ALTER TABLE public.captured_documents
    ADD COLUMN supplier_iban TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captured_documents' AND column_name = 'supplier_bic'
  ) THEN
    ALTER TABLE public.captured_documents
    ADD COLUMN supplier_bic TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captured_documents' AND column_name = 'supplier_bank_name'
  ) THEN
    ALTER TABLE public.captured_documents
    ADD COLUMN supplier_bank_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captured_documents' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.captured_documents
    ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captured_documents' AND column_name = 'payment_due_date'
  ) THEN
    ALTER TABLE public.captured_documents
    ADD COLUMN payment_due_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captured_documents' AND column_name = 'sepa_generated'
  ) THEN
    ALTER TABLE public.captured_documents
    ADD COLUMN sepa_generated BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captured_documents' AND column_name = 'sepa_file_url'
  ) THEN
    ALTER TABLE public.captured_documents
    ADD COLUMN sepa_file_url TEXT;
  END IF;
END $$;

-- 4. Ensure merchant_connections table exists with correct structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'merchant_connections') THEN
    CREATE TABLE public.merchant_connections (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      provider_account_id TEXT,
      credentials_encrypted TEXT NOT NULL,
      credentials_key_id TEXT,
      status VARCHAR(20) DEFAULT 'active',
      last_sync_at TIMESTAMPTZ,
      sync_error TEXT,
      auto_import BOOLEAN DEFAULT false,
      import_settings JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, provider, provider_account_id)
    );

    ALTER TABLE public.merchant_connections ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "merchant_connections_select" ON public.merchant_connections
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "merchant_connections_insert" ON public.merchant_connections
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "merchant_connections_update" ON public.merchant_connections
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "merchant_connections_delete" ON public.merchant_connections
      FOR DELETE USING (auth.uid() = user_id);

    CREATE INDEX idx_merchant_conn_user ON public.merchant_connections(user_id, status);
  END IF;
END $$;

-- 5. Ensure workspace_members has role and status columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.workspace_members
    ADD COLUMN role VARCHAR(20) DEFAULT 'viewer';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_members' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.workspace_members
    ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
  END IF;
END $$;

-- 6. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_captured_docs_workspace ON public.captured_documents(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_captured_docs_invoice_type ON public.captured_documents(user_id, invoice_type);
CREATE INDEX IF NOT EXISTS idx_captured_docs_payment_status ON public.captured_documents(payment_status);
CREATE INDEX IF NOT EXISTS idx_bank_trans_workspace ON public.bank_transactions(workspace_id, status);

-- 7. Clean up any duplicate or conflicting CHECK constraints
DO $$
BEGIN
  -- Drop invoice_type check constraint if it causes issues
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'captured_documents_invoice_type_check'
  ) THEN
    ALTER TABLE public.captured_documents
    DROP CONSTRAINT IF EXISTS captured_documents_invoice_type_check;
  END IF;

  -- Recreate with proper values
  ALTER TABLE public.captured_documents
  ADD CONSTRAINT captured_documents_invoice_type_check
  CHECK (invoice_type IN ('purchase', 'sales', 'expense', 'receipt'));
EXCEPTION WHEN OTHERS THEN
  -- Constraint might already exist or table structure different
  NULL;
END $$;

-- 8. Ensure proper RLS policies for captured_documents
DROP POLICY IF EXISTS "captured_documents_select" ON public.captured_documents;
DROP POLICY IF EXISTS "captured_documents_insert" ON public.captured_documents;
DROP POLICY IF EXISTS "captured_documents_update" ON public.captured_documents;
DROP POLICY IF EXISTS "captured_documents_delete" ON public.captured_documents;

CREATE POLICY "captured_documents_select" ON public.captured_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "captured_documents_insert" ON public.captured_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "captured_documents_update" ON public.captured_documents
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "captured_documents_delete" ON public.captured_documents
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Ensure bank_transactions has proper RLS policies
DROP POLICY IF EXISTS "Users can manage their own bank transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_select" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_insert" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_update" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_delete" ON public.bank_transactions;

CREATE POLICY "bank_transactions_select" ON public.bank_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bank_transactions_insert" ON public.bank_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bank_transactions_update" ON public.bank_transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bank_transactions_delete" ON public.bank_transactions
  FOR DELETE USING (auth.uid() = user_id);
