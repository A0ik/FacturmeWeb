'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { formatCurrency } from '@/lib/utils';
import {
  Calculator,
  FileCheck,
  Euro,
  TrendingUp,
  Calendar,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const QUARTERS = [
  { label: 'T1 (Jan–Mar)', value: 1, months: [0, 1, 2] },
  { label: 'T2 (Avr–Jui)', value: 2, months: [3, 4, 5] },
  { label: 'T3 (Jul–Sep)', value: 3, months: [6, 7, 8] },
  { label: 'T4 (Oct–Déc)', value: 4, months: [9, 10, 11] },
];

const COTISATION_RATE = 0.22;

function getQuarterMonths(quarter: number): number[] {
  return QUARTERS.find((q) => q.value === quarter)?.months ?? [];
}

function invoiceBelongsToQuarterYear(
  dateStr: string | undefined,
  year: number,
  quarter: number
): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (d.getFullYear() !== year) return false;
  return getQuarterMonths(quarter).includes(d.getMonth());
}

function invoiceBelongsToYear(dateStr: string | undefined, year: number): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getFullYear() === year;
}

export default function AccountingPage() {
  const { profile } = useAuthStore();
  const { invoices } = useDataStore();

  const currentYear = new Date().getFullYear();
  const currentQuarterValue = Math.ceil((new Date().getMonth() + 1) / 3);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarterValue);

  const isAutoEntrepreneur = profile?.legal_status === 'auto-entrepreneur';

  // ── TVA ──────────────────────────────────────────────────────────────────────

  const paidInvoicesInPeriod = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          inv.status === 'paid' &&
          (inv.document_type === 'invoice' || !inv.document_type) &&
          invoiceBelongsToQuarterYear(inv.paid_at || inv.issue_date, selectedYear, selectedQuarter)
      ),
    [invoices, selectedYear, selectedQuarter]
  );

  const tvaCollectee = useMemo(
    () => paidInvoicesInPeriod.reduce((sum, inv) => sum + (inv.vat_amount || 0), 0),
    [paidInvoicesInPeriod]
  );

  // TVA déductible would come from expenses — we use 0 as placeholder
  const tvaDeductible = 0;
  const tvaNetteAPayer = Math.max(0, tvaCollectee - tvaDeductible);

  // ── URSSAF quarterly revenue ──────────────────────────────────────────────────

  const quarterlyCA = useMemo(
    () =>
      QUARTERS.map((q) => {
        const ca = invoices
          .filter(
            (inv) =>
              inv.status === 'paid' &&
              (inv.document_type === 'invoice' || !inv.document_type) &&
              invoiceBelongsToQuarterYear(inv.paid_at || inv.issue_date, selectedYear, q.value)
          )
          .reduce((sum, inv) => sum + inv.subtotal, 0);
        return { ...q, ca, cotisation: ca * COTISATION_RATE };
      }),
    [invoices, selectedYear]
  );

  // ── Annual summary ─────────────────────────────────────────────────────────

  const annualPaidInvoices = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          inv.status === 'paid' &&
          (inv.document_type === 'invoice' || !inv.document_type) &&
          invoiceBelongsToYear(inv.paid_at || inv.issue_date, selectedYear)
      ),
    [invoices, selectedYear]
  );

  const annualCA = useMemo(
    () => annualPaidInvoices.reduce((sum, inv) => sum + inv.subtotal, 0),
    [annualPaidInvoices]
  );

  const avgMonthlyCA = annualCA / 12;

  const bestMonth = useMemo(() => {
    const byMonth: Record<string, number> = {};
    annualPaidInvoices.forEach((inv) => {
      const dateRef = inv.paid_at || inv.issue_date;
      if (!dateRef) return;
      const key = dateRef.slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + inv.subtotal;
    });
    const sorted = Object.entries(byMonth).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return null;
    const [monthKey, amount] = sorted[0];
    const label = new Date(monthKey + '-01').toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    return { label, amount };
  }, [annualPaidInvoices]);

  // ── PDF export (print window) ─────────────────────────────────────────────

  const handleExportTVA = () => {
    const quarterLabel = QUARTERS.find((q) => q.value === selectedQuarter)?.label ?? '';
    const rows = paidInvoicesInPeriod
      .map(
        (inv) =>
          `<tr><td>${inv.number}</td><td>${inv.client?.name || inv.client_name_override || '-'}</td><td>${formatCurrency(inv.subtotal)}</td><td>${formatCurrency(inv.vat_amount || 0)}</td></tr>`
      )
      .join('');

    const html = `
      <html><head><title>Déclaration TVA – ${quarterLabel} ${selectedYear}</title>
      <style>body{font-family:Arial,sans-serif;margin:40px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}tfoot td{font-weight:bold;background:#f0fdf4}</style>
      </head><body>
      <h1>Déclaration TVA – ${quarterLabel} ${selectedYear}</h1>
      <p>Entreprise : <strong>${profile?.company_name || '-'}</strong></p>
      <table><thead><tr><th>N° Facture</th><th>Client</th><th>HT</th><th>TVA collectée</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2">Total</td><td>${formatCurrency(paidInvoicesInPeriod.reduce((s, i) => s + i.subtotal, 0))}</td><td>${formatCurrency(tvaCollectee)}</td></tr></tfoot>
      </table>
      <p style="margin-top:24px">TVA déductible : <strong>${formatCurrency(tvaDeductible)}</strong></p>
      <p>TVA nette à payer : <strong>${formatCurrency(tvaNetteAPayer)}</strong></p>
      </body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <Header title="Comptabilité" />

      {/* Year / Quarter selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-gray-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {QUARTERS.map((q) => (
            <button
              key={q.value}
              onClick={() => setSelectedQuarter(q.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedQuarter === q.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              T{q.value}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 1 : TVA ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calculator size={16} className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Déclaration TVA</h2>
          </div>
          <button
            onClick={handleExportTVA}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors"
          >
            <Download size={13} />
            Exporter PDF
          </button>
        </div>

        {isAutoEntrepreneur && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Exonération de TVA</p>
              <p className="text-xs text-amber-700 mt-0.5">
                En tant qu&apos;auto-entrepreneur, vous bénéficiez de la franchise en base de TVA — vous n&apos;avez pas à déclarer ni collecter la TVA (sous conditions de seuil).
              </p>
            </div>
          </div>
        )}

        {/* TVA stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* TVA collectée */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white">
            <div className="absolute -top-3 -right-3 w-16 h-16 bg-white/5 rounded-full" />
            <div className="flex items-center gap-2 mb-3">
              <Euro size={14} className="text-white/60" />
              <p className="text-xs text-white/60 font-semibold uppercase tracking-wide">TVA collectée</p>
            </div>
            <p className="text-2xl font-black tracking-tight">{formatCurrency(tvaCollectee)}</p>
            <p className="text-xs text-white/50 mt-1">
              {QUARTERS.find((q) => q.value === selectedQuarter)?.label} {selectedYear}
            </p>
          </div>

          {/* TVA déductible */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp size={12} className="text-blue-500" />
              </div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">TVA déductible</p>
            </div>
            <p className="text-2xl font-black text-gray-900">{formatCurrency(tvaDeductible)}</p>
            <p className="text-xs text-gray-400 mt-1">sur achats &amp; charges</p>
          </div>

          {/* TVA nette */}
          <div className={`rounded-2xl p-5 border shadow-sm ${tvaNetteAPayer > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${tvaNetteAPayer > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                <CheckCircle2 size={12} className={tvaNetteAPayer > 0 ? 'text-red-500' : 'text-green-500'} />
              </div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${tvaNetteAPayer > 0 ? 'text-red-400' : 'text-green-500'}`}>
                TVA nette à payer
              </p>
            </div>
            <p className={`text-2xl font-black ${tvaNetteAPayer > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {formatCurrency(tvaNetteAPayer)}
            </p>
            <p className={`text-xs mt-1 ${tvaNetteAPayer > 0 ? 'text-red-400' : 'text-green-500'}`}>
              collectée − déductible
            </p>
          </div>
        </div>

        {/* TVA invoice table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-700">
              Factures payées — {QUARTERS.find((q) => q.value === selectedQuarter)?.label} {selectedYear}
            </p>
          </div>
          {paidInvoicesInPeriod.length === 0 ? (
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
                    <th className="text-right px-5 py-3">Montant HT</th>
                    <th className="text-right px-5 py-3">TVA</th>
                    <th className="text-right px-5 py-3">TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paidInvoicesInPeriod.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-700">{inv.number}</td>
                      <td className="px-5 py-3 text-gray-700 truncate max-w-[160px]">
                        {inv.client?.name || inv.client_name_override || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(inv.paid_at || inv.issue_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatCurrency(inv.subtotal)}</td>
                      <td className="px-5 py-3 text-right text-primary font-semibold">{formatCurrency(inv.vat_amount || 0)}</td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900">{formatCurrency(inv.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold text-gray-800">
                    <td colSpan={3} className="px-5 py-3 text-xs uppercase tracking-wide">Total</td>
                    <td className="px-5 py-3 text-right">{formatCurrency(paidInvoicesInPeriod.reduce((s, i) => s + i.subtotal, 0))}</td>
                    <td className="px-5 py-3 text-right text-primary">{formatCurrency(tvaCollectee)}</td>
                    <td className="px-5 py-3 text-right">{formatCurrency(paidInvoicesInPeriod.reduce((s, i) => s + i.total, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 2 : URSSAF ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileCheck size={16} className="text-blue-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Déclaration URSSAF</h2>
        </div>

        {isAutoEntrepreneur ? (
          <>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Déclaration trimestrielle de CA</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  En tant qu&apos;auto-entrepreneur, vous déclarez votre chiffre d&apos;affaires chaque trimestre sur le portail URSSAF. Taux de cotisation standard : <strong>22%</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {quarterlyCA.map((q) => (
                <div
                  key={q.value}
                  className={`rounded-2xl p-5 border transition-all ${
                    q.value === selectedQuarter
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-white border-gray-100 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className={`text-xs font-bold uppercase tracking-wide ${q.value === selectedQuarter ? 'text-blue-100' : 'text-gray-400'}`}>
                      {q.label}
                    </p>
                    {q.value === selectedQuarter && (
                      <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full">
                        Actuel
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <p className={`text-[10px] ${q.value === selectedQuarter ? 'text-blue-200' : 'text-gray-400'}`}>CA réalisé</p>
                      <p className={`text-lg font-black ${q.value === selectedQuarter ? 'text-white' : 'text-gray-900'}`}>
                        {formatCurrency(q.ca)}
                      </p>
                    </div>
                    <div>
                      <p className={`text-[10px] ${q.value === selectedQuarter ? 'text-blue-200' : 'text-gray-400'}`}>
                        Taux cotisation ({(COTISATION_RATE * 100).toFixed(0)}%)
                      </p>
                      <p className={`text-sm font-bold ${q.value === selectedQuarter ? 'text-blue-100' : 'text-gray-600'}`}>
                        {formatCurrency(q.cotisation)}
                      </p>
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
              <ExternalLink size={14} />
              Déclarer sur autoentrepreneur.urssaf.fr
            </a>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <FileCheck size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Section dédiée aux auto-entrepreneurs</p>
            <p className="text-xs text-gray-400 mt-1">
              Cette section de déclaration trimestrielle de CA URSSAF est réservée aux auto-entrepreneurs.
            </p>
            <a
              href="https://www.urssaf.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:underline mt-3"
            >
              Accéder à urssaf.fr <ExternalLink size={11} />
            </a>
          </div>
        )}
      </section>

      {/* ── Section 3 : Résumé annuel ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
            <TrendingUp size={16} className="text-purple-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Résumé annuel {selectedYear}</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* CA total */}
          <div className="col-span-2 lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />
            <p className="text-xs text-white/50 font-semibold uppercase tracking-wide mb-2">CA total</p>
            <p className="text-2xl font-black tracking-tight">{formatCurrency(annualCA)}</p>
            <p className="text-xs text-white/40 mt-1">hors taxes · {selectedYear}</p>
          </div>

          {/* CA moyen/mois */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center">
                <Calendar size={12} className="text-purple-500" />
              </div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Moy./mois</p>
            </div>
            <p className="text-xl font-black text-gray-900">{formatCurrency(avgMonthlyCA)}</p>
            <p className="text-xs text-gray-400 mt-1">par mois en moyenne</p>
          </div>

          {/* Meilleur mois */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp size={12} className="text-amber-500" />
              </div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Meilleur mois</p>
            </div>
            {bestMonth ? (
              <>
                <p className="text-xl font-black text-gray-900">{formatCurrency(bestMonth.amount)}</p>
                <p className="text-xs text-gray-400 mt-1 capitalize">{bestMonth.label}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>

          {/* Nb factures payées */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={12} className="text-green-500" />
              </div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Factures payées</p>
            </div>
            <p className="text-xl font-black text-gray-900">{annualPaidInvoices.length}</p>
            <p className="text-xs text-gray-400 mt-1">en {selectedYear}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
