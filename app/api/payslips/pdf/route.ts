import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generatePayslipPdfBuffer } from '@/lib/bulletin-paie-pdf-server';
import type { BulletinPaieData } from '@/lib/labor-law/bulletin-paie';

// Mapping des champs vers des labels lisibles en français
const FIELD_LABELS: Record<string, string> = {
  nom: 'Nom du salarié',
  prenom: 'Prénom du salarié',
  periodeDebut: 'Date de début de période',
  periodeFin: 'Date de fin de période',
  raisonSociale: 'Raison sociale de l\'entreprise',
  siret: 'Numéro SIRET de l\'entreprise',
  salaireBrut: 'Montant du salaire brut',
  heuresMensuelles: 'Nombre d\'heures mensuelles',
  typeContrat: 'Type de contrat (CDI, CDD, etc.)',
  statut: 'Statut du salarié (cadre, non-cadre)',
  adresse: 'Adresse du salarié',
  codePostal: 'Code postal du salarié',
  ville: 'Ville du salarié',
  adresseEntreprise: 'Adresse de l\'entreprise',
  codePostalEntreprise: 'Code postal de l\'entreprise',
  villeEntreprise: 'Ville de l\'entreprise',
  nir: 'Numéro de Sécurité sociale (NIR)',
  dateNaissance: 'Date de naissance du salarié',
  dateDebut: 'Date de début du contrat',
  classification: 'Classification / qualification du poste',
  conventionCollective: 'Convention collective applicable',
};

export async function POST(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié', details: 'Vous devez être connecté pour générer un bulletin de paie. Veuillez vous connecter et réessayer.' },
        { status: 401 }
      );
    }

    // Parsing du corps de la requête
    let body: any;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Format de requête invalide', details: 'Le corps de la requête n\'est pas un JSON valide.' },
        { status: 400 }
      );
    }

    const payslipData: BulletinPaieData = body.payslip;

    if (!payslipData) {
      return NextResponse.json(
        { error: 'Données du bulletin manquantes', details: 'Le champ "payslip" est requis dans le corps de la requête.' },
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
      const humanFields = missingFields.map(f => FIELD_LABELS[f] || f);
      return NextResponse.json(
        {
          error: `Champs obligatoires manquants : ${humanFields.join(', ')}`,
          details: `Veuillez remplir tous les champs obligatoires avant de générer le bulletin. Champs manquants : ${humanFields.join(', ')}.`,
          fields: missingFields,
        },
        { status: 400 }
      );
    }

    // Validation spécifique pour NIR (numéro de sécurité sociale)
    if (payslipData.nir && payslipData.nir.length !== 15) {
      return NextResponse.json(
        {
          error: 'Numéro de Sécurité sociale invalide',
          details: `Le NIR (numéro de Sécurité sociale) doit contenir exactement 15 chiffres. Valeur actuelle : ${payslipData.nir} (${payslipData.nir.length} caractères). Format attendu : 12345678901234.`,
          field: 'nir'
        },
        { status: 400 }
      );
    }

    // Validation spécifique pour SIRET
    if (payslipData.siret && payslipData.siret.length !== 14) {
      return NextResponse.json(
        {
          error: 'Numéro SIRET invalide',
          details: `Le SIRET doit contenir exactement 14 chiffres. Valeur actuelle : ${payslipData.siret} (${payslipData.siret.length} caractères). Format attendu : 12345678900012.`,
          field: 'siret'
        },
        { status: 400 }
      );
    }

    // Validation du salaire brut
    if (payslipData.salaireBrut <= 0) {
      return NextResponse.json(
        {
          error: 'Salaire brut invalide',
          details: `Le salaire brut doit être supérieur à 0. Valeur actuelle : ${payslipData.salaireBrut} €.`,
          field: 'salaireBrut'
        },
        { status: 400 }
      );
    }

    // Récupération de la couleur de l'utilisateur
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
      // Continue without accent color - not a critical error
    }

    // Application de la couleur aux données
    const payslipDataWithColor = {
      ...payslipData,
      ...(accentColor && { accentColor })
    };

    // Valeurs par défaut pour les champs optionnels manquants
    const defaults = {
      nir: '',
      dateNaissance: new Date().toISOString(),
      situationFamiliale: 'celibataire' as const,
      nombreEnfants: 0,
      dateDebut: payslipData.periodeDebut,
      classification: '',
      conventionCollective: '',
      coef: 100,
      salaireBrutAnnuel: (payslipData.salaireBrut || 0) * 12,
      adresse: '',
      codePostal: '',
      ville: '',
      adresseEntreprise: payslipData.adresseEntreprise || '',
      codePostalEntreprise: payslipData.codePostalEntreprise || '',
      villeEntreprise: payslipData.villeEntreprise || '',
      urssaf: payslipData.siret || '',
      nombreJoursOuvres: 22,
      accentColor: accentColor,
    };

    const pdfData = { ...defaults, ...payslipDataWithColor } as Parameters<typeof generatePayslipPdfBuffer>[0];

    // Génération du PDF
    let pdfBuffer: Uint8Array;
    try {
      pdfBuffer = await generatePayslipPdfBuffer(pdfData);
    } catch (pdfError) {
      console.error('Erreur génération PDF bulletin:', pdfError);
      return NextResponse.json(
        {
          error: 'Erreur lors de la génération du PDF',
          details: pdfError instanceof Error ? pdfError.message : 'Une erreur inconnue est survenue lors de la génération du PDF. Veuillez réessayer ou contacter le support si le problème persiste.',
          technicalError: pdfError instanceof Error ? pdfError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Génération du nom de fichier
    let filename: string;
    try {
      const periodeDebut = new Date(payslipData.periodeDebut);
      if (isNaN(periodeDebut.getTime())) {
        throw new Error('Date de début invalide');
      }
      const monthName = periodeDebut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const safeNom = (payslipData.nom || 'salarie').replace(/[^a-zA-Z0-9À-ÿ]/g, '_');
      const safePrenom = (payslipData.prenom || 'prenom').replace(/[^a-zA-Z0-9À-ÿ]/g, '_');
      filename = `Bulletin_Paie_${safeNom}_${safePrenom}_${monthName.replace(/ /g, '_')}.pdf`;
    } catch (filenameError) {
      filename = `Bulletin_Paie_${Date.now()}.pdf`;
    }

    // Envoi de la réponse PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Erreur inattendue lors de la génération du bulletin:', error);
    return NextResponse.json(
      {
        error: 'Erreur serveur inattendue',
        details: error instanceof Error ? error.message : 'Une erreur inattendue est survenue. Veuillez réessayer ou contacter le support.',
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
