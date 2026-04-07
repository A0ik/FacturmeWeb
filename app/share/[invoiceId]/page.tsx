'use client';
import { use, useEffect, useState } from 'react';
import { formatCurrency, formatDate, DOC_LABELS } from '@/lib/utils';
import { Download } from 'lucide-react';

export default function SharePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = use(params);
  const [invoice, setInvoice] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/share/${invoiceId}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else { setInvoice(d.invoice); setProfile(d.profile); } })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const handleDownload = async () => {
    const { generateInvoiceHtml, downloadInvoicePdf } = await import('@/lib/pdf');
    downloadInvoicePdf(invoice, profile);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !invoice) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-2xl font-black text-gray-900 mb-2">Document introuvable</p>
        <p className="text-gray-500 text-sm">Ce lien est invalide ou a expiré.</p>
      </div>
    </div>
  );

  const accent = profile?.accent_color || '#1D9E75';
  const currency = profile?.currency || 'EUR';
  const locale = profile?.language === 'en' ? 'en-GB' : 'fr-FR';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  const clientName = invoice.client?.name || invoice.client_name_override || 'Client';
  const docLabel = DOC_LABELS[invoice.document_type as keyof typeof DOC_LABELS] || 'Facture';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div style={{ background: accent }} className="h-1.5 w-full" />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              {profile?.logo_url && (
                <img src={profile.logo_url} alt="logo" className="h-12 max-w-[120px] object-contain mb-3" />
              )}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{docLabel}</p>
              <p className="text-3xl font-black text-gray-900">{invoice.number}</p>
            </div>
            <button
              onClick={handleDownload}
              style={{ background: accent }}
              className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              <Download size={15} />
              Télécharger
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">De</p>
              <p className="font-bold text-gray-900">{profile?.company_name || ''}</p>
              {profile?.siret && <p className="text-xs text-gray-500">SIRET {profile.siret}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Pour</p>
              <p className="font-bold text-gray-900">{clientName}</p>
              {invoice.client?.email && <p className="text-xs text-gray-500">{invoice.client.email}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Date d'émission</p>
              <p className="font-semibold text-gray-900">{formatDate(invoice.issue_date, locale)}</p>
            </div>
            {invoice.due_date && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Échéance</p>
                <p className="font-semibold text-gray-900">{formatDate(invoice.due_date, locale)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Prestations</h3>
          <div className="space-y-2">
            {(invoice.items || []).map((item: any, idx: number) => (
              <div key={item.id || idx} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{item.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.quantity} × {fmt(item.unit_price)} · TVA {item.vat_rate}%</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{fmt(item.total)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Sous-total HT</span><span className="font-semibold">{fmt(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>TVA</span><span className="font-semibold">{fmt(invoice.vat_amount)}</span>
            </div>
            <div className="flex justify-between items-center rounded-xl px-4 py-3 text-white mt-2" style={{ background: '#1a1a2e' }}>
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">Total TTC</span>
              <span className="text-2xl font-black" style={{ color: accent }}>{fmt(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-400 mb-1.5">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Bank info */}
        {profile?.iban && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>Coordonnées bancaires</p>
            <div className="text-sm text-gray-700 space-y-1">
              {profile.bank_name && <p><span className="text-gray-400">Banque :</span> {profile.bank_name}</p>}
              <p><span className="text-gray-400">IBAN :</span> {profile.iban}</p>
              {profile.bic && <p><span className="text-gray-400">BIC :</span> {profile.bic}</p>}
            </div>
          </div>
        )}

        {/* Pay online */}
        {invoice.stripe_payment_url && (
          <a
            href={invoice.stripe_payment_url}
            style={{ background: accent }}
            className="flex items-center justify-center gap-2 text-white text-base font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity"
          >
            Payer {fmt(invoice.total)} en ligne →
          </a>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Document généré avec <strong>Factu.me</strong>
        </p>
      </div>
    </div>
  );
}
