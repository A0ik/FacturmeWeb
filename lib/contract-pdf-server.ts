/**
 * Server-side PDF generation for French labor contracts using pdf-lib.
 * Legally compliant with French Labor Code 2025-2026.
 */
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage, RGB, PDFImage } from 'pdf-lib';

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
  jobTitle: string;
  workLocation: string;
  workSchedule: string;
  workingHours?: string;
  salaryAmount: string;
  salaryFrequency: 'monthly' | 'hourly' | 'weekly' | 'flat_rate';
  contractClassification?: string;
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

  // Avantages
  hasTransport?: boolean;
  hasMeal?: boolean;
  hasHealth?: boolean;
  hasOther?: boolean;
  otherBenefits?: string;

  // Clauses
  collectiveAgreement?: string;
  probationClause?: boolean;
  nonCompeteClause?: boolean;
  mobilityClause?: boolean;

  // Stage / Alternance
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
  return rgb(
    c.red * alpha + bg.red * (1 - alpha),
    c.green * alpha + bg.green * (1 - alpha),
    c.blue * alpha + bg.blue * (1 - alpha)
  );
}

// ── Safe text encoding (WinAnsiEncoding) ────────────────────────────────────

function safe(str: unknown): string {
  return String(str ?? '')
    .replace(/–/g, '-').replace(/—/g, '--')
    .replace(/['']/g, "'").replace(/[""]/g, '"')
    .replace(/…/g, '...').replace(/€/g, 'EUR')
    .replace(/•/g, '-').replace(/·/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

// ── Embed base64 image ────────────────────────────────────────────────────────

async function embedBase64Image(pdfDoc: PDFDocument, base64: string): Promise<PDFImage | null> {
  try {
    const matches = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(base64);
    if (!matches) return null;
    const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
    return matches[1] === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

// ── Drawing primitives ────────────────────────────────────────────────────────

function drawText(page: PDFPage, text: string, x: number, y: number, size: number, font: PDFFont, color: RGB, maxWidth?: number): void {
  let t = safe(text);
  if (maxWidth) {
    while (t.length > 1 && font.widthOfTextAtSize(t, size) > maxWidth) t = t.slice(0, -1);
  }
  if (!t) return;
  page.drawText(t, { x, y, size, font, color });
}

function centreText(page: PDFPage, text: string, x: number, w: number, y: number, size: number, font: PDFFont, color: RGB): void {
  const t = safe(text);
  const tw = font.widthOfTextAtSize(t, size);
  page.drawText(t, { x: x + (w - tw) / 2, y, size, font, color });
}

function drawWrapped(page: PDFPage, text: string, x: number, y: number, maxW: number, size: number, font: PDFFont, color: RGB, lineH: number, minY: number): number {
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

// ── Date formatting ────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
    const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateStr);
  }
}

function formatSalary(amount: string, frequency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${amount}`;
  const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  const suffix = frequency === 'monthly' ? ' EUR brut par mois' : frequency === 'hourly' ? ' EUR brut par heure' : frequency === 'weekly' ? ' EUR brut par semaine' : ' EUR brut (forfait)';
  return `${formatted}${suffix}`;
}

function daysBetween(start: string, end: string): number {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
}

function monthsBetween(start: string, end: string): number {
  return Math.round(daysBetween(start, end) / 30);
}

// ── Contract reason labels ────────────────────────────────────────────────────

const CDD_REASONS: Record<string, string> = {
  remplacement: 'remplacement d\'un salarie absent (art. L.1242-2, 1° du Code du travail)',
  accroissement: 'accroissement temporaire de l\'activite de l\'entreprise (art. L.1242-2, 2° du Code du travail)',
  saisonnier: 'emploi saisonnier dont les taches se repetent chaque annee (art. L.1242-2, 3° du Code du travail)',
  usage: 'secteur d\'activite pour lequel il est d\'usage de ne pas recourir au CDI (art. L.1242-2, 3° du Code du travail)',
  objet_defini: 'contrat de projet (objet defini) - cadres et ingenieurs (art. L.1242-2 du Code du travail)',
  temps_partiel: 'contrat a temps partiel conforme a l\'article L.1242-2 du Code du travail',
};

const CONTRACT_LABELS: Record<string, string> = {
  cdd: 'CONTRAT DE TRAVAIL A DUREE DETERMINEE',
  cdi: 'CONTRAT DE TRAVAIL A DUREE INDETERMINEE',
  stage: 'CONVENTION DE STAGE',
  apprentissage: 'CONTRAT D\'APPRENTISSAGE',
  professionnalisation: 'CONTRAT DE PROFESSIONNALISATION',
  interim: 'CONTRAT DE TRAVAIL TEMPORAIRE (INTERIM)',
  portage: 'CONTRAT DE PORTAGE SALARIAL',
  freelance: 'CONTRAT DE PRESTATION DE SERVICES',
};

// ── Main PDF generator ────────────────────────────────────────────────────────

export async function generateContractPdfBuffer(data: ContractTemplateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timeBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timeReg  = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timeIta  = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const accent   = hexToRgb(data.accentColor || '#1D9E75');
  const accentLt = mixRgb(accent, 0.08);
  const accentMd = mixRgb(accent, 0.2);
  const ink      = rgb(0.08, 0.08, 0.10);
  const muted    = rgb(0.40, 0.43, 0.48);
  const white    = rgb(1, 1, 1);
  const lightGray= rgb(0.96, 0.97, 0.98);

  const W = 595.28, H = 841.89;
  const margin  = 52;
  const contentW = W - margin * 2;
  const minY    = 72; // footer zone

  // ── Page factory ────────────────────────────────────────────────────────────

  const pages: PDFPage[] = [];

  function newPage(): PDFPage {
    const p = pdfDoc.addPage([W, H]);
    pages.push(p);

    // Top accent bar (5px)
    p.drawRectangle({ x: 0, y: H - 5, width: W, height: 5, color: accent });

    // Left accent sidebar (3px)
    p.drawRectangle({ x: 0, y: minY, width: 3, height: H - 5 - minY, color: accentMd });

    // Footer line
    p.drawLine({ start: { x: margin, y: minY + 16 }, end: { x: W - margin, y: minY + 16 }, thickness: 0.4, color: accentMd });

    return p;
  }

  let page = newPage();
  let y = H - 28;

  function needPage(space = 80): void {
    if (y > minY + space) return;
    page = newPage();
    y = H - 28;
  }

  function drawPageNumbers(): void {
    const total = pages.length;
    pages.forEach((p, i) => {
      centreText(p, `Page ${i + 1} / ${total}`, 0, W, minY + 4, 7, helvReg, muted);
      // footer text
      drawText(p, safe(data.companyName), margin, minY + 4, 7, helvReg, muted);
      const ref = `Ref. ${data.contractType.toUpperCase()}-${data.employeeLastName.toUpperCase()}-${new Date().getFullYear()}`;
      const rw = helvReg.widthOfTextAtSize(ref, 7);
      drawText(p, ref, W - margin - rw, minY + 4, 7, helvReg, muted);
    });
  }

  // ── Article counter ──────────────────────────────────────────────────────────

  let artNum = 0;
  function nextArt(): string {
    artNum++;
    return `ARTICLE ${artNum}`;
  }

  function drawArticle(title: string, paragraphs: string[]): void {
    needPage(60);

    // Article title background strip
    page.drawRectangle({ x: margin - 4, y: y - 3, width: contentW + 8, height: 17, color: accentLt, borderColor: accentMd, borderWidth: 0.3 });
    drawText(page, safe(title), margin + 2, y + 1, 10, helvBold, accent);
    y -= 20;

    for (const para of paragraphs) {
      if (!para.trim()) { y -= 5; continue; }
      needPage(30);
      const indent = para.startsWith('-') ? margin + 10 : margin + 4;
      const w = contentW - (para.startsWith('-') ? 14 : 4);
      y = drawWrapped(page, para, indent, y, w, 9.5, timeReg, ink, 13.5, minY);
      y -= 4;
    }
    y -= 8;
  }

  function drawSection(label: string): void {
    needPage(50);
    y -= 4;
    page.drawRectangle({ x: 0, y: y - 4, width: W, height: 20, color: accent });
    centreText(page, safe(label), 0, W, y + 2, 9, helvBold, white);
    y -= 28;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── COVER HEADER ──────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // Main title block
  const contractLabel = CONTRACT_LABELS[data.contractType] || 'CONTRAT DE TRAVAIL';
  page.drawRectangle({ x: margin - 4, y: y - 34, width: contentW + 8, height: 44, color: accent });
  centreText(page, contractLabel, 0, W, y - 8, 13, helvBold, white);
  y -= 52;

  // Subtitle: reference
  const refLine = `Ref. ${data.contractType.toUpperCase()}-${data.employeeLastName.toUpperCase()}-${new Date().getFullYear()} | Etabli le ${fmtDate(new Date().toISOString())}`;
  centreText(page, refLine, 0, W, y, 8, helvReg, muted);
  y -= 20;

  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.5, color: accentMd });
  y -= 18;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PARTIES BLOCK ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  drawSection('ENTRE LES SOUSSIGNES');

  // Employer box
  page.drawRectangle({ x: margin - 4, y: y - 74, width: (contentW / 2) - 4, height: 82, color: lightGray, borderColor: accentMd, borderWidth: 0.5 });
  drawText(page, 'EMPLOYEUR', margin + 2, y - 2, 8, helvBold, accent);
  y -= 14;
  y = drawWrapped(page, safe(data.companyName), margin + 2, y, (contentW / 2) - 14, 9, timeBold, ink, 13, minY);
  y = drawWrapped(page, `${data.companyAddress}`, margin + 2, y, (contentW / 2) - 14, 8.5, timeReg, ink, 13, minY);
  y = drawWrapped(page, `${data.companyPostalCode} ${data.companyCity}`, margin + 2, y, (contentW / 2) - 14, 8.5, timeReg, ink, 13, minY);
  drawText(page, `SIRET: ${safe(data.companySiret)}`, margin + 2, y, 8.5, timeReg, ink);
  y -= 13;
  drawText(page, `Repr. par: ${safe(data.employerName)}, ${safe(data.employerTitle)}`, margin + 2, y, 8.5, timeReg, ink);

  // Reset y to top of boxes for employee box
  const boxY = y + 60;
  const rightBoxX = margin + (contentW / 2) + 4;
  const rightBoxW = (contentW / 2) - 4;

  page.drawRectangle({ x: rightBoxX - 4, y: boxY - 74, width: rightBoxW, height: 82, color: lightGray, borderColor: accentMd, borderWidth: 0.5 });
  let ey = boxY - 2;
  drawText(page, 'SALARIE(E)', rightBoxX, ey, 8, helvBold, accent);
  ey -= 14;
  drawText(page, `${safe(data.employeeFirstName)} ${safe(data.employeeLastName)}`, rightBoxX, ey, 9, timeBold, ink, rightBoxW - 10);
  ey -= 13;
  drawText(page, `Ne(e) le ${fmtDate(data.employeeBirthDate)}`, rightBoxX, ey, 8.5, timeReg, ink);
  ey -= 13;
  drawText(page, `Nationalite: ${safe(data.employeeNationality)}`, rightBoxX, ey, 8.5, timeReg, ink);
  ey -= 13;
  y = drawWrapped(page, `${data.employeeAddress}, ${data.employeePostalCode} ${data.employeeCity}`, rightBoxX, ey, rightBoxW - 10, 8.5, timeReg, ink, 13, minY);
  if (data.employeeSocialSecurity) {
    drawText(page, `N° SS: ${safe(data.employeeSocialSecurity)}`, rightBoxX, y, 8.5, timeReg, ink);
    y -= 13;
  }

  y -= 18;

  // "Il a ete convenu" centered
  centreText(page, 'IL A ETE CONVENU ET ARRETE CE QUI SUIT :', 0, W, y, 10, timeBold, accent);
  y -= 24;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ARTICLES ─────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  drawSection('CONDITIONS DU CONTRAT');

  // ── Art 1: Objet ─────────────────────────────────────────────────────────

  const contractTypeFull = {
    cdd: 'contrat de travail a duree determinee (CDD)',
    cdi: 'contrat de travail a duree indeterminee (CDI)',
    stage: 'convention de stage',
    apprentissage: 'contrat d\'apprentissage',
    professionnalisation: 'contrat de professionnalisation',
    interim: 'contrat de travail temporaire (interim)',
    portage: 'contrat de portage salarial',
    freelance: 'contrat de prestation de services',
  }[data.contractType] || 'contrat de travail';

  drawArticle(`${nextArt()} - OBJET DU CONTRAT`, [
    `Le present contrat a pour objet la conclusion d'un ${contractTypeFull} entre les parties susvisees, conformement aux dispositions du Code du travail francais.`,
    `Le(la) salarie(e) est engage(e) en qualite de : ${safe(data.jobTitle)}${data.employeeQualification ? ` - Classification : ${safe(data.employeeQualification)}` : ''}.`,
    data.contractClassification ? `Convention collective applicable : ${safe(data.contractClassification)}.` : '',
  ].filter(Boolean));

  // ── Art 2: Duree / Dates ─────────────────────────────────────────────────

  const durationParagraphs: string[] = [];

  if (data.contractType === 'cdi') {
    durationParagraphs.push(
      `Le contrat prend effet le ${fmtDate(data.contractStartDate)}.`,
      `Il est conclu pour une duree indeterminee, conformement a l'article L. 1221-2 du Code du travail, qui pose le CDI comme forme normale et generale de la relation de travail.`
    );
  } else if (data.contractType === 'cdd') {
    const jours = data.contractEndDate ? daysBetween(data.contractStartDate, data.contractEndDate) : 0;
    const motifLabel = CDD_REASONS[data.contractReason || ''] || safe(data.contractReason || 'a preciser');
    durationParagraphs.push(
      `Le contrat prend effet le ${fmtDate(data.contractStartDate)} et prend fin le ${fmtDate(data.contractEndDate || '')} (soit ${jours} jours calendaires).`,
      `Conformement a l'article L. 1242-1 du Code du travail, ce CDD est conclu pour le motif suivant : ${motifLabel}.`,
    );
    if (data.replacedEmployeeName) {
      durationParagraphs.push(`Nom du salarie remplace : ${safe(data.replacedEmployeeName)}.`);
    }
    durationParagraphs.push(
      `Ce contrat ne pourra etre renouvele plus de deux fois, dans la limite d'une duree totale de 18 mois (art. L. 1243-13 du Code du travail).`,
      `A l'issue du contrat, le(la) salarie(e) percevra une indemnite de fin de contrat egale a 10 % de la remuneration brute totale percue, conformement a l'article L. 1243-8 du Code du travail (sauf recrutement en CDI dans la meme entreprise ou rupture pour faute grave).`
    );
  } else if (data.contractType === 'stage') {
    const sem = data.durationWeeks || 'a definir';
    durationParagraphs.push(
      `Le stage debute le ${fmtDate(data.contractStartDate)} et prend fin le ${fmtDate(data.contractEndDate || '')} (${sem} semaines).`,
      `La duree du stage ne peut exceder 6 mois par annee d'enseignement (art. L. 124-5 du Code de l'education).`,
      `Ce stage est effectue dans le cadre de la formation dispensee par ${safe(data.schoolName || '[Etablissement d\'enseignement]')}, specialite : ${safe(data.speciality || 'a preciser')}.`,
      `La presente convention est conclue entre l'entreprise d'accueil, l'etablissement d'enseignement et le stagiaire, conformement aux articles L. 124-1 et suivants du Code de l'education.`
    );
  } else if (data.contractType === 'apprentissage') {
    const mois = data.contractEndDate ? monthsBetween(data.contractStartDate, data.contractEndDate) : 0;
    durationParagraphs.push(
      `Le contrat d'apprentissage debute le ${fmtDate(data.contractStartDate)} et prend fin le ${fmtDate(data.contractEndDate || '')} (${mois} mois).`,
      `Il est conclu conformement aux articles L. 6221-1 et suivants du Code du travail.`,
      `Le present contrat doit etre enregistre aupres de l'OPCO competent avant le debut de l'apprentissage.`
    );
  } else if (data.contractType === 'professionnalisation') {
    const mois = data.contractEndDate ? monthsBetween(data.contractStartDate, data.contractEndDate) : 0;
    durationParagraphs.push(
      `Le contrat de professionnalisation debute le ${fmtDate(data.contractStartDate)} et prend fin le ${fmtDate(data.contractEndDate || '')} (${mois} mois).`,
      `Il est conclu conformement aux articles L. 6325-1 et suivants du Code du travail.`
    );
  } else {
    durationParagraphs.push(
      `Le contrat prend effet le ${fmtDate(data.contractStartDate)}${data.contractEndDate ? ` et prend fin le ${fmtDate(data.contractEndDate)}` : ''}.`
    );
  }

  drawArticle(`${nextArt()} - DATE DE DEBUT ET DUREE`, durationParagraphs);

  // ── Art 3: Lieu de travail ───────────────────────────────────────────────

  drawArticle(`${nextArt()} - LIEU DE TRAVAIL`, [
    `Le(la) salarie(e) exercera ses fonctions principalement au : ${safe(data.workLocation)}.`,
    `Tout deplacement professionnel occasionnel ne constitue pas une modification du contrat de travail.`,
    data.mobilityClause
      ? `Une clause de mobilite est stipulee au present contrat (voir article dedie). Toute mutation geographique sera precedee d'un delai de prevenance raisonnable.`
      : `Le lieu de travail ne pourra etre modifie de facon permanente sans accord du salarie, sauf application d'une clause de mobilite.`,
  ]);

  // ── Art 4: Horaires ──────────────────────────────────────────────────────

  const heures = data.workingHours || (data.workSchedule.includes('35') ? '35' : data.workSchedule.includes('39') ? '39' : '35');
  drawArticle(`${nextArt()} - HORAIRES ET DUREE DU TRAVAIL`, [
    `Le(la) salarie(e) est soumis(e) a : ${safe(data.workSchedule)}.`,
    `La duree hebdomadaire de travail est fixee a ${heures} heures, conformement aux articles L. 3121-1 et suivants du Code du travail.`,
    `La duree legale du temps de travail effectif est de 35 heures par semaine (art. L. 3121-27 du Code du travail). Toute heure accomplie au-dela de cette limite constitue une heure supplementaire ouvrant droit a majoration.`,
    `Les horaires de travail seront communiques au salarie selon les modalites en vigueur dans l'entreprise.`,
  ]);

  // ── Art 5: Remuneration ──────────────────────────────────────────────────

  const salParagraphs: string[] = [];

  if (data.contractType === 'apprentissage') {
    const age = new Date().getFullYear() - new Date(data.employeeBirthDate + 'T12:00:00').getFullYear();
    salParagraphs.push(
      `La remuneration de l'apprenti(e) est fixee a ${formatSalary(data.salaryAmount, data.salaryFrequency)}.`,
      `Elle est determinee conformement a l'article D. 6222-1 du Code du travail, en fonction de l'age (${age} ans) et de la progression dans le cycle d'apprentissage. Elle ne peut etre inferieure au pourcentage legal du SMIC ou du salaire minimum conventionnel.`,
    );
  } else if (data.contractType === 'stage') {
    salParagraphs.push(
      `La gratification mensuelle du stagiaire est fixee a ${formatSalary(data.salaryAmount, data.salaryFrequency)}.`,
      `La gratification minimale legale pour 2026 est fixee a 15 % du plafond horaire de la Securite Sociale (environ 3,95 EUR par heure de presence effective), conformement a l'article L. 124-6 du Code de l'education et au decret en vigueur.`,
      `Les periodes de stage n'entrent pas dans le calcul de l'anciennete du stagiaire en cas d'embauche ulterieure, sauf accord plus favorable.`
    );
  } else {
    salParagraphs.push(
      `En contrepartie de son travail, le(la) salarie(e) percevra une remuneration brute de ${formatSalary(data.salaryAmount, data.salaryFrequency)}.`,
      `Cette remuneration ne peut etre inferieure au SMIC en vigueur (art. L. 3231-2 du Code du travail).`,
      `Le salaire sera verse mensuellement, au plus tard le dernier jour ouvrable du mois, par virement bancaire.`,
    );
  }

  if (data.hasTransport || data.hasMeal || data.hasHealth || data.hasOther) {
    salParagraphs.push(`Le(la) salarie(e) beneficiera egalement des avantages suivants :`);
    if (data.hasTransport) salParagraphs.push('- Prise en charge a 50% des frais de transports en commun (art. L. 3261-2 du Code du travail)');
    if (data.hasMeal)     salParagraphs.push('- Titres-restaurant ou indemnite de repas selon les modalites en vigueur dans l\'entreprise');
    if (data.hasHealth)   salParagraphs.push('- Complementaire sante et prevoyance collective obligatoire (art. L. 911-7 du Code de la Securite Sociale)');
    if (data.hasOther && data.otherBenefits) salParagraphs.push(`- ${safe(data.otherBenefits)}`);
  }

  drawArticle(`${nextArt()} - REMUNERATION ET AVANTAGES`, salParagraphs);

  // ── Art 6: Periode d'essai ───────────────────────────────────────────────

  if (data.trialPeriodDays || data.contractType === 'cdi') {
    const trialDays = parseInt(data.trialPeriodDays || '0');
    const trialParagraphs: string[] = [];

    if (data.contractType === 'cdi') {
      trialParagraphs.push(
        trialDays > 0
          ? `Une periode d'essai de ${trialDays} jours est prevue, conformement aux articles L. 1221-19 et suivants du Code du travail.`
          : `Aucune periode d'essai n'est stipulee au present contrat.`,
        `Les durees maximales legales de la periode d'essai (renouvellement inclus) sont : 4 mois pour les ouvriers et employes, 6 mois pour les agents de maitrise et techniciens, 8 mois pour les cadres (art. L. 1221-19 a L. 1221-23 du Code du travail).`,
        `Durant la periode d'essai, chaque partie peut rompre le contrat en respectant un delai de prevenance (art. L. 1221-25 du Code du travail).`
      );
    } else if (data.contractType === 'cdd') {
      trialParagraphs.push(
        trialDays > 0
          ? `Le present contrat comporte une periode d'essai de ${trialDays} jours.`
          : `Le present contrat ne comporte pas de periode d'essai.`,
        `Pour les CDD d'une duree superieure ou egale a 6 mois, la periode d'essai est calculee a raison d'un jour par semaine de duree prevue du contrat, sans pouvoir depasser 2 semaines. Au-dela de 6 mois, la periode d'essai ne peut exceder 1 mois (art. L. 1242-10 du Code du travail).`
      );
    } else {
      if (trialDays > 0) {
        trialParagraphs.push(`Une periode d'essai de ${trialDays} jours est prevue.`);
      }
    }

    if (trialParagraphs.length > 0) {
      drawArticle(`${nextArt()} - PERIODE D'ESSAI`, trialParagraphs);
    }
  }

  // ── Art: Convention collective ───────────────────────────────────────────

  if (data.collectiveAgreement) {
    drawArticle(`${nextArt()} - CONVENTION COLLECTIVE`, [
      `Le present contrat est soumis a la convention collective : ${safe(data.collectiveAgreement)}.`,
      `Un exemplaire ou un resume des principales dispositions de cette convention collective est tenu a la disposition du salarie dans l'entreprise.`,
      `Les dispositions plus favorables de la convention collective ou des accords d'entreprise applicables se substituent de plein droit aux clauses correspondantes du present contrat.`
    ]);
  }

  // ── Articles Stage / Alternance ──────────────────────────────────────────

  if (data.contractType === 'stage') {
    drawSection('DISPOSITIONS SPECIFIQUES AU STAGE');

    drawArticle(`${nextArt()} - OBJECTIFS PEDAGOGIQUES`, [
      data.objectives || 'Les objectifs pedagogiques du stage sont definis conjointement entre l\'entreprise d\'accueil et l\'etablissement d\'enseignement, en coherence avec la formation suivie par le stagiaire.',
      data.tasks || 'Les missions confiees au stagiaire s\'inscrivent dans le projet pedagogique de l\'etablissement et permettent d\'acquerir des competences professionnelles en lien direct avec la formation.',
      `Le stagiaire ne peut en aucun cas etre affecte a un poste qui aurait pu etre occupe par un salarie de l'entreprise (interdiction de substitution, art. L. 124-7 du Code de l'education).`
    ]);

    drawArticle(`${nextArt()} - TUTEUR DE STAGE`, [
      `Le stagiaire sera encadre par : ${safe(data.tutorName || 'un tuteur designe par la direction')}, qui assurera le suivi pedagogique, l'encadrement au quotidien et le lien avec l'etablissement d'enseignement.`,
      `Le tuteur doit avoir la capacite professionnelle necessaire pour accompagner le stagiaire (art. L. 124-10 du Code de l'education).`,
      `Un bilan de mi-stage et un bilan final seront organises en presence du tuteur et, le cas echeant, d'un representant de l'etablissement d'enseignement.`
    ]);

    drawArticle(`${nextArt()} - PROTECTION SOCIALE ET COUVERTURE`, [
      `Le stagiaire beneficie de la protection contre les accidents du travail et les maladies professionnelles dans les memes conditions qu'un salarie (art. L. 412-8 du Code de la Securite Sociale).`,
      `Le stagiaire est couvert par la responsabilite civile de l'entreprise d'accueil pour les dommages qu'il pourrait causer dans le cadre de son stage.`,
      `Le stagiaire doit justifier d'une assurance responsabilite civile personnelle en vigueur pendant toute la duree du stage.`
    ]);
  }

  if (data.contractType === 'apprentissage' || data.contractType === 'professionnalisation') {
    drawSection(`DISPOSITIONS SPECIFIQUES A L'${data.contractType === 'apprentissage' ? 'APPRENTISSAGE' : 'LA PROFESSIONNALISATION'}`);

    drawArticle(`${nextArt()} - MAITRE D'APPRENTISSAGE / TUTEUR`, [
      `Le(la) salarie(e) sera encadre(e) par : ${safe(data.tutorName || 'un maitre d\'apprentissage/tuteur designe par la direction')}.`,
      `Le maitre d'apprentissage/tuteur justifie d'une experience professionnelle d'au moins deux ans dans le domaine de la specialite. Il ne peut encadrer plus de deux alternants simultanement (art. L. 6223-8 et R. 6223-22 du Code du travail).`,
      `Il assure la formation pratique de l'alternant, evalue ses competences et maintient le lien avec le centre de formation.`
    ]);

    drawArticle(`${nextArt()} - FORMATION THEORIQUE`, [
      `La formation theorique sera dispensee par : ${safe(data.schoolName || '[Centre de Formation des Apprentis / OPCO]')}, dans la specialite : ${safe(data.speciality || 'a preciser')}.`,
      data.contractType === 'apprentissage'
        ? `L'alternant beneficiera d'un minimum de 400 heures de formation theorique par an au sein du CFA (art. L. 6211-2 du Code du travail).`
        : `Le salarie beneficiera d'une formation theorique representant au minimum 15 % de la duree totale du contrat, sans pouvoir etre inferieure a 150 heures (art. L. 6325-13 du Code du travail).`,
      `Le present contrat doit etre transmis pour enregistrement a l'OPCO competent dans les 5 jours ouvrables suivant sa conclusion.`
    ]);
  }

  // ── Clauses optionnelles ─────────────────────────────────────────────────

  if (data.nonCompeteClause) {
    drawArticle(`${nextArt()} - CLAUSE DE NON-CONCURRENCE`, [
      `Apres la cessation du contrat de travail, quelle qu'en soit la cause, le(la) salarie(e) s'interdit d'exercer, directement ou indirectement, toute activite concurrente a celle de l'entreprise.`,
      `Cette clause est limitee dans le temps (duree a preciser), dans l'espace (zone geographique a preciser) et porte sur une activite concurrente determinee.`,
      `En contrepartie de cette obligation, l'employeur versera au salarie, pendant toute la duree d'application de la clause, une indemnite mensuelle compensatrice egale a [X] % de la remuneration mensuelle brute moyenne percue durant les 12 derniers mois du contrat.`,
      `A defaut de contrepartie financiere, la clause de non-concurrence est nulle et de nul effet (Cass. Soc., 10 juillet 2002).`
    ]);
  }

  if (data.mobilityClause) {
    drawArticle(`${nextArt()} - CLAUSE DE MOBILITE`, [
      `Le(la) salarie(e) accepte expressement que son lieu de travail puisse etre modifie par l'employeur dans les limites geographiques suivantes : [zone geographique a preciser].`,
      `Toute modification sera notifiee par ecrit avec un delai de prevenance minimum de [X] jours ouvrables.`,
      `Cette clause ne peut pas imposer un changement de residence du salarie sans son accord expres.`,
      `Les frais de deplacement lies a l'application de cette clause seront pris en charge par l'employeur conformement aux dispositions legales et conventionnelles.`
    ]);
  }

  // ── Section: Dispositions generales ─────────────────────────────────────

  drawSection('DISPOSITIONS GENERALES');

  // ── Art: Obligations des parties ─────────────────────────────────────────

  drawArticle(`${nextArt()} - OBLIGATIONS DES PARTIES`, [
    `Le(la) salarie(e) s'engage a :`,
    `- Executer ses fonctions avec professionnalisme, competence et diligence`,
    `- Respecter le reglement interieur, les procedures et les regles de securite en vigueur`,
    `- Faire preuve de loyaute et de discretion envers l'employeur`,
    `- Ne pas divulguer d'informations confidentielles sur l'entreprise, ses clients et ses procedes`,
    `- Signaler toute situation de danger ou de difficulte professionnelle`,
    ``,
    `L'employeur s'engage a :`,
    `- Fournir au salarie les moyens necessaires a l'execution de ses fonctions`,
    `- Verser la remuneration aux echeances convenues`,
    `- Assurer la formation et l'adaptation du salarie a son poste (art. L. 6321-1 du Code du travail)`,
    `- Respecter la sante physique et mentale du salarie et ses droits fondamentaux`,
    `- Effectuer la Declaration Prealable a l'Embauche (DPAE) aupres de l'URSSAF avant la prise de poste`
  ]);

  // ── Art: Rupture du contrat ──────────────────────────────────────────────

  const ruptureParagraphs: string[] = [];

  if (data.contractType === 'cdi') {
    ruptureParagraphs.push(
      `Le present CDI peut etre rompu dans les conditions prevues par le Code du travail : demission (art. L. 1237-1), licenciement pour motif personnel ou economique (art. L. 1232-1 et L. 1237-12), rupture conventionnelle homologuee (art. L. 1237-19), depart ou mise a la retraite, force majeure.`,
      `En cas de demission, le salarie devra respecter un preavis dont la duree est fixee par la convention collective applicable ou, a defaut, par les usages de la profession.`,
      `En cas de licenciement, l'employeur est tenu de respecter la procedure legale (convocation, entretien prealable, notification) et le preavis legal ou conventionnel.`,
      `La rupture conventionnelle doit faire l'objet d'un ou plusieurs entretiens entre les parties, d'une convention homologuee par la DREETS (art. L. 1237-14 du Code du travail).`
    );
  } else if (data.contractType === 'cdd') {
    ruptureParagraphs.push(
      `Le present CDD prend fin de plein droit a son terme, sans qu'il soit necessaire d'effectuer une notification prealable.`,
      `Une rupture anticipee n'est possible que dans les cas limitativement enumeres par l'article L. 1243-1 du Code du travail : accord des deux parties, faute grave, force majeure, ou inaptitude constatee par le medecin du travail.`,
      `Hors ces cas, la rupture anticipee abusive par l'employeur ouvre droit a des dommages et interets correspondant au minimum aux remunerations que le salarie aurait percues jusqu'au terme du contrat.`,
      `Hors ces cas, la rupture anticipee par le salarie est possible s'il justifie d'une embauche en CDI dans une autre entreprise.`
    );
  } else if (data.contractType === 'stage') {
    ruptureParagraphs.push(
      `Le stage peut etre interrompu avant son terme par l'une ou l'autre des parties en cas de faute grave ou de force majeure, ou si le stage ne correspond plus aux objectifs pedagogiques definis.`,
      `Toute interruption anticipee doit faire l'objet d'une information ecrite et concertee entre l'etablissement d'enseignement, l'entreprise et le stagiaire.`
    );
  } else {
    ruptureParagraphs.push(
      `Les modalites de rupture du present contrat sont definies par les dispositions legales et conventionnelles applicables au type de contrat conclu.`
    );
  }

  drawArticle(`${nextArt()} - RUPTURE DU CONTRAT`, ruptureParagraphs);

  // ── Art: RGPD ────────────────────────────────────────────────────────────

  drawArticle(`${nextArt()} - PROTECTION DES DONNEES PERSONNELLES (RGPD)`, [
    `Conformement au Reglement (UE) 2016/679 (RGPD) et a la loi Informatique et Libertes du 6 janvier 1978 modifiee, les donnees personnelles du salarie collectees dans le cadre de son embauche et de l'execution du present contrat sont traitees par l'employeur en qualite de responsable de traitement.`,
    `Ces donnees sont necessaires a la gestion de la relation de travail (paie, administration du personnel, couverture sociale) et seront conservees pendant la duree legale applicable.`,
    `Le salarie dispose d'un droit d'acces, de rectification et de limitation du traitement de ses donnees en contactant l'employeur.`
  ]);

  // ── Art: Confidentialite ─────────────────────────────────────────────────

  drawArticle(`${nextArt()} - CONFIDENTIALITE ET SECRET PROFESSIONNEL`, [
    `Le(la) salarie(e) s'engage a maintenir strictement confidentielle toute information d'ordre commercial, industriel, financier, technique ou strategique dont il/elle aurait connaissance dans l'exercice de ses fonctions.`,
    `Cette obligation de confidentialite s'applique pendant toute la duree du contrat et se poursuit apres sa cessation, quelle qu'en soit la cause, sans limitation de duree.`,
    `Le non-respect de cette clause est susceptible d'engager la responsabilite civile et penale du salarie.`
  ]);

  // ── Art: Propriete intellectuelle ────────────────────────────────────────

  drawArticle(`${nextArt()} - PROPRIETE INTELLECTUELLE`, [
    `Toutes les creations, inventions, logiciels, bases de donnees, oeuvres, methodes ou ameliorations realises par le(la) salarie(e) dans le cadre de ses fonctions et avec les moyens de l'entreprise sont la propriete exclusive de l'employeur (art. L. 611-7 et L. 113-9 du Code de la propriete intellectuelle).`,
    `Le(la) salarie(e) s'engage a informer l'employeur de toute creation ou invention et a cooperer pleinement a la protection et a l'enregistrement des droits de propriete intellectuelle.`
  ]);

  // ── Art: Egalite / Non-discrimination ────────────────────────────────────

  drawArticle(`${nextArt()} - EGALITE PROFESSIONNELLE ET NON-DISCRIMINATION`, [
    `L'entreprise s'engage a respecter les principes d'egalite de traitement entre tous les salaries, sans discrimination fondee sur l'origine, le sexe, les moeurs, l'orientation sexuelle, l'age, la situation de famille, l'appartenance ou non-appartenance a une ethnie, une nation ou une race, les opinions politiques, les activites syndicales ou mutualistes, les convictions religieuses, l'apparence physique, le patronyme, l'etat de sante ou le handicap (art. L. 1132-1 du Code du travail).`,
    `Toute situation de harcelement moral ou sexuel est prohibee et susceptible de sanctions disciplinaires et penales (art. L. 1152-1 et L. 1153-1 du Code du travail).`
  ]);

  // ── Art: Litiges ──────────────────────────────────────────────────────────

  drawArticle(`${nextArt()} - REGLEMENT DES LITIGES`, [
    `Tout differend relatif a l'execution, l'interpretation ou la rupture du present contrat sera, en priorite, soumis a une tentative de conciliation amiable entre les parties.`,
    `A defaut d'accord amiable, le litige sera soumis a la competence exclusive du Conseil de Prud'hommes du ressort du lieu d'execution du contrat (${safe(data.companyCity)}), conformement aux articles L. 1411-1 et suivants du Code du travail.`,
    `Le droit francais est seul applicable au present contrat.`
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // ── SIGNATURES ───────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  needPage(180);
  y -= 10;

  // Signature section bar
  page.drawRectangle({ x: 0, y: y + 12, width: W, height: 18, color: accent });
  centreText(page, 'SIGNATURES DES PARTIES', 0, W, y + 16, 9, helvBold, white);
  y -= 16;

  // "Bon pour accord"
  centreText(page, 'Bon pour accord - Lu et approuve par les deux parties', 0, W, y, 8.5, timeIta, muted);
  y -= 18;

  // Dates / city
  const sigDate = `Fait a ${safe(data.companyCity)}, le ${fmtDate(new Date().toISOString())}`;
  centreText(page, sigDate, 0, W, y, 8.5, timeReg, ink);
  y -= 20;

  // Employer box
  const sigW  = (contentW - 20) / 2;
  const leftBoxX  = margin;
  const rightBoxX2 = margin + sigW + 20;

  // Left box — employer
  page.drawRectangle({ x: leftBoxX - 2, y: y - 110, width: sigW + 4, height: 118, color: lightGray, borderColor: accentMd, borderWidth: 0.5 });
  drawText(page, 'L\'EMPLOYEUR', leftBoxX + 2, y - 2, 9, helvBold, accent);
  drawText(page, safe(data.companyName), leftBoxX + 2, y - 14, 8.5, timeBold, ink, sigW - 6);
  drawText(page, safe(data.employerName), leftBoxX + 2, y - 26, 8.5, timeReg, ink, sigW - 6);
  drawText(page, safe(data.employerTitle), leftBoxX + 2, y - 38, 8, timeIta, muted, sigW - 6);

  const empSigY = y - 54;
  if (data.employerSignature) {
    const img = await embedBase64Image(pdfDoc, data.employerSignature);
    if (img) {
      const dims = img.scaleToFit(sigW - 10, 55);
      page.drawImage(img, { x: leftBoxX + 2, y: empSigY - dims.height, width: dims.width, height: dims.height });
    }
  } else {
    page.drawLine({ start: { x: leftBoxX + 2, y: empSigY }, end: { x: leftBoxX + sigW - 2, y: empSigY }, thickness: 0.5, color: muted });
    drawText(page, 'Signature et cachet de l\'entreprise', leftBoxX + 2, empSigY - 11, 7.5, timeIta, muted);
  }
  drawText(page, 'Lu et approuve', leftBoxX + 2, y - 104, 7.5, timeIta, muted);

  // Right box — employee
  page.drawRectangle({ x: rightBoxX2 - 2, y: y - 110, width: sigW + 4, height: 118, color: lightGray, borderColor: accentMd, borderWidth: 0.5 });
  drawText(page, 'LE(LA) SALARIE(E)', rightBoxX2 + 2, y - 2, 9, helvBold, accent);
  drawText(page, `${safe(data.employeeFirstName)} ${safe(data.employeeLastName)}`, rightBoxX2 + 2, y - 14, 8.5, timeBold, ink, sigW - 6);
  if (data.employeeEmail) drawText(page, safe(data.employeeEmail), rightBoxX2 + 2, y - 26, 8, timeReg, ink, sigW - 6);
  drawText(page, 'Je reconnais avoir recu un exemplaire du present contrat', rightBoxX2 + 2, y - 38, 7.5, timeIta, muted, sigW - 6);

  const salSigY = y - 54;
  if (data.employeeSignature) {
    const img = await embedBase64Image(pdfDoc, data.employeeSignature);
    if (img) {
      const dims = img.scaleToFit(sigW - 10, 55);
      page.drawImage(img, { x: rightBoxX2 + 2, y: salSigY - dims.height, width: dims.width, height: dims.height });
    }
  } else {
    page.drawLine({ start: { x: rightBoxX2 + 2, y: salSigY }, end: { x: rightBoxX2 + sigW - 2, y: salSigY }, thickness: 0.5, color: muted });
    drawText(page, 'Signature precedee de la mention "Lu et approuve"', rightBoxX2 + 2, salSigY - 11, 7.5, timeIta, muted);
  }
  drawText(page, 'Lu et approuve - Bon pour accord', rightBoxX2 + 2, y - 104, 7.5, timeIta, muted);

  y -= 130;

  // Legal notice footer block
  needPage(50);
  y -= 8;
  page.drawRectangle({ x: margin - 4, y: y - 32, width: contentW + 8, height: 38, color: accentLt, borderColor: accentMd, borderWidth: 0.3 });
  drawText(page, 'MENTIONS LEGALES OBLIGATOIRES', margin + 2, y - 2, 7.5, helvBold, accent);
  y = drawWrapped(page,
    `Ce contrat a ete etabli en deux (2) exemplaires originaux, dont un remis au salarie. La DPAE (Declaration Prealable a l'Embauche) doit etre effectuee aupres de l'URSSAF avant la prise de poste. Ce document est confidentiel.`,
    margin + 2, y - 13, contentW - 4, 7, timeReg, muted, 11, minY
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ── PAGE NUMBERS (post-render) ────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  drawPageNumbers();

  return pdfDoc.save();
}
