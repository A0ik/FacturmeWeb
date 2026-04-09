import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Authenticate caller
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // Return existing token if present
    const { data: existing } = await supabase
      .from('client_portal_tokens')
      .select('token')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .single();

    if (existing) return NextResponse.json({ token: existing.token });

    // Create a new one
    const { data, error } = await supabase
      .from('client_portal_tokens')
      .insert({ client_id: clientId, user_id: user.id })
      .select('token')
      .single();

    if (error) throw error;
    return NextResponse.json({ token: data.token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
