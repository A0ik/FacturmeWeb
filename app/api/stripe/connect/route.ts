import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const accountLink = await stripe.oauth.authorizeUrl({
      response_type: 'code',
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
      scope: 'read_write',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
      state: userId,
    });

    return NextResponse.json({ url: accountLink });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId

  if (!code || !state) return NextResponse.redirect(new URL('/settings?error=connect', req.url));

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const response = await stripe.oauth.token({ grant_type: 'authorization_code', code });
    const supabase = createAdminClient();
    await supabase.from('profiles').update({ stripe_connect_id: response.stripe_user_id }).eq('id', state);
    return NextResponse.redirect(new URL('/settings?connected=true', req.url));
  } catch (error: any) {
    return NextResponse.redirect(new URL(`/settings?error=${error.message}`, req.url));
  }
}
