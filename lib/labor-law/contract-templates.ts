/**
 * Templates de contrats de travail — Version MEGA ULTRA ESPACÉE
 * Espacement MAXIMUM ABSOLU - signatures sur page séparée avec saut de page
 */

export interface ContractTemplateData {
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
  employeeBirthPlace?: string;
  employeeSocialSecurity?: string;
  employeeNationality: string;
  employeeQualification?: string;

  // Informations contrat
  contractType:
  | 'cdd'
  | 'cdi'
  | 'stage'
  | 'apprentissage'
  | 'professionnalisation'
  | 'interim'
  | 'portage'
  | 'freelance';
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
  contractCoefficient?: string;
  contractReason?: string;
  replacedEmployeeName?: string;

  // Informations entreprise
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  companyApe?: string;
  companyRcs?: string;
  employerName: string;
  employerTitle: string;

  // Convention collective
  collectiveAgreement?: string;
  collectiveAgreementIdcc?: string;

  // Avantages
  hasTransport?: boolean;
  transportAmount?: string;
  hasMeal?: boolean;
  mealAmount?: string;
  hasHealth?: boolean;
  hasOther?: boolean;
  otherBenefits?: string;

  // Clauses spéciales
  probationClause?: boolean;
  nonCompeteClause?: boolean;
  nonCompeteArea?: string;
  nonCompeteDuration?: string;
  nonCompeteCompensation?: string;
  mobilityClause?: boolean;
  mobilityArea?: string;

  // Stage / Alternance
  tutorName?: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolContact?: string;
  speciality?: string;
  objectives?: string;
  tasks?: string;
  durationWeeks?: string;
  internshipGratification?: string;

  // OPCO / CFA (alternance)
  opcoName?: string;
  cfaName?: string;
  diplomaTitle?: string;
  diplomaLevel?: string;

  // Signatures
  employerSignature?: string;
  employeeSignature?: string;
  signatureCity?: string;
  signatureDate?: string;
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

function esc(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return '___________';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return esc(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtMoney(amount?: string): string {
  if (!amount) return '___________';
  const num = parseFloat(amount);
  if (isNaN(num)) return esc(amount);
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00a0€';
}

function calcTrialEnd(startDate: string, days: string): string {
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return '___________';
  d.setDate(d.getDate() + parseInt(days, 10));
  return fmtDate(d.toISOString());
}

// ─────────────────────────────────────────────
// LOGIQUE CONTRAT
// ─────────────────────────────────────────────

function getContractTitle(type: string): string {
  switch (type) {
    case 'cdd': return 'CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE';
    case 'stage': return 'CONVENTION DE STAGE';
    case 'apprentissage': return "CONTRAT D'APPRENTISSAGE";
    case 'professionnalisation': return 'CONTRAT DE PROFESSIONNALISATION';
    case 'interim': return 'CONTRAT DE MISSION TEMPORAIRE';
    case 'portage': return 'CONTRAT DE PORTAGE SALARIAL';
    case 'freelance': return 'CONTRAT DE PRESTATION DE SERVICES';
    default: return 'CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE';
  }
}

function getLegalRef(type: string): string {
  switch (type) {
    case 'cdd': return 'Articles L.&nbsp;1242-1 et suivants du Code du travail';
    case 'stage': return 'Articles L.&nbsp;124-1 et suivants du Code de l\'éducation';
    case 'apprentissage': return 'Articles L.&nbsp;6211-1 et suivants du Code du travail';
    case 'professionnalisation': return 'Articles L.&nbsp;6325-1 et suivants du Code du travail';
    case 'interim': return 'Articles L.&nbsp;1251-1 et suivants du Code du travail';
    default: return 'Articles L.&nbsp;1221-1 et suivants du Code du travail';
  }
}

function getRoleNames(type: string): [string, string] {
  if (type === 'freelance') return ['Le Client', 'Le Prestataire'];
  if (type === 'stage') return ["L'Organisme d'accueil", 'Le ou la Stagiaire'];
  if (type === 'interim') return ["L'Entreprise utilisatrice", 'Le ou la Salarié(e) intérimaire'];
  return ["L'Employeur", 'Le ou la Salarié(e)'];
}

function getSalaryLabel(freq: string): string {
  switch (freq) {
    case 'hourly': return 'brut / heure';
    case 'weekly': return 'brut / semaine';
    case 'flat_rate': return 'forfait brut';
    default: return 'brut mensuel';
  }
}

function getSummaryRows(data: ContractTemplateData): [string, string][] {
  const rows: [string, string][] = [];

  rows.push(['Poste / Fonction', esc(data.jobTitle)]);

  if (data.contractClassification)
    rows.push(['Classification', esc(data.contractClassification) + (data.contractCoefficient ? ` — Coefficient&nbsp;${esc(data.contractCoefficient)}` : '')]);

  if (data.collectiveAgreement)
    rows.push(['Convention collective', esc(data.collectiveAgreement) + (data.collectiveAgreementIdcc ? ` (IDCC&nbsp;${esc(data.collectiveAgreementIdcc)})` : '')]);

  rows.push(["Date d'entrée en fonction", fmtDate(data.contractStartDate)]);

  if (data.contractType !== 'cdi' && data.contractEndDate)
    rows.push(['Date de fin prévue', fmtDate(data.contractEndDate)]);

  if (data.durationWeeks && data.contractType === 'stage')
    rows.push(['Durée du stage', `${esc(data.durationWeeks)} semaines`]);

  if (data.trialPeriodDays && !['stage', 'freelance'].includes(data.contractType)) {
    const label = data.probationClause ? ' (renouvelable une fois)' : '';
    rows.push(["Fin de période d'essai", `${calcTrialEnd(data.contractStartDate, data.trialPeriodDays)} — ${esc(data.trialPeriodDays)} jours${label}`]);
  }

  const hoursLabel = data.workingHours
    ? `${esc(data.workingHours)}\u00a0h / semaine`
    : '35\u00a0h / semaine (temps plein légal)';
  rows.push(['Durée du travail', hoursLabel]);

  rows.push(['Horaires', esc(data.workSchedule) || 'Selon planning']);
  rows.push(['Lieu de travail habituel', esc(data.workLocation)]);

  const salaryText = `${fmtMoney(data.salaryAmount)} ${getSalaryLabel(data.salaryFrequency)}`;
  rows.push(['Rémunération', salaryText]);

  if (data.contractType === 'stage' && data.internshipGratification)
    rows.push(['Gratification de stage', `${fmtMoney(data.internshipGratification)} / heure`]);

  if (data.contractType === 'cdd' && data.contractReason)
    rows.push(['Motif du recours au CDD', esc(data.contractReason) + (data.replacedEmployeeName ? ` — Remplacement de ${esc(data.replacedEmployeeName)}` : '')]);

  if (data.contractType === 'stage' && data.schoolName)
    rows.push(["Établissement d'enseignement", esc(data.schoolName)]);

  if (data.tutorName)
    rows.push(['Maître de stage / Tuteur', esc(data.tutorName)]);

  return rows;
}

// ─────────────────────────────────────────────
// CSS ULTRA-ESPACÉ
// ─────────────────────────────────────────────

function getStyles(accent: string): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,600&display=swap');

    @page {
      size: A4;
      margin: 20mm 20mm 25mm 20mm;
    }
    @media print {
      html, body { height: auto; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
      .no-print { display: none !important; }
      .signature-page-break { page-break-before: always; }
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm 15mm 15mm;
      font-size: 10pt;
      line-height: 1.5;
      color: #2D3748;
      background: #fff;
    }

    /* ── EN-TÊTE ── */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 30px;
      margin-bottom: 30px;
      border-bottom: 2px solid #E2E8F0;
    }
    .doc-header-company { flex: 1; }
    .doc-header-company .company-name {
      font-size: 16pt;
      font-weight: 700;
      color: #1A202C;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .doc-header-company .company-details {
      font-size: 9pt;
      color: #718096;
      line-height: 1.5;
    }
    .doc-header-meta {
      text-align: right;
      font-size: 9pt;
      color: #A0AEC0;
    }
    .doc-header-meta .doc-ref {
      display: inline-block;
      background: #F7FAFC;
      border: 1px solid #E2E8F0;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 9pt;
      margin-bottom: 10px;
      color: #4A5568;
      font-weight: 600;
    }
    .legal-ref {
      font-size: 9pt;
      color: #718096;
      font-style: normal;
      text-align: center;
      margin-bottom: 30px;
      padding: 15px;
      background: #F7FAFC;
      border-radius: 8px;
      line-height: 1.5;
      border: 1px dashed #E2E8F0;
    }

    /* ── TITRE PRINCIPAL ── */
    .main-title {
      text-align: center;
      font-family: 'Playfair Display', serif;
      font-size: 20pt;
      font-weight: 600;
      color: #1A202C;
      margin: 30px 0 15px;
      padding: 20px 15px;
      background: #F7FAFC;
      border-radius: 10px;
      border-top: 3px solid \${accent};
      line-height: 1.4;
    }
    .sub-title {
      text-align: center;
      font-size: 11pt;
      font-weight: 500;
      color: #4A5568;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .between-parties {
      text-align: center;
      font-size: 10pt;
      font-weight: 500;
      color: #718096;
      margin-bottom: 30px;
      padding: 15px;
      border-radius: 8px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* ── BLOC PARTIES ── */
    .parties-wrapper {
      border: 1px solid #E2E8F0;
      margin-bottom: 30px;
      display: flex;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
    }
    .party-col {
      flex: 1;
      padding: 20px;
    }
    .party-col:first-child {
      border-right: 1px solid #E2E8F0;
      background: #F7FAFC;
    }
    .party-col-title {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #A0AEC0;
      margin-bottom: 15px;
    }
    .party-col .name-main {
      font-size: 12pt;
      font-weight: 700;
      color: #1A202C;
      margin-bottom: 12px;
      line-height: 1.4;
    }
    .info-row {
      font-size: 9pt;
      color: #4A5568;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .info-row .lbl {
      font-weight: 600;
      color: #2D3748;
      margin-right: 6px;
    }

    /* ── TABLEAU RÉCAPITULATIF ── */
    .section-label {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: \${accent};
      margin-bottom: 15px;
      margin-top: 25px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E2E8F0;
    }
    .recap-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 30px;
      font-size: 9pt;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
    }
    .recap-table th, .recap-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #E2E8F0;
      line-height: 1.4;
    }
    .recap-table tr:last-child th, .recap-table tr:last-child td {
      border-bottom: none;
    }
    .recap-table th {
      background: #F7FAFC;
      font-weight: 600;
      color: #4A5568;
      width: 40%;
      text-align: left;
      border-right: 1px solid #E2E8F0;
    }
    .recap-table td {
      background: #fff;
      color: #1A202C;
      font-weight: 500;
    }

    /* ── ARTICLES ── */
    .articles-section { margin-top: 25px; }
    .article-block {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .article-title {
      font-family: 'Playfair Display', serif;
      font-size: 12pt;
      font-weight: 600;
      color: #1A202C;
      margin-bottom: 10px;
    }
    .article-body {
      font-size: 9pt;
      text-align: justify;
      color: #4A5568;
      line-height: 1.6;
    }
    .article-body p { margin-bottom: 10px; text-indent: 0; }
    .article-body p:last-child { margin-bottom: 0; }
    .highlight-box {
      background: #F7FAFC;
      border-left: 3px solid \${accent};
      padding: 12px 15px;
      margin: 12px 0;
      border-radius: 0 6px 6px 0;
      line-height: 1.5;
    }
    .highlight-box strong { color: #1A202C; }
    .legal-note {
      font-size: 8pt;
      color: #718096;
      font-style: normal;
      margin-top: 12px;
      padding: 10px 12px;
      background: #FAFDFF;
      border-radius: 6px;
      line-height: 1.5;
      border: 1px solid #EDF2F7;
    }

    /* ── AVANTAGES ── */
    .benefits-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
      margin-bottom: 10px;
    }
    .benefit-badge {
      background: #fff;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 9pt;
      color: #4A5568;
      font-weight: 500;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    /* ── SIGNATURES — SECTION COMPLÈTEMENT ISOLÉE ── */
    .signature-page-break {
      page-break-before: always;
      clear: both;
      width: 100%;
    }
    @media print {
      .signature-page-break {
        page-break-before: always;
      }
    }
    .signatures-section {
      page-break-inside: avoid;
      padding-top: 30px;
      margin-top: 25px;
    }
    .signatures-intro {
      text-align: center;
      font-size: 10pt;
      color: #4A5568;
      margin-bottom: 25px;
      line-height: 1.5;
    }
    .fait-a {
      text-align: right;
      font-size: 10pt;
      color: #4A5568;
      margin-bottom: 30px;
      line-height: 1.5;
      padding: 10px 0;
      border-bottom: 1px solid #E2E8F0;
    }
    .sig-grid {
      display: flex;
      gap: 50px;
      margin-top: 20px;
    }
    .sig-block {
      flex: 1;
      padding: 20px;
      border-radius: 10px;
      background: #F7FAFC;
      border: 1px solid #E2E8F0;
      display: flex;
      flex-direction: column;
    }
    .sig-block-title {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #A0AEC0;
      margin-bottom: 12px;
    }
    .sig-block-name {
      font-size: 11pt;
      font-weight: 700;
      color: #1A202C;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .sig-block-sub {
      font-size: 9pt;
      color: #718096;
      margin-bottom: 25px;
      line-height: 1.4;
    }
    .sig-area {
      height: 120px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border-radius: 8px;
      border: 2px dashed #CBD5E0;
      padding: 10px;
    }
    .sig-area img {
      max-height: 100px;
      max-width: 100%;
      object-fit: contain;
    }
    .sig-area-label {
      font-size: 9pt;
      color: #A0AEC0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sig-mention {
      font-size: 8pt;
      color: #A0AEC0;
      text-align: center;
      line-height: 1.4;
      margin-top: auto;
    }

    /* ── PIED DE PAGE ── */
    .doc-footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #A0AEC0;
      line-height: 1.4;
    }
    .doc-footer strong { color: #718096; }

    /* ── SÉPARATEUR ── */
    .divider {
      border: none;
      border-top: 1px solid #E2E8F0;
      margin: 30px 0;
    }
  `;
}

// ─────────────────────────────────────────────
// ARTICLES DYNAMIQUES
// ─────────────────────────────────────────────

function generateArticles(data: ContractTemplateData, accent: string): string {
  const fullName = `${esc(data.employeeFirstName)} ${esc(data.employeeLastName)}`;
  const company = esc(data.companyName);
  const type = data.contractType;
  let art = '';
  let idx = 1;

  const A = (title: string, body: string) => {
    art += `
    <div class="article-block">
      <div class="article-title">Article ${idx++} — ${title}</div>
      <div class="article-body">${body}</div>
    </div>`;
  };

  // ── ARTICLE : Objet / Engagement ──────────────────────────
  if (type === 'stage') {
    A("Objet de la convention", `
      <p>La présente convention a pour objet de définir les conditions dans lesquelles ${fullName},
      étudiant(e) en <strong>${esc(data.speciality) || '___________'}</strong>
      au sein de l'établissement <strong>${esc(data.schoolName) || '___________'}</strong>,
      effectuera un stage au sein de ${company}, conformément aux articles L.&nbsp;124-1 et suivants du Code de l'éducation.</p>
      <p>Ce stage s'inscrit dans le cadre d'une formation diplômante et constitue une séquence pédagogique
      intégrée au cursus de l'étudiant(e).</p>
    `);
  } else if (type === 'freelance') {
    A("Objet du contrat", `
      <p>Le Client confie au Prestataire, qui accepte, la réalisation de la prestation suivante :
      <strong>${esc(data.jobTitle)}</strong>.</p>
      <p>Le Prestataire agit en qualité de prestataire indépendant, sans lien de subordination avec le Client,
      conservant la totale liberté dans les moyens mis en œuvre pour l'exécution de la prestation.</p>
    `);
  } else {
    const trialText = data.trialPeriodDays && !['stage', 'freelance'].includes(type)
      ? ` Le présent contrat est subordonné au résultat concluant d'une période d'essai de
         <strong>${esc(data.trialPeriodDays)}&nbsp;jours</strong>
         (soit jusqu'au ${calcTrialEnd(data.contractStartDate, data.trialPeriodDays)})
         ${data.probationClause ? ', renouvelable une fois avec l\'accord exprès des deux parties,' : ''}
         durant laquelle chaque partie pourra rompre le contrat sans indemnité, sous réserve du délai de
         prévenance légal.`
      : '';

    A("Engagement et prise de fonctions", `
      <p>${company} engage ${fullName} à compter du <strong>${fmtDate(data.contractStartDate)}</strong>,
      en qualité de <strong>${esc(data.jobTitle)}</strong>
      ${data.contractClassification ? `, classification <strong>${esc(data.contractClassification)}</strong>${data.contractCoefficient ? ` (coefficient&nbsp;${esc(data.contractCoefficient)})` : ''}` : ''}.
      ${data.collectiveAgreement ? `Cet emploi relève de la convention collective <em>${esc(data.collectiveAgreement)}</em>${data.collectiveAgreementIdcc ? ` (IDCC&nbsp;${esc(data.collectiveAgreementIdcc)})` : ''}.` : ''}
      ${trialText}</p>
      <p>La présente embauche est subordonnée à la production des pièces justificatives
      requises par la réglementation en vigueur (titre de séjour, autorisation de travail le cas échéant).</p>
    `);
  }

  // ── ARTICLE : Durée ──────────────────────────────────────
  if (type === 'cdi') {
    A("Durée du contrat", `
      <p>Le présent contrat est conclu pour une durée <strong>indéterminée</strong>,
      conformément aux articles L.&nbsp;1221-1 et suivants du Code du travail.</p>
    `);
  } else if (type === 'cdd') {
    A("Durée et terme du contrat", `
      <p>Conformément à l'article L.&nbsp;1242-1 du Code du travail, le présent contrat est conclu
      pour une durée déterminée courant du <strong>${fmtDate(data.contractStartDate)}</strong>
      au <strong>${fmtDate(data.contractEndDate)}</strong>.</p>
      <p><strong>Motif de recours&nbsp;:</strong> ${esc(data.contractReason) || '___________'}
      ${data.replacedEmployeeName ? ` — en remplacement de <strong>${esc(data.replacedEmployeeName)}</strong>` : ''}.</p>
      <p>À l'échéance du terme et sauf renouvellement ou transformation en CDI, une <strong>indemnité de fin
      de contrat égale à 10&nbsp;% de la rémunération brute totale</strong> sera versée à ${fullName},
      conformément à l'article L.&nbsp;1243-8 du Code du travail.</p>
    `);
  } else if (type === 'stage') {
    A("Durée et calendrier du stage", `
      <p>Le stage débute le <strong>${fmtDate(data.contractStartDate)}</strong> et se termine
      le <strong>${fmtDate(data.contractEndDate)}</strong>,
      soit une durée de <strong>${esc(data.durationWeeks) || '___________'}&nbsp;semaines</strong>.</p>
      <p>Conformément à l'article L.&nbsp;124-5 du Code de l'éducation, la durée totale du stage
      ne peut excéder <strong>six mois</strong> par année d'enseignement.</p>
      <p>En cas d'absence du ou de la stagiaire excédant <strong>sept&nbsp;jours</strong> consécutifs,
      la durée du stage pourra être prolongée d'autant, dans la limite des dispositions légales.</p>
    `);
  } else if (type === 'apprentissage') {
    A("Durée du contrat d'apprentissage", `
      <p>Le contrat est conclu pour la durée du cycle de formation menant au diplôme
      <strong>${esc(data.diplomaTitle) || '___________'}</strong> (niveau&nbsp;${esc(data.diplomaLevel) || '___________'}),
      du <strong>${fmtDate(data.contractStartDate)}</strong>
      au <strong>${fmtDate(data.contractEndDate)}</strong>.</p>
      <p>En application de l'article L.&nbsp;6222-7 du Code du travail, une période d'essai
      de <strong>45&nbsp;jours</strong> de formation pratique est applicable.</p>
      ${data.cfaName ? `<p>La formation théorique est dispensée par : <strong>${esc(data.cfaName)}</strong>.</p>` : ''}
    `);
  } else if (type === 'freelance') {
    A("Durée et exécution de la prestation", `
      <p>La prestation débute le <strong>${fmtDate(data.contractStartDate)}</strong>
      ${data.contractEndDate ? ` et prend fin le <strong>${fmtDate(data.contractEndDate)}</strong>` : ' et se poursuit jusqu\'à achèvement'}.</p>
      <p>Le Prestataire est libre de s'organiser comme il l'entend pour réaliser la mission,
      dans les délais convenus.</p>
    `);
  }

  // ── ARTICLE : Fonctions / Missions ──────────────────────
  const missionTitle = type === 'stage' ? "Missions et objectifs du stage"
    : type === 'freelance' ? "Périmètre de la prestation"
      : "Fonctions et attributions";

  A(missionTitle, `
    <p>${fullName} exercera les fonctions de <strong>${esc(data.jobTitle)}</strong>
    et accomplira l'ensemble des tâches inhérentes à ce poste,
    dans le respect des instructions, règlements intérieurs et procédures de ${company}.</p>
    ${data.objectives ? `
    <div class="highlight-box">
      <strong>Objectifs assignés&nbsp;:</strong><br>${esc(data.objectives)}
    </div>` : ''}
    ${data.tasks ? `
    <div class="highlight-box" style="margin-top: 16px;">
      <strong>Missions détaillées&nbsp;:</strong><br>${esc(data.tasks)}
    </div>` : ''}
    <p class="legal-note">Cette liste est indicative et non limitative. ${fullName} pourra être amené(e)
    à réaliser toute tâche relevant de sa qualification.</p>
  `);

  // ── ARTICLE : Lieu de travail ────────────────────────────
  let lieuBody = `
    <p>Le lieu de travail habituel est fixé à : <strong>${esc(data.workLocation)}</strong>.</p>
  `;
  if (data.mobilityClause) {
    lieuBody += `
    <p>En application d'une <strong>clause de mobilité</strong>, ${fullName} pourra être amené(e) à exercer
    ses fonctions dans tout établissement de ${company} situé
    ${data.mobilityArea ? `dans la zone géographique suivante&nbsp;: <strong>${esc(data.mobilityArea)}</strong>` : 'sur le territoire national'},
    sous réserve d'un délai de prévenance suffisant.</p>
    `;
  }
  A("Lieu de travail", lieuBody);

  // ── ARTICLE : Durée du travail ───────────────────────────
  if (!['freelance'].includes(type)) {
    A("Durée du travail et organisation", `
      <p>La durée hebdomadaire de travail est fixée à <strong>${esc(data.workingHours) || '35'}&nbsp;heures</strong>,
      réparties selon l'horaire suivant&nbsp;: <strong>${esc(data.workSchedule) || 'selon planning communiqué par l\'employeur'}</strong>.</p>
      <p>Des heures supplémentaires ou complémentaires pourront être effectuées à la demande de la hiérarchie,
      dans le respect des dispositions légales et conventionnelles applicables
      (article L.&nbsp;3121-28 et suivants du Code du travail).</p>
      ${type === 'stage' ? `
      <p>Le ou la stagiaire bénéficie des dispositions relatives aux durées maximales de travail
      et aux repos quotidiens et hebdomadaires prévus par le Code du travail.</p>
      ` : ''}
    `);
  }

  // ── ARTICLE : Rémunération ───────────────────────────────
  if (type === 'freelance') {
    A("Rémunération et modalités de facturation", `
      <p>En contrepartie de la prestation, le Client versera au Prestataire la somme de
      <strong>${fmtMoney(data.salaryAmount)}</strong> ${getSalaryLabel(data.salaryFrequency)}.</p>
      <p>Le Prestataire établira une facture conforme aux obligations légales (numéro SIRET, TVA le cas échéant).
      Le paiement interviendra dans un délai de <strong>30&nbsp;jours</strong> à compter de la réception
      de la facture, par virement bancaire.</p>
      <p>Tout retard de paiement donnera lieu à des pénalités de retard calculées au taux
      légal majoré de 10&nbsp;points, ainsi qu'à une indemnité forfaitaire de
      recouvrement de <strong>40&nbsp;€</strong> (article L.&nbsp;441-10 du Code de commerce).</p>
    `);
  } else if (type === 'stage') {
    const gratif = data.internshipGratification
      ? `<p>Lorsque la durée du stage excède deux mois consécutifs, une gratification obligatoire
         de <strong>${fmtMoney(data.internshipGratification)}&nbsp;/ heure</strong> est versée mensuellement,
         conformément à l'article L.&nbsp;124-6 du Code de l'éducation.</p>`
      : `<p>La durée du stage étant inférieure à deux mois consécutifs, aucune gratification obligatoire
         n'est due. Toutefois, si une gratification est accordée, elle sera précisée par avenant.</p>`;
    A("Gratification et remboursement de frais", gratif + `
      <p>Les frais de transport engagés pour se rendre au lieu de stage sont pris en charge à hauteur de
      <strong>50&nbsp;%</strong> du titre de transport en commun, conformément à l'usage.</p>
    `);
  } else {
    let remuBody = `
      <p>${fullName} percevra un salaire de <strong>${fmtMoney(data.salaryAmount)} ${getSalaryLabel(data.salaryFrequency)}</strong>,
      versé mensuellement le dernier jour ouvré du mois, par virement bancaire,
      déduction faite des cotisations sociales légales et conventionnelles en vigueur.</p>
    `;

    const benefits: string[] = [];
    if (data.hasTransport) benefits.push(`Remboursement 50&nbsp;% abonnement transport en commun${data.transportAmount ? ` (${fmtMoney(data.transportAmount)})` : ''}`);
    if (data.hasMeal) benefits.push(`Tickets restaurant ou panier repas${data.mealAmount ? ` — ${fmtMoney(data.mealAmount)} / jour` : ''}`);
    if (data.hasHealth) benefits.push('Mutuelle d\'entreprise (participation employeur)');
    if (data.hasOther && data.otherBenefits) benefits.push(esc(data.otherBenefits));

    if (benefits.length > 0) {
      remuBody += `
        <p>En complément, ${fullName} bénéficiera des avantages suivants&nbsp;:</p>
        <div class="benefits-grid">
          ${benefits.map(b => `<span class="benefit-badge">${b}</span>`).join('')}
        </div>
      `;
    }
    A("Rémunération et avantages", remuBody);
  }

  // ── ARTICLE : Congés payés ───────────────────────────────
  if (['cdi', 'cdd', 'apprentissage', 'professionnalisation', 'portage'].includes(type)) {
    A("Congés payés", `
      <p>Conformément aux articles L.&nbsp;3141-1 et suivants du Code du travail,
      ${fullName} acquiert des droits à congés payés à raison de <strong>2,5&nbsp;jours ouvrables par mois
      de travail effectif</strong>, soit 30&nbsp;jours ouvrables (5&nbsp;semaines) par an.</p>
      <p>Les dates de congés sont fixées d'un commun accord entre les parties, en tenant compte
      des nécessités du service.</p>
    `);
  }

  // ── ARTICLE : Maladie / Absences ─────────────────────────
  if (!['freelance', 'stage'].includes(type)) {
    A("Maladie et absences", `
      <p>En cas d'absence pour maladie ou accident, ${fullName} s'engage à informer
      ${company} <strong>le jour même</strong> de son absence et à faire parvenir
      un <strong>certificat médical d'arrêt de travail dans un délai de 48&nbsp;heures</strong>.</p>
      <p>Le versement d'indemnités complémentaires par l'employeur est conditionné à la production
      de l'arrêt de travail dans les délais prévus et sous réserve des conditions d'ancienneté
      définies par la convention collective applicable.</p>
    `);
  }

  // ── ARTICLE : Confidentialité ────────────────────────────
  A("Obligation de discrétion et de confidentialité", `
    <p>${fullName} s'engage, pendant toute la durée du ${type === 'stage' ? 'stage' : 'contrat'}
    et après sa cessation, à conserver la plus stricte confidentialité concernant
    toute information relative à ${company}, ses clients, fournisseurs, procédés,
    données financières ou tout autre élément dont il (elle) aurait connaissance dans le cadre de ses fonctions.</p>
    <p>Toute violation de cette obligation engage la responsabilité civile et pénale de son auteur
    (articles L.&nbsp;1227-1 du Code du travail et 226-13 du Code pénal).</p>
  `);

  // ── ARTICLE : Non-concurrence (si activée) ───────────────
  if (data.nonCompeteClause && !['stage', 'freelance'].includes(type)) {
    A("Clause de non-concurrence OBLIGATOIRE", `
      <p><strong>⚠️ CLAUSE AVEC INDEMNITÉ COMPENSATOIRE OBLIGATOIRE</strong></p>
      <p>En contrepartie du paiement d'une indemnité compensatrice mensuelle égale à
      <strong>${data.nonCompeteCompensation ? fmtMoney(data.nonCompeteCompensation) : '___________'} brut</strong>
      versée pendant la durée d'application de la clause, ${fullName} s'interdit,
      après la rupture du présent contrat, d'exercer toute activité concurrente
      ${data.nonCompeteArea ? `dans la zone géographique suivante&nbsp;: <strong>${esc(data.nonCompeteArea)}</strong>` : 'dans le secteur d\'activité de l\'entreprise'},
      pendant une durée de <strong>${data.nonCompeteDuration ? esc(data.nonCompeteDuration) : '___________'}</strong>.</p>
      <p class="legal-note"><strong>CONDITION DE VALIDITÉ OBLIGATOIRE :</strong> Sans cette indemnité compensatrice, la clause de non-concurrence est <strong>NULLE</strong> et inapplicable (Cass. Soc. 10&nbsp;juill. 2002). L'indemnité doit être versée mensuellement et son non-paiement libère le salarié de son obligation de non-concurrence.</p>
      <p class="legal-note">Cette clause est conforme aux articles L1227-1 et suivants du Code du travail
      et à la jurisprudence de la Cour de cassation : elle est limitée dans le temps (max 24 mois pour les cadres),
      l'espace et l'activité, et prévoit une contrepartie financière obligatoire.</p>
    `);
  }

  // ── ARTICLE : Protection des données (RGPD) ──────────────
  A("Protection des données personnelles", `
    <p>Dans le cadre de la relation contractuelle, ${company} collecte et traite des données
    personnelles concernant ${fullName} aux seules fins de gestion administrative et sociale,
    conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés
    (modifiée par la loi n°&nbsp;2018-493 du 20&nbsp;juin 2018).</p>
    <p>${fullName} dispose d'un droit d'accès, de rectification, d'effacement et de portabilité
    de ses données, ainsi que du droit de s'opposer à leur traitement,
    exercice par courrier adressé au responsable du traitement.</p>
  `);

  // ── ARTICLE : Rupture ────────────────────────────────────
  if (type === 'freelance') {
    A("Résiliation", `
      <p>Chaque partie peut résilier le présent contrat avec un préavis de <strong>30&nbsp;jours</strong>
      adressé par lettre recommandée avec accusé de réception, sans qu'il soit nécessaire
      d'en justifier le motif.</p>
      <p>En cas de <strong>manquement grave</strong> à ses obligations par l'une des parties,
      l'autre partie pourra résilier le contrat sans préavis, après mise en demeure restée sans effet
      sous 15&nbsp;jours.</p>
    `);
  } else if (type !== 'stage') {
    A("Rupture du contrat", `
      <p>Le présent contrat pourra être rompu dans les conditions prévues par le Code du travail&nbsp;:
      démission, licenciement, rupture conventionnelle homologuée, retraite ou faute grave / lourde.</p>
      <p>Les préavis applicables sont ceux définis par la <em>${esc(data.collectiveAgreement) || 'convention collective applicable'}</em>
      et, à défaut, par les dispositions légales en vigueur.</p>
    `);
  }

  // ── ARTICLE : Droit applicable ───────────────────────────
  A("Droit applicable et attribution de juridiction", `
    <p>Le présent contrat est régi par le <strong>droit français</strong>.
    En cas de litige relatif à son interprétation, son exécution ou sa rupture,
    les parties s'engagent à rechercher une solution amiable avant toute action judiciaire.</p>
    <p>À défaut, le litige sera porté devant le <strong>Conseil de Prud'hommes
    du ressort du siège social de ${company}</strong>,
    ou devant le Tribunal de commerce compétent pour les contrats de prestation.</p>
  `);

  return art;
}

// ─────────────────────────────────────────────
// CONSTRUCTEUR HTML PRINCIPAL
// ─────────────────────────────────────────────

function buildContractHTML(data: ContractTemplateData): string {
  const accent = data.accentColor || '#1a1a2e';
  const [role1, role2] = getRoleNames(data.contractType);
  const title = getContractTitle(data.contractType);
  const summaryRows = getSummaryRows(data);
  const today = data.signatureDate || new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const sigCity = esc(data.signatureCity || data.companyCity);

  // Génère le numéro de référence du document
  const docRef = `${data.contractType.toUpperCase()}-${data.companyName.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${esc(data.employeeFirstName)} ${esc(data.employeeLastName)}</title>
  <style>${getStyles(accent)}</style>
</head>
<body>

  <!-- EN-TÊTE -->
  <div class="doc-header">
    <div class="doc-header-company">
      <div class="company-name">${esc(data.companyName)}</div>
      <div class="company-details">
        ${esc(data.companyAddress)}, ${esc(data.companyPostalCode)} ${esc(data.companyCity)}
        &nbsp;|&nbsp; SIRET&nbsp;: ${esc(data.companySiret)}
        ${data.companyApe ? `&nbsp;|&nbsp; APE&nbsp;: ${esc(data.companyApe)}` : ''}
      </div>
    </div>
    <div class="doc-header-meta">
      <div class="doc-ref">Réf. ${docRef}</div>
      <div>Document confidentiel</div>
      <div>2 exemplaires originaux</div>
    </div>
  </div>

  <!-- TITRE -->
  <div class="main-title">${title}</div>
  <div class="sub-title">
    ${esc(data.jobTitle)}
    ${data.collectiveAgreement ? `&nbsp;—&nbsp; Conv. collective&nbsp;: ${esc(data.collectiveAgreement)}` : ''}
  </div>
  <div class="legal-ref">${getLegalRef(data.contractType)}</div>

  <!-- PARTIES -->
  <p class="between-parties">Entre les soussignés :</p>
  <div class="parties-wrapper">
    <div class="party-col">
      <div class="party-col-title">${role1}</div>
      <div class="name-main">${esc(data.companyName)}</div>
      <div class="info-row">${esc(data.companyAddress)}</div>
      <div class="info-row">${esc(data.companyPostalCode)} ${esc(data.companyCity)}</div>
      <div class="info-row"><span class="lbl">SIRET&nbsp;:</span> ${esc(data.companySiret)}</div>
      ${data.companyApe ? `<div class="info-row"><span class="lbl">Code APE&nbsp;:</span> ${esc(data.companyApe)}</div>` : ''}
      ${data.companyRcs ? `<div class="info-row"><span class="lbl">RCS&nbsp;:</span> ${esc(data.companyRcs)}</div>` : ''}
      <div class="info-row"><span class="lbl">Représenté(e) par&nbsp;:</span> ${esc(data.employerName)}, <em>${esc(data.employerTitle)}</em></div>
      ${data.collectiveAgreement ? `<div class="info-row"><span class="lbl">Conv. collective&nbsp;:</span> ${esc(data.collectiveAgreement)}</div>` : ''}
    </div>
    <div class="party-col">
      <div class="party-col-title">${role2}</div>
      <div class="name-main">${esc(data.employeeFirstName)} ${esc(data.employeeLastName)}</div>
      <div class="info-row"><span class="lbl">Né(e) le&nbsp;:</span> ${fmtDate(data.employeeBirthDate)}${data.employeeBirthPlace ? ` à ${esc(data.employeeBirthPlace)}` : ''}</div>
      <div class="info-row"><span class="lbl">Nationalité&nbsp;:</span> ${esc(data.employeeNationality)}</div>
      ${data.employeeQualification ? `<div class="info-row"><span class="lbl">Qualification&nbsp;:</span> ${esc(data.employeeQualification)}</div>` : ''}
      <div class="info-row"><span class="lbl">Adresse&nbsp;:</span> ${esc(data.employeeAddress)}, ${esc(data.employeePostalCode)} ${esc(data.employeeCity)}</div>
      ${data.employeeSocialSecurity ? `<div class="info-row"><span class="lbl">N°&nbsp;SS&nbsp;:</span> ${esc(data.employeeSocialSecurity)}</div>` : ''}
      ${data.employeeEmail ? `<div class="info-row"><span class="lbl">Email&nbsp;:</span> ${esc(data.employeeEmail)}</div>` : ''}
      ${data.employeePhone ? `<div class="info-row"><span class="lbl">Téléphone&nbsp;:</span> ${esc(data.employeePhone)}</div>` : ''}
    </div>
  </div>

  ${data.contractType === 'stage' && data.schoolName ? `
  <!-- ÉTABLISSEMENT D'ENSEIGNEMENT (stage tripartite) -->
  <div class="parties-wrapper" style="margin-bottom: 40px;">
    <div class="party-col" style="flex: 1; border-right: none; background: #fff;">
      <div class="party-col-title">L'Établissement d'enseignement</div>
      <div class="name-main">${esc(data.schoolName)}</div>
      ${data.schoolAddress ? `<div class="info-row">${esc(data.schoolAddress)}</div>` : ''}
      ${data.schoolContact ? `<div class="info-row"><span class="lbl">Référent pédagogique&nbsp;:</span> ${esc(data.schoolContact)}</div>` : ''}
      ${data.speciality ? `<div class="info-row"><span class="lbl">Filière&nbsp;:</span> ${esc(data.speciality)}</div>` : ''}
    </div>
  </div>
  ` : ''}

  <p style="text-align: center; font-style: italic; font-size: 11pt; color: #444; margin-bottom: 12px; line-height: 1.8;">
    Il a été librement convenu et arrêté ce qui suit :
  </p>

  <!-- TABLEAU RÉCAPITULATIF -->
  <div class="section-label">▸ Récapitulatif des conditions essentielles</div>
  <table class="recap-table">
    <tbody>
      ${summaryRows.map(([label, value]) => `
      <tr>
        <th>${label}</th>
        <td>${value}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <!-- ARTICLES -->
  <div class="section-label">▸ Clauses et conditions générales</div>
  <div class="articles-section">
    ${generateArticles(data, accent)}
  </div>

  <!-- PAGE BREAK AVANT SIGNATURES -->
  <div class="signature-page-break"></div>

  <!-- SIGNATURES -->
  <div class="signatures-section">
    <div class="signatures-intro">
      Pour valider ce contrat, les deux parties apposent leurs signatures ci-dessous :
    </div>

    <div class="fait-a">
      Fait à <strong>${sigCity}</strong>, le <strong>${today}</strong>, en deux exemplaires originaux,
      dont un remis à chaque partie.
    </div>

    <div class="sig-grid">
      <div class="sig-block">
        <div class="sig-block-title">${role1}</div>
        <div class="sig-block-name">${esc(data.employerName)}</div>
        <div class="sig-block-sub">${esc(data.employerTitle)} — ${esc(data.companyName)}</div>
        <div class="sig-area">
          ${data.employerSignature
      ? `<img src="${data.employerSignature}" alt="Signature employeur">`
      : `<span class="sig-area-label">Cachet + Signature</span>`}
        </div>
        <div class="sig-mention">Signature avec cachet de la société</div>
      </div>
      <div class="sig-block">
        <div class="sig-block-title">${role2}</div>
        <div class="sig-block-name">${esc(data.employeeFirstName)} ${esc(data.employeeLastName)}</div>
        <div class="sig-block-sub">${esc(data.jobTitle)}</div>
        <div class="sig-area">
          ${data.employeeSignature
      ? `<img src="${data.employeeSignature}" alt="Signature salarié">`
      : `<span class="sig-area-label">Signature manuscrite</span>`}
        </div>
        ${data.contractType !== 'freelance' && data.contractType !== 'stage'
      ? `<div class="sig-mention">Précédée de la mention manuscrite « Lu et approuvé »</div>`
      : ''}
      </div>
    </div>
  </div>

  ${data.contractType === 'stage' ? `
  <div style="margin-top: 40px; page-break-inside: avoid;">
    <div class="sig-grid">
      <div class="sig-block">
        <div class="sig-block-title">L'Établissement d'enseignement</div>
        <div class="sig-block-name">${esc(data.schoolName) || '___________'}</div>
        ${data.schoolContact ? `<div class="sig-block-sub">${esc(data.schoolContact)}</div>` : ''}
        <div class="sig-area"><span class="sig-area-label">Cachet + Signature</span></div>
      </div>
      <div class="sig-block" style="visibility: hidden;"></div>
    </div>
  </div>
  ` : ''}

  <!-- PIED DE PAGE -->
  <div class="doc-footer">
    <div>
      <strong>${esc(data.companyName)}</strong>
      &nbsp;·&nbsp; SIRET ${esc(data.companySiret)}
      &nbsp;·&nbsp; ${esc(data.companyAddress)}, ${esc(data.companyPostalCode)} ${esc(data.companyCity)}
    </div>
    <div>Réf. ${docRef} &nbsp;·&nbsp; Page 1/1</div>
  </div>

</body>
</html>`;
}

// ─────────────────────────────────────────────
// EXPORTS PUBLICS
// ─────────────────────────────────────────────

export function generateContract(data: ContractTemplateData): string {
  return buildContractHTML(data);
}

export function generateCDIContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'cdi' });
}

export function generateCDDContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'cdd' });
}

export function generateStageContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'stage' });
}

export function generateAlternanceContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'apprentissage' });
}

export function generateProfessionnalisationContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'professionnalisation' });
}

export function generateFreelanceContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'freelance' });
}

export function generatePortageContract(data: ContractTemplateData): string {
  return buildContractHTML({ ...data, contractType: 'portage' });
}
