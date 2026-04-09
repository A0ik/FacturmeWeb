import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const userId = session.user.id;
    const admin = createAdminClient();

    // Delete user data from all tables (order matters for FK constraints)
    const tables = [
      'partial_payments',
      'crm_tasks',
      'client_notes',
      'webhook_endpoints',
      'client_portal_tokens',
      'appointments',
      'notifications',
      'expenses',
      'products',
      'opportunities',
      'recurring_invoices',
      'invoices',
      'clients',
      'workspace_members',
      'workspace_invitations',
      'workspaces',
      'profiles',
    ];

    for (const table of tables) {
      try {
        // Most tables use user_id, workspaces use owner_id
        if (table === 'workspaces') {
          // First get workspace ids owned by user
          const { data: ws } = await admin.from('workspaces').select('id').eq('owner_id', userId);
          if (ws && ws.length > 0) {
            const wsIds = ws.map((w) => w.id);
            await admin.from('workspace_members').delete().in('workspace_id', wsIds);
            await admin.from('workspace_invitations').delete().in('workspace_id', wsIds);
            await admin.from('workspaces').delete().eq('owner_id', userId);
          }
        } else {
          await admin.from(table).delete().eq('user_id', userId);
        }
      } catch {
        // Table may not exist or may have already been cleaned — continue
      }
    }

    // Delete profile explicitly (uses id not user_id)
    try { await admin.from('profiles').delete().eq('id', userId); } catch {}

    // Delete auth user
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[account/delete]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
