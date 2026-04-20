import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { generatePdfBuffer } from '@/lib/pdf';
import { createFacturXPdf, isFacturXEligible } from '@/lib/facturx';
import JSZip from 'jszip';

/**
 * API Route - Export en masse Factur-X
 *
 * Génère un fichier ZIP contenant plusieurs PDF Factur-X
 *
 * POST /api/export/facturx/batch
 *
 * Body : { invoiceIds: string[] }
 *
 * Authentification requise
 * Nécessite un abonnement Pro ou Business
 */
export async function POST(req: NextRequest) {
  console.log('[Factur-X Batch] Début export en masse');

  try {
    // ── Authentification ─────────────────────────────────────────────────────
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Factur-X Batch] Erreur authentification:', authError);
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // ── Vérification abonnement ───────────────────────────────────────────────
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profil introuvable' },
        { status: 404 }
      );
    }

    const tier = profile.subscription_tier || 'free';
    const isTrialActive = profile.is_trial_active || false;
    const hasAccess = isTrialActive || tier === 'pro' || tier === 'business';

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'Fonctionnalité non disponible',
          message: 'L\'export en masse Factur-X est réservé aux abonnements Pro et Business.',
        },
        { status: 403 }
      );
    }

    // ── Récupération des IDs de factures ────────────────────────────────────────
    const body = await req.json();
    const invoiceIds = body.invoiceIds as string[];

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: 'Aucune facture sélectionnée' },
        { status: 400 }
      );
    }

    if (invoiceIds.length > 100) {
      return NextResponse.json(
        { error: 'Limite dépassée', message: 'Maximum 100 factures par export' },
        { status: 400 }
      );
    }

    console.log('[Factur-X Batch] Factures demandées:', invoiceIds.length);

    // ── Récupération des factures ───────────────────────────────────────────────
    const { data: invoices, error: invoicesError } = await admin
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('user_id', user.id)
      .eq('document_type', 'invoice')
      .in('id', invoiceIds);

    if (invoicesError) {
      console.error('[Factur-X Batch] Erreur récupération factures:', invoicesError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des factures' },
        { status: 500 }
      );
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { error: 'Aucune facture trouvée' },
        { status: 404 }
      );
    }

    console.log('[Factur-X Batch] Factures récupérées:', invoices.length);

    // ── Filtrage et validation ─────────────────────────────────────────────────
    const eligibleInvoices = invoices.filter(inv => {
      const eligibility = isFacturXEligible(inv, profile);
      return eligibility.eligible;
    });

    if (eligibleInvoices.length === 0) {
      return NextResponse.json(
        {
          error: 'Aucune facture éligible',
          message: 'Aucune des factures sélectionnées ne peut être convertie au format Factur-X.',
        },
        { status: 400 }
      );
    }

    console.log('[Factur-X Batch] Factures éligibles:', eligibleInvoices.length);

    // ── Génération des PDF Factur-X ─────────────────────────────────────────────
    const zip = new JSZip();
    const results: {
      invoiceId: string;
      invoiceNumber: string;
      success: boolean;
      error?: string;
    }[] = [];

    for (const invoice of eligibleInvoices) {
      try {
        console.log('[Factur-X Batch] Génération:', invoice.number);

        // Génération PDF
        const pdfBuffer = await generatePdfBuffer(invoice, profile);

        // Conversion Factur-X
        const facturXPdfBytes = await createFacturXPdf(pdfBuffer, invoice, profile);

        // Ajout au ZIP
        const filename = `${invoice.number.replace(/\//g, '-')}-facturx.pdf`;
        zip.file(filename, facturXPdfBytes);

        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          success: true,
        });

      } catch (error) {
        console.error('[Factur-X Batch] Erreur pour', invoice.number, ':', error);
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
      }
    }

    // ── Génération du ZIP ──────────────────────────────────────────────────────
    console.log('[Factur-X Batch] Génération ZIP...');

    const zipBuffer = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    console.log('[Factur-X Batch] ZIP généré, taille:', zipBuffer.length, 'octets');

    // ── Envoi du ZIP ────────────────────────────────────────────────────────────
    const timestamp = new Date().toISOString().slice(0, 10);
    const zipFilename = `facturx-export-${timestamp}.zip`;

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new NextResponse(Buffer.from(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': zipBuffer.length.toString(),
        'X-FacturX-Total': results.length.toString(),
        'X-FacturX-Success': successCount.toString(),
        'X-FacturX-Failure': failureCount.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('[Factur-X Batch] Erreur inattendue:', error);
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
 * OPTIONS - Support CORS
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
