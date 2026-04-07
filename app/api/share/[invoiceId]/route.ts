import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const supabase = createAdminClient();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, client:clients(*)')
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch public profile info (no sensitive data)
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name,address,city,postal_code,country,phone,siret,logo_url,accent_color,language,currency,iban,bic,bank_name,legal_status,legal_mention,payment_terms')
    .eq('id', invoice.user_id)
    .single();

  return NextResponse.json({ invoice, profile });
}
