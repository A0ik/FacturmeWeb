-- Migration CRITIQUE : Corriger les politiques RLS des contrats
-- Problème: Les migrations 022 et 023 utilisent auth.id() au lieu de auth.uid()
-- Solution: Remplacer toutes les politiques par auth.uid() comme les autres tables

-- Supprimer les anciennes politiques incorrectes
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

-- Recréer avec auth.uid() (LA BONNE FONCTION SUPABASE)

-- contracts_cdi
CREATE POLICY "contracts_cdi_select" ON public.contracts_cdi
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contracts_cdi_insert" ON public.contracts_cdi
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_cdi_update" ON public.contracts_cdi
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_cdi_delete" ON public.contracts_cdi
  FOR DELETE USING (auth.uid() = user_id);

-- contracts_cdd
CREATE POLICY "contracts_cdd_select" ON public.contracts_cdd
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contracts_cdd_insert" ON public.contracts_cdd
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_cdd_update" ON public.contracts_cdd
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_cdd_delete" ON public.contracts_cdd
  FOR DELETE USING (auth.uid() = user_id);

-- contracts_other
CREATE POLICY "contracts_other_select" ON public.contracts_other
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contracts_other_insert" ON public.contracts_other
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_other_update" ON public.contracts_other
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_other_delete" ON public.contracts_other
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON MIGRATION IS 'Correction critique: Remplacer auth.id() par auth.uid() dans les politiques RLS des contrats';
