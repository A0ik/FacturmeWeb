import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );
    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', session.user.id).single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'Aucun abonnement actif' }, { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
