// Taux de cotisations sociales 2024 (France)
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
  };
  salariales: {
    maladie: number;
    vieillesse: number;
    retraite_cadres: number;
    chomage: number;
    ags: number;
    csg_crds: number;
    total: number;
  };
  salaireNet: number;
  salaireNetImposable: number;
  coutEmployer: number;
}

// Taux de cotisations 2024 (en %)
const TAUX_2024 = {
  patronales: {
    maladie: 13.00,
    vieillesse: 10.00, // Taux plafonné
    allocations_familiales: 5.25,
    accident_du_travail: 0.70, // Taux moyen
    solidarite_autonomie: 0.30,
    fnal: 0.10, // Fond National d'Aide au Logement
    chomage: 4.05, // Taux moyen
    retraite_cadres: 1.29, // AGIRC pour cadres
    ags: 0.15, // Association pour la Gestion de la Structure des Finances
    formation: 0.55, // Taux minimum
    prevoyance: 1.50, // Taux minimum
    supplementaire_sante: 0.60, // Taux minimum
    penibilite: 0.10, // Pour les salariés exposés
  },
  salariales: {
    maladie: 7.50, // Taux plafonné
    vieillesse: 6.90, // Taux plafondé
    retraite_cadres: 0.86, // AGIRC pour cadres
    chomage: 2.40,
    ags: 0.15,
    csg: 9.20, // CSG + CRDS (sur 98.25% du salaire brut)
    crds: 0.50,
  },
  plafonds: {
    mensuel_ss: 3666, // Plafond SS mensuel 2024
    annuel_ss: 43992, // Plafond SS annuel 2024
    cadre: 8 * 3666, // 8x le plafond SS pour les cadres
  }
};

// Calcul des cotisations
export function calculerCotisations(data: CotisationData): CotisationResult {
  const { salaireBrut, salaireBrutAnnuel, statut } = data;
  const plafondMensuel = TAUX_2024.plafonds.mensuel_ss;

  // === COTISATIONS PATRONALES ===

  // Maladie (sur salaire brut)
  const maladiePatronale = salaireBrut * (TAUX_2024.patronales.maladie / 100);

  // Vieillesse (sur salaire brut, dans la limite du plafond)
  const vieillessePatronale = Math.min(salaireBrut, plafondMensuel) * (TAUX_2024.patronales.vieillesse / 100);

  // Allocations familiales (sur salaire brut)
  const allocationsFamiliales = salaireBrut * (TAUX_2024.patronales.allocations_familiales / 100);

  // Accident du travail
  const accidentDuTravail = salaireBrut * (TAUX_2024.patronales.accident_du_travail / 100);

  // Solidarité autonomie
  const solidariteAutonomie = salaireBrut * (TAUX_2024.patronales.solidarite_autonomie / 100);

  // FNAL
  const fnal = salaireBrut * (TAUX_2024.patronales.fnal / 100);

  // Chômage (sur salaire brut, plafonné à 4x le plafond SS)
  const plafondChomage = 4 * plafondMensuel;
  const chomage = Math.min(salaireBrut, plafondChomage) * (TAUX_2024.patronales.chomage / 100);

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
  const ags = salaireBrut * (TAUX_2024.patronales.ags / 100);

  // Formation
  const formation = salaireBrut * (TAUX_2024.patronales.formation / 100);

  // Prévoyance
  const prevoyance = salaireBrut * (TAUX_2024.patronales.prevoyance / 100);

  // Complémentaire santé
  const sante = salaireBrut * (TAUX_2024.patronales.supplementaire_sante / 100);

  // Pénibilité
  const penibilite = salaireBrut * (TAUX_2024.patronales.penibilite / 100);

  // Transport (forfait)
  const transport = salaireBrut * 0.005; // 0.5% environ

  // Total patronal
  const totalPatronal = maladiePatronale + vieillessePatronale + allocationsFamiliales +
    accidentDuTravail + solidariteAutonomie + fnal + chomage + retraiteCadres +
    ags + formation + prevoyance + sante + penibilite + transport;

  // === COTISATIONS SALARIALES ===

  // Maladie
  const maladieSalariale = Math.min(salaireBrut, plafondMensuel) * (TAUX_2024.salariales.maladie / 100);

  // Vieillesse
  const vieillesseSalariale = Math.min(salaireBrut, plafondMensuel) * (TAUX_2024.salariales.vieillesse / 100);

  // Retraite cadres (AGIRC)
  let retraiteCadresSalariale = 0;
  if (statut === 'cadre') {
    retraiteCadresSalariale = Math.min(salaireBrut, plafondMensuel) * (TAUX_2024.salariales.retraite_cadres / 100);
  }

  // Chômage
  const chomageSalarial = salaireBrut * (TAUX_2024.salariales.chomage / 100);

  // AGS
  const agsSalarial = salaireBrut * (TAUX_2024.salariales.ags / 100);

  // CSG + CRDS (sur 98.25% du salaire brut)
  const baseCSG = salaireBrut * 0.9825;
  const csg = baseCSG * (TAUX_2024.salariales.csg / 100);
  const crds = baseCSG * (TAUX_2024.salariales.crds / 100);
  const csgCrds = csg + crds;

  // Total salarial
  const totalSalarial = maladieSalariale + vieillesseSalariale + retraiteCadresSalariale +
    chomageSalarial + agsSalarial + csgCrds;

  // === SALAIRES ===

  const salaireNet = salaireBrut - totalSalarial;

  // Salaire net imposable (sans la CSG déductible)
  const csgDeductible = csg * 0.6421; // 6.4% de CSG est déductible
  const salaireNetImposable = salaireBrut - totalSalarial + csgDeductible;

  // Coût employeur
  const coutEmployer = salaireBrut + totalPatronal;

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
    },
    salariales: {
      maladie: maladieSalariale,
      vieillesse: vieillesseSalariale,
      retraite_cadres: retraiteCadresSalariale,
      chomage: chomageSalarial,
      ags: agsSalarial,
      csg_crds: csgCrds,
      total: totalSalarial,
    },
    salaireNet,
    salaireNetImposable,
    coutEmployer,
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
      },
      salariales: {
        maladie: 0,
        vieillesse: 0,
        retraite_cadres: 0,
        chomage: 0,
        ags: 0,
        csg_crds: 0,
        total: 0,
      },
      salaireNet: salaireBrut,
      salaireNetImposable: salaireBrut,
      coutEmployer: salaireBrut * 1.0166,
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

// SMIC 2024
export const SMIC_2024 = {
  horaire: 11.65, // €/heure
  mensuel_35h: 1766.92, // €/mois pour 35h hebdomadaires
  mensuel_39h: 1969.15, // €/mois pour 39h (4h supp majorées à 110%)
  annuel: 21003.04, // €/an
};

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
  salaireBase: number = SMIC_2024.mensuel_35h
): number {
  if (type === 'apprentissage') {
    if (age < 18) return salaireBase * SALAIRE_APPRENTIAGE.avant_18_ans;
    if (age < 21) return salaireBase * SALAIRE_APPRENTIAGE.entre_18_20_ans;
    if (age < 26) return salaireBase * SALAIRE_APPRENTIAGE.entre_21_25_ans;
    return salaireBase * SALAIRE_APPRENTIAGE.plus_26_ans;
  }

  // Professionnalisation: minimum 85% du SMIC pour les < 26 ans
  if (age < 26) return salaireBase * 0.85;
  return salaireBase * SMIC_2024.mensuel_35h;
}

// Export des données pour affichage
export function getCotisationsDisplay(result: CotisationResult) {
  return {
    patronales: [
      { label: 'Maladie', value: result.patronales.maladie, taux: TAUX_2024.patronales.maladie },
      { label: 'Vieillesse', value: result.patronales.vieillesse, taux: TAUX_2024.patronales.vieillesse },
      { label: 'Allocations familiales', value: result.patronales.allocations_familiales, taux: TAUX_2024.patronales.allocations_familiales },
      { label: 'Accident du travail', value: result.patronales.accident_du_travail, taux: TAUX_2024.patronales.accident_du_travail },
      { label: 'Chômage', value: result.patronales.chomage, taux: TAUX_2024.patronales.chomage },
      { label: 'Retraite cadres', value: result.patronales.retraite_cadres, taux: 'Variable' },
      { label: 'Formation', value: result.patronales.formation, taux: TAUX_2024.patronales.formation },
      { label: 'Prévoyance', value: result.patronales.prevoyance, taux: TAUX_2024.patronales.prevoyance },
      { label: 'Complémentaire santé', value: result.patronales.supplementaire_sante, taux: TAUX_2024.patronales.supplementaire_sante },
    ],
    salariales: [
      { label: 'Maladie', value: result.salariales.maladie, taux: TAUX_2024.salariales.maladie },
      { label: 'Vieillesse', value: result.salariales.vieillesse, taux: TAUX_2024.salariales.vieillesse },
      { label: 'Chômage', value: result.salariales.chomage, taux: TAUX_2024.salariales.chomage },
      { label: 'CSG/CRDS', value: result.salariales.csg_crds, taux: TAUX_2024.salariales.csg + TAUX_2024.salariales.crds },
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
