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

    // Get profile with SumUp keys
    const { data: profile } = await supabase.from('profiles')
      .select('sumup_api_key, sumup_merchant_code, currency')
      .eq('id', user.id)
      .single();
    if (!profile?.sumup_api_key || !profile?.sumup_merchant_code) {
      return NextResponse.json({ error: 'SumUp non configuré. Connectez votre compte dans les paramètres.' }, { status: 400 });
    }

    // Create SumUp checkout
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://factu.me';
    const checkoutRes = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${profile.sumup_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkout_reference: invoiceId,
        amount: invoice.total,
        currency: profile.currency || 'EUR',
        merchant_code: profile.sumup_merchant_code,
        description: `${invoice.document_type === 'quote' ? 'Devis' : 'Facture'} ${invoice.number}`,
        return_url: `${baseUrl}/share/${invoiceId}`,
        redirect_url: `${baseUrl}/share/${invoiceId}`,
      }),
    });

    if (!checkoutRes.ok) {
      const err = await checkoutRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || 'Erreur SumUp' }, { status: 500 });
    }

    const checkout = await checkoutRes.json();

    // Save checkout ID on invoice
    await supabase.from('invoices')
      .update({ sumup_checkout_id: checkout.id, payment_link: checkout.url })
      .eq('id', invoiceId);

    return NextResponse.json({ url: checkout.url, checkoutId: checkout.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
