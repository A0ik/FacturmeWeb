// Taux de cotisations sociales 2026 (France)
// Source: URSSAF, Code de la Sécurité sociale

export interface CotisationData {
  salaireBrut: number;
  salaireBrutAnnuel: number;
  statut: 'cadre' | 'non_cadre' | 'alternance' | 'stage';
  tempsPartiel?: boolean;
  heureSupplementaire?: number;
  region?: 'alsace_moselle' | 'normal';
}

export interface CotisationResult {
  patronales: {
    maladie: number;
    vieillesse: number;
    allocations_familiales: number;
    accident_du_travail: number;
    solidarite_autonomie: number;
    fnal: number;
    chomage: number;
    retraite_cadres: number;
    ags: number;
    formation: number;
    prevoyance: number;
    supplementaire_sante: number;
    penibilite: number;
    transport: number;
    total: number;
    reduction_fillon: number; // Réduction générale des cotisations (ex-Fillon)
  };
  salariales: {
    maladie: number;
    vieillesse: number;
    retraite_cadres: number;
    chomage: number;
    ags: number;
    csg_crds: number;
    csg_deductible: number;
    csg_non_deductible: number;
    crds: number;
    total: number;
  };
  salaireNet: number;
  salaireNetImposable: number;
  coutEmployer: number;
  coutEmployerAvantReduction: number;
}

// Taux de cotisations 2026 (en %) - Sources officielles URSSAF/Code de la Sécurité sociale
const TAUX_2026 = {
  patronales: {
    maladie: 13.00, // Maladie-Maternité-Invalidité-Décès
    vieillesse: 10.55, // Vieillesse plafonnée (8.55%) + déplafonnée (2.00%)
    allocations_familiales: 3.45, // Allocations familiales (taux 2025-2026)
    accident_du_travail: 0.70, // Taux moyen (variable selon risque, 0.4% à 3.2%)
    solidarite_autonomie: 0.30,
    fnal: 0.10, // Fond National d'Aide au Logement (< 50 salariés) ou 0.50% (≥ 50)
    chomage: 4.05, // Assurance chômage (taux 2025-2026)
    retraite_cadres: 1.29, // AGIRC-ARRCO pour cadres (tranche 1)
    ags: 0.15, // Association pour la Gestion du Structure des Finances
    formation: 0.55, // Taxe d'apprentissage etc. (taux minimum)
    prevoyance: 1.50, // Prévoyance obligatoire pour cadres
    supplementaire_sante: 0.60, // Complémentaire santé (minimum)
    penibilite: 0.10, // Pour les salariés exposés (2ème-4ème facteurs)
  },
  salariales: {
    maladie: 0.00, // Supprimée depuis 1998
    vieillesse: 6.93, // Vieillesse plafonnée (6.93%)
    vieillesse_deplafonnee: 0.40, // Vieillesse déplafonnée (0.40%)
    retraite_cadres: 0.86, // AGIRC-ARRCO cadres tranche 1
    chomage: 0.00, // Cotisation salariale chômage supprimée depuis 2019
    ags: 0.00, // AGS est exclusivement patronale
    csg: 9.20, // CSG totale (6.80% déductible + 2.40% non déductible)
    crds: 0.50, // CRDS (0.50% non déductible)
  },
  plafonds: {
    mensuel_ss: 3666, // Plafond SS mensuel 2026 (estimation basée sur 2025)
    annuel_ss: 43992, // Plafond SS annuel 2026
    cadre: 8 * 3666, // 8x le plafond SS pour les cadres
    tranche2: 8 * 3666, // Tranche 2 AGIRC-ARRCO
  }
};

// SMIC 2026 - Taux horaire officiel
const SMIC_HORAIRE_2026 = 11.65; // €/heure
const SMIC_MENSUEL_2026 = 1766.92; // €/mois pour 35h (base 151.67h)

// Calcul des cotisations
export function calculerCotisations(data: CotisationData): CotisationResult {
  const { salaireBrut, salaireBrutAnnuel, statut } = data;
  const plafondMensuel = TAUX_2026.plafonds.mensuel_ss;

  // === COTISATIONS PATRONALES ===

  // Maladie (sur salaire brut)
  const maladiePatronale = salaireBrut * (TAUX_2026.patronales.maladie / 100);

  // Vieillesse (sur salaire brut, dans la limite du plafond)
  const vieillessePatronale = Math.min(salaireBrut, plafondMensuel) * (TAUX_2026.patronales.vieillesse / 100);

  // Allocations familiales (sur salaire brut)
  const allocationsFamiliales = salaireBrut * (TAUX_2026.patronales.allocations_familiales / 100);

  // Accident du travail
  const accidentDuTravail = salaireBrut * (TAUX_2026.patronales.accident_du_travail / 100);

  // Solidarité autonomie
  const solidariteAutonomie = salaireBrut * (TAUX_2026.patronales.solidarite_autonomie / 100);

  // FNAL
  const fnal = salaireBrut * (TAUX_2026.patronales.fnal / 100);

  // Chômage (sur salaire brut, plafonné à 4x le plafond SS)
  const plafondChomage = 4 * plafondMensuel;
  const chomage = Math.min(salaireBrut, plafondChomage) * (TAUX_2026.patronales.chomage / 100);

  // Retraite cadres (AGIRC)
  let retraiteCadres = 0;
  if (statut === 'cadre') {
    // Sur la tranche 1 (jusqu'au plafond SS)
    retraiteCadres += Math.min(salaireBrut, plafondMensuel) * 1.29 / 100;
    // Sur la tranche 2 (entre 1 et 8x le plafond SS)
    const tranche2 = Math.max(0, Math.min(salaireBrut, 8 * plafondMensuel) - plafondMensuel);
    retraiteCadres += tranche2 * 11.49 / 100;
  }

  // AGS
  const ags = salaireBrut * (TAUX_2026.patronales.ags / 100);

  // Formation
  const formation = salaireBrut * (TAUX_2026.patronales.formation / 100);

  // Prévoyance
  const prevoyance = salaireBrut * (TAUX_2026.patronales.prevoyance / 100);

  // Complémentaire santé
  const sante = salaireBrut * (TAUX_2026.patronales.supplementaire_sante / 100);

  // Pénibilité
  const penibilite = salaireBrut * (TAUX_2026.patronales.penibilite / 100);

  // Transport (forfait)
  const transport = salaireBrut * 0.005; // 0.5% environ

  // Total patronal
  const totalPatronal = maladiePatronale + vieillessePatronale + allocationsFamiliales +
    accidentDuTravail + solidariteAutonomie + fnal + chomage + retraiteCadres +
    ags + formation + prevoyance + sante + penibilite + transport;

  // === COTISATIONS SALARIALES ===

  // Maladie
  const maladieSalariale = Math.min(salaireBrut, plafondMensuel) * (TAUX_2026.salariales.maladie / 100);

  // Vieillesse
  const vieillesseSalariale = Math.min(salaireBrut, plafondMensuel) * (TAUX_2026.salariales.vieillesse / 100);
  const vieillesseDeplafonneeSalariale = salaireBrut * (TAUX_2026.salariales.vieillesse_deplafonnee / 100);

  // Retraite cadres (AGIRC)
  let retraiteCadresSalariale = 0;
  if (statut === 'cadre') {
    retraiteCadresSalariale = Math.min(salaireBrut, plafondMensuel) * (TAUX_2026.salariales.retraite_cadres / 100);
  }

  // Chômage (Maintenant à 0.00% pour la part salariale)
  const chomageSalarial = salaireBrut * (TAUX_2026.salariales.chomage / 100);

  // AGS (Uniquement patronale)
  const agsSalarial = salaireBrut * (TAUX_2026.salariales.ags / 100);

  // CSG + CRDS (sur 98.25% du salaire brut) - 2025/2026
  const baseCSG = salaireBrut * 0.9825;
  const csgDeductible = baseCSG * 6.80 / 100; // 6.80% déductible
  const csgNonDeductible = baseCSG * 2.40 / 100; // 2.40% non déductible
  const crds = baseCSG * 0.50 / 100; // 0.50% CRDS non déductible
  const csgCrds = csgDeductible + csgNonDeductible + crds;

  // Total salarial
  const totalSalarial = maladieSalariale + vieillesseSalariale + vieillesseDeplafonneeSalariale + retraiteCadresSalariale +
    chomageSalarial + agsSalarial + csgCrds;

  // === SALAIRES ===

  const salaireNet = salaireBrut - totalSalarial;

  // Salaire net imposable (sans la CSG déductible, donc on l'ajoute)
  const salaireNetImposable = salaireBrut - totalSalarial + csgDeductible;

  // Coût employeur (avant réduction Fillon)
  const coutEmployerAvantReduction = salaireBrut + totalPatronal;

  // === RÉDUCTION FILLON (2025-2026) ===
  // Devenue réduction générale des cotisations
  const calculerReductionFillon = (salaireBrut: number, nombreSalaries: number = 1): number => {
    if (salaireBrut >= SMIC_MENSUEL_2026 * 1.6) return 0; // Pas de réduction au-dessus de 1.6 SMIC

    const smicMensuel = SMIC_MENSUEL_2026;
    const coefficient = (salaireBrut / smicMensuel) * 1.6 - 1;

    // Taux maximum de réduction
    const tauxMax = nombreSalaries < 50 ? 0.3195 : 0.3195;

    // La réduction est plafonnée
    const reduction = salaireBrut * Math.max(0, Math.min(coefficient / 0.6, tauxMax));

    return reduction;
  };

  const reductionFillon = calculerReductionFillon(salaireBrut);

  // Coût employeur final (avec réduction Fillon)
  const coutEmployer = coutEmployerAvantReduction - reductionFillon;

  return {
    patronales: {
      maladie: maladiePatronale,
      vieillesse: vieillessePatronale,
      allocations_familiales: allocationsFamiliales,
      accident_du_travail: accidentDuTravail,
      solidarite_autonomie: solidariteAutonomie,
      fnal,
      chomage,
      retraite_cadres: retraiteCadres,
      ags,
      formation,
      prevoyance,
      supplementaire_sante: sante,
      penibilite,
      transport,
      total: totalPatronal,
      reduction_fillon: reductionFillon,
    },
    salariales: {
      maladie: maladieSalariale,
      vieillesse: vieillesseSalariale + vieillesseDeplafonneeSalariale,
      retraite_cadres: retraiteCadresSalariale,
      chomage: chomageSalarial,
      ags: agsSalarial,
      csg_crds: csgCrds,
      csg_deductible: csgDeductible,
      csg_non_deductible: csgNonDeductible,
      crds: crds,
      total: totalSalarial,
    },
    salaireNet,
    salaireNetImposable,
    coutEmployer,
    coutEmployerAvantReduction,
  };
}

// Calcul pour alternance (taux réduits)
export function calculerCotisationsAlternance(salaireBrut: number, type: 'apprentissage' | 'professionnalisation'): CotisationResult {
  if (type === 'apprentissage') {
    // Apprentissage: quasi aucune cotisation patronale
    const cotisations: CotisationResult = {
      patronales: {
        maladie: 0,
        vieillesse: 0,
        allocations_familiales: 0,
        accident_du_travail: salaireBrut * 0.011, // 1.1%
        solidarite_autonomie: 0,
        fnal: 0,
        chomage: 0,
        retraite_cadres: 0,
        ags: 0,
        formation: salaireBrut * 0.0055, // 0.55%
        prevoyance: 0,
        supplementaire_sante: 0,
        penibilite: 0,
        transport: 0,
        total: salaireBrut * 0.0166,
        reduction_fillon: 0,
      },
      salariales: {
        maladie: 0,
        vieillesse: 0,
        retraite_cadres: 0,
        chomage: 0,
        ags: 0,
        csg_crds: 0,
        csg_deductible: 0,
        csg_non_deductible: 0,
        crds: 0,
        total: 0,
      },
      salaireNet: salaireBrut,
      salaireNetImposable: salaireBrut,
      coutEmployer: salaireBrut * 1.0166,
      coutEmployerAvantReduction: salaireBrut * 1.0166,
    };
    return cotisations;
  }

  // Professionnalisation: taux réduits pendant la formation
  return calculerCotisations({
    salaireBrut,
    salaireBrutAnnuel: salaireBrut * 12,
    statut: 'non_cadre',
  });
}

// SMIC 2026
export const SMIC_2026 = {
  horaire: 11.65, // €/heure (taux officiel 2025-2026)
  mensuel_35h: 1766.92, // €/mois pour 35h hebdomadaires (151.67h)
  mensuel_39h: 1969.15, // €/mois pour 39h (4h supp majorées à 110%)
  annuel: 21148.92, // €/an (1766.92 × 12)
};

// Fonction pour calculer la réduction Fillon séparément
export function calculerReductionFillon(
  salaireBrut: number,
  nombreSalaries: number = 50,
  tempsPartiel: boolean = false,
  heuresHebdo: number = 35
): { montant: number; coefficient: number; details: string } {
  if (salaireBrut <= 0) {
    return { montant: 0, coefficient: 0, details: 'Salaire nul ou négatif' };
  }

  // Ajustement du SMIC pour temps partiel
  let smicMensuel = SMIC_2026.mensuel_35h;
  if (tempsPartiel) {
    smicMensuel = smicMensuel * (heuresHebdo / 35);
  }

  // Vérifier si éligible (< 1.6 SMIC)
  if (salaireBrut >= smicMensuel * 1.6) {
    return { montant: 0, coefficient: 0, details: 'Salaire ≥ 1.6 SMIC (non éligible)' };
  }

  // Calcul du coefficient
  const ratio = salaireBrut / smicMensuel;
  const coefficient = Math.min((ratio * 1.6 - 1) / 0.6, nombreSalaries < 50 ? 0.3195 : 0.3195);

  // Montant de la réduction
  const montant = salaireBrut * Math.max(0, coefficient);

  return {
    montant,
    coefficient,
    details: `Ratio: ${ratio.toFixed(3)}, Coefficient: ${coefficient.toFixed(4)}`
  };
}

// Salaires minimums par âge pour apprentissage
export const SALAIRE_APPRENTIAGE = {
  avant_18_ans: 0.27, // % du SMIC
  entre_18_20_ans: 0.43,
  entre_21_25_ans: 0.53,
  plus_26_ans: 1.00, // 100% du SMIC
};

// Fonction pour calculer le salaire minimum selon l'âge
export function getSalaireMinimumAlternance(
  type: 'apprentissage' | 'professionnalisation',
  age: number,
  salaireBase: number = SMIC_2026.mensuel_35h
): number {
  if (type === 'apprentissage') {
    if (age < 18) return salaireBase * SALAIRE_APPRENTIAGE.avant_18_ans;
    if (age < 21) return salaireBase * SALAIRE_APPRENTIAGE.entre_18_20_ans;
    if (age < 26) return salaireBase * SALAIRE_APPRENTIAGE.entre_21_25_ans;
    return salaireBase * SALAIRE_APPRENTIAGE.plus_26_ans;
  }

  // Professionnalisation: minimum 85% du SMIC pour les < 26 ans
  if (age < 26) return salaireBase * 0.85;
  return salaireBase * SMIC_2026.mensuel_35h;
}

// Export des données pour affichage
export function getCotisationsDisplay(result: CotisationResult) {
  return {
    patronales: [
      { label: 'Maladie', value: result.patronales.maladie, taux: TAUX_2026.patronales.maladie },
      { label: 'Vieillesse', value: result.patronales.vieillesse, taux: TAUX_2026.patronales.vieillesse },
      { label: 'Allocations familiales', value: result.patronales.allocations_familiales, taux: TAUX_2026.patronales.allocations_familiales },
      { label: 'Accident du travail', value: result.patronales.accident_du_travail, taux: TAUX_2026.patronales.accident_du_travail },
      { label: 'Chômage', value: result.patronales.chomage, taux: TAUX_2026.patronales.chomage },
      { label: 'Retraite cadres', value: result.patronales.retraite_cadres, taux: 'Variable' },
      { label: 'Formation', value: result.patronales.formation, taux: TAUX_2026.patronales.formation },
      { label: 'Prévoyance', value: result.patronales.prevoyance, taux: TAUX_2026.patronales.prevoyance },
      { label: 'Complémentaire santé', value: result.patronales.supplementaire_sante, taux: TAUX_2026.patronales.supplementaire_sante },
    ],
    salariales: [
      { label: 'Maladie', value: result.salariales.maladie, taux: TAUX_2026.salariales.maladie },
      { label: 'Vieillesse', value: result.salariales.vieillesse, taux: TAUX_2026.salariales.vieillesse },
      { label: 'Chômage', value: result.salariales.chomage, taux: TAUX_2026.salariales.chomage },
      { label: 'CSG/CRDS', value: result.salariales.csg_crds, taux: TAUX_2026.salariales.csg + TAUX_2026.salariales.crds },
    ],
    totals: {
      salaireNet: result.salaireNet,
      salaireNetImposable: result.salaireNetImposable,
      coutEmployer: result.coutEmployer,
      totalPatronal: result.patronales.total,
      totalSalarial: result.salariales.total,
    }
  };
}
