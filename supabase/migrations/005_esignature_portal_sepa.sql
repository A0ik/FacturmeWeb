-- ── E-Signature fields on invoices ───────────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS client_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_ip TEXT,
  ADD COLUMN IF NOT EXISTS signed_by TEXT;

-- ── Client portal tokens ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_portal_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_tokens_token     ON client_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_client_id ON client_portal_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_user_id   ON client_portal_tokens(user_id);

ALTER TABLE client_portal_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_owner"       ON client_portal_tokens FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "portal_public_read" ON client_portal_tokens FOR SELECT USING (true);

-- ── SEPA / Stripe customer on clients ─────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS stripe_customer_id       TEXT,
  ADD COLUMN IF NOT EXISTS stripe_sepa_mandate_id   TEXT,
  ADD COLUMN IF NOT EXISTS sepa_iban_last4          TEXT;
