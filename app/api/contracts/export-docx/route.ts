import { NextRequest, NextResponse } from 'next/server';
import { generateContractDOCX } from '@/lib/labor-law/docx-export-service';

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
      contractType: 'cdi' as const,
      contractStartDate: new Date().toISOString().split('T')[0],
      jobTitle: 'Poste',
      workLocation: 'Lieu',
      workSchedule: '35h',
      salaryAmount: '2000',
      salaryFrequency: 'monthly' as const,
      companyName: 'Entreprise',
      companyAddress: 'Adresse',
      companyPostalCode: '75000',
      companyCity: 'Paris',
      companySiret: '12345678901234',
      employerName: 'Employeur',
      employerTitle: 'Gérant',
    };

    const mergedData = { ...defaults, ...contractData };

    // Nettoyer les données pour correspondre à l'interface ContractData
    const cleanData = {
      ...mergedData,
      contractEndDate: mergedData.contractEndDate || undefined,
      trialPeriodDays: mergedData.trialPeriodDays || undefined,
      trialPeriodRenewable: mergedData.trialPeriodRenewable || false,
      contractClassification: mergedData.contractClassification || undefined,
      contractCoefficient: mergedData.contractCoefficient || undefined,
      contractClassificationCode: mergedData.contractClassificationCode || undefined,
      contractReason: mergedData.contractReason || undefined,
      replacedEmployeeName: mergedData.replacedEmployeeName || undefined,
      companyAPE: mergedData.companyAPE || undefined,
      companyRCS: mergedData.companyRCS || undefined,
      employerTitle: mergedData.employerTitle || 'Gérant',
      collectiveAgreement: mergedData.collectiveAgreement || undefined,
      collectiveAgreementIdcc: mergedData.collectiveAgreementIdcc || undefined,
      probationClause: mergedData.probationClause || false,
      nonCompeteClause: mergedData.nonCompeteClause || false,
      nonCompeteDuration: mergedData.nonCompeteDuration || undefined,
      nonCompeteArea: mergedData.nonCompeteArea || undefined,
      nonCompeteCompensation: mergedData.nonCompeteCompensation || undefined,
      mobilityClause: mergedData.mobilityClause || false,
      mobilityArea: mergedData.mobilityArea || undefined,
      confidentialityClause: mergedData.confidentialityClause || false,
      hasTransport: mergedData.hasTransport || false,
      hasMeal: mergedData.hasMeal || false,
      hasHealth: mergedData.hasHealth || false,
      hasOther: mergedData.hasOther || false,
      otherBenefits: mergedData.otherBenefits || undefined,
      tutorName: mergedData.tutorName || undefined,
      schoolName: mergedData.schoolName || undefined,
      speciality: mergedData.speciality || undefined,
      objectives: mergedData.objectives || undefined,
      tasks: mergedData.tasks || undefined,
      durationWeeks: mergedData.durationWeeks || undefined,
      signatureCity: mergedData.signatureCity || mergedData.companyCity || 'Paris',
      signatureDate: mergedData.signatureDate || new Date().toISOString().split('T')[0],
    };

    const docxBlob = await generateContractDOCX(cleanData);

    const contractLabels: Record<string, string> = {
      cdd: 'CDD', cdi: 'CDI', stage: 'Stage', apprentissage: 'Apprentissage',
      professionnalisation: 'Professionnalisation', interim: 'Interim', portage: 'Portage', freelance: 'Freelance',
    };
    const contractLabel = contractLabels[cleanData.contractType] || 'Contrat';
    const employeeName = `${cleanData.employeeLastName}-${cleanData.employeeFirstName}`;
    const filename = `Contrat_${contractLabel}_${employeeName}_${new Date().toISOString().split('T')[0]}.docx`;

    return new NextResponse(docxBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Erreur génération DOCX contrat:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
