import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateContractPdfBuffer, ContractTemplateData } from '@/lib/contract-pdf-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const contractData: ContractTemplateData = body.contract;

    if (!contractData) {
      return NextResponse.json({ error: 'Données de contrat manquantes' }, { status: 400 });
    }

    const requiredFields = [
      'employeeFirstName', 'employeeLastName', 'employeeAddress', 'employeePostalCode', 'employeeCity',
      'employeeBirthDate', 'employeeNationality',
      'contractType', 'contractStartDate', 'jobTitle', 'workLocation', 'workSchedule', 'salaryAmount', 'salaryFrequency',
      'companyName', 'companyAddress', 'companyPostalCode', 'companyCity', 'companySiret', 'employerName', 'employerTitle',
    ];

    const missingFields = requiredFields.filter(field => !(contractData as unknown as Record<string, unknown>)[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants', fields: missingFields },
        { status: 400 }
      );
    }

    const validContractTypes = ['cdd', 'cdi', 'stage', 'apprentissage', 'professionnalisation', 'interim', 'portage', 'freelance'];
    if (!validContractTypes.includes(contractData.contractType)) {
      return NextResponse.json({ error: 'Type de contrat invalide' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('accent_color')
      .eq('id', user.id)
      .single();

    if (profile?.accent_color) {
      contractData.accentColor = profile.accent_color;
    }

    const pdfBuffer = await generateContractPdfBuffer(contractData);

    const contractLabels: Record<string, string> = {
      cdd: 'CDD', cdi: 'CDI', stage: 'Stage', apprentissage: 'Apprentissage',
      professionnalisation: 'Professionnalisation', interim: 'Interim', portage: 'Portage', freelance: 'Freelance',
    };
    const contractLabel = contractLabels[contractData.contractType] || 'Contrat';
    const employeeName = `${contractData.employeeLastName}-${contractData.employeeFirstName}`;
    const filename = `${contractLabel}_${employeeName}_${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Erreur génération PDF contrat:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
