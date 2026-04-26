import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateContractHTML, ContractHtmlData } from '@/lib/contract-html-generator';
import { ContractTemplateData } from '@/lib/contract-pdf-server';
import htmlPdf from 'html-pdf-node';

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
      'companyName', 'companyAddress', 'companyPostalCode', 'companyCity', 'companySiret', 'employerName', 'employerTitle'
    ];

    const missingFields = requiredFields.filter(field => !(contractData as any)[field]);
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

    const htmlData: ContractHtmlData = {
      employeeFirstName: contractData.employeeFirstName,
      employeeLastName: contractData.employeeLastName,
      employeeAddress: contractData.employeeAddress,
      employeePostalCode: contractData.employeePostalCode,
      employeeCity: contractData.employeeCity,
      employeeEmail: contractData.employeeEmail,
      employeePhone: contractData.employeePhone,
      employeeBirthDate: contractData.employeeBirthDate,
      employeeSocialSecurity: contractData.employeeSocialSecurity,
      employeeNationality: contractData.employeeNationality,
      contractType: contractData.contractType,
      contractStartDate: contractData.contractStartDate,
      contractEndDate: contractData.contractEndDate,
      trialPeriodDays: contractData.trialPeriodDays,
      jobTitle: contractData.jobTitle,
      workLocation: contractData.workLocation,
      workSchedule: contractData.workSchedule,
      salaryAmount: contractData.salaryAmount,
      salaryFrequency: contractData.salaryFrequency,
      contractClassification: contractData.contractClassification,
      contractReason: contractData.contractReason,
      replacedEmployeeName: contractData.replacedEmployeeName,
      companyName: contractData.companyName,
      companyAddress: contractData.companyAddress,
      companyPostalCode: contractData.companyPostalCode,
      companyCity: contractData.companyCity,
      companySiret: contractData.companySiret,
      employerName: contractData.employerName,
      employerTitle: contractData.employerTitle,
      hasTransport: contractData.hasTransport,
      hasMeal: contractData.hasMeal,
      hasHealth: contractData.hasHealth,
      hasOther: contractData.hasOther,
      otherBenefits: contractData.otherBenefits,
      collectiveAgreement: contractData.collectiveAgreement,
      probationClause: contractData.probationClause,
      nonCompeteClause: contractData.nonCompeteClause,
      mobilityClause: contractData.mobilityClause,
      tutorName: contractData.tutorName,
      schoolName: contractData.schoolName,
      speciality: contractData.speciality,
      objectives: contractData.objectives,
      tasks: contractData.tasks,
      durationWeeks: contractData.durationWeeks,
      employerSignature: contractData.employerSignature,
      employeeSignature: contractData.employeeSignature,
    };

    const htmlContent = generateContractHTML(htmlData);

    const pdfBuffer = await htmlPdf.generatePdf(
      { content: htmlContent },
      {
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#888;padding:0 10mm;font-family:Arial,sans-serif;">
          ${contractData.companyName} — Page <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
      } as any
    );

    const contractLabels: Record<string, string> = {
      cdd: 'CDD', cdi: 'CDI', stage: 'Stage', apprentissage: 'Apprentissage',
      professionnalisation: 'Professionnalisation', interim: 'Interim', portage: 'Portage', freelance: 'Freelance'
    };
    const contractLabel = contractLabels[contractData.contractType] || 'Contrat';
    const employeeName = `${contractData.employeeLastName}-${contractData.employeeFirstName}`;
    const filename = `${contractLabel}_${employeeName}_${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(pdfBuffer, {
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
