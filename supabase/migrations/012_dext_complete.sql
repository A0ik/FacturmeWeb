-- ────────────────────────────────────────────────────────────────────────────────
-- 012  DEXT COMPLETE IMPLEMENTATION
-- ────────────────────────────────────────────────────────────────────────────────

-- 1. Multi-Workspace Support
ALTER TABLE captured_documents
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Update RLS policies to include workspace_id checks
DROP POLICY IF EXISTS "captured_documents_select" ON public.captured_documents;
CREATE POLICY "captured_documents_select" ON public.captured_documents
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.user_id = auth.uid()
      AND workspace_members.workspace_id = captured_documents.workspace_id
    )
  );

DROP POLICY IF EXISTS "captured_documents_update" ON public.captured_documents;
CREATE POLICY "captured_documents_update" ON public.captured_documents
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.user_id = auth.uid()
      AND workspace_members.workspace_id = captured_documents.workspace_id
      AND workspace_members.role IN ('admin', 'editor')
    )
  ) WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.user_id = auth.uid()
      AND workspace_members.workspace_id = captured_documents.workspace_id
      AND workspace_members.role IN ('admin', 'editor')
    )
  );

-- 2. Line-by-Line Extraction
ALTER TABLE captured_documents
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb;

-- Line items structure:
-- [
--   {
--     "description": string,
--     "quantity": number,
--     "unit_price": number,
--     "vat_rate": number,
--     "vat_amount": number,
--     "total": number
--   }
-- ]

-- 3. Purchases vs Sales Categorization
ALTER TABLE captured_documents
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(20) DEFAULT 'purchase'
CHECK (invoice_type IN ('purchase', 'sales', 'expense', 'receipt'));

-- 4. Supplier Payment Details (SEPA)
ALTER TABLE captured_documents
ADD COLUMN IF NOT EXISTS supplier_iban TEXT,
ADD COLUMN IF NOT EXISTS supplier_bic TEXT,
ADD COLUMN IF NOT EXISTS supplier_bank_name TEXT,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid'
CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'cancelled')),
ADD COLUMN IF NOT EXISTS payment_due_date DATE,
ADD COLUMN IF NOT EXISTS sepa_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sepa_file_url TEXT;

-- 5. Merchant Connections
CREATE TABLE IF NOT EXISTS merchant_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- amazon, orange, uber, apple, etc.
  provider_account_id TEXT, -- External account ID from the merchant
  credentials_encrypted TEXT NOT NULL, -- Encrypted credentials
  credentials_key_id TEXT, -- Key ID for encryption (KMS reference)
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'error', 'revoked')),
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  auto_import BOOLEAN DEFAULT false,
  import_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider, provider_account_id)
);

ALTER TABLE merchant_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_connections_select" ON merchant_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "merchant_connections_insert" ON merchant_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "merchant_connections_update" ON merchant_connections
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "merchant_connections_delete" ON merchant_connections
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_captured_docs_workspace ON captured_documents(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_captured_docs_invoice_type ON captured_documents(user_id, invoice_type);
CREATE INDEX IF NOT EXISTS idx_captured_docs_payment_status ON captured_documents(payment_status);
CREATE INDEX IF NOT EXISTS idx_bank_trans_workspace ON bank_transactions(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_merchant_conn_user ON merchant_connections(user_id, status);

-- 7. Update workspace_members to include role column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE workspace_members ADD COLUMN role VARCHAR(20) DEFAULT 'viewer';
    ALTER TABLE workspace_members ADD CONSTRAINT check_role CHECK (role IN ('admin', 'editor', 'viewer'));
  END IF;
END $$;

-- 8. Update workspace_members to include status column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_members' AND column_name = 'status'
  ) THEN
    ALTER TABLE workspace_members ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    ALTER TABLE workspace_members ADD CONSTRAINT check_status CHECK (status IN ('pending', 'active', 'declined', 'removed'));
  END IF;
END $$;

-- 9. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to merchant_connections
DROP TRIGGER IF EXISTS update_merchant_connections_updated_at ON merchant_connections;
CREATE TRIGGER update_merchant_connections_updated_at
  BEFORE UPDATE ON merchant_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
