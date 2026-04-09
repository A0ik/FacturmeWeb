import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { clientId, iban, clientName, clientEmail, invoiceId, amount, description, stripeConnectId } = await req.json();

    const stripe = getStripe();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get or create Stripe customer
    let stripeCustomerId: string;
    const { data: client } = await supabase
      .from('clients')
      .select('stripe_customer_id')
      .eq('id', clientId)
      .single();

    if (client?.stripe_customer_id) {
      stripeCustomerId = client.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        name: clientName,
        email: clientEmail,
        metadata: { client_id: clientId },
      });
      stripeCustomerId = customer.id;
      await supabase
        .from('clients')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', clientId);
    }

    // Create SEPA PaymentMethod
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'sepa_debit',
      sepa_debit: { iban },
      billing_details: {
        name: clientName,
        email: clientEmail,
      },
    });

    // Attach to customer
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: stripeCustomerId });

    // Create and confirm PaymentIntent
    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100),
      currency: 'eur',
      customer: stripeCustomerId,
      payment_method: paymentMethod.id,
      payment_method_types: ['sepa_debit'],
      confirm: true,
      mandate_data: {
        customer_acceptance: {
          type: 'online',
          online: {
            ip_address: req.headers.get('x-forwarded-for') || '0.0.0.0',
            user_agent: req.headers.get('user-agent') || 'unknown',
          },
        },
      },
      description: description || `Paiement facture`,
      metadata: { invoice_id: invoiceId },
    };

    if (stripeConnectId) {
      piParams.transfer_data = { destination: stripeConnectId };
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams);

    // Save mandate info on client
    const ibanLast4 = iban.replace(/\s/g, '').slice(-4);
    await supabase.from('clients').update({
      stripe_sepa_mandate_id: paymentIntent.id,
      sepa_iban_last4: ibanLast4,
    }).eq('id', clientId);

    // Update invoice
    if (paymentIntent.status === 'processing' || paymentIntent.status === 'succeeded') {
      await supabase.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: 'sepa',
        updated_at: new Date().toISOString(),
      }).eq('id', invoiceId);
    }

    return NextResponse.json({
      success: true,
      status: paymentIntent.status,
      ibanLast4,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
