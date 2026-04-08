import { Invoice, Profile } from '@/types';

const fmt = (n: number, currency = 'EUR', locale = 'fr-FR') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
const fmtDate = (s: string, locale = 'fr-FR') =>
  new Date(s).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

export function getDocLabel(invoice: Invoice, language = 'fr'): string {
  const labels: Record<string, Record<string, string>> = {
    fr: { invoice: 'FACTURE', quote: 'DEVIS', credit_note: 'AVOIR', purchase_order: 'BON DE COMMANDE', delivery_note: 'BON DE LIVRAISON', deposit: 'FACTURE D\'ACOMPTE' },
    en: { invoice: 'INVOICE', quote: 'QUOTE', credit_note: 'CREDIT NOTE', purchase_order: 'PURCHASE ORDER', delivery_note: 'DELIVERY NOTE', deposit: 'DEPOSIT INVOICE' },
  };
  return (labels[language] || labels['fr'])[invoice.document_type] || 'FACTURE';
}

const WATERMARK_MAP: Record<string, { text: string; color: string }> = {
  draft:   { text: 'BROUILLON', color: 'rgba(100,100,100,0.06)' },
  overdue: { text: 'EN RETARD', color: 'rgba(220,38,38,0.07)' },
  refused: { text: 'ANNULÉ',    color: 'rgba(100,100,100,0.06)' },
  paid:    { text: 'PAYÉ',      color: 'rgba(16,185,129,0.07)' },
};

function getLabels(invoice: Invoice) {
  switch (invoice.document_type) {
    case 'quote': return { issuedLabel: 'Établi le', dueDateSection: invoice.due_date ? `Valable jusqu'au ${fmtDate(invoice.due_date)}` : 'Valable 30 jours', billedToLabel: 'Adressé à', totalLabel: "Montant de l'offre TTC", showSignature: true };
    case 'credit_note': return { issuedLabel: 'Émis le', dueDateSection: '', billedToLabel: 'Crédité à', totalLabel: 'Montant du crédit TTC', showSignature: false };
    case 'deposit': return { issuedLabel: 'Émise le', dueDateSection: invoice.due_date ? `Échéance : ${fmtDate(invoice.due_date)}` : '', billedToLabel: 'Facturé à', totalLabel: 'Acompte TTC', showSignature: false };
    default: return { issuedLabel: 'Émise le', dueDateSection: invoice.due_date ? `Échéance : ${fmtDate(invoice.due_date)}` : '', billedToLabel: 'Facturé à', totalLabel: 'Total TTC', showSignature: false };
  }
}

function legalMention(profile: Profile, docType: string) {
  const parts: string[] = [];
  if (profile.siret) parts.push(`SIRET : ${profile.siret}`);
  if (profile.legal_status === 'auto-entrepreneur') { parts.push("Dispensé d'immatriculation au RCS"); parts.push('TVA non applicable, art. 293 B du CGI'); }
  if (docType === 'invoice' || docType === 'deposit') parts.push('Pénalités de retard : 3× taux légal — Indemnité forfaitaire : 40€');
  return parts.join(' • ');
}

export function generateInvoiceHtml(invoice: Invoice, profile?: Profile | null): string {
  const p = profile || {} as Profile;
  const accent = p.accent_color || '#1D9E75';
  const currency = p.currency || 'EUR';
  const locale = p.language === 'en' ? 'en-GB' : 'fr-FR';
  const f = (n: number) => fmt(n, currency, locale);
  const fd = (s: string) => fmtDate(s, locale);
  const clientName = invoice.client?.name || invoice.client_name_override || 'Client';
  const clientAddr = invoice.client ? [invoice.client.address, `${invoice.client.postal_code || ''} ${invoice.client.city || ''}`.trim(), invoice.client.country !== 'France' ? invoice.client.country : ''].filter(Boolean).join('<br/>') : '';
  const labels = getLabels(invoice);
  const logoHtml = p.logo_url ? `<img src="${p.logo_url}" style="height:56px;max-width:160px;object-fit:contain;display:block;margin-bottom:10px" onerror="this.style.display='none'" crossorigin="anonymous"/>` : '';
  const legal = p.siret || p.legal_status ? legalMention(p as Profile, invoice.document_type) : '';
  const bankBlock = ((invoice.document_type === 'invoice' || invoice.document_type === 'deposit') && (p.iban || p.bank_name)) ? `<div style="margin-bottom:20px;padding:16px 20px;background:#f0fdf4;border-radius:10px;border-left:3px solid ${accent}"><div style="font-size:9px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Coordonnées bancaires</div><div style="font-size:12px;color:#374151;line-height:1.9">${p.bank_name ? `<div><strong>Banque :</strong> ${p.bank_name}</div>` : ''}${p.iban ? `<div><strong>IBAN :</strong> ${p.iban}</div>` : ''}${p.bic ? `<div><strong>BIC :</strong> ${p.bic}</div>` : ''}</div></div>` : '';

  // Watermark
  const wm = WATERMARK_MAP[invoice.status];
  const watermarkHtml = wm ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:88px;font-weight:900;color:${wm.color};pointer-events:none;white-space:nowrap;z-index:0;letter-spacing:10px;user-select:none">${wm.text}</div>` : '';

  // QR code for payment
  const qrBlock = invoice.stripe_payment_url
    ? `<div style="display:inline-block;margin-left:16px;vertical-align:middle;text-align:center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(invoice.stripe_payment_url)}" width="72" height="72" style="display:block;border-radius:6px;border:1px solid #e5e7eb"/><div style="font-size:9px;color:#9ca3af;margin-top:4px">Scanner pour payer</div></div>`
    : '';

  const rows = invoice.items.map((item, i) => `<tr style="background:${i%2===0?'#fff':'#fafafa'}"><td style="padding:12px 16px;font-size:13px;border-bottom:1px solid #f0f0f0">${item.description}</td><td style="padding:12px 8px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #f0f0f0">${item.quantity}</td><td style="padding:12px 8px;text-align:right;font-size:13px;color:#374151;border-bottom:1px solid #f0f0f0">${f(item.unit_price)}</td><td style="padding:12px 8px;text-align:center;border-bottom:1px solid #f0f0f0"><span style="background:${accent}15;color:${accent};font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">${item.vat_rate}%</span></td><td style="padding:12px 16px;text-align:right;font-weight:700;font-size:13px;border-bottom:1px solid #f0f0f0">${f(item.total)}</td></tr>`).join('');

  const signatureBlock = labels.showSignature ? `<div style="margin-top:28px;border:1.5px dashed ${accent}66;border-radius:10px;padding:20px 24px;background:#fafafa"><div style="font-size:10px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px">✎ Bon pour accord</div><div style="display:flex;gap:24px"><div style="flex:1"><div style="font-size:11px;color:#6b7280;margin-bottom:22px">Date :</div><div style="height:1px;background:#d1d5db"></div></div><div style="flex:2"><div style="font-size:11px;color:#6b7280;margin-bottom:8px">Signature :</div><div style="height:56px;border:1px dashed #d1d5db;border-radius:6px;background:#fff"></div></div></div></div>` : '';

  const paymentSection = invoice.stripe_payment_url
    ? `<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:24px 0;padding:20px;background:linear-gradient(135deg,${accent}10,${accent}05);border-radius:12px;border:1px solid ${accent}20"><a href="${invoice.stripe_payment_url}" style="display:inline-block;background:${accent};color:#fff;font-weight:700;font-size:14px;padding:14px 36px;border-radius:8px;text-decoration:none">Payer ${f(invoice.total)} en ligne</a>${qrBlock}</div>`
    : '';

  // Signature image
  const sigBlock = p.signature_url && (invoice.document_type === 'invoice' || invoice.document_type === 'deposit')
    ? `<div style="margin-top:24px;display:flex;justify-content:flex-end"><div style="text-align:center"><div style="font-size:10px;color:#9ca3af;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Signature</div><img src="${p.signature_url}" style="height:48px;max-width:180px;object-fit:contain" crossorigin="anonymous"/></div></div>`
    : '';

  return `<!DOCTYPE html><html lang="${p.language||'fr'}"><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#1a1a2e;background:#fff;position:relative}@page{margin:0;size:A4}</style></head><body>
${watermarkHtml}
<div style="height:4px;background:${accent}"></div>
<div style="padding:48px 56px;position:relative;z-index:1">
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px">
  <div style="max-width:55%">${logoHtml}<div style="font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:8px">${p.company_name||''}</div><div style="font-size:12px;color:#6b7280;line-height:1.9">${p.address||''}${p.address?'<br/>':''}${p.postal_code&&p.city?`${p.postal_code} ${p.city}<br/>`:''}${p.phone?`${p.phone}<br/>`:''}${p.siret?`<span style="font-size:11px;color:#9ca3af">SIRET ${p.siret}</span>`:''}</div></div>
  <div style="text-align:right"><div style="font-size:10px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:3px;margin-bottom:8px">${getDocLabel(invoice,p.language||'fr')}</div><div style="font-size:34px;font-weight:900;color:#1a1a2e;letter-spacing:-1px;margin-bottom:12px">${invoice.number}</div><div style="font-size:12px;color:#6b7280;line-height:1.9"><div>${labels.issuedLabel} <strong>${fd(invoice.issue_date)}</strong></div>${labels.dueDateSection?`<div style="color:${accent};font-weight:600">${labels.dueDateSection}</div>`:''}</div></div>
</div>
<div style="height:1px;background:#e8e8f0;margin-bottom:36px"></div>
<div style="display:flex;gap:20px;margin-bottom:40px">
  <div style="flex:1;padding:20px 22px;background:#f8f8fc;border-radius:12px"><div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">De</div><div style="font-weight:700;font-size:13px">${p.company_name||''}</div></div>
  <div style="flex:1;padding:20px 22px;background:#fff;border-radius:12px;border:1.5px solid ${accent}30;position:relative;overflow:hidden"><div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${accent}"></div><div style="font-size:9px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">${labels.billedToLabel}</div><div style="font-weight:700;font-size:13px;margin-bottom:4px">${clientName}</div><div style="font-size:12px;color:#6b7280;line-height:1.8">${clientAddr}${invoice.client?.email?`<br/>${invoice.client.email}`:''}</div></div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:28px"><thead><tr style="border-bottom:2px solid #1a1a2e"><th style="padding:8px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left">Prestation</th><th style="padding:8px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center">Qté</th><th style="padding:8px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right">P.U. HT</th><th style="padding:8px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center">TVA</th><th style="padding:8px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right">Total HT</th></tr></thead><tbody>${rows}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-bottom:36px"><div style="width:280px"><div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#6b7280"><span>Sous-total HT</span><span>${f(invoice.subtotal)}</span></div><div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#6b7280;border-bottom:1px solid #e8e8f0;margin-bottom:10px"><span>TVA</span><span>${f(invoice.vat_amount)}</span></div><div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-radius:12px;background:#1a1a2e"><span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.6);text-transform:uppercase">${labels.totalLabel}</span><span style="font-size:24px;font-weight:900;color:${accent}">${f(invoice.total)}</span></div></div></div>
${invoice.notes?`<div style="margin-bottom:28px;padding:16px 20px;background:#f8f8fc;border-radius:10px;border-left:3px solid ${accent}"><div style="font-size:9px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">Notes</div><div style="font-size:12px;color:#374151;line-height:1.7">${invoice.notes}</div></div>`:''}
${bankBlock}${paymentSection}${sigBlock}${signatureBlock}
<div style="margin-top:36px;padding-top:18px;border-top:1px solid #e8e8f0;font-size:10px;color:#b0b0c0;text-align:center;line-height:1.8">${legal}</div>
</div></body></html>`;
}

export function downloadInvoicePdf(invoice: Invoice, profile?: Profile | null): void {
  const html = generateInvoiceHtml(invoice, profile);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.onload = () => { setTimeout(() => win.print(), 500); };
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
