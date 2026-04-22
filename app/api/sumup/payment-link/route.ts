import { NextRequest, NextResponse } from 'next/server';
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
          setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any));
          },
        },
      }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { invoiceId } = await req.json();
    if (!invoiceId) return NextResponse.json({ error: 'invoiceId requis' }, { status: 400 });

    const supabase = createAdminClient();

    // Get invoice
    const { data: invoice, error: invError } = await supabase.from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .single();
    if (invError || !invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });

    // Get profile with SumUp keys and email (pay_to_email required by SumUp API)
    const { data: profile } = await supabase.from('profiles')
      .select('sumup_api_key, sumup_merchant_code, currency, email')
      .eq('id', user.id)
      .single();
    if (!profile?.sumup_api_key || !profile?.sumup_merchant_code) {
      return NextResponse.json({ error: 'SumUp non configuré. Connectez votre compte dans les paramètres.' }, { status: 400 });
    }

    // If a checkout already exists for this invoice, return the existing URL
    if (invoice.sumup_checkout_id) {
      const existingUrl = `https://pay.sumup.com/b2c/${invoice.sumup_checkout_id}`;
      return NextResponse.json({ url: existingUrl, checkoutId: invoice.sumup_checkout_id });
    }

    // SumUp API requires amount in major currency units (e.g. 10.50 for €10.50), NOT cents
    const amount = Number(invoice.total);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Le montant de la facture doit être supérieur à 0.' }, { status: 400 });
    }

    const merchantEmail = profile.email || user.email;
    console.log('[sumup-payment-link] Creating checkout for invoice:', invoiceId, 'amount:', amount, 'currency:', profile.currency || 'EUR', 'merchant:', merchantEmail);

    const checkoutBody: Record<string, unknown> = {
      checkout_reference: invoiceId,
      amount,
      currency: profile.currency || 'EUR',
      description: `${invoice.document_type === 'quote' ? 'Devis' : 'Facture'} ${invoice.number}`,
    };
    if (merchantEmail) checkoutBody.pay_to_email = merchantEmail;

    const checkoutRes = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${profile.sumup_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutBody),
    });

    if (!checkoutRes.ok) {
      const err = await checkoutRes.json().catch(() => ({}));
      console.error('[sumup-payment-link] SumUp API error:', checkoutRes.status, JSON.stringify(err));
      if (checkoutRes.status === 401) {
        return NextResponse.json({ error: 'Clé API SumUp invalide ou expirée. Reconnectez votre compte dans Paramètres > Paiement en ligne.' }, { status: 400 });
      }
      const errorMsg = err.message || err.error_code || err.error || `Erreur SumUp (${checkoutRes.status})`;
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const checkout = await checkoutRes.json();

    // SumUp does not return a url field — construct the payment link from the checkout id
    const paymentUrl = `https://pay.sumup.com/b2c/${checkout.id}`;

    // Save checkout ID on invoice
    await supabase.from('invoices')
      .update({ sumup_checkout_id: checkout.id, payment_link: paymentUrl })
      .eq('id', invoiceId);

    return NextResponse.json({ url: paymentUrl, checkoutId: checkout.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
