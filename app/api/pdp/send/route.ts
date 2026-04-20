import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { createFacturXPdf } from '@/lib/facturx';

/**
 * API PDP - Envoi de facture par email avec Factur-X
 *
 * Envoie la facture au format Factur-X par email au client.
 * Le Factur-X est généré avec toutes les informations PDP obligatoires.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, recipientEmail, message } = body;

    if (!invoiceId || !recipientEmail) {
      return NextResponse.json(
        { error: 'ID de facture et email du client requis' },
        { status: 400 }
      );
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Récupérer l'invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', invoice.user_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      return NextResponse.json(
        { error: 'Service email non configuré (BREVO_API_KEY manquante)' },
        { status: 500 }
      );
    }

    // Logger la tentative d'envoi (audit trail)
    await supabase.from('facturx_audit_logs').insert({
      invoice_id: invoiceId,
      user_id: invoice.user_id,
      action: 'send_email',
      recipient_email: recipientEmail,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    // Générer le Factur-X
    const facturXPdf = await createFacturXPdf(invoice, profile);
    const pdfBase64 = Buffer.from(facturXPdf).toString('base64');

    // Préparer l'email avec Brevo
    const senderName = profile.company_name || 'FacturMe';
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@factur.me';
    const replyToEmail = profile.email || senderEmail;

    const emailSubject = `Facture ${invoice.number} - ${senderName}`;
    const emailHtml = generateInvoiceEmail(invoice, profile, message);

    // Timeout de 15 secondes sur l'appel Brevo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let brevoRes: Response;
    try {
      brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: recipientEmail }],
          replyTo: { name: senderName, email: replyToEmail },
          subject: emailSubject,
          htmlContent: emailHtml,
          attachment: [{
            name: `Facture_${invoice.number}_Factur-X.pdf`,
            content: pdfBase64
          }],
        }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({
          error: 'Timeout Brevo (15s). L\'IP Vercel est probablement bloquée.',
        }, { status: 504 });
      }
      return NextResponse.json(
        { error: `Erreur réseau: ${fetchErr.message}` },
        { status: 502 }
      );
    }
    clearTimeout(timeoutId);

    if (!brevoRes.ok) {
      let errBody: any = {};
      try { errBody = await brevoRes.json(); } catch {}
      const msg: string = errBody.message || `Erreur Brevo (HTTP ${brevoRes.status})`;

      // Logger l'erreur
      await supabase.from('facturx_audit_logs').insert({
        invoice_id: invoiceId,
        user_id: invoice.user_id,
        action: 'send_email',
        recipient_email: recipientEmail,
        status: 'error',
        error_message: msg,
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ error: msg }, { status: brevoRes.status });
    }

    // Logger le succès
    await supabase.from('facturx_audit_logs').insert({
      invoice_id: invoiceId,
      user_id: invoice.user_id,
      action: 'send_email',
      recipient_email: recipientEmail,
      status: 'success',
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Facture envoyée par email'
    });

  } catch (error: any) {
    console.error('Erreur envoi email PDP:', error);

    // Logger l'erreur
    try {
      const supabase = createAdminClient();
      await supabase.from('facturx_audit_logs').insert({
        action: 'send_email',
        status: 'error',
        error_message: error.message,
        created_at: new Date().toISOString()
      });
    } catch {}

    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}

/**
 * Génère le HTML de l'email de facture avec Factur-X
 */
function generateInvoiceEmail(invoice: any, profile: any, customMessage?: string): string {
  const accent = profile?.accent_color || '#1D9E75';
  const locale = profile?.language === 'en' ? 'en-GB' : 'fr-FR';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: invoice.currency || 'EUR' }).format(n);
  const fmtDate = (s: string) => new Date(s).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${invoice.number}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="background:${accent};border-radius:16px 16px 0 0;padding:32px 40px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">FACTURE</div>
                <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px">${invoice.number}</div>
              </td>
              <td align="right">
                <div style="font-size:12px;color:rgba(255,255,255,0.8)">Émise le</div>
                <div style="font-size:14px;font-weight:700;color:#fff">${fmtDate(invoice.issue_date)}</div>
                ${invoice.due_date ? `<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px">Échéance</div><div style="font-size:14px;font-weight:700;color:#fff">${fmtDate(invoice.due_date)}</div>` : ''}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px 40px">
          ${customMessage
            ? `<p style="font-size:14px;color:#374151;margin:0 0 28px;line-height:1.6;white-space:pre-wrap">${customMessage.replace(/\n/g, '<br/>')}</p>`
            : `<p style="font-size:15px;color:#374151;margin:0 0 8px">Bonjour,</p>
               <p style="font-size:14px;color:#374151;margin:0 0 28px;line-height:1.6">Veuillez trouver ci-joint votre facture <strong>${invoice.number}</strong>.</p>`
          }

          <!-- Total -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr>
              <td></td>
              <td width="200" style="padding:0">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#fff;background:#111827;border-radius:8px 0 0 8px">Total TTC</td>
                    <td style="padding:12px 16px;font-size:20px;font-weight:900;color:${accent};background:#111827;border-radius:0 8px 8px 0;text-align:right">${fmt(invoice.total || 0)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Factur-X Badge -->
          <div style="background:#ecfdf5;border-left:3px solid #10b981;border-radius:6px;padding:16px;margin-bottom:24px">
            <div style="font-size:13px;font-weight:700;color:#059669;margin-bottom:6px">✓ Format Factur-X</div>
            <p style="font-size:13px;color:#065f46;margin:0;line-height:1.6">
              Cette facture est au format Factur-X (ZUGFeRD). Elle contient des données structurées
              compatibles avec les logiciels comptables et conforme à la réglementation française
              sur la facture électronique (PDP).
            </p>
          </div>

          <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.6">Cordialement,<br/><strong style="color:#111827">${profile.company_name}</strong></p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 16px 16px;padding:20px 40px;border-top:1px solid #e5e7eb">
          <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0;line-height:1.7">
            Ce document vous est transmis par <strong>${profile.company_name}</strong> via FacturMe<br/>
            ${profile.siret ? `SIRET : ${profile.siret} · ` : ''}${profile.legal_status === 'auto-entrepreneur' ? 'TVA non applicable, art. 293 B du CGI' : ''}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
