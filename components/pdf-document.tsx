/**
 * Single source of truth for all PDF rendering.
 * Used by: lib/pdf.ts (client download) + api/send-invoice (email attachment).
 * Supports all 6 templates, all 6 document types, watermarks, payment links, logos.
 */
import React from 'react';
import { Document, Page, Text, View, Image, Link } from '@react-pdf/renderer';
import { Invoice, Profile } from '@/types';

// ── Document type metadata ────────────────────────────────────────────────────

interface DocMeta {
  label: string;
  issuedLabel: string;
  billedLabel: string;
  totalLabel: string;
  tableTitle: string;
  showVat: boolean;
  showBankInfo: boolean;
  validityNote?: string;
}

const DOC_META: Record<string, DocMeta> = {
  invoice: {
    label: 'FACTURE', issuedLabel: 'Émise le', billedLabel: 'Facturé à',
    totalLabel: 'TOTAL TTC', tableTitle: 'PRESTATION',
    showVat: true, showBankInfo: true,
  },
  quote: {
    label: 'DEVIS', issuedLabel: 'Établi le', billedLabel: 'Adressé à',
    totalLabel: "MONTANT DE L'OFFRE TTC", tableTitle: 'PRESTATION',
    showVat: true, showBankInfo: false,
    validityNote: "Ce devis est valable 30 jours à compter de sa date d'émission.",
  },
  credit_note: {
    label: 'AVOIR', issuedLabel: 'Émis le', billedLabel: 'Crédité à',
    totalLabel: 'MONTANT DU CRÉDIT TTC', tableTitle: 'DÉTAIL',
    showVat: true, showBankInfo: false,
  },
  purchase_order: {
    label: 'BON DE COMMANDE', issuedLabel: 'Établi le', billedLabel: 'Commandé par',
    totalLabel: 'TOTAL HT', tableTitle: 'ARTICLE',
    showVat: false, showBankInfo: false,
  },
  delivery_note: {
    label: 'BON DE LIVRAISON', issuedLabel: 'Émis le', billedLabel: 'Livré à',
    totalLabel: 'QUANTITÉ LIVRÉE', tableTitle: 'MARCHANDISE',
    showVat: false, showBankInfo: false,
  },
  deposit: {
    label: "FACTURE D'ACOMPTE", issuedLabel: 'Émise le', billedLabel: 'Facturé à',
    totalLabel: 'ACOMPTE TTC', tableTitle: "DÉTAIL DE L'ACOMPTE",
    showVat: true, showBankInfo: true,
  },
};

// ── Template style definitions ────────────────────────────────────────────────

interface TplStyle {
  useSerif: boolean;
  headerType: 'full' | 'thin';
  headerColor: string;
  bodyBg: string;
  rowOdd: string;
  thBg: string;
  thColor: string;
  totalBg: string;
  totalTextColor: string;
  sectionBg: string;
  borderColor: string;
  divider: string;
}

function getTplStyle(templateId: number, accent: string): TplStyle {
  switch (templateId) {
    case 2:
      return {
        useSerif: true, headerType: 'full', headerColor: '#1a1a2e',
        bodyBg: '#ffffff', rowOdd: '#f8f8fa',
        thBg: '#1a1a2e', thColor: '#d0d0e0',
        totalBg: '#1a1a2e', totalTextColor: '#ffffff',
        sectionBg: '#f5f5f7', borderColor: '#dddddd', divider: '#1a1a2e',
      };
    case 3:
      return {
        useSerif: false, headerType: 'full', headerColor: accent,
        bodyBg: '#ffffff', rowOdd: '#f5f8ff',
        thBg: accent, thColor: '#ffffff',
        totalBg: accent, totalTextColor: '#ffffff',
        sectionBg: '#f8f9ff', borderColor: '#e0e5f0', divider: accent,
      };
    case 4:
      return {
        useSerif: true, headerType: 'thin', headerColor: accent,
        bodyBg: '#fffdfb', rowOdd: '#fdf8f3',
        thBg: '#fdf8f3', thColor: accent,
        totalBg: '#1a1007', totalTextColor: accent,
        sectionBg: '#fdf8f3', borderColor: '#e8ddd0', divider: accent,
      };
    case 5:
      return {
        useSerif: false, headerType: 'full', headerColor: '#1e3a5f',
        bodyBg: '#ffffff', rowOdd: '#f0f4f8',
        thBg: '#1e3a5f', thColor: '#94a3b8',
        totalBg: '#1e3a5f', totalTextColor: accent,
        sectionBg: '#f0f4f8', borderColor: '#cbd5e1', divider: '#1e3a5f',
      };
    case 6:
      return {
        useSerif: false, headerType: 'full', headerColor: '#166534',
        bodyBg: '#ffffff', rowOdd: '#f0fdf4',
        thBg: '#166534', thColor: '#bbf7d0',
        totalBg: '#166534', totalTextColor: '#ffffff',
        sectionBg: '#f0fdf4', borderColor: '#bbf7d0', divider: '#166534',
      };
    default:
      return {
        useSerif: false, headerType: 'thin', headerColor: accent,
        bodyBg: '#ffffff', rowOdd: '#f9f9fb',
        thBg: '#f3f4f6', thColor: '#6b7280',
        totalBg: '#111827', totalTextColor: accent,
        sectionBg: '#f8f8fc', borderColor: '#e8e8f0', divider: accent,
      };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number, currency = 'EUR', locale = 'fr-FR') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n ?? 0)
    .replace(/\u202F/g, ' ');
}

function fmtDate(s: string, locale = 'fr-FR') {
  try {
    const d = new Date(s);
    if (locale.startsWith('fr')) {
      const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return String(s); }
}

const WATERMARKS: Record<string, { text: string; color: string }> = {
  paid:    { text: 'PAYÉ',      color: '#10b981' },
  overdue: { text: 'EN RETARD', color: '#ef4444' },
  refused: { text: 'ANNULÉ',    color: '#6b7280' },
};

// ── Main document component ───────────────────────────────────────────────────

export function PdfDocument({ invoice, profile }: { invoice: Invoice; profile: Profile }) {
  const accent = profile.accent_color || '#1D9E75';
  const currency = profile.currency || 'EUR';
  const locale = profile.language === 'en' ? 'en-GB' : 'fr-FR';
  const tpl = getTplStyle(profile.template_id || 1, accent);
  const meta = DOC_META[invoice.document_type] || DOC_META.invoice;
  const wm = WATERMARKS[invoice.status];

  const f = (n: number) => fmtCurrency(n, currency, locale);
  const fd = (s: string) => fmtDate(s, locale);
  const bold = tpl.useSerif ? 'Times-Bold' : 'Helvetica-Bold';
  const reg = tpl.useSerif ? 'Times-Roman' : 'Helvetica';

  const clientName = invoice.client?.name || invoice.client_name_override || 'Client';
  const companyName = profile.company_name || '';
  const paymentUrl = invoice.stripe_payment_url || invoice.payment_link || '';
  const paymentMethod = invoice.stripe_payment_url ? 'Stripe' : (invoice.payment_link ? 'SumUp' : '');

  const clientLines: string[] = [];
  if (invoice.client?.address) clientLines.push(invoice.client.address);
  if (invoice.client?.postal_code || invoice.client?.city)
    clientLines.push([invoice.client.postal_code, invoice.client.city].filter(Boolean).join(' '));
  if (invoice.client?.email) clientLines.push(invoice.client.email);
  if (invoice.client?.phone) clientLines.push(invoice.client.phone);
  if (invoice.client?.siret) clientLines.push(`SIRET : ${invoice.client.siret}`);

  const legalParts: string[] = [];
  if (profile.siret) legalParts.push(`SIRET : ${profile.siret}`);
  if (profile.vat_number) legalParts.push(`N° TVA : ${profile.vat_number}`);
  if (profile.legal_status === 'auto-entrepreneur') {
    legalParts.push("Dispensé d'immatriculation au RCS");
    legalParts.push('TVA non applicable, art. 293 B du CGI');
  }
  if (invoice.document_type === 'invoice' || invoice.document_type === 'deposit')
    legalParts.push('Pénalités de retard : 3× taux légal — Indemnité forfaitaire : 40 EUR (art. L.441-6 c. com.)');
  const legalText = profile.legal_mention || legalParts.join(' • ');

  const payTermsText = profile.payment_terms ||
    "Paiement à réception de la facture. En cas de retard de paiement, une indemnité forfaitaire de 40 EUR sera appliquée (art. L.441-6 c. com.). Pénalités de retard : 3× le taux légal.";

  const isFullHeader = tpl.headerType === 'full';

  return (
    <Document title={`${meta.label} ${invoice.number}`} author={companyName}>
      <Page size="A4" style={{ fontFamily: reg, backgroundColor: tpl.bodyBg, paddingBottom: 70 }}>

        {/* ── WATERMARK ── */}
        {wm && (
          <View style={{ position: 'absolute', top: 330, left: 50, right: 50, transform: 'rotate(-35deg)', opacity: 0.06 }} fixed>
            <Text style={{ fontSize: 90, fontFamily: bold, color: wm.color, textAlign: 'center', letterSpacing: 14 }}>{wm.text}</Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {isFullHeader ? (
          <View style={{ backgroundColor: tpl.headerColor, paddingHorizontal: 44, paddingTop: 28, paddingBottom: 22 }}>
            {/* Logo left */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                {profile.logo_url ? (
                  <Image src={profile.logo_url} style={{ height: 52, maxWidth: 180, objectFit: 'contain' }} />
                ) : (
                  <Text style={{ fontSize: 18, fontFamily: bold, color: '#ffffff' }}>{companyName}</Text>
                )}
              </View>
              {/* Doc label badge right */}
              <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
                <Text style={{ fontSize: 9, fontFamily: bold, color: '#ffffff', letterSpacing: 2.5 }}>{meta.label}</Text>
              </View>
            </View>
            {/* Company name below logo if logo exists */}
            {profile.logo_url && companyName && (
              <Text style={{ fontSize: 14, fontFamily: bold, color: '#ffffff', marginTop: 8 }}>{companyName}</Text>
            )}
          </View>
        ) : (
          <View>
            <View style={{ height: 4, backgroundColor: accent }} />
            <View style={{ paddingHorizontal: 44, paddingTop: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* Logo + company name left */}
              <View style={{ flex: 1 }}>
                {profile.logo_url ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image src={profile.logo_url} style={{ height: 48, maxWidth: 160, objectFit: 'contain' }} />
                  </View>
                ) : (
                  <Text style={{ fontSize: 20, fontFamily: bold, color: '#111827' }}>{companyName}</Text>
                )}
                {profile.logo_url && companyName && (
                  <Text style={{ fontSize: 13, fontFamily: bold, color: '#111827', marginTop: 6 }}>{companyName}</Text>
                )}
              </View>
              {/* Doc info right */}
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 9, fontFamily: bold, color: accent, letterSpacing: 2.5, marginBottom: 5 }}>{meta.label}</Text>
                <Text style={{ fontSize: 13, fontFamily: bold, color: '#111827' }}>{invoice.number}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* DATES + CLIENT ROW */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        <View style={{ paddingHorizontal: 44, marginTop: 18, flexDirection: 'row', justifyContent: 'space-between' }}>
          {/* Left: dates */}
          <View>
            <Text style={{ fontSize: 8, fontFamily: bold, color: '#9ca3af', letterSpacing: 1.5, marginBottom: 6 }}>DATE</Text>
            <Text style={{ fontSize: 10, color: '#374151' }}>{meta.issuedLabel} <Text style={{ fontFamily: bold, color: '#111827' }}>{fd(invoice.issue_date)}</Text></Text>
            {invoice.due_date && (
              <Text style={{ fontSize: 10, color: '#374151', marginTop: 3 }}>Échéance : <Text style={{ fontFamily: bold, color: isFullHeader ? '#111827' : accent }}>{fd(invoice.due_date)}</Text></Text>
            )}
          </View>

          {/* Right: client card */}
          <View style={{ width: 220, backgroundColor: '#ffffff', padding: '14 16', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: accent }}>
            <Text style={{ fontSize: 7, fontFamily: bold, color: accent, letterSpacing: 1.5, marginBottom: 6 }}>{meta.billedLabel.toUpperCase()}</Text>
            {invoice.client?.logo_url && (
              <Image src={invoice.client.logo_url} style={{ height: 28, maxWidth: 100, objectFit: 'contain', marginBottom: 5 }} />
            )}
            <Text style={{ fontSize: 11, fontFamily: bold, color: '#111827', marginBottom: 3 }}>{clientName}</Text>
            {clientLines.map((line, i) => (
              <Text key={i} style={{ fontSize: 8.5, color: '#6b7280', marginBottom: 1.5 }}>{line}</Text>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* DIVIDER */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        <View style={{ marginHorizontal: 44, marginTop: 18, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ height: 2, flex: 1, backgroundColor: tpl.divider }} />
          <Text style={{ fontSize: 7.5, fontFamily: bold, color: tpl.divider, letterSpacing: 2 }}>DÉTAIL</Text>
          <View style={{ height: 2, flex: 1, backgroundColor: tpl.divider }} />
        </View>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ITEMS TABLE */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        <View style={{ marginHorizontal: 44, marginBottom: 14 }}>
          {/* Table header */}
          <View style={{ flexDirection: 'row', backgroundColor: tpl.thBg, padding: '8 0', borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>
            <Text style={{ flex: 5, fontSize: 7, fontFamily: bold, color: tpl.thColor, paddingLeft: 14, letterSpacing: 0.8 }}>{meta.tableTitle}</Text>
            <Text style={{ width: 34, fontSize: 7, fontFamily: bold, color: tpl.thColor, textAlign: 'center', letterSpacing: 0.8 }}>QTÉ</Text>
            <Text style={{ width: 68, fontSize: 7, fontFamily: bold, color: tpl.thColor, textAlign: 'right', letterSpacing: 0.8 }}>P.U. HT</Text>
            {meta.showVat && (
              <Text style={{ width: 34, fontSize: 7, fontFamily: bold, color: tpl.thColor, textAlign: 'center', letterSpacing: 0.8 }}>TVA</Text>
            )}
            <Text style={{ width: 72, fontSize: 7, fontFamily: bold, color: tpl.thColor, textAlign: 'right', paddingRight: 14, letterSpacing: 0.8 }}>TOTAL HT</Text>
          </View>

          {/* Rows */}
          {invoice.items.map((item, i) => (
            <View
              key={item.id || i}
              style={{
                flexDirection: 'row',
                backgroundColor: i % 2 !== 0 ? tpl.rowOdd : tpl.bodyBg,
                paddingVertical: 10,
                borderBottomWidth: 0.5,
                borderBottomColor: tpl.borderColor,
              }}
            >
              <Text style={{ flex: 5, fontSize: 9.5, color: '#111827', paddingLeft: 14, paddingRight: 8 }}>{item.description || ''}</Text>
              <Text style={{ width: 34, fontSize: 9.5, color: '#6b7280', textAlign: 'center' }}>{item.quantity}</Text>
              <Text style={{ width: 68, fontSize: 9.5, color: '#374151', textAlign: 'right' }}>{f(item.unit_price)}</Text>
              {meta.showVat && (
                <Text style={{ width: 34, fontSize: 9.5, color: '#6b7280', textAlign: 'center' }}>{item.vat_rate}%</Text>
              )}
              <Text style={{ width: 72, fontSize: 9.5, fontFamily: bold, color: '#111827', textAlign: 'right', paddingRight: 14 }}>{f(item.total ?? item.quantity * item.unit_price)}</Text>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TOTALS */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        <View style={{ paddingHorizontal: 44, alignItems: 'flex-end', marginBottom: 16 }}>
          <View style={{ width: 220 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontSize: 9.5, color: '#6b7280' }}>Sous-total HT</Text>
              <Text style={{ fontSize: 9.5, fontFamily: bold, color: '#111827' }}>{f(invoice.subtotal)}</Text>
            </View>
            {meta.showVat && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ fontSize: 9.5, color: '#6b7280' }}>TVA</Text>
                <Text style={{ fontSize: 9.5, fontFamily: bold, color: '#111827' }}>{f(invoice.vat_amount)}</Text>
              </View>
            )}
            {(invoice.discount_amount ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ fontSize: 9.5, color: '#ef4444' }}>Remise ({invoice.discount_percent}%)</Text>
                <Text style={{ fontSize: 9.5, fontFamily: bold, color: '#ef4444' }}>-{f(invoice.discount_amount ?? 0)}</Text>
              </View>
            )}
            <View style={{ height: 1, backgroundColor: tpl.borderColor, marginVertical: 5 }} />
            <View style={{ backgroundColor: tpl.totalBg, padding: '12 16', borderRadius: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 8, fontFamily: bold, color: tpl.totalTextColor === '#ffffff' ? 'rgba(255,255,255,0.6)' : '#9ca3af', letterSpacing: 1 }}>
                {meta.totalLabel}
              </Text>
              <Text style={{ fontSize: 18, fontFamily: bold, color: tpl.totalTextColor }}>
                {f(invoice.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PAYMENT LINK */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {paymentUrl && (
          <View style={{ marginHorizontal: 44, marginBottom: 12, backgroundColor: tpl.sectionBg, borderRadius: 8, padding: '14 18', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 36, height: 36, backgroundColor: accent, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#ffffff' }}>€</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 7.5, fontFamily: bold, color: accent, letterSpacing: 1.5, marginBottom: 3 }}>PAIEMENT EN LIGNE {paymentMethod ? `— ${paymentMethod}` : ''}</Text>
              <Text style={{ fontSize: 10, fontFamily: bold, color: '#111827' }}>Payer {f(invoice.total)} en ligne</Text>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* NOTES */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {invoice.notes && (
          <View style={{ marginHorizontal: 44, marginBottom: 10, backgroundColor: tpl.sectionBg, borderRadius: 8, padding: '12 16', borderLeftWidth: 3, borderLeftColor: accent }}>
            <Text style={{ fontSize: 7, fontFamily: bold, color: accent, letterSpacing: 1.5, marginBottom: 4 }}>NOTES</Text>
            <Text style={{ fontSize: 9, color: '#374151', lineHeight: 1.6 }}>{invoice.notes}</Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* BANK INFO */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {meta.showBankInfo && (profile.iban || profile.bank_name) && (
          <View style={{ marginHorizontal: 44, marginBottom: 10, backgroundColor: tpl.sectionBg, borderRadius: 8, padding: '12 16', borderLeftWidth: 3, borderLeftColor: accent }}>
            <Text style={{ fontSize: 7, fontFamily: bold, color: accent, letterSpacing: 1.5, marginBottom: 5 }}>COORDONNÉES BANCAIRES</Text>
            {profile.bank_name && <Text style={{ fontSize: 9, color: '#374151', marginBottom: 2 }}>Banque : {profile.bank_name}</Text>}
            {profile.iban && <Text style={{ fontSize: 9, color: '#374151', marginBottom: 2 }}>IBAN : {profile.iban}</Text>}
            {profile.bic && <Text style={{ fontSize: 9, color: '#374151' }}>BIC : {profile.bic}</Text>}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PAYMENT TERMS */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {meta.validityNote && (
          <View style={{ marginHorizontal: 44, marginBottom: 8 }}>
            <Text style={{ fontSize: 8.5, color: '#6b7280', fontStyle: 'italic' }}>{meta.validityNote}</Text>
          </View>
        )}

        {(invoice.document_type === 'invoice' || invoice.document_type === 'deposit') && (
          <View style={{ marginHorizontal: 44, marginBottom: 10, backgroundColor: tpl.sectionBg, borderRadius: 6, padding: '10 14' }}>
            <Text style={{ fontSize: 7, fontFamily: bold, color: accent, letterSpacing: 1.5, marginBottom: 3 }}>CONDITIONS DE PAIEMENT</Text>
            <Text style={{ fontSize: 8, color: '#6b7280', lineHeight: 1.5 }}>{payTermsText}</Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* FOOTER */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 44, paddingBottom: 16, paddingTop: 10, borderTopWidth: 1.5, borderTopColor: tpl.borderColor }} fixed>
          {/* Accent line */}
          <View style={{ position: 'absolute', top: -3, left: 44, width: 60, height: 3, backgroundColor: accent }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontFamily: bold, color: '#111827' }}>{invoice.number}</Text>
            <Text style={{ fontSize: 7, color: '#9ca3af' }}>{companyName}{profile.siret ? ` — SIRET ${profile.siret}` : ''}</Text>
          </View>
          {legalText && (
            <Text style={{ fontSize: 6.5, color: '#b0b0c0', marginTop: 4, lineHeight: 1.4 }}>{legalText}</Text>
          )}
        </View>

      </Page>
    </Document>
  );
}

export default PdfDocument;
