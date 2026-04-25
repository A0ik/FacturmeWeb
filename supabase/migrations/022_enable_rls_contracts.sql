-- Migration: activer RLS sur les tables de contrats (CDI, CDD, Autres)
-- Cette migration est idempotente - peut être réappliquée sans erreur

-- Supprimer les politiques existantes si elles existent (pour recréation propre)
DROP POLICY IF EXISTS "contracts_cdi_select" ON public.contracts_cdi;
DROP POLICY IF EXISTS "contracts_cdi_insert" ON public.contracts_cdi;
DROP POLICY IF EXISTS "contracts_cdi_update" ON public.contracts_cdi;
DROP POLICY IF EXISTS "contracts_cdi_delete" ON public.contracts_cdi;

DROP POLICY IF EXISTS "contracts_cdd_select" ON public.contracts_cdd;
DROP POLICY IF EXISTS "contracts_cdd_insert" ON public.contracts_cdd;
DROP POLICY IF EXISTS "contracts_cdd_update" ON public.contracts_cdd;
DROP POLICY IF EXISTS "contracts_cdd_delete" ON public.contracts_cdd;

DROP POLICY IF EXISTS "contracts_other_select" ON public.contracts_other;
DROP POLICY IF EXISTS "contracts_other_insert" ON public.contracts_other;
DROP POLICY IF EXISTS "contracts_other_update" ON public.contracts_other;
DROP POLICY IF EXISTS "contracts_other_delete" ON public.contracts_other;

-- Activer RLS (idempotent - ne pas échouer si déjà activé)
ALTER TABLE public.contracts_cdi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts_cdd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts_other ENABLE ROW LEVEL SECURITY;

-- contracts_cdi - Politiques RLS
CREATE POLICY "contracts_cdi_select" ON public.contracts_cdi
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contracts_cdi_insert" ON public.contracts_cdi
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_cdi_update" ON public.contracts_cdi
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_cdi_delete" ON public.contracts_cdi
  FOR DELETE USING (auth.uid() = user_id);

-- contracts_cdd - Politiques RLS
CREATE POLICY "contracts_cdd_select" ON public.contracts_cdd
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contracts_cdd_insert" ON public.contracts_cdd
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_cdd_update" ON public.contracts_cdd
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_cdd_delete" ON public.contracts_cdd
  FOR DELETE USING (auth.uid() = user_id);

-- contracts_other - Politiques RLS
CREATE POLICY "contracts_other_select" ON public.contracts_other
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contracts_other_insert" ON public.contracts_other
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_other_update" ON public.contracts_other
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_other_delete" ON public.contracts_other
  FOR DELETE USING (auth.uid() = user_id);
