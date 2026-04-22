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

    const { data: invoice, error: invError } = await supabase.from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .single();
    if (invError || !invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });

    const { data: profile } = await supabase.from('profiles')
      .select('sumup_api_key, sumup_merchant_code, currency, sumup_email')
      .eq('id', user.id)
      .single();

    if (!profile?.sumup_api_key || !profile?.sumup_merchant_code) {
      return NextResponse.json({ error: 'SumUp non configuré. Connectez votre compte dans les paramètres.' }, { status: 400 });
    }

    // If checkout already exists for this invoice, return the existing URL
    if (invoice.sumup_checkout_id) {
      const existingUrl = `https://pay.sumup.com/b2c/${invoice.sumup_checkout_id}`;
      return NextResponse.json({ url: existingUrl, checkoutId: invoice.sumup_checkout_id });
    }

    // SumUp API requires amount in major currency units (e.g. 10.50 for €10.50), max 2 decimal places
    const amount = Math.round(Number(invoice.total) * 100) / 100;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Le montant de la facture doit être supérieur à 0.' }, { status: 400 });
    }

    const merchantEmail = profile.sumup_email || null;
    const currency = (profile.currency || 'EUR').toUpperCase();

    console.log('[sumup-payment-link] Creating checkout — invoice:', invoiceId, 'amount:', amount, 'currency:', currency, 'pay_to_email:', merchantEmail || '(absent)');

    // Warn if no email: some SumUp account types require pay_to_email
    if (!merchantEmail) {
      console.warn('[sumup-payment-link] sumup_email is null — pay_to_email will be omitted. If your SumUp account is an affiliate/operator type, this will cause a validation error. Go to Settings > SumUp and reconnect with your SumUp email.');
    }

    const checkoutBody: Record<string, unknown> = {
      checkout_reference: invoiceId,
      amount,
      currency,
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
      let err: Record<string, any> = {};
      try { err = await checkoutRes.json(); } catch {}

      // Build a detailed log entry so Vercel shows the full SumUp response
      console.error('[sumup-payment-link] SumUp API error — HTTP', checkoutRes.status, JSON.stringify(err));

      // Map common SumUp errors to actionable French messages
      if (checkoutRes.status === 401) {
        return NextResponse.json({
          error: 'Clé API SumUp invalide ou expirée. Allez dans Paramètres > SumUp et reconnectez votre compte.',
        }, { status: 400 });
      }

      if (checkoutRes.status === 403) {
        return NextResponse.json({
          error: 'Votre clé API SumUp n\'a pas les permissions pour créer des liens de paiement. Assurez-vous que votre clé a le scope "payments" dans le portail SumUp.',
        }, { status: 400 });
      }

      if (checkoutRes.status === 409) {
        // checkout_reference conflict — the same invoice was partially created on SumUp side
        // Try to retrieve the existing checkout
        return NextResponse.json({
          error: 'Un lien de paiement existe déjà pour cette facture côté SumUp. Rechargez la page ou contactez le support.',
        }, { status: 400 });
      }

      // For validation errors (400/422), surface the SumUp error detail
      const sumupMsg = err.message || err.error_description || err.error_code || err.error || '';
      const sumupParam = err.param ? ` (champ: ${err.param})` : '';

      if (!merchantEmail && (sumupMsg.toLowerCase().includes('pay_to_email') || sumupMsg.toLowerCase().includes('email') || checkoutRes.status === 400)) {
        return NextResponse.json({
          error: `Votre compte SumUp nécessite un email marchand pour créer des liens de paiement. Allez dans Paramètres > SumUp, déconnectez votre compte, puis reconnectez-le en ajoutant votre email SumUp manuellement.`,
        }, { status: 400 });
      }

      const errorMsg = sumupMsg
        ? `Erreur SumUp : ${sumupMsg}${sumupParam}`
        : `Erreur SumUp (${checkoutRes.status}). Vérifiez votre configuration dans Paramètres > SumUp.`;

      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const checkout = await checkoutRes.json();
    console.log('[sumup-payment-link] Checkout created:', JSON.stringify(checkout));

    if (!checkout.id) {
      console.error('[sumup-payment-link] SumUp response has no id field:', JSON.stringify(checkout));
      return NextResponse.json({ error: 'SumUp n\'a pas retourné d\'identifiant de checkout. Contactez le support SumUp.' }, { status: 500 });
    }

    const paymentUrl = `https://pay.sumup.com/b2c/${checkout.id}`;

    // Verify the payment page is accessible before returning
    try {
      const verifyRes = await fetch(paymentUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (verifyRes.status === 404) {
        console.warn('[sumup-payment-link] Payment URL returns 404 — merchant account may not have online payments enabled:', checkout.id);
        // Still save the checkout ID but warn the user
        await supabase.from('invoices')
          .update({ sumup_checkout_id: checkout.id, payment_link: paymentUrl })
          .eq('id', invoiceId);
        return NextResponse.json({
          url: paymentUrl,
          checkoutId: checkout.id,
          warning: 'Le checkout a été créé mais la page de paiement retourne une erreur 404. Activez les paiements en ligne dans votre portail SumUp (merchants.sumup.com → Boutique en ligne).',
        });
      }
    } catch {
      // If the HEAD request fails for network reasons, proceed anyway
    }

    await supabase.from('invoices')
      .update({ sumup_checkout_id: checkout.id, payment_link: paymentUrl })
      .eq('id', invoiceId);

    return NextResponse.json({ url: paymentUrl, checkoutId: checkout.id });
  } catch (error: any) {
    console.error('[sumup-payment-link] Unexpected error:', error?.message || error);
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
  }
}
