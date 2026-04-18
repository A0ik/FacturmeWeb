import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// POST — Save SumUp API key and merchant code
export async function POST(req: NextRequest) {
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
    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { apiKey, merchantCode } = await req.json();
    if (!apiKey || !merchantCode) {
      return NextResponse.json({ error: 'Clé API et code marchand requis' }, { status: 400 });
    }

    // Validate API key by fetching merchant profile
    const res = await fetch(`https://api.sumup.com/v0.1/merchants/${merchantCode}/profile`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Clé API ou code marchand invalide' }, { status: 400 });
    }

    const supabase = createAdminClient();
    await supabase.from('profiles')
      .update({ sumup_api_key: apiKey, sumup_merchant_code: merchantCode })
      .eq('id', session.user.id);

    // Auto-register webhook for checkout status changes
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://facturme-psi.vercel.app';
      await fetch(`https://api.sumup.com/v0.1/merchants/${merchantCode}/webhooks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `${baseUrl}/api/sumup/webhook`,
          event_types: ['checkout.status.changed'],
        }),
      });
    } catch (webhookErr) {
      console.error('[sumup-connect] Webhook registration failed (non-blocking):', webhookErr);
      // Don't fail the connection if webhook registration fails
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET — Check SumUp connection status
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
    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles')
      .select('sumup_api_key, sumup_merchant_code')
      .eq('id', session.user.id)
      .single();

    return NextResponse.json({
      connected: !!(profile?.sumup_api_key && profile?.sumup_merchant_code),
      merchantCode: profile?.sumup_merchant_code || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Disconnect SumUp
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
    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const supabase = createAdminClient();
    await supabase.from('profiles')
      .update({ sumup_api_key: null, sumup_merchant_code: null })
      .eq('id', session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
