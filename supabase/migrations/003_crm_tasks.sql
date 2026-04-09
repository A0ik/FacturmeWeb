-- ============================================================
-- MIGRATION 003 — crm_tasks
-- Tâches de suivi associées à une opportunité CRM.
-- Dépend de la table "opportunities" (déjà existante).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id   UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  done             BOOLEAN NOT NULL DEFAULT FALSE,
  due_date         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour accélérer les requêtes par opportunité
CREATE INDEX IF NOT EXISTS idx_crm_tasks_opportunity_id
  ON public.crm_tasks(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_user_id
  ON public.crm_tasks(user_id);

-- RLS
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON public.crm_tasks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "owner_insert" ON public.crm_tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_update" ON public.crm_tasks
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "owner_delete" ON public.crm_tasks
  FOR DELETE USING (user_id = auth.uid());
