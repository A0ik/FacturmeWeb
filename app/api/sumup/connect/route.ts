import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { disconnectSumUp } from '@/lib/sumup/oauth';

// GET — Check SumUp OAuth connection status
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any));
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('sumup_merchant_code, sumup_email, sumup_token_expires_at')
      .eq('id', user.id)
      .single();

    const hasValidToken = profile?.sumup_token_expires_at
      ? new Date(profile.sumup_token_expires_at) > new Date()
      : false;

    return NextResponse.json({
      connected: !!(profile?.sumup_merchant_code && hasValidToken),
      merchantCode: profile?.sumup_merchant_code || null,
      sumupEmail: profile?.sumup_email || null,
      emailMissing: !!(profile?.sumup_merchant_code && !profile?.sumup_email),
      tokenExpiresAt: profile?.sumup_token_expires_at || null,
    });
  } catch (error: any) {
    console.error('[sumup-connect] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Disconnect SumUp OAuth
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any));
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const success = await disconnectSumUp(user.id);

    if (!success) {
      return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[sumup-connect] Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
