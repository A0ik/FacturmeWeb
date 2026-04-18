import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, amount, description, stripeConnectId } = await req.json();
    const stripe = getStripe();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: description || `Facture ${invoiceId}` },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceId}?paid=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceId}`,
      metadata: { invoiceId },
    };

    // Route funds to the user's connected Stripe account
    if (stripeConnectId) {
      sessionParams.payment_intent_data = {
        transfer_data: { destination: stripeConnectId },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
