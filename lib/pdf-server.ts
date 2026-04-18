/**
 * Server-side PDF generation using pdf-lib.
 * Supports templates 1-6, logo embedding, payment links, and proper French character encoding.
 */
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage, RGB, PDFImage } from 'pdf-lib';

/** Fetch a remote image and embed it. Returns null on any error so callers can skip gracefully. */
async function fetchAndEmbedImage(pdfDoc: PDFDocument, url: string): Promise<PDFImage | null> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    if (isPng) return await pdfDoc.embedPng(bytes);
    return await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
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

// ── Safe text (WinAnsiEncoding — French accented chars ARE supported: e9=e8=e0=ea=eb=e7...) ──

function safe(str: unknown): string {
  return String(str ?? '')
    .replace(/\u2013/g, '-').replace(/\u2014/g, '--')
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...').replace(/\u20AC/g, 'EUR')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
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

function rightText(
  page: PDFPage, text: string, rightEdge: number, y: number,
  size: number, font: PDFFont, color: RGB,
): void {
  const t = safe(text);
  const w = font.widthOfTextAtSize(t, size);
  page.drawText(t, { x: rightEdge - w, y, size, font, color });
}

function centreText(
  page: PDFPage, text: string, x: number, w: number, y: number,
  size: number, font: PDFFont, color: RGB,
): void {
  const t = safe(text);
  const tw = font.widthOfTextAtSize(t, size);
  page.drawText(t, { x: x + (w - tw) / 2, y, size, font, color });
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

// ── Template style definitions ────────────────────────────────────────────────

type TemplateStyle = {
  useSerif: boolean;
  headerFull: boolean;
  headerBg: RGB;
  headerH: number;
  bodyBg: RGB;
  rowEven: RGB;
  rowOdd: RGB;
  thBg: RGB;
  thText: RGB;
  totalBg: RGB;
  totalValueColor: (accent: RGB) => RGB;
  dividerColor: RGB;
  sectionBoxBg: RGB;
};

function getStyle(templateId: number, accent: RGB): TemplateStyle {
  switch (templateId) {
    case 2:
      return {
        useSerif: true, headerFull: true,
        headerBg: rgb(0.102, 0.102, 0.18),
        headerH: 120,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(0.98, 0.98, 0.98),
        thBg: rgb(0.102, 0.102, 0.18), thText: rgb(0.9, 0.9, 0.9),
        totalBg: rgb(0.102, 0.102, 0.18),
        totalValueColor: () => rgb(1, 1, 1),
        dividerColor: rgb(0.8, 0.8, 0.85),
        sectionBoxBg: rgb(0.97, 0.97, 0.97),
      };
    case 3:
      return {
        useSerif: false, headerFull: true,
        headerBg: accent,
        headerH: 120,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(0.985, 0.985, 0.99),
        thBg: rgb(0.97, 0.97, 0.97), thText: accent,
        totalBg: accent,
        totalValueColor: () => rgb(1, 1, 1),
        dividerColor: rgb(0.91, 0.91, 0.93),
        sectionBoxBg: mixRgb(accent, 0.05),
      };
    case 4:
      return {
        useSerif: true, headerFull: false,
        headerBg: rgb(0.992, 0.976, 0.953),
        headerH: 8,
        bodyBg: rgb(0.992, 0.976, 0.953),
        rowEven: rgb(1, 0.99, 0.98), rowOdd: rgb(0.992, 0.973, 0.95),
        thBg: rgb(0.992, 0.976, 0.953), thText: accent,
        totalBg: rgb(0.102, 0.063, 0.012),
        totalValueColor: () => accent,
        dividerColor: mixRgb(accent, 0.25),
        sectionBoxBg: rgb(0.992, 0.973, 0.95),
      };
    case 5:
      return {
        useSerif: false, headerFull: true,
        headerBg: rgb(0.118, 0.161, 0.235),
        headerH: 120,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(0.973, 0.98, 0.992),
        thBg: rgb(0.118, 0.161, 0.235), thText: rgb(0.58, 0.635, 0.72),
        totalBg: rgb(0.118, 0.161, 0.235),
        totalValueColor: () => accent,
        dividerColor: rgb(0.886, 0.91, 0.941),
        sectionBoxBg: rgb(0.973, 0.98, 0.992),
      };
    case 6:
      return {
        useSerif: false, headerFull: true,
        headerBg: rgb(0.086, 0.388, 0.204),
        headerH: 120,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(0.941, 0.992, 0.957),
        thBg: rgb(0.941, 0.992, 0.957), thText: rgb(0.086, 0.502, 0.29),
        totalBg: rgb(0.086, 0.388, 0.204),
        totalValueColor: () => rgb(1, 1, 1),
        dividerColor: rgb(0.733, 0.973, 0.816),
        sectionBoxBg: rgb(0.941, 0.992, 0.957),
      };
    default:
      return {
        useSerif: false, headerFull: false,
        headerBg: accent,
        headerH: 6,
        bodyBg: rgb(1, 1, 1),
        rowEven: rgb(1, 1, 1), rowOdd: rgb(0.98, 0.98, 0.99),
        thBg: rgb(0.96, 0.96, 0.97), thText: rgb(0.42, 0.45, 0.5),
        totalBg: rgb(0.067, 0.067, 0.067),
        totalValueColor: () => accent,
        dividerColor: rgb(0.91, 0.91, 0.93),
        sectionBoxBg: rgb(0.973, 0.973, 0.98),
      };
  }
}

// ── Main PDF generator ────────────────────────────────────────────────────────

export async function generateInvoicePdfBuffer(invoice: any, profile: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesReg = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const templateId: number = Number(profile?.template_id ?? 1);
  const accentHex: string = profile?.accent_color || '#1D9E75';
  const accent = hexToRgb(accentHex);
  const style = getStyle(templateId, accent);

  const bold = style.useSerif ? timesBold : helvBold;
  const reg = style.useSerif ? timesReg : helvReg;

  const ink = rgb(0.07, 0.07, 0.07);
  const muted = rgb(0.42, 0.45, 0.50);
  const subtle = style.dividerColor;
  const white = rgb(1, 1, 1);

  const currency = profile?.currency || 'EUR';
  const locale = profile?.language === 'en' ? 'en-GB' : 'fr-FR';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n ?? 0).replace(/\u202F/g, ' ');
  const fmtDate = (s: string) => {
    try {
      const d = new Date(s);
      const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return String(s); }
  };

  const DOC_LABELS: Record<string, string> = {
    invoice: 'FACTURE', quote: 'DEVIS', credit_note: 'AVOIR',
    purchase_order: 'BON DE COMMANDE', delivery_note: 'BON DE LIVRAISON',
    deposit: "FACTURE D'ACOMPTE",
  };
  const docLabel = DOC_LABELS[invoice.document_type] || 'FACTURE';
  const senderName = safe(profile?.company_name || 'Mon Entreprise');
  const clientName = safe(invoice.client?.name || invoice.client_name_override || 'Client');
  const items: any[] = invoice.items || [];

  const logoImage = profile?.logo_url ? await fetchAndEmbedImage(pdfDoc, profile.logo_url) : null;

  const W = 595.28, H = 841.89;
  const margin = 44;
  const contentW = W - margin * 2;
  const minY = 70;

  let page = pdfDoc.addPage([W, H]);
  let y = H;

  const needPage = () => {
    if (y > minY) return;
    page = pdfDoc.addPage([W, H]);
    if (style.bodyBg.red < 0.99) {
      page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: style.bodyBg });
    }
    y = H - 40;
  };

  // Body background
  if (style.bodyBg.red < 0.99) {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: style.bodyBg });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── HEADER + LOGO ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (style.headerFull) {
    // Full coloured header band — TALLER to fit the logo inside
    page.drawRectangle({ x: 0, y: H - style.headerH, width: W, height: style.headerH, color: style.headerBg });

    // ── Logo inside the header (top-left, BIG) ──
    if (logoImage) {
      const maxLogoH = 70;
      const maxLogoW = 220;
      const dims = logoImage.scaleToFit(maxLogoW, maxLogoH);
      page.drawImage(logoImage, {
        x: margin,
        y: H - 16 - dims.height,
        width: dims.width,
        height: dims.height,
      });
    }

    // Doc label — right side
    rightText(page, docLabel, W - margin, H - 28, 9, bold, rgb(0.85, 0.85, 0.88));

    // Dates — right side, below doc label
    rightText(page, `Emis le ${fmtDate(invoice.issue_date)}`, W - margin, H - 46, 8.5, reg, rgb(0.78, 0.78, 0.82));
    if (invoice.due_date) {
      rightText(page, `Echeance : ${fmtDate(invoice.due_date)}`, W - margin, H - 60, 8.5, bold, rgb(0.85, 0.85, 0.88));
    }

    // Company name below logo area (inside header, bottom-left)
    if (!logoImage) {
      drawText(page, senderName, margin, H - 50, 14, bold, white);
    }
    if (profile?.siret) {
      drawText(page, `SIRET : ${safe(profile.siret)}`, margin, H - style.headerH + 12, 7, reg, rgb(0.6, 0.6, 0.65));
    }

    y = H - style.headerH - 20;

  } else {
    // Thin accent bar (templates 1, 4)
    page.drawRectangle({ x: 0, y: H - style.headerH, width: W, height: style.headerH, color: accent });
    y = H - style.headerH - 10;

    // ── Logo below thin bar, top-left, BIG ──
    if (logoImage) {
      const maxLogoH = 80;
      const maxLogoW = 240;
      const dims = logoImage.scaleToFit(maxLogoW, maxLogoH);
      page.drawImage(logoImage, {
        x: margin,
        y: y - dims.height,
        width: dims.width,
        height: dims.height,
      });
      y -= dims.height + 14;
    }

    // Doc label + dates — right side
    const infoX = W - margin;
    drawText(page, safe(docLabel), infoX - 150, y + 50, 10, bold, accent);
    const dateStr = fmtDate(invoice.issue_date);
    drawText(page, `Emis le ${dateStr}`, infoX - 150, y + 34, 8.5, reg, muted);
    if (invoice.due_date) {
      drawText(page, `Echeance : ${fmtDate(invoice.due_date)}`, infoX - 150, y + 18, 8.5, bold, accent);
    }

    // Company name if no logo
    if (!logoImage) {
      drawText(page, senderName, margin, y, 18, bold, ink);
      y -= 24;
    }

    y -= 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SENDER + CLIENT INFO ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const halfX = W / 2 + 10;
  let ly = y;
  let ry = y;

  // Sender (left)
  drawText(page, senderName, margin, ly, 10, bold, ink, halfX - margin - 16);
  ly -= 13;
  if (profile?.address) { drawText(page, safe(profile.address), margin, ly, 8.5, reg, muted, halfX - margin - 16); ly -= 12; }
  if (profile?.postal_code || profile?.city) {
    drawText(page, safe([profile.postal_code, profile.city].filter(Boolean).join(' ')), margin, ly, 8.5, reg, muted); ly -= 12;
  }
  if (profile?.phone) { drawText(page, safe(profile.phone), margin, ly, 8.5, reg, muted); ly -= 12; }
  if (profile?.email) { drawText(page, safe(profile.email), margin, ly, 8.5, reg, muted); ly -= 12; }

  // Client (right)
  const client = invoice.client;
  const clientBoxX = halfX;
  const clientBoxW = W - margin - halfX;

  // Calculate dynamic box height based on actual content
  let clientFieldCount = 0;
  if (client?.address) clientFieldCount++;
  if (client?.postal_code || client?.city) clientFieldCount++;
  if (client?.email) clientFieldCount++;
  if (client?.siret) clientFieldCount++;
  if (client?.phone) clientFieldCount++;
  const clientBoxH = 40 + clientFieldCount * 12;

  // Client card background — adapts to content, uses template colors
  page.drawRectangle({ x: clientBoxX - 8, y: ry - clientBoxH + 4, width: clientBoxW + 16, height: clientBoxH, color: style.sectionBoxBg, borderColor: style.dividerColor, borderWidth: 0.5 });
  // Accent bar on left of client card
  page.drawRectangle({ x: clientBoxX - 8, y: ry - clientBoxH + 4, width: 3, height: clientBoxH, color: accent });

  drawText(page, 'FACTURER A', clientBoxX, ry - 4, 7, bold, accent);
  drawText(page, clientName, clientBoxX, ry - 18, 10, bold, ink, clientBoxW);
  ry -= 28;
  if (client?.address) { drawText(page, safe(client.address), clientBoxX, ry, 8.5, reg, muted, clientBoxW); ry -= 12; }
  if (client?.postal_code || client?.city) {
    drawText(page, safe([client.postal_code, client.city].filter(Boolean).join(' ')), clientBoxX, ry, 8.5, reg, muted); ry -= 12;
  }
  if (client?.email) { drawText(page, safe(client.email), clientBoxX, ry, 8.5, reg, muted, clientBoxW); ry -= 12; }
  if (client?.siret) { drawText(page, `SIRET : ${safe(client.siret)}`, clientBoxX, ry, 7.5, reg, muted); ry -= 12; }
  if (client?.phone) { drawText(page, safe(client.phone), clientBoxX, ry, 8.5, reg, muted); ry -= 12; }

  y = Math.min(ly, ry) - 16;

  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.5, color: subtle });
  y -= 20;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── TABLE ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const col = {
    desc: margin,
    qty: margin + contentW * 0.54,
    price: margin + contentW * 0.66,
    vat: margin + contentW * 0.79,
    total: margin + contentW * 0.90,
  };
  const rightEdge = W - margin;

  // Table header
  const thH = 24;
  page.drawRectangle({ x: margin, y: y - thH + 6, width: contentW, height: thH, color: style.thBg });
  const thY = y - 10;
  drawText(page, 'PRESTATION / DESCRIPTION', col.desc + 8, thY, 7, bold, style.thText);
  drawText(page, 'QTE', col.qty, thY, 7, bold, style.thText);
  drawText(page, 'P.U. HT', col.price, thY, 7, bold, style.thText);
  drawText(page, 'TVA', col.vat, thY, 7, bold, style.thText);
  rightText(page, 'TOTAL HT', rightEdge - 8, thY, 7, bold, style.thText);
  y -= thH;

  // Item rows
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowH = 26;

    needPage();

    const rowBg = i % 2 === 0 ? style.rowEven : style.rowOdd;
    if (rowBg.red < 0.99 || rowBg.green < 0.99 || rowBg.blue < 0.99) {
      page.drawRectangle({ x: margin, y: y - rowH + 6, width: contentW, height: rowH, color: rowBg });
    }

    const tdY = y - 12;
    const descW = col.qty - col.desc - 14;
    drawText(page, safe(item.description || ''), col.desc + 8, tdY, 9, reg, ink, descW);
    drawText(page, String(item.quantity ?? 1), col.qty, tdY, 9, reg, muted);
    drawText(page, fmt(item.unit_price ?? 0), col.price, tdY, 9, reg, muted);
    drawText(page, `${item.vat_rate ?? 0}%`, col.vat, tdY, 9, reg, muted);
    rightText(page, fmt(item.total ?? (item.quantity ?? 1) * (item.unit_price ?? 0)), rightEdge - 8, tdY, 9, bold, ink);

    y -= rowH;
  }

  y -= 4;
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.5, color: subtle });
  y -= 20;

  // ═══════════════════════════════════════════════════════════════════════════
  // ── TOTALS ───────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const totW = 210;
  const totX = W - margin - totW;
  const totRight = W - margin;

  const totRow = (label: string, value: string, isFinal = false) => {
    needPage();
    if (isFinal) {
      const boxH = 38;
      page.drawRectangle({ x: totX - 12, y: y - boxH + 8, width: totW + 12, height: boxH, color: style.totalBg });
      drawText(page, label, totX - 4, y - 8, 9, bold, rgb(0.85, 0.85, 0.88));
      rightText(page, value, totRight, y - 10, 16, bold, style.totalValueColor(accent));
      y -= boxH + 6;
    } else {
      drawText(page, label, totX, y, 8.5, reg, muted);
      rightText(page, value, totRight, y, 8.5, bold, ink);
      y -= 15;
    }
  };

  totRow('Sous-total HT', fmt(invoice.subtotal ?? 0));
  totRow('TVA', fmt(invoice.vat_amount ?? 0));
  if ((invoice.discount_amount ?? 0) > 0) {
    totRow(`Remise (${invoice.discount_percent ?? 0}%)`, `-${fmt(invoice.discount_amount)}`);
  }
  y -= 4;
  totRow('TOTAL TTC', fmt(invoice.total ?? 0), true);

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PAYMENT LINK ─────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const paymentUrl = invoice.stripe_payment_url || invoice.payment_link || '';
  if (paymentUrl) {
    needPage();
    y -= 8;

    const boxH = 48;
    page.drawRectangle({ x: margin, y: y - boxH + 8, width: contentW, height: boxH, color: mixRgb(accent, 0.08), borderColor: mixRgb(accent, 0.25), borderWidth: 0.5 });

    const method = invoice.stripe_payment_url ? 'PAIEMENT EN LIGNE (STRIPE)' : 'PAIEMENT EN LIGNE (SUMUP)';
    drawText(page, method, margin + 14, y - 8, 7, bold, accent);

    const btnLabel = `Payer ${fmt(invoice.total ?? 0)} en ligne`;
    centreText(page, btnLabel, margin, contentW, y - 22, 10, bold, accent);

    const urlText = safe(paymentUrl).slice(0, 80);
    centreText(page, urlText, margin, contentW, y - 35, 6.5, reg, muted);

    y -= boxH + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── NOTES ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (invoice.notes) {
    needPage();
    y -= 8;
    // Box background
    const notesH = 30;
    page.drawRectangle({ x: margin, y: y - notesH, width: contentW, height: notesH + 14, color: style.sectionBoxBg });
    drawText(page, 'Notes', margin + 10, y, 8, bold, ink);
    y -= 13;
    y = drawWrapped(page, safe(invoice.notes), margin + 10, y, contentW - 20, 8.5, reg, muted, 13, minY);
    y -= 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── BANK INFO ────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if ((profile?.iban || profile?.bank_name) && (invoice.document_type === 'invoice' || invoice.document_type === 'deposit') && y > minY + 50) {
    needPage();
    y -= 8;
    // Calculate dynamic bank box height based on content
    let bankFieldCount = 0;
    if (profile.bank_name) bankFieldCount++;
    if (profile.iban) bankFieldCount++;
    if (profile.bic) bankFieldCount++;
    const bankBoxH = 20 + bankFieldCount * 12;
    page.drawRectangle({ x: margin, y: y - bankBoxH, width: contentW, height: bankBoxH, color: style.sectionBoxBg, borderColor: style.dividerColor, borderWidth: 0.5 });
    page.drawRectangle({ x: margin, y: y - bankBoxH, width: 3, height: bankBoxH, color: accent });

    drawText(page, 'COORDONNEES BANCAIRES', margin + 12, y - 6, 7, bold, accent);
    let by = y - 20;
    if (profile.bank_name) { drawText(page, `Banque : ${safe(profile.bank_name)}`, margin + 12, by, 8.5, reg, ink); by -= 12; }
    if (profile.iban) { drawText(page, `IBAN : ${safe(profile.iban)}`, margin + 12, by, 8.5, reg, ink); by -= 12; }
    if (profile.bic) { drawText(page, `BIC : ${safe(profile.bic)}`, margin + 12, by, 8.5, reg, ink); }
    y -= bankBoxH + 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── PAYMENT TERMS ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  {
    // Build proper payment terms text — handle numeric values like "30"
    const rawTerms = (profile?.payment_terms || '').trim();
    let termsText = '';
    if (/^\d+$/.test(rawTerms)) {
      // Numeric value like "30" → full formatted sentence
      termsText = `Paiement sous ${rawTerms} jours a reception de la presente facture. En cas de retard de paiement, une indemnite forfaitaire pour frais de recouvrement de 40 euros sera appliquee, conformement a l'article L.441-6 du Code de commerce. Les penalites de retard sont calculees sur la base de trois fois le taux d'interet legal en vigueur. Tout litige relatif a la presente facture sera soumis a la competence exclusive du Tribunal de Commerce du siege social du prestataire. L'acceptation de la presente facture vaut accord sur les conditions generales de vente.`;
    } else if (rawTerms) {
      termsText = rawTerms;
    }
    if (!termsText) {
      termsText = "Paiement a reception de la presente facture. En cas de retard de paiement, une indemnite forfaitaire pour frais de recouvrement de 40 euros sera appliquee, conformement a l'article L.441-6 du Code de commerce. Les penalites de retard sont calculees sur la base de trois fois le taux d'interet legal en vigueur. Tout litige relatif a la presente facture sera soumis a la competence exclusive du Tribunal de Commerce du siege social du prestataire. L'acceptation de la presente facture vaut accord sur les conditions generales de vente.";
    }
    if (termsText && y > minY + 40) {
      needPage();
      y -= 8;
      page.drawRectangle({ x: margin, y: y - 16, width: contentW, height: 16, color: style.sectionBoxBg });
      drawText(page, 'CONDITIONS DE PAIEMENT', margin + 8, y - 4, 7, bold, accent);
      y -= 20;
      y = drawWrapped(page, safe(termsText), margin + 8, y, contentW - 16, 8, reg, muted, 12, minY);
      y -= 8;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── LEGAL MENTION ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  {
    const defaultLegalParts: string[] = [];
    if (profile?.siret) defaultLegalParts.push(`SIRET : ${safe(profile.siret)}`);
    if (profile?.vat_number) defaultLegalParts.push(`TVA : ${safe(profile.vat_number)}`);
    if (profile?.legal_status === 'auto-entrepreneur') { defaultLegalParts.push("Dispense d'immatriculation au RCS et au RM"); defaultLegalParts.push('TVA non applicable, art. 293 B du CGI'); }
    if (invoice.document_type === 'invoice' || invoice.document_type === 'deposit') defaultLegalParts.push('Penalites de retard : 3x taux legal - Indemnite forfaitaire pour frais de recouvrement : 40 EUR (art. L.441-6 c. com.)');
    defaultLegalParts.push("Conformement a l'article L.441-9 du Code de commerce, la facture est emise en double exemplaire.");
    const legalText = profile?.legal_mention || defaultLegalParts.join(' - ');
    if (legalText && y > minY + 30) {
      needPage();
      y -= 4;
      y = drawWrapped(page, safe(legalText), margin, y, contentW, 7, reg, muted, 10, minY);
      y -= 6;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── FOOTER — Invoice number + company info ───────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const footerY = 30;

  // Accent line
  page.drawLine({ start: { x: margin, y: footerY + 34 }, end: { x: W - margin, y: footerY + 34 }, thickness: 1.5, color: mixRgb(accent, 0.35) });

  // Invoice number — BIG and centered at bottom
  centreText(page, safe(invoice.number), 0, W, footerY + 18, 13, bold, ink);

  // Company info footer
  const parts: string[] = [senderName];
  if (profile?.siret) parts.push(`SIRET : ${safe(profile.siret)}`);
  if (profile?.legal_status === 'auto-entrepreneur') parts.push('TVA non applicable, art. 293 B du CGI');
  const footerStr = parts.join('  |  ');
  centreText(page, footerStr, 0, W, footerY + 4, 6.5, reg, muted);

  return pdfDoc.save();
}
