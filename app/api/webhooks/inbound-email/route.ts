import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration du client Supabase "Admin" pour écrire sans auth client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const items = payload.items || [payload];

    for (const item of items) {
      const fromEmail = item.From?.Address;
      if (!fromEmail) continue;

      // 1. Trouver l'utilisateur Facturme
      const { data: user } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', fromEmail)
        .single();
        
      if (!user) {
        console.warn(`Email reçu de ${fromEmail} mais l'utilisateur n'existe pas.`);
        continue;
      }

      const attachments = item.Attachments || [];
      
      // 2. Traiter chaque pièce jointe
      for (const att of attachments) {
        const isSupported = att.ContentType === 'application/pdf' || att.ContentType.startsWith('image/');
        if (!isSupported) continue;

        // Télécharger le fichier depuis Brevo
        const brevoRes = await fetch(`https://api.brevo.com/v3/inbound/attachments/${att.DownloadToken}`, {
          headers: { 'api-key': process.env.BREVO_API_KEY! }
        });
        
        if (!brevoRes.ok) continue;
        const arrayBuffer = await brevoRes.arrayBuffer();
        const fileData = Buffer.from(arrayBuffer);

        // 3. Upload vers Supabase Storage
        const ext = att.Name.split('.').pop()?.toLowerCase() || 'pdf';
        const path = `receipts/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        
        const { error: uploadErr } = await supabaseAdmin.storage
          .from('assets')
          .upload(path, fileData, { contentType: att.ContentType, upsert: true });

        if (uploadErr) {
          console.error("Upload Error:", uploadErr);
          continue;
        }

        const { data: urlData } = supabaseAdmin.storage.from('assets').getPublicUrl(path);
        
        // 4. Créer la facture dans Facturme (Statut pending)
        const fileType = att.ContentType.startsWith('image/') ? 'image' : 'pdf';
        
        await supabaseAdmin.from('captured_documents').insert({
          user_id: user.id,
          file_url: urlData.publicUrl,
          file_type: fileType,
          status: 'pending',
          amount: 0,
          vat_amount: 0,
          vat_rate: 0,
          description: `Reçu par email (${att.Name})`
        });
        
        // NB: Le traitement IA sera lancé plus tard, soit via un CRON soit quand le client ouvre l'application
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Inbound Email Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
