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

  // Watermark
  const wm = WATERMARK_MAP[invoice.status];
  const watermarkHtml = wm ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:88px;font-weight:900;color:${wm.color};pointer-events:none;white-space:nowrap;z-index:0;letter-spacing:10px;user-select:none">${wm.text}</div>` : '';

  const data = prepareTemplateData(invoice, profile, watermarkHtml);

  // Custom template (Pro users)
  if (p.custom_template_html) {
    return applyCustomTemplate(p.custom_template_html, data);
  }

  // Built-in templates
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

export function downloadInvoicePdf(invoice: Invoice, profile?: Profile | null): void {
  const html = generateInvoiceHtml(invoice, profile);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.onload = () => { setTimeout(() => win.print(), 500); };
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
