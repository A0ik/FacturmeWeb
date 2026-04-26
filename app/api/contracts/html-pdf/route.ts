import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateContract } from '@/lib/labor-law/contract-templates';
import type { ContractTemplateData } from '@/lib/labor-law/contract-templates';

/**
 * API Route - Generate Contract PDF from HTML Template
 *
 * Cette API utilise le MÊME template que l'aperçu HTML
 * pour garantir que le PDF est IDENTIQUE à l'aperçu
 *
 * POST /api/contracts/html-pdf
 */
export async function POST(req: NextRequest) {
  try {
    // Authentification
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const contractData: ContractTemplateData = body.contract;

    if (!contractData) {
      return NextResponse.json(
        { error: 'Données de contrat manquantes' },
        { status: 400 }
      );
    }

    // Récupérer la couleur de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('accent_color')
      .eq('id', user.id)
      .single();

    // Générer le HTML avec le MÊME template que l'aperçu
    const htmlContent = generateContract({
      ...contractData,
      accentColor: profile?.accent_color || contractData.accentColor
    });

    // Retourner le HTML avec les headers pour impression
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="contrat.pdf"`,
      },
    });

  } catch (error) {
    console.error('Erreur génération HTML contrat:', error);
    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
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
