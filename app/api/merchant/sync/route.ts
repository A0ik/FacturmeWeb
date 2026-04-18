import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time execution
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Get the connection
    const { data: conn, error: connErr } = await getSupabaseAdmin()
      .from('merchant_connections')
      .select('*')
      .eq('id', id)
      .single();

    if (connErr || !conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Simulate sync (in production, this would call the merchant's API)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update last_sync_at
    await getSupabaseAdmin()
      .from('merchant_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_error: null
      })
      .eq('id', id);

    // In production, this would:
    // 1. Fetch recent invoices from merchant API
    // 2. Download PDF files
    // 3. Create captured_documents entries
    // 4. Trigger AI analysis

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      synced: 0 // Number of documents imported
    });
  } catch (err: any) {
    console.error('Merchant Sync Error:', err);

    // Update connection with error
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      await getSupabaseAdmin()
        .from('merchant_connections')
        .update({ sync_error: err.message })
        .eq('id', id);
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
