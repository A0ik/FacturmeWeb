-- ────────────────────────────────────────────────────────────────────────────────
-- 006  Appointments (rendez-vous)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id     uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  location      text,
  appointment_date  date NOT NULL,
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  color         text DEFAULT 'blue',
  google_event_id text,
  created_at    timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_owner_select"   ON public.appointments FOR SELECT   USING (auth.uid() = user_id);
CREATE POLICY "appointments_owner_insert"   ON public.appointments FOR INSERT   WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appointments_owner_update"   ON public.appointments FOR UPDATE   USING (auth.uid() = user_id);
CREATE POLICY "appointments_owner_delete"   ON public.appointments FOR DELETE   USING (auth.uid() = user_id);

-- Index for fast month-range queries
CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON public.appointments(user_id, appointment_date);
