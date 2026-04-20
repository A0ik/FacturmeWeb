import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createFacturXPdf } from '@/lib/facturx';

/**
 * API PDP - Envoi de facture par email avec Factur-X
 *
 * Envoie la facture au format Factur-X par email au client.
 * Le Factur-X est généré avec toutes les informations PDP obligatoires.
 */
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { invoiceId, recipientEmail, message } = await request.json();

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

    // Vérifier que l'utilisateur a accès à la facture
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    // Logger la tentative d'envoi (audit trail)
    await supabase.from('facturx_audit_logs').insert({
      invoice_id: invoiceId,
      user_id: user.id,
      action: 'send_email',
      recipient_email: recipientEmail,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    // Générer le Factur-X
    const facturXPdf = await createFacturXPdf(invoice, profile);

    // Envoyer l'email avec Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailResult = await resend.emails.send({
      from: `${profile.company_name} <factures@${process.env.EMAIL_DOMAIN || 'facturme.app'}>`,
      to: recipientEmail,
      subject: `Facture ${invoice.number} de ${profile.company_name}`,
      html: generateInvoiceEmail(invoice, profile, message),
      attachments: [
        {
          filename: `Facture_${invoice.number}_Factur-X.pdf`,
          content: Buffer.from(facturXPdf).toString('base64'),
        }
      ]
    });

    // Logger le succès
    await supabase.from('facturx_audit_logs').insert({
      invoice_id: invoiceId,
      user_id: user.id,
      action: 'send_email',
      recipient_email: recipientEmail,
      status: 'success',
      email_id: emailResult.data?.id,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Facture envoyée par email',
      email_id: emailResult.data?.id
    });

  } catch (error: any) {
    console.error('Erreur envoi email:', error);

    // Logger l'erreur
    try {
      const supabase = createRouteHandlerClient({ cookies });
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
 * Génère le HTML de l'email de facture
 */
function generateInvoiceEmail(invoice: any, profile: any, customMessage?: string) {
  const total = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(invoice.total || 0);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Facture ${invoice.number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .factur-x-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .total { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧾 Facture ${invoice.number}</h1>
          </div>
          <div class="content">
            <div class="factur-x-badge">✓ Factur-X - Format électronique conforme</div>

            <div class="info-box">
              <p>Bonjour,</p>
              <p>${profile.company_name} vous envoie sa facture <strong>n°${invoice.number}</strong>.</p>
              ${customMessage ? `<p style="margin-top: 15px; font-style: italic;">${customMessage}</p>` : ''}
            </div>

            <div class="info-box">
              <p><strong>Montant à payer :</strong></p>
              <p class="total">${total}</p>
              <p style="text-align: center; color: #666; margin-top: 10px;">
                Date d'émission : ${new Date(invoice.issue_date).toLocaleDateString('fr-FR')}
              </p>
              <p style="text-align: center; color: #666;">
                Date d'échéance : ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : 'Non définie'}
              </p>
            </div>

            <div class="info-box" style="background: #ecfdf5; border-left: 4px solid #10b981;">
              <p><strong>✓ Format Factur-X</strong></p>
              <p style="font-size: 14px; color: #059669;">
                Cette facture est au format Factur-X (ZUGFeRD). Elle contient des données structurées
                compatibles avec les logiciels comptables et conforme à la réglementation française
                sur la facture électronique (PDP - Plateforme de Dématérialisation Partagée).
              </p>
            </div>

            <div style="text-align: center;">
              <a href="#" class="button">Télécharger la facture</a>
            </div>
          </div>
          <div class="footer">
            <p>${profile.company_name}</p>
            <p>${profile.address}, ${profile.postal_code} ${profile.city}</p>
            <p>SIRET: ${profile.siret}</p>
            <p style="margin-top: 10px;">Généré par FacturMe</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
