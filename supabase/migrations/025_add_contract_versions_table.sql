/**
 * Migration pour ajouter la table des versions de contrats
 */
-- Table pour stocker l'historique des versions de contrats
CREATE TABLE IF NOT EXISTS public.contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Référence au contrat
  contract_id UUID NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('cdi', 'cdd', 'other')),

  -- Numéro de version
  version_number INTEGER NOT NULL,

  -- Données du contrat (JSON)
  contract_data JSONB NOT NULL,

  -- Liste des modifications (JSON)
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Métadonnées
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment TEXT,
  is_current BOOLEAN DEFAULT true,

  -- Index
  CONSTRAINT contract_versions_contract_idx UNIQUE (contract_id, version_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS contract_versions_contract_id_idx ON public.contract_versions(contract_id);
CREATE INDEX IF NOT EXISTS contract_versions_created_by_idx ON public.contract_versions(created_by);
CREATE INDEX IF NOT EXISTS contract_versions_created_at_idx ON public.contract_versions(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;

-- Politique RLS : les utilisateurs voient uniquement leurs propres versions
CREATE POLICY "contract_versions_select" ON public.contract_versions
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "contract_versions_insert" ON public.contract_versions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "contract_versions_update" ON public.contract_versions
  FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "contract_versions_delete" ON public.contract_versions
  FOR DELETE USING (auth.uid() = created_by);

COMMENT ON TABLE public.contract_versions IS 'Historique des versions de contrats de travail';
COMMENT ON COLUMN public.contract_versions.contract_data IS 'Données complètes du contrat au format JSON';
COMMENT ON COLUMN public.contract_versions.changes IS 'Liste des modifications depuis la version précédente';
