/**
 * Server-side PDF generation for French labor contracts using pdf-lib.
 * Template PROFESSIONNEL complet et légal - Design noir élégant
 * Conforme au Code du travail français - Articles complets
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
  const blackAccent = rgb(0.12, 0.12, 0.12);    // Noir accent
  const grayDark = rgb(0.25, 0.25, 0.25);       // Gris foncé
  const grayMedium = rgb(0.45, 0.45, 0.45);     // Gris moyen
  const grayLight = rgb(0.65, 0.65, 0.65);      // Gris clair
  const grayBg = rgb(0.96, 0.96, 0.96);         // Gris très clair fond
  const white = rgb(1, 1, 1);
  const borderLine = rgb(0.75, 0.75, 0.75);     // Bordures

  const W = 595.28, H = 841.89;
  const ML = 50, MR = 50;
  const contentW = W - ML - MR;
  const pageBottomY = 60;

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
    y = H - 75;

    // Barre supérieure noire élégante
    page.drawRectangle({ x: 0, y: H - 10, width: W, height: 10, color: black });

    // Header avec fond gris clair
    page.drawRectangle({ x: 0, y: H - 50, width: W, height: 40, color: grayBg });
    page.drawLine({ start: { x: 0, y: H - 50 }, end: { x: W, y: H - 50 }, thickness: 1, color: black });

    const cnW = boldFont.widthOfTextAtSize(safe(data.companyName).toUpperCase(), 10);
    dt(safe(data.companyName).toUpperCase(), ML, H - 32, 10, boldFont, black);
    dt(' — ' + contractTitle, ML + cnW + 5, H - 32, 10, regFont, grayDark);

    // Badge CONFIDENTIEL
    const confLabel = 'CONFIDENTIEL';
    const confW = boldFont.widthOfTextAtSize(confLabel, 7);
    page.drawRectangle({ x: W - MR - confW - 18, y: H - 42, width: confW + 18, height: 18, borderColor: black, borderWidth: 1, color: white });
    dt(confLabel, W - MR - confW - 9, H - 34, 7, boldFont, black);

    // Footer
    const footerText = `${safe(data.companyName)} — SIRET : ${safe(data.companySiret)} — ${new Date().toLocaleDateString('fr-FR')} — Page ${pageCount}`;
    const ftW = timesFont.widthOfTextAtSize(footerText, 6);
    page.drawLine({ start: { x: ML, y: pageBottomY + 20 }, end: { x: W - MR, y: pageBottomY + 20 }, thickness: 1, color: black });
    page.drawText(footerText, { x: (W - ftW) / 2, y: pageBottomY + 8, size: 6, font: timesFont, color: grayMedium });
  }

  function checkY(needed: number) {
    if (y - needed < pageBottomY + 30) addNewPage();
  }

  function drawSectionTitle(title: string, subtitle = '') {
    checkY(28);

    // Ligne supérieure
    page.drawLine({ start: { x: ML, y: y - 2 }, end: { x: W - MR, y: y - 2 }, thickness: 2, color: black });

    // Fond gris clair pour le titre
    page.drawRectangle({ x: ML, y: y - 22, width: contentW, height: 20, color: grayBg });

    // Barre latérale noire
    page.drawRectangle({ x: ML, y: y - 22, width: 5, height: 20, color: black });

    dt(title.toUpperCase(), ML + 10, y - 14, 9, boldFont, black);

    if (subtitle) {
      const subW = regFont.widthOfTextAtSize(subtitle, 7);
      dt(subtitle, W - MR - subW, y - 14, 7, regFont, grayMedium);
    }

    y -= 28;
  }

  function drawArticleNumber(articleNum: string) {
    dt(articleNum, ML, y, 10, boldFont, black);
  }

  function drawBodyText(text: string, indent = 0, italic = false) {
    const lines = wrapLines(text, contentW - 15 - indent, italic ? timesItalicFont : timesFont, 8.5);
    for (const line of lines) {
      checkY(13);
      dt(line, ML + 8 + indent, y, 8.5, italic ? timesItalicFont : timesFont, grayDark);
      y -= 13;
    }
  }

  // ── Build contract ──────────────────────────────────────────────────────────

  addNewPage();
  y -= 10;

  // Titre principal
  ct(contractTitle, y, 16, timesBoldFont, black);
  y -= 14;
  page.drawLine({ start: { x: (W - 200) / 2, y: y - 2 }, end: { x: (W + 200) / 2, y: y - 2 }, thickness: 2, color: black });
  y -= 20;
  ct('Document confidentiel — Établi le ' + new Date().toLocaleDateString('fr-FR'), y, 8, regFont, grayMedium);
  y -= 30;

  // ENTRE LES SOUSSIGNÉS
  ct('ENTRE LES SOUSSIGNÉS', y, 11, boldFont, black);
  y -= 25;

  // Blocs Employeur et Salarié
  const halfW = (contentW - 25) / 2;
  const rightBlockX = ML + halfW + 25;
  const blockH = 115;

  checkY(blockH + 25);

  // Bloc EMPLOYEUR
  page.drawRectangle({ x: ML, y: y - blockH, width: halfW, height: blockH, borderColor: black, borderWidth: 1.5, color: white });
  page.drawRectangle({ x: ML, y: y - blockH, width: halfW, height: 22, color: black });
  dt("L'EMPLOYEUR", ML + 8, y - blockH + 6, 9, boldFont, white);

  dt(safe(data.companyName), ML + 8, y - 26, 10, boldFont, black);
  dt(`${safe(data.companyAddress)}`, ML + 8, y - 40, 7.5, regFont, grayDark);
  dt(`${safe(data.companyPostalCode)} ${safe(data.companyCity)}`, ML + 8, y - 52, 7.5, regFont, grayDark);
  dt(`SIRET : ${safe(data.companySiret)}`, ML + 8, y - 64, 7.5, regFont, grayDark);
  if (data.companyAPE) dt(`Code APE : ${safe(data.companyAPE)}`, ML + 8, y - 76, 7.5, regFont, grayDark);
  dt(`Représenté par :`, ML + 8, y - 88, 7.5, boldFont, black);
  dt(safe(data.employerName), ML + 8, y - 100, 7.5, regFont, grayDark);
  dt(safe(data.employerTitle), ML + 8, y - 110, 7.5, regFont, grayMedium);

  // Bloc SALARIÉ
  page.drawRectangle({ x: rightBlockX, y: y - blockH, width: halfW, height: blockH, borderColor: black, borderWidth: 1.5, color: white });
  page.drawRectangle({ x: rightBlockX, y: y - blockH, width: halfW, height: 22, color: black });
  dt('LE SALARIÉ', rightBlockX + 8, y - blockH + 6, 9, boldFont, white);

  dt(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)}`, rightBlockX + 8, y - 26, 10, boldFont, black);
  dt(`Né(e) le : ${formatDate(data.employeeBirthDate)}`, rightBlockX + 8, y - 40, 7.5, regFont, grayDark);
  dt(`Nationalité : ${safe(data.employeeNationality)}`, rightBlockX + 8, y - 52, 7.5, regFont, grayDark);
  if (data.employeeSocialSecurity) dt(`N° Sécurité sociale : ${safe(data.employeeSocialSecurity)}`, rightBlockX + 8, y - 64, 7.5, regFont, grayDark);
  dt(`${safe(data.employeeAddress)}`, rightBlockX + 8, y - 76, 7.5, regFont, grayDark);
  dt(`${safe(data.employeePostalCode)} ${safe(data.employeeCity)}`, rightBlockX + 8, y - 88, 7.5, regFont, grayDark);
  if (data.employeeEmail) dt(`Email : ${safe(data.employeeEmail)}`, rightBlockX + 8, y - 100, 7.5, regFont, grayDark);
  if (data.employeePhone) dt(`Tél : ${safe(data.employeePhone)}`, rightBlockX + 8, y - 110, 7.5, regFont, grayDark);

  y -= blockH + 25;

  ct("Il a été convenu ce qui suit :", y, 9, timesBoldFont, black);
  y -= 25;

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
    checkY(14);
    dt(label + ' :', ML + 8, y, 8.5, boldFont, black);
    dt(value, ML + 180, y, 8.5, timesFont, grayDark);
    y -= 13;
    page.drawLine({ start: { x: ML + 8, y: y + 3 }, end: { x: W - MR - 8, y: y + 3 }, thickness: 0.5, color: borderLine });
  }
  y -= 10;

  // ── ARTICLE I - ENGAGEMENT ET PÉRIODE D'ESSAI ───────────────────────────────

  drawSectionTitle('ARTICLE I', 'Engagement et période d\'essai');

  drawArticleNumber('I-1. Engagement');
  drawBodyText(`${safe(data.companyName)} (ci-après dénommée "l'Employeur") engage à compter du ${formatDate(data.contractStartDate)} ${safe(data.employeeFirstName)} ${safe(data.employeeLastName)} (ci-après dénommé "le Salarié") en qualité de ${safe(data.jobTitle)}.`);
  y -= 8;

  if (data.jobDescription) {
    drawBodyText(`Fonctions : ${safe(data.jobDescription)}`, 0);
    y -= 8;
  }

  if (data.employeeQualification) {
    drawBodyText(`Qualification : ${safe(data.employeeQualification)}.`);
    y -= 8;
  }

  if (data.contractClassification) {
    drawBodyText(`Classification professionnelle : ${safe(data.contractClassification)} ${data.contractClassificationCode ? `(coeff. ${safe(data.contractClassificationCode)})` : ''}.`);
    y -= 8;
  }

  if (data.collectiveAgreement) {
    drawBodyText(`Convention collective applicable : ${safe(data.collectiveAgreement)} ${data.collectiveAgreementId ? `(IDCC : ${safe(data.collectiveAgreementId)})` : ''}.`);
    y -= 8;
  }

  // Période d'essai
  if (data.trialPeriodDays) {
    checkY(14);
    drawArticleNumber('I-2. Période d\'essai');

    const trialText = `Le présent contrat sera exécuté à titre précaire pendant une période d\'essai de ${data.trialPeriodDays} jours${data.trialPeriodRenewable ? ' renouvelable une fois pour une durée équivalente avec l\'accord exprès du Salarié' : ''}. Pendant cette période, chacune des parties pourra mettre fin au contrat sans indemnité, ni préavis, sous réserve de respecter un délai de prévenance de :`;
    drawBodyText(trialText);
    y -= 5;

    const noticeRules = [
      `- Pour le Salarié : ${data.noticePeriodEmployee || 'un jour'}`,
      `- Pour l'Employeur : ${data.probationNoticeDays ? data.probationNoticeDays + ' jours' : data.noticePeriodEmployer || 'trois jours'}`,
    ];

    for (const rule of noticeRules) {
      drawBodyText(rule, 12);
    }
    y -= 8;

    drawBodyText(`À l'issue de cette période, si la collaboration se poursuit, le contrat deviendra définitif.`, 0, true);
  }

  y -= 10;

  // ── ARTICLE II - LIEU DE TRAVAIL ET HORAIRES ─────────────────────────────────

  drawSectionTitle('ARTICLE II', 'Lieu de travail et horaires');

  drawArticleNumber('II-1. Lieu de travail');
  drawBodyText(`Le Salarié exercera ses fonctions à ${safe(data.workLocation)}.`);

  if (data.mobilityClause) {
    drawBodyText(`En raison de la nature de ses fonctions, le Salarié pourra être amené à se déplacer dans le cadre de sa mission${data.mobilityArea ? ` (${safe(data.mobilityArea)})` : ''}.`, 0, true);
  }
  y -= 8;

  checkY(14);
  drawArticleNumber('II-2. Horaires de travail');
  drawBodyText(`Le Salarié effectuera ses fonctions à temps plein sur la base de ${safe(data.workSchedule)}. Les horaires de travail seront ceux en vigueur au sein de l'entreprise.`);
  drawBodyText(`Des heures supplémentaires pourront être demandées au Salarié en fonction des nécessités de l'exploitation, dans le respect des dispositions légales et conventionnelles en vigueur.`);
  y -= 10;

  // ── ARTICLE III - RÉMUNÉRATION ───────────────────────────────────────────────

  drawSectionTitle('ARTICLE III', 'Rémunération');

  drawArticleNumber('III-1. Salaire de base');
  drawBodyText(`En contrepartie de son travail, le Salarié percevra un salaire brut de ${formatSalary(data.salaryAmount, data.salaryFrequency)}.`);
  y -= 8;

  checkY(14);
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
      drawBodyText('• ' + benefit, 12);
    }
    y -= 8;
  }

  drawBodyText('Le salaire sera versé mensuellement, déduction faite des cotisations sociales légales et conventionnelles obligatoires.', 0, true);

  y -= 10;

  // ── ARTICLE IV - CONGÉS PAYÉS ─────────────────────────────────────────────────

  drawSectionTitle('ARTICLE IV', 'Congés payés et absences');

  drawArticleNumber('IV-1. Congés payés');
  const vacationDays = data.vacationDays || 25;
  drawBodyText(`Le Salarié bénéficiera de ${vacationDays} jours ouvrables de congés payés par an, conformément aux dispositions des articles L.3141-1 et suivants du Code du travail.`);
  y -= 8;

  checkY(14);
  drawArticleNumber('IV-2. Absences');
  drawBodyText('En cas d\'absence pour maladie, le Salarié devra :');
  const absenceRules = [
    `1. Avertir l'Employeur dans les plus brefs délais, et au plus tard dans les 48 heures`,
    `2. Fournir un certificat médical justifiant l'arrêt de travail`,
    `3. Informer l'Employeur de la durée prévisible de son absence`,
  ];
  for (const rule of absenceRules) {
    drawBodyText(rule, 12);
  }
  y -= 8;

  drawBodyText('Les absences non justifiées pourront donner lieu à retenue sur salaire et à sanctions disciplinaires.', 0, true);

  y -= 10;

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
    drawBodyText(obligation, 8);
  }

  y -= 10;

  // ── ARTICLE VI - CONFIDENTIALITÉ ───────────────────────────────────────────────

  drawSectionTitle('ARTICLE VI', 'Confidentialité et discrétion');

  drawBodyText(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)} s'engage à observer une obligation de discrétion absolue concernant toutes les informations, données, procédés, savoir-faire, techniques ou méthodes dont il pourrait avoir connaissance dans l'exercice de ses fonctions.`);
  y -= 8;

  drawBodyText(`Cette obligation subsiste après la fin du contrat, quel qu'en soit le motif, et s'étend à toute divulgation, utilisation ou exploitation des informations confidentielles.`, 0, true);

  y -= 10;

  // ── ARTICLE VII - CLAUSE DE NON-CONCURRENCE (si applicable) ─────────────────────

  if (data.nonCompeteClause) {
    drawSectionTitle('ARTICLE VII', 'Clause de non-concurrence');

    drawBodyText(`Le Salarié s'engage à ne pas exercer, pendant la durée du contrat, toute activité professionnelle pour son compte personnel ou pour le compte d'autrui, qui serait de nature à concurrencer l'activité de ${safe(data.companyName)}.`);

    if (data.nonCompeteScope) {
      y -= 5;
      drawBodyText(`Portée géographique : ${safe(data.nonCompeteScope)}`, 0, true);
    }

    if (data.nonCompeteDuration) {
      y -= 5;
      drawBodyText(`Durée : ${safe(data.nonCompeteDuration)}`, 0, true);
    }

    if (data.nonCompeteCompensation) {
      y -= 5;
      drawBodyText(`En contrepartie de cette obligation, le Salarié percevra une indemnité de ${safe(data.nonCompeteCompensation)}.`, 0, true);
    }

    y -= 10;
  }

  // ── ARTICLE VIII - CLAUSE DE MOBILITÉ (si applicable) ─────────────────────────────

  if (data.mobilityClause) {
    drawSectionTitle('ARTICLE VIII', 'Clause de mobilité');

    drawBodyText(`En raison des nécessités du service, le Salarié pourra être amené à exercer ses fonctions dans différents lieux situés${data.mobilityArea ? ` : ${safe(data.mobilityArea)}` : ''}.`);
    drawBodyText(`Cette mobilité ne pourra avoir pour effet de modifier la durée du contrat ni le lieu de résidence habituel du Salarié sans son accord exprès.`, 0, true);

    y -= 10;
  }

  // ── ARTICLE RUPTURE ────────────────────────────────────────────────────────────

  const ruptureArticle = data.nonCompeteClause ? 'ARTICLE IX' : data.mobilityClause ? 'ARTICLE IX' : 'ARTICLE VIII';
  drawSectionTitle(ruptureArticle, 'Rupture du contrat de travail');

  if (data.contractType === 'cdi') {
    drawBodyText(`Le présent contrat pouvant être rompu à tout moment par l'une ou l'autre des parties, il est convenu ce qui suit :`);
    y -= 8;

    checkY(14);
    drawArticleNumber('Rupture pendant la période d\'essai');
    drawBodyText(`Durant la période d'essai, la rupture du contrat peut intervenir sans préavis ni indemnité, sous réserve du respect des délais de prévenance prévus par l'article L.1221-26 du Code du travail.`);
    y -= 8;

    checkY(14);
    drawArticleNumber('Rupture après la période d\'essai');
    drawBodyText(`Après la période d'essai, la démission ou le licenciement interviendra selon les modalités prévues par le Code du travail et la convention collective applicable.`);
    y -= 8;

    if (data.noticePeriodEmployer || data.noticePeriodEmployee) {
      drawBodyText(`Préavis de rupture :`);
      if (data.noticePeriodEmployer) {
        drawBodyText(`- Employeur : ${safe(data.noticePeriodEmployer)}`, 12);
      }
      if (data.noticePeriodEmployee) {
        drawBodyText(`- Salarié : ${safe(data.noticePeriodEmployee)}`, 12);
      }
    }
  } else if (data.contractType === 'cdd') {
    drawBodyText(`Le présent contrat prendra fin de plein droit à l'échéance du terme, soit le ${formatDate(data.contractEndDate || '')}.`);
    y -= 8;

    drawBodyText(`Toutefois, il pourra être mis fin anticipée :`);
    const finAnticipée = [
      `- D'un commun accord des parties`,
      `- Par le Salarié, qui devra alors respecter un préavis de ${data.noticePeriodEmployee || '15 jours calendaires'}`,
      `- Par l'Employeur pour faute grave ou force majeure`,
      `- Par l'Employeur qui proposerait au Salarié la conclusion d'un ou plusieurs contrats à durée indéterminée`,
    ];
    for (const motif of finAnticipée) {
      drawBodyText(motif, 8);
    }
    y -= 8;

    drawBodyText(`À l'échéance du contrat, le Salarié percevra une indemnité de fin de contrat égale à 10% du total de la rémunération brute due sur la période du contrat.`, 0, true);
  }

  y -= 10;

  // ── ARTICLE DISPOSITIONS DIVERSES ───────────────────────────────────────────────

  const dispoArticle = ruptureArticle === 'ARTICLE IX' ? 'ARTICLE X' : 'ARTICLE IX';
  drawSectionTitle(dispoArticle, 'Dispositions diverses');

  drawBodyText(`Le présent contrat est régi par le Code du travail en vigueur et par la convention collective applicable : ${safe(data.collectiveAgreement || 'Non déterminé')}.`);
  y -= 8;

  drawBodyText(`Le Salarié déclare avoir pris connaissance du règlement intérieur de l'entreprise et s'engage à s'y conformer.`);
  y -= 8;

  drawBodyText(`Tout litige relatif à l'exécution ou à l'interprétation du présent contrat sera de la compétence du Conseil de prud'hommes du siège social de l'Employeur.`);

  y -= 20;

  // ── SIGNATURES ───────────────────────────────────────────────────────────────────

  checkY(150);
  const sigHalfW = (contentW - 25) / 2;
  const sigRightX = ML + sigHalfW + 25;

  ct('Fait à ' + safe(data.companyCity) + ', le ' + formatDate(new Date().toISOString().split('T')[0]) + ' en deux exemplaires originaux', y, 8, timesFont, grayDark);
  y -= 10;
  ct('un exemplaire étant remis à chaque partie', y, 8, timesFont, grayDark);
  y -= 35;

  // Bloc Signature Salarié
  page.drawRectangle({ x: ML, y: y - 125, width: sigHalfW, height: 125, borderColor: black, borderWidth: 1.5, color: white });
  page.drawRectangle({ x: ML, y: y - 125, width: sigHalfW, height: 18, color: black });
  dt('LE SALARIÉ', ML + 10, y - 120, 8, boldFont, white);

  dt(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)}`, ML + 10, y - 100, 9, boldFont, black);
  dt('Précédemment suivi de la mention :', ML + 10, y - 85, 6.5, regFont, grayMedium);
  dt('"Lu et approuvé"', ML + 10, y - 76, 7, timesItalicFont, black);

  if (data.employeeSignature) {
    try {
      const matches = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(data.employeeSignature);
      if (matches) {
        const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
        const img = matches[1] === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        const dims = img.scaleToFit(sigHalfW - 25, 45);
        const imgX = ML + 10 + (sigHalfW - 25 - dims.width) / 2;
        page.drawImage(img, { x: imgX, y: y - 65, width: dims.width, height: dims.height });
      }
    } catch { /* ignore */ }
  }

  page.drawLine({ start: { x: ML + 10, y: y - 20 }, end: { x: ML + sigHalfW - 10, y: y - 20 }, thickness: 1, color: black });

  const empDate = data.employeeSignatureDate ? formatDate(data.employeeSignatureDate) : 'Date : _____________';
  dt(empDate, ML + 10, y - 14, 7, regFont, grayDark);
  dt('Signature', ML + 10, y - 6, 7, regFont, grayDark);

  // Bloc Signature Employeur
  page.drawRectangle({ x: sigRightX, y: y - 125, width: sigHalfW, height: 125, borderColor: black, borderWidth: 1.5, color: white });
  page.drawRectangle({ x: sigRightX, y: y - 125, width: sigHalfW, height: 18, color: black });
  dt("L'EMPLOYEUR", sigRightX + 10, y - 120, 8, boldFont, white);

  dt(safe(data.companyName), sigRightX + 10, y - 100, 9, boldFont, black);
  dt(`Pour ${safe(data.companyName)}`, sigRightX + 10, y - 85, 7, regFont, grayDark);
  dt(safe(data.employerName), sigRightX + 10, y - 76, 7, regFont, black);

  if (data.employerSignature) {
    try {
      const matches = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(data.employerSignature);
      if (matches) {
        const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
        const img = matches[1] === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        const dims = img.scaleToFit(sigHalfW - 25, 45);
        const imgX = sigRightX + 10 + (sigHalfW - 25 - dims.width) / 2;
        page.drawImage(img, { x: imgX, y: y - 65, width: dims.width, height: dims.height });
      }
    } catch { /* ignore */ }
  }

  page.drawLine({ start: { x: sigRightX + 10, y: y - 20 }, end: { x: sigRightX + sigHalfW - 10, y: y - 20 }, thickness: 1, color: black });

  const empDate2 = data.employerSignatureDate ? formatDate(data.employerSignatureDate) : 'Date : _____________';
  dt(empDate2, sigRightX + 10, y - 14, 7, regFont, grayDark);
  dt('Cachet & Signature', sigRightX + 10, y - 6, 7, regFont, grayDark);

  return new Uint8Array(await pdfDoc.save());
}
