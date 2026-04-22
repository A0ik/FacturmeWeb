import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

interface RecurringInvoice {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name_override: string | null;
  frequency: string;
  next_run_date: string;
  is_active: boolean;
  email_config: {
    enabled: boolean;
    subject: string;
    message: string;
    send_before_days: number;
  } | null;
  items: Array<{
    id: string;
    name: string;
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }>;
  client?: {
    id: string;
    name: string;
    email: string;
    company_name: string;
  };
  user?: {
    email: string;
    first_name: string;
    last_name: string;
    company_name: string;
  };
}

interface EmailPayload {
  to: string;
  subject: string;
  message: string;
  invoiceId: string;
  clientName: string;
  amount: number;
  dueDate: string;
}

/**
 * POST /api/recurring/send
 * Envoie manuellement les factures récurrentes dues
 *
 * Cette fonction est appelée manuellement ou par un cron job quotidien
 * Elle génère les factures récurrentes qui sont dues et envoie les emails
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // Récupérer les factures récurrentes dues (next_run_date <= aujourd'hui)
    const { data: recurringInvoices, error: fetchError } = await supabase
      .from('recurring_invoices')
      .select(`
        *,
        client:clients(id, name, email, company_name),
        user:user_id!inner(email, first_name, last_name, company_name, profiles(company_name))
      `)
      .eq('is_active', true)
      .lte('next_run_date', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching recurring invoices:', fetchError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des factures récurrentes' },
        { status: 500 }
      );
    }

    if (!recurringInvoices || recurringInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucune facture récurrente à envoyer',
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as Array<{ recurringId: string; error: string }>,
    };

    // Traiter chaque facture récurrente
    for (const recurring of recurringInvoices as RecurringInvoice[]) {
      results.processed++;

      try {
        // Créer la facture à partir de la facture récurrente
        const invoiceNumber = await generateInvoiceNumber(supabase, recurring.user_id);

        // Calculer le montant total
        const totalHT = recurring.items.reduce((sum, item) =>
          sum + (item.quantity * item.unit_price), 0
        );
        const totalTTC = recurring.items.reduce((sum, item) => {
          const itemHT = item.quantity * item.unit_price;
          const itemTTC = itemHT * (1 + item.vat_rate / 100);
          return sum + itemTTC;
        }, 0);

        // Créer la facture
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            user_id: recurring.user_id,
            client_id: recurring.client_id,
            client_name_override: recurring.client_name_override,
            invoice_number: invoiceNumber,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 jours
            status: 'sent',
            subtotal_ht: totalHT,
            discount_amount: 0,
            vat_amount: totalTTC - totalHT,
            total_ttc: totalTTC,
            notes: `Facture générée automatiquement depuis le modèle récurrent ID: ${recurring.id}`,
            recurring_id: recurring.id,
            items: recurring.items,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Envoyer l'email si configuré
        if (recurring.email_config?.enabled && recurring.client?.email) {
          const emailPayload: EmailPayload = {
            to: recurring.client.email,
            subject: recurring.email_config.subject || 'Votre facture récurrente',
            message: recurring.email_config.message || 'Veuillez trouver ci-joint votre facture.',
            invoiceId: invoice.id,
            clientName: recurring.client.name || recurring.client.company_name || 'Client',
            amount: totalTTC,
            dueDate: invoice.due_date,
          };

          await sendRecurringEmail(emailPayload);
          results.sent++;
        }

        // Mettre à jour la prochaine date d'exécution
        const { error: updateError } = await supabase
          .from('recurring_invoices')
          .update({
            next_run_date: new Date(), // Sera mis à jour automatiquement par le trigger
          })
          .eq('id', recurring.id);

        if (updateError) throw updateError;

      } catch (error: any) {
        console.error(`Error processing recurring invoice ${recurring.id}:`, error);
        results.failed++;
        results.errors.push({
          recurringId: recurring.id,
          error: error.message || 'Erreur inconnue',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Traitement terminé: ${results.sent} envoyées, ${results.failed} échecs`,
      ...results,
    });

  } catch (error: any) {
    console.error('Error in recurring send API:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

/**
 * Génère un numéro de facture unique
 */
async function generateInvoiceNumber(supabase: any, userId: string): Promise<string> {
  const year = new Date().getFullYear();

  // Compter les factures de cette année pour cet utilisateur
  const { data, error } = await supabase
    .from('invoices')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`);

  if (error) throw error;

  const count = data?.length || 0;
  const sequence = String(count + 1).padStart(4, '0');
  return `FAC-${year}-${sequence}`;
}

/**
 * Envoie l'email de facture récurrente via Brevo (anciennement Sendinblue)
 *
 * Note: Cette fonction utilise Brevo pour l'envoi d'emails
 * Vous devez configurer BREVO_API_KEY dans vos variables d'environnement
 */
async function sendRecurringEmail(payload: EmailPayload): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY;

  if (!brevoApiKey) {
    console.warn('BREVO_API_KEY non configurée, email non envoyé');
    return;
  }

  // Remplacer les variables dans le message
  let message = payload.message
    .replace(/\{\{client_name\}\}/g, payload.clientName)
    .replace(/\{\{amount\}\}/g, formatCurrency(payload.amount))
    .replace(/\{\{due_date\}\}/g, new Date(payload.dueDate).toLocaleDateString('fr-FR'))
    .replace(/\{\{invoice_id\}\}/g, payload.invoiceId);

  // Ajouter le lien vers la facture
  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoices/${payload.invoiceId}`;
  message += `\n\nConsultez votre facture ici: ${invoiceUrl}`;

  // HTML version de l'email
  const htmlMessage = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Votre facture récurrente</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${payload.subject}</h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="line-height: 1.8; color: #333; font-size: 15px; margin-bottom: 20px;">
            ${message.replace(/\n/g, '<br>')}
          </p>

          <!-- Invoice Details Card -->
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #1D9E75;">
            <h3 style="margin: 0 0 15px 0; color: #1D9E75; font-size: 16px;">Détails de la facture</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #64748b; font-size: 14px;">Montant à régler:</span>
              <span style="color: #1e293b; font-weight: bold; font-size: 16px;">${formatCurrency(payload.amount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #64748b; font-size: 14px;">Date d'échéance:</span>
              <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${new Date(payload.dueDate).toLocaleDateString('fr-FR')}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b; font-size: 14px;">Référence:</span>
              <span style="color: #1e293b; font-weight: 600; font-size: 14px;">${payload.invoiceId}</span>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invoiceUrl}"
               style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(29, 158, 117, 0.3);">
              Consulter ma facture
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">
            Cet email a été envoyé automatiquement via Facturme
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_FROM_EMAIL || 'factures@facturme.app',
          name: process.env.BREVO_FROM_NAME || 'Facturme',
        },
        to: [{ email: payload.to, name: payload.clientName }],
        subject: payload.subject,
        htmlContent: htmlMessage,
        textContent: message,
        replyTo: { email: process.env.BREVO_REPLY_TO || process.env.BREVO_FROM_EMAIL },
        tags: ['recurring-invoice', payload.invoiceId],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = errorData.message || await response.text();
      throw new Error(`Brevo API error: ${error}`);
    }

    const result = await response.json();
    console.log(`Email sent successfully to ${payload.to}`, result);
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    throw error;
  }
}

/**
 * Formate un montant en euros
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * GET /api/recurring/send
 * Renvoie les statistiques sur les factures récurrentes à envoyer
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    const { data: recurringInvoices, error } = await supabase
      .from('recurring_invoices')
      .select('id, client_id, frequency, next_run_date, is_active')
      .eq('is_active', true)
      .lte('next_run_date', new Date().toISOString());

    if (error) throw error;

    return NextResponse.json({
      dueNow: recurringInvoices?.length || 0,
      invoices: recurringInvoices,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
