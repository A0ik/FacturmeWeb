import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generatePayslipPdfBuffer, BulletinPaieData } from '@/lib/bulletin-paie-pdf-server';

/**
 * API Route - Generate Payslip PDF
 *
 * Generates a downloadable PDF for French State compliant payslips using pdf-lib server-side
 * Conforms to articles R3243-1 et suivants du Code du travail français
 *
 * POST /api/payslips/pdf
 *
 * Authentification required
 * Generates legally compliant French payslips with all mandatory mentions
 */
export async function POST(req: NextRequest) {
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

    // ── Parse request body ───────────────────────────────────────────────────
    const body = await req.json();
    const payslipData: BulletinPaieData = body.payslip;

    if (!payslipData) {
      return NextResponse.json(
        { error: 'Données du bulletin manquantes' },
        { status: 400 }
      );
    }

    // ── Validate required fields ─────────────────────────────────────────────
    const requiredFields = [
      'nom', 'prenom', 'adresse', 'codePostal', 'ville', 'nir', 'dateNaissance',
      'typeContrat', 'dateDebut', 'statut', 'classification', 'conventionCollective',
      'salaireBrut', 'salaireBrutAnnuel', 'heuresMensuelles',
      'raisonSociale', 'siret', 'adresseEntreprise', 'codePostalEntreprise', 'villeEntreprise', 'urssaf',
      'periodeDebut', 'periodeFin', 'nombreJoursOuvres'
    ];

    const missingFields = requiredFields.filter(field => !(payslipData as any)[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants', fields: missingFields },
        { status: 400 }
      );
    }

    // ── Validate contract type ───────────────────────────────────────────────
    const validContractTypes = ['cdd', 'cdi', 'apprentissage', 'professionnalisation'];
    if (!validContractTypes.includes(payslipData.typeContrat)) {
      return NextResponse.json(
        { error: 'Type de contrat invalide', validTypes: validContractTypes },
        { status: 400 }
      );
    }

    // ── Validate NIR (Social Security number) ─────────────────────────────────
    if (payslipData.nir.length !== 15) {
      return NextResponse.json(
        { error: 'Le numéro de Sécurité sociale (NIR) doit comporter 15 chiffres' },
        { status: 400 }
      );
    }

    // ── Validate SIRET ───────────────────────────────────────────────────────
    if (payslipData.siret.length !== 14) {
      return NextResponse.json(
        { error: 'Le numéro SIRET doit comporter 14 chiffres' },
        { status: 400 }
      );
    }

    // ── Get user profile for accent color ──────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('accent_color')
      .eq('id', user.id)
      .single();

    if (profile?.accent_color) {
      payslipData.accentColor = profile.accent_color;
    }

    // ── Generate PDF ────────────────────────────────────────────────────────
    let pdfBuffer: Uint8Array;
    try {
      pdfBuffer = await generatePayslipPdfBuffer(payslipData);
    } catch (pdfError) {
      console.error('Erreur génération PDF bulletin:', pdfError);
      return NextResponse.json(
        {
          error: 'Erreur lors de la génération du PDF',
          details: pdfError instanceof Error ? pdfError.message : 'Erreur inconnue',
        },
        { status: 500 }
      );
    }

    // ── Generate filename ────────────────────────────────────────────────────
    const periodeDebut = new Date(payslipData.periodeDebut);
    const periodeFin = new Date(payslipData.periodeFin);
    const monthName = periodeDebut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const filename = `Bulletin_Paie_${payslipData.nom}_${payslipData.prenom}_${monthName.replace(/ /g, '_')}.pdf`;

    // ── Return PDF ───────────────────────────────────────────────────────────
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Erreur inattendue génération PDF bulletin:', error);
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
