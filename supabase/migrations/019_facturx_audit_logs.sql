-- Table pour les logs d'audit Factur-X et PDP
-- Améliore la sécurité et la traçabilité des opérations

CREATE TABLE IF NOT EXISTS facturx_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('generate', 'download', 'send_email', 'validate_pdp', 'pdp_transmit')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'error')),
  recipient_email TEXT,
  email_id TEXT,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches courantes
CREATE INDEX IF NOT EXISTS idx_facturx_audit_logs_invoice_id ON facturx_audit_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_facturx_audit_logs_user_id ON facturx_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_facturx_audit_logs_created_at ON facturx_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facturx_audit_logs_action ON facturx_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_facturx_audit_logs_status ON facturx_audit_logs(status);

-- Table pour les transmissions PDP (futur)
CREATE TABLE IF NOT EXISTS pdp_transmissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'transmitted', 'acknowledged', 'failed')),
  compliance_level TEXT CHECK (compliance_level IN ('full', 'partial', 'none')),
  validation_details JSONB DEFAULT '{}',
  pdp_platform_id TEXT,
  pdp_transmission_id TEXT,
  transmitted_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les transmissions PDP
CREATE INDEX IF NOT EXISTS idx_pdp_transmissions_invoice_id ON pdp_transmissions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pdp_transmissions_user_id ON pdp_transmissions(user_id);
CREATE INDEX IF NOT EXISTS idx_pdp_transmissions_status ON pdp_transmissions(status);
CREATE INDEX IF NOT EXISTS idx_pdp_transmissions_created_at ON pdp_transmissions(created_at DESC);

-- Politique RLS pour facturx_audit_logs
ALTER TABLE facturx_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON facturx_audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
  ON facturx_audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique RLS pour pdp_transmissions
ALTER TABLE pdp_transmissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own PDP transmissions"
  ON pdp_transmissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PDP transmissions"
  ON pdp_transmissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDP transmissions"
  ON pdp_transmissions FOR UPDATE
  USING (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_pdp_transmissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pdp_transmissions_updated_at
  BEFORE UPDATE ON pdp_transmissions
  FOR EACH ROW
  EXECUTE FUNCTION update_pdp_transmissions_updated_at();
