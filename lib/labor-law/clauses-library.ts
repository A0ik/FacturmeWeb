/**
 * Bibliothèque de clauses standards pour contrats de travail
 * Clauses juridiques conformes au Code du travail français
 * Organisées par catégorie et type de contrat
 */

export interface ClauseModel {
  id: string;
  titre: string;
  categorie: 'essai' | 'travail' | 'remuneration' | 'confidentialite' | 'non_concurrence' | 'mobilite' | 'formation' | 'rupture' | 'divers';
  typeContrat: ('cdi' | 'cdd' | 'stage' | 'apprentissage' | 'professionnalisation' | 'freelance')[];
  obligatoire: boolean;
  contenu: string;
  variables: { nom: string; description: string; defaut?: string }[];
  referencesLegales: string[];
  notes: string;
}

export const CLAUSE_LIBRARY: ClauseModel[] = [
  // ============== PÉRIODE D'ESSAI ==============
  {
    id: 'essai_cdi_cadre',
    titre: 'Période d\'essai CDI - Cadre',
    categorie: 'essai',
    typeContrat: ['cdi'],
    obligatoire: false,
    contenu: `Le présent contrat est subordonné à une période d'essai de {{duree}} mois, renouvelable une fois pour une durée de {{dureeRenouvellement}} mois avec l'accord exprès du salarié.

Durant cette période, chaque partie pourra rompre le contrat sans préavis ni indemnité, sous réserve de respecter un délai de prévenance de {{prevenanceSalaries}} jours ouvrés par le salarié et de {{prevenanceEmployeur}} jours par l'employeur.

À l'issue de la période d'essai, le contrat se poursuit sans formalité particulière.`,
    variables: [
      { nom: 'duree', description: 'Durée initiale (en mois)', defaut: '4' },
      { nom: 'dureeRenouvellement', description: 'Durée du renouvellement (en mois)', defaut: '4' },
      { nom: 'prevenanceSalaries', description: 'Délai de prévenance salarié (jours)', defaut: '2' },
      { nom: 'prevenanceEmployeur', description: 'Délai de prévenance employeur (jours)', defaut: '3' }
    ],
    referencesLegales: ['Article L1221-19 du Code du travail'],
    notes: 'Pour les cadres: 4 mois renouvelables une fois (max 8 mois). La durée doit être proportionnée à la qualification du poste.'
  },
  {
    id: 'essai_cdi_non_cadre',
    titre: 'Période d\'essai CDI - Non-cadre',
    categorie: 'essai',
    typeContrat: ['cdi'],
    obligatoire: false,
    contenu: `Le présent contrat est subordonné à une période d'essai de {{duree}} mois, renouvelable une fois pour une durée de {{dureeRenouvellement}} mois avec l'accord exprès du salarié.

Durant cette période, chaque partie pourra rompre le contrat sans préavis ni indemnité, sous réserve de respecter un délai de prévenance de {{prevenanceSalaries}} jours ouvrés par le salarié et de {{prevenanceEmployeur}} jours calendaires par l'employeur.`,
    variables: [
      { nom: 'duree', description: 'Durée initiale (en mois)', defaut: '2' },
      { nom: 'dureeRenouvellement', description: 'Durée du renouvellement (en mois)', defaut: '2' },
      { nom: 'prevenanceSalaries', description: 'Délai de prévenance salarié (jours)', defaut: '2' },
      { nom: 'prevenanceEmployeur', description: 'Délai de prévenance employeur (jours)', defaut: '3' }
    ],
    referencesLegales: ['Article L1221-19 du Code du travail'],
    notes: 'Employés/ouvriers: 2 mois renouvelables une fois (max 4 mois). Agents de maîtrise/techniciens: 3 mois renouvelables une fois (max 6 mois).'
  },
  {
    id: 'essai_cdd',
    titre: 'Période d\'essai CDD',
    categorie: 'essai',
    typeContrat: ['cdd'],
    obligatoire: false,
    contenu: `Le présent contrat est subordonné à une période d'essai de {{duree}} jours, calculée selon la règle d'un jour par semaine de travail, dans la limite de {{maxJours}} jours pour un contrat d'une durée inférieure ou égale à {{dureeMaxContrat}} mois.

Durant cette période, chaque partie pourra rompre le contrat sans préavis ni indemnité, sous réserve d'un délai de prévenance de {{prevenanceSalaries}} jours ouvrés par le salarié et de {{prevenanceEmployeur}} jours calendaires par l'employeur.`,
    variables: [
      { nom: 'duree', description: 'Durée en jours (max 1 jour/semaine)', defaut: '14' },
      { nom: 'maxJours', description: 'Maximum légal (jours)', defaut: '30' },
      { nom: 'dureeMaxContrat', description: 'Durée max du contrat pour ce plafond (mois)', defaut: '6' },
      { nom: 'prevenanceSalaries', description: 'Délai de prévenance salarié (jours)', defaut: '2' },
      { nom: 'prevenanceEmployeur', description: 'Délai de prévenance employeur (jours)', defaut: '3' }
    ],
    referencesLegales: ['Article L1242-10 du Code du travail'],
    notes: '1 jour/semaine de travail, max 1 mois pour CDD < 6 mois, max 2 mois pour CDD ≥ 6 mois.'
  },

  // ============== NON-CONCURRENCE (AVEC INDEMNITÉ OBLIGATOIRE) ==============
  {
    id: 'non_concurrence_standard',
    titre: 'Clause de non-concurrence - Standard',
    categorie: 'non_concurrence',
    typeContrat: ['cdi', 'cdd'],
    obligatoire: false,
    contenu: `**Clause de non-concurrence avec indemnité compensatoire OBLIGATOIRE**

Le salarié s'engage, pendant une durée de {{duree}} mois à compter de la rupture du contrat, à ne pas exercer d'activité professionnelle pour le compte de tout entreprise concurrente de {{nomEntreprise}}, directement ou indirectement, ni de se livrer à aucune activité concurrente.

Cette interdiction s'applique sur le territoire {{zoneGeographique}} et concerne les activités suivantes : {{activites}}.

En contrepartie de cette restriction, l'employeur versera au salarié, pendant toute la durée d'application de la clause, une indemnité mensuelle compensatrice égale à {{pourcentage}}% du salaire brut mensuel moyen des {{derniersMois}} derniers mois précédant la rupture du contrat.

Le non-paiement de cette indemnité libère le salarié de son obligation de non-concurrence.

Cette clause est limitée dans le temps, l'espace et l'activité, indispensable à la protection des intérêts légitimes de l'entreprise et comporte une contrepartie financière, conformément aux articles L1227-1 et suivants du Code du travail et à la jurisprudence de la Cour de cassation.

**Modalités de paiement :**
L'indemnité sera versée mensuellement, à terme échu, par virement bancaire, sur présentation d'une attestation sur l'honneur du salarié confirmant qu'il respecte l'obligation de non-concurrence.

**Dérogation :**
L'employeur peut renoncer à l'application de cette clause par décision notifiée au salarié par lettre recommandée avec accusé de réception. Dans ce cas, l'indemnité cessera d'être due à compter de la date de notification de la renonciation.`,
    variables: [
      { nom: 'duree', description: 'Durée (mois) - Max 24 mois pour cadres', defaut: '12' },
      { nom: 'nomEntreprise', description: 'Nom de l\'entreprise', defaut: 'l\'employeur' },
      { nom: 'zoneGeographique', description: 'Zone géographique (ex: France métropolitaine)', defaut: 'France métropolitaine' },
      { nom: 'activites', description: 'Activités concernées', defaut: 'celles exercées par le salarié au service de l\'entreprise' },
      { nom: 'pourcentage', description: '% du salaire (min 15-30% recommandé)', defaut: '30' },
      { nom: 'derniersMois', description: 'Nombre de mois pour la moyenne', defaut: '12' }
    ],
    referencesLegales: [
      'Article L1227-1 du Code du travail',
      'Article L1227-2 du Code du travail',
      'Article L1227-3 du Code du travail',
      'Cass. Soc. 10 juillet 2002, n° 00-45.135'
    ],
    notes: '⚠️ OBLIGATOIRE: L\'indemnité compensatoire est OBLIGATOIRE. Sans indemnité, la clause est NULLE. Montant recommandé: 30-50% du salaire pour cadres, 15-30% pour non-cadres.'
  },

  // ============== CONFIDENTIALITÉ ==============
  {
    id: 'confidentialite_standard',
    titre: 'Clause de confidentialité',
    categorie: 'confidentialite',
    typeContrat: ['cdi', 'cdd', 'apprentissage', 'professionnalisation'],
    obligatoire: false,
    contenu: `Le salarié s'engage à maintenir strictement confidentielle et à ne pas divulguer, sous quelque forme que ce soit, à quelque personne que ce soit, toute information :
- d'ordre technique, commerciale, financière ou stratégique ;
- concernant les clients, fournisseurs ou partenaires de l'entreprise ;
- relative aux procédés de fabrication, méthodes, savoir-faire ou bases de données ;

dont il aurait connaissance dans l'exercice de ses fonctions.

Cette obligation de confidentialité subsiste après la rupture du contrat, sans limitation de durée pour les informations couvertes par le secret industriel ou commercial, et pendant une durée de {{duree}} ans pour les autres informations.

En cas de violation de cette obligation, le salarié s'expose à des sanctions disciplinaires et au paiement de dommages-intérêts, sans préjudice des poursuites pénales éventuelles.`,
    variables: [
      { nom: 'duree', description: 'Durée après rupture (années)', defaut: '3' }
    ],
    referencesLegales: ['Articles L1227-1 et L1227-5 du Code du travail'],
    notes: 'Clause recommandée pour tous les postes ayant accès à des informations sensibles.'
  },

  // ============== TÉLÉTRAVAIL ==============
  {
    id: 'teletravail',
    titre: 'Télétravail régulier',
    categorie: 'travail',
    typeContrat: ['cdi', 'cdd'],
    obligatoire: false,
    contenu: `Le salarié bénéficiera d'un régime de télétravail à raison de {{joursJours}} jours par semaine, selon les modalités suivantes :

**Lieux du télétravail :**
Le télétravail sera exercé principalement au domicile du salarié ou à tout autre lieu agréé mutuellement par écrit.

**Matériel et outils :**
L'employeur met à disposition du salarié le matériel informatique et les outils de communication nécessaires à l'exercice de ses fonctions en télétravail.

**Frais professionnels :**
Les frais directement liés à l'exercice du télétravail (connexion internet, matériel, etc.) seront pris en charge par l'employeur sur présentation de justificatifs, dans la limite de {{plafondFrais}} € par mois.

**Organisation du travail :**
Le salarié reste soumis aux mêmes obligations qu'en présentiel, notamment en matière d'horaires de travail, de charge de travail et de respect des directives de l'employeur.

**Réversibilité :**
Le recours au télétravail peut être suspendu ou modifié par l'employeur pour des motifs professionnels ou personnels légitimes, moyennant un délai de preavis de {{preavis}} jours calendriers.`,
    variables: [
      { nom: 'joursJours', description: 'Nombre de jours par semaine', defaut: '2' },
      { nom: 'plafondFrais', description: 'Plafond mensuel de prise en charge (€)', defaut: '50' },
      { nom: 'preavis', description: 'Délai de préavis pour modification (jours)', defaut: '7' }
    ],
    referencesLegales: [
      'Articles L1222-9 et suivants du Code du travail',
      'Accord national interprofessionnel du 26 novembre 2020'
    ],
    notes: 'Le télétravail nécessite l\'accord du salarié et de l\'employeur. Le salarié peut refuser le télétravail.'
  },

  // ============== MOBILITÉ ==============
  {
    id: 'mobilite_geographique',
    titre: 'Clause de mobilité',
    categorie: 'mobilite',
    typeContrat: ['cdi', 'cdd'],
    obligatoire: false,
    contenu: `En raison de la nature de ses fonctions et de l'organisation de l'entreprise, le salarié accepte d'être amené à exercer ses fonctions dans différents établissements de l'entreprise situés {{zoneGeographique}}.

Cette clause de mobilité ne peut entraîner aucun changement de résidence permanente pour le salarié ni aucun préjudice dans son déroulement de carrière.

**Modalités de mise en œuvre :**
- L'employeur informera le salarié par écrit au moins {{delaiPreavis}} jours avant la date de mobilité envisagée ;
- La mobilité sera compatible avec la vie personnelle et familiale du salarié ;
- Les frais de déplacement et, le cas échéant, d'hébergement seront pris en charge par l'employeur.

**Refus :**
Le salarié peut refuser une mobilité pour motif sérieux, notamment :
- Incompatibilité avec ses obligations familiales ;
- Atteinte à sa santé ou sa sécurité ;
- Non-respect du délai de préavis.`,
    variables: [
      { nom: 'zoneGeographique', description: 'Zone géographique', defaut: 'en France métropolitaine' },
      { nom: 'delaiPreavis', description: 'Délai de préavis (jours)', defaut: '7' }
    ],
    referencesLegales: ['Article L1221-1 du Code du travail', 'Cass. Soc. 5 mars 2008'],
    notes: 'La clause de mobilité ne doit pas entraîner de changement de résidence ni de préjudice.'
  },

  // ============== RUPTURE AMIABLE ==============
  {
    id: 'rupture_amiable',
    titre: 'Rupture amiable du contrat (Rupture conventionnelle)',
    categorie: 'rupture',
    typeContrat: ['cdi'],
    obligatoire: false,
    contenu: `Les parties conviennent qu'elles pourront, d'un commun accord, mettre fin au contrat de travail par voie de rupture conventionnelle, selon les modalités prévues aux articles L1237-11 et suivants du Code du travail.

**Procédure :**
La rupture conventionnelle sera formalisée par convention signée par les deux parties, après :
- Un ou plusieurs entretiens permettant la conclusion d'une convention ;
- Un délai de réflexion de {{delaiReflexion}} jours calendaires pour le salarié ;

L'hommologation de la convention par la Direccte ou l'administration du travail sera demandée dans les {{delaiHomologation}} jours suivant la signature.

**Indemnité :**
Le salarié percevra une indemnité de rupture conventionnelle au moins égale à l'indemnité légale de licenciement, soit {{indemniteMois}} mois de salaire.`,
    variables: [
      { nom: 'delaiReflexion', description: 'Délai de réflexion salarié (jours)', defaut: '15' },
      { nom: 'delaiHomologation', description: 'Délai demande homologation (jours)', defaut: '15' },
      { nom: 'indemniteMois', description: 'Indemnité (mois de salaire)', defaut: '1/4' }
    ],
    referencesLegales: [
      'Articles L1237-11 et suivants du Code du travail',
      'Articles D1237-1 et suivants du Code du travail'
    ],
    notes: 'La rupture conventionnelle est une procédure encadrée nécessitant l\'homologuation de l\'administration.'
  },

  // ============== FORMATION PROFESSIONNELLE ==============
  {
    id: 'formation_professionnelle',
    titre: 'Formation professionnelle',
    categorie: 'formation',
    typeContrat: ['cdi', 'cdd'],
    obligatoire: false,
    contenu: `Le salarié bénéficiera d'un accès à la formation professionnelle continue tout au long de sa vie professionnelle, conformément aux dispositions du Code du travail.

**Entretien professionnel :**
Chaque année, le salarié bénéficiera d'un entretien professionnel avec son employeur, qui permettra d'envisager les perspectives d'évolution professionnelle, notamment en termes de qualifications et d'emploi.

**Plan de formation :**
Le salarié pourra suivre, sur le temps de travail et avec maintien de sa rémunération, des actions de formation :
- Inscrites au plan de développement des compétences de l'entreprise ;
- Proposées dans le cadre du compte personnel de formation (CPF) ;
- Requérant l'accord exprès du salarié pour les actions hors temps de travail.

**Abondement CPF :**
L'employeur s'engage à abonder le compte personnel de formation du salarié à hauteur de {{abondementAnnuel}} € par an, dans la limite des plafonds légaux.`,
    variables: [
      { nom: 'abondementAnnuel', description: 'Abondement annuel CPF (€)', defaut: '500' }
    ],
    referencesLegales: [
      'Articles L6111-1 et suivants du Code du travail',
      'Articles L6315-1 et suivants du Code du travail (CPF)',
      'Articles L6325-1 et suivants du Code du travail'
    ],
    notes: 'L\'entretien professionnel est obligatoire tous les 2 ans (tous les 6 ans pour les salariés de + de 45 ans).'
  }
];

/**
 * Récupère une clause par son ID
 */
export function getClauseById(id: string): ClauseModel | undefined {
  return CLAUSE_LIBRARY.find(clause => clause.id === id);
}

/**
 * Récupère les clauses par catégorie
 */
export function getClausesByCategorie(categorie: ClauseModel['categorie']): ClauseModel[] {
  return CLAUSE_LIBRARY.filter(clause => clause.categorie === categorie);
}

/**
 * Récupère les clauses par type de contrat
 */
export function getClausesByTypeContrat(typeContrat: ClauseModel['typeContrat'][number]): ClauseModel[] {
  return CLAUSE_LIBRARY.filter(clause => clause.typeContrat.includes(typeContrat));
}

/**
 * Génère le contenu d'une clause avec ses variables
 */
export function generateClauseContent(clause: ClauseModel, variables: Record<string, string>): string {
  let content = clause.contenu;

  for (const variable of clause.variables) {
    const value = variables[variable.nom] || variable.defaut || '';
    const regex = new RegExp(`{{${variable.nom}}}`, 'g');
    content = content.replace(regex, value);
  }

  return content;
}

/**
 * Vérifie si toutes les variables requises sont fournies
 */
export function validateClauseVariables(clause: ClauseModel, variables: Record<string, string>): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  for (const variable of clause.variables) {
    if (!variables[variable.nom] && !variable.defaut) {
      missing.push(variable.nom);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}
