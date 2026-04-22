import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const webhookSecret = process.env.SUMUP_WEBHOOK_SECRET || '';

  console.log('[sumup-webhook] Webhook received');

  // Verify webhook signature
  const signature = req.headers.get('x-sumup-signature');

  // If webhook secret is configured, signature is mandatory and must be valid
  if (webhookSecret) {
    if (!signature) {
      console.error('[sumup-webhook] Missing signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
    if (signature !== expected) {
      console.error('[sumup-webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    console.error('[sumup-webhook] Invalid JSON body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[sumup-webhook] Event:', JSON.stringify({ type: event.event_type || event.type, status: event.payload?.status || event.status }));

  const supabase = createAdminClient();

  try {
    const eventType = event.event_type || event.type;
    const status = event.payload?.status || event.status;

    // Handle checkout paid
    if (eventType === 'checkout.status.changed' && status === 'PAID') {
      const checkoutId = event.payload?.id || event.payload?.checkout_id || event.id;
      const checkoutReference = event.payload?.checkout_reference || event.checkout_reference;

      console.log('[sumup-webhook] Processing PAID checkout - checkoutId:', checkoutId, 'reference:', checkoutReference);

      if (checkoutId) {
        // Try to find invoice by checkout_id first
        let { data: invoice } = await supabase
          .from('invoices')
          .select('id, number, total, client_id')
          .eq('sumup_checkout_id', checkoutId)
          .single();

        // If not found by checkout_id, try by checkout_reference (invoice ID)
        if (!invoice && checkoutReference) {
          ({ data: invoice } = await supabase
            .from('invoices')
            .select('id, number, total, client_id')
            .eq('id', checkoutReference)
            .single());
        }

        if (invoice) {
          console.log('[sumup-webhook] Updating invoice to PAID:', invoice.id);

          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              payment_method: 'sumup',
            })
            .eq('id', invoice.id);

          if (updateError) {
            console.error('[sumup-webhook] Failed to update invoice:', updateError);
          } else {
            console.log('[sumup-webhook] Successfully marked invoice as paid:', invoice.number);
          }
        } else {
          console.warn('[sumup-webhook] No invoice found for checkout:', checkoutId, 'reference:', checkoutReference);
        }
      }
    } else {
      console.log('[sumup-webhook] Ignoring event - type:', eventType, 'status:', status);
    }
  } catch (err: any) {
    console.error('[sumup-webhook] Error processing webhook:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
