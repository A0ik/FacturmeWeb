import { NextRequest, NextResponse } from 'next/server';
import { generateContractPdfBuffer } from '@/lib/contract-pdf-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const contractData = body.contract || body;

    if (!contractData) {
      return NextResponse.json({ error: 'Données de contrat manquantes' }, { status: 400 });
    }

    // Valeurs par défaut pour les tests
    const defaults = {
      employeeFirstName: 'Prénom',
      employeeLastName: 'Nom',
      employeeAddress: 'Adresse',
      employeePostalCode: '75000',
      employeeCity: 'Paris',
      employeeBirthDate: '2000-01-01',
      employeeNationality: 'Française',
      contractType: 'cdi',
      contractStartDate: new Date().toISOString().split('T')[0],
      jobTitle: 'Poste',
      workLocation: 'Lieu',
      workSchedule: '35h',
      salaryAmount: '2000',
      salaryFrequency: 'monthly',
      companyName: 'Entreprise',
      companyAddress: 'Adresse',
      companyPostalCode: '75000',
      companyCity: 'Paris',
      companySiret: '12345678901234',
      employerName: 'Employeur',
      employerTitle: 'Gérant',
    };

    const mergedData = { ...defaults, ...contractData };

    const pdfBuffer = await generateContractPdfBuffer(mergedData);

    const contractLabels: Record<string, string> = {
      cdd: 'CDD', cdi: 'CDI', stage: 'Stage', apprentissage: 'Apprentissage',
      professionnalisation: 'Professionnalisation', interim: 'Interim', portage: 'Portage', freelance: 'Freelance',
    };
    const contractLabel = contractLabels[mergedData.contractType] || 'Contrat';
    const employeeName = `${mergedData.employeeLastName}-${mergedData.employeeFirstName}`;
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
