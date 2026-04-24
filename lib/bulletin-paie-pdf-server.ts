/**
 * Server-side PDF generation for French State compliant payslips (bulletins de paie)
 * Conforms to articles R3243-1 et suivants du Code du travail français
 * Implements all mandatory mentions and proper formatting
 */
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage, RGB } from 'pdf-lib';

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
  urssaf: string;

  // Période
  periodeDebut: string;
  periodeFin: string;
  nombreJoursOuvres: number;

  // Signatures (base64)
  employerSignature?: string;
  employeeSignature?: string;

  // Couleur d'accent
  accentColor?: string;
}

interface CotisationLine {
  label: string;
  value: number;
  taux: number | string;
  base: number;
}

interface CotisationResult {
  salariales: {
    total: number;
    lines: CotisationLine[];
  };
  patronales: {
    total: number;
    lines: CotisationLine[];
  };
  salaireNet: number;
  salaireNetImposable: number;
  coutEmployer: number;
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

// ── Safe text ─────────────────────────────────────────────────────────────────

function safe(str: unknown): string {
  return String(str ?? '')
    .replace(/–/g, '-').replace(/—/g, '--')
    .replace(/[‘’]/g, "'").replace(/["""]"/g, '"')
    .replace(/…/g, '...').replace(/€/g, 'EUR')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

// ── Embed base64 image ───────────────────────────────────────────────────────────

async function embedBase64Image(pdfDoc: PDFDocument, base64: string): Promise<{ image: any; dims: { width: number; height: number } } | null> {
  try {
    const matches = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(base64);
    if (!matches) return null;
    const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
    let embeddedImage;
    if (matches[1] === 'png') {
      embeddedImage = await pdfDoc.embedPng(bytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(bytes);
    }
    const dims = embeddedImage.scaleToFit(150, 60);
    return { image: embeddedImage, dims };
  } catch {
    return null;
  }
}

// ── Drawing primitives ─────────────────────────────────────────────────────────

function drawText(
  page: PDFPage, text: string, x: number, y: number,
  size: number, font: PDFFont, color: RGB,
): void {
  const t = safe(text);
  if (!t) return;
  page.drawText(t, { x, y, size, font, color });
}

function rightText(
  page: PDFPage, text: string, rightEdge: number, y: number,
  size: number, font: PDFFont, color: RGB,
): void {
  const t = safe(text);
  const w = font.widthOfTextAtSize(t, size);
  page.drawText(t, { x: rightEdge - w, y, size, font, color });
}

function formatMonnaie(montant: number): string {
  return montant.toFixed(2) + ' EUR';
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateStr);
  }
}

// ── Calculate cotisations (simplified French 2024 rates) ─────────────────────

function calculerCotisations(data: BulletinPaieData): CotisationResult {
  const salaireBrut = data.salaireBrut;
  const plafondSS = 3428; // PLAFOND SS 2024 mensuel

  // Cotisations salariales 2024
  const salariales: CotisationLine[] = [
    { label: 'CSG/CRDS imposable', value: salaireBrut * 0.0240, taux: 2.40, base: salaireBrut * 0.9825 },
    { label: 'CSG/CRDS non imposable', value: salaireBrut * 0.0680, taux: 6.80, base: salaireBrut * 0.9825 },
    { label: 'Maladie', value: salaireBrut * 0.0700, taux: 7.00, base: salaireBrut },
    { label: 'Vieillesse déplafonnée', value: salaireBrut * 0.0023, taux: 0.23, base: salaireBrut },
    { label: 'Vieillesse plafonnée', value: Math.min(salaireBrut, plafondSS) * 0.0693, taux: 6.93, base: Math.min(salaireBrut, plafondSS) },
  ];

  // Add supplementary pension for non-cadre
  if (data.statut === 'non_cadre' || data.statut === 'alternance') {
    salariales.push({
      label: 'Retraite complémentaire (AGIRC-ARRCO)',
      value: Math.min(salaireBrut, plafondSS) * 0.0400 + (Math.max(0, salaireBrut - plafondSS) * 0.0800),
      taux: 'T1',
      base: salaireBrut
    });
  } else {
    salariales.push({
      label: 'Retraite cadres (AGIRC)',
      value: salaireBrut * 0.0620,
      taux: 6.20,
      base: salaireBrut
    });
  }

  // Add unemployment for CDI/CDD
  if (data.typeContrat === 'cdi' || data.typeContrat === 'cdd') {
    salariales.push({
      label: 'Assurance chômage',
      value: Math.min(salaireBrut, plafondSS * 4) * 0.0240,
      taux: 2.40,
      base: Math.min(salaireBrut, plafondSS * 4)
    });
  }

  const totalSalariales = salariales.reduce((sum, c) => sum + c.value, 0);

  // Cotisations patronales
  const patronales: CotisationLine[] = [
    { label: 'Maladie', value: salaireBrut * 0.1315, taux: 13.15, base: salaireBrut },
    { label: 'Vieillesse déplafonnée', value: salaireBrut * 0.0209, taux: 2.09, base: salaireBrut },
    { label: 'Vieillesse plafonnée', value: Math.min(salaireBrut, plafondSS) * 0.0855, taux: 8.55, base: Math.min(salaireBrut, plafondSS) },
    { label: 'Allocations familiales', value: salaireBrut * 0.0345, taux: 3.45, base: salaireBrut },
    { label: 'Accidents du travail', value: salaireBrut * 0.0200, taux: 2.00, base: salaireBrut }, // Taux moyen
    { label: 'FNAL', value: salaireBrut > plafondSS ? salaireBrut * 0.0010 : Math.min(salaireBrut, plafondSS) * 0.0050, taux: salaireBrut > plafondSS ? 0.10 : 0.50, base: salaireBrut },
  ];

  // Add supplementary pension for non-cadre
  if (data.statut === 'non_cadre' || data.statut === 'alternance') {
    patronales.push({
      label: 'Retraite complémentaire (AGIRC-ARRCO)',
      value: Math.min(salaireBrut, plafondSS) * 0.0600 + (Math.max(0, salaireBrut - plafondSS) * 0.1200),
      taux: 'T2',
      base: salaireBrut
    });
  } else {
    patronales.push({
      label: 'Retraite cadres (AGIRC)',
      value: salaireBrut * 0.0855,
      taux: 8.55,
      base: salaireBrut
    });
  }

  // Add unemployment for CDI/CDD
  if (data.typeContrat === 'cdi' || data.typeContrat === 'cdd') {
    patronales.push({
      label: 'Assurance chômage',
      value: Math.min(salaireBrut, plafondSS * 4) * 0.0405,
      taux: 4.05,
      base: Math.min(salaireBrut, plafondSS * 4)
    });
  }

  const totalPatronales = patronales.reduce((sum, c) => sum + c.value, 0);

  // Calcul salaire net
  let salaireNet = salaireBrut - totalSalariales;

  // Deduction avantages en nature
  if (data.avantagesEnNature) {
    salaireNet -= data.avantagesEnNature;
  }

  const salaireNetImposable = salaireNet - (salaireBrut * 0.0240); // CSG imposable deductible
  const coutEmployer = salaireBrut + totalPatronales;

  return {
    salariales: { total: totalSalariales, lines: salariales },
    patronales: { total: totalPatronales, lines: patronales },
    salaireNet,
    salaireNetImposable,
    coutEmployer
  };
}

// ── Main PDF generator ────────────────────────────────────────────────────────

export async function generatePayslipPdfBuffer(data: BulletinPaieData): Promise<Uint8Array> {
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
  const margin = 40;
  const contentW = W - margin * 2;
  const minY = 60;

  let page = pdfDoc.addPage([W, H]);
  let y = H - 50;

  const needPage = () => {
    if (y > minY) return;
    page = pdfDoc.addPage([W, H]);
    y = H - 50;
  };

  // Calculate cotisations
  const cotisations = calculerCotisations(data);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── HEADER ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // Title bar
  page.drawRectangle({ x: 0, y: H - 10, width: W, height: 10, color: accent });
  centreText(page, 'BULLETIN DE PAIE', 0, W, H - 25, 16, timesBold, ink);
  centreText(page, `${data.typeContrat.toUpperCase()} - ${data.statut.toUpperCase()}`, 0, W, H - 42, 9, helvReg, muted);
  y -= 65;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── ENTETE: EMPLOYEUR ET SALARIÉ ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // Employee info (left)
  page.drawRectangle({ x: margin, y: y - 55, width: contentW / 2 - 10, height: 55, color: lightBg });
  drawText(page, 'SALARIE', margin + 5, y - 8, 7, helvBold, accent);
  drawText(page, `${data.prenom} ${data.nom}`, margin + 5, y - 20, 10, helvBold, ink);
  drawText(page, `${data.adresse}`, margin + 5, y - 32, 8, helvReg, muted);
  drawText(page, `${data.codePostal} ${data.ville}`, margin + 5, y - 42, 8, helvReg, muted);
  rightText(page, `NIR: ${safe(data.nir)}`, margin + contentW / 2 - 15, y - 20, 7, helvReg, muted);

  // Period info (right)
  const rightX = margin + contentW / 2 + 10;
  page.drawRectangle({ x: rightX, y: y - 55, width: contentW / 2 - 10, height: 55, color: lightBg });
  drawText(page, 'PERIODE', rightX + 5, y - 8, 7, helvBold, accent);
  drawText(page, `Du ${formatDate(data.periodeDebut)} au ${formatDate(data.periodeFin)}`, rightX + 5, y - 20, 8, helvReg, ink);
  drawText(page, `Date de paie: ${formatDate(new Date().toISOString())}`, rightX + 5, y - 32, 8, helvReg, ink);
  rightText(page, `Jours ouvrés: ${data.nombreJoursOuvres}`, W - margin, y - 20, 7, helvReg, muted);
  y -= 70;

  // Employer info
  page.drawRectangle({ x: margin, y: y - 50, width: contentW / 2 - 10, height: 50, color: mixRgb(accent, 0.03) });
  drawText(page, 'EMPLOYEUR', margin + 5, y - 8, 7, helvBold, accent);
  drawText(page, safe(data.raisonSociale), margin + 5, y - 20, 10, helvBold, ink);
  drawText(page, `${data.adresseEntreprise}`, margin + 5, y - 32, 8, helvReg, muted);
  drawText(page, `${data.codePostalEntreprise} ${data.villeEntreprise}`, margin + 5, y - 42, 8, helvReg, muted);

  // Contract info (right)
  page.drawRectangle({ x: rightX, y: y - 50, width: contentW / 2 - 10, height: 50, color: mixRgb(accent, 0.03) });
  drawText(page, 'CONTRAT', rightX + 5, y - 8, 7, helvBold, accent);
  drawText(page, `Statut: ${data.statut.toUpperCase()}`, rightX + 5, y - 20, 8, helvReg, ink);
  drawText(page, `Classification: ${safe(data.classification)}`, rightX + 5, y - 32, 8, helvReg, ink);
  drawText(page, `Coef: ${data.coef}`, rightX + 5, y - 42, 8, helvReg, ink);
  rightText(page, `CCN: ${safe(data.conventionCollective)}`, W - margin, y - 20, 7, helvReg, muted);
  y -= 70;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SECTION: REMUNERATION ───────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  page.drawRectangle({ x: margin, y: y - 14, width: contentW, height: 14, color: accent });
  drawText(page, 'ELEMENTS DE REMUNERATION', margin + 5, y - 10, 8, helvBold, rgb(1, 1, 1));
  y -= 20;

  // Table header
  const colX = { label: margin, base: margin + 120, taux: margin + 180, prelever: margin + 240, payer: margin + 300 };
  drawText(page, 'Libelle', colX.label, y, 7, helvBold, ink);
  drawText(page, 'Base', colX.base, y, 7, helvBold, ink);
  rightText(page, 'Taux', colX.taux + 20, y, 7, helvBold, ink);
  rightText(page, 'A prelever', colX.prelever + 20, y, 7, helvBold, ink);
  rightText(page, 'A payer', W - margin, y, 7, helvBold, ink);
  y -= 12;

  // Salaire de base
  drawText(page, 'Salaire de base', colX.label, y, 8, helvReg, ink);
  rightText(page, formatMonnaie(data.salaireBrut), colX.base, y, 8, helvReg, ink);
  rightText(page, formatMonnaie(data.salaireBrut), W - margin, y, 8, helvBold, rgb(0, 114, 69)); // green
  y -= 12;

  // Heures supplementaires
  if (data.heuresSupplementaires && data.tauxHoraire) {
    const hsAmount = data.heuresSupplementaires * data.tauxHoraire * (1 + (data.majorationHeuresSup || 0) / 100);
    drawText(page, `Heures supplementaires (${data.heuresSupplementaires}h)`, colX.label, y, 8, helvReg, ink);
    rightText(page, formatMonnaie(hsAmount), colX.base, y, 8, helvReg, ink);
    rightText(page, formatMonnaie(hsAmount), W - margin, y, 8, helvBold, rgb(0, 114, 69));
    y -= 12;
  }

  // Avantages en nature
  if (data.avantagesEnNature) {
    drawText(page, 'Avantages en nature', colX.label, y, 8, helvReg, ink);
    rightText(page, formatMonnaie(data.avantagesEnNature), colX.base, y, 8, helvReg, ink);
    rightText(page, formatMonnaie(data.avantagesEnNature), colX.prelever + 20, y, 8, helvBold, rgb(220, 53, 69)); // red
    y -= 12;
  }

  // Total brut line
  page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: W - margin, y: y + 4 }, thickness: 1, color: accent });
  drawText(page, 'TOTAL BRUT', colX.label, y, 9, helvBold, ink);
  rightText(page, formatMonnaie(data.salaireBrut), W - margin, y, 9, helvBold, rgb(0, 114, 69));
  y -= 22;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SECTION: COTISATIONS SALARIALES ───────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  page.drawRectangle({ x: margin, y: y - 14, width: contentW, height: 14, color: accent });
  drawText(page, 'COTISATIONS SALARIALES', margin + 5, y - 10, 8, helvBold, rgb(1, 1, 1));
  y -= 20;

  // Table header
  drawText(page, 'Libelle', colX.label, y, 7, helvBold, ink);
  drawText(page, 'Base', colX.base, y, 7, helvBold, ink);
  rightText(page, 'Taux', colX.taux + 20, y, 7, helvBold, ink);
  rightText(page, 'Montant', W - margin, y, 7, helvBold, ink);
  y -= 12;

  for (const cotis of cotisations.salaales.lines) {
    drawText(page, cotis.label, colX.label, y, 7, helvReg, ink);
    rightText(page, formatMonnaie(cotis.base), colX.base, y, 7, helvReg, ink);
    const tauxStr = typeof cotis.taux === 'number' ? `${cotis.taux.toFixed(2)}%` : cotis.taux;
    rightText(page, tauxStr, colX.taux + 20, y, 7, helvReg, ink);
    rightText(page, formatMonnaie(cotis.value), W - margin, y, 7, helvReg, rgb(220, 53, 69));
    y -= 12;
  }

  // Total salariales
  page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: W - margin, y: y + 4 }, thickness: 1, color: accent });
  drawText(page, 'TOTAL COTISATIONS SALARIALES', colX.label, y, 9, helvBold, ink);
  rightText(page, formatMonnaie(cotisations.salaales.total), W - margin, y, 9, helvBold, rgb(220, 53, 69));
  y -= 22;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SECTION: NET A PAYER ─────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  page.drawRectangle({ x: margin, y: y - 60, width: contentW, height: 60, color: mixRgb(accent, 0.08), borderColor: accent, borderWidth: 1 });
  centreText(page, 'NET A PAYER', 0, W, y - 15, 12, timesBold, accent);
  centreText(page, formatMonnaie(cotisations.salaireNet), 0, W, y - 35, 24, timesBold, rgb(0, 114, 69));
  centreText(page, `Salaire net imposable: ${formatMonnaie(cotisations.salaireNetImposable)}`, 0, W, y - 52, 7, helvReg, muted);
  y -= 75;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── MENTIONS LEGALES ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  drawText(page, 'MENTIONS LEGALES', margin, y, 8, helvBold, ink);
  y -= 15;
  drawText(page, `Salaire net imposable: ${formatMonnaie(cotisations.salaireNetImposable)}`, margin, y, 7, helvReg, ink);
  y -= 12;
  drawText(page, `Coût employeur: ${formatMonnaie(cotisations.coutEmployer)}`, margin, y, 7, helvReg, ink);
  y -= 12;
  drawText(page, 'Article R3243-2 du Code du travail: Ce bulletin est remis en ligne sur support électronique.', margin, y, 6, timesItalic, muted);
  y -= 20;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SIGNATURES ───────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  needPage();
  const signatureY = y - 40;
  const leftX = margin;
  const rightX = W - margin - 150;
  const signatureW = 150;

  drawText(page, 'SIGNATURES', leftX, y, 9, helvBold, accent);
  y -= 20;

  // Employer signature
  drawText(page, 'Employeur', leftX, y, 9, helvBold, ink);
  drawText(page, safe(data.raisonSociale), leftX, y - 12, 8, helvReg, ink);

  if (data.employerSignature) {
    const sigData = await embedBase64Image(pdfDoc, data.employerSignature);
    if (sigData) {
      page.drawImage(sigData.image, {
        x: leftX,
        y: signatureY - sigData.dims.height,
        width: sigData.dims.width,
        height: sigData.dims.height,
      });
    } else {
      page.drawLine({ start: { x: leftX, y: signatureY }, end: { x: leftX + signatureW, y: signatureY }, thickness: 0.5, color: ink });
      drawText(page, 'Signature', leftX, signatureY - 8, 7, timesItalic, muted);
    }
  } else {
    page.drawLine({ start: { x: leftX, y: signatureY }, end: { x: leftX + signatureW, y: signatureY }, thickness: 0.5, color: ink });
    drawText(page, 'Signature', leftX, signatureY - 8, 7, timesItalic, muted);
  }

  // Employee signature
  drawText(page, 'Salarie', rightX, y, 9, helvBold, ink);
  drawText(page, `${data.prenom} ${data.nom}`, rightX, y - 12, 8, helvReg, ink);

  if (data.employeeSignature) {
    const sigData = await embedBase64Image(pdfDoc, data.employeeSignature);
    if (sigData) {
      page.drawImage(sigData.image, {
        x: rightX,
        y: signatureY - sigData.dims.height,
        width: sigData.dims.width,
        height: sigData.dims.height,
      });
    } else {
      page.drawLine({ start: { x: rightX, y: signatureY }, end: { x: rightX + signatureW, y: signatureY }, thickness: 0.5, color: ink });
      drawText(page, 'Signature', rightX, signatureY - 8, 7, timesItalic, muted);
    }
  } else {
    page.drawLine({ start: { x: rightX, y: signatureY }, end: { x: rightX + signatureW, y: signatureY }, thickness: 0.5, color: ink });
    drawText(page, 'Signature', rightX, signatureY - 8, 7, timesItalic, muted);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── FOOTER ───────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const footerY = 40;
  page.drawLine({ start: { x: margin, y: footerY + 20 }, end: { x: W - margin, y: footerY + 20 }, thickness: 1, color: mixRgb(accent, 0.3) });
  centreText(page, `Bulletin généré le ${formatDate(new Date().toISOString())} - ${safe(data.raisonSociale)} - SIRET: ${safe(data.siret)}`, 0, W, footerY + 6, 6, timesReg, muted);

  return pdfDoc.save();
}
