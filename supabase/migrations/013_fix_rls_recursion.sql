-- ────────────────────────────────────────────────────────────────────────────────
-- 013  Fix RLS Recursion Issue
-- ────────────────────────────────────────────────────────────────────────────────

-- Drop all existing captured_documents policies first
DROP POLICY IF EXISTS "captured_documents_select" ON public.captured_documents;
DROP POLICY IF EXISTS "captured_documents_insert" ON public.captured_documents;
DROP POLICY IF EXISTS "captured_documents_update" ON public.captured_documents;
DROP POLICY IF EXISTS "captured_documents_delete" ON public.captured_documents;

-- Simplified policies for captured_documents (no workspace circular reference)
CREATE POLICY "captured_documents_select" ON public.captured_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "captured_documents_insert" ON public.captured_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "captured_documents_update" ON public.captured_documents
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "captured_documents_delete" ON public.captured_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Drop and recreate bank_transactions policies similarly
DROP POLICY IF EXISTS "Users can manage their own bank transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_select" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_insert" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_update" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_delete" ON public.bank_transactions;

CREATE POLICY "bank_transactions_select" ON public.bank_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bank_transactions_insert" ON public.bank_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bank_transactions_update" ON public.bank_transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bank_transactions_delete" ON public.bank_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create a separate function to check workspace membership (avoids recursion)
CREATE OR REPLACE FUNCTION public.user_is_workspace_member(workspace_id uuid, user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = $1
    AND workspace_members.user_id = $2
    AND workspace_members.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Create a view for workspace documents (for workspace members access)
-- Note: Views with auth.uid() require SECURITY INVOKER or proper function handling
-- For now, we'll use a simpler approach with RLS on the main table

CREATE OR REPLACE FUNCTION public.get_workspace_documents()
RETURNS SETOF public.captured_documents AS $$
BEGIN
  RETURN QUERY
  SELECT cd.*
  FROM public.captured_documents cd
  WHERE cd.user_id = auth.uid()
     OR EXISTS (
       SELECT 1 FROM public.workspace_members wm
       WHERE wm.workspace_id = cd.workspace_id
       AND wm.user_id = auth.uid()
       AND wm.status = 'active'
     );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In a real production setup, you would:
-- 1. Use Row Level Security on the view
-- 2. Create more granular policies based on workspace roles
-- 3. Consider using security invoker functions for complex checks
