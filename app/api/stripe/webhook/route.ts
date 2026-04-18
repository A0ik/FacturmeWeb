import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'payment' && session.metadata?.invoiceId) {
          await supabase.from('invoices')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', session.metadata.invoiceId);
        }

        if (session.mode === 'subscription' && session.metadata?.userId) {
          const plan = session.metadata.plan as string;
          await supabase.from('profiles').update({
            subscription_tier: plan,
            stripe_subscription_id: session.subscription as string,
          }).eq('id', session.metadata.userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase.from('profiles')
          .update({ subscription_tier: 'free', stripe_subscription_id: null })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const plan = sub.metadata?.plan || 'free';
        await supabase.from('profiles')
          .update({ subscription_tier: plan })
          .eq('stripe_subscription_id', sub.id);
        break;
      }
    }
  } catch (err: any) {
    console.error('[webhook]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
