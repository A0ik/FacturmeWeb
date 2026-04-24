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
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json({ error: `Webhook error: ${e.message}` }, { status: 400 });
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

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        if (customerId) {
          // Récupérer le profil par stripe_customer_id pour logguer l'échec
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (profile) {
            // Insérer une notification d'échec de paiement
            await supabase.from('notifications').insert({
              user_id: profile.id,
              type: 'system',
              title: 'Échec de paiement',
              body: `Le renouvellement de votre abonnement a échoué. Mettez à jour votre moyen de paiement.`,
              link: '/settings',
              read: false,
            }).select();
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;

        if (paymentIntentId) {
          await supabase.from('invoices')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent_id', paymentIntentId);
        }
        break;
      }

      case 'customer.deleted': {
        const customer = event.data.object as Stripe.Customer;
        await supabase.from('profiles')
          .update({
            subscription_tier: 'free',
            stripe_customer_id: null,
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customer.id);
        break;
      }
    }
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[webhook]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
