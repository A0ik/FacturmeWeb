import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, email, profile } = await req.json();
    if (!invoiceId || !email) return NextResponse.json({ error: 'invoiceId and email required' }, { status: 400 });

    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, email, profile, isReminder: true }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Record reminder sent timestamp
    const supabase = createAdminClient();
    await supabase.from('invoices').update({ updated_at: new Date().toISOString() }).eq('id', invoiceId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
