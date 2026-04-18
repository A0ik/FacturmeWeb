'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  Calculator, FileCheck, Euro, TrendingUp, Calendar, Download,
  ExternalLink, AlertCircle, CheckCircle2, TrendingDown, BarChart2,
  AlertTriangle, FileText, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const QUARTERS = [
  { label: 'T1 (Jan–Mar)', value: 1, months: [0, 1, 2] },
  { label: 'T2 (Avr–Jun)', value: 2, months: [3, 4, 5] },
  { label: 'T3 (Jul–Sep)', value: 3, months: [6, 7, 8] },
  { label: 'T4 (Oct–Déc)', value: 4, months: [9, 10, 11] },
];

const COTISATION_RATES: Record<string, number> = {
  'auto-entrepreneur': 0.22,
  'sasu': 0.45,
  'eurl': 0.45,
  'sarl': 0.25,
  'sas': 0.25,
  'ei': 0.44,
};

const AE_THRESHOLD_SERVICES = 77700;
const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function getQuarterMonths(q: number) {
  return QUARTERS.find((x) => x.value === q)?.months ?? [];
}
function inQuarterYear(dateStr: string | undefined, year: number, q: number) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getFullYear() === year && getQuarterMonths(q).includes(d.getMonth());
}
function inYear(dateStr: string | undefined, year: number) {
  if (!dateStr) return false;
  return new Date(dateStr).getFullYear() === year;
}

export default function AccountingPage() {
  const { profile, user } = useAuthStore();
  const { invoices } = useDataStore();

  const currentYear = new Date().getFullYear();
  const currentQ = Math.ceil((new Date().getMonth() + 1) / 3);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQ, setSelectedQ] = useState(currentQ);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'tva' | 'urssaf' | 'annual'>('tva');

  const isAE = profile?.legal_status === 'auto-entrepreneur';
  const cotisationRate = COTISATION_RATES[profile?.legal_status || ''] ?? 0.22;

  useEffect(() => {
    if (!user) return;
    getSupabaseClient()
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => setExpenses(data || []));
  }, [user]);

  const paidInPeriod = useMemo(
    () => invoices.filter(
      (inv) =>
        inv.status === 'paid' &&
        (inv.document_type === 'invoice' || !inv.document_type) &&
        inQuarterYear(inv.paid_at || inv.issue_date, selectedYear, selectedQ)
    ),
    [invoices, selectedYear, selectedQ]
  );

  const tvaCollectee = useMemo(
    () => paidInPeriod.reduce((s, i) => s + (i.vat_amount || 0), 0),
    [paidInPeriod]
  );

  const tvaDeductible = useMemo(
    () => expenses
      .filter((e) => inQuarterYear(e.date, selectedYear, selectedQ))
      .reduce((s, e) => s + (e.vat_amount || 0), 0),
    [expenses, selectedYear, selectedQ]
  );

  const tvaAPayer = Math.max(0, tvaCollectee - tvaDeductible);
  const tvaCreditReportable = tvaDeductible > tvaCollectee ? tvaDeductible - tvaCollectee : 0;

  const quarterlyCA = useMemo(
    () => QUARTERS.map((q) => {
      const ca = invoices
        .filter((inv) =>
          inv.status === 'paid' &&
          (inv.document_type === 'invoice' || !inv.document_type) &&
          inQuarterYear(inv.paid_at || inv.issue_date, selectedYear, q.value)
        )
        .reduce((s, i) => s + i.subtotal, 0);
      return { ...q, ca, cotisation: ca * cotisationRate };
    }),
    [invoices, selectedYear, cotisationRate]
  );

  const annualPaidInvoices = useMemo(
    () => invoices.filter((inv) =>
      inv.status === 'paid' &&
      (inv.document_type === 'invoice' || !inv.document_type) &&
      inYear(inv.paid_at || inv.issue_date, selectedYear)
    ),
    [invoices, selectedYear]
  );

  const annualCA = useMemo(
    () => annualPaidInvoices.reduce((s, i) => s + i.subtotal, 0),
    [annualPaidInvoices]
  );

  const annualExpenses = useMemo(
    () => expenses.filter((e) => inYear(e.date, selectedYear)).reduce((s, e) => s + e.amount, 0),
    [expenses, selectedYear]
  );

  const resultatBrut = annualCA - annualExpenses;
  const avgMonthlyCA = annualCA / 12;

  const bestMonth = useMemo(() => {
    const byMonth: Record<string, number> = {};
    annualPaidInvoices.forEach((inv) => {
      const ref = inv.paid_at || inv.issue_date;
      if (!ref) return;
      const key = ref.slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + inv.subtotal;
    });
    const sorted = Object.entries(byMonth).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return null;
    const [key, amount] = sorted[0];
    return { label: new Date(key + '-01').toLocaleString('fr-FR', { month: 'long', year: 'numeric' }), amount };
  }, [annualPaidInvoices]);

  const monthlyData = useMemo(
    () => MONTH_LABELS.map((label, i) => {
      const ca = invoices
        .filter((inv) =>
          inv.status === 'paid' &&
          (inv.document_type === 'invoice' || !inv.document_type) &&
          new Date(inv.paid_at || inv.issue_date || '').getFullYear() === selectedYear &&
          new Date(inv.paid_at || inv.issue_date || '').getMonth() === i
        )
        .reduce((s, inv) => s + inv.subtotal, 0);
      const charges = expenses
        .filter((e) => new Date(e.date).getFullYear() === selectedYear && new Date(e.date).getMonth() === i)
        .reduce((s, e) => s + e.amount, 0);
      return { label, ca, charges };
    }),
    [invoices, expenses, selectedYear]
  );

  const aeProgress = Math.min(100, (annualCA / AE_THRESHOLD_SERVICES) * 100);
  const aeWarning = annualCA > AE_THRESHOLD_SERVICES * 0.8;

  const handleExportTVA = () => {
    const qLabel = QUARTERS.find((q) => q.value === selectedQ)?.label ?? '';
    const rows = paidInPeriod.map((inv) =>
      `<tr><td>${inv.number}</td><td>${inv.client?.name || inv.client_name_override || '-'}</td><td>${formatCurrency(inv.subtotal)}</td><td>${formatCurrency(inv.vat_amount || 0)}</td><td>${formatCurrency(inv.total)}</td></tr>`
    ).join('');
    const expRows = expenses
      .filter((e) => inQuarterYear(e.date, selectedYear, selectedQ))
      .map((e) => `<tr><td>${e.vendor}</td><td>${new Date(e.date).toLocaleDateString('fr-FR')}</td><td>${formatCurrency(e.amount)}</td><td>${formatCurrency(e.vat_amount || 0)}</td></tr>`)
      .join('');

    const html = `<html><head><title>Déclaration TVA – ${qLabel} ${selectedYear}</title>
      <style>body{font-family:Arial,sans-serif;margin:40px;color:#111}h1{font-size:20px}h2{font-size:15px;margin-top:24px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:7px;text-align:left}th{background:#f5f5f5}tfoot td{font-weight:bold}</style>
      </head><body>
      <h1>Déclaration TVA – ${qLabel} ${selectedYear}</h1>
      <p>Société : <strong>${profile?.company_name || '-'}</strong></p>
      <h2>Ventes (TVA collectée)</h2>
      <table><thead><tr><th>N° Facture</th><th>Client</th><th>HT</th><th>TVA</th><th>TTC</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2">Total</td><td>${formatCurrency(paidInPeriod.reduce((s, i) => s + i.subtotal, 0))}</td><td>${formatCurrency(tvaCollectee)}</td><td>${formatCurrency(paidInPeriod.reduce((s, i) => s + i.total, 0))}</td></tr></tfoot></table>
      ${expRows ? `<h2>Achats (TVA déductible)</h2><table><thead><tr><th>Fournisseur</th><th>Date</th><th>TTC</th><th>TVA récupérée</th></tr></thead><tbody>${expRows}</tbody><tfoot><tr><td colspan="2">Total</td><td>—</td><td>${formatCurrency(tvaDeductible)}</td></tr></tfoot></table>` : ''}
      <p style="margin-top:24px;font-size:16px"><strong>TVA nette à payer : ${formatCurrency(tvaAPayer)}</strong></p>
      ${tvaCreditReportable > 0 ? `<p>Crédit de TVA reportable : <strong>${formatCurrency(tvaCreditReportable)}</strong></p>` : ''}
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <Header title="Comptabilité" />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={15} className="text-gray-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {QUARTERS.map((q) => (
              <button
                key={q.value}
                onClick={() => setSelectedQ(q.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedQ === q.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}
              >
                T{q.value}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportTVA}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors"
          >
            <Download size={13} /> Exporter PDF
          </button>
          <a
            href="/api/export/fec"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors"
          >
            <FileText size={13} /> Export FEC
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        {([
          { id: 'tva', label: 'Déclaration TVA', icon: Calculator },
          { id: 'urssaf', label: 'URSSAF', icon: FileCheck },
          { id: 'annual', label: 'Bilan annuel', icon: TrendingUp },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── TVA TAB ── */}
      {activeTab === 'tva' && (
        <div className="space-y-4">
          {isAE && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Franchise en base de TVA</p>
                <p className="text-xs text-amber-700 mt-0.5">En tant qu&apos;auto-entrepreneur sous le seuil de franchise, vous n&apos;êtes pas assujetti à la TVA. Si vous avez dépassé le seuil, consultez votre expert-comptable.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white">
              <div className="absolute -top-3 -right-3 w-16 h-16 bg-white/5 rounded-full" />
              <div className="flex items-center gap-2 mb-2">
                <Euro size={13} className="text-white/60" />
                <p className="text-xs text-white/60 font-semibold uppercase tracking-wide">TVA collectée</p>
              </div>
              <p className="text-2xl font-black">{formatCurrency(tvaCollectee)}</p>
              <p className="text-xs text-white/50 mt-1">{QUARTERS.find((q) => q.value === selectedQ)?.label} {selectedYear}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                  <TrendingDown size={12} className="text-blue-500" />
                </div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">TVA déductible</p>
              </div>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(tvaDeductible)}</p>
              <p className="text-xs text-gray-400 mt-1">sur dépenses du trimestre</p>
            </div>

            <div className={`rounded-2xl p-5 border shadow-sm ${tvaAPayer > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${tvaAPayer > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  <CheckCircle2 size={12} className={tvaAPayer > 0 ? 'text-red-500' : 'text-green-500'} />
                </div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${tvaAPayer > 0 ? 'text-red-400' : 'text-green-500'}`}>TVA à payer</p>
              </div>
              <p className={`text-2xl font-black ${tvaAPayer > 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(tvaAPayer)}</p>
              <p className={`text-xs mt-1 ${tvaAPayer > 0 ? 'text-red-400' : 'text-green-500'}`}>collectée − déductible</p>
            </div>

            {tvaCreditReportable > 0 ? (
              <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp size={12} className="text-purple-500" />
                  </div>
                  <p className="text-xs text-purple-500 font-semibold uppercase tracking-wide">Crédit TVA</p>
                </div>
                <p className="text-2xl font-black text-purple-700">{formatCurrency(tvaCreditReportable)}</p>
                <p className="text-xs text-purple-400 mt-1">reportable prochain trimestre</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center">
                    <BarChart2 size={12} className="text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Taux effectif</p>
                </div>
                <p className="text-2xl font-black text-gray-900">
                  {paidInPeriod.reduce((s, i) => s + i.subtotal, 0) > 0
                    ? ((tvaCollectee / paidInPeriod.reduce((s, i) => s + i.subtotal, 0)) * 100).toFixed(1)
                    : '0.0'}%
                </p>
                <p className="text-xs text-gray-400 mt-1">taux TVA moyen</p>
              </div>
            )}
          </div>

          {/* Invoice table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-700">
                Factures payées — {QUARTERS.find((q) => q.value === selectedQ)?.label} {selectedYear}
              </p>
              <span className="text-xs text-gray-400">{paidInPeriod.length} facture{paidInPeriod.length !== 1 ? 's' : ''}</span>
            </div>
            {paidInPeriod.length === 0 ? (
              <div className="text-center py-10">
                <FileCheck size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucune facture payée sur cette période</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Numéro</th>
                      <th className="text-left px-5 py-3">Client</th>
                      <th className="text-left px-5 py-3">Date</th>
                      <th className="text-right px-5 py-3">HT</th>
                      <th className="text-right px-5 py-3">TVA</th>
                      <th className="text-right px-5 py-3">TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paidInPeriod.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-700">{inv.number}</td>
                        <td className="px-5 py-3 text-gray-700 truncate max-w-[160px]">{inv.client?.name || inv.client_name_override || <span className="text-gray-400">—</span>}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{new Date(inv.paid_at || inv.issue_date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatCurrency(inv.subtotal)}</td>
                        <td className="px-5 py-3 text-right text-primary font-semibold">{formatCurrency(inv.vat_amount || 0)}</td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900">{formatCurrency(inv.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold text-gray-800">
                      <td colSpan={3} className="px-5 py-3 text-xs uppercase tracking-wide">Total</td>
                      <td className="px-5 py-3 text-right">{formatCurrency(paidInPeriod.reduce((s, i) => s + i.subtotal, 0))}</td>
                      <td className="px-5 py-3 text-right text-primary">{formatCurrency(tvaCollectee)}</td>
                      <td className="px-5 py-3 text-right">{formatCurrency(paidInPeriod.reduce((s, i) => s + i.total, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Expenses TVA table */}
          {expenses.filter((e) => inQuarterYear(e.date, selectedYear, selectedQ) && e.vat_amount > 0).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50">
                <p className="text-sm font-bold text-gray-700">Dépenses — TVA déductible</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Fournisseur</th>
                      <th className="text-left px-5 py-3">Catégorie</th>
                      <th className="text-left px-5 py-3">Date</th>
                      <th className="text-right px-5 py-3">TTC</th>
                      <th className="text-right px-5 py-3">TVA récupérée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses
                      .filter((e) => inQuarterYear(e.date, selectedYear, selectedQ) && e.vat_amount > 0)
                      .map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 font-semibold text-gray-700">{e.vendor}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs capitalize">{e.category}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                          <td className="px-5 py-3 text-right text-gray-900">{formatCurrency(e.amount)}</td>
                          <td className="px-5 py-3 text-right text-blue-600 font-semibold">{formatCurrency(e.vat_amount)}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold text-gray-800">
                      <td colSpan={4} className="px-5 py-3 text-xs uppercase tracking-wide">Total TVA déductible</td>
                      <td className="px-5 py-3 text-right text-blue-600">{formatCurrency(tvaDeductible)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── URSSAF TAB ── */}
      {activeTab === 'urssaf' && (
        <div className="space-y-4">
          {isAE ? (
            <>
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Déclaration trimestrielle de CA</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Taux de cotisation : <strong>{(cotisationRate * 100).toFixed(0)}%</strong> (activité de services BNC/BIC).
                    Déclarez chaque trimestre sur autoentrepreneur.urssaf.fr
                  </p>
                </div>
              </div>

              {aeWarning && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Attention — Seuil de franchise proche</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Votre CA annuel ({formatCurrency(annualCA)}) approche du seuil de {formatCurrency(AE_THRESHOLD_SERVICES)}.
                      Au-delà, vous perdez le statut auto-entrepreneur.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Seuil auto-entrepreneur {selectedYear}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Services BNC/BIC : {formatCurrency(AE_THRESHOLD_SERVICES)}</p>
                  </div>
                  <p className={`text-2xl font-black ${aeProgress > 80 ? 'text-red-500' : aeProgress > 60 ? 'text-amber-500' : 'text-primary'}`}>
                    {aeProgress.toFixed(0)}%
                  </p>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${aeProgress > 80 ? 'bg-gradient-to-r from-red-400 to-red-500' : aeProgress > 60 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-primary to-primary-dark'}`}
                    style={{ width: `${Math.min(100, aeProgress)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                  <span>{formatCurrency(annualCA)}</span>
                  <span>{formatCurrency(AE_THRESHOLD_SERVICES)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {quarterlyCA.map((q) => (
                  <div
                    key={q.value}
                    className={`rounded-2xl p-5 border transition-all ${q.value === selectedQ ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border-gray-100 shadow-sm'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-xs font-bold uppercase tracking-wide ${q.value === selectedQ ? 'text-blue-100' : 'text-gray-400'}`}>{q.label}</p>
                      {q.value === selectedQ && <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full">Actuel</span>}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className={`text-[10px] ${q.value === selectedQ ? 'text-blue-200' : 'text-gray-400'}`}>CA réalisé</p>
                        <p className={`text-lg font-black ${q.value === selectedQ ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(q.ca)}</p>
                      </div>
                      <div>
                        <p className={`text-[10px] ${q.value === selectedQ ? 'text-blue-200' : 'text-gray-400'}`}>Cotisations ({(cotisationRate * 100).toFixed(0)}%)</p>
                        <p className={`text-sm font-bold ${q.value === selectedQ ? 'text-blue-100' : 'text-gray-600'}`}>{formatCurrency(q.cotisation)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="https://www.autoentrepreneur.urssaf.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-3 rounded-xl transition-colors shadow-sm shadow-blue-600/20"
              >
                <ExternalLink size={14} /> Déclarer sur autoentrepreneur.urssaf.fr
              </a>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <FileCheck size={18} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Charges sociales — Estimation</p>
                  <p className="text-xs text-gray-400">Indicatif uniquement, consultez votre expert-comptable</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">CA annuel HT</p>
                  <p className="text-xl font-black text-gray-900">{formatCurrency(annualCA)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 mb-1">Estimation charges (~{(cotisationRate * 100).toFixed(0)}%)</p>
                  <p className="text-xl font-black text-blue-700">{formatCurrency(annualCA * cotisationRate)}</p>
                </div>
              </div>
              <a
                href="https://www.urssaf.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:underline"
              >
                Accéder à urssaf.fr <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── ANNUAL TAB ── */}
      {activeTab === 'annual' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="col-span-2 lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />
              <p className="text-xs text-white/50 font-semibold uppercase tracking-wide mb-2">CA total HT</p>
              <p className="text-2xl font-black tracking-tight">{formatCurrency(annualCA)}</p>
              <p className="text-xs text-white/40 mt-1">{selectedYear} · {annualPaidInvoices.length} factures</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingDown size={12} className="text-red-500" />
                </div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Charges</p>
              </div>
              <p className="text-xl font-black text-gray-900">{formatCurrency(annualExpenses)}</p>
              <p className="text-xs text-gray-400 mt-1">dépenses de l&apos;année</p>
            </div>

            <div className={`rounded-2xl p-5 border shadow-sm ${resultatBrut >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${resultatBrut >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Zap size={12} className={resultatBrut >= 0 ? 'text-green-500' : 'text-red-500'} />
                </div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${resultatBrut >= 0 ? 'text-green-500' : 'text-red-400'}`}>Résultat brut</p>
              </div>
              <p className={`text-xl font-black ${resultatBrut >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(resultatBrut)}</p>
              <p className={`text-xs mt-1 ${resultatBrut >= 0 ? 'text-green-500' : 'text-red-400'}`}>CA − charges</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Calendar size={12} className="text-purple-500" />
                </div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Moy./mois</p>
              </div>
              <p className="text-xl font-black text-gray-900">{formatCurrency(avgMonthlyCA)}</p>
              <p className="text-xs text-gray-400 mt-1">{bestMonth ? `↑ ${bestMonth.label}` : 'aucune donnée'}</p>
            </div>
          </div>

          {/* Monthly chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart2 size={16} className="text-primary" />
              <div>
                <h2 className="font-bold text-gray-900 text-sm">CA vs Charges — mensuel {selectedYear}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Chiffre d&apos;affaires HT encaissé vs dépenses</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barGap={3} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip
                  formatter={(v: any) => formatCurrency(v)}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }}
                />
                <Legend
                  formatter={(v) => v === 'ca' ? 'CA HT encaissé' : 'Charges'}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="ca" name="ca" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                <Bar dataKey="charges" name="charges" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quarterly breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-700">Récapitulatif trimestriel {selectedYear}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Trimestre</th>
                    <th className="text-right px-5 py-3">CA HT</th>
                    <th className="text-right px-5 py-3">TVA collectée</th>
                    <th className="text-right px-5 py-3">Cotisations</th>
                    <th className="text-right px-5 py-3">Résultat net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quarterlyCA.map((q) => {
                    const qExp = expenses
                      .filter((e) => {
                        const d = new Date(e.date);
                        return d.getFullYear() === selectedYear && getQuarterMonths(q.value).includes(d.getMonth());
                      })
                      .reduce((s, e) => s + e.amount, 0);
                    const qTva = invoices
                      .filter((inv) =>
                        inv.status === 'paid' &&
                        (inv.document_type === 'invoice' || !inv.document_type) &&
                        inQuarterYear(inv.paid_at || inv.issue_date, selectedYear, q.value)
                      )
                      .reduce((s, i) => s + (i.vat_amount || 0), 0);
                    const res = q.ca - qExp - q.cotisation;
                    return (
                      <tr key={q.value} className={`hover:bg-gray-50 transition-colors ${q.value === selectedQ ? 'bg-primary/5' : ''}`}>
                        <td className="px-5 py-3 font-semibold text-gray-900">
                          {q.label}
                          {q.value === selectedQ && <span className="ml-2 text-[10px] text-primary font-bold">(actuel)</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900">{formatCurrency(q.ca)}</td>
                        <td className="px-5 py-3 text-right text-primary">{formatCurrency(qTva)}</td>
                        <td className="px-5 py-3 text-right text-red-500">{formatCurrency(q.cotisation)}</td>
                        <td className={`px-5 py-3 text-right font-bold ${res >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(res)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold text-gray-800">
                    <td className="px-5 py-3 text-xs uppercase tracking-wide">Total {selectedYear}</td>
                    <td className="px-5 py-3 text-right">{formatCurrency(annualCA)}</td>
                    <td className="px-5 py-3 text-right text-primary">{formatCurrency(annualPaidInvoices.reduce((s, i) => s + (i.vat_amount || 0), 0))}</td>
                    <td className="px-5 py-3 text-right text-red-500">{formatCurrency(quarterlyCA.reduce((s, q) => s + q.cotisation, 0))}</td>
                    <td className={`px-5 py-3 text-right ${resultatBrut >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(resultatBrut - quarterlyCA.reduce((s, q) => s + q.cotisation, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
