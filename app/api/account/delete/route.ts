import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const userId = session.user.id;
    const admin = createAdminClient();

    // Delete user data
    await admin.from('invoices').delete().eq('user_id', userId);
    await admin.from('clients').delete().eq('user_id', userId);
    await admin.from('recurring_invoices').delete().eq('user_id', userId);
    await admin.from('opportunities').delete().eq('user_id', userId);
    await admin.from('profiles').delete().eq('id', userId);

    // Delete auth user
    await admin.auth.admin.deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
