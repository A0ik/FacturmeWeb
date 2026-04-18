'use client';

import { use, useEffect, useState } from 'react';
import { formatCurrency, formatDate, DOC_LABELS } from '@/lib/utils';
import {
  FileText, Download, CreditCard, CheckCircle2, Clock,
  AlertTriangle, ChevronRight, Building2, Mail, Phone,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
  sent:     { label: 'En attente',  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100',   icon: Clock },
  overdue:  { label: 'En retard',   color: 'text-red-600',    bg: 'bg-red-50 border-red-100',     icon: AlertTriangle },
  paid:     { label: 'Payée',       color: 'text-green-600',  bg: 'bg-green-50 border-green-100', icon: CheckCircle2 },
  accepted: { label: 'Accepté',     color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', icon: CheckCircle2 },
  refused:  { label: 'Refusé',      color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', icon: AlertTriangle },
};

export default function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<{ client: any; profile: any; invoices: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    fetch(`/api/client-portal/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <p className="text-xl font-black text-gray-900 mb-2">Lien invalide</p>
        <p className="text-gray-500 text-sm">Ce portail client est introuvable ou a été désactivé.</p>
      </div>
    </div>
  );

  const { client, profile, invoices } = data;
  const accent = profile?.accent_color || '#1D9E75';
  const locale = profile?.language === 'en' ? 'en-GB' : 'fr-FR';
  const fmt = (n: number) => formatCurrency(n, profile?.currency || 'EUR');

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s: number, i: any) => s + i.total, 0);
  const totalPending = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s: number, i: any) => s + i.total, 0);

  const handleDownload = async (inv: any) => {
    const { downloadInvoicePdf } = await import('@/lib/pdf');
    await downloadInvoicePdf(inv, profile);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top accent bar */}
      <div style={{ background: accent }} className="h-1.5 w-full" />

      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="logo" className="h-10 max-w-[100px] object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: accent }}>
                {profile?.company_name?.[0] || 'F'}
              </div>
            )}
            <div>
              <p className="font-black text-gray-900">{profile?.company_name}</p>
              {profile?.email && <p className="text-xs text-gray-500">{profile.email}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Portail client</p>
            <p className="text-sm font-bold text-gray-900">{client.name}</p>
          </div>
        </div>

        {/* Client card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0" style={{ background: accent }}>
              {client.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-gray-900">{client.name}</h1>
              <div className="flex flex-wrap gap-3 mt-1.5">
                {client.email && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Mail size={11} /> {client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone size={11} /> {client.phone}
                  </span>
                )}
                {client.city && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Building2 size={11} /> {client.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Documents</p>
              <p className="text-xl font-black text-gray-900">{invoices.length}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600 mb-1">Payé</p>
              <p className="text-lg font-black text-green-700">{fmt(totalPaid)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-600 mb-1">En attente</p>
              <p className="text-lg font-black text-amber-700">{fmt(totalPending)}</p>
            </div>
          </div>
        </div>

        {/* Invoice list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Tous vos documents</h2>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Aucun document pour le moment</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {invoices.map((inv: any) => {
                const conf = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.sent;
                const Icon = conf.icon;
                const docLabel = DOC_LABELS[inv.document_type as keyof typeof DOC_LABELS] || 'Facture';
                const isOverdue = inv.status === 'overdue';
                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelected(selected?.id === inv.id ? null : inv)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${conf.bg}`}>
                      <Icon size={15} className={conf.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">{inv.number}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${conf.bg} ${conf.color}`}>
                          {conf.label}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">{docLabel}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(inv.issue_date, locale)}
                        {inv.due_date && ` · Échéance ${formatDate(inv.due_date, locale)}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-black ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                        {fmt(inv.total)}
                      </p>
                      <ChevronRight size={14} className={`text-gray-300 ml-auto mt-0.5 transition-transform ${selected?.id === inv.id ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel for selected invoice */}
        {selected && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{selected.number}</p>
                <p className="text-xs text-gray-400">{DOC_LABELS[selected.document_type as keyof typeof DOC_LABELS] || 'Facture'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(selected)}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors"
                >
                  <Download size={13} /> Télécharger
                </button>
                {selected.stripe_payment_url && selected.status !== 'paid' && (
                  <a
                    href={selected.stripe_payment_url}
                    style={{ background: accent }}
                    className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    <CreditCard size={13} /> Payer en ligne
                  </a>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="p-5">
              <div className="space-y-2 mb-4">
                {(selected.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.quantity} × {fmt(item.unit_price)} · TVA {item.vat_rate}%
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">{fmt(item.total)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 border-t border-gray-100 pt-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Sous-total HT</span>
                  <span className="font-semibold">{fmt(selected.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>TVA</span>
                  <span className="font-semibold">{fmt(selected.vat_amount)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-900 rounded-xl px-4 py-3 mt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total TTC</span>
                  <span className="text-xl font-black" style={{ color: accent }}>{fmt(selected.total)}</span>
                </div>
              </div>

              {/* Signature */}
              {selected.client_signature_url && (
                <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} className="text-green-600" />
                    <p className="text-xs font-bold text-green-700">
                      Signé par {selected.signed_by} le {selected.signed_at ? new Date(selected.signed_at).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                  <img
                    src={selected.client_signature_url}
                    alt="Signature"
                    className="h-16 max-w-[200px] border border-green-200 rounded-lg bg-white p-1 object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-6">
          Portail client sécurisé · Propulsé par <strong>Factu.me</strong>
        </p>
      </div>
    </div>
  );
}
