import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to, contractType, employeeName, html } = await req.json();

    if (!to || !employeeName || !html) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: 'Service email non configuré (BREVO_API_KEY manquante)' }, { status: 500 });
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@factu.me';
    const senderName = process.env.BREVO_SENDER_NAME || 'Factu.me';

    const contractLabels: Record<string, string> = {
      cdi: 'CDI',
      cdd: 'CDD',
      other: 'Contrat de travail',
    };
    const contractLabel = contractLabels[contractType] || contractType || 'Contrat';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let brevoRes: Response;
    try {
      brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject: `Votre ${contractLabel} — ${employeeName}`,
          htmlContent: html,
        }),
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const err = fetchErr as Error;
      if (err.name === 'AbortError') {
        return NextResponse.json({
          error: 'Timeout Brevo (15s). Allez sur app.brevo.com/security/authorised_ips et activez "Allow all IPs".',
        }, { status: 504 });
      }
      return NextResponse.json({ error: `Erreur réseau: ${err.message}` }, { status: 502 });
    }
    clearTimeout(timeoutId);

    if (!brevoRes.ok) {
      let errBody: { message?: string } = {};
      try { errBody = await brevoRes.json(); } catch { /* empty */ }
      const msg = errBody.message || `Erreur Brevo (HTTP ${brevoRes.status})`;
      return NextResponse.json({ error: msg }, { status: brevoRes.status });
    }

    return NextResponse.json({
      success: true,
      messageId: `brevo-${Date.now()}`,
    });

  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'envoi de l\'email' }, { status: 500 });
  }
}
