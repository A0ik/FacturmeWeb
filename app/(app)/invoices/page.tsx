'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency, formatDateShort, downloadCSV } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Plus, Search, FileText, Download, Zap, AlertTriangle,
  TrendingUp, Clock, CheckCircle2, XCircle, Eye, Send,
  ChevronRight, Filter, SlidersHorizontal, ArrowUpRight,
  ReceiptText, BadgeDollarSign, Hourglass, ShoppingCart, Truck,
  Wallet, Trash2, CheckSquare, X,
} from 'lucide-react';
import { Invoice, InvoiceStatus } from '@/types';
import { cn } from '@/lib/utils';

const STATUS_OPTS: { value: string; label: string; color: string; dot: string }[] = [
  { value: '',        label: 'Tous',       color: 'bg-gray-100 text-gray-700 hover:bg-gray-200',   dot: 'bg-gray-400' },
  { value: 'draft',   label: 'Brouillon',  color: 'bg-gray-100 text-gray-600 hover:bg-gray-200',   dot: 'bg-gray-400' },
  { value: 'sent',    label: 'Envoyée',    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100',    dot: 'bg-blue-500' },
  { value: 'paid',    label: 'Payée',      color: 'bg-green-50 text-green-700 hover:bg-green-100', dot: 'bg-green-500' },
  { value: 'overdue', label: 'En retard',  color: 'bg-red-50 text-red-700 hover:bg-red-100',       dot: 'bg-red-500' },
];

const TYPE_OPTS = [
  { value: '', label: 'Tous types' },
  { value: 'invoice', label: 'Factures' },
  { value: 'quote', label: 'Devis' },
  { value: 'credit_note', label: 'Avoirs' },
  { value: 'purchase_order', label: 'Bons de cde' },
  { value: 'delivery_note', label: 'Bons de liv.' },
  { value: 'deposit', label: 'Acomptes' },
];

const TYPE_LABELS: Record<string, string> = {
  invoice: 'Facture', quote: 'Devis', credit_note: 'Avoir',
  purchase_order: 'Bon de commande', delivery_note: 'Bon de livraison',
  deposit: 'Acompte',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard', accepted: 'Accepté', refused: 'Refusé',
};

function StatCard({
  label, value, sub, icon: Icon, accent, trend,
}: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string; trend?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border p-4', accent)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-current/60 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-black tracking-tight">{value}</p>
          {sub && <p className="text-xs mt-1 text-current/50">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-xl bg-current/10 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-current" />
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-current/60">
          <ArrowUpRight size={11} />
          {trend}
        </div>
      )}
    </div>
  );
}

function getDocIcon(documentType: string, size: number) {
  if (documentType === 'purchase_order') return <ShoppingCart size={size} className="text-orange-500" />;
  if (documentType === 'delivery_note') return <Truck size={size} className="text-cyan-500" />;
  if (documentType === 'deposit') return <Wallet size={size} className="text-violet-500" />;
  return (
    <FileText
      size={size}
      className={cn(
        documentType === 'quote' ? 'text-blue-500'
        : documentType === 'credit_note' ? 'text-purple-500'
        : 'text-primary',
      )}
    />
  );
}

function getDocBg(documentType: string) {
  if (documentType === 'quote') return 'bg-blue-50';
  if (documentType === 'credit_note') return 'bg-purple-50';
  if (documentType === 'purchase_order') return 'bg-orange-50';
  if (documentType === 'delivery_note') return 'bg-cyan-50';
  if (documentType === 'deposit') return 'bg-violet-50';
  return 'bg-primary-light';
}

export default function InvoicesPage() {
  const router = useRouter();
  const { invoices, deleteInvoice, updateInvoiceStatus } = useDataStore();
  const sub = useSubscription();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Stats
  const paidInvoices  = invoices.filter((i) => i.status === 'paid');
  const sentInvoices  = invoices.filter((i) => i.status === 'sent');
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
  const totalRevenue  = paidInvoices.reduce((s, i) => s + i.total, 0);
  const pendingAmount = sentInvoices.reduce((s, i) => s + i.total, 0);
  const overdueAmount = overdueInvoices.reduce((s, i) => s + i.total, 0);

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || inv.number.toLowerCase().includes(q)
      || (inv.client?.name || '').toLowerCase().includes(q)
      || (inv.client_name_override || '').toLowerCase().includes(q);
    const matchStatus = !statusFilter || inv.status === statusFilter;
    const matchType = !typeFilter || (inv.document_type || 'invoice') === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  // --- Selection helpers ---
  const allFilteredIds = filtered.map((i) => i.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = allFilteredIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [allSelected, allFilteredIds]);

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedIds(new Set());

  // --- Bulk actions ---
  const handleExport = () => {
    downloadCSV(
      `factures-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Numéro', 'Type', 'Client', 'Date émission', 'Échéance', 'HT', 'TVA', 'TTC', 'Statut', 'Payée le'],
      invoices.map((inv) => [
        inv.number,
        TYPE_LABELS[inv.document_type] || inv.document_type,
        inv.client?.name || inv.client_name_override || '',
        inv.issue_date,
        inv.due_date || '',
        inv.subtotal,
        inv.vat_amount,
        inv.total,
        STATUS_LABELS[inv.status] || inv.status,
        inv.paid_at || '',
      ]),
    );
  };

  const handleBulkExportCSV = () => {
    const selected = invoices.filter((inv) => selectedIds.has(inv.id));
    downloadCSV(
      `factures-selection-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Numéro', 'Type', 'Client', 'Date émission', 'Échéance', 'HT', 'TVA', 'TTC', 'Statut', 'Payée le'],
      selected.map((inv) => [
        inv.number,
        TYPE_LABELS[inv.document_type] || inv.document_type,
        inv.client?.name || inv.client_name_override || '',
        inv.issue_date,
        inv.due_date || '',
        inv.subtotal,
        inv.vat_amount,
        inv.total,
        STATUS_LABELS[inv.status] || inv.status,
        inv.paid_at || '',
      ]),
    );
  };

  const handleBulkMarkPaid = async () => {
    const eligible = invoices.filter(
      (inv) => selectedIds.has(inv.id) && (inv.status === 'sent' || inv.status === 'overdue'),
    );
    await Promise.all(eligible.map((inv) => updateInvoiceStatus(inv.id, 'paid')));
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    const confirmed = window.confirm(
      `Supprimer ${count} document${count !== 1 ? 's' : ''} ? Cette action est irréversible.`,
    );
    if (!confirmed) return;
    await Promise.all([...selectedIds].map((id) => deleteInvoice(id)));
    clearSelection();
  };

  // Count of selected invoices eligible for "mark paid"
  const eligibleForPaidCount = invoices.filter(
    (inv) => selectedIds.has(inv.id) && (inv.status === 'sent' || inv.status === 'overdue'),
  ).length;

  return (
    <div className="space-y-5 pb-24">
      {/* Paywall banner */}
      {sub.isFree && sub.invoiceCount >= 2 && (
        <Link
          href="/paywall"
          className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 hover:border-amber-300 transition-all group shadow-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            {sub.isAtLimit
              ? <AlertTriangle size={17} className="text-amber-600" />
              : <Zap size={17} className="text-amber-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-800 text-sm">
              {sub.isAtLimit
                ? 'Limite atteinte — passez à Pro pour continuer'
                : `Plan gratuit · ${sub.invoiceCount}/3 factures utilisées`}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Factures illimitées dès 9€/mois →
            </p>
          </div>
          <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
        </Link>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Documents</h1>
          <p className="text-sm text-gray-400 mt-0.5">{invoices.length} document{invoices.length !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex items-center gap-2">
          {invoices.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-xl text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          <Link
            href="/invoices/new"
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Nouveau</span>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total factures"
            value={String(invoices.length)}
            sub={`${paidInvoices.length} payées`}
            icon={ReceiptText}
            accent="bg-gray-900 text-white border-gray-800"
          />
          <StatCard
            label="Revenus perçus"
            value={formatCurrency(totalRevenue)}
            sub={`${paidInvoices.length} facture${paidInvoices.length !== 1 ? 's' : ''}`}
            icon={BadgeDollarSign}
            accent="bg-primary text-white border-primary-dark"
          />
          <StatCard
            label="En attente"
            value={formatCurrency(pendingAmount)}
            sub={`${sentInvoices.length} envoyée${sentInvoices.length !== 1 ? 's' : ''}`}
            icon={Hourglass}
            accent="bg-blue-50 text-blue-700 border-blue-100"
          />
          <StatCard
            label="En retard"
            value={formatCurrency(overdueAmount)}
            sub={`${overdueInvoices.length} document${overdueInvoices.length !== 1 ? 's' : ''}`}
            icon={AlertTriangle}
            accent={overdueInvoices.length > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-50 text-gray-400 border-gray-100'}
          />
        </div>
      )}

      {/* Search + filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Rechercher par numéro ou client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-all',
              showFilters
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-900',
            )}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Filtres</span>
          </button>
          <Link
            href="/invoices/new?type=quote"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:text-gray-700 hover:border-gray-400 text-sm font-medium transition-all"
          >
            + Devis
          </Link>
        </div>

        {/* Status pills + type filter */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-top-1 duration-150">
            <div className="flex flex-wrap gap-1.5 flex-1">
              {STATUS_OPTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    statusFilter === s.value
                      ? 'ring-2 ring-gray-900 ring-offset-1 ' + s.color
                      : s.color,
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {TYPE_OPTS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTypeFilter(t.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    typeFilter === t.value
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-gray-200" />
            </div>
            <p className="font-bold text-gray-400 text-sm">
              {search || statusFilter || typeFilter ? 'Aucun résultat trouvé' : 'Aucun document pour l\'instant'}
            </p>
            <p className="text-xs text-gray-300 mt-1 mb-4">
              {search || statusFilter || typeFilter
                ? 'Essayez de modifier vos critères de recherche'
                : 'Créez votre première facture en quelques secondes'}
            </p>
            {!search && !statusFilter && !typeFilter && (
              <div className="flex items-center justify-center gap-2">
                <Link
                  href="/invoices/new"
                  className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors"
                >
                  <Plus size={14} /> Créer une facture
                </Link>
                <Link
                  href="/invoices/new?type=quote"
                  className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Créer un devis
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer accent-primary"
                        title="Tout sélectionner"
                      />
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Document</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Émission</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Échéance</th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Montant TTC</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((inv) => {
                    const isOverdue = inv.status === 'overdue';
                    const isPaid = inv.status === 'paid';
                    const isSelected = selectedIds.has(inv.id);
                    return (
                      <tr
                        key={inv.id}
                        className={cn(
                          'hover:bg-gray-50/80 cursor-pointer transition-colors group',
                          isSelected && 'bg-primary/5 hover:bg-primary/8',
                        )}
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                      >
                        <td className="px-4 py-3.5 w-10" onClick={(e) => toggleSelect(inv.id, e)}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer accent-primary"
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', getDocBg(inv.document_type))}>
                              {getDocIcon(inv.document_type, 14)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-primary">{inv.number}</p>
                              <p className="text-[11px] text-gray-400">{TYPE_LABELS[inv.document_type] || 'Facture'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">
                            {inv.client?.name || inv.client_name_override || <span className="text-gray-300 italic">Sans client</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateShort(inv.issue_date)}</td>
                        <td className="px-4 py-3.5">
                          <span className={cn('text-sm', isOverdue && 'text-red-500 font-semibold', !isOverdue && 'text-gray-500')}>
                            {inv.due_date ? formatDateShort(inv.due_date) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <p className={cn('text-sm font-bold', isPaid ? 'text-primary' : isOverdue ? 'text-red-600' : 'text-gray-900')}>
                            {formatCurrency(inv.total)}
                          </p>
                          <p className="text-[11px] text-gray-400">HT {formatCurrency(inv.subtotal)}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <ChevronRight
                            size={15}
                            className="text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all ml-auto"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Table footer summary */}
              {filtered.length > 1 && (
                <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-gray-50/50">
                  <p className="text-xs text-gray-400">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
                  <p className="text-sm font-bold text-gray-900">
                    Total : {formatCurrency(filtered.reduce((s, i) => s + i.total, 0))}
                  </p>
                </div>
              )}
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map((inv) => {
                const isSelected = selectedIds.has(inv.id);
                return (
                  <div
                    key={inv.id}
                    className={cn('flex items-center gap-3 px-4 py-4 transition-colors', isSelected ? 'bg-primary/5' : 'hover:bg-gray-50 active:bg-gray-100')}
                  >
                    <div
                      className="flex-shrink-0"
                      onClick={(e) => toggleSelect(inv.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer accent-primary"
                      />
                    </div>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0 group"
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', getDocBg(inv.document_type))}>
                        {getDocIcon(inv.document_type, 17)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {inv.client?.name || inv.client_name_override || 'Sans client'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {inv.number} · {formatDateShort(inv.issue_date)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                        <StatusBadge status={inv.status} />
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bulk action bar (sticky bottom) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <div className="flex items-center gap-2 bg-gray-900 text-white rounded-2xl shadow-2xl shadow-black/30 px-4 py-3 border border-white/10 backdrop-blur-sm">
            {/* Count */}
            <span className="text-sm font-bold whitespace-nowrap mr-1">
              {selectedIds.size} sélectionné{selectedIds.size !== 1 ? 's' : ''}
            </span>

            <div className="flex-1 flex items-center gap-2 flex-wrap">
              {/* Mark paid */}
              {eligibleForPaidCount > 0 && (
                <button
                  onClick={handleBulkMarkPaid}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  <CheckCircle2 size={13} />
                  Marquer payées
                  {eligibleForPaidCount !== selectedIds.size && (
                    <span className="opacity-70">({eligibleForPaidCount})</span>
                  )}
                </button>
              )}

              {/* Export CSV */}
              <button
                onClick={handleBulkExportCSV}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                <Download size={13} />
                Exporter CSV
              </button>

              {/* Delete */}
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                <Trash2 size={13} />
                Supprimer
              </button>
            </div>

            {/* Deselect */}
            <button
              onClick={clearSelection}
              className="flex items-center gap-1 text-white/50 hover:text-white text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap ml-1"
              title="Désélectionner"
            >
              <X size={14} />
              <span className="hidden sm:inline">Désélectionner</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
