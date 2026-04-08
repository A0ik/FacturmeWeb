import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// POST — Frontend calls this to get the Stripe OAuth authorize URL
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

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
      scope: 'read_write',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect`,
      state: session.user.id,
    });

    return NextResponse.json({ url: `https://connect.stripe.com/oauth/authorize?${params}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET — Stripe redirects here after OAuth (callback)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId
  const error = searchParams.get('error');

  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/settings?stripe=error', req.url));
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const response = await stripe.oauth.token({ grant_type: 'authorization_code', code });
    const supabase = createAdminClient();
    await supabase.from('profiles')
      .update({ stripe_connect_id: response.stripe_user_id })
      .eq('id', state);
    return NextResponse.redirect(new URL('/settings?stripe=connected', req.url));
  } catch (err: any) {
    return NextResponse.redirect(new URL('/settings?stripe=error', req.url));
  }
}

// DELETE — Disconnect the Stripe Connect account
export async function DELETE(req: NextRequest) {
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
      .select('stripe_connect_id')
      .eq('id', session.user.id)
      .single();

    if (profile?.stripe_connect_id) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        await stripe.oauth.deauthorize({
          client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
          stripe_user_id: profile.stripe_connect_id,
        });
      } catch { /* ignore deauth errors — still remove from profile */ }
    }

    await supabase.from('profiles')
      .update({ stripe_connect_id: null })
      .eq('id', session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
