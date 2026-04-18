import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';

// Tu gardes ta super structure de prix !
const PRICE_IDS: Record<string, Record<string, string>> = {
  solo: {
    monthly: process.env.STRIPE_SOLO_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_SOLO_YEARLY_PRICE_ID!,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID!,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, yearly = false } = await req.json(); // On met false par défaut
    const interval = yearly ? 'yearly' : 'monthly';
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    if (!PRICE_IDS[plan]) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    const priceId = PRICE_IDS[plan][interval];
    if (!priceId) return NextResponse.json({ error: `Missing ${interval} price for ${plan}` }, { status: 400 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    // 1. Créer ou récupérer le client Stripe
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: profile?.email, metadata: { userId } });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // 2. LA NOUVELLE MÉTHODE (Payment Element) au lieu de Checkout Session
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete', // Garde la souscription en attente de paiement
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'], // Indispensable pour obtenir le client_secret
    });

    // 3. Extraire le secret pour l'afficher dans le formulaire de carte
    // @ts-ignore
    const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

    // ON RENVOIE LE CLIENT SECRET AU LIEU DE L'URL
    return NextResponse.json({ clientSecret, subscriptionId: subscription.id });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}