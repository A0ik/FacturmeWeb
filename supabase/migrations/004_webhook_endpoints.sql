-- ============================================================
-- MIGRATION 004 — webhook_endpoints
-- URLs auxquelles l'app envoie des événements (invoice.paid, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  events     TEXT[] NOT NULL DEFAULT '{}',
  -- ex: ['invoice.paid', 'invoice.sent', 'invoice.created', 'invoice.overdue']
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user_id
  ON public.webhook_endpoints(user_id);

-- RLS
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON public.webhook_endpoints
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "owner_insert" ON public.webhook_endpoints
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_update" ON public.webhook_endpoints
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "owner_delete" ON public.webhook_endpoints
  FOR DELETE USING (user_id = auth.uid());

-- L'API interne (service role) peut lire tous les webhooks actifs
-- pour les déclencher (route /api/webhooks/trigger protégée par X-Internal-Secret)
-- Pas besoin de policy supplémentaire : le service role bypasse RLS.
