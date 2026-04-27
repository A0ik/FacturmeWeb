/**
 * Service de vérification dynamique du SMIC
 * Récupère les valeurs officielles depuis l'API gouvernementale
 * Avec cache et fallback pour garantir la disponibilité
 */

// Cache en mémoire (TTL: 24 heures)
let smicCache: {
  data: SMICData | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures
const SMIC_API_URL = 'https://api.insee.fr/v1/series/001688220'; // Série INSEE officielle

export interface SMICData {
  horaire: number;      // SMIC horaire en euros
  mensuel: number;      // SMIC mensuel (35h) en euros
  annuel: number;       // SMIC annuel en euros
  dateMiseAJour: string; // Date de mise à jour
  source: string;       // Source de la donnée
}

export interface SMICVerificationResult {
  actuel: SMICData;
  seuil: number;
  conforme: boolean;
  difference: number;
  message: string;
}

// Valeurs de fallback 2026 (mises à jour manuellement)
const SMIC_2026_FALLBACK: SMICData = {
  horaire: 11.65,
  mensuel: 1766.92,
  annuel: 21203.04,
  dateMiseAJour: '2026-01-01',
  source: 'Valeur légale 2026 (fallback)'
};

/**
 * Récupère les données SMIC depuis l'API INSEE avec cache
 */
export async function fetchSMICData(): Promise<SMICData> {
  const now = Date.now();

  // Vérifier le cache
  if (smicCache.data && (now - smicCache.timestamp) < CACHE_TTL) {
    return smicCache.data;
  }

  try {
    // Tentative de récupération depuis l'API INSEE
    const response = await fetch(SMIC_API_URL, {
      headers: {
        'Accept': 'application/json',
        // Note: En production, il faudrait une clé API INSEE
      },
      next: { revalidate: 86400 } // Cache Next.js 24h
    });

    if (response.ok) {
      const data = await response.json();
      const smicData: SMICData = {
        horaire: parseFloat(data.lastValue) || SMIC_2026_FALLBACK.horaire,
        mensuel: parseFloat(data.lastValue) * 151.67 || SMIC_2026_FALLBACK.mensuel,
        annuel: (parseFloat(data.lastValue) * 151.67 * 12) || SMIC_2026_FALLBACK.annuel,
        dateMiseAJour: data.lastUpdate || new Date().toISOString().split('T')[0],
        source: 'INSEE - API officielle'
      };

      // Mettre à jour le cache
      smicCache = { data: smicData, timestamp: now };
      return smicData;
    }
  } catch (error) {
    console.warn('[SMIC Service] Impossible de récupérer les données depuis l\'API INSEE, utilisation du fallback:', error);
  }

  // Fallback sur les valeurs 2026
  const fallbackData = { ...SMIC_2026_FALLBACK };
  smicCache = { data: fallbackData, timestamp: now };
  return fallbackData;
}

/**
 * Vérifie si un salaire est conforme au SMIC
 */
export async function verifierSMIC(
  salaire: number,
  type: 'horaire' | 'mensuel' | 'annuel' = 'mensuel',
  heuresHebdomadaires: number = 35
): Promise<SMICVerificationResult> {
  const smic = await fetchSMICData();

  // Calculer le seuil applicable
  let seuil: number;
  switch (type) {
    case 'horaire':
      seuil = smic.horaire;
      break;
    case 'mensuel':
      seuil = (smic.horaire * heuresHebdomadaires * 52) / 12; // SMIC mensuel selon heures
      break;
    case 'annuel':
      seuil = smic.annuel;
      break;
  }

  const conforme = salaire >= seuil;
  const difference = salaire - seuil;

  return {
    actuel: smic,
    seuil,
    conforme,
    difference,
    message: conforme
      ? `Le salaire est conforme au SMIC (${seuil.toFixed(2)}€ ${type})`
      : `Le salaire est inférieur au SMIC (${seuil.toFixed(2)}€ ${type}). Écart: ${difference.toFixed(2)}€`
  };
}

/**
 * Calcule le salaire minimum selon le type de contrat
 */
export async function calculerSalaireMinimum(
  typeContrat: 'cdi' | 'cdd' | 'stage' | 'apprentissage' | 'professionnalisation',
  statut: 'cadre' | 'non_cadre' | 'alternance',
  age: number,
  heuresHebdomadaires: number = 35
): Promise<{ montant: number; source: string; details: string }> {
  const smic = await fetchSMICData();
  let montant = smic.mensuel;
  let details = `SMIC mensuel de base (${smic.mensuel.toFixed(2)}€ pour 35h)`;

  // Apprentissage : % du SMIC selon l'âge et l'année
  if (typeContrat === 'apprentissage') {
    const ageKey = Math.min(age, 30);
    const pourcentages: Record<number, number> = {
      16: 25, 17: 29, 18: 37, 19: 43, 20: 49,
      21: 53, 22: 57, 23: 61, 24: 65, 25: 69,
      26: 73, 27: 77, 28: 81, 29: 85, 30: 89
    };
    const pourcentage = pourcentages[ageKey] || 89;
    montant = smic.mensuel * (pourcentage / 100);
    details = `${pourcentage}% du SMIC (${montant.toFixed(2)}€) - ${age} ans`;
    return {
      montant,
      source: 'Articles D6222-26 et D6232-8 du Code du travail',
      details
    };
  }

  // Professionnalisation : 80% du SMIC minimum
  if (typeContrat === 'professionnalisation') {
    montant = smic.mensuel * 0.80;
    details = `80% du SMIC (${montant.toFixed(2)}€) - minimum légal`;
    return {
      montant,
      source: 'Articles L6325-1 et suivants du Code du travail',
      details
    };
  }

  // Temps partiel : prorata
  if (heuresHebdomadaires < 35) {
    montant = (smic.horaire * heuresHebdomadaires * 52) / 12;
    details = `SMIC proratisé (${montant.toFixed(2)}€) - ${heuresHebdomadaires}h/semaine`;
    return {
      montant,
      source: 'Article L3121-27 du Code du travail',
      details
    };
  }

  // Stage : gratification obligatoire si > 2 mois
  if (typeContrat === 'stage') {
    const montantHoraire = smic.horaire * 0.15; // 15% du SMIC horaire 2026
    montant = montantHoraire * 151.67; // Mensuel (35h)
    details = `Gratification minimale (15% SMIC horaire = ${montant.toFixed(2)}€)`;
    return {
      montant,
      source: 'Article L124-6 du Code de l\'éducation',
      details
    };
  }

  // CDI/CDD : SMIC complet
  return {
    montant,
    source: 'Article L3231-12 du Code du travail',
    details
  };
}

/**
 * Formatage des données SMIC pour l'affichage
 */
export function formatSMICData(smic: SMICData): string {
  return `SMIC ${smic.dateMiseAJour.split('-')[0]} : ${smic.horaire.toFixed(2)}€/h | ${smic.mensuel.toFixed(2)}€/mois (35h) | ${smic.annuel.toFixed(2)}€/an\nSource: ${smic.source}`;
}

/**
 * Endpoint API pour récupérer les données SMIC (à utiliser dans /api/smic/route.ts)
 */
export async function GET() {
  try {
    const smic = await fetchSMICData();
    return Response.json(smic);
  } catch (error) {
    return Response.json(
      { error: 'Impossible de récupérer les données SMIC', fallback: SMIC_2026_FALLBACK },
      { status: 500 }
    );
  }
}
