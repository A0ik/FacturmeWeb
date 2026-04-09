import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Resolve the token
    const { data: portalToken, error: tokenError } = await supabase
      .from('client_portal_tokens')
      .select('*, client:clients(*)')
      .eq('token', token)
      .single();

    if (tokenError || !portalToken) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    // Profile of the freelancer
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', portalToken.user_id)
      .single();

    // All non-draft invoices for this client
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*)')
      .eq('client_id', portalToken.client_id)
      .eq('user_id', portalToken.user_id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      client: portalToken.client,
      profile,
      invoices: invoices || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
