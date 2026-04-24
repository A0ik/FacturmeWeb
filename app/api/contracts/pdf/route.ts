import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateContractPdfBuffer, ContractTemplateData } from '@/lib/contract-pdf-server';

/**
 * API Route - Generate Contract PDF
 *
 * Generates a downloadable PDF for labor contracts using pdf-lib server-side
 * Supports all contract types: CDD, CDI, stage, alternance, professionnalisation, interim, portage, freelance
 *
 * POST /api/contracts/pdf
 *
 * Authentification required
 * Generates legally compliant French labor contract PDFs with signature support
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
    const contractData: ContractTemplateData = body.contract;

    if (!contractData) {
      return NextResponse.json(
        { error: 'Données de contrat manquantes' },
        { status: 400 }
      );
    }

    // ── Validate required fields ─────────────────────────────────────────────
    const requiredFields = [
      'employeeFirstName', 'employeeLastName', 'employeeAddress', 'employeePostalCode', 'employeeCity',
      'employeeBirthDate', 'employeeNationality',
      'contractType', 'contractStartDate', 'jobTitle', 'workLocation', 'workSchedule', 'salaryAmount', 'salaryFrequency',
      'companyName', 'companyAddress', 'companyPostalCode', 'companyCity', 'companySiret', 'employerName', 'employerTitle'
    ];

    const missingFields = requiredFields.filter(field => !(contractData as any)[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants', fields: missingFields },
        { status: 400 }
      );
    }

    // ── Validate contract type ───────────────────────────────────────────────
    const validContractTypes = ['cdd', 'cdi', 'stage', 'apprentissage', 'professionnalisation', 'interim', 'portage', 'freelance'];
    if (!validContractTypes.includes(contractData.contractType)) {
      return NextResponse.json(
        { error: 'Type de contrat invalide', validTypes: validContractTypes },
        { status: 400 }
      );
    }

    // ── Validate salary frequency ─────────────────────────────────────────────
    const validSalaryFrequencies = ['monthly', 'hourly', 'weekly', 'flat_rate'];
    if (!validSalaryFrequencies.includes(contractData.salaryFrequency)) {
      return NextResponse.json(
        { error: 'Fréquence de salaire invalide', validFrequencies: validSalaryFrequencies },
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
      contractData.accentColor = profile.accent_color;
    }

    // ── Generate PDF ────────────────────────────────────────────────────────
    let pdfBuffer: Uint8Array;
    try {
      pdfBuffer = await generateContractPdfBuffer(contractData);
    } catch (pdfError) {
      console.error('Erreur génération PDF contrat:', pdfError);
      return NextResponse.json(
        {
          error: 'Erreur lors de la génération du PDF',
          details: pdfError instanceof Error ? pdfError.message : 'Erreur inconnue',
        },
        { status: 500 }
      );
    }

    // ── Generate filename ────────────────────────────────────────────────────
    const contractLabels: Record<string, string> = {
      cdd: 'CDD',
      cdi: 'CDI',
      stage: 'Stage',
      apprentissage: 'Apprentissage',
      professionnalisation: 'Professionnalisation',
      interim: 'Interim',
      portage: 'Portage',
      freelance: 'Freelance'
    };

    const contractLabel = contractLabels[contractData.contractType] || 'Contrat';
    const employeeName = `${contractData.employeeLastName}-${contractData.employeeFirstName}`;
    const filename = `${contractLabel}_${employeeName}_${new Date().toISOString().split('T')[0]}.pdf`;

    // ── Return PDF ───────────────────────────────────────────────────────────
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Erreur inattendue génération PDF contrat:', error);
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
