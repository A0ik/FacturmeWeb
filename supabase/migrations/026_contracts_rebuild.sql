-- Migration: Contracts Rebuild
-- Ajoute contract_number, colonnes manquantes, table signatures

-- Ajouter contract_number aux 3 tables
ALTER TABLE public.contracts_cdi ADD COLUMN IF NOT EXISTS contract_number TEXT;
ALTER TABLE public.contracts_cdd ADD COLUMN IF NOT EXISTS contract_number TEXT;
ALTER TABLE public.contracts_other ADD COLUMN IF NOT EXISTS contract_number TEXT;

-- Ajouter colonnes manquantes CDI
ALTER TABLE public.contracts_cdi ADD COLUMN IF NOT EXISTS non_compete_duration TEXT;
ALTER TABLE public.contracts_cdi ADD COLUMN IF NOT EXISTS non_compete_compensation TEXT;
ALTER TABLE public.contracts_cdi ADD COLUMN IF NOT EXISTS non_compete_area TEXT;
ALTER TABLE public.contracts_cdi ADD COLUMN IF NOT EXISTS mobility_area TEXT;

-- Ajouter clauses manquantes CDD
ALTER TABLE public.contracts_cdd ADD COLUMN IF NOT EXISTS probation_clause BOOLEAN DEFAULT FALSE;
ALTER TABLE public.contracts_cdd ADD COLUMN IF NOT EXISTS non_compete_clause BOOLEAN DEFAULT FALSE;
ALTER TABLE public.contracts_cdd ADD COLUMN IF NOT EXISTS mobility_clause BOOLEAN DEFAULT FALSE;
ALTER TABLE public.contracts_cdd ADD COLUMN IF NOT EXISTS collective_agreement TEXT;

-- Ajouter colonnes manquantes profiles pour compteur contrats
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contract_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_contract_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contract_month TEXT;

-- Créer table contract_signatures
CREATE TABLE IF NOT EXISTS public.contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('cdi', 'cdd', 'other')),
  party TEXT NOT NULL CHECK (party IN ('employer', 'employee')),
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  signed_by_name TEXT,
  signer_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS contract_signatures_contract_id_idx ON public.contract_signatures(contract_id);

-- RLS pour contract_signatures
CREATE POLICY "Users can view own contract signatures" ON public.contract_signatures
  FOR SELECT USING (
    contract_id IN (
      SELECT id FROM public.contracts_cdi WHERE user_id = auth.uid()
      UNION ALL
      SELECT id FROM public.contracts_cdd WHERE user_id = auth.uid()
      UNION ALL
      SELECT id FROM public.contracts_other WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own contract signatures" ON public.contract_signatures
  FOR INSERT WITH CHECK (
    contract_id IN (
      SELECT id FROM public.contracts_cdi WHERE user_id = auth.uid()
      UNION ALL
      SELECT id FROM public.contracts_cdd WHERE user_id = auth.uid()
      UNION ALL
      SELECT id FROM public.contracts_other WHERE user_id = auth.uid()
    )
  );
