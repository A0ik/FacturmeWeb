import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateBody, sanitizeString, checkRateLimit } from '@/lib/api-validation';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting - prevent spam
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(ip, 10, 60000); // 10 invites per minute
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.' },
        { status: 429 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Validate request body
    const body = await req.json();
    const validation = validateBody(body, {
      email: { required: true, type: 'email', maxLength: 255 },
      role: { required: true, type: 'string', enum: ['admin', 'member', 'viewer'] },
      token: { required: true, type: 'string', minLength: 16, maxLength: 128 },
      sanitizedWorkspaceName: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors },
        { status: 400 }
      );
    }

    const { email, role, token, sanitizedWorkspaceName: workspaceName } = body;

    // Sanitize inputs
    const sanitizedWorkspaceName = sanitizeString(workspaceName);

    // Verify token exists in database and is unused (prevent token reuse/abuse)
    const { data: tokenData, error: tokenError } = await supabase
      .from('workspace_invitations')
      .select('id, workspace_id, status, created_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 404 });
    }

    if (tokenData.status !== 'pending') {
      return NextResponse.json({ error: 'Ce token a déjà été utilisé' }, { status: 400 });
    }

    // Check if the inviter is an admin of this workspace
    const { data: memberData, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', tokenData.workspace_id)
      .eq('user_id', session.user.id)
      .single();

    if (memberError || !memberData || memberData.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé à inviter dans ce workspace' }, { status: 403 });
    }

    // Get inviter profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, first_name, email')
      .eq('id', session.user.id)
      .single();

    const inviterName = profile?.company_name || profile?.first_name || profile?.email || 'Un utilisateur';
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://facturme.app'}/workspace/join?token=${token}`;

    const ROLE_LABELS: Record<string, string> = {
      admin: 'Administrateur', member: 'Membre', viewer: 'Lecteur',
    };

    // Send email via Brevo SMTP
    const brevoKey = process.env.BREVO_SMTP_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@facturme.app';
    const senderName = process.env.BREVO_SENDER_NAME || 'Factu.me';

    if (brevoKey) {
      const emailBody = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email }],
        subject: `${inviterName} vous invite à rejoindre ${sanitizedWorkspaceName} sur Factu.me`,
        htmlContent: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;border:1px solid #e5e7eb;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:#0a0a0f;padding:32px 40px;text-align:center">
          <span style="font-size:24px;font-weight:900;color:#1D9E75;letter-spacing:-1px">Factu</span><span style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-1px">.me</span>
          <p style="margin:8px 0 0;color:#6b7280;font-size:13px">Plateforme de facturation intelligente</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827">Vous avez été invité 🎉</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">
            <strong style="color:#111">${inviterName}</strong> vous invite à rejoindre le workspace <strong style="color:#111">${sanitizedWorkspaceName}</strong> en tant que <strong style="color:#1D9E75">${ROLE_LABELS[role] || role}</strong>.
          </p>
          <!-- Role info -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="margin:0;font-size:13px;color:#166534;font-weight:600">
              Votre rôle : ${ROLE_LABELS[role] || role}
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#16a34a">
              ${role === 'admin' ? 'Vous pourrez gérer les membres et les paramètres du workspace.' : role === 'member' ? 'Vous aurez accès aux factures et aux clients.' : 'Vous pourrez consulter les documents en lecture seule.'}
            </p>
          </div>
          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding:8px 0 32px">
              <a href="${inviteLink}" style="display:inline-block;background:#1D9E75;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:-0.3px">
                Rejoindre le workspace →
              </a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
            Ce lien expire dans 7 jours.<br>
            Si vous n'attendiez pas cette invitation, ignorez cet email.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:11px;color:#9ca3af">Factu.me · Plateforme de facturation SaaS</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      };

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': brevoKey,
        },
        body: JSON.stringify(emailBody),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Workspace invite error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
