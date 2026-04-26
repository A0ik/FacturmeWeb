import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateContractHTML, ContractHtmlData } from '@/lib/contract-html-generator';

/**
 * API Route - Generate Contract PDF with NEW Design
 *
 * Generates a downloadable PDF for labor contracts using the new HTML template
 * Supports all contract types: CDD, CDI, stage, alternance, etc.
 *
 * POST /api/contracts/new-pdf
 *
 * Returns HTML that can be printed/saved as PDF with the new elegant design
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
    const contractData: ContractHtmlData = body.contract;

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

    // ── Generate HTML ────────────────────────────────────────────────────────
    let htmlContent: string;
    try {
      htmlContent = generateContractHTML(contractData);
    } catch (htmlError) {
      console.error('Erreur génération HTML contrat:', htmlError);
      return NextResponse.json(
        {
          error: 'Erreur lors de la génération du HTML',
          details: htmlError instanceof Error ? htmlError.message : 'Erreur inconnue',
        },
        { status: 500 }
      );
    }

    // ── Return HTML (for print/save as PDF) ───────────────────────────────────
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Erreur inattendue génération HTML contrat:', error);
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
