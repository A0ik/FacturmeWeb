import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getLiaService } from '@/lib/services/lia-service';

/**
 * API Route - Modify Payslip
 *
 * Uses Lia (glm 4.5 via OpenRouter) to modify payslips while maintaining legal compliance
 * Optimized for 1000+ users
 *
 * POST /api/lia/payslip-modify
 *
 * Authentification required
 * Modifies French payslips according to user requests while respecting labor laws
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
    const { currentPayslip, requestedChanges, employeeData } = body;

    if (!currentPayslip || !requestedChanges) {
      return NextResponse.json(
        { error: 'Bulletin de paie et modifications requises' },
        { status: 400 }
      );
    }

    // ── Validate current payslip data ────────────────────────────────────────
    const requiredPayslipFields = ['salaireBrut', 'statut', 'periodeDebut', 'periodeFin'];
    const missingFields = requiredPayslipFields.filter(field => !currentPayslip[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Données du bulletin incomplètes', fields: missingFields },
        { status: 400 }
      );
    }

    // ── Modify payslip using Lia ─────────────────────────────────────────────
    const liaService = getLiaService();
    const modificationResult = await liaService.modifyPayslip({
      currentPayslip,
      requestedChanges,
      employeeData,
    });

    // ── Return result ────────────────────────────────────────────────────────
    return NextResponse.json(modificationResult);

  } catch (error) {
    console.error('Erreur modification bulletin:', error);
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
