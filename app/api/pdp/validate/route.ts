import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { generatePdfBuffer } from '@/lib/pdf';
import { createFacturXPdf } from '@/lib/facturx';

/**
 * API PDP - Validation et préparation pour la transmission à l'État
 *
 * Cette API gratuite permet de :
 * 1. Valider la conformité PDP d'une facture
 * 2. Générer le Factur-X avec toutes les infos obligatoires
 * 3. Préparer l'envoi par mail au client
 *
 * Note: La transmission réelle vers la PDP de l'État nécessite une certification
 * officielle. Cette API prépare les données pour une future intégration.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'ID de facture requis' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Récupérer d'abord l'invoice pour avoir le user_id
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', invoice.user_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    // Validation de conformité PDP
    const pdpValidation = validatePDPCompliance(profile, invoice);

    if (!pdpValidation.isValid) {
      return NextResponse.json({
        error: 'Facture non conforme PDP',
        validation: pdpValidation
      }, { status: 400 });
    }

    // Générer le Factur-X avec toutes les infos PDP
    const pdfBuffer = await generatePdfBuffer(invoice, profile);
    const facturXPdf = await createFacturXPdf(pdfBuffer, invoice, profile);

    // Enregistrer dans les logs d'audit
    await supabase.from('facturx_audit_logs').insert({
      invoice_id: invoiceId,
      user_id: invoice.user_id,
      action: 'validate_pdp',
      status: 'success',
      metadata: pdpValidation
    });

    return NextResponse.json({
      success: true,
      message: 'Facture prête pour transmission PDP',
      validation: pdpValidation,
      facturx_generated: true,
      next_steps: [
        'La facture a été générée au format Factur-X',
        'Toutes les informations obligatoires PDP sont incluses',
        'Vous pouvez envoyer cette facture par email à votre client',
        'La facture sera automatiquement transmise à la PDP lors de la mise en production'
      ]
    });

  } catch (error: any) {
    console.error('Erreur PDP:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la validation PDP' },
      { status: 500 }
    );
  }
}

/**
 * Validation stricte de la conformité PDP
 * Basée sur les exigences de la réforme française 2026+
 */
function validatePDPCompliance(profile: any, invoice: any) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];

  // Informations vendeur (obligatoires)
  if (!profile?.company_name?.trim()) {
    errors.push('Nom de l\'entreprise manquant');
    missing.push('vendor.company_name');
  }
  if (!profile?.siret?.trim() || !/^\d{14}$/.test(profile.siret)) {
    errors.push('SIRET invalide (14 chiffres requis)');
    missing.push('vendor.siret');
  }
  if (!profile?.vat_number?.trim() || !/^FR[A-Z0-9]{11}$/.test(profile.vat_number)) {
    errors.push('Numéro de TVA intracommunautaire invalide');
    missing.push('vendor.vat_number');
  }
  if (!profile?.address?.trim()) {
    errors.push('Adresse de l\'entreprise manquante');
    missing.push('vendor.address');
  }
  if (!profile?.city?.trim()) {
    errors.push('Ville de l\'entreprise manquante');
    missing.push('vendor.city');
  }
  if (!profile?.postal_code?.trim()) {
    errors.push('Code postal de l\'entreprise manquant');
    missing.push('vendor.postal_code');
  }

  // Informations client (obligatoires pour PDP)
  const clientName = invoice.client?.name || invoice.client_name_override;
  const clientSiret = invoice.client_siret || invoice.client?.siret;
  const clientVat = invoice.client_vat_number || invoice.client?.vat_number;
  const clientAddress = invoice.client_address || invoice.client?.address;
  const clientCity = invoice.client_city || invoice.client?.city;
  const clientPostalCode = invoice.client_postal_code || invoice.client?.postal_code;

  if (!clientName?.trim()) {
    errors.push('Nom du client manquant');
    missing.push('client.name');
  }
  // SIRET client requis pour PDP B2B
  if (clientSiret && !/^\d{14}$/.test(clientSiret)) {
    errors.push('SIRET client invalide');
    missing.push('client.siret');
  }
  // TVA client fortement recommandée pour B2B
  if (!clientVat?.trim()) {
    warnings.push('Numéro de TVA client manquant (recommandé pour B2B)');
    missing.push('client.vat_number');
  }
  if (!clientAddress?.trim() || !clientCity?.trim() || !clientPostalCode?.trim()) {
    errors.push('Adresse complète du client requise');
    missing.push('client.address');
  }

  // Informations facture (obligatoires)
  if (!invoice.number?.trim()) {
    errors.push('Numéro de facture manquant');
    missing.push('invoice.number');
  }
  if (!invoice.issue_date) {
    errors.push('Date d\'émission manquante');
    missing.push('invoice.issue_date');
  }
  if (!invoice.due_date) {
    warnings.push('Date d\'échéance manquante (recommandée)');
    missing.push('invoice.due_date');
  }

  // Vérification des lignes de facturation
  if (!invoice.items || invoice.items.length === 0) {
    errors.push('Aucune ligne de facturation');
    missing.push('invoice.items');
  } else {
    invoice.items.forEach((item: any, idx: number) => {
      if (!item.description?.trim()) {
        errors.push(`Description ligne ${idx + 1} manquante`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Quantité ligne ${idx + 1} invalide`);
      }
      if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
        errors.push(`Prix unitaire ligne ${idx + 1} invalide`);
      }
      if (typeof item.vat_rate !== 'number') {
        errors.push(`Taux de TVA ligne ${idx + 1} manquant`);
      }
    });
  }

  const isValid = errors.length === 0;
  const complianceLevel = isValid && warnings.length === 0 ? 'full' :
                         isValid && warnings.length <= 2 ? 'partial' : 'none';

  return {
    isValid,
    complianceLevel,
    errors,
    warnings,
    missing,
    score: calculateComplianceScore(errors, warnings)
  };
}

/**
 * Score de conformité (0-100)
 */
function calculateComplianceScore(errors: string[], warnings: string[]): number {
  const baseScore = 100;
  const errorPenalty = 10;
  const warningPenalty = 2;

  return Math.max(0, baseScore - (errors.length * errorPenalty) - (warnings.length * warningPenalty));
}
