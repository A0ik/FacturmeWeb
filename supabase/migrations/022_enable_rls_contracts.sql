-- Migration: activer RLS sur les tables de contrats (CDI, CDD, Autres)
-- Ces tables manquaient de politiques RLS, exposant potentiellement
-- les données de contrats entre utilisateurs.

ALTER TABLE public.contracts_cdi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts_cdd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts_other ENABLE ROW LEVEL SECURITY;

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
