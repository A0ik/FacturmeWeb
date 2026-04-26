// Générateur de bulletins de paie — Version 3.0
// Design ultra-aéré, professionnel, conforme au Code du travail français
// Couleur personnalisable, format 1 page A4, erreurs détaillées

import { calculerCotisations, getCotisationsDisplay, SMIC_2024, getSalaireMinimumAlternance } from './cotisations';
import { validateContract } from './rules';

export interface BulletinPaieData {
  // Identité salarié
  nom: string;
  prenom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  nir: string; // Numéro de Sécurité sociale
  dateNaissance: string;
  situationFamiliale: 'celibataire' | 'marie' | 'divorce' | 'veuf';
  nombreEnfants: number;

  // Contrat
  typeContrat: 'cdd' | 'cdi' | 'apprentissage' | 'professionnalisation';
  dateDebut: string;
  dateFin?: string;
  statut: 'cadre' | 'non_cadre' | 'alternance';
  classification: string;
  conventionCollective: string;
  coef: number;

  // Rémunération
  salaireBrut: number;
  salaireBrutAnnuel: number;
  tauxHoraire?: number;
  heuresMensuelles: number;
  heuresSupplementaires?: number;
  majorationHeuresSup?: number;

  // Options temps de travail
  tempsPartiel?: boolean;
  pourcentageTempsPartiel?: number;
  avantagesEnNature?: number;
  fraisProfessionnels?: number;
  avantagesEnNatureNourriture?: number;

  // Heures supplémentaires
  heuresSupp25?: number;
  heuresSupp50?: number;
  heuresAbsenceNonPayees?: number;

  // Primes & gratifications
  primeExceptionnelle?: number;
  prime13Mois?: number;
  primePerformance?: number;
  primeAnciennete?: number;
  autresPrimes?: number;

  // Congés payés
  congesPayesAcquis?: number;
  congesPayesPris?: number;
  congesPayesSolde?: number;
  indemniteCongesPayes?: number;

  // Absences & maladie
  joursMaladie?: number;
  indemnitesJournalieresSS?: number;
  maintienSalaireMaladie?: number;
  joursAbsenceNonJustifiee?: number;

  // Avantages sociaux
  mutuellePartEmployeur?: number;
  mutuellePartSalarie?: number;
  prevoyancePartEmployeur?: number;
  prevoyancePartSalarie?: number;
  ticketRestaurantNombre?: number;
  ticketRestaurantMontantEmployeur?: number;

  // Indemnités & remboursements
  indemnitesTransport?: number;
  indemniteDeplacementVehicule?: number;
  autresIndemnites?: number;

  // Entreprise
  raisonSociale: string;
  siret: string;
  adresseEntreprise: string;
  codePostalEntreprise: string;
  villeEntreprise: string;
  urssaf: string;
  codeAPE?: string;

  // Période
  periodeDebut: string;
  periodeFin: string;
  nombreJoursOuvres: number;

  // Cumuls annuels (obligatoires R3243-1)
  cumulsAnnuelsBrut?: number;
  cumulsAnnuelsNet?: number;
  cumulsAnnuelsNetImposable?: number;

  // Prélèvement à la source
  tauxPAS?: number;
  montantPAS?: number;

  // Date de paiement du salaire
  datePaiement?: string;

  // Couleur d'accent (pour le design du bulletin)
  accentColor?: string;
}

interface LigneBulletin {
  categorie: string;
  libelle: string;
  base: string;
  taux: string;
  a_prelever: string;
  a_payer: string;
}

interface BulletinPaie {
  entete: {
    employeur: string;
    siret: string;
    periode: string;
    datePaie: string;
  };
  salarie: {
    identite: string;
    nir: string;
    adresse: string;
    statut: string;
    classification: string;
  };
  lignes: LigneBulletin[];
  totaux: {
    a_payer: number;
    a_prelever: number;
    net_a_payer: number;
    net_imposable: number;
  };
  conges: {
    acquis: number;
    pris: number;
    solde: number;
  };
}

// Générer un bulletin de paie HTML — design ultra-aéré, 1 page A4, couleur personnalisable
export function genererBulletinPaieHTML(data: BulletinPaieData): string {
  const moisAnnee = new Date(data.periodeDebut).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const dateDebPeriode = new Date(data.periodeDebut).toLocaleDateString('fr-FR');
  const dateFinPeriode = new Date(data.periodeFin).toLocaleDateString('fr-FR');
  const datePaie = new Date().toLocaleDateString('fr-FR');

  const cpAcquis = data.congesPayesAcquis ?? Math.floor(data.nombreJoursOuvres * 2.0833 / 10);
  const cpPris = data.congesPayesPris ?? 0;
  const cpSolde = data.congesPayesSolde ?? (cpAcquis - cpPris);
  const datePaiement = data.datePaiement
    ? new Date(data.datePaiement).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR');

  const tauxH = data.tauxHoraire ?? (data.salaireBrut / (data.heuresMensuelles || 151.67));
  const joursOuvres = data.nombreJoursOuvres || 22;

  // Montants calculés pour chaque ligne
  const montantSupp25 = (data.heuresSupp25 ?? 0) * tauxH * 1.25;
  const montantSupp50 = (data.heuresSupp50 ?? 0) * tauxH * 1.50;
  const retenueMaladie = data.joursMaladie ? (data.salaireBrut / joursOuvres) * data.joursMaladie : 0;
  const retenueAbsence = data.joursAbsenceNonJustifiee ? (data.salaireBrut / joursOuvres) * data.joursAbsenceNonJustifiee : 0;

  // Totalbrut = base de calcul des cotisations
  const totalBrut = data.salaireBrut
    + montantSupp25
    + montantSupp50
    + (data.primeExceptionnelle ?? 0)
    + (data.prime13Mois ?? 0)
    + (data.primePerformance ?? 0)
    + (data.primeAnciennete ?? 0)
    + (data.autresPrimes ?? 0)
    + (data.indemniteCongesPayes ?? 0)
    - retenueMaladie
    - retenueAbsence;

  // Cotisations calculées sur le totalBrut réel (pas seulement le salaire de base)
  const cotisations = calculerCotisations({
    salaireBrut: totalBrut,
    salaireBrutAnnuel: data.salaireBrutAnnuel,
    statut: data.statut === 'alternance' ? 'non_cadre' : data.statut,
    tempsPartiel: data.tempsPartiel,
  });

  const display = getCotisationsDisplay(cotisations);

  const netAvantImpot = totalBrut - cotisations.salariales.total
    + (data.indemnitesTransport ?? 0)
    + (data.indemniteDeplacementVehicule ?? 0)
    + (data.autresIndemnites ?? 0)
    - (data.mutuellePartSalarie ?? 0)
    - (data.prevoyancePartSalarie ?? 0)
    + (data.maintienSalaireMaladie ?? 0)
    + (data.indemnitesJournalieresSS ?? 0); // IJ SS complète le net quand maintien partiel

  const row = (label: string, base: string, taux: string, prelever: string, payer: string, bold = false, shade = false) =>
    `<tr style="${shade ? 'background:linear-gradient(135deg, #f8f9fa, #f5f6f7);' : ''}${bold ? 'font-weight:bold;' : ''}">
      <td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;">${label}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;text-align:right;">${base}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;text-align:right;">${taux}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;text-align:right;color:#c0392b;">${prelever}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;text-align:right;color:#27ae60;">${payer}</td>
    </tr>`;

  const fmt = (n: number) => n.toFixed(2);
  const fmtE = (n: number) => n ? n.toFixed(2) + ' €' : '';

  // Récupérer la couleur d'accent depuis les données ou utiliser la couleur par défaut
  const accentColor = (data as any).accentColor || '#1D9E75';
  const headerColor = accentColor;
  const sectionHeaderColor = accentColor;
  const netBoxColor = accentColor;
  const titleColor = accentColor;
  const borderColor = accentColor;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Bulletin de paie ${moisAnnee} — ${data.prenom} ${data.nom}</title>
<style>
  @page { size: A4; margin: 8mm 14mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 9pt; color: #1a1a1a; background: #fff; }
  .page { width: 100%; max-width: 210mm; margin: 0 auto; padding: 6mm; }

  /* Header */
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 4px solid ${headerColor}; padding-bottom:12px; margin-bottom:10px; }
  .header-left { flex:1; }
  .header-right { text-align:right; }
  .company-name { font-size:14pt; font-weight:bold; color:${headerColor}; letter-spacing:0.5px; text-transform:uppercase; }
  .bulletin-title { font-size:12pt; font-weight:bold; color:#fff; background:linear-gradient(135deg, ${headerColor}, ${headerColor}dd); padding:6px 16px; border-radius:8px; display:inline-block; box-shadow:0 2px 8px ${headerColor}40; }

  /* Blocs identité */
  .id-bloc { display:flex; gap:12px; margin-bottom:12px; }
  .id-box { flex:1; border:1px solid #e0e0e0; border-radius:10px; padding:10px 14px; font-size:8pt; box-shadow:0 2px 6px rgba(0,0,0,0.04); background:#fafafa; }
  .id-box-title { font-size:8pt; font-weight:bold; color:${titleColor}; text-transform:uppercase; border-bottom:2px solid ${titleColor}40; margin-bottom:8px; padding-bottom:6px; letter-spacing:0.8px; }
  .id-row { display:flex; justify-content:space-between; margin-bottom:5px; line-height:1.6; }
  .id-key { color:#666; font-weight:500; }
  .id-val { font-weight:600; color:#333; }

  /* Tableau cotisations */
  .section-head { background:linear-gradient(135deg, ${sectionHeaderColor}, ${sectionHeaderColor}e0); color:#fff; font-size:8.5pt; font-weight:bold; padding:6px 14px; margin:8px 0 0 0; border-radius:6px; letter-spacing:0.5px; box-shadow:0 2px 6px ${sectionHeaderColor}30; }
  table.cot { width:100%; border-collapse:collapse; font-size:8.5pt; border-radius:8px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.04); }
  table.cot th { background:linear-gradient(135deg, #f8f9fa, #f0f1f2); font-weight:bold; padding:8px 12px; border-bottom:2px solid #ccc; text-align:right; font-size:8pt; }
  table.cot th:first-child { text-align:left; }

  /* Bloc NET */
  .net-box { display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg, ${netBoxColor}, ${netBoxColor}e0); color:#fff; border-radius:12px; padding:14px 20px; margin-top:12px; box-shadow:0 4px 12px ${netBoxColor}40; }
  .net-label { font-size:12pt; font-weight:bold; letter-spacing:0.5px; }
  .net-amount { font-size:18pt; font-weight:bold; text-shadow:0 2px 4px rgba(0,0,0,0.1); }

  /* Pied */
  .footer-bloc { display:flex; gap:12px; margin-top:12px; font-size:8pt; color:#555; }
  .footer-box { flex:1; border:1px solid #e0e0e0; border-radius:8px; padding:8px 12px; background:#fafafa; box-shadow:0 2px 6px rgba(0,0,0,0.04); }
  .footer-box-title { font-weight:bold; color:${titleColor}; margin-bottom:6px; font-size:8pt; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid ${titleColor}30; padding-bottom:4px; }
  .cp-row { display:flex; justify-content:space-between; margin-bottom:4px; line-height:1.5; }
  .mention { font-size:7pt; color:#888; margin-top:10px; border-top:1px solid #ddd; padding-top:8px; font-style:italic; text-align:center; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="company-name">${data.raisonSociale}</div>
      <div style="font-size:8pt;color:#666;margin-top:4px;">${data.adresseEntreprise}, ${data.codePostalEntreprise} ${data.villeEntreprise}</div>
      <div style="font-size:8pt;color:#666;">SIRET : ${data.siret}${data.codeAPE ? ` &nbsp;|&nbsp; APE/NAF : ${data.codeAPE}` : ''} &nbsp;|&nbsp; URSSAF : ${data.urssaf || data.siret}</div>
    </div>
    <div class="header-right">
      <div class="bulletin-title">BULLETIN DE PAIE</div>
      <div style="font-size:9pt;margin-top:8px;">Période : <strong>${dateDebPeriode} – ${dateFinPeriode}</strong></div>
      <div style="font-size:9pt;">Date de paiement : <strong>${datePaiement}</strong></div>
      <div style="font-size:8pt;color:#888;margin-top:4px;">Établi le ${datePaie}</div>
    </div>
  </div>

  <!-- IDENTITÉ -->
  <div class="id-bloc">
    <div class="id-box" style="flex:1.6;">
      <div class="id-box-title">Salarié</div>
      <div class="id-row"><span class="id-key">Nom</span><span class="id-val">${data.prenom} ${data.nom}</span></div>
      <div class="id-row"><span class="id-key">Adresse</span><span class="id-val">${data.adresse}, ${data.codePostal} ${data.ville}</span></div>
      <div class="id-row"><span class="id-key">N° Sécu (NIR)</span><span class="id-val">${data.nir}</span></div>
      <div class="id-row"><span class="id-key">Date de naissance</span><span class="id-val">${data.dateNaissance ? new Date(data.dateNaissance).toLocaleDateString('fr-FR') : ''}</span></div>
    </div>
    <div class="id-box">
      <div class="id-box-title">Contrat & Emploi</div>
      <div class="id-row"><span class="id-key">Type</span><span class="id-val">${data.typeContrat.toUpperCase()}</span></div>
      <div class="id-row"><span class="id-key">Statut</span><span class="id-val">${data.statut === 'cadre' ? 'Cadre' : data.statut === 'non_cadre' ? 'Non-cadre' : 'Alternance'}</span></div>
      <div class="id-row"><span class="id-key">Qualification</span><span class="id-val">${data.classification}</span></div>
      <div class="id-row"><span class="id-key">Coeff.</span><span class="id-val">${data.coef}</span></div>
      <div class="id-row"><span class="id-key">CCN</span><span class="id-val">${data.conventionCollective}</span></div>
    </div>
    <div class="id-box">
      <div class="id-box-title">Temps de travail</div>
      <div class="id-row"><span class="id-key">Heures/mois</span><span class="id-val">${data.heuresMensuelles} h</span></div>
      <div class="id-row"><span class="id-key">Jours ouvrés</span><span class="id-val">${data.nombreJoursOuvres} j</span></div>
      ${data.tempsPartiel ? `<div class="id-row"><span class="id-key">Temps partiel</span><span class="id-val">${data.pourcentageTempsPartiel}%</span></div>` : ''}
      <div class="id-row"><span class="id-key">Taux horaire</span><span class="id-val">${data.tauxHoraire ? fmtE(data.tauxHoraire) : 'N/A'}</span></div>
    </div>
  </div>

  <!-- ÉLÉMENTS DE RÉMUNÉRATION -->
  <div class="section-head">ÉLÉMENTS DE RÉMUNÉRATION</div>
  <table class="cot">
    <thead><tr>
      <th style="text-align:left;width:38%">Libellé</th>
      <th style="width:14%">Base / Nb</th>
      <th style="width:12%">Taux</th>
      <th style="width:18%">Retenue (−)</th>
      <th style="width:18%">Gain (+)</th>
    </tr></thead>
    <tbody>
      ${row('Salaire de base', fmtE(data.salaireBrut), `${data.heuresMensuelles} h`, '', fmtE(data.salaireBrut))}
      ${data.heuresSupp25 ? row(`Heures supp. 25% (${data.heuresSupp25} h)`, `${data.heuresSupp25} h × ${fmtE(tauxH)}`, '× 1,25', '', fmtE(montantSupp25)) : ''}
      ${data.heuresSupp50 ? row(`Heures supp. 50% (${data.heuresSupp50} h)`, `${data.heuresSupp50} h × ${fmtE(tauxH)}`, '× 1,50', '', fmtE(montantSupp50)) : ''}
      ${data.primeExceptionnelle ? row('Prime exceptionnelle', '', '', '', fmtE(data.primeExceptionnelle)) : ''}
      ${data.prime13Mois ? row('Prime 13e mois', '', '', '', fmtE(data.prime13Mois)) : ''}
      ${data.primePerformance ? row('Prime de performance', '', '', '', fmtE(data.primePerformance)) : ''}
      ${data.primeAnciennete ? row("Prime d'ancienneté", '', '', '', fmtE(data.primeAnciennete)) : ''}
      ${data.autresPrimes ? row('Autres primes', '', '', '', fmtE(data.autresPrimes)) : ''}
      ${data.indemniteCongesPayes ? row('Indemnité de congés payés', '', '', '', fmtE(data.indemniteCongesPayes)) : ''}
      ${data.avantagesEnNature ? row('Avantages en nature', fmtE(data.avantagesEnNature), '', fmtE(data.avantagesEnNature), '') : ''}
      ${data.joursMaladie ? row(`Retenue absence maladie (${data.joursMaladie} j)`, `${fmtE(data.salaireBrut / joursOuvres)}/j`, `${joursOuvres} j`, fmtE(retenueMaladie), '') : ''}
      ${data.joursAbsenceNonJustifiee ? row(`Retenue absence injustifiée (${data.joursAbsenceNonJustifiee} j)`, `${fmtE(data.salaireBrut / joursOuvres)}/j`, `${joursOuvres} j`, fmtE(retenueAbsence), '') : ''}
      ${row('TOTAL BRUT', '', '', '', fmtE(totalBrut), true, true)}
    </tbody>
  </table>

  <!-- COTISATIONS SALARIALES -->
  <div class="section-head">COTISATIONS SALARIALES</div>
  <table class="cot">
    <thead><tr>
      <th style="text-align:left;width:38%">Libellé</th>
      <th style="width:14%">Base</th>
      <th style="width:12%">Taux</th>
      <th style="width:18%">Retenue salarié</th>
      <th style="width:18%">Part patronale</th>
    </tr></thead>
    <tbody>
      ${display.salariales.map(c => row(c.label, fmtE(totalBrut), typeof c.taux === 'number' ? c.taux.toFixed(2) + '%' : (c.taux ?? ''), fmtE(c.value), '')).join('')}
      ${data.mutuellePartSalarie ? row('Mutuelle — part salarié', '', '', fmtE(data.mutuellePartSalarie), '') : ''}
      ${data.prevoyancePartSalarie ? row('Prévoyance — part salarié', '', '', fmtE(data.prevoyancePartSalarie), '') : ''}
      ${row('TOTAL COTISATIONS', '', '', fmtE(cotisations.salariales.total + (data.mutuellePartSalarie ?? 0) + (data.prevoyancePartSalarie ?? 0)), '', true, true)}
    </tbody>
  </table>

  <!-- COTISATIONS PATRONALES -->
  <div class="section-head">COTISATIONS PATRONALES (informatives)</div>
  <table class="cot">
    <thead><tr>
      <th style="text-align:left;width:38%">Libellé</th>
      <th style="width:14%">Base</th>
      <th style="width:12%">Taux</th>
      <th style="width:18%">—</th>
      <th style="width:18%">Montant</th>
    </tr></thead>
    <tbody>
      ${display.patronales.map(c => row(c.label, fmtE(totalBrut), typeof c.taux === 'number' ? c.taux.toFixed(2) + '%' : (c.taux ?? ''), '', fmtE(c.value))).join('')}
      ${data.mutuellePartEmployeur ? row('Mutuelle — part employeur', '', '', '', fmtE(data.mutuellePartEmployeur)) : ''}
      ${data.prevoyancePartEmployeur ? row('Prévoyance — part employeur', '', '', '', fmtE(data.prevoyancePartEmployeur)) : ''}
      ${row('COÛT TOTAL EMPLOYEUR', '', '', '', fmtE(cotisations.patronales.total + (data.mutuellePartEmployeur ?? 0) + (data.prevoyancePartEmployeur ?? 0) + totalBrut), true, true)}
    </tbody>
  </table>

  ${(data.indemnitesTransport || data.indemniteDeplacementVehicule || data.ticketRestaurantNombre || data.autresIndemnites || data.indemnitesJournalieresSS || data.maintienSalaireMaladie) ? `
  <div class="section-head">INDEMNITÉS & REMBOURSEMENTS</div>
  <table class="cot"><thead><tr>
    <th style="text-align:left;width:50%">Libellé</th><th style="width:25%">—</th><th style="width:25%">Montant</th>
  </tr></thead><tbody>
    ${data.indemnitesTransport ? `<tr><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;">Remboursement transport</td><td></td><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;text-align:right;color:#27ae60;">${fmtE(data.indemnitesTransport)}</td></tr>` : ''}
    ${data.indemniteDeplacementVehicule ? `<tr><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;">Indemnité kilométrique</td><td></td><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;text-align:right;color:#27ae60;">${fmtE(data.indemniteDeplacementVehicule)}</td></tr>` : ''}
    ${data.ticketRestaurantNombre ? `<tr><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;">Tickets restaurant (${data.ticketRestaurantNombre} × ${fmtE(data.ticketRestaurantMontantEmployeur ?? 0)} part empl.)</td><td></td><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;text-align:right;color:#27ae60;">${fmtE((data.ticketRestaurantNombre) * (data.ticketRestaurantMontantEmployeur ?? 0))}</td></tr>` : ''}
    ${data.indemnitesJournalieresSS ? `<tr><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;">IJ Sécurité Sociale</td><td></td><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;text-align:right;color:#27ae60;">${fmtE(data.indemnitesJournalieresSS)}</td></tr>` : ''}
    ${data.maintienSalaireMaladie ? `<tr><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;">Maintien salaire maladie (employeur)</td><td></td><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;text-align:right;color:#27ae60;">${fmtE(data.maintienSalaireMaladie)}</td></tr>` : ''}
    ${data.autresIndemnites ? `<tr><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;">Autres indemnités</td><td></td><td style="padding:6px 10px;border-bottom:1px solid #e8e8e8;text-align:right;color:#27ae60;">${fmtE(data.autresIndemnites)}</td></tr>` : ''}
  </tbody></table>
  ` : ''}

  <!-- NET À PAYER -->
  <div class="net-box">
    <div>
      <div class="net-label">NET À PAYER</div>
      <div style="font-size:8pt;opacity:0.9;margin-top:4px;">Net imposable : ${fmtE(cotisations.salaireNetImposable)}</div>
    </div>
    <div class="net-amount">${fmtE(Math.max(0, netAvantImpot))}</div>
  </div>

  <!-- PIED : CP + mentions -->
  <div class="footer-bloc">
    <div class="footer-box">
      <div class="footer-box-title">Congés payés</div>
      <div class="cp-row"><span>Acquis ce mois</span><span><strong>${fmt(cpAcquis)} j</strong></span></div>
      <div class="cp-row"><span>Pris ce mois</span><span><strong>${fmt(cpPris)} j</strong></span></div>
      <div class="cp-row"><span>Solde</span><span><strong>${fmt(cpSolde)} j</strong></span></div>
    </div>
    <div class="footer-box">
      <div class="footer-box-title">Récapitulatif du mois</div>
      <div class="cp-row"><span>Salaire brut</span><span>${fmtE(totalBrut)}</span></div>
      <div class="cp-row"><span>Cotisations salariales</span><span style="color:#c0392b;">− ${fmtE(cotisations.salariales.total)}</span></div>
      <div class="cp-row"><span>Net avant impôt</span><span><strong>${fmtE(Math.max(0, netAvantImpot))}</strong></span></div>
      <div class="cp-row"><span>Coût total employeur</span><span>${fmtE(cotisations.coutEmployer)}</span></div>
    </div>
    <div class="footer-box">
      <div class="footer-box-title">Cumuls annuels (obligatoires)</div>
      <div class="cp-row"><span>Salaire brut cumulé</span><span><strong>${fmtE(data.cumulsAnnuelsBrut ?? data.salaireBrutAnnuel ?? totalBrut * 12)}</strong></span></div>
      <div class="cp-row"><span>Net cumulé</span><span><strong>${fmtE(data.cumulsAnnuelsNet ?? Math.max(0, netAvantImpot) * 12)}</strong></span></div>
      <div class="cp-row"><span>Net imposable cumulé</span><span>${fmtE(data.cumulsAnnuelsNetImposable ?? cotisations.salaireNetImposable * 12)}</span></div>
    </div>
  </div>

  <!-- Prélèvement à la source -->
  <div style="display:flex;gap:12px;margin-top:8px;">
    <div class="footer-box" style="flex:1;">
      <div class="footer-box-title">Prélèvement à la source (PAS)</div>
      <div class="cp-row"><span>Net imposable du mois</span><span>${fmtE(cotisations.salaireNetImposable)}</span></div>
      <div class="cp-row"><span>Taux PAS</span><span>${data.tauxPAS ? data.tauxPAS.toFixed(1) + ' %' : 'Cf. DGFIP'}</span></div>
      <div class="cp-row"><span>Montant prélevé</span><span style="color:#c0392b;"><strong>${data.montantPAS ? '− ' + fmtE(data.montantPAS) : 'Cf. DGFIP'}</strong></span></div>
      ${data.montantPAS ? `<div class="cp-row"><span>Net après PAS</span><span><strong>${fmtE(Math.max(0, netAvantImpot - (data.montantPAS ?? 0)))}</strong></span></div>` : ''}
    </div>
    <div class="footer-box" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;">
      <div class="footer-box-title">Signatures</div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;">
        <div style="text-align:center;flex:1;">
          <div style="font-size:7pt;color:#888;margin-bottom:20px;">L'employeur</div>
          <div style="border-top:1px solid #ccc;padding-top:4px;font-size:7pt;color:#888;">${data.raisonSociale}</div>
        </div>
        <div style="text-align:center;flex:1;">
          <div style="font-size:7pt;color:#888;margin-bottom:20px;">Le(la) salarié(e)</div>
          <div style="border-top:1px solid #ccc;padding-top:4px;font-size:7pt;color:#888;">${data.prenom} ${data.nom}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="mention">
    Art. R3243-1 C. trav. — Ce bulletin de paie doit être conservé sans limitation de durée. | Établi le ${datePaie} | Date de paiement : ${datePaiement} | ${data.raisonSociale} — SIRET ${data.siret}
  </div>

</div>
</body>
</html>`;
}

// Fonction utilitaire pour formater les montants
function formatMonnaie(montant: number): string {
  return montant.toFixed(2) + ' €';
}

// Générer un bulletin de paie en PDF (via impression navigateur)
export function ouvrirBulletinPaie(data: BulletinPaieData): void {
  const html = genererBulletinPaieHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
}

// Valider les données du bulletin avec messages d'erreur détaillés
export function validerDonneesBulletin(data: Partial<BulletinPaieData>): { valid: boolean; erreurs: string[] } {
  const erreurs: string[] = [];

  if (!data.nom || data.nom.trim() === '') erreurs.push('Le nom du salarié est obligatoire (champ vide)');
  if (!data.prenom || data.prenom.trim() === '') erreurs.push('Le prénom du salarié est obligatoire (champ vide)');
  if (!data.nir) {
    erreurs.push('Le numéro de Sécurité sociale (NIR) est obligatoire');
  } else if (data.nir.length !== 15) {
    erreurs.push(`Le numéro de Sécurité sociale (NIR) est invalide : ${data.nir.length} caractères au lieu de 15 requis. Format attendu : 15 chiffres (ex: 12345678901234)`);
  }
  if (!data.salaireBrut || data.salaireBrut <= 0) {
    erreurs.push(`Le salaire brut doit être supérieur à 0. Valeur actuelle : ${data.salaireBrut || 'non renseigné'}`);
  }
  if (!data.raisonSociale || data.raisonSociale.trim() === '') erreurs.push('La raison sociale de l\'entreprise est obligatoire (champ vide)');
  if (!data.siret) {
    erreurs.push('Le numéro SIRET est obligatoire');
  } else if (data.siret.length !== 14) {
    erreurs.push(`Le numéro SIRET est invalide : ${data.siret.length} caractères au lieu de 14 requis. Format attendu : 14 chiffres (ex: 12345678900012)`);
  }

  return {
    valid: erreurs.length === 0,
    erreurs
  };
}

// Calculer le salaire minimum selon le contrat
export function calculerSalaireMinimum(
  typeContrat: 'cdd' | 'cdi' | 'apprentissage' | 'professionnalisation' | 'stage' | 'portage' | 'interim' | 'alternance' | 'freelance' | 'other',
  statut: 'cadre' | 'non_cadre',
  age: number,
  heuresHebdo: number = 35
): { montant: number; source: string } {
  const smicHoraire = SMIC_2024.horaire;
  const smicMensuel = SMIC_2024.mensuel_35h * (heuresHebdo / 35);

  // Map alternance to apprentissage for calculation
  const alternanceType = typeContrat === 'alternance' ? 'apprentissage' : typeContrat;

  if (alternanceType === 'apprentissage' || alternanceType === 'professionnalisation') {
    return {
      montant: getSalaireMinimumAlternance(alternanceType as 'apprentissage' | 'professionnalisation', age, smicMensuel),
      source: 'SMIC + % selon âge (articles D6222-26 et D6232-8 du Code du travail)'
    };
  }

  if (typeContrat === 'stage') {
    // Gratification minimale de stage (2024: 15% du SMIC horaire, soit ~4,05€/heure ou ~607€/mois)
    return {
      montant: smicMensuel * 0.15,
      source: 'Gratification minimale de stage (15% du SMIC horaire, article L124-6 du Code de l\'éducation)'
    };
  }

  return {
    montant: smicMensuel,
    source: 'SMIC 2024 (articles D3231-13 et suivants du Code du travail)'
  };
}

// Créer un bulletin de paie par défaut pour un contrat
export function creerBulletinDepuisContrat(
  contrat: any,
  periodeDebut: string,
  periodeFin: string
): BulletinPaieData {
  const nombreJoursOuvres = calculerJoursOuvres(periodeDebut, periodeFin);

  return {
    nom: contrat.employeeLastName || '',
    prenom: contrat.employeeFirstName || '',
    adresse: contrat.employeeAddress || '',
    codePostal: contrat.employeePostalCode || '',
    ville: contrat.employeeCity || '',
    nir: contrat.employeeSocialSecurity || '',
    dateNaissance: contrat.employeeBirthDate || '',
    situationFamiliale: 'celibataire',
    nombreEnfants: 0,

    typeContrat: contrat.typeContrat || 'cdi',
    dateDebut: periodeDebut,
    dateFin: contrat.contractEndDate,
    statut: contrat.statut || 'non_cadre',
    classification: contrat.jobTitle || '',
    conventionCollective: contrat.collectiveAgreement || '',
    coef: 100,

    salaireBrut: parseFloat(contrat.salaryAmount) || SMIC_2024.mensuel_35h,
    salaireBrutAnnuel: (parseFloat(contrat.salaryAmount) || SMIC_2024.mensuel_35h) * 12,
    heuresMensuelles: parseFloat(contrat.workingHours) || 151.67,
    tauxHoraire: (() => {
      const s = parseFloat(contrat.salaryAmount);
      const h = parseFloat(contrat.workingHours) || 151.67;
      return s && !isNaN(s) ? parseFloat((s / h).toFixed(4)) : undefined;
    })(),

    raisonSociale: contrat.companyName || '',
    siret: contrat.companySiret || '',
    adresseEntreprise: contrat.companyAddress || '',
    codePostalEntreprise: contrat.companyPostalCode || '',
    villeEntreprise: contrat.companyCity || '',
    urssaf: contrat.companySiret || '',

    periodeDebut,
    periodeFin,
    nombreJoursOuvres,
  };
}

function calculerJoursOuvres(debut: string, fin: string): number {
  const startDate = new Date(debut);
  const endDate = new Date(fin);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.round(diffDays * 5 / 7); // Approx 5/7 de jours ouvrés
}
