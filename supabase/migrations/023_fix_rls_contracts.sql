-- Correction des politiques RLS pour les contrats
-- Remplacer auth.uid() par auth.id() qui est la bonne fonction dans Supabase

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

-- Recréer les politiques avec auth.id() au lieu de auth.uid()

-- contracts_cdi
CREATE POLICY "contracts_cdi_select" ON public.contracts_cdi
  FOR SELECT USING (auth.id() = user_id);

CREATE POLICY "contracts_cdi_insert" ON public.contracts_cdi
  FOR INSERT WITH CHECK (auth.id() = user_id);

CREATE POLICY "contracts_cdi_update" ON public.contracts_cdi
  FOR UPDATE USING (auth.id() = user_id) WITH CHECK (auth.id() = user_id);

CREATE POLICY "contracts_cdi_delete" ON public.contracts_cdi
  FOR DELETE USING (auth.id() = user_id);

-- contracts_cdd
CREATE POLICY "contracts_cdd_select" ON public.contracts_cdd
  FOR SELECT USING (auth.id() = user_id);

CREATE POLICY "contracts_cdd_insert" ON public.contracts_cdd
  FOR INSERT WITH CHECK (auth.id() = user_id);

CREATE POLICY "contracts_cdd_update" ON public.contracts_cdd
  FOR UPDATE USING (auth.id() = user_id) WITH CHECK (auth.id() = user_id);

CREATE POLICY "contracts_cdd_delete" ON public.contracts_cdd
  FOR DELETE USING (auth.id() = user_id);

-- contracts_other
CREATE POLICY "contracts_other_select" ON public.contracts_other
  FOR SELECT USING (auth.id() = user_id);

CREATE POLICY "contracts_other_insert" ON public.contracts_other
  FOR INSERT WITH CHECK (auth.id() = user_id);

CREATE POLICY "contracts_other_update" ON public.contracts_other
  FOR UPDATE USING (auth.id() = user_id) WITH CHECK (auth.id() = user_id);

CREATE POLICY "contracts_other_delete" ON public.contracts_other
  FOR DELETE USING (auth.id() = user_id);
