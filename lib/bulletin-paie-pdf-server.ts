/**
 * Server-side PDF generation for French State compliant payslips (bulletins de paie) — Version 3.0
 * Design ultra-aéré, professionnel, conforme
 * Couleur personnalisable, format 1 page A4, gestion d'erreurs robuste
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
  reductions: {
    total: number;
    lines: CotisationLine[];
  };
  salaireNet: number;
  salaireNetImposable: number;
  coutEmployer: number;
  reductionFillon: number;
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): RGB {
  try {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!r) return rgb(0.114, 0.62, 0.459);
    return rgb(
      Math.min(1, parseInt(r[1], 16) / 255),
      Math.min(1, parseInt(r[2], 16) / 255),
      Math.min(1, parseInt(r[3], 16) / 255)
    );
  } catch {
    return rgb(0.114, 0.62, 0.459);
  }
}

function mixRgb(c: RGB, alpha: number, bg: RGB = rgb(1, 1, 1)): RGB {
  return rgb(
    c.red * alpha + bg.red * (1 - alpha),
    c.green * alpha + bg.green * (1 - alpha),
    c.blue * alpha + bg.blue * (1 - alpha)
  );
}

// ── Safe text with better error handling ─────────────────────────────────────────

function safe(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/–/g, '-').replace(/—/g, '--')
    .replace(/[‘’]/g, "'").replace(/["""]"/g, '"')
    .replace(/…/g, '...').replace(/€/g, 'EUR')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

// ── Embed base64 image ───────────────────────────────────────────────────────────

async function embedBase64Image(pdfDoc: PDFDocument, base64: string): Promise<{ image: any; dims: { width: number; height: number } } | null> {
  try {
    if (!base64 || typeof base64 !== 'string') return null;
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
  } catch (error) {
    console.warn('Failed to embed signature image:', error);
    return null;
  }
}

// ── Drawing primitives ─────────────────────────────────────────────────────────

function drawText(
  page: PDFPage, text: string, x: number, y: number,
  size: number, font: PDFFont, color: RGB,
): void {
  try {
    const t = safe(text);
    if (!t) return;
    page.drawText(t, { x, y, size, font, color });
  } catch (error) {
    console.warn('Failed to draw text:', error);
  }
}

function rightText(
  page: PDFPage, text: string, rightEdge: number, y: number,
  size: number, font: PDFFont, color: RGB,
): void {
  try {
    const t = safe(text);
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: Math.max(0, rightEdge - w), y, size, font, color });
  } catch (error) {
    console.warn('Failed to draw right-aligned text:', error);
  }
}

function centreText(
  page: PDFPage, text: string, x: number, w: number, y: number,
  size: number, font: PDFFont, color: RGB,
): void {
  try {
    const t = safe(text);
    const tw = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: x + Math.max(0, (w - tw) / 2), y, size, font, color });
  } catch (error) {
    console.warn('Failed to draw centered text:', error);
  }
}

function formatMonnaie(montant: number): string {
  try {
    if (!isFinite(montant)) return '0.00 EUR';
    return montant.toFixed(2) + ' EUR';
  } catch {
    return '0.00 EUR';
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateStr);
  }
}

// ── Calculate cotisations (French 2026 rates) ─────────────────────────────────────

function calculerCotisations(data: BulletinPaieData): CotisationResult {
  const salaireBrut = Math.max(0, data.salaireBrut) || 0;
  const plafondSS = 3665; // PLAFOND SS 2026 mensuel
  const smicMensuelBrut = 1823.03; // SMIC 2026 mensuel brut (35h) - valeur officielle 2026

  // ── RÉDUCTION FILLON 2026 ────────────────────────────────────────────────────────
  // Réforme 2026 : Extension à 3 SMIC (contre 1.6 auparavant), nouveaux taux maximaux
  let reductionFillon = 0;
  const ratioSmic = salaireBrut / smicMensuelBrut;

  if (ratioSmic < 3.0) { // Nouveau plafond 2026 : 3 SMIC (au lieu de 1.6)
    // Formule 2026 : Coefficient = (T / 0.6) × [(1,6 × SMIC / salaire brut) - 1]
    // Taux maximum 2026 : 0.3956 (<50 salariés) ou 0.3996 (≥50 salariés)
    const T = 0.3956; // Taux maximum 2026 (par défaut <50 salariés)
    const coefficient = Math.max(0, (T / 0.6) * (1.6 * smicMensuelBrut / salaireBrut - 1));

    // La réduction s'applique sur les cotisations patronales suivantes :
    // - Maladie (13.15%)
    // - Vieillesse plafonnée (8.55%)
    // - Vieillesse déplafonnée (2.11% en 2026, contre 2.09% en 2025)
    // - Allocations familiales (3.45%)
    // - Accidents du travail (taux moyen 2%)
    // Total taux concerné : 29.26% (en hausse de 0.02% pour vieillesse déplafonnée)
    const tauxTotauxConernes = 0.1315 + 0.0855 + 0.0211 + 0.0345 + 0.02;
    reductionFillon = salaireBrut * coefficient * (tauxTotauxConernes / 0.2926);
  }

  // ── RÉDUCTION COTISATIONS RETRAITE (Bas salaires) ───────────────────────────────
  // Exonération des cotisations retraite de base pour les salaires ≤ 1.2 SMIC
  let reductionRetraiteBase = 0;
  if (ratioSmic <= 1.2) {
    // Exonération totale de la cotisation vieillesse déplafonnée patronale (2.11% en 2026)
    reductionRetraiteBase = salaireBrut * 0.0211;
  } else if (ratioSmic <= 1.3) {
    // Exonération dégressive entre 1.2 et 1.3 SMIC
    const decrementalRate = (1.3 - ratioSmic) / 0.1;
    reductionRetraiteBase = salaireBrut * 0.0211 * decrementalRate;
  }

  // ── COTISATIONS SALARIALES 2026 ─────────────────────────────────────────────────
  const salariales: CotisationLine[] = [
    { label: 'CSG/CRDS imposable', value: salaireBrut * 0.0240, taux: 2.40, base: salaireBrut * 0.9825 },
    { label: 'CSG/CRDS non imposable', value: salaireBrut * 0.0680, taux: 6.80, base: salaireBrut * 0.9825 },
    { label: 'Maladie', value: salaireBrut * 0.0700, taux: 7.00, base: salaireBrut },
    { label: 'Vieillesse déplafonnée', value: salaireBrut * 0.0023, taux: 0.23, base: salaireBrut }, // Taux 2026 inchangé
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

  // ── COTISATIONS PATRONALES 2026 ─────────────────────────────────────────────────
  const patronales: CotisationLine[] = [
    { label: 'Maladie', value: salaireBrut * 0.1315, taux: 13.15, base: salaireBrut },
    { label: 'Vieillesse déplafonnée', value: salaireBrut * 0.0211, taux: 2.11, base: salaireBrut }, // Taux 2026 : hausse à 2.11%
    { label: 'Vieillesse plafonnée', value: Math.min(salaireBrut, plafondSS) * 0.0855, taux: 8.55, base: Math.min(salaireBrut, plafondSS) },
    { label: 'Allocations familiales', value: salaireBrut * 0.0345, taux: 3.45, base: salaireBrut },
    { label: 'Accidents du travail', value: salaireBrut * 0.0200, taux: 2.00, base: salaireBrut },
    { label: 'FNAL', value: salaireBrut > plafondSS ? salaireBrut * 0.0010 : Math.min(salaireBrut, plafondSS) * 0.0050, taux: salaireBrut > plafondSS ? 0.10 : 0.50, base: salaireBrut },
  ];

  // ── RÉDUCTIONS PATRONALES (affichées comme lignes négatives) ────────────────────
  const reductions: CotisationLine[] = [];

  // Réduction Fillon 2026
  if (reductionFillon > 0) {
    reductions.push({
      label: 'Réduction Fillon 2026',
      value: -reductionFillon,
      taux: 'Fillon',
      base: salaireBrut
    });
  }

  // Réduction cotisations retraite (bas salaires)
  if (reductionRetraiteBase > 0) {
    reductions.push({
      label: 'Exonération retraite bas salaires',
      value: -reductionRetraiteBase,
      taux: 'Retraite',
      base: salaireBrut
    });
  }

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
  const totalReductions = reductions.reduce((sum, c) => sum + c.value, 0);

  // Calcul salaire net
  let salaireNet = salaireBrut - totalSalariales;

  // Deduction avantages en nature
  if (data.avantagesEnNature) {
    salaireNet -= data.avantagesEnNature;
  }

  const salaireNetImposable = salaireNet - (salaireBrut * 0.0240);
  const coutEmployer = salaireBrut + totalPatronales + totalReductions; // totalReductions est négatif

  return {
    salariales: { total: totalSalariales, lines: salariales },
    patronales: { total: totalPatronales, lines: patronales },
    reductions: { total: totalReductions, lines: reductions },
    salaireNet: Math.max(0, salaireNet),
    salaireNetImposable: Math.max(0, salaireNetImposable),
    coutEmployer,
    reductionFillon
  };
}

// ── Main PDF generator — Ultra-aéré, design professionnel ────────────────────────

export async function generatePayslipPdfBuffer(data: BulletinPaieData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();

    const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesReg = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    const accent = hexToRgb(data.accentColor || '#1D9E75');
    const ink = rgb(0.07, 0.07, 0.07);
    const muted = rgb(0.40, 0.43, 0.48);
    const lightBg = mixRgb(accent, 0.06);

    const W = 595.28, H = 841.89;
    const margin = 45;
    const contentW = W - margin * 2;
    const minY = 70;

    let page = pdfDoc.addPage([W, H]);
    let y = H - 55;

    const needPage = () => {
      if (y > minY) return;
      page = pdfDoc.addPage([W, H]);
      y = H - 55;
    };

    // Calculate cotisations
    const cotisations = calculerCotisations(data);

    // ═══════════════════════════════════════════════════════════════════════════
    // ── HEADER ────────────────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    // Title bar
    page.drawRectangle({ x: 0, y: H - 12, width: W, height: 12, color: accent });
    centreText(page, 'BULLETIN DE PAIE', 0, W, H - 30, 17, timesBold, ink);
    centreText(page, `${data.typeContrat.toUpperCase()} - ${data.statut.toUpperCase()}`, 0, W, H - 48, 9, helvReg, muted);
    y -= 70;

    // ═══════════════════════════════════════════════════════════════════════════
    // ── ENTETE: EMPLOYEUR ET SALARIÉ ────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    // Employee info (left)
    page.drawRectangle({ x: margin, y: y - 60, width: contentW / 2 - 12, height: 60, color: lightBg, borderColor: accent, borderWidth: 1 });
    drawText(page, 'SALARIE', margin + 6, y - 10, 8, helvBold, accent);
    drawText(page, `${data.prenom} ${data.nom}`, margin + 6, y - 24, 11, helvBold, ink);
    drawText(page, `${data.adresse}`, margin + 6, y - 38, 8, helvReg, muted);
    drawText(page, `${data.codePostal} ${data.ville}`, margin + 6, y - 50, 8, helvReg, muted);
    rightText(page, `NIR: ${safe(data.nir)}`, margin + contentW / 2 - 18, y - 24, 8, helvReg, muted);

    // Period info (right)
    const rightX = margin + contentW / 2 + 12;
    page.drawRectangle({ x: rightX, y: y - 60, width: contentW / 2 - 12, height: 60, color: lightBg, borderColor: accent, borderWidth: 1 });
    drawText(page, 'PERIODE', rightX + 6, y - 10, 8, helvBold, accent);
    drawText(page, `Du ${formatDate(data.periodeDebut)} au ${formatDate(data.periodeFin)}`, rightX + 6, y - 24, 8, helvReg, ink);
    drawText(page, `Date de paie: ${formatDate(new Date().toISOString())}`, rightX + 6, y - 38, 8, helvReg, ink);
    rightText(page, `Jours ouvrés: ${data.nombreJoursOuvres}`, W - margin, y - 24, 8, helvReg, muted);
    y -= 78;

    // Employer info
    page.drawRectangle({ x: margin, y: y - 55, width: contentW / 2 - 12, height: 55, color: mixRgb(accent, 0.04), borderColor: accent, borderWidth: 1 });
    drawText(page, 'EMPLOYEUR', margin + 6, y - 10, 8, helvBold, accent);
    drawText(page, safe(data.raisonSociale), margin + 6, y - 24, 11, helvBold, ink);
    drawText(page, `${data.adresseEntreprise}`, margin + 6, y - 38, 8, helvReg, muted);
    drawText(page, `${data.codePostalEntreprise} ${data.villeEntreprise}`, margin + 6, y - 50, 8, helvReg, muted);

    // Contract info (right)
    page.drawRectangle({ x: rightX, y: y - 55, width: contentW / 2 - 12, height: 55, color: mixRgb(accent, 0.04), borderColor: accent, borderWidth: 1 });
    drawText(page, 'CONTRAT', rightX + 6, y - 10, 8, helvBold, accent);
    drawText(page, `Statut: ${data.statut.toUpperCase()}`, rightX + 6, y - 24, 8, helvReg, ink);
    drawText(page, `Classification: ${safe(data.classification)}`, rightX + 6, y - 38, 8, helvReg, ink);
    drawText(page, `Coef: ${data.coef}`, rightX + 6, y - 50, 8, helvReg, ink);
    rightText(page, `CCN: ${safe(data.conventionCollective)}`, W - margin, y - 24, 8, helvReg, muted);
    y -= 78;

    // ═══════════════════════════════════════════════════════════════════════════
    // ── SECTION: REMUNERATION ───────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    needPage();
    page.drawRectangle({ x: margin, y: y - 16, width: contentW, height: 16, color: accent });
    drawText(page, 'ELEMENTS DE REMUNERATION', margin + 6, y - 11, 9, helvBold, rgb(1, 1, 1));
    y -= 24;

    // Table header
    const colX = { label: margin, base: margin + 130, taux: margin + 195, prelever: margin + 260, payer: margin + 320 };
    drawText(page, 'Libelle', colX.label, y, 8, helvBold, ink);
    drawText(page, 'Base', colX.base, y, 8, helvBold, ink);
    rightText(page, 'Taux', colX.taux + 25, y, 8, helvBold, ink);
    rightText(page, 'A prelever', colX.prelever + 25, y, 8, helvBold, ink);
    rightText(page, 'A payer', W - margin, y, 8, helvBold, ink);
    y -= 14;

    // Salaire de base
    drawText(page, 'Salaire de base', colX.label, y, 9, helvReg, ink);
    rightText(page, formatMonnaie(data.salaireBrut), colX.base, y, 9, helvReg, ink);
    rightText(page, formatMonnaie(data.salaireBrut), W - margin, y, 9, helvBold, rgb(0.114, 0.62, 0.459));
    y -= 14;

    // Heures supplementaires
    if (data.heuresSupplementaires && data.tauxHoraire) {
      const hsAmount = data.heuresSupplementaires * data.tauxHoraire * (1 + (data.majorationHeuresSup || 0) / 100);
      drawText(page, `Heures supplementaires (${data.heuresSupplementaires}h)`, colX.label, y, 9, helvReg, ink);
      rightText(page, formatMonnaie(hsAmount), colX.base, y, 9, helvReg, ink);
      rightText(page, formatMonnaie(hsAmount), W - margin, y, 9, helvBold, rgb(0.114, 0.62, 0.459));
      y -= 14;
    }

    // Avantages en nature
    if (data.avantagesEnNature) {
      drawText(page, 'Avantages en nature', colX.label, y, 9, helvReg, ink);
      rightText(page, formatMonnaie(data.avantagesEnNature), colX.base, y, 9, helvReg, ink);
      rightText(page, formatMonnaie(data.avantagesEnNature), colX.prelever + 25, y, 9, helvBold, rgb(0.82, 0.11, 0.11));
      y -= 14;
    }

    // Total brut line
    page.drawLine({ start: { x: margin, y: y + 6 }, end: { x: W - margin, y: y + 6 }, thickness: 1.5, color: accent });
    drawText(page, 'TOTAL BRUT', colX.label, y, 10, helvBold, ink);
    rightText(page, formatMonnaie(data.salaireBrut), W - margin, y, 10, helvBold, rgb(0.114, 0.62, 0.459));
    y -= 26;

    // ═══════════════════════════════════════════════════════════════════════════
    // ── SECTION: COTISATIONS SALARIALES ───────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    needPage();
    page.drawRectangle({ x: margin, y: y - 16, width: contentW, height: 16, color: accent });
    drawText(page, 'COTISATIONS SALARIALES', margin + 6, y - 11, 9, helvBold, rgb(1, 1, 1));
    y -= 24;

    // Table header
    drawText(page, 'Libelle', colX.label, y, 8, helvBold, ink);
    drawText(page, 'Base', colX.base, y, 8, helvBold, ink);
    rightText(page, 'Taux', colX.taux + 25, y, 8, helvBold, ink);
    rightText(page, 'Montant', W - margin, y, 8, helvBold, ink);
    y -= 14;

    for (const cotis of cotisations.salariales.lines) {
      drawText(page, cotis.label, colX.label, y, 8, helvReg, ink);
      rightText(page, formatMonnaie(cotis.base), colX.base, y, 8, helvReg, ink);
      const tauxStr = typeof cotis.taux === 'number' ? `${cotis.taux.toFixed(2)}%` : cotis.taux;
      rightText(page, tauxStr, colX.taux + 25, y, 8, helvReg, ink);
      rightText(page, formatMonnaie(cotis.value), W - margin, y, 8, helvReg, rgb(0.82, 0.11, 0.11));
      y -= 14;
    }

    // Total salariales
    page.drawLine({ start: { x: margin, y: y + 6 }, end: { x: W - margin, y: y + 6 }, thickness: 1.5, color: accent });
    drawText(page, 'TOTAL COTISATIONS SALARIALES', colX.label, y, 10, helvBold, ink);
    rightText(page, formatMonnaie(cotisations.salariales.total), W - margin, y, 10, helvBold, rgb(0.82, 0.11, 0.11));
    y -= 26;

    // ═══════════════════════════════════════════════════════════════════════════
    // ── SECTION: REDUCTIONS PATRONALES (2026) ────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    if (cotisations.reductions.lines.length > 0) {
      needPage();
      page.drawRectangle({ x: margin, y: y - 16, width: contentW, height: 16, color: mixRgb(accent, 0.3) });
      drawText(page, 'REDUCTIONS PATRONALES (2026)', margin + 6, y - 11, 9, helvBold, rgb(1, 1, 1));
      y -= 24;

      // Table header
      drawText(page, 'Libelle', colX.label, y, 8, helvBold, ink);
      drawText(page, 'Base', colX.base, y, 8, helvBold, ink);
      rightText(page, 'Taux', colX.taux + 25, y, 8, helvBold, ink);
      rightText(page, 'Montant', W - margin, y, 8, helvBold, ink);
      y -= 14;

      for (const reduction of cotisations.reductions.lines) {
        drawText(page, reduction.label, colX.label, y, 8, helvReg, ink);
        rightText(page, formatMonnaie(reduction.base), colX.base, y, 8, helvReg, ink);
        const tauxStr = typeof reduction.taux === 'number' ? `${reduction.taux.toFixed(2)}%` : reduction.taux;
        rightText(page, tauxStr, colX.taux + 25, y, 8, helvReg, ink);
        rightText(page, formatMonnaie(Math.abs(reduction.value)), W - margin, y, 8, helvReg, rgb(0.114, 0.62, 0.459));
        y -= 14;
      }

      // Total reductions
      page.drawLine({ start: { x: margin, y: y + 6 }, end: { x: W - margin, y: y + 6 }, thickness: 1.5, color: rgb(0.114, 0.62, 0.459) });
      drawText(page, 'TOTAL REDUCTIONS', colX.label, y, 10, helvBold, rgb(0.114, 0.62, 0.459));
      rightText(page, formatMonnaie(Math.abs(cotisations.reductions.total)), W - margin, y, 10, helvBold, rgb(0.114, 0.62, 0.459));
      y -= 26;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ── SECTION: NET A PAYER ─────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    needPage();
    const netBoxHeight = 70;
    page.drawRectangle({ x: margin, y: y - netBoxHeight, width: contentW, height: netBoxHeight, color: mixRgb(accent, 0.10), borderColor: accent, borderWidth: 1.5 });
    centreText(page, 'NET A PAYER', 0, W, y - 18, 13, timesBold, accent);
    centreText(page, formatMonnaie(cotisations.salaireNet), 0, W, y - 42, 26, timesBold, rgb(0.114, 0.62, 0.459));
    centreText(page, `Salaire net imposable: ${formatMonnaie(cotisations.salaireNetImposable)}`, 0, W, y - 62, 8, helvReg, rgb(1, 1, 1));
    y -= netBoxHeight + 20;

    // ═══════════════════════════════════════════════════════════════════════════
    // ── MENTIONS LEGALES ────────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    needPage();
    drawText(page, 'MENTIONS LEGALES', margin, y, 9, helvBold, ink);
    y -= 16;
    drawText(page, `Salaire net imposable: ${formatMonnaie(cotisations.salaireNetImposable)}`, margin, y, 8, helvReg, ink);
    y -= 12;
    drawText(page, `Coût employeur: ${formatMonnaie(cotisations.coutEmployer)}`, margin, y, 8, helvReg, ink);
    y -= 12;

    // Informations sur les réductions 2026
    if (cotisations.reductionFillon > 0) {
      drawText(page, `Réduction Fillon 2026: ${formatMonnaie(cotisations.reductionFillon)}`, margin, y, 8, helvReg, rgb(0.114, 0.62, 0.459));
      y -= 12;
    }

    drawText(page, 'Taux de cotisation 2026 - SMIC mensuel: 1 823,03 € (12,02€/h)', margin, y, 7, helvReg, muted);
    y -= 10;
    drawText(page, 'Article R3243-2 du Code du travail: Ce bulletin est remis en ligne sur support électronique.', margin, y, 7, timesItalic, muted);
    y -= 24;

    // ═══════════════════════════════════════════════════════════════════════════
    // ── SIGNATURES ───────────────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    needPage();
    const signatureY = y - 50;
    const leftX = margin;
    const signatureRightX = W - margin - 160;
    const signatureW = 160;

    drawText(page, 'SIGNATURES', leftX, y, 10, helvBold, accent);
    y -= 24;

    // Employer signature
    drawText(page, 'Employeur', leftX, y, 10, helvBold, ink);
    drawText(page, safe(data.raisonSociale), leftX, y - 14, 9, helvReg, ink);

    if (data.employerSignature) {
      const sigData = await embedBase64Image(pdfDoc, data.employerSignature);
      if (sigData) {
        page.drawImage(sigData.image, {
          x: leftX,
          y: signatureY - sigData.dims.height - 4,
          width: sigData.dims.width,
          height: sigData.dims.height,
        });
      } else {
        page.drawLine({ start: { x: leftX, y: signatureY }, end: { x: leftX + signatureW, y: signatureY }, thickness: 1, color: ink });
        drawText(page, 'Signature', leftX, signatureY - 10, 8, timesItalic, muted);
      }
    } else {
      page.drawLine({ start: { x: leftX, y: signatureY }, end: { x: leftX + signatureW, y: signatureY }, thickness: 1, color: ink });
      drawText(page, 'Signature', leftX, signatureY - 10, 8, timesItalic, muted);
    }

    // Employee signature
    drawText(page, 'Salarie', signatureRightX, y, 10, helvBold, ink);
    drawText(page, `${data.prenom} ${data.nom}`, signatureRightX, y - 14, 9, helvReg, ink);

    if (data.employeeSignature) {
      const sigData = await embedBase64Image(pdfDoc, data.employeeSignature);
      if (sigData) {
        page.drawImage(sigData.image, {
          x: signatureRightX,
          y: signatureY - sigData.dims.height - 4,
          width: sigData.dims.width,
          height: sigData.dims.height,
        });
      } else {
        page.drawLine({ start: { x: signatureRightX, y: signatureY }, end: { x: signatureRightX + signatureW, y: signatureY }, thickness: 1, color: ink });
        drawText(page, 'Signature', signatureRightX, signatureY - 10, 8, timesItalic, muted);
      }
    } else {
      page.drawLine({ start: { x: signatureRightX, y: signatureY }, end: { x: signatureRightX + signatureW, y: signatureY }, thickness: 1, color: ink });
      drawText(page, 'Signature', signatureRightX, signatureY - 10, 8, timesItalic, muted);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ── FOOTER ───────────────────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    const footerY = 45;
    page.drawLine({ start: { x: margin, y: footerY + 24 }, end: { x: W - margin, y: footerY + 24 }, thickness: 1.5, color: mixRgb(accent, 0.4) });
    centreText(page, `Bulletin généré le ${formatDate(new Date().toISOString())} - ${safe(data.raisonSociale)} - SIRET: ${safe(data.siret)}`, 0, W, footerY + 8, 7, timesReg, muted);

    return pdfDoc.save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}
