/**
 * Templates de contrats de travail conformes au Code du travail français 2024
 * Ces templates sont juridiquement complets et incluent toutes les mentions obligatoires
 */

export interface ContractTemplateData {
  // Couleur d'accent (depuis profile.accent_color)
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
  contractReason?: string; // Pour CDD
  replacedEmployeeName?: string; // Pour CDD remplacement

  // Informations entreprise
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  employerName: string;
  employerTitle: string;

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

  // Signatures (base64) + dates
  employerSignature?: string;
  employeeSignature?: string;
  employerSignatureDate?: string; // ISO date string
  employeeSignatureDate?: string;
}

// ==========================================
// ÉLÉMENTS COMMUNS (Factorisés pour le SaaS)
// ==========================================

function getBaseStyles(accentColor: string): string {
  return `
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      line-height: 1.5;
      font-size: 12pt;
      color: #000;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid ${accentColor};
      padding-bottom: 20px;
    }
    .header h1 {
      color: ${accentColor};
      margin: 0 0 10px 0;
      font-size: 18pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .header .subtitle {
      font-size: 11pt;
      color: #666;
    }
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title {
      background: ${accentColor};
      color: white;
      padding: 8px 15px;
      font-weight: bold;
      font-size: 11pt;
      margin: 25px 0 15px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .article {
      margin-bottom: 15px;
    }
    .article-title {
      font-weight: bold;
      color: ${accentColor};
      margin-bottom: 8px;
    }
    .field {
      margin-bottom: 12px;
      display: flex;
      flex-wrap: wrap;
    }
    .label {
      font-weight: bold;
      color: #444;
      min-width: 180px;
      flex-shrink: 0;
    }
    .value {
      color: #000;
      flex-grow: 1;
    }
    .signature-area {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 45%;
      min-height: 120px;
      border: 2px solid #ccc;
      padding: 15px;
      position: relative;
      page-break-inside: avoid;
    }
    .signature-img {
      max-height: 80px;
      max-width: 100%;
      object-fit: contain;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }
    ul {
      margin: 10px 0;
      padding-left: 25px;
    }
    li {
      margin-bottom: 8px;
    }
    .highlight {
      background: #f5f5f5;
      padding: 15px;
      border-left: 4px solid ${accentColor};
      margin: 15px 0;
    }
    @media print {
      body { padding: 15mm; }
      .section { page-break-inside: avoid; }
    }
  `;
}

function getStandardSignatures(data: ContractTemplateData, role1: string, role2: string): string {
  return `
  <div class="signature-area">
    <div class="signature-box">
      <div class="field" style="border: none;">
        <span class="label" style="color: #333; font-weight: bold;">${role1}</span>
      </div>
      <div style="margin: 10px 0;">
        ${data.employerSignature ? `<img src="${data.employerSignature}" class="signature-img" alt="Signature employeur">` : '<br><br><br>'}
      </div>
      <div style="margin-top: auto; font-size: 9pt; color: #666;">
        ${data.companyName}<br>
        ${data.employerName}, ${data.employerTitle}<br>
        Date : ${data.employerSignatureDate ? new Date(data.employerSignatureDate).toLocaleDateString('fr-FR') : '______/_____/______'}
      </div>
    </div>
    <div class="signature-box">
      <div class="field" style="border: none;">
        <span class="label" style="color: #333; font-weight: bold;">${role2}</span>
      </div>
      <div style="margin: 10px 0;">
        ${data.employeeSignature ? `<img src="${data.employeeSignature}" class="signature-img" alt="Signature salarié">` : '<br><br><br>'}
      </div>
      <div style="margin-top: auto; font-size: 9pt; color: #666;">
        ${data.employeeFirstName} ${data.employeeLastName}<br>
        ${data.employeeAddress}<br>
        Date : ${data.employeeSignatureDate ? new Date(data.employeeSignatureDate).toLocaleDateString('fr-FR') : '______/_____/______'}
      </div>
    </div>
  </div>`;
}

function getFooter(data: ContractTemplateData, legalRef: string): string {
  return `
  <div class="footer">
    <p><strong>ATTENTION :</strong> Ce document est un modèle de contrat. Il ne constitue pas un avis juridique. Pour une validation juridique définitive, faites relire ce contrat par un avocat ou juriste spécialisé en droit du travail.</p>
    <p style="margin-top: 10px;">Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} | ${legalRef}</p>
  </div>`;
}

// ==========================================
// GENERATEURS DE CONTRATS
// ==========================================

/**
 * Génère un contrat CDD conforme au Code du travail (articles L. 1242-1 et suivants)
 */
export function generateCDDContract(data: ContractTemplateData): string {
  const today = new Date().toLocaleDateString('fr-FR');
  const accentColor = data.accentColor || '#1D9E75';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat de Travail à Durée Déterminée - ${data.employeeFirstName} ${data.employeeLastName}</title>
  <style>${getBaseStyles(accentColor)}</style>
</head>
<body>
  <div class="header">
    <h1>CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE</h1>
    <p class="subtitle">Conforme aux articles L. 1242-1 et suivants du Code du travail</p>
  </div>

  <div class="section">
    <p style="text-align: center; font-style: italic; margin-bottom: 20px;">Fait à ${data.companyCity}, le ${today}</p>
    <div class="field">
      <span class="label">Entre :</span>
      <span class="value"><strong>${data.companyName}</strong><br>${data.companyAddress}<br>${data.companyPostalCode} ${data.companyCity}<br>SIRET : ${data.companySiret}</span>
    </div>
    <div class="field">
      <span class="label">Représentée par :</span>
      <span class="value">${data.employerName}, ${data.employerTitle}</span>
    </div>
    <div class="field"><span class="label">Ci-après dénommée "l'employeur"</span></div>

    <div class="field" style="margin-top: 20px;">
      <span class="label">Et :</span>
      <span class="value"><strong>${data.employeeFirstName} ${data.employeeLastName}</strong><br>${data.employeeAddress}<br>${data.employeePostalCode} ${data.employeeCity}<br>Né(e) le ${new Date(data.employeeBirthDate).toLocaleDateString('fr-FR')}<br>Nationalité : ${data.employeeNationality}</span>
    </div>
    <div class="field"><span class="label">Ci-après dénommé(e) "le salarié"</span></div>
  </div>

  <div class="section-title">Article 1er - Engagement</div>
  <div class="section">
    <div class="article">
      <p>Le présent contrat est soumis aux dispositions des articles L. 1242-1 et suivants du Code du travail relatives aux contrats de travail à durée déterminée.</p>
      <p style="margin-top: 10px;">Il est convenu ce qui suit :</p>
    </div>
  </div>

  <div class="section-title">Article 2 - Durée du contrat</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Date de début du contrat :</span>
        <span class="value">${new Date(data.contractStartDate).toLocaleDateString('fr-FR')}</span>
      </div>
      <div class="field">
        <span class="label">Date de fin du contrat :</span>
        <span class="value">${data.contractEndDate ? new Date(data.contractEndDate).toLocaleDateString('fr-FR') : 'Non déterminée'}</span>
      </div>
      ${data.durationWeeks ? `<div class="field"><span class="label">Durée du contrat :</span><span class="value">${data.durationWeeks} semaines</span></div>` : ''}
    </div>
    <div class="article" style="margin-top: 20px;">
      <div class="article-title">2.1 - Motif de recours au CDD</div>
      <p>Conformément à l'article L. 1242-2 du Code du travail, le présent contrat est conclu pour le motif suivant :</p>
      <p style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-left: 4px solid ${accentColor};"><strong>${data.contractReason || 'Remplacement'}</strong></p>
      ${data.replacedEmployeeName ? `<p style="margin-top: 10px;">Salarié remplacé : <strong>${data.replacedEmployeeName}</strong></p>` : ''}
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Le motif de recours au CDD doit correspondre à l'un des cas prévus par l'article L. 1242-2 du Code du travail.</p>
    </div>
  </div>

  <div class="section-title">Article 3 - Période d'essai</div>
  <div class="section">
    <div class="article">
      <p>Conformément à l'article L. 1242-10 du Code du travail, le présent contrat pourra être précédé d'une période d'essai de :</p>
      <div class="field" style="margin-top: 10px;">
        <span class="label">Durée de la période d'essai :</span>
        <span class="value">${data.trialPeriodDays || '0'} jour(s)</span>
      </div>
      <p style="margin-top: 10px; font-size: 10pt;">Cette durée ne peut excéder une durée calculée à raison d'un jour par semaine de travail dans la limite de :</p>
      <ul>
        <li>Un mois lorsque la durée du contrat est inférieure ou égale à deux mois</li>
        <li>Deux mois lorsque la durée du contrat est comprise entre deux et quatre mois</li>
        <li>Trois mois lorsque la durée du contrat est comprise entre quatre et six mois</li>
        <li>Quatre mois lorsque la durée du contrat est comprise entre six et huit mois</li>
        <li>Cinq mois lorsque la durée du contrat est comprise entre huit mois et un an</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 4 - Désignation du poste</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Intitulé du poste :</span>
        <span class="value"><strong>${data.jobTitle}</strong></span>
      </div>
      ${data.contractClassification ? `<div class="field"><span class="label">Classification conventionnelle :</span><span class="value">${data.contractClassification}</span></div>` : ''}
      <div class="field">
        <span class="label">Lieu de travail :</span>
        <span class="value">${data.workLocation}</span>
      </div>
    </div>
  </div>

  <div class="section-title">Article 5 - Durée du travail</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Horaires de travail :</span>
        <span class="value">${data.workSchedule}</span>
      </div>
      ${data.workingHours ? `<div class="field"><span class="label">Heures hebdomadaires :</span><span class="value">${data.workingHours} heures</span></div>` : ''}
      <p style="margin-top: 10px; font-size: 10pt;">La durée légale du travail est fixée à 35 heures hebdomadaires (articles L. 3121-27 et suivants du Code du travail).</p>
    </div>
  </div>

  <div class="section-title">Article 6 - Rémunération</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Salaire de base :</span>
        <span class="value"><strong>${data.salaryAmount} € ${data.salaryFrequency === 'monthly' ? 'brut mensuel' : data.salaryFrequency === 'hourly' ? 'brut par heure' : data.salaryFrequency === 'weekly' ? 'brut hebdomadaire' : 'brut'}</strong></span>
      </div>
      ${data.workingHours && data.salaryFrequency === 'hourly' ? `<div class="field"><span class="label">Taux horaire :</span><span class="value">${(parseFloat(data.salaryAmount)).toFixed(2)} €/heure</span></div>` : ''}
      <p style="margin-top: 10px;">Ce salaire ne peut être inférieur au :</p>
      <ul>
        <li>SMIC (Salaire Minimum Interprofessionnel de Croissance) ou au salaire minimum conventionnel applicable</li>
        <li>Minimum conventionnel prévu par la convention collective applicable à l'entreprise</li>
      </ul>
      ${data.collectiveAgreement ? `<div class="field" style="margin-top: 10px;"><span class="label">Convention collective applicable :</span><span class="value">${data.collectiveAgreement}</span></div>` : ''}
    </div>
  </div>

  <div class="section-title">Article 7 - Avantages et accessoires du salaire</div>
  <div class="section">
    <div class="article">
      <p>Le salarié bénéficiera, en outre du salaire de base, des avantages suivants :</p>
      <ul>
        ${data.hasTransport ? '<li>Prise en charge partielle ou totale des titres de transport</li>' : ''}
        ${data.hasMeal ? '<li>Titres-restaurant</li>' : ''}
        ${data.hasHealth ? '<li>Complémentaire santé collective</li>' : ''}
        ${data.hasOther && data.otherBenefits ? `<li>${data.otherBenefits}</li>` : ''}
      </ul>
      ${!data.hasTransport && !data.hasMeal && !data.hasHealth && !data.hasOther ? "<p>Aucun avantage particulier n'est prévu au présent contrat.</p>" : ''}
    </div>
  </div>

  <div class="section-title">Article 8 - Congés payés</div>
  <div class="section">
    <div class="article">
      <p>Le salarié bénéficiera des mêmes droits à congés payés que les autres salariés de l'entreprise, calculés conformément aux articles L. 3141-1 et suivants du Code du travail.</p>
      <p style="margin-top: 10px;">Le salarié acquiert 2,5 jours ouvrables de congés par mois de travail, soit 30 jours ouvrables pour une année complète de travail.</p>
    </div>
  </div>

  <div class="section-title">Article 9 - Obligations des parties</div>
  <div class="section">
    <div class="article">
      <div class="article-title">9.1 - Obligations du salarié</div>
      <p>Le salarié s'engage à :</p>
      <ul>
        <li>Exécuter son travail avec conscience et diligence aux lieu, temps et conditions fixés</li>
        <li>Respecter les horaires de travail et les directives de l'employeur</li>
        <li>Observer les règles de sécurité et d'hygiène en vigueur dans l'entreprise</li>
        <li>Ne pas divulguer les informations confidentielles dont il aurait connaissance dans l'exercice de ses fonctions</li>
        <li>S'abstenir de toute concurrence déloyale envers l'employeur</li>
      </ul>
    </div>
    <div class="article" style="margin-top: 20px;">
      <div class="article-title">9.2 - Obligations de l'employeur</div>
      <p>L'employeur s'engage à :</p>
      <ul>
        <li>Fournir un travail correspondant à sa qualification et rémunérer le salarié</li>
        <li>Assurer la formation et l'adaptation du salarié à son poste de travail</li>
        <li>Respecter les dispositions légales et conventionnelles relatives à la durée du travail, aux congés, à la sécurité et à la santé</li>
        <li>Délivrer au salarié les documents obligatoires (bulletin de paie, certificat de travail, attestation Pôle Emploi, etc.)</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 10 - Clause de non-concurrence</div>
  <div class="section">
    <div class="article">
      ${data.nonCompeteClause ? `
      <p>Le salarié s'engage à ne pas exercer, pendant la durée du contrat et après son terme, toute activité concurrentielle à celle de l'employeur.</p>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Cette clause doit être limitée dans le temps, dans l'espace, indispensable à la protection des savoir-faire de l'entreprise et comporter l'obligation pour l'employeur de verser au salarié une contrepartie financière (articles L. 3142-16 et suivants du Code du travail).</p>
      ` : '<p>Aucune clause de non-concurrence n\'est prévue au présent contrat.</p>'}
    </div>
  </div>

  <div class="section-title">Article 11 - Rupture anticipée du contrat</div>
  <div class="section">
    <div class="article">
      <p>Conformément aux articles L. 1243-1 et suivants du Code du travail :</p>
      <ul>
        <li>La rupture anticipée du contrat par le salarié ouvre droit à des dommages-intérêts d'un montant au moins égal aux rémunérations qu'il aurait perçues jusqu'au terme du contrat</li>
        <li>Cette règle ne s'applique pas en cas de faute grave du salarié, de force majeure ou de rupture anticipée d'un commun accord entre les deux parties</li>
        <li>L'employeur qui rompt le contrat de manière anticipée doit proposer au salarié un autre emploi dans l'entreprise</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 12 - Indemnité de fin de contrat</div>
  <div class="section">
    <div class="article">
      <p>Conformément à l'article L. 1243-8 du Code du travail, le salarié a droit à une indemnité de fin de contrat égale à 10% de la rémunération totale brute due au salarié.</p>
      <p style="margin-top: 10px;">Cette indemnité s'ajoute à la rémunération totale brute due au salarié. Elle est versée à la fin du contrat, sauf si le CDD est suivi d'un CDI.</p>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Le taux peut être limité à 6% par accord collectif si des contreparties sont prévues (accès à la formation professionnelle, etc.).</p>
    </div>
  </div>

  <div class="section-title">Article 13 - Maladie et accidents du travail</div>
  <div class="section">
    <div class="article">
      <p>En cas d'absence pour maladie ou accident du travail, le salarié bénéficiera des dispositions légales et conventionnelles en vigueur, notamment :</p>
      <ul>
        <li>Maintien de son salaire pendant son arrêt de travail, sous déduction des indemnités journalières de Sécurité sociale</li>
        <li>Protection contre le licenciement pendant la durée de son arrêt (article L. 1226-9 du Code du travail)</li>
        <li>Droit à un reclassement professionnel en cas d'inaptitude médicale</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 14 - Protection de la santé et sécurité</div>
  <div class="section">
    <div class="article">
      <p>L'employeur doit prendre toutes les mesures nécessaires pour assurer la sécurité et protéger la santé physique et mentale des travailleurs (article L. 4121-1 du Code du travail).</p>
      <p style="margin-top: 10px;">Le salarié est soumis à une visite d'information et de prévention par le médecin du travail, conformément aux articles L. 4624-1 et suivants du Code du travail.</p>
    </div>
  </div>

  <div class="section-title">Article 15 - Clause de rémunération à la charge de l'employeur</div>
  <div class="section">
    <div class="article">
      <p>Les frais professionnels engagés par le salarié pour les besoins de son activité professionnelle seront remboursés par l'employeur sur présentation de justificatifs.</p>
      <p style="margin-top: 10px;">Ces frais incluent notamment : les frais de déplacement, les frais de repas, les frais d'hébergement, etc.</p>
    </div>
  </div>

  <div class="section-title">Article 16 - Litiges</div>
  <div class="section">
    <div class="article">
      <p>Tout litige relatif à l'exécution du présent contrat sera soumis au Conseil de prud'hommes compétent.</p>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Conformément à l'article L. 1411-1 du Code du travail, le Conseil de prud'hommes est compétent pour trancher les litiges individuels nés du contrat de travail.</p>
    </div>
  </div>

  <div class="section-title">Article 17 - Mentions diverses</div>
  <div class="section">
    <div class="article">
      ${data.mobilityClause ? '<p>Le salarié accepte d\'être amené à travailler sur différents sites géographiques de l\'entreprise dans le cadre de ses fonctions (clause de mobilité).</p>' : ''}
      ${data.probationClause ? '<p>La période d\'essai pourra être renouvelée une fois, d\'un commun accord entre les deux parties, dans la limite des durées prévues par l\'article L. 1242-10 du Code du travail.</p>' : ''}
      <p style="margin-top: 10px;">Le présent contrat est établi en deux exemplaires originaux, un pour chaque partie.</p>
    </div>
  </div>

  ${getStandardSignatures(data, "L'EMPLOYEUR", "LE SALARIÉ")}
  ${getFooter(data, "Conforme au Code du travail français 2024")}
</body>
</html>`;
}

/**
 * Génère un contrat CDI conforme au Code du travail
 */
export function generateCDIContract(data: ContractTemplateData): string {
  const today = new Date().toLocaleDateString('fr-FR');
  const accentColor = data.accentColor || '#1D9E75';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat de Travail à Durée Indéterminée - ${data.employeeFirstName} ${data.employeeLastName}</title>
  <style>${getBaseStyles(accentColor)}</style>
</head>
<body>
  <div class="header">
    <h1>CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE</h1>
    <p class="subtitle">Conforme aux dispositions du Code du travail</p>
  </div>

  <div class="section">
    <p style="text-align: center; font-style: italic; margin-bottom: 20px;">Fait à ${data.companyCity}, le ${today}</p>
    <div class="field">
      <span class="label">Entre :</span>
      <span class="value"><strong>${data.companyName}</strong><br>${data.companyAddress}<br>${data.companyPostalCode} ${data.companyCity}<br>SIRET : ${data.companySiret}</span>
    </div>
    <div class="field">
      <span class="label">Représentée par :</span>
      <span class="value">${data.employerName}, ${data.employerTitle}</span>
    </div>
    <div class="field"><span class="label">Ci-après dénommée "l'employeur"</span></div>

    <div class="field" style="margin-top: 20px;">
      <span class="label">Et :</span>
      <span class="value"><strong>${data.employeeFirstName} ${data.employeeLastName}</strong><br>${data.employeeAddress}<br>${data.employeePostalCode} ${data.employeeCity}<br>Né(e) le ${new Date(data.employeeBirthDate).toLocaleDateString('fr-FR')}<br>Nationalité : ${data.employeeNationality}</span>
    </div>
    ${data.employeeQualification ? `<div class="field"><span class="label">Qualification / Diplôme :</span><span class="value">${data.employeeQualification}</span></div>` : ''}
    <div class="field"><span class="label">Ci-après dénommé(e) "le salarié"</span></div>
  </div>

  <div class="section-title">Article 1er - Engagement</div>
  <div class="section">
    <div class="article">
      <p>Le présent contrat est soumis aux dispositions du Code du travail et aux conventions collectives applicables à l'entreprise et à la catégorie professionnelle du salarié.</p>
      <p style="margin-top: 10px;">Il est convenu ce qui suit :</p>
    </div>
  </div>

  <div class="section-title">Article 2 - Date d'embauche</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Date de début du contrat :</span>
        <span class="value">${new Date(data.contractStartDate).toLocaleDateString('fr-FR')}</span>
      </div>
      <p style="margin-top: 10px;">Le salarié sera embauché à compter de cette date pour une durée indéterminée.</p>
    </div>
  </div>

  <div class="section-title">Article 3 - Lieu de travail</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Lieu de travail principal :</span>
        <span class="value"><strong>${data.workLocation}</strong></span>
      </div>
      ${data.mobilityClause ? `
      <div class="article" style="margin-top: 15px;">
        <p style="font-weight: bold;">Clause de mobilité</p>
        <p>Le salarié accepte d'être amené à travailler sur différents sites géographiques de l'entreprise dans le cadre de ses fonctions.</p>
        <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Cette clause doit être justifiée par la fonction du salarié et prévoir une contrepartie financière (articles L. 1221-1 et suivants du Code du travail).</p>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section-title">Article 4 - Désignation du poste</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Intitulé du poste :</span>
        <span class="value"><strong>${data.jobTitle}</strong></span>
      </div>
      ${data.contractClassification ? `<div class="field"><span class="label">Classification conventionnelle :</span><span class="value">${data.contractClassification}</span></div>` : ''}
      <p style="margin-top: 10px;">Le salarié exercera les fonctions correspondant à son poste de travail, sous l'autorité hiérarchique de l'employeur.</p>
    </div>
  </div>

  <div class="section-title">Article 5 - Durée du travail</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Horaires de travail :</span>
        <span class="value">${data.workSchedule}</span>
      </div>
      ${data.workingHours ? `<div class="field"><span class="label">Heures hebdomadaires :</span><span class="value">${data.workingHours} heures</span></div>` : ''}
      <p style="margin-top: 10px;">La durée légale du travail est fixée à 35 heures hebdomadaires (articles L. 3121-27 et suivants du Code du travail).</p>
      <p style="margin-top: 10px;">Toute heure de travail effectuée au-delà de cette durée donnera lieu à des heures supplémentaires rémunérées ou compensées conformément aux articles L. 3121-28 et suivants du Code du travail.</p>
    </div>
  </div>

  <div class="section-title">Article 6 - Période d'essai</div>
  <div class="section">
    <div class="article">
      <p>Le présent contrat pourra être précédé d'une période d'essai dont la durée est fixée comme suit :</p>
      <div class="field" style="margin-top: 10px;">
        <span class="label">Durée de la période d'essai :</span>
        <span class="value">${data.trialPeriodDays || '0'} jour(s)</span>
      </div>
      <p style="margin-top: 10px; font-size: 10pt;">Conformément à l'article L. 1221-19 du Code du travail, la durée de la période d'essai ne peut excéder :</p>
      <ul>
        <li><strong>2 mois</strong> pour les ouvriers et employés</li>
        <li><strong>3 mois</strong> pour les agents de maîtrise et techniciens</li>
        <li><strong>4 mois</strong> pour les cadres</li>
      </ul>
      ${data.probationClause ? `<p style="margin-top: 10px;">La période d'essai pourra être renouvelée une fois, d'un commun accord entre les deux parties, dans la limite des durées prévues par l'article L. 1221-21 du Code du travail.</p>` : ''}
    </div>
  </div>

  <div class="section-title">Article 7 - Rémunération</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Salaire de base :</span>
        <span class="value"><strong>${data.salaryAmount} € ${data.salaryFrequency === 'monthly' ? 'brut mensuel' : data.salaryFrequency === 'hourly' ? 'brut par heure' : data.salaryFrequency === 'weekly' ? 'brut hebdomadaire' : 'brut'}</strong></span>
      </div>
      ${data.workingHours && data.salaryFrequency === 'hourly' ? `<div class="field"><span class="label">Taux horaire :</span><span class="value">${(parseFloat(data.salaryAmount)).toFixed(2)} €/heure</span></div>` : ''}
      <p style="margin-top: 10px;">Ce salaire ne peut être inférieur au :</p>
      <ul>
        <li>SMIC (Salaire Minimum Interprofessionnel de Croissance) en vigueur</li>
        <li>Minimum conventionnel prévu par la convention collective applicable à l'entreprise</li>
        <li>Minimum conventionnel prévu par l'accord collectif applicable</li>
      </ul>
      ${data.collectiveAgreement ? `<div class="field" style="margin-top: 10px;"><span class="label">Convention collective applicable :</span><span class="value">${data.collectiveAgreement}</span></div>` : ''}
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Le salaire sera versé mensuellement, accompagné d'un bulletin de paie conforme aux articles L. 3243-1 et suivants du Code du travail.</p>
    </div>
  </div>

  <div class="section-title">Article 8 - Avantages et accessoires du salaire</div>
  <div class="section">
    <div class="article">
      <p>Le salarié bénéficiera, en outre du salaire de base, des avantages suivants :</p>
      <ul>
        ${data.hasTransport ? '<li>Prise en charge partielle ou totale des titres de transport</li>' : ''}
        ${data.hasMeal ? '<li>Titres-restaurant</li>' : ''}
        ${data.hasHealth ? '<li>Complémentaire santé collective obligatoire</li>' : ''}
        ${data.hasOther && data.otherBenefits ? `<li>${data.otherBenefits}</li>` : ''}
      </ul>
      ${!data.hasTransport && !data.hasMeal && !data.hasHealth && !data.hasOther ? '<p>Aucun avantage particulier n\'est prévu au présent contrat.</p>' : ''}
    </div>
  </div>

  <div class="section-title">Article 9 - Congés payés</div>
  <div class="section">
    <div class="article">
      <p>Le salarié bénéficiera de congés payés annuels dans les conditions prévues aux articles L. 3141-1 et suivants du Code du travail.</p>
      <p style="margin-top: 10px;">Le salarié acquiert 2,5 jours ouvrables de congés par mois de travail effectif, soit 30 jours ouvrables pour une année complète de travail.</p>
      <p style="margin-top: 10px;">La période de référence pour l'acquisition des congés payés s'étend du 1er juin de l'année N au 31 mai de l'année N+1.</p>
      <p style="margin-top: 10px;">La période de prise des congés payés est fixée du 1er mai au 31 octobre de chaque année.</p>
    </div>
  </div>

  <div class="section-title">Article 10 - Obligations des parties</div>
  <div class="section">
    <div class="article">
      <div class="article-title">10.1 - Obligations du salarié</div>
      <p>Le salarié s'engage à :</p>
      <ul>
        <li>Exécuter son travail avec conscience, diligence et professionnalisme</li>
        <li>Respecter les horaires de travail, les règles de discipline et les directives de l'employeur</li>
        <li>Observer strictement les règles de sécurité, d'hygiène et de santé en vigueur dans l'entreprise</li>
        <li>Ne pas divulguer les informations confidentielles, techniques ou commerciales dont il aurait connaissance</li>
        <li>S'abstenir de toute concurrence déloyale envers l'employeur pendant la durée du contrat</li>
        <li>Respecter le règlement intérieur de l'entreprise, s'il existe</li>
      </ul>
    </div>
    <div class="article" style="margin-top: 20px;">
      <div class="article-title">10.2 - Obligations de l'employeur</div>
      <p>L'employeur s'engage à :</p>
      <ul>
        <li>Fournir un travail correspondant à la qualification du salarié et le rémunérer</li>
        <li>Assurer l'adaptation du salarié à son poste de travail et le former</li>
        <li>Respecter les dispositions légales et conventionnelles relatives à la durée du travail, aux congés, à la sécurité et à la santé</li>
        <li>Délivrer au salarié les documents obligatoires (bulletin de paie, certificat de travail, attestation France Travail, etc.)</li>
        <li>Assurer le maintien de salaire en cas d'arrêt maladie ou d'accident du travail</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 11 - Clause de non-concurrence</div>
  <div class="section">
    <div class="article">
      ${data.nonCompeteClause ? `
      <p>Le salarié s'engage à ne pas exercer, après la rupture du contrat, toute activité concurrentielle à celle de l'employeur.</p>
      <p style="margin-top: 10px;">Cette clause est limitée :</p>
      <ul>
        <li>Dans le temps : ___ mois à compter de la rupture du contrat</li>
        <li>Dans l'espace : ___</li>
        <li>Dans son objet : activités de ___</li>
      </ul>
      <p style="margin-top: 10px;">En contrepartie, l'employeur versera au salarié une indemnité mensuelle égale à ___ % de son salaire moyen brut des 12 derniers mois.</p>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Cette clause doit être indispensable à la protection des savoir-faire de l'entreprise et comporter l'obligation pour l'employeur de verser au salarié une contrepartie financière (articles L. 3142-16 et suivants du Code du travail).</p>
      ` : '<p>Aucune clause de non-concurrence n\'est prévue au présent contrat.</p>'}
    </div>
  </div>

  <div class="section-title">Article 12 - Clause de non-sollicitation</div>
  <div class="section">
    <div class="article">
      <p>Le salarié s'engage à ne pas solliciter, pendant la durée du contrat et pour une période de ___ mois après sa rupture, les clients et collaborateurs de l'employeur.</p>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Cette clause doit être nécessaire à la protection des intérêts légitimes de l'entreprise et justifiée par la nature du poste ou les fonctions du salarié.</p>
    </div>
  </div>

  <div class="section-title">Article 13 - Maladie et accidents du travail</div>
  <div class="section">
    <div class="article">
      <p>En cas d'absence pour maladie ou accident du travail, le salarié bénéficiera des dispositions légales et conventionnelles en vigueur.</p>
      <p style="margin-top: 10px;">Conformément à l'article L. 1226-1 du Code du travail, le salarié bénéficiera du maintien de son salaire pendant son arrêt de travail, sous déduction des indemnités journalières de Sécurité sociale.</p>
      <p style="margin-top: 10px;">Le salarié est protégé contre le licenciement pendant la durée de son arrêt de travail (article L. 1226-9 du Code du travail).</p>
      <p style="margin-top: 10px;">En cas d'inaptitude médicale, l'employeur devra rechercher un reclassement professionnel approprié (articles L. 1226-10 et suivants du Code du travail).</p>
    </div>
  </div>

  <div class="section-title">Article 14 - Protection de la santé et sécurité</div>
  <div class="section">
    <div class="article">
      <p>L'employeur doit prendre toutes les mesures nécessaires pour assurer la sécurité et protéger la santé physique et mentale des travailleurs (article L. 4121-1 du Code du travail).</p>
      <p style="margin-top: 10px;">Le salarié sera soumis à une visite d'information et de prévention par le médecin du travail :</p>
      <ul>
        <li>Dans les 3 mois suivant l'embauche (article L. 4624-1 du Code du travail)</li>
        <li>Puis périodiquement, selon la fréquence prévue par le médecin du travail</li>
        <li>En cas d'absence pour cause de maladie ou d'accident du travail</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 15 - Formation professionnelle</div>
  <div class="section">
    <div class="article">
      <p>Le salarié bénéficiera des dispositions relatives à la formation professionnelle continue prévues aux articles L. 6311-1 et suivants du Code du travail.</p>
      <p style="margin-top: 10px;">L'employeur pourra proposer au salarié de suivre des actions de formation professionnelles dans le cadre du plan de développement des compétences de l'entreprise.</p>
      <p style="margin-top: 10px;">Le salarié a droit à un Compte Personnel de Formation (CPF) qu'il pourra mobiliser pour suivre des formations certifiantes (articles L. 6323-1 et suivants du Code du travail).</p>
    </div>
  </div>

  <div class="section-title">Article 16 - Clause de rémunération à la charge de l'employeur</div>
  <div class="section">
    <div class="article">
      <p>Les frais professionnels engagés par le salarié pour les besoins de son activité professionnelle seront remboursés par l'employeur sur présentation de justificatifs.</p>
      <p style="margin-top: 10px;">Ces frais incluent notamment : les frais de déplacement, les frais de repas, les frais d'hébergement, les frais de transport, etc.</p>
    </div>
  </div>

  <div class="section-title">Article 17 - Rupture du contrat</div>
  <div class="section">
    <div class="article">
      <p>Le présent contrat pourra être rompu dans les conditions prévues par les articles L. 1231-1 et suivants du Code du travail :</p>
      <ul>
        <li><strong>Démission</strong> : Le salarié peut démissionner à tout moment, sous réserve de respecter un préavis (articles L. 1237-1 et suivants du Code du travail)</li>
        <li><strong>Licenciement</strong> : L'employeur peut licencier le salarié pour motif personnel ou économique, dans le respect des procédures légales</li>
        <li><strong>Rupture conventionnelle</strong> : Les parties peuvent convenir d'une rupture conventionnelle du contrat (articles L. 1237-11 et suivants du Code du travail)</li>
        <li><strong>Retraite</strong> : Le contrat peut être rompu en cas de départ ou de mise à la retraite</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 18 - Préavis</div>
  <div class="section">
    <div class="article">
      <p>En cas de rupture du contrat à l'initiative de l'une ou l'autre des parties, un préavis devra être respecté :</p>
      <ul>
        <li><strong>Démission</strong> : Préavis de ___ jours (à défaut, préavis légal ou conventionnel)</li>
        <li><strong>Licenciement</strong> : Préavis de ___ mois, selon l'ancienneté du salarié</li>
      </ul>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Conformément aux articles L. 1234-1 et suivants du Code du travail.</p>
    </div>
  </div>

  <div class="section-title">Article 19 - Documents de fin de contrat</div>
  <div class="section">
    <div class="article">
      <p>Lors de la rupture du contrat, l'employeur devra remettre au salarié les documents suivants :</p>
      <ul>
        <li>Certificat de travail (article L. 1234-19 du Code du travail)</li>
        <li>Attestation France Travail (anciennement Pôle Emploi)</li>
        <li>État des lieux de l'épargne salariale (solde de CP, etc.)</li>
        <li>Reçu pour solde de tout compte (si demandé par le salarié)</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 20 - Litiges</div>
  <div class="section">
    <div class="article">
      <p>Tout litige relatif à l'exécution ou à la rupture du présent contrat sera soumis au Conseil de prud'hommes compétent.</p>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Conformément à l'article L. 1411-1 du Code du travail, le Conseil de prud'hommes est compétent pour trancher les litiges individuels nés du contrat de travail.</p>
      <p style="margin-top: 10px;">Le présent contrat est établi en deux exemplaires originaux, un pour chaque partie.</p>
    </div>
  </div>

  <div class="section-title">Article 21 - Mentions diverses</div>
  <div class="section">
    <div class="article">
      ${data.collectiveAgreement ? `<p>Le présent contrat est soumis à la convention collective : <strong>${data.collectiveAgreement}</strong>.</p>` : ''}
      <p style="margin-top: 10px;">Le salarié déclare avoir pris connaissance du règlement intérieur de l'entreprise, s'il existe, et s'engage à le respecter.</p>
    </div>
  </div>

  ${getStandardSignatures(data, "L'EMPLOYEUR", "LE SALARIÉ")}
  ${getFooter(data, "Conforme au Code du travail français 2024")}
</body>
</html>`;
}

/**
 * Génère une convention de stage conforme à la loi du 10 juillet 2014
 */
export function generateStageContract(data: ContractTemplateData): string {
  const today = new Date().toLocaleDateString('fr-FR');
  const accentColor = data.accentColor || '#1D9E75';
  const daysWorked = parseInt(data.durationWeeks || '0') * 5;
  const gratification = parseFloat(data.salaryAmount || '0');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convention de Stage - ${data.employeeFirstName} ${data.employeeLastName}</title>
  <style>${getBaseStyles(accentColor)}</style>
</head>
<body>
  <div class="header">
    <h1>CONVENTION DE STAGE</h1>
    <p class="subtitle">Conforme à la loi n° 2014-788 du 10 juillet 2014 et au Code de l'éducation</p>
  </div>

  <div class="section">
    <p style="text-align: center; font-style: italic; margin-bottom: 20px;">Fait à ${data.companyCity}, le ${today}</p>
    <div class="field">
      <span class="label">Entre :</span>
      <span class="value"><strong>${data.companyName}</strong><br>${data.companyAddress}<br>${data.companyPostalCode} ${data.companyCity}<br>SIRET : ${data.companySiret}</span>
    </div>
    <div class="field">
      <span class="label">Représentée par :</span>
      <span class="value">${data.employerName}, ${data.employerTitle}</span>
    </div>
    <div class="field"><span class="label">Ci-après dénommée "l'entreprise"</span></div>

    <div class="field" style="margin-top: 20px;">
      <span class="label">Et :</span>
      <span class="value"><strong>${data.employeeFirstName} ${data.employeeLastName}</strong><br>${data.employeeAddress}<br>${data.employeePostalCode} ${data.employeeCity}<br>Né(e) le ${new Date(data.employeeBirthDate).toLocaleDateString('fr-FR')}<br>Nationalité : ${data.employeeNationality}</span>
    </div>
    <div class="field" style="margin-top: 20px;">
      <span class="label">Établissement d'enseignement :</span>
      <span class="value"><strong>${data.schoolName || 'À renseigner'}</strong></span>
    </div>
    <div class="field"><span class="label">Ci-après dénommé(e) "le stagiaire"</span></div>
  </div>

  <div class="section-title">Article 1er - Objet du stage</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Intitulé du stage :</span>
        <span class="value"><strong>${data.jobTitle || 'Poste non spécifié'}</strong></span>
      </div>
      ${data.speciality ? `<div class="field"><span class="label">Spécialité / Domaine :</span><span class="value">${data.speciality}</span></div>` : ''}
      <div class="highlight" style="margin-top: 15px;">
        <p style="margin: 0;"><strong>IMPORTANT :</strong> Ce stage s'inscrit obligatoirement dans le cursus de formation de l'étudiant et doit faire l'objet d'une convention tripartite entre l'entreprise, l'étudiant et l'établissement d'enseignement.</p>
      </div>
    </div>
  </div>

  <div class="section-title">Article 2 - Durée du stage</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Date de début du stage :</span>
        <span class="value">${new Date(data.contractStartDate).toLocaleDateString('fr-FR')}</span>
      </div>
      <div class="field">
        <span class="label">Date de fin du stage :</span>
        <span class="value">${data.contractEndDate ? new Date(data.contractEndDate).toLocaleDateString('fr-FR') : 'Non déterminée'}</span>
      </div>
      ${data.durationWeeks ? `<div class="field"><span class="label">Durée du stage :</span><span class="value">${data.durationWeeks} semaines (${daysWorked} jours ouvrés)</span></div>` : ''}
      <p style="margin-top: 10px;">La durée du stage ne peut excéder 6 mois (article L. 612-12 du Code de l'éducation).</p>
    </div>
  </div>

  <div class="section-title">Article 3 - Missions et activités confiées au stagiaire</div>
  <div class="section">
    <div class="article">
      <p><strong>Missions principales :</strong></p>
      <p style="margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid ${accentColor};">
        ${data.tasks || 'Le stagiaire participera aux activités de l\'entreprise en lien avec sa formation.'}
      </p>
      ${data.objectives ? `
      <p style="margin-top: 15px;"><strong>Objectifs pédagogiques :</strong></p>
      <p style="margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid ${accentColor};">
        ${data.objectives}
      </p>
      ` : ''}
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Les missions confiées au stagiaire doivent être en adéquation avec son cursus de formation et lui permettre d'acquérir des compétences professionnelles.</p>
    </div>
  </div>

  <div class="section-title">Article 4 - Lieu et horaires de stage</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Lieu de stage :</span>
        <span class="value"><strong>${data.workLocation}</strong></span>
      </div>
      <div class="field">
        <span class="label">Horaires de stage :</span>
        <span class="value">${data.workSchedule || '35h hebdomadaires'}</span>
      </div>
      ${data.workingHours ? `<div class="field"><span class="label">Heures hebdomadaires :</span><span class="value">${data.workingHours} heures maximum</span></div>` : ''}
      <p style="margin-top: 10px;">La présence du stagiaire ne peut excéder 5 jours par semaine et 40 heures par semaine (article D. 612-1 du Code de l'éducation).</p>
    </div>
  </div>

  <div class="section-title">Article 5 - Tuteur de stage</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Nom du tuteur :</span>
        <span class="value"><strong>${data.tutorName || 'À renseigner'}</strong></span>
      </div>
      <p>Le tuteur de stage sera le référent du stagiaire au sein de l'entreprise. Il aura pour mission de :</p>
      <ul>
        <li>Accueillir le stagiaire et l'intégrer dans l'entreprise</li>
        <li>Lui confier des missions en adéquation avec son projet pédagogique</li>
        <li>Assurer le suivi de son stage et l'évaluer</li>
        <li>Lui transmettre les compétences professionnelles nécessaires</li>
        <li>Rédiger la fiche d'évaluation et l'attestation de stage</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 6 - Gratification de stage</div>
  <div class="section">
    <div class="article">
      ${gratification > 0 ? `
      <div class="field">
        <span class="label">Montant de la gratification :</span>
        <span class="value"><strong>${gratification.toFixed(2)} € ${data.salaryFrequency === 'monthly' ? 'mensuels' : ''}</strong></span>
      </div>
      <div class="field">
        <span class="label">Mode de versement :</span>
        <span class="value">Mensuel à la fin de chaque mois de stage</span>
      </div>
      <div class="highlight" style="margin-top: 15px;">
        <p style="margin: 0;"><strong>MONTANT MINIMUM LÉGAL :</strong> La gratification minimale de stage en 2024 est de <strong>15% du plafond horaire de la Sécurité sociale</strong>, soit <strong>4,05 €/heure</strong> ou <strong>607,50 €/mois</strong> pour un temps plein (articles L. 612-12 et D. 612-1 du Code de l'éducation).</p>
      </div>
      <p style="margin-top: 10px;">Le montant de la gratification est proratisé en fonction de la durée de présence effective du stagiaire dans l'entreprise.</p>
      <p style="margin-top: 10px;">La gratification de stage ne constitue pas un salaire et ne donne lieu à aucune cotisation sociale, ni pour le stagiaire, ni pour l'entreprise.</p>
      ` : `
      <div class="field">
        <span class="label">Gratification :</span>
        <span class="value"><strong>Non gratifié</strong> (stage obligatoire dans le cursus de formation)</span>
      </div>
      <div class="highlight" style="margin-top: 15px;">
        <p style="margin: 0;"><strong>ATTENTION :</strong> Si la durée du stage excède 2 mois consécutifs (ou 60 jours consécutifs ou non), la gratification minimale de 15% du plafond horaire de la Sécurité sociale est OBLIGATOIRE.</p>
      </div>
      `}
    </div>
  </div>

  <div class="section-title">Article 7 - Avantages et accessoires</div>
  <div class="section">
    <div class="article">
      <p>Le stagiaire bénéficiera des avantages suivants :</p>
      <ul>
        ${data.hasTransport ? '<li>Prise en charge des titres de transport</li>' : '<li>Pas de prise en charge des titres de transport</li>'}
        ${data.hasMeal ? '<li>Restauration (titres-restaurant ou cantine)</li>' : '<li>Pas de restauration</li>'}
        ${data.hasHealth ? '<li>Accès aux équipements sociaux de l\'entreprise</li>' : ''}
        ${data.hasOther && data.otherBenefits ? `<li>${data.otherBenefits}</li>` : ''}
      </ul>
      <p style="margin-top: 10px; font-size: 10pt;">Le stagiaire a accès aux activités sociales et culturelles de l'entreprise (articles L. 612-12 et D. 612-1 du Code de l'éducation).</p>
    </div>
  </div>

  <div class="section-title">Article 8 - Obligations du stagiaire</div>
  <div class="section">
    <div class="article">
      <p>Le stagiaire s'engage à :</p>
      <ul>
        <li>Respecter les horaires de stage et les règles de discipline en vigueur dans l'entreprise</li>
        <li>Accomplir les missions qui lui sont confiées avec diligence et professionnalisme</li>
        <li>Observer strictement les règles de sécurité, d'hygiène et de santé dans l'entreprise</li>
        <li>Ne pas divulguer les informations confidentielles dont il aurait connaissance</li>
        <li>S'abstenir de toute concurrence déloyale envers l'entreprise</li>
        <li>Faire l'objet d'une évaluation à la mi-parcours et en fin de stage</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 9 - Obligations de l'entreprise</div>
  <div class="section">
    <div class="article">
      <p>L'entreprise s'engage à :</p>
      <ul>
        <li>Accueillir le stagiaire et l'intégrer dans ses services</li>
        <li>Lui confier des missions en adéquation avec son projet pédagogique</li>
        <li>Assurer le suivi de son stage et l'évaluer</li>
        <li>Lui transmettre les compétences professionnelles nécessaires</li>
        <li>Respecter les dispositions légales relatives à la durée du stage, aux horaires, à la gratification, etc.</li>
        <li>Désigner un tuteur de stage</li>
        <li>Rédiger la fiche d'évaluation et l'attestation de stage</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 10 - Congés et absences</div>
  <div class="section">
    <div class="article">
      <p>Le stagiaire a droit aux congés et autorisations d'absence suivants :</p>
      <ul>
        <li>5 jours de congés ouvrables pour un stage de plus de 2 mois</li>
        <li>Congés pour examens ou soutenances de mémoire</li>
        <li>Congés pour raisons familiales ou médicales (sur justificatif)</li>
      </ul>
      <p style="margin-top: 10px;">Ces congés ne donnent lieu à aucun report de la date de fin de stage, sauf accord contraire entre les parties.</p>
    </div>
  </div>

  <div class="section-title">Article 11 - Maladie et accidents</div>
  <div class="section">
    <div class="article">
      <p>En cas de maladie ou d'accident, le stagiaire doit informer l'entreprise dans les plus brefs délais et fournir un justificatif médical.</p>
      <p style="margin-top: 10px;">La gratification de stage est maintenue en cas d'absence pour maladie ou accident, dans la limite de la durée du stage prévue à la convention.</p>
      <p style="margin-top: 10px;">En cas d'accident du travail survenu au stagiaire, l'entreprise doit le déclarer à la CPAM dans les 48 heures.</p>
    </div>
  </div>

  <div class="section-title">Article 12 - Emplois vacants</div>
  <div class="section">
    <div class="article">
      <p>Conformément à l'article L. 612-12 du Code de l'éducation, l'entreprise informe le stagiaire des éventuels emplois vacants dans l'entreprise.</p>
      <p style="margin-top: 10px;">Cette information est communiquée par tout moyen, notamment par affichage sur les lieux de travail ou par voie électronique.</p>
    </div>
  </div>

  <div class="section-title">Article 13 - Rupture anticipée du stage</div>
  <div class="section">
    <div class="article">
      <p>Le stage peut être rompu de manière anticipée dans les cas suivants :</p>
      <ul>
        <li>D'un commun accord entre le stagiaire et l'entreprise</li>
        <li>En cas de force majeure</li>
        <li>En cas de faute grave de l'une ou l'autre des parties</li>
        <li>Si le stagiaire est embauché en CDI avant la fin de son stage</li>
      </ul>
      <p style="margin-top: 10px;">En cas de rupture anticipée, le stagiaire doit informer l'établissement d'enseignement et son tuteur.</p>
    </div>
  </div>

  <div class="section-title">Article 14 - Certificat de stage</div>
  <div class="section">
    <div class="article">
      <p>À l'issue du stage, l'entreprise délivrera au stagiaire :</p>
      <ul>
        <li>Une attestation de stage confirmant la durée du stage et les missions effectuées</li>
        <li>Une fiche d'évaluation du stage à transmettre à l'établissement d'enseignement</li>
        <li>Un certificat de travail (si demandé par le stagiaire)</li>
      </ul>
      <p style="margin-top: 10px;">Ces documents seront remis au stagiaire dans le mois suivant la fin du stage.</p>
    </div>
  </div>

  <div class="section-title">Article 15 - Litiges</div>
  <div class="section">
    <div class="article">
      <p>Tout litige relatif à l'exécution de la convention de stage sera soumis au tribunal compétent.</p>
      <p style="margin-top: 10px;">Le stagiaire peut saisir le tribunal compétent en cas de non-respect des dispositions légales ou conventionnelles relatives au stage.</p>
    </div>
  </div>

  <div class="section-title">Article 16 - Mentions diverses</div>
  <div class="section">
    <div class="article">
      <p>La présente convention de stage est établie conformément aux dispositions légales et réglementaires en vigueur.</p>
      <p style="margin-top: 10px;">Le stagiaire déclare avoir pris connaissance du règlement intérieur de l'entreprise, s'il existe, et s'engage à le respecter.</p>
      <p style="margin-top: 10px;">Le stage ne peut porter atteinte à l'emploi salarié dans l'entreprise. Le stagiaire ne peut être employé pour occuper un poste permanent.</p>
      <p style="margin-top: 10px;">La présente convention de stage est établie en trois exemplaires originaux, un pour chaque partie (entreprise, stagiaire, établissement d'enseignement).</p>
    </div>
  </div>

  ${getStandardSignatures(data, "L'ENTREPRISE", "LE STAGIAIRE")}
  
  <div class="signature-area" style="margin-top: 20px;">
    <div class="signature-box">
      <div class="field" style="border: none;">
        <span class="label" style="color: #333; font-weight: bold;">L'ÉTABLISSEMENT D'ENSEIGNEMENT</span>
      </div>
      <div style="margin: 10px 0;"><br><br><br></div>
      <div style="margin-top: auto; font-size: 9pt; color: #666;">
        ${data.schoolName || 'Nom de l\'école'}<br>
        Date : ______/_____/______
      </div>
    </div>
  </div>

  ${getFooter(data, "Conforme à la loi n° 2014-788 du 10 juillet 2014")}
</body>
</html>`;
}

/**
 * Génère un contrat d'apprentissage conforme au Code du travail
 */
export function generateAlternanceContract(data: ContractTemplateData): string {
  const today = new Date().toLocaleDateString('fr-FR');
  const accentColor = data.accentColor || '#1D9E75';
  const employeeAge = new Date().getFullYear() - new Date(data.employeeBirthDate).getFullYear();

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat d'Apprentissage - ${data.employeeFirstName} ${data.employeeLastName}</title>
  <style>${getBaseStyles(accentColor)}</style>
</head>
<body>
  <div class="header">
    <h1>CONTRAT D'APPRENTISSAGE</h1>
    <p class="subtitle">Conforme aux articles L. 6221-1 et suivants du Code du travail</p>
  </div>

  <div class="section">
    <p style="text-align: center; font-style: italic; margin-bottom: 20px;">Fait à ${data.companyCity}, le ${today}</p>
    <div class="field">
      <span class="label">Entre :</span>
      <span class="value"><strong>${data.companyName}</strong><br>${data.companyAddress}<br>${data.companyPostalCode} ${data.companyCity}<br>SIRET : ${data.companySiret}</span>
    </div>
    <div class="field">
      <span class="label">Représentée par :</span>
      <span class="value">${data.employerName}, ${data.employerTitle}</span>
    </div>
    <div class="field"><span class="label">Ci-après dénommée "l'employeur"</span></div>

    <div class="field" style="margin-top: 20px;">
      <span class="label">Et :</span>
      <span class="value"><strong>${data.employeeFirstName} ${data.employeeLastName}</strong><br>${data.employeeAddress}<br>${data.employeePostalCode} ${data.employeeCity}<br>Né(e) le ${new Date(data.employeeBirthDate).toLocaleDateString('fr-FR')} (${employeeAge} ans)<br>Nationalité : ${data.employeeNationality}</span>
    </div>
    ${data.schoolName ? `<div class="field"><span class="label">Centre de formation d'apprentis :</span><span class="value">${data.schoolName}</span></div>` : ''}
    <div class="field"><span class="label">Ci-après dénommé(e) "l'apprenti"</span></div>
  </div>

  <div class="section-title">Article 1er - Type et durée du contrat</div>
  <div class="section">
    <div class="article">
      <p>Le présent contrat est conclu pour une durée déterminée égale à la durée du cycle de formation.</p>
      <div class="field" style="margin-top: 10px;">
        <span class="label">Type de contrat :</span>
        <span class="value"><strong>Contrat d'apprentissage</strong></span>
      </div>
      <div class="field">
        <span class="label">Date de début du contrat :</span>
        <span class="value">${new Date(data.contractStartDate).toLocaleDateString('fr-FR')}</span>
      </div>
      ${data.contractEndDate ? `<div class="field"><span class="label">Date de fin prévue :</span><span class="value">${new Date(data.contractEndDate).toLocaleDateString('fr-FR')}</span></div>` : ''}
      <p style="margin-top: 10px;">La durée du contrat ne peut être inférieure à 6 mois et ne peut excéder 3 ans (ou 4 ans pour les apprentis en situation de handicap).</p>
    </div>
  </div>

  <div class="section-title">Article 2 - Objet du contrat</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Intitulé du poste :</span>
        <span class="value"><strong>${data.jobTitle}</strong></span>
      </div>
      ${data.speciality ? `<div class="field"><span class="label">Spécialité / Domaine :</span><span class="value">${data.speciality}</span></div>` : ''}
      ${data.contractClassification ? `<div class="field"><span class="label">Diplôme préparé :</span><span class="value">${data.contractClassification}</span></div>` : ''}
      <p style="margin-top: 10px;">L'employeur s'engage à assurer à l'apprenti une formation professionnelle complète en vue de l'obtention du diplôme préparé.</p>
    </div>
  </div>

  <div class="section-title">Article 3 - Rémunération</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Salaire de base :</span>
        <span class="value"><strong>${data.salaryAmount} € ${data.salaryFrequency === 'monthly' ? 'brut mensuel' : ''}</strong></span>
      </div>
      ${data.workingHours ? `
      <div class="field">
        <span class="label">Taux horaire :</span>
        <span class="value">${(parseFloat(data.salaryAmount) / (parseFloat(data.workingHours) || 35) / 4.33).toFixed(2)} €/heure</span>
      </div>
      ` : ''}
      <div class="highlight" style="margin-top: 15px;">
        <p style="margin: 0;"><strong>SALAIRE MINIMUM LÉGAL :</strong> Conformément à l'article D. 6222-26 du Code du travail, le salaire minimum de l'apprenti en 2024 est de :</p>
        <ul style="margin: 10px 0 0 20px;">
          ${employeeAge < 18 ? '<li><strong>' + (1766.92).toFixed(2) + ' €/mois</strong> (moins de 18 ans) - ' + (1766.92 / 151.67).toFixed(2) + ' €/heure</li>' : ''}
          ${employeeAge >= 18 && employeeAge < 21 ? '<li><strong>' + (2153.29).toFixed(2) + ' €/mois</strong> (18 à 20 ans) - ' + (2153.29 / 151.67).toFixed(2) + ' €/heure</li>' : ''}
          ${employeeAge >= 21 ? '<li><strong>' + (2540.29).toFixed(2) + ' €/mois</strong> (21 ans et plus) - ' + (2540.29 / 151.67).toFixed(2) + ' €/heure</li>' : ''}
        </ul>
      </div>
      <p style="margin-top: 10px;">Le salaire minimum est revalorisé chaque année au 1er septembre.</p>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Le salaire de l'apprenti ne peut être inférieur au SMIC ni au salaire minimum conventionnel applicable.</p>
    </div>
  </div>

  <div class="section-title">Article 4 - Durée du travail</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Horaires de travail :</span>
        <span class="value">${data.workSchedule || '35h hebdomadaires'}</span>
      </div>
      ${data.workingHours ? `<div class="field"><span class="label">Heures hebdomadaires :</span><span class="value">${data.workingHours} heures</span></div>` : ''}
      <p style="margin-top: 10px;">Le temps de travail consacré à la formation en CFA est inclus dans la durée du travail.</p>
      <p style="margin-top: 10px;">L'apprenti bénéficie des mêmes congés payés que les autres salariés de l'entreprise (5 semaines par an).</p>
    </div>
  </div>

  <div class="section-title">Article 5 - Maître d'apprentissage</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Nom du maître d'apprentissage :</span>
        <span class="value"><strong>${data.tutorName || 'À renseigner'}</strong></span>
      </div>
      <p>Le maître d'apprentissage est le référent de l'apprenti dans l'entreprise. Il a pour mission de :</p>
      <ul>
        <li>Accueillir l'apprenti et l'intégrer dans l'entreprise</li>
        <li>Lui transmettre les savoir-faire et compétences professionnelles</li>
        <li>Assurer le suivi de sa formation et l'évaluer</li>
        <li>Participer aux liaisons avec le CFA</li>
      </ul>
      <p style="margin-top: 10px;">Le maître d'apprentissage doit justifier d'une expérience professionnelle minimale de 2 ans dans le métier enseigné.</p>
    </div>
  </div>

  <div class="section-title">Article 6 - Formation théorique</div>
  <div class="section">
    <div class="article">
      <p>L'apprenti suivra une formation théorique au centre de formation d'apprentis (CFA) ${data.schoolName || 'à renseigner'}.</p>
      <p style="margin-top: 10px;">La formation théorique comprend :</p>
      <ul>
        <li>Des enseignements généraux et professionnels</li>
        <li>Des travaux pratiques et dirigés</li>
        <li>Des périodes de formation en entreprise</li>
      </ul>
      <p style="margin-top: 10px;">L'employeur s'engage à laisser l'apprenti suivre les cours du CFA et à participer aux évaluations.</p>
    </div>
  </div>

  <div class="section-title">Article 7 - Lieu de travail</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Lieu de travail principal :</span>
        <span class="value"><strong>${data.workLocation}</strong></span>
      </div>
      ${data.mobilityClause ? `
      <div class="article" style="margin-top: 15px;">
        <p style="font-weight: bold;">Clause de mobilité</p>
        <p>L'apprenti accepte d'être amené à travailler sur différents sites géographiques de l'entreprise dans le cadre de sa formation.</p>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section-title">Article 8 - Obligations de l'apprenti</div>
  <div class="section">
    <div class="article">
      <p>L'apprenti s'engage à :</p>
      <ul>
        <li>Travailler avec diligence et assiduité pour acquérir les compétences professionnelles</li>
        <li>Respecter les horaires de travail et les règles de discipline de l'entreprise</li>
        <li>Suivre assidûment les cours du CFA et participer aux évaluations</li>
        <li>Observer strictement les règles de sécurité, d'hygiène et de santé</li>
        <li>Ne pas divulguer les informations confidentielles dont il aurait connaissance</li>
        <li>Faire l'objet d'une évaluation régulière par le maître d'apprentissage</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 9 - Obligations de l'employeur</div>
  <div class="section">
    <div class="article">
      <p>L'employeur s'engage à :</p>
      <ul>
        <li>Assurer à l'apprenti une formation professionnelle complète</li>
        <li>Lui confier des missions en adéquation avec sa formation</li>
        <li>Veiller à sa sécurité et à sa santé sur le lieu de travail</li>
        <li>Désigner un maître d'apprentissage qualifié</li>
        <li>Assurer le suivi de sa formation et l'évaluer</li>
        <li>Respecter les dispositions légales relatives à la durée du travail, aux congés, à la rémunération</li>
        <li>Participer aux liaisons avec le CFA</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 10 - Protection de l'apprenti</div>
  <div class="section">
    <div class="article">
      <p>Conformément à l'article L. 6222-19 du Code du travail, l'apprenti bénéficie des mêmes protections que les autres salariés :</p>
      <ul>
        <li>En cas de maladie ou d'accident du travail</li>
        <li>En cas d'accident sur le trajet entre le domicile et le lieu de travail ou le CFA</li>
        <li>En ce qui concerne la sécurité et la santé au travail</li>
        <li>En matière de congés payés</li>
        <li>En cas de harcèlement moral ou sexuel</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 11 - Rupture du contrat</div>
  <div class="section">
    <div class="article">
      <p>Le contrat d'apprentissage peut être rompu dans les cas suivants :</p>
      <ul>
        <li><strong>Pendant la période d'essai</strong> (45 jours pour les moins de 18 ans, 1 mois pour les majeurs)</li>
        <li><strong>D'un commun accord</strong> entre l'apprenti et l'employeur</li>
        <li><strong>En cas de faute grave</strong> de l'une ou l'autre des parties</li>
        <li><strong>En cas de force majeure</strong></li>
        <li><strong>À l'initiative de l'apprenti</strong>, en cas de non-respect par l'employeur de ses obligations</li>
        <li><strong>À l'initiative de l'employeur</strong>, en cas d'obtention du diplôme ou d'embauche en CDI</li>
      </ul>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Conformément aux articles L. 6222-18 et suivants du Code du travail.</p>
    </div>
  </div>

  <div class="section-title">Article 12 - Certificat de travail</div>
  <div class="section">
    <div class="article">
      <p>À l'issue du contrat, l'employeur délivrera à l'apprenti :</p>
      <ul>
        <li>Un certificat de travail mentionnant la durée du contrat et les postes occupés</li>
        <li>Une attestation de compétences acquises</li>
        <li>Le bulletin de paie du dernier mois travaillé</li>
      </ul>
      <p style="margin-top: 10px;">L'apprenti pourra utiliser ces documents pour rechercher un emploi ou poursuivre sa formation.</p>
    </div>
  </div>

  <div class="section-title">Article 13 - Litiges</div>
  <div class="section">
    <div class="article">
      <p>Tout litige relatif à l'exécution du contrat sera soumis au Conseil de prud'hommes compétent.</p>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Conformément à l'article L. 1411-1 du Code du travail.</p>
    </div>
  </div>

  <div class="section-title">Article 14 - Mentions diverses</div>
  <div class="section">
    <div class="article">
      ${data.collectiveAgreement ? `<p>Le présent contrat est soumis à la convention collective : <strong>${data.collectiveAgreement}</strong>.</p>` : ''}
      <p style="margin-top: 10px;">Le présent contrat est établi en trois exemplaires originaux, un pour chaque partie (employeur, apprenti, CFA).</p>
    </div>
  </div>

  ${getStandardSignatures(data, "L'EMPLOYEUR", "L'APPRENTI")}
  ${getFooter(data, "Conforme au Code du travail français 2024")}
</body>
</html>`;
}

/**
 * Génère un contrat de prestation de service freelance
 */
function generateFreelanceContract(data: ContractTemplateData): string {
  const today = new Date().toLocaleDateString('fr-FR');
  const accentColor = data.accentColor || '#1D9E75';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat de Prestation de Service - ${data.employeeFirstName} ${data.employeeLastName}</title>
  <style>${getBaseStyles(accentColor)}</style>
</head>
<body>
  <div class="header">
    <h1>CONTRAT DE PRESTATION DE SERVICE FREELANCE</h1>
    <p class="subtitle">Conforme aux dispositions du Code civil relatives au contrat de prestation de service</p>
  </div>

  <div class="section">
    <p style="text-align: center; font-style: italic; margin-bottom: 20px;">Fait à ${data.companyCity}, le ${today}</p>
    <div class="field">
      <span class="label">Entre :</span>
      <span class="value"><strong>${data.companyName}</strong><br>${data.companyAddress}<br>${data.companyPostalCode} ${data.companyCity}<br>SIRET : ${data.companySiret}</span>
    </div>
    <div class="field">
      <span class="label">Représentée par :</span>
      <span class="value">${data.employerName}, ${data.employerTitle}</span>
    </div>
    <div class="field"><span class="label">Ci-après dénommée "le client"</span></div>

    <div class="field" style="margin-top: 20px;">
      <span class="label">Et :</span>
      <span class="value"><strong>${data.employeeFirstName} ${data.employeeLastName}</strong><br>${data.employeeAddress}<br>${data.employeePostalCode} ${data.employeeCity}<br>Nationalité : ${data.employeeNationality}</span>
    </div>
    ${data.employeeQualification ? `<div class="field"><span class="label">Qualification / Spécialité :</span><span class="value">${data.employeeQualification}</span></div>` : ''}
    <div class="field"><span class="label">Ci-après dénommé(e) "le prestataire"</span></div>
  </div>

  <div class="section-title">Article 1er - Objet de la prestation</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Intitulé de la mission :</span>
        <span class="value"><strong>${data.jobTitle || 'Poste non spécifié'}</strong></span>
      </div>
      ${data.speciality ? `<div class="field"><span class="label">Domaine / Spécialité :</span><span class="value">${data.speciality}</span></div>` : ''}
      <div class="field" style="margin-top: 15px;">
        <span class="label">Description des services :</span>
        <span class="value">${data.tasks || 'Le prestataire fournira au client des services de conseil, expertise ou assistance dans le domaine de ' + (data.jobTitle || 'Poste non spécifié') + '.'}</span>
      </div>
    </div>
  </div>

  <div class="section-title">Article 2 - Durée de la prestation</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Date de début :</span>
        <span class="value">${new Date(data.contractStartDate).toLocaleDateString('fr-FR')}</span>
      </div>
      ${data.contractEndDate ? `
      <div class="field">
        <span class="label">Date de fin :</span>
        <span class="value">${new Date(data.contractEndDate).toLocaleDateString('fr-FR')}</span>
      </div>
      ` : `
      <div class="field">
        <span class="label">Durée :</span>
        <span class="value">${data.durationWeeks || 'Non déterminée'}</span>
      </div>
      `}
      ${data.workSchedule ? `<div class="field"><span class="label">Planning / Disponibilités :</span><span class="value">${data.workSchedule}</span></div>` : ''}
    </div>
  </div>

  <div class="section-title">Article 3 - Lieu d'exécution</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Lieu d'exécution de la prestation :</span>
        <span class="value"><strong>${data.workLocation}</strong></span>
      </div>
      <p style="margin-top: 10px;">Le prestataire interviendra principalement à distance ou dans les locaux du client, selon les besoins définis à l'article 1.</p>
    </div>
  </div>

  <div class="section-title">Article 4 - Rémunération</div>
  <div class="section">
    <div class="article">
      <div class="field">
        <span class="label">Montant de la prestation :</span>
        <span class="value"><strong>${data.salaryAmount} € ${data.salaryFrequency === 'monthly' ? 'par mois' : data.salaryFrequency === 'hourly' ? 'par heure' : data.salaryFrequency === 'weekly' ? 'par semaine' : 'forfaitaire'}</strong></span>
      </div>
      <p style="margin-top: 10px;">Ce montant comprend l'ensemble des services prestés et ne donne lieu à aucun remboursement de frais, sauf accord contraire exprès entre les parties.</p>
      ${data.workingHours && data.salaryFrequency === 'hourly' ? `
      <div class="field" style="margin-top: 10px;">
        <span class="label">Taux horaire :</span>
        <span class="value">${parseFloat(data.salaryAmount).toFixed(2)} €/heure</span>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section-title">Article 5 - Conditions de paiement</div>
  <div class="section">
    <div class="article">
      <p>La rémunération sera versée au prestataire selon les modalités suivantes :</p>
      <ul>
        <li><strong>Périodicité :</strong> Mensuelle ou à la fin de chaque mission</li>
        <li><strong>Modalité :</strong> Virement bancaire sur le compte communiqué par le prestataire</li>
        <li><strong>Délai :</strong> Dans les 30 jours suivant la réception de la facture</li>
      </ul>
      <p style="margin-top: 10px;">Le prestataire émettra une facture conforme aux dispositions légales en vigueur (articles L. 441-9 et suivants du Code de commerce).</p>
    </div>
  </div>

  <div class="section-title">Article 6 - Obligations du prestataire</div>
  <div class="section">
    <div class="article">
      <p>Le prestataire s'engage à :</p>
      <ul>
        <li>Exécuter la prestation avec professionnalisme et diligence</li>
        <li>Respecter les délais et planning convenus avec le client</li>
        <li>Garantir la confidentialité des informations du client</li>
        <li>Fournir un travail conforme aux standards professionnels en vigueur</li>
        <li>Ne pas divulguer les informations confidentielles dont il aurait connaissance</li>
        <li>S'abstenir de toute concurrence déloyale envers le client</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 7 - Obligations du client</div>
  <div class="section">
    <div class="article">
      <p>Le client s'engage à :</p>
      <ul>
        <li>Fournir au prestataire toutes les informations nécessaires à l'exécution de sa mission</li>
        <li>Collaborer activement avec le prestataire</li>
        <li>Respecter les délais de paiement convenus</li>
        <li>Mettre à disposition du prestataire les ressources nécessaires à sa mission</li>
        <li>Respecter la propriété intellectuelle du prestataire</li>
      </ul>
    </div>
  </div>

  <div class="section-title">Article 8 - Propriété intellectuelle</div>
  <div class="section">
    <div class="article">
      <p>Les livrables produits par le prestataire dans le cadre de la prestation demeurent sa propriété intellectuelle jusqu'à paiement intégral de la facture.</p>
      <p style="margin-top: 10px;">Le client dispose d'un droit d'usage non exclusif sur les livrables pour ses besoins internes.</p>
      <p style="margin-top: 10px;">Le prestataire garantit qu'il est titulaire des droits nécessaires sur les livrables et qu'il ne porte pas atteinte aux droits de tiers.</p>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Conformément aux articles L. 111-1 et suivants du Code de la propriété intellectuelle.</p>
    </div>
  </div>

  <div class="section-title">Article 9 - Responsabilité</div>
  <div class="section">
    <div class="article">
      <p>Le prestataire est responsable des dommages causés par sa faute, son imprudence ou sa négligence dans l'exécution de la prestation.</p>
      <p style="margin-top: 10px;">La responsabilité du prestataire est limitée au montant de la rémunération perçue pour la prestation.</p>
      <p style="margin-top: 10px;">Le prestataire n'est pas responsable des dommages indirects ou imprévisibles subis par le client.</p>
    </div>
  </div>

  <div class="section-title">Article 10 - Confidentialité</div>
  <div class="section">
    <div class="article">
      <p>Le prestataire s'engage à maintenir strictement confidentielle toute information dont il aurait connaissance dans le cadre de la prestation.</p>
      <p style="margin-top: 10px;">Cette obligation de confidentialité subsiste après la fin de la prestation et sans limitation de durée.</p>
      <p style="margin-top: 10px;">Le prestataire ne pourra divulguer les informations confidentielles sans l'accord exprès du client.</p>
    </div>
  </div>

  <div class="section-title">Article 11 - Clause de non-concurrence</div>
  <div class="section">
    <div class="article">
      ${data.nonCompeteClause ? `
      <p>Le prestataire s'engage à ne pas exercer d'activité concurrente à celle du client pendant la durée de la prestation.</p>
      <p style="margin-top: 10px;">Cette obligation ne s'applique pas aux activités normales du prestataire exercées avant la conclusion du présent contrat.</p>
      ` : '<p>Aucune clause de non-concurrence n\'est prévue au présent contrat. Le prestataire conserve le droit d\'exercer ses activités pour d\'autres clients.</p>'}
    </div>
  </div>

  <div class="section-title">Article 12 - Résiliation du contrat</div>
  <div class="section">
    <div class="article">
      <p>Le présent contrat peut être résilié dans les conditions suivantes :</p>
      <ul>
        <li><strong>D'un commun accord</strong> entre les parties</li>
        <li><strong>Par l'une ou l'autre des parties</strong>, avec un préavis de 30 jours</li>
        <li><strong>En cas de faute grave</strong> de l'une ou l'autre des parties</li>
        <li><strong>En cas de force majeure</strong></li>
      </ul>
      <p style="margin-top: 10px;">En cas de résiliation, le client paiera au prestataire la rémunération correspondant aux services effectivement prestés.</p>
    </div>
  </div>

  <div class="section-title">Article 13 - Litiges</div>
  <div class="section">
    <div class="article">
      <p>Tout litige relatif à l'exécution, l'interprétation ou la résiliation du présent contrat sera soumis au tribunal de commerce compétent.</p>
      <p style="margin-top: 10px; font-size: 10pt; font-style: italic;">Conformément à l'article L. 141-5 du Code de commerce.</p>
    </div>
  </div>

  <div class="section-title">Article 14 - Mentions diverses</div>
  <div class="section">
    <div class="article">
      <p>Le présent contrat constitue l'accord intégral entre les parties et remplace tout accord antérieur oral ou écrit portant sur le même objet.</p>
      <p style="margin-top: 10px;">Le présent contrat est établi en deux exemplaires originaux, un pour chaque partie.</p>
    </div>
  </div>

  ${getStandardSignatures(data, "LE CLIENT", "LE PRESTATAIRE")}
  ${getFooter(data, "Conforme au Code civil français")}
</body>
</html>`;
}

/**
 * Fonction principale pour générer n'importe quel type de contrat
 */
export function generateContract(data: ContractTemplateData): string {
  switch (data.contractType) {
    case 'cdd':
      return generateCDDContract(data);
    case 'cdi':
      return generateCDIContract(data);
    case 'stage':
      return generateStageContract(data);
    case 'apprentissage':
    case 'professionnalisation':
      return generateAlternanceContract(data);
    case 'interim':
      return generateCDDContract({ ...data, contractReason: 'Mission intérim' });
    case 'portage':
      return generateCDIContract(data);
    case 'freelance':
      return generateFreelanceContract(data);
    default:
      return generateCDIContract(data);
  }
}