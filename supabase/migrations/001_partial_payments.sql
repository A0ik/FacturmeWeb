-- ============================================================
-- MIGRATION 001 — partial_payments
-- Enregistre les paiements partiels sur une facture.
-- Quand la somme des paiements atteint le total, la facture
-- est marquée "paid" côté client (logique dans invoices/[id]).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.partial_payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount     NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  paid_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  method     TEXT,           -- ex: virement, chèque, carte, espèces
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour accélérer les requêtes par facture
CREATE INDEX IF NOT EXISTS idx_partial_payments_invoice_id
  ON public.partial_payments(invoice_id);

-- RLS
ALTER TABLE public.partial_payments ENABLE ROW LEVEL SECURITY;

-- Un utilisateur peut lire/modifier les paiements des factures qui lui appartiennent
CREATE POLICY "owner_select" ON public.partial_payments
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "owner_insert" ON public.partial_payments
  FOR INSERT WITH CHECK (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "owner_delete" ON public.partial_payments
  FOR DELETE USING (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE user_id = auth.uid()
    )
  );
