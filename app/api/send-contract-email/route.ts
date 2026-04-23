import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to, contractType, employeeName, html } = await req.json();

    if (!to || !employeeName || !html) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // For now, just return success - email sending would require additional packages
    // TODO: Implement actual email sending with nodemailer or resend
    console.log(`[Mock Email] Sending ${contractType} contract to ${to} for ${employeeName}`);

    return NextResponse.json({
      success: true,
      messageId: `mock-${Date.now()}`,
    });

  } catch (error: any) {
    console.error('[Send Contract Email] Error:', error);
    const message = error.message || 'Erreur lors de l\'envoi de l\'email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
