/**
 * Server-side PDF generation for French labor contracts using pdf-lib.
 * Generates legally compliant contracts with proper formatting, signatures, and French character support.
 */
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage, RGB, PDFImage } from 'pdf-lib';

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

  // Signatures (base64)
  employerSignature?: string;
  employeeSignature?: string;
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): RGB {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return rgb(0.114, 0.62, 0.459);
  return rgb(parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255);
}

function mixRgb(c: RGB, alpha: number, bg: RGB = rgb(1, 1, 1)): RGB {
  return rgb(c.red * alpha + bg.red * (1 - alpha), c.green * alpha + bg.green * (1 - alpha), c.blue * alpha + bg.blue * (1 - alpha));
}

// ── Safe text (WinAnsiEncoding — French accented chars) ──

function safe(str: unknown): string {
  return String(str ?? '')
    .replace(/–/g, '-').replace(/—/g, '--')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/…/g, '...').replace(/€/g, 'EUR')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

// ── Embed base64 image ────────────────────────────────────────────────────────

async function embedBase64Image(pdfDoc: PDFDocument, base64: string): Promise<PDFImage | null> {
  try {
    const matches = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(base64);
    if (!matches) return null;
    const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
    if (matches[1] === 'png') return await pdfDoc.embedPng(bytes);
    return await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

// ── Drawing primitives ────────────────────────────────────────────────────────

function drawText(
  page: PDFPage, text: string, x: number, y: number,
  size: number, font: PDFFont, color: RGB, maxWidth?: number,
): void {
  let t = safe(text);
  if (maxWidth) {
    while (t.length > 1 && font.widthOfTextAtSize(t, size) > maxWidth) t = t.slice(0, -1);
  }
  if (!t) return;
  page.drawText(t, { x, y, size, font, color });
}

function centreText(
  page: PDFPage, text: string, x: number, w: number, y: number,
  size: number, font: PDFFont, color: RGB,
): void {
  const t = safe(text);
  const tw = font.widthOfTextAtSize(t, size);
  page.drawText(t, { x: x + (w - tw) / 2, y, size, font, color });
}

function rightText(
  page: PDFPage, text: string, rightEdge: number, y: number,
  size: number, font: PDFFont, color: RGB,
): void {
  const t = safe(text);
  const w = font.widthOfTextAtSize(t, size);
  page.drawText(t, { x: rightEdge - w, y, size, font, color });
}

/** Wrap long text over multiple lines; returns new y. */
function drawWrapped(
  page: PDFPage, text: string, x: number, y: number, maxW: number,
  size: number, font: PDFFont, color: RGB, lineH: number, minY: number,
): number {
  const words = safe(text).split(/\s+/);
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxW) {
      if (line && y > minY) { drawText(page, line, x, y, size, font, color); y -= lineH; }
      line = word;
    } else {
      line = test;
    }
  }
  if (line && y > minY) { drawText(page, line, x, y, size, font, color); y -= lineH; }
  return y;
}

function drawArticle(
  page: PDFPage, title: string, content: string[], x: number, y: number,
  maxW: number, titleFont: PDFFont, textFont: PDFFont, titleColor: RGB, textColor: RGB,
  minY: number,
): number {
  if (y < minY + 60) return y;

  drawText(page, title, x, y, 11, titleFont, titleColor);
  y -= 16;

  for (const paragraph of content) {
    if (y < minY + 30) break;
    y = drawWrapped(page, paragraph, x + 8, y, maxW - 8, 10, textFont, textColor, 14, minY);
    y -= 8;
  }

  return y - 8;
}

// ── Date formatting ────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateStr);
  }
}

function formatSalary(amount: string, frequency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${amount} ${frequency === 'monthly' ? '/mois' : frequency === 'hourly' ? '/heure' : ''}`;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(num) +
    (frequency === 'monthly' ? ' par mois' : frequency === 'hourly' ? ' par heure' : '');
}

// ── Contract type labels ────────────────────────────────────────────────────────

const CONTRACT_LABELS: Record<string, string> = {
  cdd: 'CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE',
  cdi: 'CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE',
  stage: 'CONVENTION DE STAGE',
  apprentissage: 'CONTRAT D\'APPRENTISSAGE',
  professionnalisation: 'CONTRAT DE PROFESSIONNALISATION',
  interim: 'CONTRAT DE TRAVAIL TEMPORAIRE (INTÉRIM)',
  portage: 'CONTRAT DE PORTAGE SALARIAL',
  freelance: 'CONTRAT DE PRESTATION DE SERVICES (FREELANCE)',
};

// ── Main PDF generator ────────────────────────────────────────────────────────

export async function generateContractPdfBuffer(data: ContractTemplateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesReg = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const accent = hexToRgb(data.accentColor || '#1D9E75');
  const ink = rgb(0.07, 0.07, 0.07);
  const muted = rgb(0.42, 0.45, 0.50);
  const lightBg = mixRgb(accent, 0.05);

  const W = 595.28, H = 841.89;
  const margin = 50;
  const contentW = W - margin * 2;
  const minY = 80;

  let page = pdfDoc.addPage([W, H]);
  let y = H - 50;

  const needPage = () => {
    if (y > minY) return;
    page = pdfDoc.addPage([W, H]);
    y = H - 50;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── HEADER ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // Accent line at top
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: accent });

  // Contract title centered
  const contractLabel = CONTRACT_LABELS[data.contractType] || 'CONTRAT DE TRAVAIL';
  centreText(page, contractLabel, 0, W, y, 16, timesBold, accent);
  y -= 30;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PARTIES ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  drawText(page, 'ENTRE LES SOUSSIGNÉS :', margin, y, 11, timesBold, ink);
  y -= 18;

  // Employer section
  y = drawWrapped(page, `La société ${data.companyName}, au capital social de [MONTANT À DÉFINIR] euros, dont le siège social est situé au ${data.companyAddress}, ${data.companyPostalCode} ${data.companyCity}, immatriculée au RCS de [VILLE] sous le numéro ${data.companySiret},`, margin, y, contentW, 10, timesReg, ink, 14, minY);
  y -= 8;
  y = drawWrapped(page, `Ci-après désignée \"l'employeur\", représentée par ${data.employerName}, en qualité de ${data.employerTitle},`, margin, y, contentW, 10, timesReg, ink, 14, minY);
  y -= 8;
  drawText(page, 'ET', margin, y, 10, timesBold, ink);
  y -= 18;

  // Employee section
  y = drawWrapped(page, `Madame/Monsieur ${data.employeeFirstName} ${data.employeeLastName}, née(e) le ${fmtDate(data.employeeBirthDate)}, de nationalité ${data.employeeNationality}, demeurant au ${data.employeeAddress}, ${data.employeePostalCode} ${data.employeeCity},`, margin, y, contentW, 10, timesReg, ink, 14, minY);
  y -= 8;
  if (data.employeeSocialSecurity) {
    y = drawWrapped(page, `Immatriculée(e) sous le numéro de sécurité sociale ${data.employeeSocialSecurity},`, margin, y, contentW, 10, timesReg, ink, 14, minY);
    y -= 8;
  }
  y = drawWrapped(page, `Ci-après désigné(e) \"le salarié\",`, margin, y, contentW, 10, timesReg, ink, 14, minY);
  y -= 18;

  drawText(page, 'IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :', margin, y, 11, timesBold, accent);
  y -= 24;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE 1: OBJET ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  y = drawArticle(page, 'ARTICLE 1 - OBJET DU CONTRAT', [
    `Le présent contrat a pour objet la conclusion d'un ${CONTRACT_LABELS[data.contractType]?.toLowerCase() || 'contrat de travail'} entre l'employeur et le salarié, conformément aux dispositions du Code du travail français.`,
    `Le salarié est engagé(e) en qualité de ${data.jobTitle} ${data.employeeQualification ? `(${data.employeeQualification})` : ''}.`
  ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE 2: DATE DE DÉBUT ET DURÉE ─────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  let durationContent: string[] = [];

  if (data.contractType === 'cdi') {
    durationContent = [
      `Le contrat débute le ${fmtDate(data.contractStartDate)}.`,
      `Il est conclu pour une durée indéterminée, conformément à l'article L. 1221-2 du Code du travail.`
    ];
  } else if (data.contractType === 'cdd') {
    durationContent = [
      `Le contrat débute le ${fmtDate(data.contractStartDate)} et prend fin le ${fmtDate(data.contractEndDate || '')}.`,
      `Il est conclu pour une durée déterminée de ${Math.ceil((new Date(data.contractEndDate || '').getTime() - new Date(data.contractStartDate).getTime()) / (1000 * 60 * 60 * 24))} jours, conformément aux articles L. 1242-1 et suivants du Code du travail.`,
      `Motif du recours au CDD : ${data.contractReason || 'remplacement'}.`
    ];
    if (data.replacedEmployeeName) {
      durationContent.push(`Ce contrat est conclu pour le remplacement de ${data.replacedEmployeeName}.`);
    }
  } else if (data.contractType === 'stage') {
    durationContent = [
      `Le stage débute le ${fmtDate(data.contractStartDate)} et prend fin le ${fmtDate(data.contractEndDate || '')}.`,
      `La durée du stage est de ${data.durationWeeks || 'X'} semaines, conformément à l'article L. 612-9 du Code de l'éducation.`,
      `Ce stage est effectué au sein de l'entreprise ${data.companyName} dans le cadre de la formation dispensée par ${data.schoolName || '[Établissement d\'enseignement supérieur]'}.`
    ];
  } else if (data.contractType === 'apprentissage' || data.contractType === 'professionnalisation') {
    durationContent = [
      `Le contrat débute le ${fmtDate(data.contractStartDate)} et prend fin le ${fmtDate(data.contractEndDate || '')}.`,
      `Il est conclu pour une durée de ${Math.ceil((new Date(data.contractEndDate || '').getTime() - new Date(data.contractStartDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} mois, conformément aux dispositions du Code du travail relatives à ${data.contractType === 'apprentissage' ? 'l\'apprentissage' : 'la professionnalisation'}.`
    ];
  } else {
    durationContent = [
      `Le contrat débute le ${fmtDate(data.contractStartDate)}${data.contractEndDate ? ` et prend fin le ${fmtDate(data.contractEndDate)}` : '.'}.`
    ];
  }

  y = drawArticle(page, 'ARTICLE 2 - DATE DE DÉBUT ET DURÉE', durationContent, margin, y, contentW, timesBold, timesReg, accent, ink, minY);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE 3: LIEU DE TRAVAIL ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  y = drawArticle(page, 'ARTICLE 3 - LIEU DE TRAVAIL', [
    `Le salarié exercera ses fonctions principalement au ${data.workLocation}.`,
    data.mobilityClause ? `Une clause de mobilité est prévue au présent contrat, permettant à l'employeur de modifier le lieu de travail dans les limites prévues par la clause de mobilité décrite à l'article dédié.` : ''
  ].filter(Boolean), margin, y, contentW, timesBold, timesReg, accent, ink, minY);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE 4: HORAIRES ET TEMPS DE TRAVAIL ───────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  const workTimeContent: string[] = [
    `Le salarié est soumis à un ${data.workSchedule}.`,
    data.workingHours ? `La durée du travail est fixée à ${data.workingHours} heures par semaine.` : `La durée du travail est conforme aux dispositions légales et conventionnelles en vigueur.`
  ];
  y = drawArticle(page, 'ARTICLE 4 - HORAIRES ET TEMPS DE TRAVAIL', workTimeContent, margin, y, contentW, timesBold, timesReg, accent, ink, minY);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE 5: RÉMUNÉRATION ──────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  const salaryContent: string[] = [
    `En contrepartie de son travail, le salarié percevra une rémunération de ${formatSalary(data.salaryAmount, data.salaryFrequency)}.`,
    `Cette rémunération sera versée mensuellement, selon les usages en vigueur dans l'entreprise.`
  ];

  if (data.contractType === 'apprentissage') {
    const age = new Date().getFullYear() - new Date(data.employeeBirthDate).getFullYear();
    salaryContent[0] = `La rémunération de l'apprenti(e) est fixée à ${formatSalary(data.salaryAmount, data.salaryFrequency)} conformément aux dispositions de l'article D. 6222-1 du Code du travail (âge: ${age} ans).`;
  }

  if (data.hasTransport || data.hasMeal || data.hasHealth) {
    salaryContent.push('Le salarié bénéficiera des avantages suivants :');
    if (data.hasTransport) salaryContent.push('- Titres de transport ou remboursement des frais de transport');
    if (data.hasMeal) salaryContent.push('- Titres restaurant ou indemnité de repas');
    if (data.hasHealth) salaryContent.push('- Prévoyance et complémentaire santé');
  }

  if (data.otherBenefits) {
    salaryContent.push(`Avantages supplémentaires : ${data.otherBenefits}`);
  }

  y = drawArticle(page, 'ARTICLE 5 - RÉMUNÉRATION', salaryContent, margin, y, contentW, timesBold, timesReg, accent, ink, minY);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE 6: PÉRIODE D'ESSAI ────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (data.trialPeriodDays || data.contractType === 'cdi') {
    needPage();
    const trialDays = data.trialPeriodDays || '90';
    const trialContent: string[] = [
      data.contractType === 'cdi'
        ? `Une période d'essai de ${trialDays} jours est prévue, conformément aux articles L. 1221-19 et suivants du Code du travail.`
        : data.contractType === 'cdd'
        ? `Le présent contrat ne peut comporter de période d'essai que si sa durée est supérieure à deux semaines, conformément à l'article L. 1242-10 du Code du travail. ${trialDays} jours sont prévus à cet effet.`
        : `Une période d'essai de ${trialDays} jours est prévue.`
    ];
    y = drawArticle(page, "ARTICLE 6 - PÉRIODE D'ESSAI", trialContent, margin, y, contentW, timesBold, timesReg, accent, ink, minY);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE 7: CONVENTION COLLECTIVE ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (data.collectiveAgreement) {
    needPage();
    y = drawArticle(page, 'ARTICLE 7 - CONVENTION COLLECTIVE', [
      `Le présent contrat est régi par la convention collective : ${data.collectiveAgreement}.`,
      'Les dispositions de cette convention collective s\'appliquent au présent contrat.'
    ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── STAGE/ALTERNANCE SPECIFIC ARTICLES ────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (data.contractType === 'stage') {
    needPage();
    y = drawArticle(page, 'ARTICLE 8 - OBJECTS PÉDAGOGIQUES DU STAGE', [
      data.objectives || 'Les objectifs pédagogiques du stage sont définis en accord avec l\'établissement d\'enseignement supérieur.',
      data.tasks || 'Les missions confiées au stagiaire sont en adéquation avec le projet pédagogique défini par l\'établissement d\'enseignement.'
    ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);

    needPage();
    y = drawArticle(page, 'ARTICLE 9 - TUTEUR DE STAGE', [
      `Le stagiaire sera accompagné(e) par ${data.tutorName || 'un tuteur désigné par l\'entreprise'}, qui assurera le suivi et l\'encadrement du stage.`,
      'Le tuteur sera l\'interlocuteur privilégié du stagiaire et de l\'établissement d\'enseignement.'
    ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);

    needPage();
    y = drawArticle(page, 'ARTICLE 10 - GRATIFICATION', [
      `Le stagiaire percevra une gratification mensuelle de ${formatSalary(data.salaryAmount, data.salaryFrequency)}.`,
      'Cette gratification est conforme aux dispositions de l\'article L. 612-12 du Code de l\'éducation.'
    ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);
  }

  if (data.contractType === 'apprentissage' || data.contractType === 'professionnalisation') {
    needPage();
    y = drawArticle(page, "ARTICLE 8 - MAÎTRE D'APPRENTISSAGE / TUTEUR", [
      `Le salarié sera accompagné(e) par ${data.tutorName || 'un maître d\'apprentissage/tuteur désigné par l\'entreprise'}, qui assurera la formation pratique et le suivi de l'alternant.`,
      'Le maître d\'apprentissage/tuteur justifie d\'une expérience professionnelle minimale de deux ans dans le domaine.'
    ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);

    needPage();
    y = drawArticle(page, 'ARTICLE 9 - FORMATION THÉORIQUE', [
      `La formation théorique sera dispensée par ${data.schoolName || '[Centre de formation]'} dans la spécialité : ${data.speciality || '[Spécialité]'}.`,
      'Le salarié bénéficiera de 400 heures de formation théorique par an, conformément aux dispositions légales.'
    ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE: CLAUSE DE NON-CONCURRENCE ────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (data.nonCompeteClause) {
    needPage();
    y = drawArticle(page, `ARTICLE ${data.contractType === 'stage' ? '11' : data.contractType === 'apprentissage' || data.contractType === 'professionnalisation' ? '10' : '8'} - CLAUSE DE NON-CONCURRENCE`, [
      'Le salarié s\'engage à ne pas exercer, pendant une durée de [X] mois après la fin du contrat, toute activité concurrente à celle de l\'employeur.',
      'Cette clause est limitée dans le temps, l\'espace et définie par une activité concurrente déterminée.',
      'En contrepartie, l\'employeur versera au salarié une indemnité mensuelle égale à [X]% de son dernier salaire.'
    ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE: CLAUSE DE MOBILITÉ ────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (data.mobilityClause) {
    needPage();
    const articleNum = data.contractType === 'stage' ? '12' : data.contractType === 'apprentissage' || data.contractType === 'professionnalisation' ? '11' : '9';
    if (data.nonCompeteClause) parseInt(articleNum) + 1;
    y = drawArticle(page, `ARTICLE ${articleNum} - CLAUSE DE MOBILITÉ`, [
      'Le salarié accepte que son lieu de travail puisse être modifié par l\'employeur dans les limites géographiques suivantes : [ZONE GÉOGRAPHIQUE À DÉFINIR].',
      'Cette modification interviendra après un préavis de [X] jours et ne pourra entraîner de changement de domicile sans l\'accord exprès du salarié.',
      'Les frais de déplacement professionnels seront pris en charge par l\'employeur selon les dispositions légales et conventionnelles en vigueur.'
    ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE: OBLIGATIONS DES PARTIES ───────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  let obligationsArticle = '8';
  if (data.contractType === 'stage') obligationsArticle = '13';
  else if (data.contractType === 'apprentissage' || data.contractType === 'professionnalisation') obligationsArticle = '12';
  else if (data.nonCompeteClause) obligationsArticle = '10';
  else if (data.mobilityClause) obligationsArticle = '10';

  y = drawArticle(page, `ARTICLE ${obligationsArticle} - OBLIGATIONS DES PARTIES`, [
    'Le salarié s\'engage à :',
    '- Exécuter ses fonctions avec compétence et diligence',
    '- Respecter les règles de sécurité en vigueur dans l\'entreprise',
    '- Faire preuve de loyauté envers l\'employeur',
    '- Ne pas divulguer d\'informations confidentielles',
    '',
    'L\'employeur s\'engage à :',
    '- Faire exécuter le travail conformément aux dispositions légales',
    '- Verser la rémunération convenue aux échéances fixées',
    '- Assurer la formation et l\'adaptation du salarié à son poste',
    '- Respecter les dispositions légales et conventionnelles'
  ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE: RUPTURE DU CONTRAT ───────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  let ruptureArticle = String(parseInt(obligationsArticle) + 1);
  const ruptureContent: string[] = [];

  if (data.contractType === 'cdi') {
    ruptureContent.push(
      'Le contrat peut être rompu par l\'une ou l\'autre partie, conformément aux dispositions du Code du travail.',
      'En cas de démission, le salarié doit respecter un préavis de [X] jours.',
      'En cas de licenciement, l\'employeur doit respecter la procédure légale et le préavis prévu par la convention collective.'
    );
  } else if (data.contractType === 'cdd') {
    ruptureContent.push(
      'Le contrat prend fin automatiquement à son terme, sans qu\'il soit nécessaire de notifier la fin du contrat.',
      'Toute rupture anticipée du contrat, en dehors des cas prévus par la loi, ouvre droit à des dommages et intérêts.',
      'Les cas de rupture anticipée autorisés sont : la faute grave, la force majeure, et la volonté du salarié de conclure un CDI.'
    );
  } else if (data.contractType === 'stage') {
    ruptureContent.push(
      'Le stage peut être rompu par l\'une ou l\'autre partie, sans préavis ni indemnité, en cas de faute grave de l\'autre partie, ou de force majeure.',
      'En dehors de ces cas, la rupture avant la date prévue doit faire l\'objet d\'un accord entre les parties et d\'une information de l\'établissement d\'enseignement.'
    );
  } else {
    ruptureContent.push('Les modalités de rupture du contrat sont définies par les dispositions légales et conventionnelles applicables.');
  }

  y = drawArticle(page, `ARTICLE ${ruptureArticle} - RUPTURE DU CONTRAT`, ruptureContent, margin, y, contentW, timesBold, timesReg, accent, ink, minY);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE: CONFIDENTIALITÉ ───────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  y = drawArticle(page, `ARTICLE ${parseInt(ruptureArticle) + 1} - CONFIDENTIALITÉ`, [
    'Le salarié s\'engage à maintenir strictement confidentielle toute information concernant l\'entreprise, ses clients, ses produits, ses procédés, ou ses stratégies, dont il aurait connaissance dans l\'exercice de ses fonctions.',
    'Cette obligation de confidentialité persiste après la fin du contrat, sans limitation de durée.'
  ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE: PROPRIÉTÉ INTELLECTUELLE ───────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  y = drawArticle(page, `ARTICLE ${parseInt(ruptureArticle) + 2} - PROPRIÉTÉ INTELLECTUELLE`, [
    'Toutes les créations, inventions, ou développements réalisés par le salarié dans l\'exercice de ses fonctions appartiennent à l\'employeur.',
    'Le salarié s\'engage à collaborer pleinement à la protection des droits de propriété intellectuelle de l\'employeur.'
  ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLE: LITIGES ───────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  y = drawArticle(page, `ARTICLE ${parseInt(ruptureArticle) + 3} - LITIGES`, [
    `Tout litige relatif à l'exécution, à l'interprétation ou à la rupture du présent contrat sera soumis aux juridictions compétentes du siège social de l'employeur, à savoir ${data.companyCity}.`,
    "Les parties s'engagent à tenter de résoudre tout différend à l'amiable avant toute action en justice."
  ], margin, y, contentW, timesBold, timesReg, accent, ink, minY);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SIGNATURES ───────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  y -= 40;

  // Signature section title
  centreText(page, 'SIGNATURES', 0, W, y, 12, timesBold, accent);
  y -= 30;

  const signatureY = y - 40;
  const leftX = margin;
  const rightX = W - margin - 150;
  const signatureW = 150;

  // Employer signature section
  drawText(page, 'L\'EMPLOYEUR', leftX, y, 10, timesBold, ink);
  drawText(page, data.companyName, leftX, y - 12, 9, timesReg, ink);
  drawText(page, data.employerName, leftX, y - 24, 9, timesReg, ink);
  drawText(page, `Fait à ${data.companyCity}, le ${fmtDate(new Date().toISOString())}`, leftX, y - 36, 8, timesItalic, muted);

  // Employer signature line or image
  if (data.employerSignature) {
    const sigImage = await embedBase64Image(pdfDoc, data.employerSignature);
    if (sigImage) {
      const dims = sigImage.scaleToFit(signatureW, 60);
      page.drawImage(sigImage, {
        x: leftX,
        y: signatureY - dims.height,
        width: dims.width,
        height: dims.height,
      });
    } else {
      page.drawLine({ start: { x: leftX, y: signatureY }, end: { x: leftX + signatureW, y: signatureY }, thickness: 0.5, color: ink });
      drawText(page, 'Signature', leftX, signatureY - 8, 8, timesItalic, muted);
    }
  } else {
    page.drawLine({ start: { x: leftX, y: signatureY }, end: { x: leftX + signatureW, y: signatureY }, thickness: 0.5, color: ink });
    drawText(page, 'Signature', leftX, signatureY - 8, 8, timesItalic, muted);
  }

  // Employee signature section
  drawText(page, 'LE SALARIÉ', rightX, y, 10, timesBold, ink);
  drawText(page, `${data.employeeFirstName} ${data.employeeLastName}`, rightX, y - 12, 9, timesReg, ink);
  drawText(page, `Lu et approuvé`, rightX, y - 36, 8, timesItalic, muted);

  // Employee signature line or image
  if (data.employeeSignature) {
    const sigImage = await embedBase64Image(pdfDoc, data.employeeSignature);
    if (sigImage) {
      const dims = sigImage.scaleToFit(signatureW, 60);
      page.drawImage(sigImage, {
        x: rightX,
        y: signatureY - dims.height,
        width: dims.width,
        height: dims.height,
      });
    } else {
      page.drawLine({ start: { x: rightX, y: signatureY }, end: { x: rightX + signatureW, y: signatureY }, thickness: 0.5, color: ink });
      drawText(page, 'Signature', rightX, signatureY - 8, 8, timesItalic, muted);
    }
  } else {
    page.drawLine({ start: { x: rightX, y: signatureY }, end: { x: rightX + signatureW, y: signatureY }, thickness: 0.5, color: ink });
    drawText(page, 'Signature', rightX, signatureY - 8, 8, timesItalic, muted);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── FOOTER ───────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const footerY = 40;
  page.drawLine({ start: { x: margin, y: footerY + 20 }, end: { x: W - margin, y: footerY + 20 }, thickness: 1, color: mixRgb(accent, 0.3) });
  centreText(page, `Contrat généré le ${fmtDate(new Date().toISOString())} - ${data.companyName} - SIRET: ${safe(data.companySiret)}`, 0, W, footerY + 6, 7, timesReg, muted);

  return pdfDoc.save();
}
