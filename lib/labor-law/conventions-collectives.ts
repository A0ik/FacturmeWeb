/**
 * Système de configuration des conventions collectives
 * Permet de configurer des bulletins de paie spécifiques selon la convention collective
 */

export interface ConventionCollectiveConfig {
  id: string;
  nom: string;
  idcc?: string;
  // Taux de cotisation accident du travail (variable selon la convention)
  tauxAccidentTravail: number; // en % (ex: 0.70 pour 0.70%)
  // Paniers repas
  paniersRepas?: {
    enabled: boolean;
    montantUnitaire?: number; // Montant du panier repas en €
    nombreJours?: number; // Nombre de jours par mois
    contributionEmployeur?: number; // Part employeur en %
    contributionSalarie?: number; // Part salarié en %
  };
  // Tickets restaurant
  ticketsRestaurant?: {
    montantUnitaireMax?: number; // Montant max par ticket (ex: 11.50€)
    partEmployeurMin?: number; // Part employeur minimum en % (ex: 50%)
  };
  // Heures supplémentaires
  heuresSupplementaires?: {
    tauxMajoration25?: number; // Taux de majoration à 25% (défaut: 1.25)
    tauxMajoration50?: number; // Taux de majoration à 50% (défaut: 1.50)
    contingentHeures?: number; // Contingent annuel (défaut: 220h)
  };
  // Primes spécifiques
  primesSpecifiques?: {
    primeAnciennete?: {
      enabled: boolean;
      barème?: Array<{ anciennete: number; taux: number }>; // ancienneté en années, taux en %
    };
    primeDimanche?: {
      enabled: boolean;
      taux?: number; // % du salaire horaire
    };
    primeFeries?: {
      enabled: boolean;
      taux?: number; // % du salaire horaire
    };
    primeNuit?: {
      enabled: boolean;
      taux?: number; // % du salaire horaire
    };
  };
  // Réduction Fillon
  reductionFillon?: {
    separationUrssafRetraite?: boolean; // Séparer URSSAF et Retraite
    tauxUrssaf?: number; // Part URSSAF en % (si séparé)
    tauxRetraite?: number; // Part Retraite en % (si séparé)
  };
  // Cotisations spécifiques
  cotisationsSpecifiques?: {
    prevoyance?: number; // en % du salaire brut
    mutuelle?: {
      baseCalcul?: string; // 'plafond_ss' ou 'salaire_brut'
      tauxEmployeur?: number; // en %
      tauxSalarie?: number; // en %
    };
  };
}

/**
 * Configurations préétablies pour les conventions collectives courantes
 */
export const CONVENTIONS_CONFIG: Record<string, ConventionCollectiveConfig> = {
  // Restauration rapide (HCR - Hôtels, Cafés, Restaurants)
  'restaurants': {
    id: 'restaurants',
    nom: 'Hôtels, Cafés, Restaurants (HCR)',
    idcc: '2216',
    tauxAccidentTravail: 1.20, // Taux plus élevé pour la restauration
    paniersRepas: {
      enabled: true,
      montantUnitaire: 8.50, // Montant moyen d'un panier repas
      nombreJours: 20, // 20 jours travaillés par mois en moyenne
      contributionEmployeur: 100, // 100% pris en charge par l'employeur
      contributionSalarie: 0,
    },
    ticketsRestaurant: {
      montantUnitaireMax: 11.50,
      partEmployeurMin: 50,
    },
    heuresSupplementaires: {
      tauxMajoration25: 1.25,
      tauxMajoration50: 1.50,
      contingentHeures: 220,
    },
    primesSpecifiques: {
      primeAnciennete: {
        enabled: true,
        barème: [
          { anciennete: 0, taux: 0 },
          { anciennete: 1, taux: 1 },
          { anciennete: 3, taux: 2 },
          { anciennete: 5, taux: 3 },
          { anciennete: 10, taux: 5 },
        ],
      },
      primeDimanche: {
        enabled: true,
        taux: 100, // 100% de majoration pour le travail le dimanche
      },
      primeFeries: {
        enabled: true,
        taux: 100, // 100% de majoration pour les jours fériés
      },
      primeNuit: {
        enabled: true,
        taux: 20, // 20% de majoration pour le travail de nuit
      },
    },
    reductionFillon: {
      separationUrssafRetraite: true,
      tauxUrssaf: 0.859, // 85.9% de la réduction pour l'URSSAF
      tauxRetraite: 0.141, // 14.1% de la réduction pour la retraite
    },
  },

  // Bâtiment
  'batiment': {
    id: 'batiment',
    nom: 'Bâtiment',
    idcc: '1596',
    tauxAccidentTravail: 2.50, // Taux élevé pour le BTP
    paniersRepas: {
      enabled: true,
      montantUnitaire: 9.00,
      nombreJours: 20,
      contributionEmployeur: 100,
      contributionSalarie: 0,
    },
    ticketsRestaurant: {
      montantUnitaireMax: 11.50,
      partEmployeurMin: 50,
    },
    heuresSupplementaires: {
      tauxMajoration25: 1.25,
      tauxMajoration50: 1.50,
      contingentHeures: 220,
    },
    primesSpecifiques: {
      primeAnciennete: {
        enabled: true,
        barème: [
          { anciennete: 0, taux: 0 },
          { anciennete: 2, taux: 1 },
          { anciennete: 5, taux: 2 },
          { anciennete: 10, taux: 3 },
          { anciennete: 15, taux: 5 },
        ],
      },
    },
    reductionFillon: {
      separationUrssafRetraite: false, // Pas de séparation pour le bâtiment
    },
  },

  // Commerce de détail
  'commerce': {
    id: 'commerce',
    nom: 'Commerce de détail et de gros',
    idcc: '1549',
    tauxAccidentTravail: 0.70, // Taux moyen
    ticketsRestaurant: {
      montantUnitaireMax: 11.50,
      partEmployeurMin: 50,
    },
    primesSpecifiques: {
      primeAnciennete: {
        enabled: true,
        barème: [
          { anciennete: 0, taux: 0 },
          { anciennete: 3, taux: 1 },
          { anciennete: 5, taux: 2 },
          { anciennete: 10, taux: 3 },
        ],
      },
    },
    reductionFillon: {
      separationUrssafRetraite: false,
    },
  },

  // Convention collective par défaut
  'default': {
    id: 'default',
    nom: 'Convention collective par défaut',
    tauxAccidentTravail: 0.70, // Taux moyen national
    ticketsRestaurant: {
      montantUnitaireMax: 11.50,
      partEmployeurMin: 50,
    },
    reductionFillon: {
      separationUrssafRetraite: false,
    },
  },
};

/**
 * Récupère la configuration d'une convention collective
 * @param conventionId Identifiant de la convention ('restaurants', 'batiment', etc.)
 * @returns Configuration de la convention collective
 */
export function getConventionConfig(conventionId?: string): ConventionCollectiveConfig {
  if (!conventionId) return CONVENTIONS_CONFIG['default'];
  return CONVENTIONS_CONFIG[conventionId] || CONVENTIONS_CONFIG['default'];
}

/**
 * Liste de toutes les conventions collectives disponibles
 */
export function getConventionsList(): ConventionCollectiveConfig[] {
  return Object.values(CONVENTIONS_CONFIG).filter(c => c.id !== 'default');
}

/**
 * Calcule la prime d'ancienneté selon la convention collective
 * @param salaireBrut Salaire brut mensuel
 * @param anciennete Années d'ancienneté
 * @param conventionId Identifiant de la convention
 * @returns Montant de la prime d'ancienneté
 */
export function calculerPrimeAnciennete(
  salaireBrut: number,
  anciennete: number,
  conventionId?: string
): number {
  const config = getConventionConfig(conventionId);
  const barème = config.primesSpecifiques?.primeAnciennete;

  if (!barème || !barème.enabled) return 0;

  // Trouver le taux applicable
  let tauxApplicable = 0;
  for (const tranche of barème.barème || []) {
    if (anciennete >= tranche.anciennete) {
      tauxApplicable = tranche.taux;
    }
  }

  return (salaireBrut * tauxApplicable) / 100;
}

/**
 * Calcule le montant des paniers repas selon la convention
 * @param conventionId Identifiant de la convention
 * @param joursTravailles Nombre de jours travaillés dans le mois
 * @returns Montant total des paniers repas et répartition employeur/salarié
 */
export function calculerPaniersRepas(
  conventionId?: string,
  joursTravailles: number = 20
): { total: number; partEmployeur: number; partSalarie: number } {
  const config = getConventionConfig(conventionId);
  const paniers = config.paniersRepas;

  if (!paniers || !paniers.enabled) {
    return { total: 0, partEmployeur: 0, partSalarie: 0 };
  }

  const montantUnitaire = paniers.montantUnitaire || 8.50;
  const nombreJours = paniers.nombreJours || joursTravailles;

  const total = montantUnitaire * nombreJours;
  const partEmployeur = total * ((paniers.contributionEmployeur || 0) / 100);
  const partSalarie = total * ((paniers.contributionSalarie || 0) / 100);

  return { total, partEmployeur, partSalarie };
}

/**
 * Types de conventions pour le sélecteur
 */
export type ConventionType =
  | 'default'
  | 'restaurants'
  | 'batiment'
  | 'commerce';

export const CONVENTION_LABELS: Record<ConventionType, string> = {
  'default': 'Convention collective par défaut',
  'restaurants': 'Hôtels, Cafés, Restaurants (HCR)',
  'batiment': 'Bâtiment',
  'commerce': 'Commerce de détail et de gros',
};

/**
 * Taux d'accident du travail par secteur d'activité (indicatifs)
 * L'utilisateur peut toujours personnaliser ce taux
 */
export const TAUX_AT_REFERENCES = {
  moyen: 0.70,
  restauration: 1.20,
  batiment: 2.50,
  industrie: 1.50,
  transport: 1.80,
  sante: 0.90,
  bureau: 0.40,
  commerce: 0.70,
} as const;

/**
 * Aide l'utilisateur à choisir le bon taux AT
 * @param activite Secteur d'activité
 * @returns Taux d'accident du travail recommandé
 */
export function getRecommandationTauxAT(activite: string): number {
  const activiteLower = activite.toLowerCase();

  if (activiteLower.includes('restaurant') || activiteLower.includes('café') || activiteLower.includes('hotel') || activiteLower.includes('restauration')) {
    return TAUX_AT_REFERENCES.restauration;
  }
  if (activiteLower.includes('bâtiment') || activiteLower.includes('construction') || activiteLower.includes('travaux publics')) {
    return TAUX_AT_REFERENCES.batiment;
  }
  if (activiteLower.includes('industrie') || activiteLower.includes('usine') || activiteLower.includes('fabrication')) {
    return TAUX_AT_REFERENCES.industrie;
  }
  if (activiteLower.includes('transport') || activiteLower.includes('logistique')) {
    return TAUX_AT_REFERENCES.transport;
  }
  if (activiteLower.includes('santé') || activiteLower.includes('hôpital') || activiteLower.includes('clinique')) {
    return TAUX_AT_REFERENCES.sante;
  }
  if (activiteLower.includes('bureau') || activiteLower.includes('admin') || activiteLower.includes('services')) {
    return TAUX_AT_REFERENCES.bureau;
  }
  if (activiteLower.includes('commerce') || activiteLower.includes('boutique') || activiteLower.includes('magasin')) {
    return TAUX_AT_REFERENCES.commerce;
  }

  return TAUX_AT_REFERENCES.moyen;
}

/**
 * Liste des taux AT avec descriptions pour l'aide contextuelle
 */
export function getTauxATOptions(): Array<{ valeur: number; description: string; exemple: string }> {
  return [
    { valeur: 0.40, description: 'Taux très faible', exemple: 'Bureaux, administration' },
    { valeur: 0.70, description: 'Taux moyen national', exemple: 'Commerce, services' },
    { valeur: 0.90, description: 'Taux modéré', exemple: 'Santé, social' },
    { valeur: 1.20, description: 'Taux élevé', exemple: 'Restaurants, hôtels' },
    { valeur: 1.50, description: 'Taux élevé', exemple: 'Industrie légère' },
    { valeur: 1.80, description: 'Taux très élevé', exemple: 'Transport, logistique' },
    { valeur: 2.50, description: 'Taux maximum', exemple: 'BTP, construction' },
  ];
}
