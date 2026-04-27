/**
 * Server-side PDF generation for French labor contracts using pdf-lib.
 * Template PROFESSIONNEL complet et légal - Design noir élégant
 * Conforme au Code du travail français - Articles complets
 * Version améliorée avec espacements corrects et tous les articles
 */
import { PDFDocument, StandardFonts, rgb, RGB } from 'pdf-lib';

export interface ContractTemplateData {
  accentColor?: string;

  // Salarié
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

  // Contrat
  contractType: 'cdd' | 'cdi' | 'stage' | 'apprentissage' | 'professionnalisation' | 'interim' | 'portage' | 'freelance';
  contractStartDate: string;
  contractEndDate?: string;
  trialPeriodDays?: string;
  trialPeriodRenewable?: boolean;
  jobTitle: string;
  jobDescription?: string;
  workLocation: string;
  workSchedule: string;
  workingHours?: string;
  salaryAmount: string;
  salaryFrequency: 'monthly' | 'hourly' | 'weekly' | 'flat_rate';
  contractClassification?: string;
  contractClassificationCode?: string;
  contractReason?: string;
  replacedEmployeeName?: string;

  // Entreprise
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  employerName: string;
  employerTitle: string;
  companyAPE?: string;
  companyURSSAF?: string;

  // Avantages
  hasTransport?: boolean;
  hasMeal?: boolean;
  hasHealth?: boolean;
  hasOther?: boolean;
  otherBenefits?: string;
  transportPercentage?: number;
  mealTicketAmount?: number;
  healthInsuranceAmount?: number;

  // Clauses
  collectiveAgreement?: string;
  collectiveAgreementId?: string;
  probationClause?: boolean;
  nonCompeteClause?: boolean;
  nonCompeteDuration?: string;
  nonCompeteScope?: string;
  nonCompeteCompensation?: string;
  mobilityClause?: boolean;
  mobilityArea?: string;
  confidentialityClause?: boolean;

  // Stage / Alternance
  tutorName?: string;
  tutorJob?: string;
  schoolName?: string;
  speciality?: string;
  objectives?: string;
  tasks?: string;
  durationWeeks?: string;

  // Congés et absences
  vacationDays?: number;
  probationNoticeDays?: number;
  noticePeriodEmployer?: string;
  noticePeriodEmployee?: string;

  // Signatures (base64)
  employerSignature?: string;
  employeeSignature?: string;
  employerSignatureDate?: string;
  employeeSignatureDate?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safe(str: unknown): string {
  return String(str ?? '')
    .replace(/–/g, '-').replace(/—/g, '--')
    .replace(/[‘’]/g, "'").replace(/[“”„]/g, '"')
    .replace(/…/g, '...').replace(/\n/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

function hexToRgb(hex: string): RGB {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return rgb(0.1, 0.1, 0.1);
  return rgb(parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255);
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateStr);
  }
}

function formatSalary(amount: string, frequency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return safe(amount);
  const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  const freqLabels: Record<string, string> = { monthly: 'mensuel', hourly: 'horaire', weekly: 'hebdomadaire', flat_rate: 'au forfait' };
  return `${formatted} € ${freqLabels[frequency] || 'mensuel'}`;
}

const CONTRACT_LABELS: Record<string, string> = {
  cdd: 'CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE',
  cdi: 'CONTRAT DE TRAVAIL À DURÉE INDETERMINÉE',
  stage: 'CONVENTION DE STAGE',
  apprentissage: "CONTRAT D'APPRENTISSAGE",
  professionnalisation: 'CONTRAT DE PROFESSIONNALISATION',
  interim: 'CONTRAT DE TRAVAIL TEMPORAIRE (INTÉRIM)',
  portage: 'CONTRAT DE PORTAGE SALARIAL',
  freelance: 'CONTRAT DE PRESTATION DE SERVICES',
};

const CDD_REASONS: Record<string, string> = {
  remplacement: "remplacement d'un salarié absent (article L.1242-2, 1° du Code du travail)",
  accroissement: "accroissement temporaire de l'activité de l'entreprise (article L.1242-2, 2° du Code du travail)",
  saisonnier: "emploi saisonnier dont les tâches se répètent chaque année (article L.1242-2, 3° du Code du travail)",
  usage: "secteur d'activité pour lequel il est d'usage de ne pas recourir au CDI (article L.1242-2, 3° du Code du travail)",
};

// ── Main PDF Generator ────────────────────────────────────────────────────────

export async function generateContractPdfBuffer(data: ContractTemplateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Design noir professionnel élégant
  const black = rgb(0.08, 0.08, 0.08);         // Noir profond
  const grayDark = rgb(0.25, 0.25, 0.25);       // Gris foncé
  const grayMedium = rgb(0.45, 0.45, 0.45);     // Gris moyen
  const grayLight = rgb(0.65, 0.65, 0.65);      // Gris clair
  const grayBg = rgb(0.96, 0.96, 0.96);         // Gris très clair fond
  const white = rgb(1, 1, 1);
  const borderLine = rgb(0.75, 0.75, 0.75);     // Bordures

  const W = 595.28, H = 841.89;
  const ML = 55, MR = 55;  // Marges augmentées
  const contentW = W - ML - MR;
  const pageBottomY = 70;

  let page!: ReturnType<typeof pdfDoc.addPage>;
  let y = 0;
  let pageCount = 0;

  const contractTitle = CONTRACT_LABELS[data.contractType] || 'CONTRAT DE TRAVAIL';

  function dt(text: string, x: number, yy: number, size: number, font: typeof boldFont, color: RGB) {
    const t = safe(text);
    if (!t) return;
    page.drawText(t, { x, y: yy, size, font, color });
  }

  function ct(text: string, yy: number, size: number, font: typeof boldFont, color: RGB) {
    const t = safe(text);
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: (W - w) / 2, y: yy, size, font, color });
  }

  function wrapLines(text: string, maxW: number, font: typeof boldFont, size: number): string[] {
    const lines: string[] = [];
    const words = safe(text).split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function addNewPage() {
    pageCount++;
    page = pdfDoc.addPage([W, H]);
    y = H - 80;

    // Barre supérieure noire élégante
    page.drawRectangle({ x: 0, y: H - 12, width: W, height: 12, color: black });

    // Header avec fond gris clair
    page.drawRectangle({ x: 0, y: H - 55, width: W, height: 43, color: grayBg });
    page.drawLine({ start: { x: 0, y: H - 55 }, end: { x: W, y: H - 55 }, thickness: 1, color: black });

    const cnW = boldFont.widthOfTextAtSize(safe(data.companyName).toUpperCase(), 9);
    dt(safe(data.companyName).toUpperCase(), ML, H - 35, 9, boldFont, black);
    dt(' — ' + contractTitle, ML + cnW + 6, H - 35, 9, regFont, grayDark);

    // Badge CONFIDENTIEL
    const confLabel = 'CONFIDENTIEL';
    const confW = boldFont.widthOfTextAtSize(confLabel, 7);
    page.drawRectangle({ x: W - MR - confW - 20, y: H - 48, width: confW + 20, height: 20, borderColor: black, borderWidth: 1, color: white });
    dt(confLabel, W - MR - confW - 10, H - 40, 7, boldFont, black);

    // Footer
    const footerText = `${safe(data.companyName)} — SIRET : ${safe(data.companySiret)} — ${new Date().toLocaleDateString('fr-FR')} — Page ${pageCount}`;
    const ftW = timesFont.widthOfTextAtSize(footerText, 6);
    page.drawLine({ start: { x: ML, y: pageBottomY + 22 }, end: { x: W - MR, y: pageBottomY + 22 }, thickness: 1, color: black });
    page.drawText(footerText, { x: (W - ftW) / 2, y: pageBottomY + 8, size: 6, font: timesFont, color: grayMedium });
  }

  function checkY(needed: number) {
    if (y - needed < pageBottomY + 35) addNewPage();
  }

  function drawSectionTitle(title: string, subtitle = '') {
    checkY(32);

    // Ligne supérieure élargie
    page.drawLine({ start: { x: ML, y: y - 2 }, end: { x: W - MR, y: y - 2 }, thickness: 2.5, color: black });

    // Fond gris clair pour le titre
    page.drawRectangle({ x: ML, y: y - 26, width: contentW, height: 24, color: grayBg });

    // Barre latérale noire élargie
    page.drawRectangle({ x: ML, y: y - 26, width: 6, height: 24, color: black });

    dt(title.toUpperCase(), ML + 12, y - 16, 9.5, boldFont, black);

    if (subtitle) {
      const subW = regFont.widthOfTextAtSize(subtitle, 7);
      dt(subtitle, W - MR - subW, y - 16, 7, regFont, grayMedium);
    }

    y -= 32;
  }

  function drawArticleNumber(articleNum: string) {
    dt(articleNum, ML, y, 10, boldFont, black);
    y -= 6;
  }

  function drawBodyText(text: string, indent = 0, italic = false) {
    const lines = wrapLines(text, contentW - 20 - indent, italic ? timesItalicFont : timesFont, 8.5);
    for (const line of lines) {
      checkY(14);
      dt(line, ML + 10 + indent, y, 8.5, italic ? timesItalicFont : timesFont, grayDark);
      y -= 14;
    }
  }

  // ── Build contract ──────────────────────────────────────────────────────────

  addNewPage();
  y -= 12;

  // Titre principal
  ct(contractTitle, y, 17, timesBoldFont, black);
  y -= 16;
  page.drawLine({ start: { x: (W - 220) / 2, y: y - 2 }, end: { x: (W + 220) / 2, y: y - 2 }, thickness: 2.5, color: black });
  y -= 24;
  ct('Document confidentiel — Établi le ' + new Date().toLocaleDateString('fr-FR'), y, 8, regFont, grayMedium);
  y -= 32;

  // ENTRE LES SOUSSIGNÉS
  ct('ENTRE LES SOUSSIGNÉS', y, 12, boldFont, black);
  y -= 28;

  // Blocs Employeur et Salarié - AGRANDIS
  const halfW = (contentW - 30) / 2;
  const rightBlockX = ML + halfW + 30;
  const blockH = 130;

  checkY(blockH + 30);

  // Bloc EMPLOYEUR - AGRANDI
  page.drawRectangle({ x: ML, y: y - blockH, width: halfW, height: blockH, borderColor: black, borderWidth: 1.5, color: white });
  page.drawRectangle({ x: ML, y: y - blockH, width: halfW, height: 24, color: black });
  dt("L'EMPLOYEUR", ML + 10, y - blockH + 7, 9.5, boldFont, white);

  dt(safe(data.companyName), ML + 10, y - 30, 10.5, boldFont, black);
  dt(`${safe(data.companyAddress)}`, ML + 10, y - 45, 7.5, regFont, grayDark);
  dt(`${safe(data.companyPostalCode)} ${safe(data.companyCity)}`, ML + 10, y - 58, 7.5, regFont, grayDark);
  dt(`SIRET : ${safe(data.companySiret)}`, ML + 10, y - 71, 7.5, regFont, grayDark);
  if (data.companyAPE) dt(`Code APE : ${safe(data.companyAPE)}`, ML + 10, y - 84, 7.5, regFont, grayDark);
  dt(`Représenté par :`, ML + 10, y - 97, 7.5, boldFont, black);
  dt(safe(data.employerName), ML + 10, y - 110, 7.5, regFont, grayDark);
  dt(safe(data.employerTitle), ML + 10, y - 123, 7, regFont, grayMedium);

  // Bloc SALARIÉ - AGRANDI
  page.drawRectangle({ x: rightBlockX, y: y - blockH, width: halfW, height: blockH, borderColor: black, borderWidth: 1.5, color: white });
  page.drawRectangle({ x: rightBlockX, y: y - blockH, width: halfW, height: 24, color: black });
  dt('LE SALARIÉ', rightBlockX + 10, y - blockH + 7, 9.5, boldFont, white);

  dt(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)}`, rightBlockX + 10, y - 30, 10.5, boldFont, black);
  dt(`Né(e) le : ${formatDate(data.employeeBirthDate)}`, rightBlockX + 10, y - 45, 7.5, regFont, grayDark);
  dt(`Nationalité : ${safe(data.employeeNationality)}`, rightBlockX + 10, y - 58, 7.5, regFont, grayDark);
  if (data.employeeSocialSecurity) dt(`N° Sécurité sociale : ${safe(data.employeeSocialSecurity)}`, rightBlockX + 10, y - 71, 7.5, regFont, grayDark);
  dt(`${safe(data.employeeAddress)}`, rightBlockX + 10, y - 84, 7.5, regFont, grayDark);
  dt(`${safe(data.employeePostalCode)} ${safe(data.employeeCity)}`, rightBlockX + 10, y - 97, 7.5, regFont, grayDark);
  if (data.employeeEmail) dt(`Email : ${safe(data.employeeEmail)}`, rightBlockX + 10, y - 110, 7.5, regFont, grayDark);
  if (data.employeePhone) dt(`Tél : ${safe(data.employeePhone)}`, rightBlockX + 10, y - 123, 7.5, regFont, grayDark);

  y -= blockH + 30;

  ct("Il a été convenu ce qui suit :", y, 9.5, timesBoldFont, black);
  y -= 28;

  // ── ARTICLE PRÉALABLE - RÉCAPITULATIF ────────────────────────────────────────

  drawSectionTitle('ARTICLE PRÉALABLE', 'Récapitulatif des conditions de travail');

  const recapData: Array<[string, string]> = [
    ['Poste occupé', data.jobTitle],
    ['Classification', data.contractClassification || 'Non déterminé'],
    ['Convention collective', data.collectiveAgreement || 'Non applicable'],
    ['Date d\'embauche', formatDate(data.contractStartDate)],
    ...(data.contractEndDate ? [['Date de fin', formatDate(data.contractEndDate)] as [string, string]] : []),
    ...(data.trialPeriodDays ? [['Période d\'essai', `${data.trialPeriodDays} jours${data.trialPeriodRenewable ? ' renouvelable' : ''}`] as [string, string]] : []),
    ['Durée du travail', data.workSchedule],
    ['Lieu de travail', data.workLocation],
    ['Salaire de base', formatSalary(data.salaryAmount, data.salaryFrequency)],
  ];

  for (const [label, value] of recapData) {
    checkY(16);
    dt(label + ' :', ML + 10, y, 9, boldFont, black);
    dt(value, ML + 195, y, 9, timesFont, grayDark);
    y -= 16;
    page.drawLine({ start: { x: ML + 10, y: y + 4 }, end: { x: W - MR - 10, y: y + 4 }, thickness: 0.5, color: borderLine });
  }
  y -= 12;

  // ── ARTICLE I - ENGAGEMENT ET PÉRIODE D'ESSAI ───────────────────────────────

  drawSectionTitle('ARTICLE I', 'Engagement et période d\'essai');

  drawArticleNumber('I-1. Engagement');
  drawBodyText(`${safe(data.companyName)} (ci-après dénommée "l'Employeur") engage à compter du ${formatDate(data.contractStartDate)} ${safe(data.employeeFirstName)} ${safe(data.employeeLastName)} (ci-après dénommé "le Salarié") en qualité de ${safe(data.jobTitle)}.`);
  y -= 10;

  if (data.jobDescription) {
    drawBodyText(`Fonctions : ${safe(data.jobDescription)}`, 0);
    y -= 10;
  }

  if (data.employeeQualification) {
    drawBodyText(`Qualification : ${safe(data.employeeQualification)}.`);
    y -= 10;
  }

  if (data.contractClassification) {
    drawBodyText(`Classification professionnelle : ${safe(data.contractClassification)} ${data.contractClassificationCode ? `(coeff. ${safe(data.contractClassificationCode)})` : ''}.`);
    y -= 10;
  }

  if (data.collectiveAgreement) {
    drawBodyText(`Convention collective applicable : ${safe(data.collectiveAgreement)} ${data.collectiveAgreementId ? `(IDCC : ${safe(data.collectiveAgreementId)})` : ''}.`);
    y -= 10;
  }

  // Période d'essai
  if (data.trialPeriodDays) {
    checkY(16);
    drawArticleNumber('I-2. Période d\'essai');

    const trialText = `Le présent contrat sera exécuté à titre précaire pendant une période d'essai de ${data.trialPeriodDays} jours${data.trialPeriodRenewable ? ' renouvelable une fois pour une durée équivalente avec l\'accord exprès du Salarié' : ''}. Pendant cette période, chacune des parties pourra mettre fin au contrat sans indemnité, ni préavis, sous réserve de respecter un délai de prévenance de :`;
    drawBodyText(trialText);
    y -= 8;

    const noticeRules = [
      `- Pour le Salarié : ${data.noticePeriodEmployee || 'un jour'}`,
      `- Pour l'Employeur : ${data.probationNoticeDays ? data.probationNoticeDays + ' jours' : data.noticePeriodEmployer || 'trois jours'}`,
    ];

    for (const rule of noticeRules) {
      drawBodyText(rule, 15);
    }
    y -= 10;

    drawBodyText(`À l'issue de cette période, si la collaboration se poursuit, le contrat deviendra définitif.`, 0, true);
  }

  y -= 12;

  // ── ARTICLE II - LIEU DE TRAVAIL ET HORAIRES ─────────────────────────────────

  drawSectionTitle('ARTICLE II', 'Lieu de travail et horaires');

  drawArticleNumber('II-1. Lieu de travail');
  drawBodyText(`Le Salarié exercera ses fonctions à ${safe(data.workLocation)}.`);
  y -= 10;

  if (data.mobilityClause) {
    drawBodyText(`En raison de la nature de ses fonctions, le Salarié pourra être amené à se déplacer dans le cadre de sa mission${data.mobilityArea ? ` (${safe(data.mobilityArea)})` : ''}.`, 0, true);
    y -= 10;
  }

  checkY(16);
  drawArticleNumber('II-2. Horaires de travail');
  drawBodyText(`Le Salarié effectuera ses fonctions à temps plein sur la base de ${safe(data.workSchedule)}. Les horaires de travail seront ceux en vigueur au sein de l'entreprise.`);
  drawBodyText(`Des heures supplémentaires pourront être demandées au Salarié en fonction des nécessités de l'exploitation, dans le respect des dispositions légales et conventionnelles en vigueur.`);
  y -= 12;

  // ── ARTICLE III - RÉMUNÉRATION ───────────────────────────────────────────────

  drawSectionTitle('ARTICLE III', 'Rémunération');

  drawArticleNumber('III-1. Salaire de base');
  drawBodyText(`En contrepartie de son travail, le Salarié percevra un salaire brut de ${formatSalary(data.salaryAmount, data.salaryFrequency)}.`);
  y -= 10;

  checkY(16);
  drawArticleNumber('III-2. Avantages en nature');

  const benefits: string[] = [];
  if (data.hasTransport && data.transportPercentage) {
    benefits.push(`Prise en charge des frais de transport : ${data.transportPercentage}%`);
  } else if (data.hasTransport) {
    benefits.push('Prise en charge partielle des frais de transport en commun');
  }

  if (data.hasMeal && data.mealTicketAmount) {
    benefits.push(`Titres-restaurant : ${data.mealTicketAmount} € par ticket`);
  } else if (data.hasMeal) {
    benefits.push('Titres-restaurant ou indemnité de repas');
  }

  if (data.hasHealth && data.healthInsuranceAmount) {
    benefits.push(`Complémentaire santé : ${data.healthInsuranceAmount} € par mois`);
  } else if (data.hasHealth) {
    benefits.push('Complémentaire santé collective obligatoire');
  }

  if (data.hasOther && data.otherBenefits) {
    benefits.push(safe(data.otherBenefits));
  }

  if (benefits.length > 0) {
    drawBodyText('Le Salarié bénéficiera des avantages suivants :');
    for (const benefit of benefits) {
      drawBodyText('• ' + benefit, 15);
    }
    y -= 10;
  }

  drawBodyText('Le salaire sera versé mensuellement, déduction faite des cotisations sociales légales et conventionnelles obligatoires.', 0, true);

  y -= 12;

  // ── ARTICLE IV - CONGÉS PAYÉS ─────────────────────────────────────────────────

  drawSectionTitle('ARTICLE IV', 'Congés payés et absences');

  drawArticleNumber('IV-1. Congés payés');
  const vacationDays = data.vacationDays || 25;
  drawBodyText(`Le Salarié bénéficiera de ${vacationDays} jours ouvrables de congés payés par an, conformément aux dispositions des articles L.3141-1 et suivants du Code du travail.`);
  y -= 10;

  checkY(16);
  drawArticleNumber('IV-2. Absences');
  drawBodyText('En cas d\'absence pour maladie, le Salarié devra :');
  const absenceRules = [
    `1. Avertir l'Employeur dans les plus brefs délais, et au plus tard dans les 48 heures`,
    `2. Fournir un certificat médical justifiant l'arrêt de travail`,
    `3. Informer l'Employeur de la durée prévisible de son absence`,
  ];
  for (const rule of absenceRules) {
    drawBodyText(rule, 15);
  }
  y -= 10;

  drawBodyText('Les absences non justifiées pourront donner lieu à retenue sur salaire et à sanctions disciplinaires.', 0, true);

  y -= 12;

  // ── ARTICLE V - OBLIGATIONS DU SALARIÉ ────────────────────────────────────────

  drawSectionTitle('ARTICLE V', 'Obligations du salarié');

  drawBodyText('Le Salarié s\'engage à :');

  const obligations = [
    '- Exécuter avec soin et conscience les tâches qui lui sont confiées',
    '- Observer les horaires de travail en vigueur dans l\'entreprise',
    '- Respecter les règles de sécurité, d\'hygiène et de discipline',
    '- Ne pas quitter son poste de travail sans autorisation préalable',
    '- Garder une discrétion absolue sur les informations professionnelles',
  ];

  for (const obligation of obligations) {
    drawBodyText(obligation, 12);
  }

  y -= 12;

  // ── ARTICLE VI - CONFIDENTIALITÉ ───────────────────────────────────────────────

  drawSectionTitle('ARTICLE VI', 'Confidentialité et discrétion');

  drawBodyText(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)} s'engage à observer une obligation de discrétion absolue concernant toutes les informations, données, procédés, savoir-faire, techniques ou méthodes dont il pourrait avoir connaissance dans l'exercice de ses fonctions.`);
  y -= 10;

  drawBodyText(`Cette obligation subsiste après la fin du contrat, quel qu'en soit le motif, et s'étend à toute divulgation, utilisation ou exploitation des informations confidentielles.`, 0, true);

  y -= 12;

  // ── ARTICLE VII - MALADIE ET INCAPACITÉ ────────────────────────────────────────

  drawSectionTitle('ARTICLE VII', 'Maladie et incapacité de travail');

  drawBodyText('En cas de maladie ou d\'accident du travail, le Salarié devra :');
  y -= 6;

  const sicknessRules = [
    `1. Informer l'Employeur dans les plus brefs délais, et au plus tard dans les 48 heures suivant le début de l'arrêt de travail`,
    `2. Fournir un certificat médical justifiant l'arrêt de travail et sa durée prévisible`,
    `3. Se soumettre aux examens médicaux demandés par l'Employeur pour vérifier son aptitude au poste de travail`,
    `4. Respecter les prescriptions médicales et les consignes données par le médecin traitant`,
  ];

  for (const rule of sicknessRules) {
    drawBodyText(rule, 15);
  }
  y -= 10;

  drawBodyText('Pendant la période d\'incapacité, le Salarié bénéficiera des dispositions légales relatives au maintien de salaire et à la protection de l\'emploi.', 0, true);

  y -= 12;

  // ── ARTICLE VIII - FORMATION PROFESSIONNELLE ───────────────────────────────────

  drawSectionTitle('ARTICLE VIII', 'Formation professionnelle');

  drawBodyText(`Le Salarié pourra être amené à suivre des actions de formation professionnelle continue, dans le cadre de son emploi et en accord avec l'Employeur.`);
  y -= 10;

  drawBodyText(`Ces formations ont pour objet de maintenir ou parfaire les compétences professionnelles du Salarié et de lui permettre d'adapter ses qualifications à l'évolution des technologies et des postes de travail.`);
  y -= 10;

  drawBodyText(`Le temps passé en formation sera considéré comme temps de travail effectif et donnera lieu au maintien de la rémunération, conformément aux dispositions légales en vigueur.`, 0, true);

  y -= 12;

  // ── ARTICLE IX - CLAUSE DE NON-CONCURRENCE (si applicable) ─────────────────────

  if (data.nonCompeteClause) {
    drawSectionTitle('ARTICLE IX', 'Clause de non-concurrence');

    drawBodyText(`Le Salarié s'engage à ne pas exercer, pendant la durée du contrat, toute activité professionnelle pour son compte personnel ou pour le compte d'autrui, qui serait de nature à concurrencer l'activité de ${safe(data.companyName)}.`);

    if (data.nonCompeteScope) {
      y -= 8;
      drawBodyText(`Portée géographique : ${safe(data.nonCompeteScope)}`, 0, true);
    }

    if (data.nonCompeteDuration) {
      y -= 8;
      drawBodyText(`Durée : ${safe(data.nonCompeteDuration)}`, 0, true);
    }

    if (data.nonCompeteCompensation) {
      y -= 8;
      drawBodyText(`En contrepartie de cette obligation, le Salarié percevra une indemnité de ${safe(data.nonCompeteCompensation)}.`, 0, true);
    }

    y -= 12;
  }

  // ── ARTICLE IX OU X - CLAUSE DE MOBILITÉ (si applicable) ─────────────────────────────

  if (data.mobilityClause) {
    const mobilityArticle = data.nonCompeteClause ? 'ARTICLE X' : 'ARTICLE IX';
    drawSectionTitle(mobilityArticle, 'Clause de mobilité géographique');

    drawBodyText(`En raison des nécessités du service, le Salarié pourra être amené à exercer ses fonctions dans différents lieux situés${data.mobilityArea ? ` : ${safe(data.mobilityArea)}` : ''}.`);
    y -= 10;

    drawBodyText(`Cette mobilité ne pourra avoir pour effet de modifier la durée du contrat ni le lieu de résidence habituel du Salarié sans son accord exprès.`, 0, true);
    y -= 10;

    drawBodyText(`Les frais de déplacement professionnel seront pris en charge par l'Employeur dans les conditions prévues par la convention collective applicable.`, 0, true);

    y -= 12;
  }

  // ── ARTICLE FINAL - RUPTURE DU CONTRAT ────────────────────────────────────────

  const ruptureArticle = data.nonCompeteClause ? 'ARTICLE XI' : data.mobilityClause ? 'ARTICLE XI' : 'ARTICLE X';
  drawSectionTitle(ruptureArticle, 'Rupture du contrat de travail');

  if (data.contractType === 'cdi') {
    drawBodyText(`Le présent contrat pouvant être rompu à tout moment par l'une ou l'autre des parties, il est convenu ce qui suit :`);
    y -= 10;

    checkY(16);
    drawArticleNumber('Rupture pendant la période d\'essai');
    drawBodyText(`Durant la période d'essai, la rupture du contrat peut intervenir sans préavis ni indemnité, sous réserve du respect des délais de prévenance prévus par l'article L.1221-26 du Code du travail.`);
    y -= 10;

    checkY(16);
    drawArticleNumber('Rupture après la période d\'essai');
    drawBodyText(`Après la période d'essai, la démission ou le licenciement interviendra selon les modalités prévues par le Code du travail et la convention collective applicable.`);
    y -= 10;

    if (data.noticePeriodEmployer || data.noticePeriodEmployee) {
      drawBodyText(`Préavis de rupture :`);
      y -= 6;
      if (data.noticePeriodEmployer) {
        drawBodyText(`- Employeur : ${safe(data.noticePeriodEmployer)}`, 15);
      }
      if (data.noticePeriodEmployee) {
        drawBodyText(`- Salarié : ${safe(data.noticePeriodEmployee)}`, 15);
      }
      y -= 10;
    }

    drawBodyText(`La rupture du contrat par l'Employeur ne pourra intervenir que pour faute grave ou faute lourde, conformément aux articles L.1232-1 et suivants du Code du travail.`, 0, true);
    y -= 10;

    drawBodyText(`Le Salarié pourra démissionner à tout moment, sous réserve de respecter un préavis de ${data.noticePeriodEmployee || 'de 15 jours calendaires'} conformément à l'article L.1237-6 du Code du travail.`, 0, true);

  } else if (data.contractType === 'cdd') {
    drawBodyText(`Le présent contrat prendra fin de plein droit à l'échéance du terme, soit le ${formatDate(data.contractEndDate || '')}.`);
    y -= 10;

    drawBodyText(`Toutefois, il pourra être mis fin anticipée :`);
    const finAnticipée = [
      `- D'un commun accord des parties`,
      `- Par le Salarié, qui devra alors respecter un préavis de ${data.noticePeriodEmployee || '15 jours calendaires'}`,
      `- Par l'Employeur pour faute grave ou force majeure`,
      `- Par l'Employeur qui proposerait au Salarié la conclusion d'un ou plusieurs contrats à durée indéterminée`,
    ];
    for (const motif of finAnticipée) {
      drawBodyText(motif, 15);
    }
    y -= 10;

    drawBodyText(`À l'échéance du contrat, le Salarié percevra une indemnité de fin de contrat égale à 10% du total de la rémunération brute due sur la période du contrat.`, 0, true);
  }

  y -= 12;

  // ── ARTICLE FINAL - DISPOSITIONS DIVERSES ───────────────────────────────────────

  const dispoArticle = ruptureArticle === 'ARTICLE XI' ? 'ARTICLE XII' : ruptureArticle === 'ARTICLE X' ? 'ARTICLE XI' : 'ARTICLE X';
  drawSectionTitle(dispoArticle, 'Dispositions diverses et litiges');

  drawBodyText(`Le présent contrat est régi par le Code du travail en vigueur et par la convention collective applicable : ${safe(data.collectiveAgreement || 'Non déterminé')}.`);
  y -= 10;

  drawBodyText(`Le Salarié déclare avoir pris connaissance du règlement intérieur de l'entreprise et s'engage à s'y conformer.`);
  y -= 10;

  drawBodyText(`Le présent contrat est établi en deux exemplaires originaux, un pour chaque partie. Chaque exemplaire est reconnu comme valable et fera foi en justice jusqu'à preuve du contraire.`, 0, true);
  y -= 10;

  drawBodyText(`Tout litige relatif à l'exécution ou à l'interprétation du présent contrat sera de la compétence du Conseil de prud'hommes du siège social de l'Employeur.`);

  y -= 24;

  // ── SIGNATURES ───────────────────────────────────────────────────────────────────

  checkY(160);
  const sigHalfW = (contentW - 30) / 2;
  const sigRightX = ML + sigHalfW + 30;

  ct('Fait à ' + safe(data.companyCity) + ', le ' + formatDate(new Date().toISOString().split('T')[0]) + ' en deux exemplaires originaux', y, 9, timesFont, grayDark);
  y -= 12;
  ct('un exemplaire étant remis à chaque partie', y, 9, timesFont, grayDark);
  y -= 40;

  // Bloc Signature Salarié - AGRANDI
  page.drawRectangle({ x: ML, y: y - 135, width: sigHalfW, height: 135, borderColor: black, borderWidth: 1.5, color: white });
  page.drawRectangle({ x: ML, y: y - 135, width: sigHalfW, height: 20, color: black });
  dt('LE SALARIÉ', ML + 12, y - 130, 9.5, boldFont, white);

  dt(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)}`, ML + 12, y - 108, 10.5, boldFont, black);
  dt('Précédemment suivi de la mention :', ML + 12, y - 92, 7, regFont, grayMedium);
  dt('"Lu et approuvé"', ML + 12, y - 82, 8, timesItalicFont, black);

  if (data.employeeSignature) {
    try {
      const matches = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(data.employeeSignature);
      if (matches) {
        const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
        const img = matches[1] === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        const dims = img.scaleToFit(sigHalfW - 30, 50);
        const imgX = ML + 12 + (sigHalfW - 30 - dims.width) / 2;
        page.drawImage(img, { x: imgX, y: y - 72, width: dims.width, height: dims.height });
      }
    } catch { /* ignore */ }
  }

  page.drawLine({ start: { x: ML + 12, y: y - 22 }, end: { x: ML + sigHalfW - 12, y: y - 22 }, thickness: 1.2, color: black });

  const empDate = data.employeeSignatureDate ? formatDate(data.employeeSignatureDate) : 'Date : _____________';
  dt(empDate, ML + 12, y - 16, 7.5, regFont, grayDark);
  dt('Signature du Salarié', ML + 12, y - 8, 7.5, regFont, grayDark);

  // Bloc Signature Employeur - AGRANDI
  page.drawRectangle({ x: sigRightX, y: y - 135, width: sigHalfW, height: 135, borderColor: black, borderWidth: 1.5, color: white });
  page.drawRectangle({ x: sigRightX, y: y - 135, width: sigHalfW, height: 20, color: black });
  dt("L'EMPLOYEUR", sigRightX + 12, y - 130, 9.5, boldFont, white);

  dt(safe(data.companyName), sigRightX + 12, y - 108, 10.5, boldFont, black);
  dt(`Pour ${safe(data.companyName)}`, sigRightX + 12, y - 92, 7, regFont, grayDark);
  dt(safe(data.employerName), sigRightX + 12, y - 82, 7, regFont, black);

  if (data.employerSignature) {
    try {
      const matches = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(data.employerSignature);
      if (matches) {
        const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
        const img = matches[1] === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        const dims = img.scaleToFit(sigHalfW - 30, 50);
        const imgX = sigRightX + 12 + (sigHalfW - 30 - dims.width) / 2;
        page.drawImage(img, { x: imgX, y: y - 72, width: dims.width, height: dims.height });
      }
    } catch { /* ignore */ }
  }

  page.drawLine({ start: { x: sigRightX + 12, y: y - 22 }, end: { x: sigRightX + sigHalfW - 12, y: y - 22 }, thickness: 1.2, color: black });

  const empDate2 = data.employerSignatureDate ? formatDate(data.employerSignatureDate) : 'Date : _____________';
  dt(empDate2, sigRightX + 12, y - 16, 7.5, regFont, grayDark);
  dt('Cachet de l\'entreprise & Signature', sigRightX + 12, y - 8, 7.5, regFont, grayDark);

  return new Uint8Array(await pdfDoc.save());
}
