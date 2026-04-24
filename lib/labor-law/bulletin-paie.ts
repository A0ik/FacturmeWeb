// Générateur de bulletins de paie
// Crée des bulletins de paie conformes à la réglementation française

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

  // Options
  tempsPartiel?: boolean;
  pourcentageTempsPartiel?: number;
  avantagesEnNature?: number;
  fraisProfessionnels?: number;
  avantagesEnNatureNourriture?: number;

  // Entreprise
  raisonSociale: string;
  siret: string;
  adresseEntreprise: string;
  codePostalEntreprise: string;
  villeEntreprise: string;
  urssaf: string; // Numéro SIRET pour URSSAF

  // Période
  periodeDebut: string;
  periodeFin: string;
  nombreJoursOuvres: number;
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

// Générer un bulletin de paie HTML
export function genererBulletinPaieHTML(data: BulletinPaieData): string {
  const cotisations = calculerCotisations({
    salaireBrut: data.salaireBrut,
    salaireBrutAnnuel: data.salaireBrutAnnuel,
    statut: data.statut === 'alternance' ? 'non_cadre' : data.statut,
    tempsPartiel: data.tempsPartiel,
  });

  const display = getCotisationsDisplay(cotisations);

  // Calculer les congés payés
  const joursCongesAcquis = Math.floor(data.nombreJoursOuvres * 2.0833 / 10);
  const joursCongesPris = 0; // À définir selon l'historique

  const periode = `${new Date(data.periodeDebut).toLocaleDateString('fr-FR')} au ${new Date(data.periodeFin).toLocaleDateString('fr-FR')}`;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulletin de paie - ${data.nom} ${data.prenom}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      font-family: 'Arial', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #1D9E75;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #1D9E75;
      margin: 0 0 10px 0;
      font-size: 20px;
      font-weight: bold;
    }
    .entete {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 5px;
    }
    .salarie-info {
      flex: 1;
    }
    .periode {
      text-align: right;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      background: #1D9E75;
      color: white;
      padding: 8px 12px;
      font-weight: bold;
      font-size: 13px;
      margin: 0 0 10px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background: #f0f0f0;
      font-weight: bold;
      font-size: 11px;
    }
    .ligne-grasse {
      border-top: 2px solid #1D9E75;
      font-weight: bold;
    }
    .total-ligne {
      background: #f8f9fa;
      font-weight: bold;
    }
    .positif { color: #28a745; }
    .negatif { color: #dc3545; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 10px;
    }
    .signature {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 45%;
      min-height: 80px;
      border: 1px dashed #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 11px;
    }
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>BULLETIN DE PAIE</h1>
    <p style="margin: 5px 0;">${data.typeContrat.toUpperCase()} - ${data.statut.toUpperCase()}</p>
  </div>

  <div class="entete">
    <div class="salarie-info">
      <strong>${data.prenom} ${data.nom}</strong><br>
      ${data.adresse}<br>
      ${data.codePostal} ${data.ville}<br>
      <small>NIR : ${data.nir}</small>
    </div>
    <div class="periode">
      <strong>Période :</strong> ${periode}<br>
      <strong>Date de paie :</strong> ${new Date().toLocaleDateString('fr-FR')}<br>
      <small>Nbre jours ouvrés : ${data.nombreJoursOuvres}</small>
    </div>
  </div>

  <div class="entete">
    <div class="salarie-info">
      <strong>${data.raisonSociale}</strong><br>
      ${data.adresseEntreprise}<br>
      ${data.codePostalEntreprise} ${data.villeEntreprise}<br>
      <small>SIRET : ${data.siret}</small>
    </div>
    <div class="periode">
      <strong>Statut :</strong> ${data.statut.toUpperCase()}<br>
      <strong>Classification :</strong> ${data.classification}<br>
      <strong>Coef :</strong> ${data.coef}<br>
      <small>CCN : ${data.conventionCollective}</small>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">ÉLÉMENTS DE RÉMUNÉRATION</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 40%">Libellé</th>
          <th style="width: 15%">Base</th>
          <th style="width: 15%">Taux</th>
          <th style="width: 15%">À prélever</th>
          <th style="width: 15%">À payer</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Salaire de base</td>
          <td>${formatMonnaie(data.salaireBrut)}</td>
          <td></td>
          <td></td>
          <td class="positif">${formatMonnaie(data.salaireBrut)}</td>
        </tr>
        ${data.heuresSupplementaires ? `
        <tr>
          <td>Heures supplémentaires (${data.heuresSupplementaires}h à ${data.majorationHeuresSup}%)</td>
          <td>${formatMonnaie(data.heuresSupplementaires * data.tauxHoraire! * (1 + (data.majorationHeuresSup || 0) / 100))}</td>
          <td></td>
          <td></td>
          <td class="positif">${formatMonnaie(data.heuresSupplementaires * data.tauxHoraire! * (1 + (data.majorationHeuresSup || 0) / 100))}</td>
        </tr>
        ` : ''}
        ${data.avantagesEnNature ? `
        <tr>
          <td>Avantages en nature</td>
          <td>${formatMonnaie(data.avantagesEnNature)}</td>
          <td></td>
          <td class="negatif">${formatMonnaie(data.avantagesEnNature)}</td>
          <td></td>
        </tr>
        ` : ''}
        ${data.tempsPartiel ? `
        <tr>
          <td>Malus temps partiel (${data.pourcentageTempsPartiel}%)</td>
          <td></td>
          <td></td>
          <td></td>
          <td class="negatif">${formatMonnaie(data.salaireBrut * (data.pourcentageTempsPartiel || 0) / 100)}</td>
        </tr>
        ` : ''}
        <tr class="total-ligne">
          <td><strong>TOTAL BRUT</strong></td>
          <td></td>
          <td></td>
          <td></td>
          <td><strong class="positif">${formatMonnaie(data.salaireBrut)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3 class="section-title">COTISATIONS SALARIALES</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 40%">Libellé</th>
          <th style="width: 15%">Base</th>
          <th style="width: 15%">Taux</th>
          <th style="width: 15%">À prélever</th>
          <th style="width: 15%">À payer</th>
        </tr>
      </thead>
      <tbody>
        ${display.salariales.map(cotis => `
        <tr>
          <td>${cotis.label}</td>
          <td>${formatMonnaie(cotis.value)}</td>
          <td>${typeof cotis.taux === 'number' ? cotis.taux.toFixed(2) + '%' : cotis.taux}</td>
          <td class="negatif">${formatMonnaie(cotis.value)}</td>
          <td></td>
        </tr>
        `).join('')}
        <tr class="total-ligne">
          <td><strong>TOTAL COTISATIONS SALARIALES</strong></td>
          <td></td>
          <td></td>
          <td><strong class="negatif">${formatMonnaie(cotisations.salariales.total)}</strong></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3 class="section-title">COTISATIONS PATRONALES</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 40%">Libellé</th>
          <th style="width: 15%">Base</th>
          <th style="width: 15%">Taux</th>
          <th style="width: 15%">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${display.patronales.map(cotis => `
        <tr>
          <td>${cotis.label}</td>
          <td>${formatMonnaie(cotis.value)}</td>
          <td>${typeof cotis.taux === 'number' ? cotis.taux.toFixed(2) + '%' : cotis.taux}</td>
          <td>${formatMonnaie(cotis.value)}</td>
        </tr>
        `).join('')}
        <tr class="total-ligne">
          <td><strong>TOTAL COTISATIONS PATRONALES</strong></td>
          <td></td>
          <td></td>
          <td><strong>${formatMonnaie(cotisations.patronales.total)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3 class="section-title">NET À PAYER</h3>
    <table>
      <tbody>
        <tr class="total-ligne">
          <td style="width: 40%"><strong>SALAIRE NET</strong></td>
          <td style="width: 15%"></td>
          <td style="width: 15%"></td>
          <td style="width: 15%"></td>
          <td style="width: 15%"><strong class="positif">${formatMonnaie(cotisations.salaireNet)}</strong></td>
        </tr>
        <tr>
          <td>Congés payés acquis : ${joursCongesAcquis.toFixed(2)} jours</td>
          <td>Congés payés pris : ${joursCongesPris.toFixed(2)} jours</td>
          <td></td>
          <td></td>
          <td>Solde : ${(joursCongesAcquis - joursCongesPris).toFixed(2)} jours</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3 class="section-title">Mentions légales</h3>
    <p style="font-size: 11px; margin: 5px 0;">
      <strong>Salaire net imposable :</strong> ${formatMonnaie(cotisations.salaireNetImposable)}<br>
      <strong>Coût employeur :</strong> ${formatMonnaie(cotisations.coutEmployer)}
    </p>
  </div>

  <div class="signature">
    <div class="signature-box">Signature de l'employeur</div>
    <div class="signature-box">Signature du salarié</div>
  </div>

  <div class="footer">
    <p>Ce bulletin de paie est généré automatiquement et n'a pas de valeur légale sans signature.</p>
    <p>Conformément à l'article R3243-2 du Code du travail, ce bulletin de paie est remis en ligne sur un support électronique.</p>
    <p>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
  </div>
</body>
</html>
  `;
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

// Valider les données du bulletin
export function validerDonneesBulletin(data: Partial<BulletinPaieData>): { valid: boolean; erreurs: string[] } {
  const erreurs: string[] = [];

  if (!data.nom) erreurs.push('Le nom du salarié est obligatoire');
  if (!data.prenom) erreurs.push('Le prénom du salarié est obligatoire');
  if (!data.nir || data.nir.length !== 15) {
    erreurs.push('Le numéro de Sécurité sociale (NIR) est invalide (15 chiffres requis)');
  }
  if (!data.salaireBrut || data.salaireBrut <= 0) {
    erreurs.push('Le salaire brut doit être supérieur à 0');
  }
  if (!data.raisonSociale) erreurs.push('La raison sociale de l\'entreprise est obligatoire');
  if (!data.siret || data.siret.length !== 14) {
    erreurs.push('Le numéro SIRET est invalide (14 chiffres requis)');
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
    tauxHoraire: parseFloat(contrat.salaryAmount) / (parseFloat(contrat.workingHours) || 35) / 4.33,
    heuresMensuelles: parseFloat(contrat.workingHours) || 35,

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
