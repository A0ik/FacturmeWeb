-- ============================================================
-- MIGRATION 002 — client_notes
-- Timeline de notes internes associées à un client.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.client_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour accélérer les requêtes par client
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id
  ON public.client_notes(client_id);

CREATE INDEX IF NOT EXISTS idx_client_notes_user_id
  ON public.client_notes(user_id);

-- RLS
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON public.client_notes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "owner_insert" ON public.client_notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_delete" ON public.client_notes
  FOR DELETE USING (user_id = auth.uid());
