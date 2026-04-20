import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { generatePdfBuffer } from '@/lib/pdf';
import { createFacturXPdf, isFacturXEligible, getFacturXInfo } from '@/lib/facturx';

/**
 * API Route - Export Factur-X
 *
 * Génère un PDF Factur-X complet (PDF + XML embarqué selon EN 16931)
 * Conforme à la réforme française de facturation électronique 2026+
 *
 * GET /api/export/facturx/[invoiceId]
 *
 * Authentification requise
 * Seuls les factures (pas devis/avoirs) sont éligibles
 * Nécessite un abonnement Pro ou Business (pas Free/Solo)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    // ── Authentification ─────────────────────────────────────────────────────
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { invoiceId } = await params;
    const admin = createAdminClient();

    // ── Récupération facture + profil ───────────────────────────────────────────────
    const [{ data: invoice, error: invError }, { data: profile }] = await Promise.all([
      admin
        .from('invoices')
        .select('*, client:clients(*)')
        .eq('id', invoiceId)
        .eq('user_id', user.id)
        .single(),
      admin.from('profiles').select('*').eq('id', user.id).single(),
    ]);

    if (invError || !invoice) {
      return NextResponse.json(
        { error: 'Facture introuvable' },
        { status: 404 }
      );
    }

    // ── Vérification type de document ────────────────────────────────────────
    if (invoice.document_type !== 'invoice') {
      return NextResponse.json(
        {
          error: 'Type de document non supporté',
          message: 'Le format Factur-X est uniquement disponible pour les factures, pas les devis ou avoirs.',
        },
        { status: 400 }
      );
    }

    // ── Vérification abonnement ───────────────────────────────────────────────
    const tier = profile?.subscription_tier || 'free';
    const isTrialActive = profile?.is_trial_active || false;

    // Vérifier si l'utilisateur a accès à Factur-X
    // Nécessite Pro ou Business (pas Free, pas Solo)
    const hasAccess = isTrialActive || tier === 'pro' || tier === 'business';

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'Fonctionnalité non disponible',
          message: 'Le format Factur-X est réservé aux abonnements Pro et Business.',
          upgradeUrl: '/paywall',
        },
        { status: 403 }
      );
    }

    // ── Validation éligibilité Factur-X ───────────────────────────────────────
    const eligibility = isFacturXEligible(invoice, profile);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: 'Facture non éligible au format Factur-X',
          reason: eligibility.reason,
        },
        { status: 400 }
      );
    }

    // ── Génération PDF ──────────────────────────────────────────────────────
    let pdfBuffer: Uint8Array;
    try {
      pdfBuffer = await generatePdfBuffer(invoice, profile);
    } catch (pdfError) {
      console.error('Erreur génération PDF:', pdfError);
      return NextResponse.json(
        {
          error: 'Erreur lors de la génération du PDF',
          details: pdfError instanceof Error ? pdfError.message : 'Erreur inconnue',
        },
        { status: 500 }
      );
    }

    // ── Conversion en Factur-X ───────────────────────────────────────────────
    let facturXPdfBytes: Uint8Array;
    try {
      facturXPdfBytes = await createFacturXPdf(pdfBuffer, invoice, profile);
    } catch (facturXError) {
      console.error('Erreur conversion Factur-X:', facturXError);
      return NextResponse.json(
        {
          error: 'Erreur lors de la conversion au format Factur-X',
          details: facturXError instanceof Error ? facturXError.message : 'Erreur inconnue',
        },
        { status: 500 }
      );
    }

    // ── Envoi du PDF ────────────────────────────────────────────────────────
    const filename = `${invoice.number.replace(/\//g, '-')}-facturx.pdf`;

    return new NextResponse(Buffer.from(facturXPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-FacturX-Version': getFacturXInfo().version,
        'X-FacturX-Profile': getFacturXInfo().profile,
      },
    });

  } catch (error) {
    console.error('Erreur inattendue:', error);
    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - Support CORS pour requêtes préflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
