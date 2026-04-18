import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  // Security: verify CRON_SECRET
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayIso = now.toISOString();

  // Fetch invoices that are sent, past due date, and not yet marked overdue
  const { data: overdueInvoices, error } = await admin
    .from('invoices')
    .select('id, number, user_id, due_date, status')
    .eq('status', 'sent')
    .lt('due_date', todayIso);

  if (error) {
    console.error('[cron/reminders] fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!overdueInvoices || overdueInvoices.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const invoice of overdueInvoices) {
    const dueDate = new Date(invoice.due_date!);
    const daysLate = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // 1. Mark invoice as overdue
    const { error: updateError } = await admin
      .from('invoices')
      .update({ status: 'overdue', updated_at: todayIso })
      .eq('id', invoice.id);

    if (updateError) {
      console.error(`[cron/reminders] update error for invoice ${invoice.id}:`, updateError);
      continue;
    }

    // 2. Insert a notification for the user
    const message = `Facture ${invoice.number} en retard de ${daysLate} jour${daysLate > 1 ? 's' : ''}`;

    const { error: notifError } = await admin.from('notifications').insert({
      user_id: invoice.user_id,
      type: 'overdue_invoice',
      title: 'Facture en retard',
      message,
      data: { invoice_id: invoice.id, invoice_number: invoice.number, days_late: daysLate },
      read: false,
      created_at: todayIso,
    });

    if (notifError) {
      // Notifications table may not exist — log but don't fail
      console.warn(`[cron/reminders] notification insert error:`, notifError.message);
    }

    processed++;
  }

  return NextResponse.json({ processed });
}
