import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generatePayslipPdfBuffer } from '@/lib/bulletin-paie-pdf-server';
import type { BulletinPaieData } from '@/lib/labor-law/bulletin-paie';

const FIELD_LABELS: Record<string, string> = {
  nom: 'Nom du salarié',
  prenom: 'Prénom du salarié',
  periodeDebut: 'Début de période',
  periodeFin: 'Fin de période',
  raisonSociale: 'Raison sociale de l\'entreprise',
  siret: 'SIRET',
  salaireBrut: 'Salaire brut',
  heuresMensuelles: 'Heures mensuelles',
  typeContrat: 'Type de contrat',
  statut: 'Statut (cadre/non-cadre)',
  adresse: 'Adresse du salarié',
  codePostal: 'Code postal du salarié',
  ville: 'Ville du salarié',
  adresseEntreprise: 'Adresse de l\'entreprise',
  codePostalEntreprise: 'Code postal de l\'entreprise',
  villeEntreprise: 'Ville de l\'entreprise',
  nir: 'N° sécurité sociale (NIR)',
  dateNaissance: 'Date de naissance',
  dateDebut: 'Date de début de contrat',
  classification: 'Classification / qualification',
  conventionCollective: 'Convention collective',
};

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

    const requiredFields: (keyof BulletinPaieData)[] = [
      'nom', 'prenom', 'periodeDebut', 'periodeFin',
      'raisonSociale', 'siret',
      'salaireBrut', 'heuresMensuelles',
      'typeContrat', 'statut',
    ];

    const missingFields = requiredFields.filter(field => {
      const val = payslipData[field];
      return val === undefined || val === null || val === '' || val === 0;
    });

    if (missingFields.length > 0) {
      const humanFields = missingFields.map(f => FIELD_LABELS[f] || f);
      return NextResponse.json(
        {
          error: `Champs obligatoires manquants : ${humanFields.join(', ')}`,
          fields: missingFields,
        },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('accent_color')
      .eq('id', user.id)
      .single();

    if (profile?.accent_color) {
      (payslipData as BulletinPaieData & { accentColor?: string }).accentColor = profile.accent_color;
    }

    // Provide defaults for fields required by the PDF generator that may be absent
    const defaults = {
      nir: '',
      dateNaissance: new Date().toISOString(),
      situationFamiliale: 'celibataire' as const,
      nombreEnfants: 0,
      dateDebut: payslipData.periodeDebut,
      classification: '',
      conventionCollective: '',
      coef: 0,
      salaireBrutAnnuel: payslipData.salaireBrut * 12,
      adresse: '',
      codePostal: '',
      ville: '',
      adresseEntreprise: '',
      codePostalEntreprise: '',
      villeEntreprise: '',
      urssaf: '',
      nombreJoursOuvres: 22,
    };
    const pdfData = { ...defaults, ...payslipData } as Parameters<typeof generatePayslipPdfBuffer>[0];

    const pdfBuffer = await generatePayslipPdfBuffer(pdfData);

    const periodeDebut = new Date(payslipData.periodeDebut);
    const monthName = periodeDebut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const filename = `Bulletin_Paie_${payslipData.nom}_${payslipData.prenom}_${monthName.replace(/ /g, '_')}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
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
