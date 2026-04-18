-- ────────────────────────────────────────────────────────────────────────────────
-- 008  Captured documents (Dext-like expense capture)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.captured_documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id           uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  file_url            text NOT NULL,
  file_type           text DEFAULT 'image',
  status              text DEFAULT 'pending',
  ocr_data            jsonb,
  vendor              text,
  description         text,
  amount              numeric DEFAULT 0,
  vat_amount          numeric DEFAULT 0,
  vat_rate            numeric DEFAULT 20,
  document_date       date,
  due_date            date,
  category            text,
  payment_method      text,
  notes               text,
  supplier_reference  text,
  reviewed_at         timestamptz,
  published_at        timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE public.captured_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "captured_documents_select" ON public.captured_documents
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "captured_documents_insert" ON public.captured_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "captured_documents_update" ON public.captured_documents
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "captured_documents_delete" ON public.captured_documents
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS idx_captured_docs_user ON public.captured_documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_captured_docs_date ON public.captured_documents(user_id, document_date);
