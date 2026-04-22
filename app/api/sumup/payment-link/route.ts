import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getValidSumUpToken } from '@/lib/sumup/oauth';

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
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId requis' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get invoice
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .single();

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Get valid OAuth token (will refresh if needed)
    const accessToken = await getValidSumUpToken(user.id);

    if (!accessToken) {
      return NextResponse.json({
        error: 'SumUp non connecté. Connectez votre compte dans les paramètres.',
        needsReauth: true,
      }, { status: 400 });
    }

    // Get profile for additional data
    const { data: profile } = await supabase
      .from('profiles')
      .select('currency, sumup_merchant_code')
      .eq('id', user.id)
      .single();

    // If checkout already exists, return existing URL
    if (invoice.sumup_checkout_id) {
      const existingUrl = `https://pay.sumup.com/b2c/${invoice.sumup_checkout_id}`;
      return NextResponse.json({ url: existingUrl, checkoutId: invoice.sumup_checkout_id });
    }

    // Validate and round amount
    const amount = Math.round(Number(invoice.total) * 100) / 100;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Le montant de la facture doit être supérieur à 0.' }, { status: 400 });
    }

    const currency = (profile?.currency || 'EUR').toUpperCase();

    console.log('[sumup-payment-link] Creating checkout with OAuth token — invoice:', invoiceId, 'amount:', amount, 'currency:', currency);

    // Build checkout request
    const checkoutBody: Record<string, unknown> = {
      checkout_reference: invoiceId,
      amount,
      currency,
      description: `${invoice.document_type === 'quote' ? 'Devis' : 'Facture'} ${invoice.number}`,
    };

    // Call SumUp API with OAuth token
    const checkoutRes = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutBody),
    });

    if (!checkoutRes.ok) {
      let err: Record<string, any> = {};
      try { err = await checkoutRes.json(); } catch {}

      console.error('[sumup-payment-link] SumUp API error — HTTP', checkoutRes.status, JSON.stringify(err));

      // Handle token expiry specifically
      if (checkoutRes.status === 401) {
        return NextResponse.json({
          error: 'Votre session SumUp a expiré. Veuillez vous reconnecter dans Paramètres > SumUp.',
          needsReauth: true,
        }, { status: 401 });
      }

      if (checkoutRes.status === 403) {
        return NextResponse.json({
          error: 'Votre compte SumUp n\'a pas les permissions pour créer des liens de paiement. Contactez le support SumUp.',
        }, { status: 400 });
      }

      if (checkoutRes.status === 409) {
        return NextResponse.json({
          error: 'Un lien de paiement existe déjà pour cette facture côté SumUp.',
        }, { status: 400 });
      }

      // Extract error details
      const sumupMsg = err.message || err.error_description || err.error_code || err.error || '';
      const errorMsg = sumupMsg
        ? `Erreur SumUp : ${sumupMsg}`
        : `Erreur SumUp (${checkoutRes.status}).`;

      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const checkout = await checkoutRes.json();
    console.log('[sumup-payment-link] Checkout created:', JSON.stringify(checkout));

    if (!checkout.id) {
      console.error('[sumup-payment-link] SumUp response has no id field:', JSON.stringify(checkout));
      return NextResponse.json({
        error: 'SumUp n\'a pas retourné d\'identifiant de checkout. Contactez le support SumUp.'
      }, { status: 500 });
    }

    const paymentUrl = `https://pay.sumup.com/b2c/${checkout.id}`;

    // Verify payment page accessibility (optional)
    try {
      const verifyRes = await fetch(paymentUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (verifyRes.status === 404) {
        console.warn('[sumup-payment-link] Payment URL returns 404 — online payments not enabled:', checkout.id);
        await supabase
          .from('invoices')
          .update({ sumup_checkout_id: checkout.id, payment_link: paymentUrl })
          .eq('id', invoiceId);

        return NextResponse.json({
          url: paymentUrl,
          checkoutId: checkout.id,
          warning: 'Le checkout a été créé mais la page de paiement retourne une erreur 404. Activez les paiements en ligne dans votre portail SumUp.',
        });
      }
    } catch {
      // Ignore verification errors
    }

    // Save checkout to invoice
    await supabase
      .from('invoices')
      .update({ sumup_checkout_id: checkout.id, payment_link: paymentUrl })
      .eq('id', invoiceId);

    return NextResponse.json({ url: paymentUrl, checkoutId: checkout.id });
  } catch (error: any) {
    console.error('[sumup-payment-link] Unexpected error:', error?.message || error);
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
  }
}
