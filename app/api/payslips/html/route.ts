import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { genererBulletinPaieHTML } from '@/lib/labor-law/bulletin-paie';
import type { BulletinPaieData } from '@/lib/labor-law/bulletin-paie';

/**
 * API Route - Generate Payslip HTML for printing
 *
 * Cette API retourne le HTML du bulletin de paie
 * pour impression directe dans le navigateur
 *
 * POST /api/payslips/html
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié', details: 'Vous devez être connecté pour générer un bulletin de paie.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const payslipData: BulletinPaieData = body.payslip;

    if (!payslipData) {
      return NextResponse.json(
        { error: 'Données du bulletin manquantes', details: 'Le champ "payslip" est requis.' },
        { status: 400 }
      );
    }

    // Validation des champs obligatoires
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
      return NextResponse.json(
        {
          error: `Champs obligatoires manquants : ${missingFields.join(', ')}`,
          details: `Veuillez remplir tous les champs obligatoires. Champs manquants : ${missingFields.join(', ')}.`,
          fields: missingFields,
        },
        { status: 400 }
      );
    }

    // Récupérer la couleur de l'utilisateur
    let accentColor: string | undefined;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('accent_color')
        .eq('id', user.id)
        .single();

      if (profile?.accent_color) {
        accentColor = profile.accent_color;
      }
    } catch (profileError) {
      console.warn('Failed to fetch user profile for accent color:', profileError);
    }

    // Ajouter la couleur aux données
    const payslipDataWithColor = {
      ...payslipData,
      ...(accentColor && { accentColor })
    };

    // Générer le HTML
    const htmlContent = genererBulletinPaieHTML(payslipDataWithColor);

    // Retourner le HTML pour impression
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="Bulletin_Paie_${payslipData.nom}_${payslipData.prenom}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Erreur génération bulletin de paie:', error);
    return NextResponse.json(
      {
        error: 'Erreur serveur inattendue',
        details: error instanceof Error ? error.message : 'Une erreur inattendue est survenue.',
        technicalError: error instanceof Error ? error.message : 'Unknown error'
      },
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
