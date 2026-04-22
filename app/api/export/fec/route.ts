import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// FEC (Fichier des Écritures Comptables) - Format réglementaire français
// Norme DGFiP - Livre des procédures fiscales art. L47 A-I
function padNum(n: string, len: number) { return n.padStart(len, '0'); }
function fecDate(d: string) { return d.replace(/-/g, ''); } // YYYYMMDD
function fecAmount(n: number) { return n.toFixed(2).replace('.', ','); }
function esc(s: string) { return (s || '').replace(/\t/g, ' ').replace(/\n/g, ' '); }

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const url = new URL(req.url);
  const year = url.searchParams.get('year') || new Date().getFullYear().toString();

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*, client:clients(*)')
    .eq('user_id', user.id)
    .eq('document_type', 'invoice')
    .in('status', ['paid', 'sent'])
    .gte('issue_date', `${year}-01-01`)
    .lte('issue_date', `${year}-12-31`)
    .order('issue_date');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const siren = (profile?.siret || '').slice(0, 9) || '000000000';

  // FEC columns (tab-separated per spec)
  const headers = [
    'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
    'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
    'PieceRef', 'PieceDate', 'EcritureLib',
    'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate',
    'Montantdevise', 'Idevise',
  ];

  const rows: string[] = [headers.join('\t')];
  let ecritureSeq = 1;

  for (const inv of invoices || []) {
    const clientName = esc(inv.client?.name || inv.client_name_override || 'Client divers');
    const clientCode = `C${(inv.client_id || inv.id).slice(0, 8).toUpperCase()}`;
    const ref = esc(inv.number);
    const date = fecDate(inv.issue_date);
    const lib = esc(`Facture ${inv.number} - ${clientName}`);
    const eNum = padNum(String(ecritureSeq), 6);
    const validDate = inv.paid_at ? fecDate(inv.paid_at.slice(0, 10)) : '';

    // Line 1: Débit clients 411 (TTC)
    rows.push([
      'VT', 'Ventes',
      eNum, date,
      '411000', 'Clients', clientCode, clientName,
      ref, date, lib,
      fecAmount(inv.total), '0,00', '', '', validDate, '', '',
    ].join('\t'));

    // Line 2: Crédit produits 706 (HT)
    rows.push([
      'VT', 'Ventes',
      eNum, date,
      '706000', 'Prestations de services', '', '',
      ref, date, lib,
      '0,00', fecAmount(inv.subtotal), '', '', validDate, '', '',
    ].join('\t'));

    // Line 3: Crédit TVA 44571 (if VAT > 0)
    if (inv.vat_amount > 0) {
      rows.push([
        'VT', 'Ventes',
        eNum, date,
        '445710', 'TVA collectée', '', '',
        ref, date, lib,
        '0,00', fecAmount(inv.vat_amount), '', '', validDate, '', '',
      ].join('\t'));
    }

    // Line 4: Payment (if paid)
    if (inv.status === 'paid' && inv.paid_at) {
      const payDate = fecDate(inv.paid_at.slice(0, 10));
      const payENum = padNum(String(ecritureSeq) + 'P', 6);
      rows.push([
        'BQ', 'Banque',
        payENum, payDate,
        '512000', 'Banque', '', '',
        ref, payDate, `Règlement ${ref}`,
        fecAmount(inv.total), '0,00', 'A', payDate, payDate, '', '',
      ].join('\t'));
      rows.push([
        'BQ', 'Banque',
        payENum, payDate,
        '411000', 'Clients', clientCode, clientName,
        ref, payDate, `Règlement ${ref}`,
        '0,00', fecAmount(inv.total), 'A', payDate, payDate, '', '',
      ].join('\t'));
    }

    ecritureSeq++;
  }

  const fecContent = rows.join('\r\n');
  const filename = `FEC${siren}${year}1231.txt`;

  return new NextResponse(fecContent, {
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
