import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { genererBulletinPaieHTML } from '@/lib/labor-law/bulletin-paie';
import type { BulletinPaieData } from '@/lib/labor-law/bulletin-paie';
import htmlPdf from 'html-pdf-node';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const payslipData: BulletinPaieData = body.payslip;

    if (!payslipData) {
      return NextResponse.json({ error: 'Données du bulletin manquantes' }, { status: 400 });
    }

    const requiredFields = [
      'nom', 'prenom', 'periodeDebut', 'periodeFin',
      'raisonSociale', 'siret',
      'salaireBrut', 'heuresMensuelles',
      'typeContrat', 'statut',
    ];

    const missingFields = requiredFields.filter(field => !(payslipData as any)[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants', fields: missingFields },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('accent_color')
      .eq('id', user.id)
      .single();

    if (profile?.accent_color) {
      (payslipData as any).accentColor = profile.accent_color;
    }

    const htmlContent = genererBulletinPaieHTML(payslipData);

    const pdfBuffer = await htmlPdf.generatePdf(
      { content: htmlContent },
      {
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
      }
    );

    const periodeDebut = new Date(payslipData.periodeDebut);
    const monthName = periodeDebut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const filename = `Bulletin_Paie_${payslipData.nom}_${payslipData.prenom}_${monthName.replace(/ /g, '_')}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Erreur génération PDF bulletin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF', details: error instanceof Error ? error.message : 'Erreur inconnue' },
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
