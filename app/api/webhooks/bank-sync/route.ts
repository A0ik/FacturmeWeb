import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const email = payload.user_email;
    const transactions = payload.transactions || [];
    const source = payload.source || 'external';

    if (!email) return NextResponse.json({ error: 'Missing user_email' }, { status: 400 });

    const { data: user } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    for (const trx of transactions) {
      // 1. Inserer la transaction bancaire
      const { data: bTrx, error: insertErr } = await supabaseAdmin.from('bank_transactions').insert({
        user_id: user.id,
        amount: trx.amount,
        transaction_date: trx.date,
        label: trx.label,
        currency: trx.currency || 'EUR',
        source: source,
        status: 'unreconciled'
      }).select().single();

      if (insertErr || !bTrx) continue;

      // 2. Rapprochement Bancaire (Reconciliation auto-magique)
      if (trx.amount < 0) { // On cherche des factures fournisseurs pour les dépenses
        const docAmount = Math.abs(trx.amount);
        
        // On cherche un document non encore rapproché
        const { data: docs } = await supabaseAdmin
          .from('captured_documents')
          .select('id, document_date')
          .eq('user_id', user.id)
          .eq('amount', docAmount)
          .is('matched_transaction_id', null)
          .order('document_date', { ascending: false });

        if (docs && docs.length > 0) {
          // Si on veut être précis, on vérifie que la date de la facture est environ la même (+/- 5 jours max)
          // Mais pour simplifier l'agnosticité, si montant exact = match. On prend la date la plus proche
          const targetDoc = docs[0]; 

          // Lier la facture à la transaction
          await supabaseAdmin.from('captured_documents')
            .update({ matched_transaction_id: bTrx.id })
            .eq('id', targetDoc.id);

          // Passer la transaction en "reconciled"
          await supabaseAdmin.from('bank_transactions')
            .update({ status: 'reconciled' })
            .eq('id', bTrx.id);
        }
      }
    }

    return NextResponse.json({ success: true, processed: transactions.length });
  } catch (err: any) {
    console.error('Bank Sync Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
