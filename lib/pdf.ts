import { Invoice, Profile } from '@/types';
import { prepareTemplateData, templateMinimaliste, templateClassique, templateModerne, templateElegant, templateCorporate, templateNature, applyCustomTemplate } from './templates';

export function getDocLabel(invoice: Invoice, language = 'fr'): string {
  const labels: Record<string, Record<string, string>> = {
    fr: { invoice: 'FACTURE', quote: 'DEVIS', credit_note: 'AVOIR', purchase_order: 'BON DE COMMANDE', delivery_note: 'BON DE LIVRAISON', deposit: 'FACTURE D\'ACOMPTE' },
    en: { invoice: 'INVOICE', quote: 'QUOTE', credit_note: 'CREDIT NOTE', purchase_order: 'PURCHASE ORDER', delivery_note: 'DELIVERY NOTE', deposit: 'DEPOSIT INVOICE' },
  };
  return (labels[language] || labels['fr'])[invoice.document_type] || 'FACTURE';
}

const WATERMARK_MAP: Record<string, { text: string; color: string }> = {
  overdue: { text: 'EN RETARD', color: 'rgba(220,38,38,0.07)' },
  refused: { text: 'ANNULÉ',    color: 'rgba(100,100,100,0.06)' },
  paid:    { text: 'PAYÉ',      color: 'rgba(16,185,129,0.07)' },
};

export function generateInvoiceHtml(invoice: Invoice, profile?: Profile | null): string {
  const p = profile || {} as Profile;

  const wm = WATERMARK_MAP[invoice.status];
  const watermarkHtml = wm ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:88px;font-weight:900;color:${wm.color};pointer-events:none;white-space:nowrap;z-index:0;letter-spacing:10px;user-select:none">${wm.text}</div>` : '';

  const data = prepareTemplateData(invoice, profile, watermarkHtml);

  if (p.custom_template_html) {
    return applyCustomTemplate(p.custom_template_html, data);
  }

  const templateId = p.template_id || 1;
  switch (templateId) {
    case 2: return templateClassique(data);
    case 3: return templateModerne(data);
    case 4: return templateElegant(data);
    case 5: return templateCorporate(data);
    case 6: return templateNature(data);
    default: return templateMinimaliste(data);
  }
}

/**
 * Generate a real PDF buffer using @react-pdf/renderer.
 * Same component used for email attachments → identical rendering.
 */
export async function generatePdfBuffer(invoice: Invoice, profile?: Profile | null): Promise<Uint8Array> {
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { PdfDocument } = await import('@/components/pdf-document');
  const element = React.createElement(PdfDocument, { invoice, profile: profile || {} as Profile });
  return renderToBuffer(element as any);
}

import React from 'react';

/**
 * Download PDF — generates a real PDF via @react-pdf/renderer and opens it.
 * Falls back to HTML+print if React-PDF fails (e.g. custom template).
 */
export async function downloadInvoicePdf(invoice: Invoice, profile?: Profile | null): Promise<void> {
  // Custom templates use the HTML path (React-PDF can't render arbitrary HTML)
  if (profile?.custom_template_html) {
    downloadHtmlPdf(invoice, profile);
    return;
  }

  try {
    const { pdf } = await import('@react-pdf/renderer');
    const { PdfDocument } = await import('@/components/pdf-document');
    const element = React.createElement(PdfDocument, { invoice, profile: profile || {} as Profile });
    const blob = await pdf(element as any).toBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch {
    // Fallback to HTML+print
    downloadHtmlPdf(invoice, profile);
  }
}

function downloadHtmlPdf(invoice: Invoice, profile?: Profile | null): void {
  const html = generateInvoiceHtml(invoice, profile);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.onload = () => { setTimeout(() => win.print(), 500); };
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
