import { Invoice, Profile } from '@/types';
import { getDocLabel } from './pdf';

const fmt = (n: number, currency = 'EUR', locale = 'fr-FR') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
const fmtDate = (s: string, locale = 'fr-FR') =>
  new Date(s).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

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

export interface TemplateData {
  accent: string;
  currency: string;
  locale: string;
  f: (n: number) => string;
  fd: (s: string) => string;
  clientName: string;
  clientAddr: string;
  labels: ReturnType<typeof getLabels>;
  logoHtml: string;
  legal: string;
  bankBlock: string;
  watermarkHtml: string;
  qrBlock: string;
  rows: string;
  signatureBlock: string;
  paymentSection: string;
  sigBlock: string;
  lang: string;
  invoice: Invoice;
  profile: Profile;
  docLabel: string;
}

export function prepareTemplateData(invoice: Invoice, profile?: Profile | null, watermarkHtml = ''): TemplateData {
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

  const bankBlock = ((invoice.document_type === 'invoice' || invoice.document_type === 'deposit') && (p.iban || p.bank_name))
    ? `<div style="margin-bottom:20px;padding:16px 20px;background:#f0fdf4;border-radius:10px;border-left:3px solid ${accent}"><div style="font-size:9px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Coordonnées bancaires</div><div style="font-size:12px;color:#374151;line-height:1.9">${p.bank_name ? `<div><strong>Banque :</strong> ${p.bank_name}</div>` : ''}${p.iban ? `<div><strong>IBAN :</strong> ${p.iban}</div>` : ''}${p.bic ? `<div><strong>BIC :</strong> ${p.bic}</div>` : ''}</div></div>`
    : '';

  const qrBlock = invoice.stripe_payment_url
    ? `<div style="display:inline-block;margin-left:16px;vertical-align:middle;text-align:center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(invoice.stripe_payment_url)}" width="72" height="72" style="display:block;border-radius:6px;border:1px solid #e5e7eb"/><div style="font-size:9px;color:#9ca3af;margin-top:4px">Scanner pour payer</div></div>`
    : '';

  const rows = invoice.items.map((item, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}"><td style="padding:12px 16px;font-size:13px;border-bottom:1px solid #f0f0f0">${item.description}</td><td style="padding:12px 8px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #f0f0f0">${item.quantity}</td><td style="padding:12px 8px;text-align:right;font-size:13px;color:#374151;border-bottom:1px solid #f0f0f0">${f(item.unit_price)}</td><td style="padding:12px 8px;text-align:center;border-bottom:1px solid #f0f0f0"><span style="background:${accent}15;color:${accent};font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">${item.vat_rate}%</span></td><td style="padding:12px 16px;text-align:right;font-weight:700;font-size:13px;border-bottom:1px solid #f0f0f0">${f(item.total)}</td></tr>`
  ).join('');

  const signatureBlock = labels.showSignature
    ? `<div style="margin-top:28px;border:1.5px dashed ${accent}66;border-radius:10px;padding:20px 24px;background:#fafafa"><div style="font-size:10px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px">✎ Bon pour accord</div><div style="display:flex;gap:24px"><div style="flex:1"><div style="font-size:11px;color:#6b7280;margin-bottom:22px">Date :</div><div style="height:1px;background:#d1d5db"></div></div><div style="flex:2"><div style="font-size:11px;color:#6b7280;margin-bottom:8px">Signature :</div><div style="height:56px;border:1px dashed #d1d5db;border-radius:6px;background:#fff"></div></div></div></div>`
    : '';

  const paymentSection = invoice.stripe_payment_url
    ? `<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:24px 0;padding:20px;background:linear-gradient(135deg,${accent}10,${accent}05);border-radius:12px;border:1px solid ${accent}20"><a href="${invoice.stripe_payment_url}" style="display:inline-block;background:${accent};color:#fff;font-weight:700;font-size:14px;padding:14px 36px;border-radius:8px;text-decoration:none">Payer ${f(invoice.total)} en ligne</a>${qrBlock}</div>`
    : '';

  const sigBlock = p.signature_url && (invoice.document_type === 'invoice' || invoice.document_type === 'deposit')
    ? `<div style="margin-top:24px;display:flex;justify-content:flex-end"><div style="text-align:center"><div style="font-size:10px;color:#9ca3af;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Signature</div><img src="${p.signature_url}" style="height:48px;max-width:180px;object-fit:contain" crossorigin="anonymous"/></div></div>`
    : '';

  return {
    accent, currency, locale, f, fd, clientName, clientAddr, labels,
    logoHtml, legal, bankBlock, watermarkHtml, qrBlock, rows,
    signatureBlock, paymentSection, sigBlock,
    lang: p.language || 'fr',
    invoice, profile: p,
    docLabel: getDocLabel(invoice, p.language || 'fr'),
  };
}

// ── Template 1: Minimaliste (current design) ──
export function templateMinimaliste(d: TemplateData): string {
  return `<!DOCTYPE html><html lang="${d.lang}"><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#1a1a2e;background:#fff;position:relative}@page{margin:0;size:A4}</style></head><body>
${d.watermarkHtml}
<div style="height:4px;background:${d.accent}"></div>
<div style="padding:48px 56px;position:relative;z-index:1">
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px">
  <div style="max-width:55%">${d.logoHtml}<div style="font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:8px">${d.profile.company_name||''}</div><div style="font-size:12px;color:#6b7280;line-height:1.9">${d.profile.address||''}${d.profile.address?'<br/>':''}${d.profile.postal_code&&d.profile.city?`${d.profile.postal_code} ${d.profile.city}<br/>`:''}${d.profile.phone?`${d.profile.phone}<br/>`:''}${d.profile.siret?`<span style="font-size:11px;color:#9ca3af">SIRET ${d.profile.siret}</span>`:''}</div></div>
  <div style="text-align:right"><div style="font-size:10px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:3px;margin-bottom:8px">${d.docLabel}</div><div style="font-size:34px;font-weight:900;color:#1a1a2e;letter-spacing:-1px;margin-bottom:12px">${d.invoice.number}</div><div style="font-size:12px;color:#6b7280;line-height:1.9"><div>${d.labels.issuedLabel} <strong>${d.fd(d.invoice.issue_date)}</strong></div>${d.labels.dueDateSection?`<div style="color:${d.accent};font-weight:600">${d.labels.dueDateSection}</div>`:''}</div></div>
</div>
<div style="height:1px;background:#e8e8f0;margin-bottom:36px"></div>
<div style="display:flex;gap:20px;margin-bottom:40px">
  <div style="flex:1;padding:20px 22px;background:#f8f8fc;border-radius:12px"><div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">De</div><div style="font-weight:700;font-size:13px">${d.profile.company_name||''}</div></div>
  <div style="flex:1;padding:20px 22px;background:#fff;border-radius:12px;border:1.5px solid ${d.accent}30;position:relative;overflow:hidden"><div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${d.accent}"></div><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">${d.labels.billedToLabel}</div><div style="font-weight:700;font-size:13px;margin-bottom:4px">${d.clientName}</div><div style="font-size:12px;color:#6b7280;line-height:1.8">${d.clientAddr}${d.invoice.client?.email?`<br/>${d.invoice.client.email}`:''}</div></div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:28px"><thead><tr style="border-bottom:2px solid #1a1a2e"><th style="padding:8px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left">Prestation</th><th style="padding:8px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center">Qté</th><th style="padding:8px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right">P.U. HT</th><th style="padding:8px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center">TVA</th><th style="padding:8px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right">Total HT</th></tr></thead><tbody>${d.rows}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-bottom:36px"><div style="width:280px"><div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#6b7280"><span>Sous-total HT</span><span>${d.f(d.invoice.subtotal)}</span></div><div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#6b7280;border-bottom:1px solid #e8e8f0;margin-bottom:10px"><span>TVA</span><span>${d.f(d.invoice.vat_amount)}</span></div><div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-radius:12px;background:#1a1a2e"><span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.6);text-transform:uppercase">${d.labels.totalLabel}</span><span style="font-size:24px;font-weight:900;color:${d.accent}">${d.f(d.invoice.total)}</span></div></div></div>
${d.invoice.notes?`<div style="margin-bottom:28px;padding:16px 20px;background:#f8f8fc;border-radius:10px;border-left:3px solid ${d.accent}"><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">Notes</div><div style="font-size:12px;color:#374151;line-height:1.7">${d.invoice.notes}</div></div>`:''}
${d.bankBlock}${d.paymentSection}${d.sigBlock}${d.signatureBlock}
<div style="margin-top:36px;padding-top:18px;border-top:1px solid #e8e8f0;font-size:10px;color:#b0b0c0;text-align:center;line-height:1.8">${d.legal}</div>
</div></body></html>`;
}

// ── Template 2: Classique (formal French style) ──
export function templateClassique(d: TemplateData): string {
  const classicRows = d.invoice.items.map((item, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}"><td style="padding:10px 14px;font-size:12px;border:1px solid #ddd">${item.description}</td><td style="padding:10px 8px;text-align:center;font-size:12px;border:1px solid #ddd">${item.quantity}</td><td style="padding:10px 8px;text-align:right;font-size:12px;border:1px solid #ddd">${d.f(item.unit_price)}</td><td style="padding:10px 8px;text-align:center;font-size:12px;border:1px solid #ddd">${item.vat_rate}%</td><td style="padding:10px 14px;text-align:right;font-weight:700;font-size:12px;border:1px solid #ddd">${d.f(item.total)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html lang="${d.lang}"><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#222;background:#fff;position:relative}@page{margin:0;size:A4}</style></head><body>
${d.watermarkHtml}
<div style="background:#1a1a2e;color:#fff;padding:32px 48px">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div>${d.logoHtml ? d.logoHtml.replace('height:56px', 'height:48px') : ''}<div style="font-size:20px;font-weight:700;letter-spacing:1px">${d.profile.company_name||''}</div><div style="font-size:11px;opacity:0.7;line-height:1.8;margin-top:4px">${d.profile.address||''}${d.profile.address?'<br/>':''}${d.profile.postal_code&&d.profile.city?`${d.profile.postal_code} ${d.profile.city}`:''}${d.profile.phone?` · ${d.profile.phone}`:''}</div></div>
    <div style="text-align:right"><div style="font-size:28px;font-weight:700;letter-spacing:2px">${d.invoice.number}</div><div style="font-size:10px;opacity:0.6;text-transform:uppercase;letter-spacing:2px;margin-top:4px">${d.docLabel}</div></div>
  </div>
</div>
<div style="border-bottom:3px double #1a1a2e"></div>
<div style="padding:36px 48px;position:relative;z-index:1">
<div style="display:flex;justify-content:space-between;margin-bottom:36px">
  <div style="font-size:11px;color:#666;line-height:1.8">${d.labels.issuedLabel} <strong style="color:#222">${d.fd(d.invoice.issue_date)}</strong>${d.labels.dueDateSection?`<br/><span style="color:${d.accent};font-weight:600">${d.labels.dueDateSection}</span>`:''}</div>
  <div style="text-align:right;max-width:260px"><div style="font-size:9px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${d.labels.billedToLabel}</div><div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#222">${d.clientName}</div><div style="font-size:11px;color:#666;line-height:1.7">${d.clientAddr}${d.invoice.client?.email?`<br/>${d.invoice.client.email}`:''}</div></div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr style="background:#1a1a2e;color:#fff"><th style="padding:10px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left">Prestation</th><th style="padding:10px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center">Qté</th><th style="padding:10px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right">P.U. HT</th><th style="padding:10px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center">TVA</th><th style="padding:10px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right">Total HT</th></tr></thead><tbody>${classicRows}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-bottom:32px"><div style="width:260px"><div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11px;color:#666"><span>Sous-total HT</span><span>${d.f(d.invoice.subtotal)}</span></div><div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11px;color:#666;border-bottom:1px solid #ccc;margin-bottom:8px"><span>TVA</span><span>${d.f(d.invoice.vat_amount)}</span></div><div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1a1a2e;color:#fff"><span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">${d.labels.totalLabel}</span><span style="font-size:20px;font-weight:700">${d.f(d.invoice.total)}</span></div></div></div>
${d.invoice.notes?`<div style="margin-bottom:24px;padding:14px 18px;background:#f8f8f8;border-left:3px solid #1a1a2e"><div style="font-size:9px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Notes</div><div style="font-size:11px;color:#444;line-height:1.6">${d.invoice.notes}</div></div>`:''}
${d.bankBlock}${d.paymentSection}${d.sigBlock}${d.signatureBlock}
<div style="margin-top:32px;padding-top:14px;border-top:2px double #ccc;font-size:9px;color:#999;text-align:center;line-height:1.8">${d.legal}</div>
</div></body></html>`;
}

// ── Template 3: Moderne (bold, colorful) ──
export function templateModerne(d: TemplateData): string {
  const modernRows = d.invoice.items.map((item, i) =>
    `<tr><td style="padding:14px 16px;font-size:13px;border-bottom:1px solid #f0f0f0"><div style="font-weight:600;color:#1a1a2e">${item.description}</div></td><td style="padding:14px 8px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #f0f0f0">${item.quantity}</td><td style="padding:14px 8px;text-align:right;font-size:13px;color:#374151;border-bottom:1px solid #f0f0f0">${d.f(item.unit_price)}</td><td style="padding:14px 8px;text-align:center;border-bottom:1px solid #f0f0f0"><span style="background:${d.accent};color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px">${item.vat_rate}%</span></td><td style="padding:14px 16px;text-align:right;font-weight:700;font-size:14px;color:#1a1a2e;border-bottom:1px solid #f0f0f0">${d.f(item.total)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html lang="${d.lang}"><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#1a1a2e;background:#fff;position:relative}@page{margin:0;size:A4}</style></head><body>
${d.watermarkHtml}
<div style="background:linear-gradient(135deg,${d.accent},${d.accent}dd);color:#fff;padding:40px 48px;position:relative;overflow:hidden">
  <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.08)"></div>
  <div style="position:absolute;bottom:-60px;left:30%;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.05)"></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1">
    <div>${d.logoHtml ? d.logoHtml.replace('height:56px', 'height:44px').replace('margin-bottom:10px', 'margin-bottom:8px') : ''}<div style="font-size:24px;font-weight:800;margin-bottom:6px">${d.profile.company_name||''}</div><div style="font-size:11px;opacity:0.8;line-height:1.8">${d.profile.address||''}${d.profile.address?'<br/>':''}${d.profile.postal_code&&d.profile.city?`${d.profile.postal_code} ${d.profile.city}`:''}${d.profile.phone?` · ${d.profile.phone}`:''}</div></div>
    <div style="text-align:right"><div style="display:inline-block;background:rgba(255,255,255,0.2);padding:6px 16px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">${d.docLabel}</div><div style="font-size:38px;font-weight:900;letter-spacing:-2px">${d.invoice.number}</div><div style="font-size:11px;opacity:0.8;margin-top:8px">${d.labels.issuedLabel} <strong>${d.fd(d.invoice.issue_date)}</strong>${d.labels.dueDateSection?` · ${d.labels.dueDateSection}`:''}</div></div>
  </div>
</div>
<div style="padding:40px 48px;position:relative;z-index:1">
<div style="display:flex;gap:20px;margin-bottom:36px">
  <div style="flex:1;padding:18px 20px;background:#f8f8fc;border-radius:14px"><div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">De</div><div style="font-weight:700;font-size:13px">${d.profile.company_name||''}</div></div>
  <div style="flex:1;padding:18px 20px;background:${d.accent}08;border-radius:14px;border:2px solid ${d.accent}20"><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${d.labels.billedToLabel}</div><div style="font-weight:700;font-size:14px;margin-bottom:4px">${d.clientName}</div><div style="font-size:12px;color:#6b7280;line-height:1.7">${d.clientAddr}${d.invoice.client?.email?`<br/>${d.invoice.client.email}`:''}</div></div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:28px"><thead><tr><th style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left;color:${d.accent}">Prestation</th><th style="padding:10px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;color:${d.accent}">Qté</th><th style="padding:10px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right;color:${d.accent}">P.U. HT</th><th style="padding:10px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;color:${d.accent}">TVA</th><th style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right;color:${d.accent}">Total HT</th></tr></thead><tbody>${modernRows}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-bottom:36px"><div style="width:300px"><div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#6b7280"><span>Sous-total HT</span><span>${d.f(d.invoice.subtotal)}</span></div><div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#6b7280;border-bottom:1px solid #e8e8f0;margin-bottom:10px"><span>TVA</span><span>${d.f(d.invoice.vat_amount)}</span></div><div style="display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-radius:16px;background:linear-gradient(135deg,${d.accent},${d.accent}cc);color:#fff"><span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px">${d.labels.totalLabel}</span><span style="font-size:26px;font-weight:900">${d.f(d.invoice.total)}</span></div></div></div>
${d.invoice.notes?`<div style="margin-bottom:28px;padding:16px 20px;background:#f8f8fc;border-radius:12px;border-left:4px solid ${d.accent}"><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">Notes</div><div style="font-size:12px;color:#374151;line-height:1.7">${d.invoice.notes}</div></div>`:''}
${d.bankBlock}${d.paymentSection}${d.sigBlock}${d.signatureBlock}
<div style="margin-top:36px;padding-top:18px;border-top:1px solid #e8e8f0;font-size:10px;color:#b0b0c0;text-align:center;line-height:1.8">${d.legal}</div>
</div></body></html>`;
}

// ── Apply a custom HTML template with variable interpolation ──
export function applyCustomTemplate(html: string, d: TemplateData): string {
  const replacements: Record<string, string> = {
    '{{accent_color}}': d.accent,
    '{{company_name}}': d.profile.company_name || '',
    '{{company_address}}': [d.profile.address, d.profile.postal_code && d.profile.city ? `${d.profile.postal_code} ${d.profile.city}` : '', d.profile.country || ''].filter(Boolean).join(', '),
    '{{company_logo}}': d.logoHtml,
    '{{company_phone}}': d.profile.phone || '',
    '{{company_siret}}': d.profile.siret || '',
    '{{doc_label}}': d.docLabel,
    '{{invoice_number}}': d.invoice.number,
    '{{issue_date}}': d.fd(d.invoice.issue_date),
    '{{due_date}}': d.labels.dueDateSection || '',
    '{{client_name}}': d.clientName,
    '{{client_address}}': d.clientAddr,
    '{{client_email}}': d.invoice.client?.email || '',
    '{{items_table}}': d.rows,
    '{{subtotal}}': d.f(d.invoice.subtotal),
    '{{vat_amount}}': d.f(d.invoice.vat_amount),
    '{{total}}': d.f(d.invoice.total),
    '{{total_label}}': d.labels.totalLabel,
    '{{notes}}': d.invoice.notes || '',
    '{{notes_block}}': d.invoice.notes ? `<div style="margin-bottom:28px;padding:16px 20px;background:#f8f8fc;border-radius:10px;border-left:3px solid ${d.accent}"><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">Notes</div><div style="font-size:12px;color:#374151;line-height:1.7">${d.invoice.notes}</div></div>` : '',
    '{{bank_block}}': d.bankBlock,
    '{{payment_section}}': d.paymentSection,
    '{{legal_mention}}': d.legal,
    '{{signature_block}}': d.signatureBlock,
    '{{signature_image}}': d.sigBlock,
    '{{watermark}}': d.watermarkHtml,
    '{{issued_label}}': d.labels.issuedLabel,
    '{{billed_to_label}}': d.labels.billedToLabel,
    '{{currency}}': d.currency,
    '{{language}}': d.lang,
  };

  let result = html;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value);
  }
  return result;
}
