import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getLiaService } from '@/lib/services/lia-service';

/**
 * API Route - Verify Contract Conformity
 *
 * Uses Lia (glm 4.5 via OpenRouter) to verify French labor contract conformity
 * Optimized for 1000+ users
 *
 * POST /api/lia/contract-conformity
 *
 * Authentification required
 * Verifies contract conformity according to French Labor Code 2024
 */
export async function POST(req: NextRequest) {
  try {
    // ── Authentification ─────────────────────────────────────────────────────
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // ── Parse request body ───────────────────────────────────────────────────
    const body = await req.json();
    const { contractType, contractData, contractContent } = body;

    if (!contractType || !contractData) {
      return NextResponse.json(
        { error: 'Type de contrat et données requis' },
        { status: 400 }
      );
    }

    // ── Validate contract type ───────────────────────────────────────────────
    const validContractTypes = ['cdd', 'cdi', 'stage', 'apprentissage', 'professionnalisation', 'interim', 'portage', 'freelance'];
    if (!validContractTypes.includes(contractType)) {
      return NextResponse.json(
        { error: 'Type de contrat invalide', validTypes: validContractTypes },
        { status: 400 }
      );
    }

    // ── Verify contract conformity using Lia ─────────────────────────────────
    const liaService = getLiaService();
    const conformityResult = await liaService.verifyContractConformity({
      contractType,
      contractData,
      contractContent,
    });

    // ── Return result ────────────────────────────────────────────────────────
    return NextResponse.json(conformityResult);

  } catch (error) {
    console.error('Erreur vérification conformité contrat:', error);
    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - Support CORS pour requêtes préflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
