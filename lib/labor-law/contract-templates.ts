/**
 * Templates de contrats - Design Moderne "Corporate"
 * Inspiré des standards juridiques professionnels (Tableaux récapitulatifs, mise en page aérée)
 */

export interface ContractTemplateData {
  // Couleur d'accent
  accentColor?: string;

  // Informations salarié
  employeeFirstName: string;
  employeeLastName: string;
  employeeAddress: string;
  employeePostalCode: string;
  employeeCity: string;
  employeeEmail?: string;
  employeePhone?: string;
  employeeBirthDate: string;
  employeeBirthPlace?: string; // Ajouté pour le style du PDF
  employeeSocialSecurity?: string;
  employeeNationality: string;
  employeeQualification?: string;

  // Informations contrat
  contractType: 'cdd' | 'cdi' | 'stage' | 'apprentissage' | 'professionnalisation' | 'interim' | 'portage' | 'freelance';
  contractStartDate: string;
  contractEndDate?: string;
  trialPeriodDays?: string;
  jobTitle: string;
  workLocation: string;
  workSchedule: string;
  workingHours?: string;
  salaryAmount: string;
  salaryFrequency: 'monthly' | 'hourly' | 'weekly' | 'flat_rate';
  contractClassification?: string;
  contractReason?: string;
  replacedEmployeeName?: string;

  // Informations entreprise
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  employerName: string;
  employerTitle: string;
  companyApe?: string; // Ajouté pour le style du PDF

  // Avantages
  hasTransport?: boolean;
  hasMeal?: boolean;
  hasHealth?: boolean;
  hasOther?: boolean;
  otherBenefits?: string;

  // Clauses spéciales
  collectiveAgreement?: string;
  probationClause?: boolean;
  nonCompeteClause?: boolean;
  mobilityClause?: boolean;

  // Stage / Alternance spécifique
  tutorName?: string;
  schoolName?: string;
  speciality?: string;
  objectives?: string;
  tasks?: string;
  durationWeeks?: string;

  // Signatures
  employerSignature?: string;
  employeeSignature?: string;
  employerSignatureDate?: string;
  employeeSignatureDate?: string;
}

// ==========================================
// DESIGN SYSTEM & STYLES
// ==========================================

function getModernStyles(accentColor: string): string {
  return `
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-footer { position: fixed; bottom: 10mm; left: 0; right: 0; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      max-width: 210mm;
      margin: 0 auto;
      padding: 15mm 20mm;
      line-height: 1.5;
      font-size: 10pt;
      color: #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 25px;
    }
    .header-left h2 {
      margin: 0;
      font-size: 12pt;
      color: #000;
      text-transform: uppercase;
    }
    .header-left p {
      margin: 5px 0 0 0;
      font-size: 9pt;
      color: #555;
    }
    .header-right {
      text-align: right;
      font-size: 9pt;
      font-weight: bold;
      color: #d32f2f; /* Rouge confidentiel */
      text-transform: uppercase;
    }
    .main-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 30px 0 5px 0;
      letter-spacing: 1px;
    }
    .sub-title {
      text-align: center;
      font-size: 11pt;
      color: #555;
      font-weight: bold;
      margin-bottom: 30px;
    }
    
    /* Bloc Parties */
    .parties-container {
      border: 1px solid #ddd;
      padding: 20px;
      margin-bottom: 30px;
      background: #fafafa;
    }
    .parties-title {
      text-align: center;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 20px;
      font-size: 10pt;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .party-block h4 {
      margin: 0 0 10px 0;
      font-size: 10pt;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
      color: #000;
    }
    .info-line { margin-bottom: 4px; font-size: 9.5pt; }
    .info-label { font-weight: bold; color: #444; }

    /* Tableau Récapitulatif */
    .recap-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 9.5pt;
    }
    .recap-table th, .recap-table td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    .recap-table th {
      background-color: #f5f5f5;
      width: 35%;
      font-weight: bold;
      color: #333;
    }
    .recap-table td {
      background-color: #fff;
    }

    /* Articles */
    .article-block {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .article-header {
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
      font-size: 10pt;
      color: #000;
      border-bottom: 1px solid #eee;
      padding-bottom: 3px;
    }
    .article-content {
      text-align: justify;
      font-size: 10pt;
    }
    .article-content p { margin: 0 0 8px 0; }

    /* Signatures */
    .signatures-container {
      margin-top: 60px;
      padding-top: 20px;
    }
    .fait-a {
      text-align: right;
      margin-bottom: 40px;
      font-size: 10pt;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
    }
    .sig-box h4 {
      margin: 0 0 5px 0;
      font-size: 10pt;
    }
    .sig-box p {
      margin: 0;
      font-size: 9pt;
      color: #555;
    }
    .sig-space {
      height: 80px;
      margin: 15px 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-img {
      max-height: 75px;
      max-width: 100%;
      object-fit: contain;
    }

    /* Footer */
    .page-footer {
      margin-top: 40px;
      padding-top: 10px;
      border-top: 1px solid #eee;
      text-align: center;
      font-size: 8pt;
      color: #888;
    }
  `;
}

// ==========================================
// LOGIQUE DYNAMIQUE (Adapte le contenu au type)
// ==========================================

function getContractTitle(type: string): string {
  switch (type) {
    case 'cdd': return 'CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE';
    case 'stage': return 'CONVENTION DE STAGE';
    case 'apprentissage':
    case 'professionnalisation': return 'CONTRAT D\'APPRENTISSAGE / ALTERNANCE';
    case 'freelance': return 'CONTRAT DE PRESTATION DE SERVICE';
    case 'interim': return 'CONTRAT DE MISSION INTÉRIMAIRE';
    case 'portage': return 'CONTRAT DE PORTAGE SALARIAL';
    default: return 'CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE';
  }
}

function getSubtitle(data: ContractTemplateData): string {
  if (data.contractType === 'freelance') return `PRESTATION : ${data.jobTitle.toUpperCase()}`;
  if (data.contractType === 'stage') return `STAGE : ${data.jobTitle.toUpperCase()}`;
  return `TEMPS PLEIN — ${data.salaryFrequency === 'hourly' ? 'TAUX HORAIRE' : 'SALAIRE MENSUEL'}`;
}

function getRoleNames(type: string): [string, string] {
  if (type === 'freelance') return ["Le Client", "Le Prestataire"];
  if (type === 'stage') return ["L'Entreprise d'accueil", "Le Stagiaire"];
  return ["L'Employeur", "Le Salarié"];
}

function formatMoney(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function getSummaryRows(data: ContractTemplateData): [string, string][] {
  const rows: [string, string][] = [];

  rows.push(["Poste / Mission", data.jobTitle]);
  if (data.collectiveAgreement) rows.push(["Convention collective", data.collectiveAgreement]);

  rows.push(["Date de début", new Date(data.contractStartDate).toLocaleDateString('fr-FR')]);

  if (data.contractEndDate) {
    rows.push(["Date de fin", new Date(data.contractEndDate).toLocaleDateString('fr-FR')]);
  }

  if (data.trialPeriodDays && data.contractType !== 'stage') {
    const endDate = new Date(data.contractStartDate);
    endDate.setDate(endDate.getDate() + parseInt(data.trialPeriodDays));
    const renewText = data.probationClause ? "renouvelable une fois" : "";
    rows.push(["Fin période d'essai", `${endDate.toLocaleDateString('fr-FR')} (${data.trialPeriodDays} jours ${renewText})`]);
  }

  if (data.contractType === 'stage' && data.schoolName) {
    rows.push(["Établissement", data.schoolName]);
    if (data.tutorName) rows.push(["Tuteur", data.tutorName]);
  }

  const hoursText = data.workingHours ? `${data.workingHours} heures / mois` : "Temps plein";
  rows.push(["Durée du travail", hoursText]);

  let salaryText = formatMoney(data.salaryAmount);
  if (data.salaryFrequency === 'monthly') salaryText += " brut mensuel";
  else if (data.salaryFrequency === 'hourly') salaryText += " brut / heure";
  rows.push(["Rémunération", salaryText]);

  rows.push(["Lieu de travail", data.workLocation]);

  if (data.contractType === 'cdd' && data.contractReason) {
    rows.push(["Motif du CDD", data.contractReason]);
  }

  return rows;
}

function generateDynamicArticles(data: ContractTemplateData): string {
  const role2 = getRoleNames(data.contractType)[1];
  const fullName = `${data.employeeFirstName} ${data.employeeLastName}`;
  let html = '';

  // ARTICLE I - Engagement
  html += `
  <div class="article-block">
    <div class="article-header">Article I — Engagement</div>
    <div class="article-content">
      <p>Sous réserve des résultats de la visite médicale d'embauche le cas échéant, ${fullName} est engagé(e) à compter du ${new Date(data.contractStartDate).toLocaleDateString('fr-FR')} par la société ${data.companyName}, en qualité de ${data.jobTitle}.</p>
      ${data.contractClassification ? `<p>Cette qualification correspond au coefficient prévu par la convention collective ${data.collectiveAgreement || 'applicable'}.</p>` : ''}
    </div>
  </div>`;

  // ARTICLE II - Durée
  html += `
  <div class="article-block">
    <div class="article-header">Article II — Durée du contrat</div>
    <div class="article-content">
      ${data.contractType === 'cdi' ? `<p>Le présent contrat est conclu pour une durée indéterminée. Il ne prendra effet définitivement qu'à l'issue de la période d'essai définie dans le récapitulatif.</p>
        <p>Durant la période d'essai, chacune des parties pourra mettre fin au contrat sans indemnité, sous réserve du respect du délai de prévenance prévu par la loi.</p>`

      : data.contractType === 'cdd' ? `<p>Le présent contrat est conclu pour une durée déterminée, du ${data.contractStartDate ? new Date(data.contractStartDate).toLocaleDateString('fr-FR') : 'Non définie'} au ${data.contractEndDate ? new Date(data.contractEndDate).toLocaleDateString('fr-FR') : 'Non définie'}.</p>
        <p><strong>Motif :</strong> ${data.contractReason || 'Non précisé'} ${data.replacedEmployeeName ? `(Remplacement de ${data.replacedEmployeeName})` : ''}.</p>
        <p>Une indemnité de fin de contrat de 10% sera versée à l'échéance, sauf si le salarié est embauché en CDI immédiatement après.</p>`

        : data.contractType === 'stage' ? `<p>La présente convention est conclue pour une durée de ${data.durationWeeks || 'Non définie'} semaines, du ${data.contractStartDate ? new Date(data.contractStartDate).toLocaleDateString('fr-FR') : 'Non définie'} au ${data.contractEndDate ? new Date(data.contractEndDate).toLocaleDateString('fr-FR') : 'Non définie'}.</p>
        <p>Cette période ne peut excéder 6 mois par an conformément au Code de l'éducation.</p>`

          : data.contractType === 'freelance' ? `<p>La présente prestation débute le ${new Date(data.contractStartDate).toLocaleDateString('fr-FR')}${data.contractEndDate ? ` et s'achève le ${new Date(data.contractEndDate).toLocaleDateString('fr-FR')}` : ''}.</p>`

            : `<p>Le présent contrat est conclu pour la durée du cycle de formation, du ${data.contractStartDate ? new Date(data.contractStartDate).toLocaleDateString('fr-FR') : 'Non définie'} au ${data.contractEndDate ? new Date(data.contractEndDate).toLocaleDateString('fr-FR') : 'Non définie'}.</p>`
    }
    </div>
  </div>`;

  // ARTICLE III - Fonctions / Missions
  html += `
  <div class="article-block">
    <div class="article-header">Article III — Fonctions et Missions</div>
    <div class="article-content">
      <p>${fullName} exercera les fonctions de ${data.jobTitle}. Il (elle) effectuera toutes les tâches inhérentes à ce poste, dans le respect des instructions et procédures de l'entreprise.</p>
      ${data.tasks ? `<p style="margin-top:10px; padding:10px; background:#f9f9f9; border-left:3px solid ${data.accentColor || '#000'};"><strong>Missions détaillées :</strong> ${data.tasks}</p>` : ''}
    </div>
  </div>`;

  // ARTICLE IV - Rémunération
  if (data.contractType !== 'freelance') {
    html += `
    <div class="article-block">
      <div class="article-header">Article IV — Rémunération</div>
      <div class="article-content">
        <p>${fullName} percevra une rémunération de <strong>${formatMoney(data.salaryAmount)} ${data.salaryFrequency === 'monthly' ? 'brut mensuel' : 'brut par heure'}</strong>.</p>
        <p>Cette rémunération sera versée mensuellement, déduction faite des cotisations sociales légales en vigueur.</p>
      </div>
    </div>`;
  } else {
    html += `
    <div class="article-block">
      <div class="article-header">Article IV — Facturation et Paiement</div>
      <div class="article-content">
        <p>Le prestataire facturera ses services au taux de <strong>${formatMoney(data.salaryAmount)}</strong>. Les factures seront adressées mensuellement et payées par virement sous 30 jours.</p>
      </div>
    </div>`;
  }

  // ARTICLE V - Durée du travail
  if (data.contractType !== 'freelance') {
    html += `
    <div class="article-block">
      <div class="article-header">Article V — Durée du travail</div>
      <div class="article-content">
        <p>La durée du travail est fixée à ${data.workingHours || '35'} heures par semaine ${data.workSchedule ? `(${data.workSchedule})` : ''}. Des heures supplémentaires pourront être demandées dans le strict respect des dispositions légales.</p>
      </div>
    </div>`;
  }

  // ARTICLE VI - Absences / Maladie
  if (!['freelance'].includes(data.contractType)) {
    html += `
    <div class="article-block">
      <div class="article-header">Article VI — Absences et Maladie</div>
      <div class="article-content">
        <p>${fullName} s'engage à informer immédiatement ${data.companyName} de toute absence. Un certificat médical devra être transmis dans un délai de 48 heures.</p>
      </div>
    </div>`;
  }

  // ARTICLE VII - Congés
  if (['cdi', 'cdd', 'apprentissage', 'professionnalisation', 'interim', 'portage'].includes(data.contractType)) {
    html += `
    <div class="article-block">
      <div class="article-header">Article VII — Congés payés</div>
      <div class="article-content">
        <p>${fullName} bénéficiera des congés payés conformément aux articles L. 3141-1 et suivants du Code du travail.</p>
      </div>
    </div>`;
  }

  // ARTICLE VIII - Confidentialité
  html += `
  <div class="article-block">
    <div class="article-header">Article VIII — Discrétion et Non-concurrence</div>
    <div class="article-content">
      <p>${fullName} s'engage à observer la plus stricte confidentialité concernant les informations et données dont il (elle) aura connaissance. ${data.nonCompeteClause ? `Il (elle) s'engage également à n'exercer aucune activité concurrente.` : ''}</p>
    </div>
  </div>`;

  // ARTICLE IX - Rupture
  html += `
  <div class="article-block">
    <div class="article-header">Article IX — Rupture du contrat</div>
    <div class="article-content">
      ${data.contractType === 'freelance' ? `<p>Le présent contrat peut être résilié par l'une ou l'autre des parties avec un préavis de 30 jours, ou sans préavis en cas de faute grave.</p>`
      : `<p>Chacune des parties pourra rompre le présent contrat en respectant les dispositions légales et conventionnelles en vigueur, notamment les délais de préavis.</p>`
    }
    </div>
  </div>`;

  // ARTICLE X - Dispositions diverses
  html += `
  <div class="article-block">
    <div class="article-header">Article X — Dispositions diverses</div>
    <div class="article-content">
      <p>Le présent contrat est régi par le droit français. Tout litige relatif à son exécution sera soumis à la juridiction compétente du ressort du siège social de la société.</p>
    </div>
  </div>`;

  return html;
}

// ==========================================
// GENERATEUR PRINCIPAL
// ==========================================

function buildContractHTML(data: ContractTemplateData): string {
  const accentColor = data.accentColor || '#000000';
  const [role1, role2] = getRoleNames(data.contractType);
  const summaryRows = getSummaryRows(data);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${getContractTitle(data.contractType)} - ${data.employeeFirstName} ${data.employeeLastName}</title>
  <style>${getModernStyles(accentColor)}</style>
</head>
<body>
  
  <div class="header">
    <div class="header-left">
      <h2>${data.companyName}</h2>
      <p>${getContractTitle(data.contractType)}</p>
    </div>
    <div class="header-right">
      Confidentiel
    </div>
  </div>

  <div class="main-title">${getContractTitle(data.contractType)}</div>
  <div class="sub-title">${getSubtitle(data)}</div>

  <div class="parties-container">
    <div class="parties-title">ENTRE LES SOUSSIGNÉS</div>
    <div class="parties-grid">
      <div class="party-block">
        <h4>${role1.toUpperCase()}</h4>
        <div class="info-line"><strong>${data.companyName}</strong></div>
        <div class="info-line">${data.companyAddress}</div>
        <div class="info-line">${data.companyPostalCode} ${data.companyCity}</div>
        <div class="info-line"><span class="info-label">SIRET :</span> ${data.companySiret}</div>
        ${data.companyApe ? `<div class="info-line"><span class="info-label">APE :</span> ${data.companyApe}</div>` : ''}
        <div class="info-line"><span class="info-label">Représentant :</span> ${data.employerName}, ${data.employerTitle}</div>
      </div>
      <div class="party-block">
        <h4>${role2.toUpperCase()}</h4>
        <div class="info-line"><strong>${data.employeeFirstName} ${data.employeeLastName}</strong></div>
        <div class="info-line">Né(e) le : ${new Date(data.employeeBirthDate).toLocaleDateString('fr-FR')}${data.employeeBirthPlace ? ` à ${data.employeeBirthPlace}` : ''}</div>
        <div class="info-line"><span class="info-label">Nationalité :</span> ${data.employeeNationality}</div>
        <div class="info-line">Demeurant :<br>${data.employeeAddress}<br>${data.employeePostalCode} ${data.employeeCity}</div>
        ${data.employeeSocialSecurity ? `<div class="info-line"><span class="info-label">N° Sécurité Sociale :</span> ${data.employeeSocialSecurity}</div>` : ''}
      </div>
    </div>
  </div>

  <p style="text-align: center; margin-bottom: 25px; font-style: italic;">Il a été convenu et arrêté ce qui suit :</p>

  <div class="article-block">
    <div class="article-header">Article Préambule — Récapitulatif des conditions</div>
    <table class="recap-table">
      <tbody>
        ${summaryRows.map(([label, value]) => `
          <tr>
            <th>${label}</th>
            <td>${value}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${generateDynamicArticles(data)}

  <div class="signatures-container">
    <div class="fait-a">
      Fait à ${data.companyCity}, le ${new Date().toLocaleDateString('fr-FR')}, en deux exemplaires originaux.
    </div>
    
    <div class="signatures-grid">
      <div class="sig-box">
        <h4>${role2}</h4>
        <p>${data.employeeFirstName} ${data.employeeLastName}</p>
        ${data.contractType !== 'freelance' && data.contractType !== 'stage' ? `<p>(Précédé de la mention "Lu et approuvé")</p>` : ''}
        <div class="sig-space">
          ${data.employeeSignature ? `<img src="${data.employeeSignature}" class="sig-img" alt="Signature">` : ''}
        </div>
        <p><strong>Signature</strong></p>
      </div>
      <div class="sig-box">
        <h4>${role1}</h4>
        <p>${data.employerName} — ${data.companyName}</p>
        <p>(Cachet + Signature)</p>
        <div class="sig-space">
          ${data.employerSignature ? `<img src="${data.employerSignature}" class="sig-img" alt="Signature">` : ''}
        </div>
        <p><strong>Signature & Cachet</strong></p>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <strong>${data.companyName}</strong> — SIREN ${data.companySiret.replace(/\s/g, '').substring(0, 9)} — ${data.companyAddress}, ${data.companyPostalCode} ${data.companyCity}
  </div>

</body>
</html>`;
}

// ==========================================
// EXPORTS (Garde la compatibilité avec ton SaaS)
// ==========================================

export function generateCDDContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'cdd' });
}

export function generateCDIContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'cdi' });
}

export function generateStageContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'stage' });
}

export function generateAlternanceContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'apprentissage' });
}

function generateFreelanceContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'freelance' });
}

export function generateContract(data: ContractTemplateData): string {
  return buildContractHTML(data);
}