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
  clientLogoHtml: string;
  legal: string;
  bankBlock: string;
  watermarkHtml: string;
  qrBlock: string;
  rows: string;
  discountRow: string;
  signatureBlock: string;
  paymentSection: string;
  sigBlock: string;
  paymentTermsBlock: string;
  legalMentionBlock: string;
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
  // Logo with onerror removal — if the image fails to load, the element is hidden (bigger logo for better visibility)
  const logoHtml = p.logo_url
    ? `<img src="${p.logo_url}" style="height:90px;max-width:240px;object-fit:contain;display:block;margin-bottom:16px" onerror="this.parentNode && this.parentNode.removeChild(this)" crossorigin="anonymous"/>`
    : '';
  // Client logo — displayed in client section
  const clientLogoHtml = invoice.client?.logo_url
    ? `<img src="${invoice.client.logo_url}" style="height:60px;max-width:180px;object-fit:contain;display:inline-block;margin-bottom:8px" onerror="this.parentNode && this.parentNode.removeChild(this)" crossorigin="anonymous"/>`
    : '';
  const legal = p.siret || p.legal_status ? legalMention(p as Profile, invoice.document_type) : '';

  const bankBlock = ((invoice.document_type === 'invoice' || invoice.document_type === 'deposit') && (p.iban || p.bank_name))
    ? `<div style="margin-bottom:20px;padding:16px 20px;background:#f0fdf4;border-radius:10px;border-left:3px solid ${accent}"><div style="font-size:9px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Coordonnées bancaires</div><div style="font-size:12px;color:#374151;line-height:1.9">${p.bank_name ? `<div><strong>Banque :</strong> ${p.bank_name}</div>` : ''}${p.iban ? `<div><strong>IBAN :</strong> ${p.iban}</div>` : ''}${p.bic ? `<div><strong>BIC :</strong> ${p.bic}</div>` : ''}</div></div>`
    : '';

  // Payment URL — support both Stripe and SumUp
  const paymentUrl = invoice.stripe_payment_url || invoice.payment_link || '';
  const paymentMethod = invoice.stripe_payment_url ? 'Stripe' : (invoice.payment_link ? 'SumUp' : '');

  const qrBlock = paymentUrl
    ? `<div style="display:inline-block;margin-left:16px;vertical-align:middle;text-align:center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(paymentUrl)}" width="72" height="72" style="display:block;border-radius:6px;border:1px solid #e5e7eb"/><div style="font-size:9px;color:#9ca3af;margin-top:4px">Scanner pour payer</div></div>`
    : '';

  const rows = invoice.items.map((item, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}"><td style="padding:12px 16px;font-size:13px;border-bottom:1px solid #f0f0f0"><div style="font-weight:600;color:#111827">${item.description}</div>${(item as any).detail ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">${(item as any).detail}</div>` : ''}</td><td style="padding:12px 8px;text-align:center;font-size:13px;color:#6b7280;border-bottom:1px solid #f0f0f0">${item.quantity}</td><td style="padding:12px 8px;text-align:right;font-size:13px;color:#374151;border-bottom:1px solid #f0f0f0">${f(item.unit_price)}</td><td style="padding:12px 8px;text-align:center;border-bottom:1px solid #f0f0f0"><span style="background:${accent}15;color:${accent};font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">${item.vat_rate}%</span></td><td style="padding:12px 16px;text-align:right;font-weight:700;font-size:13px;border-bottom:1px solid #f0f0f0">${f(item.total)}</td></tr>`
  ).join('');

  const discountRow = (invoice.discount_amount ?? 0) > 0
    ? `<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:12px;color:#ef4444"><span>Remise (${invoice.discount_percent}%)</span><span>- ${f(invoice.discount_amount ?? 0)}</span></div>`
    : '';

  const signatureBlock = labels.showSignature
    ? `<div style="margin-top:28px;border:1.5px dashed ${accent}66;border-radius:10px;padding:20px 24px;background:#fafafa"><div style="font-size:10px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px">✎ Bon pour accord</div><div style="display:flex;gap:24px"><div style="flex:1"><div style="font-size:11px;color:#6b7280;margin-bottom:22px">Date :</div><div style="height:1px;background:#d1d5db"></div></div><div style="flex:2"><div style="font-size:11px;color:#6b7280;margin-bottom:8px">Signature :</div><div style="height:56px;border:1px dashed #d1d5db;border-radius:6px;background:#fff"></div></div></div></div>`
    : '';

  const paymentSection = paymentUrl
    ? `<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:24px 0;padding:22px;background:linear-gradient(135deg,${accent}10,${accent}05);border-radius:12px;border:1px solid ${accent}20"><div style="text-align:center"><div style="font-size:10px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Paiement securise ${paymentMethod ? `via ${paymentMethod}` : 'en ligne'}</div><a href="${paymentUrl}" style="display:inline-block;background:${accent};color:#fff;font-weight:700;font-size:15px;padding:15px 40px;border-radius:8px;text-decoration:none;box-shadow:0 4px 14px ${accent}40">Payer ${f(invoice.total)} en ligne</a></div>${qrBlock}</div>`
    : '';

  const sigBlock = p.signature_url && (invoice.document_type === 'invoice' || invoice.document_type === 'deposit')
    ? `<div style="margin-top:24px;display:flex;justify-content:flex-end"><div style="text-align:center"><div style="font-size:10px;color:#9ca3af;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Signature</div><img src="${p.signature_url}" style="height:48px;max-width:180px;object-fit:contain" crossorigin="anonymous"/></div></div>`
    : '';

  const defaultPaymentTerms = `Paiement à réception de la facture. En cas de retard de paiement, une indemnité forfaitaire pour frais de recouvrement de 40 euros sera appliquée, conformément à l'article L.441-6 du Code de commerce. Les pénalités de retard sont calculées sur la base de trois fois le taux d'intérêt légal en vigueur (article L.441-6 c. com.). Tout litige relatif à la présente facture sera soumis à la compétence exclusive du Tribunal de Commerce du siège social du prestataire. L'acceptation de la présente facture vaut accord sur les conditions générales de vente.`;

  const paymentTermsBlock = `<div style="margin-bottom:20px;padding:16px 20px;background:#f8f8fc;border-radius:10px;border-left:3px solid ${accent}40"><div style="font-size:9px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Conditions de paiement</div><div style="font-size:12px;color:#374151;line-height:1.7">${p.payment_terms || defaultPaymentTerms}</div></div>`;

  const defaultLegalMention = [
    p.siret ? `SIRET : ${p.siret}` : '',
    p.legal_status === 'auto-entrepreneur' ? "Dispensé d'immatriculation au RCS et au Répertoire des Métiers" : '',
    p.legal_status === 'auto-entrepreneur' ? 'TVA non applicable, art. 293 B du CGI' : '',
    p.vat_number ? `N° TVA intracommunautaire : ${p.vat_number}` : '',
    (invoice.document_type === 'invoice' || invoice.document_type === 'deposit') ? 'Pénalités de retard : 3× le taux légal en vigueur — Indemnité forfaitaire pour frais de recouvrement : 40 EUR (art. L.441-6 c. com.)' : '',
    "Conformément à l'article L.441-9 du Code de commerce, la facture est émise en double exemplaire.",
  ].filter(Boolean).join(' • ');

  const legalMentionBlock = `<div style="margin-bottom:20px;padding:14px 18px;background:#f9f9f9;border-radius:8px"><div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">Mentions legales</div><div style="font-size:11px;color:#6b7280;line-height:1.7">${p.legal_mention || defaultLegalMention}</div></div>`;

  return {
    accent, currency, locale, f, fd, clientName, clientAddr, labels,
    logoHtml, clientLogoHtml, legal, bankBlock, watermarkHtml, qrBlock, rows, discountRow,
    signatureBlock, paymentSection, sigBlock,
    paymentTermsBlock, legalMentionBlock,
    lang: p.language || 'fr',
    invoice, profile: p,
    docLabel: getDocLabel(invoice, p.language || 'fr'),
  };
}

// ── Template 1: Minimaliste ──
export function templateMinimaliste(d: TemplateData): string {
  return `<!DOCTYPE html><html lang="${d.lang}"><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#1a1a2e;background:#fff;position:relative}@page{margin:0;size:A4}table{border-collapse:collapse}</style></head><body>
${d.watermarkHtml}
<div style="height:4px;background:${d.accent}"></div>
<div style="padding:44px 52px;position:relative;z-index:1">

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">
  <div style="max-width:52%">
    ${d.logoHtml}
    <div style="font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:6px">${d.profile.company_name||''}</div>
    <div style="font-size:11.5px;color:#6b7280;line-height:2">
      ${d.profile.address||''}${d.profile.address?'<br/>':''}
      ${d.profile.postal_code&&d.profile.city?`${d.profile.postal_code} ${d.profile.city}<br/>`:''}
      ${d.profile.phone?`${d.profile.phone}<br/>`:''}
      ${d.profile.email?`${d.profile.email}<br/>`:''}
      ${d.profile.siret?`<span style="font-size:10.5px;color:#9ca3af">SIRET ${d.profile.siret}</span>`:''}
      ${d.profile.vat_number?`<span style="font-size:10.5px;color:#9ca3af"> · N TVA ${d.profile.vat_number}</span>`:''}
    </div>
  </div>
  <div style="text-align:right">
    <div style="font-size:9.5px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:3px;margin-bottom:8px">${d.docLabel}</div>
    <div style="font-size:11.5px;color:#6b7280;line-height:2">
      <div>${d.labels.issuedLabel} <strong style="color:#1a1a2e">${d.fd(d.invoice.issue_date)}</strong></div>
      ${d.labels.dueDateSection?`<div style="color:${d.accent};font-weight:600">${d.labels.dueDateSection}</div>`:''}
    </div>
  </div>
</div>

<div style="height:1px;background:#e8e8f0;margin-bottom:32px"></div>

<div style="display:flex;gap:20px;margin-bottom:36px">
  <div style="flex:1;padding:18px 20px;background:#f8f8fc;border-radius:12px">
    <div style="font-size:8.5px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">De</div>
    <div style="font-weight:700;font-size:13px;color:#1a1a2e;margin-bottom:2px">${d.profile.company_name||''}</div>
    ${d.profile.legal_status?`<div style="font-size:11px;color:#9ca3af;text-transform:capitalize">${d.profile.legal_status.replace('-',' ')}</div>`:''}
  </div>
  <div style="flex:1;padding:18px 20px;background:#fff;border-radius:12px;border:1.5px solid ${d.accent}30;position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${d.accent}"></div>
    <div style="font-size:8.5px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${d.labels.billedToLabel}</div>
    ${d.clientLogoHtml}
    <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#1a1a2e">${d.clientName}</div>
    <div style="font-size:11.5px;color:#6b7280;line-height:1.9">${d.clientAddr}${d.invoice.client?.email?`<br/>${d.invoice.client.email}`:''}${d.invoice.client?.phone?`<br/>${d.invoice.client.phone}`:''}${d.invoice.client?.siret?`<br/><span style="font-size:10.5px;color:#9ca3af">SIRET ${d.invoice.client.siret}</span>`:''}</div>
  </div>
</div>

<table style="width:100%;margin-bottom:28px">
  <thead>
    <tr style="border-bottom:2px solid #1a1a2e">
      <th style="padding:9px 16px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left;color:#374151">Prestation</th>
      <th style="padding:9px 8px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;color:#374151">Qte</th>
      <th style="padding:9px 8px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right;color:#374151">P.U. HT</th>
      <th style="padding:9px 8px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;color:#374151">TVA</th>
      <th style="padding:9px 16px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right;color:#374151">Total HT</th>
    </tr>
  </thead>
  <tbody>${d.rows}</tbody>
</table>

<div style="display:flex;justify-content:flex-end;margin-bottom:32px">
  <div style="width:300px">
    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#6b7280"><span>Sous-total HT</span><span>${d.f(d.invoice.subtotal)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#6b7280"><span>TVA</span><span>${d.f(d.invoice.vat_amount)}</span></div>
    ${d.discountRow}
    <div style="height:1px;background:#e8e8f0;margin:8px 0"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-radius:12px;background:#1a1a2e">
      <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1px">${d.labels.totalLabel}</span>
      <span style="font-size:26px;font-weight:900;color:${d.accent}">${d.f(d.invoice.total)}</span>
    </div>
  </div>
</div>

${d.invoice.notes?`<div style="margin-bottom:24px;padding:16px 20px;background:#f8f8fc;border-radius:10px;border-left:3px solid ${d.accent}"><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">Notes</div><div style="font-size:12px;color:#374151;line-height:1.7">${d.invoice.notes}</div></div>`:''}
${d.paymentTermsBlock}${d.bankBlock}${d.paymentSection}${d.legalMentionBlock}${d.sigBlock}${d.signatureBlock}
<div style="margin-top:40px;padding-top:18px;border-top:2px solid ${d.accent}30;text-align:center">
  <div style="font-size:22px;font-weight:900;color:#1a1a2e;letter-spacing:-0.5px;margin-bottom:6px">${d.invoice.number}</div>
  <div style="font-size:10px;color:#b0b0c0;line-height:1.8">${d.legal}</div>
  <div style="font-size:9px;color:#d0d0d0;margin-top:4px">${d.profile.company_name||''}${d.profile.siret?` · SIRET ${d.profile.siret}`:''}${d.profile.vat_number?` · N TVA ${d.profile.vat_number}`:''}</div>
</div>
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
    <div>${d.logoHtml}<div style="font-size:20px;font-weight:700;letter-spacing:1px">${d.profile.company_name||''}</div><div style="font-size:11px;opacity:0.7;line-height:1.8;margin-top:4px">${d.profile.address||''}${d.profile.address?'<br/>':''}${d.profile.postal_code&&d.profile.city?`${d.profile.postal_code} ${d.profile.city}`:''}${d.profile.phone?` · ${d.profile.phone}`:''}</div></div>
    <div style="text-align:right"><div style="font-size:10px;opacity:0.6;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${d.docLabel}</div><div style="font-size:11px;opacity:0.8;line-height:1.9">${d.labels.issuedLabel} <strong>${d.fd(d.invoice.issue_date)}</strong></div></div>
  </div>
</div>
<div style="border-bottom:3px double #1a1a2e"></div>
<div style="padding:36px 48px;position:relative;z-index:1">
<div style="display:flex;justify-content:space-between;margin-bottom:36px">
  <div style="font-size:11px;color:#666;line-height:1.8">${d.labels.issuedLabel} <strong style="color:#222">${d.fd(d.invoice.issue_date)}</strong>${d.labels.dueDateSection?`<br/><span style="color:${d.accent};font-weight:600">${d.labels.dueDateSection}</span>`:''}</div>
  <div style="text-align:right;max-width:260px"><div style="font-size:9px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${d.labels.billedToLabel}</div>${d.clientLogoHtml}<div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#222">${d.clientName}</div><div style="font-size:11px;color:#666;line-height:1.7">${d.clientAddr}${d.invoice.client?.email?`<br/>${d.invoice.client.email}`:''}${d.invoice.client?.phone?`<br/>${d.invoice.client.phone}`:''}${d.invoice.client?.siret?`<br/><span style="font-size:10px;color:#aaa">SIRET ${d.invoice.client.siret}</span>`:''}</div></div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr style="background:#1a1a2e;color:#fff"><th style="padding:10px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left">Prestation</th><th style="padding:10px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center">Qté</th><th style="padding:10px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right">P.U. HT</th><th style="padding:10px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center">TVA</th><th style="padding:10px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right">Total HT</th></tr></thead><tbody>${classicRows}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-bottom:32px"><div style="width:260px"><div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11px;color:#666"><span>Sous-total HT</span><span>${d.f(d.invoice.subtotal)}</span></div><div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11px;color:#666"><span>TVA</span><span>${d.f(d.invoice.vat_amount)}</span></div>${d.discountRow}<div style="height:1px;background:#ccc;margin:8px 0"></div><div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1a1a2e;color:#fff"><span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">${d.labels.totalLabel}</span><span style="font-size:20px;font-weight:700">${d.f(d.invoice.total)}</span></div></div></div>
${d.invoice.notes?`<div style="margin-bottom:24px;padding:14px 18px;background:#f8f8f8;border-left:3px solid #1a1a2e"><div style="font-size:9px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Notes</div><div style="font-size:11px;color:#444;line-height:1.6">${d.invoice.notes}</div></div>`:''}
${d.paymentTermsBlock}${d.bankBlock}${d.paymentSection}${d.legalMentionBlock}${d.sigBlock}${d.signatureBlock}
<div style="margin-top:40px;padding-top:18px;border-top:2px double #ccc;text-align:center"><div style="font-size:22px;font-weight:900;color:#1a1a2e;letter-spacing:2px;margin-bottom:6px">${d.invoice.number}</div><div style="font-size:9px;color:#999;line-height:1.8">${d.legal}</div></div>
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
    <div>${d.logoHtml}<div style="font-size:24px;font-weight:800;margin-bottom:6px">${d.profile.company_name||''}</div><div style="font-size:11px;opacity:0.8;line-height:1.8">${d.profile.address||''}${d.profile.address?'<br/>':''}${d.profile.postal_code&&d.profile.city?`${d.profile.postal_code} ${d.profile.city}`:''}${d.profile.phone?` · ${d.profile.phone}`:''}</div></div>
    <div style="text-align:right"><div style="display:inline-block;background:rgba(255,255,255,0.2);padding:6px 16px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">${d.docLabel}</div><div style="font-size:11px;opacity:0.8;margin-top:8px">${d.labels.issuedLabel} <strong>${d.fd(d.invoice.issue_date)}</strong>${d.labels.dueDateSection?` · ${d.labels.dueDateSection}`:''}</div></div>
  </div>
</div>
<div style="padding:40px 48px;position:relative;z-index:1">
<div style="display:flex;gap:20px;margin-bottom:36px">
  <div style="flex:1;padding:18px 20px;background:#f8f8fc;border-radius:14px"><div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">De</div><div style="font-weight:700;font-size:13px">${d.profile.company_name||''}</div></div>
  <div style="flex:1;padding:18px 20px;background:${d.accent}08;border-radius:14px;border:2px solid ${d.accent}20"><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${d.labels.billedToLabel}</div>${d.clientLogoHtml}<div style="font-weight:700;font-size:14px;margin-bottom:4px">${d.clientName}</div><div style="font-size:12px;color:#6b7280;line-height:1.7">${d.clientAddr}${d.invoice.client?.email?`<br/>${d.invoice.client.email}`:''}${d.invoice.client?.phone?`<br/>${d.invoice.client.phone}`:''}${d.invoice.client?.siret?`<br/><span style="font-size:10px;color:#9ca3af">SIRET ${d.invoice.client.siret}</span>`:''}</div></div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:28px"><thead><tr><th style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left;color:${d.accent}">Prestation</th><th style="padding:10px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;color:${d.accent}">Qté</th><th style="padding:10px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right;color:${d.accent}">P.U. HT</th><th style="padding:10px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;color:${d.accent}">TVA</th><th style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right;color:${d.accent}">Total HT</th></tr></thead><tbody>${modernRows}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-bottom:36px"><div style="width:300px"><div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#6b7280"><span>Sous-total HT</span><span>${d.f(d.invoice.subtotal)}</span></div><div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px;color:#6b7280"><span>TVA</span><span>${d.f(d.invoice.vat_amount)}</span></div>${d.discountRow}<div style="height:1px;background:#e8e8f0;margin:8px 0 10px"></div><div style="display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-radius:16px;background:linear-gradient(135deg,${d.accent},${d.accent}cc);color:#fff"><span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px">${d.labels.totalLabel}</span><span style="font-size:26px;font-weight:900">${d.f(d.invoice.total)}</span></div></div></div>
${d.invoice.notes?`<div style="margin-bottom:28px;padding:16px 20px;background:#f8f8fc;border-radius:12px;border-left:4px solid ${d.accent}"><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">Notes</div><div style="font-size:12px;color:#374151;line-height:1.7">${d.invoice.notes}</div></div>`:''}
${d.paymentTermsBlock}${d.bankBlock}${d.paymentSection}${d.legalMentionBlock}${d.sigBlock}${d.signatureBlock}
<div style="margin-top:40px;padding-top:18px;border-top:2px solid ${d.accent}30;text-align:center"><div style="font-size:22px;font-weight:900;color:#1a1a2e;letter-spacing:-0.5px;margin-bottom:6px">${d.invoice.number}</div><div style="font-size:10px;color:#b0b0c0;line-height:1.8">${d.legal}</div></div>
</div></body></html>`;
}

// ── Template 4: Élégant (warm ivory, refined borders) ──
export function templateElegant(d: TemplateData): string {
  const elegantRows = d.invoice.items.map((item, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fffdfb' : '#fdf8f3'}"><td style="padding:12px 16px;font-size:12.5px;border-bottom:1px solid #e8ddd0;font-family:Georgia,serif;color:#3d2b1f">${item.description}</td><td style="padding:12px 8px;text-align:center;font-size:12.5px;border-bottom:1px solid #e8ddd0;color:#7a6055;font-family:Georgia,serif">${item.quantity}</td><td style="padding:12px 8px;text-align:right;font-size:12.5px;border-bottom:1px solid #e8ddd0;color:#3d2b1f;font-family:Georgia,serif">${d.f(item.unit_price)}</td><td style="padding:12px 8px;text-align:center;border-bottom:1px solid #e8ddd0"><span style="border:1px solid ${d.accent};color:${d.accent};font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;font-family:Georgia,serif">${item.vat_rate}%</span></td><td style="padding:12px 16px;text-align:right;font-weight:700;font-size:13px;border-bottom:1px solid #e8ddd0;color:#3d2b1f;font-family:Georgia,serif">${d.f(item.total)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html lang="${d.lang}"><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#3d2b1f;background:#fffdfb;position:relative}@page{margin:0;size:A4}@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap');</style></head><body>
${d.watermarkHtml}
<div style="height:3px;background:${d.accent}"></div>
<div style="height:1px;background:${d.accent}33;margin-top:2px"></div>
<div style="padding:44px 52px;background:#fffdfb;position:relative;z-index:1">

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px">
  <div style="max-width:52%">${d.logoHtml}<div style="font-size:21px;font-weight:700;color:#1a1007;letter-spacing:0.5px;margin-bottom:6px;font-family:Georgia,serif">${d.profile.company_name||''}</div><div style="font-size:11.5px;color:#7a6055;line-height:2">${d.profile.address||''}${d.profile.address?'<br/>':''}${d.profile.postal_code&&d.profile.city?`${d.profile.postal_code} ${d.profile.city}<br/>`:''}${d.profile.phone?`${d.profile.phone}<br/>`:''}${d.profile.siret?`<span style="font-size:10px;color:#b8a090">SIRET ${d.profile.siret}</span>`:''}</div></div>
  <div style="text-align:right"><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:3px;margin-bottom:6px;font-family:Georgia,serif">${d.docLabel}</div><div style="font-size:11.5px;color:#7a6055;line-height:1.9"><div>${d.labels.issuedLabel} <strong style="color:#3d2b1f">${d.fd(d.invoice.issue_date)}</strong></div>${d.labels.dueDateSection?`<div style="color:${d.accent};font-weight:600">${d.labels.dueDateSection}</div>`:''}</div></div>
</div>

<div style="height:1px;background:linear-gradient(to right,${d.accent}40,transparent);margin-bottom:32px"></div>

<div style="display:flex;gap:20px;margin-bottom:36px">
  <div style="flex:1;padding:18px 20px;background:#fdf8f3;border-radius:8px;border:1px solid #e8ddd0"><div style="font-size:8.5px;font-weight:700;color:#b8a090;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">De</div><div style="font-weight:700;font-size:13px;color:#1a1007">${d.profile.company_name||''}</div></div>
  <div style="flex:1;padding:18px 20px;background:#fff;border-radius:8px;border:1px solid ${d.accent}50"><div style="font-size:8.5px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${d.labels.billedToLabel}</div>${d.clientLogoHtml}<div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#1a1007">${d.clientName}</div><div style="font-size:11.5px;color:#7a6055;line-height:1.8">${d.clientAddr}${d.invoice.client?.email?`<br/>${d.invoice.client.email}`:''}${d.invoice.client?.phone?`<br/>${d.invoice.client.phone}`:''}${d.invoice.client?.siret?`<br/><span style="font-size:10px;color:#b8a090">SIRET ${d.invoice.client.siret}</span>`:''}</div></div>
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:28px"><thead><tr style="border-bottom:2px solid ${d.accent}40"><th style="padding:8px 16px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;text-align:left;color:${d.accent};font-family:Georgia,serif">Prestation</th><th style="padding:8px 8px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;text-align:center;color:${d.accent};font-family:Georgia,serif">Qté</th><th style="padding:8px 8px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;text-align:right;color:${d.accent};font-family:Georgia,serif">P.U. HT</th><th style="padding:8px 8px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;text-align:center;color:${d.accent};font-family:Georgia,serif">TVA</th><th style="padding:8px 16px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;text-align:right;color:${d.accent};font-family:Georgia,serif">Total HT</th></tr></thead><tbody>${elegantRows}</tbody></table>

<div style="display:flex;justify-content:flex-end;margin-bottom:32px"><div style="width:280px"><div style="display:flex;justify-content:space-between;padding:7px 0;font-size:12px;color:#7a6055;font-family:Georgia,serif"><span>Sous-total HT</span><span>${d.f(d.invoice.subtotal)}</span></div><div style="display:flex;justify-content:space-between;padding:7px 0;font-size:12px;color:#7a6055;font-family:Georgia,serif"><span>TVA</span><span>${d.f(d.invoice.vat_amount)}</span></div>${d.discountRow}<div style="height:1px;background:#e8ddd0;margin:8px 0 10px"></div><div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-radius:8px;background:#1a1007;border-left:3px solid ${d.accent}"><span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;font-family:Georgia,serif">${d.labels.totalLabel}</span><span style="font-size:22px;font-weight:700;color:${d.accent};font-family:Georgia,serif">${d.f(d.invoice.total)}</span></div></div></div>

${d.invoice.notes?`<div style="margin-bottom:28px;padding:14px 18px;background:#fdf8f3;border-radius:8px;border-left:3px solid ${d.accent}60"><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">Notes</div><div style="font-size:12px;color:#3d2b1f;line-height:1.7;font-family:Georgia,serif">${d.invoice.notes}</div></div>`:''}
${d.paymentTermsBlock}${d.bankBlock}${d.paymentSection}${d.legalMentionBlock}${d.sigBlock}${d.signatureBlock}
<div style="margin-top:40px;padding-top:18px;border-top:2px solid ${d.accent}30;text-align:center"><div style="font-size:22px;font-weight:900;color:#1a1007;letter-spacing:-0.5px;margin-bottom:6px;font-family:Georgia,serif">${d.invoice.number}</div><div style="font-size:10px;color:#b8a090;line-height:1.8;font-family:Georgia,serif">${d.legal}</div></div>
</div></body></html>`;
}

// ── Template 5: Corporate (dark slate, structured) ──
export function templateCorporate(d: TemplateData): string {
  const corpRows = d.invoice.items.map((item, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}"><td style="padding:11px 14px;font-size:12.5px;border-bottom:1px solid #e2e8f0;color:#1e293b">${item.description}</td><td style="padding:11px 8px;text-align:center;font-size:12.5px;border-bottom:1px solid #e2e8f0;color:#64748b">${item.quantity}</td><td style="padding:11px 8px;text-align:right;font-size:12.5px;border-bottom:1px solid #e2e8f0;color:#1e293b">${d.f(item.unit_price)}</td><td style="padding:11px 8px;text-align:center;border-bottom:1px solid #e2e8f0"><span style="background:${d.accent}18;color:${d.accent};font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px">${item.vat_rate}%</span></td><td style="padding:11px 14px;text-align:right;font-weight:700;font-size:13px;border-bottom:1px solid #e2e8f0;color:#1e293b">${d.f(item.total)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html lang="${d.lang}"><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#1e293b;background:#fff;position:relative}@page{margin:0;size:A4}</style></head><body>
${d.watermarkHtml}
<div style="background:#1e293b;color:#fff;padding:34px 48px">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div>${d.logoHtml}<div style="font-size:20px;font-weight:800;letter-spacing:-0.3px;margin-top:4px">${d.profile.company_name||''}</div><div style="font-size:11px;color:#94a3b8;line-height:1.9;margin-top:3px">${d.profile.address||''}${d.profile.address?' · ':''}${d.profile.postal_code&&d.profile.city?`${d.profile.postal_code} ${d.profile.city}`:''}${d.profile.phone?` · ${d.profile.phone}`:''}</div></div>
    <div style="text-align:right"><div style="display:inline-block;background:${d.accent};padding:4px 14px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${d.docLabel}</div><div style="font-size:11px;color:#94a3b8;margin-top:8px">${d.labels.issuedLabel} <strong style="color:#e2e8f0">${d.fd(d.invoice.issue_date)}</strong>${d.labels.dueDateSection?` · <span style="color:${d.accent};font-weight:600">${d.labels.dueDateSection}</span>`:''}</div></div>
  </div>
</div>
<div style="height:3px;background:${d.accent}"></div>
<div style="padding:36px 48px;position:relative;z-index:1">

<div style="display:flex;gap:18px;margin-bottom:32px">
  <div style="flex:1;padding:16px 18px;background:#f8fafc;border-radius:6px;border-top:3px solid #e2e8f0"><div style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Émetteur</div><div style="font-weight:700;font-size:13px;color:#1e293b">${d.profile.company_name||''}</div>${d.profile.siret?`<div style="font-size:11px;color:#64748b;margin-top:3px">SIRET : ${d.profile.siret}</div>`:''}</div>
  <div style="flex:1;padding:16px 18px;background:#f8fafc;border-radius:6px;border-top:3px solid ${d.accent}"><div style="font-size:8px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${d.labels.billedToLabel}</div>${d.clientLogoHtml}<div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:4px">${d.clientName}</div><div style="font-size:11.5px;color:#64748b;line-height:1.8">${d.clientAddr}${d.invoice.client?.email?`<br/>${d.invoice.client.email}`:''}${d.invoice.client?.phone?`<br/>${d.invoice.client.phone}`:''}${d.invoice.client?.siret?`<br/><span style="font-size:10px;color:#94a3b8">SIRET ${d.invoice.client.siret}</span>`:''}</div></div>
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr style="background:#1e293b"><th style="padding:10px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;text-align:left;color:#94a3b8">Prestation</th><th style="padding:10px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;text-align:center;color:#94a3b8">Qté</th><th style="padding:10px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;text-align:right;color:#94a3b8">P.U. HT</th><th style="padding:10px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;text-align:center;color:#94a3b8">TVA</th><th style="padding:10px 14px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;text-align:right;color:#94a3b8">Total HT</th></tr></thead><tbody>${corpRows}</tbody></table>

<div style="display:flex;justify-content:flex-end;margin-bottom:32px"><div style="width:270px"><div style="display:flex;justify-content:space-between;padding:7px 0;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0"><span>Sous-total HT</span><span>${d.f(d.invoice.subtotal)}</span></div><div style="display:flex;justify-content:space-between;padding:7px 0;font-size:12px;color:#64748b"><span>TVA</span><span>${d.f(d.invoice.vat_amount)}</span></div>${d.discountRow}<div style="height:2px;background:#1e293b;margin:8px 0 10px"></div><div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:#1e293b;border-radius:6px"><span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">${d.labels.totalLabel}</span><span style="font-size:22px;font-weight:900;color:${d.accent}">${d.f(d.invoice.total)}</span></div></div></div>

${d.invoice.notes?`<div style="margin-bottom:24px;padding:14px 18px;background:#f8fafc;border-left:4px solid ${d.accent};border-radius:0 6px 6px 0"><div style="font-size:9px;font-weight:700;color:${d.accent};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px">Notes</div><div style="font-size:12px;color:#374151;line-height:1.7">${d.invoice.notes}</div></div>`:''}
${d.paymentTermsBlock}${d.bankBlock}${d.paymentSection}${d.legalMentionBlock}${d.sigBlock}${d.signatureBlock}
<div style="margin-top:40px;padding-top:18px;border-top:2px solid ${d.accent}30;text-align:center"><div style="font-size:22px;font-weight:900;color:#1e293b;letter-spacing:-0.5px;margin-bottom:6px">${d.invoice.number}</div><div style="font-size:9.5px;color:#94a3b8;line-height:1.8">${d.legal}</div></div>
</div></body></html>`;
}

// ── Template 6: Nature (fresh greens, organic feel) ──
export function templateNature(d: TemplateData): string {
  const natureRows = d.invoice.items.map((item, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#f0fdf4'}"><td style="padding:12px 16px;font-size:13px;border-bottom:1px solid #dcfce7;color:#14532d">${item.description}</td><td style="padding:12px 8px;text-align:center;font-size:13px;border-bottom:1px solid #dcfce7;color:#4ade80AA;color:#15803d">${item.quantity}</td><td style="padding:12px 8px;text-align:right;font-size:13px;border-bottom:1px solid #dcfce7;color:#166534">${d.f(item.unit_price)}</td><td style="padding:12px 8px;text-align:center;border-bottom:1px solid #dcfce7"><span style="background:#dcfce7;color:#166534;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">${item.vat_rate}%</span></td><td style="padding:12px 16px;text-align:right;font-weight:700;font-size:13px;border-bottom:1px solid #dcfce7;color:#14532d">${d.f(item.total)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html lang="${d.lang}"><head><meta charset="UTF-8"/><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;color:#14532d;background:#fff;position:relative}@page{margin:0;size:A4}</style></head><body>
${d.watermarkHtml}
<div style="background:linear-gradient(135deg,#166534,#15803d);color:#fff;padding:36px 48px;position:relative;overflow:hidden">
  <div style="position:absolute;top:-30px;right:-30px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.06)"></div>
  <div style="position:absolute;bottom:-50px;left:20%;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.04)"></div>
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;opacity:0.04" style="background-image:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><circle cx=%2220%22 cy=%2220%22 r=%221%22 fill=%22white%22/></svg>')"></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1">
    <div>${d.logoHtml}<div style="font-size:22px;font-weight:800;margin-top:6px;letter-spacing:-0.3px">${d.profile.company_name||''}</div><div style="font-size:11px;opacity:0.8;line-height:1.9;margin-top:3px">${d.profile.address||''}${d.profile.address?'<br/>':''}${d.profile.postal_code&&d.profile.city?`${d.profile.postal_code} ${d.profile.city}`:''}${d.profile.phone?` · ${d.profile.phone}`:''}</div></div>
    <div style="text-align:right"><div style="display:inline-block;background:rgba(255,255,255,0.18);backdrop-filter:blur(4px);padding:5px 14px;border-radius:20px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">${d.docLabel}</div><div style="font-size:11px;opacity:0.8;margin-top:8px">${d.labels.issuedLabel} <strong>${d.fd(d.invoice.issue_date)}</strong>${d.labels.dueDateSection?` · ${d.labels.dueDateSection}`:''}</div></div>
  </div>
</div>
<div style="padding:36px 48px;position:relative;z-index:1">

<div style="display:flex;gap:18px;margin-bottom:32px">
  <div style="flex:1;padding:16px 20px;background:#f0fdf4;border-radius:12px"><div style="font-size:8.5px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">De</div><div style="font-weight:700;font-size:13px;color:#14532d">${d.profile.company_name||''}</div></div>
  <div style="flex:1;padding:16px 20px;background:#fff;border-radius:12px;border:2px solid #bbf7d0"><div style="font-size:8.5px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${d.labels.billedToLabel}</div>${d.clientLogoHtml}<div style="font-weight:700;font-size:13.5px;margin-bottom:4px;color:#14532d">${d.clientName}</div><div style="font-size:12px;color:#15803d;line-height:1.8">${d.clientAddr}${d.invoice.client?.email?`<br/>${d.invoice.client.email}`:''}${d.invoice.client?.phone?`<br/>${d.invoice.client.phone}`:''}${d.invoice.client?.siret?`<br/><span style="font-size:10px;color:#4ade80">SIRET ${d.invoice.client.siret}</span>`:''}</div></div>
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:28px"><thead><tr><th style="padding:10px 16px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:left;color:#16a34a;border-bottom:2px solid #bbf7d0">Prestation</th><th style="padding:10px 8px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;color:#16a34a;border-bottom:2px solid #bbf7d0">Qté</th><th style="padding:10px 8px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right;color:#16a34a;border-bottom:2px solid #bbf7d0">P.U. HT</th><th style="padding:10px 8px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;color:#16a34a;border-bottom:2px solid #bbf7d0">TVA</th><th style="padding:10px 16px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:right;color:#16a34a;border-bottom:2px solid #bbf7d0">Total HT</th></tr></thead><tbody>${natureRows}</tbody></table>

<div style="display:flex;justify-content:flex-end;margin-bottom:32px"><div style="width:290px"><div style="display:flex;justify-content:space-between;padding:7px 0;font-size:12px;color:#15803d"><span>Sous-total HT</span><span>${d.f(d.invoice.subtotal)}</span></div><div style="display:flex;justify-content:space-between;padding:7px 0;font-size:12px;color:#15803d"><span>TVA</span><span>${d.f(d.invoice.vat_amount)}</span></div>${d.discountRow}<div style="height:1px;background:#bbf7d0;margin:8px 0 10px"></div><div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-radius:14px;background:linear-gradient(135deg,#166534,#15803d);color:#fff"><span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;opacity:0.8">${d.labels.totalLabel}</span><span style="font-size:24px;font-weight:900">${d.f(d.invoice.total)}</span></div></div></div>

${d.invoice.notes?`<div style="margin-bottom:28px;padding:14px 18px;background:#f0fdf4;border-radius:10px;border-left:4px solid #16a34a"><div style="font-size:9px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:2px;margin-bottom:5px">Notes</div><div style="font-size:12px;color:#14532d;line-height:1.7">${d.invoice.notes}</div></div>`:''}
${d.paymentTermsBlock}${d.bankBlock}${d.paymentSection}${d.legalMentionBlock}${d.sigBlock}${d.signatureBlock}
<div style="margin-top:40px;padding-top:18px;border-top:2px solid ${d.accent}30;text-align:center"><div style="font-size:22px;font-weight:900;color:#14532d;letter-spacing:-0.5px;margin-bottom:6px">${d.invoice.number}</div><div style="font-size:10px;color:#4ade80;text-align:center;line-height:1.8;filter:brightness(0.7)">${d.legal}</div></div>
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
    '{{client_logo}}': d.clientLogoHtml,
    '{{currency}}': d.currency,
    '{{language}}': d.lang,
  };

  let result = html;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value);
  }
  return result;
}
