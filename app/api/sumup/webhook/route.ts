import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const webhookSecret = process.env.SUMUP_WEBHOOK_SECRET || '';

  // Verify webhook signature
  const signature = req.headers.get('x-sumup-signature');

  // If webhook secret is configured, signature is mandatory and must be valid
  if (webhookSecret) {
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const eventType = event.event_type || event.type;
    const status = event.payload?.status || event.status;

    // Handle checkout paid
    if (eventType === 'checkout.status.changed' && status === 'PAID') {
      const checkoutId = event.payload?.id || event.payload?.checkout_id || event.id;
      if (checkoutId) {
        await supabase.from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: 'sumup',
          })
          .eq('sumup_checkout_id', checkoutId);
      }
    }
  } catch (err: any) {
    console.error('[sumup-webhook]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
