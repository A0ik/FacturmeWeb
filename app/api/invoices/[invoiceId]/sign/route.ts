import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { signatureDataUrl, signerName } = await req.json();
    const { invoiceId } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upload signature PNG to Supabase Storage
    let signatureUrl = signatureDataUrl;
    try {
      const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const path = `signatures/${invoiceId}/sig_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(path, buffer, { contentType: 'image/png', upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from('assets').getPublicUrl(path);
        signatureUrl = data.publicUrl;
      }
    } catch {
      // fallback to data URL stored directly
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const { error } = await supabase
      .from('invoices')
      .update({
        client_signature_url: signatureUrl,
        signed_at: new Date().toISOString(),
        signed_ip: ip,
        signed_by: signerName || 'Client',
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (error) throw error;

    return NextResponse.json({ success: true, signatureUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
