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
  const logoHtml = p.logo_url
    ? `<div style="display:flex;align-items:flex-start;justify-content:flex-start;margin-bottom:16px;padding:12px;background:#fafafa;border-radius:12px;border-left:4px solid var(--accent-color)"><img src="${p.logo_url}" style="height:120px;max-width:300px;object-fit:contain;display:block;margin:0;padding:0" onerror="this.parentNode && this.parentNode.removeChild(this)" crossorigin="anonymous"/></div>`
    : '';
  const clientLogoHtml = invoice.client?.logo_url
    ? `<div style="display:inline-block;margin-right:16px;vertical-align:top"><img src="${invoice.client.logo_url}" style="height:70px;max-width:200px;object-fit:contain;display:block" onerror="this.parentNode && this.parentNode.removeChild(this)" crossorigin="anonymous"/></div>`
    : '';
  const legal = p.siret || p.legal_status ? legalMention(p as Profile, invoice.document_type) : '';

  const bankBlock = ((invoice.document_type === 'invoice' || invoice.document_type === 'deposit') && (p.iban || p.bank_name))
    ? `<div style="margin-bottom:20px;padding:16px 20px;background:#f0fdf4;border-radius:10px;border-left:3px solid var(--accent-color)"><div style="font-size:9px;font-weight:700;color:var(--accent-color);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Coordonnées bancaires</div><div style="font-size:12px;color:#374151;line-height:1.9">${p.bank_name ? `<div><strong>Banque :</strong> ${p.bank_name}</div>` : ''}${p.iban ? `<div><strong>IBAN :</strong> ${p.iban}</div>` : ''}${p.bic ? `<div><strong>BIC :</strong> ${p.bic}</div>` : ''}</div></div>`
    : '';

  const paymentUrl = invoice.stripe_payment_url || invoice.payment_link || '';
  const paymentMethod = invoice.stripe_payment_url ? 'Stripe' : (invoice.payment_link ? 'SumUp' : '');

  const qrBlock = paymentUrl
    ? `<div style="display:inline-block;margin-left:16px;vertical-align:middle;text-align:center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(paymentUrl)}" width="72" height="72" style="display:block;border-radius:6px;border:1px solid #e5e7eb"/><div style="font-size:10px;color:#374151;margin-top:4px;font-weight:500">Scanner pour payer</div></div>`
    : '';

  const rows = invoice.items.map((item, i) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}"><td style="padding:14px 18px;font-size:14px;border-bottom:1px solid #f0f0f0"><div style="font-weight:600;color:#111827">${item.description}</div>${(item as any).detail ? `<div style="font-size:12px;color:#4b5563;margin-top:2px">${(item as any).detail}</div>` : ''}</td><td style="padding:14px 10px;text-align:center;font-size:14px;color:#374151;border-bottom:1px solid #f0f0f0">${item.quantity}</td><td style="padding:14px 10px;text-align:right;font-size:14px;color:#374151;border-bottom:1px solid #f0f0f0">${f(item.unit_price)}</td><td style="padding:14px 10px;text-align:center;border-bottom:1px solid #f0f0f0"><span style="background:var(--accent-color-alpha);color:var(--accent-color);font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px">${item.vat_rate}%</span></td><td style="padding:14px 18px;text-align:right;font-weight:700;font-size:14px;border-bottom:1px solid #f0f0f0">${f(item.total)}</td></tr>`
  ).join('');

  const discountRow = (invoice.discount_amount ?? 0) > 0
    ? `<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:12px;color:#ef4444"><span>Remise (${invoice.discount_percent}%)</span><span>- ${f(invoice.discount_amount ?? 0)}</span></div>`
    : '';

  const signatureBlock = labels.showSignature
    ? `<div style="margin-top:28px;border:1.5px dashed var(--accent-color-alpha);border-radius:10px;padding:20px 24px;background:#fafafa"><div style="font-size:10px;font-weight:700;color:var(--accent-color);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px">✎ Bon pour accord</div><div style="display:flex;gap:24px"><div style="flex:1"><div style="font-size:11px;color:#374151;margin-bottom:22px">Date :</div><div style="height:1px;background:#d1d5db"></div></div><div style="flex:2"><div style="font-size:11px;color:#374151;margin-bottom:8px">Signature :</div><div style="height:56px;border:1px dashed #d1d5db;border-radius:6px;background:#fff"></div></div></div></div>`
    : '';

  const paymentSection = paymentUrl
    ? `<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:24px 0;padding:22px;background:linear-gradient(135deg,var(--accent-color-alpha),var(--accent-color-beta));border-radius:12px;border:1px solid var(--accent-color-border)"><div style="text-align:center"><div style="font-size:10px;font-weight:700;color:var(--accent-color);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Paiement securise ${paymentMethod ? `via ${paymentMethod}` : 'en ligne'}</div><a href="${paymentUrl}" style="display:inline-block;background:var(--accent-color);color:#fff;font-weight:700;font-size:15px;padding:15px 40px;border-radius:8px;text-decoration:none;box-shadow:0 4px 14px var(--accent-color-shadow)">Payer ${f(invoice.total)} en ligne</a></div>${qrBlock}</div>`
    : '';

  const sigBlock = p.signature_url && (invoice.document_type === 'invoice' || invoice.document_type === 'deposit')
    ? `<div style="margin-top:24px;display:flex;justify-content:flex-end"><div style="text-align:center"><div style="font-size:11px;color:#374151;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Signature</div><img src="${p.signature_url}" style="height:48px;max-width:180px;object-fit:contain" crossorigin="anonymous"/></div></div>`
    : '';

  const defaultPaymentTerms = `Paiement à réception de la facture. En cas de retard de paiement, une indemnité forfaitaire pour frais de recouvrement de 40 euros sera appliquée, conformément à l'article L.441-6 du Code de commerce. Les pénalités de retard sont calculées sur la base de trois fois le taux d'intérêt légal en vigueur (article L.441-6 c. com.). Tout litige relatif à la présente facture sera soumis à la compétence exclusive du Tribunal de Commerce du siège social du prestataire. L'acceptation de la présente facture vaut accord sur les conditions générales de vente.`;

  const formatPaymentTerms = (terms: string | null | undefined): string => {
    if (!terms) return defaultPaymentTerms;
    const numMatch = terms.match(/^\d+$/);
    if (numMatch) {
      const days = parseInt(terms, 10);
      if (days === 0) return 'Paiement à réception de facture.';
      if (days === 30) return 'Paiement sous 30 jours.';
      if (days === 45) return 'Paiement sous 45 jours.';
      if (days === 60) return 'Paiement sous 60 jours.';
      return `Paiement sous ${days} jours.`;
    }
    return terms;
  };

  const paymentTermsBlock = `<div style="margin-bottom:20px;padding:16px 20px;background:#f8f8fc;border-radius:10px;border-left:3px solid var(--accent-color-alpha)"><div style="font-size:9px;font-weight:700;color:var(--accent-color);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Conditions de paiement</div><div style="font-size:12px;color:#374151;line-height:1.7">${formatPaymentTerms(p.payment_terms)}</div></div>`;

  const defaultLegalMention = [
    p.siret ? `SIRET : ${p.siret}` : '',
    p.legal_status === 'auto-entrepreneur' ? "Dispensé d'immatriculation au RCS et au Répertoire des Métiers" : '',
    p.legal_status === 'auto-entrepreneur' ? 'TVA non applicable, art. 293 B du CGI' : '',
    p.vat_number ? `N° TVA intracommunautaire : ${p.vat_number}` : '',
    (invoice.document_type === 'invoice' || invoice.document_type === 'deposit') ? 'Pénalités de retard : 3× le taux légal en vigueur — Indemnité forfaitaire pour frais de recouvrement : 40 EUR (art. L.441-6 c. com.)' : '',
    "Conformément à l'article L.441-9 du Code de commerce, la facture est émise en double exemplaire.",
  ].filter(Boolean).join(' • ');

  const legalMentionBlock = `<div style="margin-bottom:20px;padding:14px 18px;background:#f9f9f9;border-radius:8px"><div style="font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">Mentions légales</div><div style="font-size:12px;color:#374151;line-height:1.7">${p.legal_mention || defaultLegalMention}</div></div>`;

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

/**
 * Elegant unified template with premium typography and sophisticated design
 * Uses Inter for body text and Crimson Pro for headings
 * Features warm accent color palette with elegant gradients and modern card-based layout
 */
function magnificentTemplate(d: TemplateData, accentColor: string): string {
  // Elegant warm accent palette (inspired by the provided design)
  const accent = accentColor;
  const accentDark = adjustBrightness(accentColor, -20);
  const accentLight = adjustBrightness(accentColor, 40);
  const accentAlpha = hexToRgba(accentColor, 0.08);
  const accentBeta = hexToRgba(accentColor, 0.15);
  const accentGlow = hexToRgba(accentColor, 0.12);
  const accentBorder = hexToRgba(accentColor, 0.25);
  const accentShadow = hexToRgba(accentColor, 0.35);

  // CSS variables for dynamic theming
  const cssVars = `
    --bg: #f5f0eb;
    --paper: #ffffff;
    --accent: ${accent};
    --accent-dark: ${accentDark};
    --accent-light: ${accentLight};
    --accent-alpha: ${accentAlpha};
    --accent-beta: ${accentBeta};
    --accent-glow: ${accentGlow};
    --accent-border: ${accentBorder};
    --accent-shadow: ${accentShadow};
    --text: #1a1a1a;
    --text-secondary: #5a5a5a;
    --text-muted: #999999;
    --border: #e8e2db;
    --border-strong: #d4ccc3;
    --row-alt: #faf8f6;
    --success: #4a9e7d;
    --danger: #c75c5c;
  `;

  // Client info block
  const clientInfo = `
    <div style="font-weight:700;font-size:16px;margin-bottom:6px;color:#1a1a1a">${d.clientName}</div>
    <div style="font-size:13px;color:#5a5a5a;line-height:1.7">
      ${d.clientAddr}
      ${d.invoice.client?.email?`<br/>${d.invoice.client.email}`:''}
      ${d.invoice.client?.phone?`<br/>${d.invoice.client.phone}`:''}
      ${d.invoice.client?.siret?`<br/><span style="font-size:11px;color:#6b7280;font-weight:500">SIRET ${d.invoice.client.siret}</span>`:''}
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="${d.lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${d.invoice.number} - ${d.docLabel}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Crimson+Pro:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      color: var(--text);
      background: var(--bg);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    @page {
      margin: 0;
      size: A4;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .accent-text { color: var(--accent); }
    .accent-bg { background-color: var(--accent); }
    .accent-border { border-color: var(--accent); }
    .accent-bg-light { background-color: var(--accent-alpha); }
    .crimson { font-family: 'Crimson Pro', Georgia, 'Times New Roman', serif; }
  </style>
</head>
<body style="${cssVars}">
  ${d.watermarkHtml}

  <!-- Invoice Paper -->
  <div style="max-width:900px;margin:40px auto;background:var(--paper);border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 8px 32px rgba(0,0,0,0.08),0 24px 60px rgba(0,0,0,0.06);overflow:hidden;position:relative">

    <!-- Accent gradient bar -->
    <div style="height:4px;background:linear-gradient(90deg,var(--accent-dark),var(--accent),#e0b896,var(--accent-dark));background-size:300% 100%"></div>

    <!-- Main content -->
    <div style="padding:48px 56px;position:relative;z-index:1">

      <!-- Header section -->
      <div style="display:grid;grid-template-columns:1fr auto;gap:40px;margin-bottom:44px;align-items:start">

        <!-- Left: Brand -->
        <div style="display:flex;align-items:center;gap:18px">
          ${d.profile.logo_url ? `
          <div style="width:62px;height:62px;flex-shrink:0">
            <img src="${d.profile.logo_url}" style="width:100%;height:100%;object-fit:contain;border-radius:8px" onerror="this.style.display='none'" crossorigin="anonymous"/>
          </div>` : `
          <div style="width:62px;height:62px;flex-shrink:0;background:linear-gradient(135deg,var(--accent),var(--accent-dark));border-radius:14px;display:flex;align-items:center;justify-content:center">
            <svg width="32" height="32" viewBox="0 0 62 62" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="62" height="62" rx="14" fill="white" opacity="0.2"/>
              <path d="M18 20L31 14L44 20V34C44 42 31 48 31 48C31 48 18 42 18 34V20Z" stroke="white" stroke-width="2" fill="none"/>
              <path d="M26 30L29.5 33.5L37 26" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>`}
          <div>
            <h1 style="font-family:'Crimson Pro',serif;font-size:26px;font-weight:800;color:var(--text);line-height:1.15;letter-spacing:-0.02em;margin-bottom:3px">${d.profile.company_name||''}</h1>
            <p style="font-size:12px;color:var(--text-muted);margin:0;font-weight:500;letter-spacing:0.08em;text-transform:uppercase">${d.profile.legal_status ? d.profile.legal_status.replace('-',' ') : ''}</p>
          </div>
        </div>

        <!-- Right: Document meta -->
        <div style="text-align:right">
          <div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);background:var(--accent-alpha);padding:5px 14px;border-radius:20px;border:1px solid var(--accent-border);margin-bottom:12px">
            ${d.docLabel}
          </div>
          <div style="font-family:'Crimson Pro',serif;font-size:32px;font-weight:700;color:var(--text);line-height:1.1;margin-bottom:14px">${d.invoice.number}</div>
          <div style="display:flex;gap:24px;justify-content:flex-end">
            <div style="text-align:right">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:2px">${d.labels.issuedLabel}</div>
              <div style="font-size:14px;color:var(--text);font-weight:500">${d.fd(d.invoice.issue_date)}</div>
            </div>
            ${d.labels.dueDateSection ? `
            <div style="text-align:right">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:2px">Échéance</div>
              <div style="font-size:14px;color:var(--accent-dark);font-weight:600">${d.labels.dueDateSection.replace('Échéance : ','')}</div>
            </div>` : ''}
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:var(--border);margin-bottom:36px;position:relative">
        <div style="position:absolute;left:0;top:0;width:80px;height:1px;background:var(--accent)"></div>
      </div>

      <!-- Parties section -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:40px">
        <!-- From -->
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <i class="fas fa-building" style="color:var(--accent);font-size:11px"></i> Émetteur
          </div>
          <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px">${d.profile.company_name||''}</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.7">
            ${d.profile.address||''}${d.profile.address?'<br/>':''}
            ${d.profile.postal_code&&d.profile.city?`${d.profile.postal_code} ${d.profile.city}`:''}${d.profile.country&&d.profile.country!=='France'?`<br/>${d.profile.country}`:''}
          </div>
        </div>

        <!-- To -->
        <div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <i class="fas fa-user" style="color:var(--accent);font-size:11px"></i> ${d.labels.billedToLabel}
          </div>
          ${d.clientLogoHtml}
          ${clientInfo}
        </div>
      </div>

      <!-- Items table -->
      <div style="margin-bottom:36px;border-radius:12px;border:1px solid var(--border);overflow:hidden">
        <table>
          <thead>
            <tr style="background:var(--row-alt)">
              <th style="padding:12px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);text-align:left;border-bottom:2px solid var(--border-strong)">Description</th>
              <th style="padding:12px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);text-align:center;border-bottom:2px solid var(--border-strong)">Qté</th>
              <th style="padding:12px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);text-align:right;border-bottom:2px solid var(--border-strong)">P.U. HT</th>
              <th style="padding:12px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);text-align:center;border-bottom:2px solid var(--border-strong)">TVA</th>
              <th style="padding:12px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);text-align:right;border-bottom:2px solid var(--border-strong)">Total HT</th>
            </tr>
          </thead>
          <tbody>${d.rows}</tbody>
        </table>
      </div>

      <!-- Totals section -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:40px">
        <div style="width:320px">
          <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:14px;color:var(--text-secondary)">
            <span>Sous-total HT</span>
            <span style="font-weight:600;font-variant-numeric:tabular-nums">${d.f(d.invoice.subtotal)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:14px;color:var(--text-secondary)">
            <span>TVA</span>
            <span style="font-weight:600;font-variant-numeric:tabular-nums">${d.f(d.invoice.vat_amount)}</span>
          </div>
          ${d.discountRow}
          <div style="height:1px;background:var(--border);margin:4px 0"></div>
          <div style="display:flex;justify-content:space-between;padding:16px 0 4px">
            <span style="font-size:16px;font-weight:700;color:var(--text)">${d.labels.totalLabel}</span>
            <span style="font-family:'Crimson Pro',serif;font-size:28px;font-weight:700;color:var(--accent-dark);font-variant-numeric:tabular-nums">${d.f(d.invoice.total)}</span>
          </div>
        </div>
      </div>

      <!-- Notes section -->
      ${d.invoice.notes ? `<div style="margin-bottom:28px;padding:18px 22px;background:var(--accent-alpha);border-radius:12px;border-left:4px solid var(--accent)"><div style="font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="fas fa-sticky-note" style="font-size:11px"></i> Notes</div><div style="font-size:13px;color:var(--text-secondary);line-height:1.7">${d.invoice.notes}</div></div>` : ''}

      <!-- Payment terms & Bank details -->
      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:40px;margin-bottom:36px">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <i class="fas fa-file-contract" style="color:var(--accent);font-size:11px"></i> Conditions de paiement
          </div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.75">
            ${d.profile.custom_payment_terms ? d.profile.custom_payment_terms : (d.profile.payment_terms && d.profile.payment_terms.match(/^\d+$/) ? `Paiement sous ${d.profile.payment_terms} jours.` : 'Paiement à réception de facture.')}
            <br/>En cas de retard, pénalités de 3× le taux légal + indemnité de 40€.
          </div>
        </div>
        ${(d.invoice.document_type === 'invoice' || d.invoice.document_type === 'deposit') && (d.profile.iban || d.profile.bank_name) ? `
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <i class="fas fa-university" style="color:var(--accent);font-size:11px"></i> Coordonnées bancaires
          </div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:2">
            ${d.profile.bank_name ? `<div><strong style="color:var(--text)">Banque :</strong> ${d.profile.bank_name}</div>` : ''}
            ${d.profile.iban ? `<div><strong style="color:var(--text)">IBAN :</strong> ${d.profile.iban}</div>` : ''}
            ${d.profile.bic ? `<div><strong style="color:var(--text)">BIC :</strong> ${d.profile.bic}</div>` : ''}
          </div>
        </div>` : ''}
      </div>

      <!-- Payment section -->
      ${d.paymentSection}

      <!-- Legal mentions -->
      <div style="margin-bottom:20px;padding:14px 18px;background:#f9f9f9;border-radius:8px">
        <div style="font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Mentions légales</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.7">
          ${d.profile.siret ? `SIRET : ${d.profile.siret} • ` : ''}${d.profile.legal_status === 'auto-entrepreneur' ? "Dispensé d'immatriculation au RCS • TVA non applicable art. 293 B du CGI" : (d.profile.vat_number ? `N° TVA intracommunautaire : ${d.profile.vat_number}` : '')}
          ${d.invoice.document_type === 'invoice' || d.invoice.document_type === 'deposit' ? '• Pénalités de retard : 3× le taux légal — Indemnité forfaitaire : 40€' : ''}
        </div>
      </div>

      <!-- Signature -->
      ${d.sigBlock}

      <!-- Signature block for quotes -->
      ${d.signatureBlock}

      <!-- Footer -->
      <div style="margin-top:48px;padding-top:24px;border-top:2px solid var(--accent-border);text-align:center">
        <div style="font-family:'Crimson Pro',serif;font-size:24px;font-weight:800;color:var(--text);letter-spacing:-1px;margin-bottom:8px">${d.invoice.number}</div>
        <div style="font-size:11px;color:var(--text-muted);line-height:1.8">${d.legal}</div>
        <div style="font-size:10px;color:var(--border-strong);margin-top:6px">${d.profile.company_name||''}${d.profile.siret?` · SIRET ${d.profile.siret}`:''}${d.profile.vat_number?` · N° TVA ${d.profile.vat_number}`:''}</div>
      </div>

    </div>

    <!-- Footer bar -->
    <div style="background:var(--row-alt);padding:20px 56px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border)">
      <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:6px">
        <i class="fas fa-file-invoice" style="color:var(--accent);font-size:10px"></i> ${d.docLabel} générée par Facturme
      </div>
      <div style="display:flex;gap:18px">
        ${d.profile.email ? `<div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:5px"><i class="fas fa-envelope" style="color:var(--accent);font-size:10px"></i> ${d.profile.email}</div>` : ''}
        ${d.profile.phone ? `<div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:5px"><i class="fas fa-phone" style="color:var(--accent);font-size:10px"></i> ${d.profile.phone}</div>` : ''}
      </div>
    </div>

    <!-- Bottom accent bar -->
    <div style="height:4px;background:linear-gradient(90deg,var(--accent-dark),var(--accent),#e0b896,var(--accent-dark));background-size:300% 100%"></div>

  </div>
</body>
</html>`;
}

// Helper function to convert hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Helper function to adjust brightness
function adjustBrightness(hex: string, amount: number): string {
  let color = hex.slice(1);
  let num = parseInt(color, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  const clamp = (val: number) => Math.max(0, Math.min(255, val));
  return '#' + (clamp(r) << 16 | clamp(g) << 8 | clamp(b)).toString(16).padStart(6, '0');
}

// ── Template 1: Minimaliste ──
export function templateMinimaliste(d: TemplateData): string {
  return magnificentTemplate(d, d.accent);
}

// ── Template 2: Classique ──
export function templateClassique(d: TemplateData): string {
  return magnificentTemplate(d, d.accent);
}

// ── Template 3: Moderne ──
export function templateModerne(d: TemplateData): string {
  return magnificentTemplate(d, d.accent);
}

// ── Template 4: Élégant ──
export function templateElegant(d: TemplateData): string {
  return magnificentTemplate(d, d.accent);
}

// ── Template 5: Corporate ──
export function templateCorporate(d: TemplateData): string {
  return magnificentTemplate(d, d.accent);
}

// ── Template 6: Nature ──
export function templateNature(d: TemplateData): string {
  return magnificentTemplate(d, d.accent);
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
