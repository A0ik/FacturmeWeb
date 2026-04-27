import { NextRequest, NextResponse } from 'next/server';
import { generateContractDOCX } from '@/lib/labor-law/docx-export-service';

export async function POST(req: NextRequest) {
  try {
    const contractData = await req.json();

    // Validation basique
    if (!contractData.contractType || !contractData.employeeFirstName || !contractData.employeeLastName) {
      return NextResponse.json(
        { error: 'Données du contrat incomplètes' },
        { status: 400 }
      );
    }

    // Générer le DOCX
    const docxBlob = await generateContractDOCX(contractData);

    // Retourner le fichier
    return new NextResponse(docxBlob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Contrat_${contractData.contractType}_${contractData.employeeLastName}.docx"`
      }
    });
  } catch (error: any) {
    console.error('[Contract DOCX Export] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la génération du DOCX' },
      { status: 500 }
    );
  }
}
