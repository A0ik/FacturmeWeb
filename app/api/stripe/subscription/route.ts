import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';

const PRICE_IDS: Record<string, Record<string, string>> = {
  solo: {
    monthly: process.env.STRIPE_SOLO_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_SOLO_YEARLY_PRICE_ID!,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, yearly } = await req.json();
    const interval = yearly ? 'yearly' : 'monthly';
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    if (!PRICE_IDS[plan]) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    const priceId = PRICE_IDS[plan][interval];
    if (!priceId) return NextResponse.json({ error: `Missing ${interval} price for ${plan}` }, { status: 400 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: profile?.email, metadata: { userId } });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?subscribed=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/paywall`,
      metadata: { userId, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
