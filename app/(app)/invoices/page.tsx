'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency, formatDateShort, downloadCSV } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Plus, Search, FileText, Download, Zap, AlertTriangle } from 'lucide-react';
import { InvoiceStatus } from '@/types';

const STATUS_OPTS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyée' },
  { value: 'paid', label: 'Payée' },
  { value: 'overdue', label: 'En retard' },
];

const TYPE_OPTS = [
  { value: '', label: 'Tous types' },
  { value: 'invoice', label: 'Facture' },
  { value: 'quote', label: 'Devis' },
  { value: 'credit_note', label: 'Avoir' },
];

export default function InvoicesPage() {
  const { invoices } = useDataStore();
  const sub = useSubscription();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const handleExport = () => {
    const STATUS_LABELS: Record<string, string> = { draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard', accepted: 'Accepté', refused: 'Refusé' };
    const DOC_TYPE_LABELS: Record<string, string> = { invoice: 'Facture', quote: 'Devis', credit_note: 'Avoir' };
    downloadCSV(
      `factures-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Numéro', 'Type', 'Client', 'Date émission', 'Échéance', 'HT', 'TVA', 'TTC', 'Statut', 'Payée le'],
      invoices.map((inv) => [
        inv.number,
        DOC_TYPE_LABELS[inv.document_type] || inv.document_type,
        inv.client?.name || inv.client_name_override || '',
        inv.issue_date,
        inv.due_date || '',
        inv.subtotal,
        inv.vat_amount,
        inv.total,
        STATUS_LABELS[inv.status] || inv.status,
        inv.paid_at || '',
      ])
    );
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch = !q || inv.number.toLowerCase().includes(q) || (inv.client?.name || '').toLowerCase().includes(q) || (inv.client_name_override || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || inv.status === statusFilter;
    const matchType = !typeFilter || (inv.document_type || 'invoice') === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-4">
      {/* Paywall banner — free users near/at limit */}
      {sub.isFree && sub.invoiceCount >= 2 && (
        <Link
          href="/paywall"
          className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 hover:border-amber-300 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            {sub.isAtLimit ? <AlertTriangle size={17} className="text-amber-600" /> : <Zap size={17} className="text-amber-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-800 text-sm">
              {sub.isAtLimit
                ? 'Limite atteinte — passez à Pro pour continuer'
                : `Plan gratuit — ${sub.invoiceCount}/3 factures utilisées`}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {sub.isAtLimit
                ? 'Vous avez utilisé vos 3 factures gratuites.'
                : `Il vous reste ${3 - sub.invoiceCount} facture${3 - sub.invoiceCount > 1 ? 's' : ''} gratuite${3 - sub.invoiceCount > 1 ? 's' : ''}.`}
              {' '}Factures illimitées dès 9€/mois →
            </p>
          </div>
        </Link>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Documents</h1>
        <div className="flex items-center gap-2">
          {invoices.length > 0 && (
            <button onClick={handleExport} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-xl text-sm font-semibold hover:border-gray-300 transition-all" title="Exporter en CSV">
              <Download size={14} />
              <span className="hidden sm:inline">CSV</span>
            </button>
          )}
          <Link href="/invoices/new" className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm">
            <Plus size={16} />
            <span className="hidden sm:inline">Nouveau</span>
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={15} />} />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={STATUS_OPTS} className="w-36" />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={TYPE_OPTS} className="w-32" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-14 px-4">
            <FileText size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400">{search || statusFilter || typeFilter ? 'Aucun résultat' : 'Aucun document'}</p>
            {!search && !statusFilter && !typeFilter && (
              <Link href="/invoices/new" className="mt-3 inline-flex items-center gap-1 text-primary text-sm font-semibold hover:underline">
                <Plus size={14} /> Créer votre première facture
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">N°</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Échéance</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Montant</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => window.location.href = `/invoices/${inv.id}`}>
                      <td className="px-4 py-3 text-sm font-bold text-primary">{inv.number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{inv.client?.name || inv.client_name_override || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDateShort(inv.issue_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{inv.due_date ? formatDateShort(inv.due_date) : '—'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map((inv) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{inv.client?.name || inv.client_name_override || 'Sans client'}</p>
                    <p className="text-xs text-gray-400">{inv.number} · {formatDateShort(inv.issue_date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
