import { NextRequest, NextResponse } from 'next/server';
import { fetchSMICData, verifierSMIC } from '@/lib/labor-law/smic-service';

/**
 * GET - Récupère les données SMIC actuelles
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const amount = searchParams.get('amount');
    const type = searchParams.get('type') as 'horaire' | 'mensuel' | 'annuel' || 'mensuel';
    const hours = searchParams.get('hours');

    // Si un montant est fourni, vérifier la conformité
    if (amount) {
      const salaire = parseFloat(amount);
      const heuresHebdo = hours ? parseFloat(hours) : 35;

      const verification = await verifierSMIC(salaire, type, heuresHebdo);
      return NextResponse.json(verification);
    }

    // Sinon, retourner juste les données SMIC
    const smic = await fetchSMICData();
    return NextResponse.json(smic);
  } catch (error: any) {
    console.error('[SMIC API] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données SMIC' },
      { status: 500 }
    );
  }
}
