-- ────────────────────────────────────────────────────────────────────────────────
-- 015  COMPLETE WORKSPACE ISOLATION FOR MULTI-COMPANY SUPPORT
-- ────────────────────────────────────────────────────────────────────────────────
-- This migration ensures:
-- 1. Proper RLS policies for workspace-based data isolation
-- 2. Pro users can access multiple workspaces
-- 3. Standard users are restricted to their single workspace
-- 4. All cross-workspace access is blocked at database level

-- 1. Create a function to check workspace access
CREATE OR REPLACE FUNCTION can_access_workspace(workspace_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- User is the owner of the workspace
  IF EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_uuid AND owner_id = auth.uid()) THEN
    RETURN true;
  END IF;

  -- User is a member of the workspace
  IF EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = workspace_uuid AND user_id = auth.uid() AND status = 'active') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to get user's accessible workspace IDs
CREATE OR REPLACE FUNCTION get_user_workspace_ids()
RETURNS TABLE(workspace_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT w.id
  FROM public.workspaces w
  WHERE w.owner_id = auth.uid()
  UNION
  SELECT DISTINCT wm.workspace_id
  FROM public.workspace_members wm
  WHERE wm.user_id = auth.uid() AND wm.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to enforce Pro tier workspace limit
-- Returns true if user is Pro OR user has fewer than 2 workspaces
CREATE OR REPLACE FUNCTION can_create_workspace()
RETURNS boolean AS $$
DECLARE
  user_tier text;
  workspace_count int;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO user_tier
  FROM public.profiles
  WHERE id = auth.uid();

  -- Pro users can create unlimited workspaces
  IF user_tier = 'pro' THEN
    RETURN true;
  END IF;

  -- Count existing workspaces (owned only)
  SELECT COUNT(*) INTO workspace_count
  FROM public.workspaces
  WHERE owner_id = auth.uid();

  -- Standard users can only have 1 workspace
  RETURN workspace_count < 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update workspaces policies to enforce tier limits
DROP POLICY IF EXISTS "workspaces_owner" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON public.workspaces;

-- Users can view their own workspaces and workspaces they're members of
CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active')
  );

-- Users can insert new workspaces only if they haven't exceeded their tier limit
CREATE POLICY "workspaces_insert" ON public.workspaces
  FOR INSERT WITH CHECK (
    owner_id = auth.uid() AND
    can_create_workspace()
  );

-- Only workspace owners can update their own workspaces
CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Only workspace owners can delete their own workspaces
CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- 5. Update captured_documents RLS with workspace isolation
DROP POLICY IF EXISTS "captured_documents_select" ON public.captured_documents;
DROP POLICY IF EXISTS "captured_documents_insert" ON public.captured_documents;
DROP POLICY IF EXISTS "captured_documents_update" ON public.captured_documents;
DROP POLICY IF EXISTS "captured_documents_delete" ON public.captured_documents;

-- Users can only see documents from their accessible workspaces
CREATE POLICY "captured_documents_select" ON public.captured_documents
  FOR SELECT USING (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  );

-- Users can only insert documents with their accessible workspace_id
CREATE POLICY "captured_documents_insert" ON public.captured_documents
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  );

-- Users can only update their own documents from accessible workspaces
CREATE POLICY "captured_documents_update" ON public.captured_documents
  FOR UPDATE USING (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  ) WITH CHECK (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  );

-- Users can only delete their own documents from accessible workspaces
CREATE POLICY "captured_documents_delete" ON public.captured_documents
  FOR DELETE USING (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  );

-- 6. Update bank_transactions RLS with workspace isolation
DROP POLICY IF EXISTS "bank_transactions_select" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_insert" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_update" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_delete" ON public.bank_transactions;

CREATE POLICY "bank_transactions_select" ON public.bank_transactions
  FOR SELECT USING (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  );

CREATE POLICY "bank_transactions_insert" ON public.bank_transactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  );

CREATE POLICY "bank_transactions_update" ON public.bank_transactions
  FOR UPDATE USING (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  ) WITH CHECK (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  );

CREATE POLICY "bank_transactions_delete" ON public.bank_transactions
  FOR DELETE USING (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  );

-- 7. Update merchant_connections RLS with workspace isolation
DROP POLICY IF EXISTS "merchant_connections_select" ON public.merchant_connections;
DROP POLICY IF EXISTS "merchant_connections_insert" ON public.merchant_connections;
DROP POLICY IF EXISTS "merchant_connections_update" ON public.merchant_connections;
DROP POLICY IF EXISTS "merchant_connections_delete" ON public.merchant_connections;

CREATE POLICY "merchant_connections_select" ON public.merchant_connections
  FOR SELECT USING (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  );

CREATE POLICY "merchant_connections_insert" ON public.merchant_connections
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      workspace_id IS NULL OR
      can_access_workspace(workspace_id)
    )
  );

CREATE POLICY "merchant_connections_update" ON public.merchant_connections
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (user_id = auth.uid());

CREATE POLICY "merchant_connections_delete" ON public.merchant_connections
  FOR DELETE USING (user_id = auth.uid());

-- 8. Update workspace_members RLS - only owners can manage members
DROP POLICY IF EXISTS "workspace_members_access" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON public.workspace_members;

-- Members can see other members in their workspaces
CREATE POLICY "workspace_members_select" ON public.workspace_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'active')
  );

-- Only workspace owners can insert members
CREATE POLICY "workspace_members_insert" ON public.workspace_members
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- Only workspace owners can update member roles
CREATE POLICY "workspace_members_update" ON public.workspace_members
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  ) WITH CHECK (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- Only workspace owners can delete members (or users can remove themselves)
CREATE POLICY "workspace_members_delete" ON public.workspace_members
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
    user_id = auth.uid()
  );

-- 9. Update workspace_invitations RLS
DROP POLICY IF EXISTS "workspace_invitations_select" ON public.workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_insert" ON public.workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_delete" ON public.workspace_invitations;

CREATE POLICY "workspace_invitations_select" ON public.workspace_invitations
  FOR SELECT USING (
    email IN (
      SELECT email FROM public.profiles WHERE id = auth.uid()
      UNION
      SELECT email FROM public.workspace_members WHERE user_id = auth.uid()
    ) OR
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "workspace_invitations_insert" ON public.workspace_invitations
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "workspace_invitations_delete" ON public.workspace_invitations
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- 10. Add grant execute on security functions
GRANT EXECUTE ON FUNCTION can_access_workspace TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_workspace_ids TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_workspace TO authenticated;
