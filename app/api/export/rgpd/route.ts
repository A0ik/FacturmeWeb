import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';

export async function GET(_req: NextRequest) {
  // Auth check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch all user data in parallel
  const [
    { data: profile },
    { data: clients },
    { data: invoices },
    { data: recurringInvoices },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).single(),
    admin.from('clients').select('*').eq('user_id', user.id),
    admin.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    admin.from('recurring_invoices').select('*').eq('user_id', user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
    },
    profile: profile ?? null,
    clients: clients ?? [],
    invoices: invoices ?? [],
    recurring_invoices: recurringInvoices ?? [],
  };

  const date = new Date().toISOString().slice(0, 10);
  const filename = `mes-donnees-${date}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
