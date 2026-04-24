// Moteur de règles métier basé sur le Code du travail français
// Source: LEGIFRANCE et Code du travail 2024

export interface LaborRule {
  id: string;
  category: 'cdd' | 'cdi' | 'alternance' | 'portage' | 'interim' | 'stage';
  title: string;
  description: string;
  isRequired: boolean;
  validation: (contractData: any) => { valid: boolean; error?: string };
  source?: string;
  articles?: string[];
}

export interface SectorRule {
  id: string;
  sector: string;
  collectiveAgreement: string;
  specificRules: string[];
  minSalary?: number;
  requiredBenefits: string[];
  documentation: string[];
}

// ========== RÈGLES CDD ==========
export const CDD_RULES: LaborRule[] = [
  {
    id: 'cdd_motif_obligatoire',
    category: 'cdd',
    title: 'Motif de recours au CDD',
    description: 'Le motif de recours au CDD doit être obligatoirement mentionné et correspondre à l\'un des cas prévus par la loi',
    isRequired: true,
    validation: (data) => {
      const validMotifs = [
        'remplacement', 'usage', 'objet_defini', 'accroissement',
        'saisonnier', 'temps_partiel', 'intermittent'
      ];
      if (!data.contractReason) {
        return { valid: false, error: 'Le motif du CDD est obligatoire' };
      }
      if (!validMotifs.includes(data.contractReason)) {
        return { valid: false, error: 'Le motif sélectionné n\'est pas valide' };
      }
      return { valid: true };
    },
    source: 'Article L1242-2 du Code du travail',
    articles: ['L1242-2', 'L1242-3', 'L1242-8-1']
  },
  {
    id: 'cdd_remplacement_info',
    category: 'cdd',
    title: 'Information sur le salarié remplacé',
    description: 'En cas de remplacement, le nom et la qualification du salarié remplacé doivent être mentionnés',
    isRequired: false,
    validation: (data) => {
      if (data.contractReason === 'remplacement' && !data.replacedEmployeeName) {
        return {
          valid: false,
          error: 'Le nom du salarié remplacé est obligatoire pour un CDD de remplacement'
        };
      }
      return { valid: true };
    },
    source: 'Article L1242-2 du Code du travail'
  },
  {
    id: 'cdd_date_fin_obligatoire',
    category: 'cdd',
    title: 'Date de fin de contrat',
    description: 'La date de fin du contrat doit être précisée (sauf CDD d\'usage ou objet défini)',
    isRequired: true,
    validation: (data) => {
      const exemptMotifs = ['usage', 'objet_defini'];
      if (!exemptMotifs.includes(data.contractReason) && !data.contractEndDate) {
        return {
          valid: false,
          error: 'La date de fin du contrat est obligatoire (sauf CDD d\'usage ou à objet défini)'
        };
      }
      if (data.contractEndDate && new Date(data.contractEndDate) <= new Date(data.contractStartDate)) {
        return {
          valid: false,
          error: 'La date de fin doit être postérieure à la date de début'
        };
      }
      return { valid: true };
    },
    source: 'Article L1242-8 du Code du travail'
  },
  {
    id: 'cdd_periode_essai',
    category: 'cdd',
    title: 'Période d\'essai',
    description: 'La durée de la période d\'essai ne peut excéder 1 jour par semaine de travail (max 1 mois pour CDD < 6 mois, 2 mois au-delà)',
    isRequired: true,
    validation: (data) => {
      if (!data.trialPeriodDays) return { valid: true }; // Pas obligatoire

      const startDate = new Date(data.contractStartDate);
      const endDate = data.contractEndDate ? new Date(data.contractEndDate) : null;
      const contractWeeks = endDate
        ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
        : 52;

      const maxDays = contractWeeks <= 26 ? contractWeeks : Math.min(contractWeeks, 14);
      const trialDays = parseInt(data.trialPeriodDays);

      if (trialDays > maxDays) {
        return {
          valid: false,
          error: `La période d'essai ne peut excéder ${maxDays} jours pour un contrat de ${contractWeeks} semaines`
        };
      }
      return { valid: true };
    },
    source: 'Article L1242-10 du Code du travail'
  },
  {
    id: 'cdd_renouvellement',
    category: 'cdd',
    title: 'Clause de renouvellement',
    description: 'Le renouvellement du CDD doit être prévu au contrat et respecter les durées maximales',
    isRequired: false,
    validation: () => ({ valid: true }),
    source: 'Article L1243-13 du Code du travail'
  },
  {
    id: 'cdd_prime_precarite',
    category: 'cdd',
    title: 'Prime de précarité (11%)',
    description: 'Sauf exception, une prime de précarité de 11% du total des rémunérations est due',
    isRequired: false,
    validation: () => ({ valid: true }),
    source: 'Article L1243-8 du Code du travail'
  }
];

// ========== RÈGLES CDI ==========
export const CDI_RULES: LaborRule[] = [
  {
    id: 'cdi_periode_essai',
    category: 'cdi',
    title: 'Période d\'essai',
    description: 'Durée maximale : 4 mois pour ouvriers/employés, 6 mois pour techniciens/agents de maîtrise, 8 mois pour cadres',
    isRequired: false,
    validation: (data) => {
      if (!data.trialPeriodDays) return { valid: true };

      const trialDays = parseInt(data.trialPeriodDays);
      const jobCategory = data.contractClassification?.toLowerCase() || '';

      let maxDays = 120; // 4 mois par défaut
      if (jobCategory.includes('cadre') || jobCategory.includes('ingénieur') || jobCategory.includes('directeur')) {
        maxDays = 240; // 8 mois
      } else if (jobCategory.includes('technicien') || jobCategory.includes('maîtrise') || jobCategory.includes('agent')) {
        maxDays = 180; // 6 mois
      }

      if (trialDays > maxDays) {
        return {
          valid: false,
          error: `La période d'essai ne peut excéder ${maxDays} jours pour cette catégorie de personnel`
        };
      }
      return { valid: true };
    },
    source: 'Article L1221-19 du Code du travail'
  },
  {
    id: 'cdi_temps_travail',
    category: 'cdi',
    title: 'Durée légale du travail',
    description: 'La durée légale du travail est de 35h par semaine (sauf dérogations)',
    isRequired: true,
    validation: (data) => {
      const hours = parseInt(data.workingHours) || 35;
      if (hours > 48) {
        return {
          valid: false,
          error: 'La durée hebdomadaire ne peut excéder 48h (durée maximale légale)'
        };
      }
      if (hours > 35 && hours <= 44) {
        return {
          valid: true,
          error: 'Attention : Durée supérieure à 35h, heures supplémentaires applicables'
        };
      }
      return { valid: true };
    },
    source: 'Article L3121-27 du Code du travail'
  },
  {
    id: 'cdi_salaire_min',
    category: 'cdi',
    title: 'Salaire minimum',
    description: 'Le salaire doit être au moins égal au SMIC ou au salaire minimum conventionnel',
    isRequired: true,
    validation: (data) => {
      const monthlySalary = parseFloat(data.salaryAmount) || 0;
      const SMIC_2024_HORAIRE = 11.65; // €/heure au 1er mai 2024
      const SMIC_2024_MENSUEL = 1766.92; // €/mois pour 35h

      if (data.salaryFrequency === 'hourly') {
        if (monthlySalary < SMIC_2024_HORAIRE) {
          return {
            valid: false,
            error: `Le salaire horaire ne peut être inférieur au SMIC (${SMIC_2024_HORAIRE} €/h)`
          };
        }
      } else {
        if (monthlySalary < SMIC_2024_MENSUEL) {
          return {
            valid: false,
            error: `Le salaire mensuel ne peut être inférieur au SMIC (${SMIC_2024_MENSUEL} €/mois pour 35h)`
          };
        }
      }
      return { valid: true };
    },
    source: 'Article L3231-12 du Code du travail'
  }
];

// ========== RÈGLES ALTERNANCE ==========
export const ALTERNANCE_RULES: LaborRule[] = [
  {
    id: 'alternance_tuteur_obligatoire',
    category: 'alternance',
    title: 'Désignation d\'un tuteur',
    description: "Un tuteur doit être désigné avec une expérience minimale de 2 ans dans l'entreprise",
    isRequired: true,
    validation: (data) => {
      if (!data.tutorName) {
        return {
          valid: false,
          error: 'La désignation d\'un tuteur est obligatoire pour les contrats d\'alternance'
        };
      }
      return { valid: true };
    },
    source: 'Article L6225-4 du Code du travail (apprentissage), D6231-1 (professionnalisation)'
  },
  {
    id: 'alternance_formation',
    category: 'alternance',
    title: 'Organisme de formation',
    description: "Le CFA ou l'organisme de formation doit être mentionné",
    isRequired: true,
    validation: (data) => {
      if (!data.schoolName) {
        return {
          valid: false,
          error: 'Le nom du CFA ou de l\'organisme de formation est obligatoire'
        };
      }
      return { valid: true };
    },
    source: 'Articles D6222-1 et D6231-1 du Code du travail'
  },
  {
    id: 'alternance_salaire',
    category: 'alternance',
    title: 'Salaire en alternance',
    description: 'Le salaire varie selon l\'âge et l\'année de formation (% du SMIC)',
    isRequired: true,
    validation: () => ({ valid: true }),
    source: 'Articles D6222-26 et D6232-8 du Code du travail'
  }
];

// ========== RÈGLES PORTAGE ==========
export const PORTAGE_RULES: LaborRule[] = [
  {
    id: 'portage_contrat_preavis',
    category: 'portage',
    title: 'Contrat de portage et préavis',
    description: 'Le contrat doit mentionner les modalités de préavis en cas de rupture',
    isRequired: true,
    validation: () => ({ valid: true }),
    source: 'Article L1254-2 du Code du travail'
  },
  {
    id: 'portage_marge_commerciale',
    category: 'portage',
    title: 'Marge commerciale',
    description: 'La commission de portage ne peut excéder 10% du revenu (sauf cas justifiés)',
    isRequired: true,
    validation: () => ({ valid: true }),
    source: 'Accords de branche et convention collective'
  }
];

// ========== SECTEURS D'ACTIVITÉ ==========
export const SECTOR_RULES: SectorRule[] = [
  {
    id: 'batiment',
    sector: 'BTP',
    collectiveAgreement: 'Convention collective nationale du bâtiment (IDCC 1596)',
    specificRules: [
      'Obligation de carte BTP',
      'Suivi des congés payés par caisse de congés payés',
      'Formation obligatoire (SSIAP, habilitation électrique, etc.)'
    ],
    minSalary: undefined,
    requiredBenefits: ['mutuelle', 'prevoyance'],
    documentation: ['carte_btp', 'attestation_formation', 'photo_identite']
  },
  {
    id: 'restauration',
    sector: 'Horeca',
    collectiveAgreement: 'Convention collective des hôtels, cafés, restaurants (IDCC 2216)',
    specificRules: [
      'Possibilité de déroger au repos quotidien',
      'Travail le dimanche possible',
      'Cueillette des pourboires'
    ],
    minSalary: undefined,
    requiredBenefits: ['mutuelle'],
    documentation: ['autorisation_travail_dimanche', 'registre_pourboires']
  },
  {
    id: 'sante',
    sector: 'Santé',
    collectiveAgreement: 'Convention collective de la santé (IDCC 3076)',
    specificRules: [
      'Obligation de vaccination spécifique',
      'Astreinte et gardes',
      'Temps partiel thérapeutique'
    ],
    minSalary: undefined,
    requiredBenefits: ['mutuelle', 'prevoyance'],
    documentation: ['carnet_vaccination', 'autorisation_astreinte']
  },
  {
    id: 'informatique',
    sector: 'Syntec',
    collectiveAgreement: 'Convention collective Syntec, ingénieurs, cadres (IDCC 1486)',
    specificRules: [
      'Forfaits jours',
      'Télétravail',
      'Clause de non-concurrence plus fréquente'
    ],
    minSalary: 2500,
    requiredBenefits: ['mutuelle', 'epargne', 'telephone'],
    documentation: ['accord_teletravail', 'forfait_jours']
  },
  {
    id: 'commerce',
    sector: 'Commerce',
    collectiveAgreement: 'Convention collective du commerce de détail (IDCC 2257)',
    specificRules: [
      'Travail le dimanche fréquent',
      'Heures supplémentaires courantes',
      'Saisonnalité'
    ],
    minSalary: undefined,
    requiredBenefits: ['mutuelle'],
    documentation: ['autorisation_travail_dimanche']
  },
  {
    id: 'industrie',
    sector: 'Métallurgie',
    collectiveAgreement: 'Convention collective nationale de la métallurgie (IDCC 1484)',
    specificRules: [
      'Travail en 3x8',
      'Prime de risque',
      'Classifications spécifiques'
    ],
    minSalary: 1800,
    requiredBenefits: ['mutuelle', 'prevoyance'],
    documentation: ['fiche_poste_risque']
  }
];

// Fonction de validation complète
export function validateContract(
  contractType: string,
  contractData: any,
  sector?: string
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Sélectionner les règles selon le type de contrat
  let rules: LaborRule[] = [];
  switch (contractType) {
    case 'cdd':
      rules = [...CDD_RULES];
      break;
    case 'cdi':
      rules = [...CDI_RULES];
      break;
    case 'apprentissage':
    case 'professionnalisation':
      rules = [...ALTERNANCE_RULES];
      break;
    case 'portage':
      rules = [...PORTAGE_RULES];
      break;
    default:
      if (contractType.startsWith('cdd') || contractType.includes('alternance')) {
        rules = [...CDD_RULES, ...ALTERNANCE_RULES];
      }
  }

  // Appliquer les règles de validation
  rules.forEach(rule => {
    if (rule.isRequired || shouldApplyRule(rule, contractData)) {
      const result = rule.validation(contractData);
      if (!result.valid) {
        errors.push(`${rule.title}: ${result.error}`);
      }
    }
  });

  // Vérifier les règles sectorielles
  if (sector) {
    const sectorRule = SECTOR_RULES.find(s => s.sector === sector);
    if (sectorRule) {
      // Vérifier les avantages obligatoires
      sectorRule.requiredBenefits.forEach(benefit => {
        const hasBenefit = benefit === 'transport' ? contractData.hasTransport :
                          benefit === 'meal' ? contractData.hasMeal :
                          benefit === 'health' ? contractData.hasHealth : false;
        if (!hasBenefit) {
          warnings.push(`Secteur ${sectorRule.sector}: L'avantage "${benefit}" est fortement recommandé par la convention collective`);
        }
      });

      // Vérifier le salaire minimum conventionnel
      if (sectorRule.minSalary && contractData.salaryAmount) {
        const salary = parseFloat(contractData.salaryAmount);
        if (salary < sectorRule.minSalary) {
          warnings.push(`Secteur ${sectorRule.sector}: Le salaire minimum conventionnel est de ${sectorRule.minSalary}€`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function shouldApplyRule(rule: LaborRule, data: any): boolean {
  // Logique pour déterminer si une règle s'applique
  if (rule.id === 'cdd_remplacement_info') {
    return data.contractReason === 'remplacement';
  }
  return false;
}

export function getSectorRules(sectorId: string): SectorRule | undefined {
  return SECTOR_RULES.find(s => s.id === sectorId);
}

export function getAllSectors() {
  return SECTOR_RULES;
}
