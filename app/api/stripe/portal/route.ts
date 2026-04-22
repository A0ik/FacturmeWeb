import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any)); },
        },
      }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id, subscription_id, subscription_tier').eq('id', user.id).single();

    // Vérifier si l'utilisateur a un abonnement actif
    if (!profile?.subscription_id || !profile?.stripe_customer_id) {
      return NextResponse.json({ error: "Aucun abonnement actif trouvé. Veuillez vous abonner d'abord." }, { status: 400 });
    }

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
      });

      return NextResponse.json({ url: portalSession.url });
    } catch (stripeError: any) {
      // Gérer les erreurs Stripe spécifiques
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json({ error: 'Client introuvable. Veuillez contacter le support.' }, { status: 400 });
      }
      throw stripeError;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
