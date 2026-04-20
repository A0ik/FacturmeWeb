'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency, formatDateShort, downloadCSV } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, FileText, Download, Zap, AlertTriangle,
  TrendingUp, Clock, CheckCircle2, XCircle, Eye, Send,
  ChevronRight, Filter, SlidersHorizontal, ArrowUpRight,
  ReceiptText, BadgeDollarSign, Hourglass, ShoppingCart, Truck,
  Wallet, Trash2, CheckSquare, X, Lock, Edit2, Sparkles,
} from 'lucide-react';
import { Invoice, InvoiceStatus } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_OPTS: { value: string; label: string; color: string; dot: string }[] = [
  { value: '',        label: 'Tous',       color: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700',   dot: 'bg-gray-400' },
  { value: 'draft',   label: 'Brouillon',  color: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700',   dot: 'bg-gray-400' },
  { value: 'sent',    label: 'Envoyée',    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20',    dot: 'bg-blue-500' },
  { value: 'paid',    label: 'Payée',      color: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20', dot: 'bg-green-500' },
  { value: 'overdue', label: 'En retard',  color: 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20',       dot: 'bg-red-500' },
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
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn('relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300', accent)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] sm:text-xs font-semibold text-current/60 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl sm:text-2xl font-black tracking-tight">{value}</p>
          {sub && <p className="text-[11px] sm:text-xs mt-1 text-current/50">{sub}</p>}
        </div>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-current/10 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-current" />
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-current/60">
          <ArrowUpRight size={11} />
          {trend}
        </div>
      )}
    </motion.div>
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
  if (documentType === 'quote') return 'bg-blue-50 dark:bg-blue-500/10';
  if (documentType === 'credit_note') return 'bg-purple-50 dark:bg-purple-500/10';
  if (documentType === 'purchase_order') return 'bg-orange-50 dark:bg-orange-500/10';
  if (documentType === 'delivery_note') return 'bg-cyan-50 dark:bg-cyan-500/10';
  if (documentType === 'deposit') return 'bg-violet-50 dark:bg-violet-500/10';
  return 'bg-primary/10 dark:bg-primary/20';
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
    if (sub.isFree) {
      toast.error('Les utilisateurs du plan gratuit ne peuvent pas supprimer de factures. Passez à un plan payant pour débloquer cette fonctionnalité.');
      return;
    }
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
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/[0.02] dark:bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-blue-500/[0.02] dark:bg-blue-500/[0.03] rounded-full blur-3xl" />
      </div>

      {/* Paywall banner */}
      {sub.isFree && sub.invoiceCount >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/paywall"
            className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 hover:border-amber-300 dark:hover:border-amber-500/40 transition-all group shadow-sm hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              {sub.isAtLimit
                ? <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
                : <Zap size={18} className="text-amber-500 dark:text-amber-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-800 dark:text-amber-400 text-sm">
                {sub.isAtLimit
                  ? 'Limite atteinte — passez à Pro pour continuer'
                  : `Plan Discovery · ${sub.invoiceCount}/5 factures ce mois`}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500/80 mt-0.5">
                Factures illimitées dès 19€/mois →
              </p>
            </div>
            <ChevronRight size={17} className="text-amber-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </Link>
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Documents</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{invoices.length} document{invoices.length !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {invoices.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExport}
              className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm hover:shadow-md"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export</span>
            </motion.button>
          )}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href="/invoices/new"
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/30 hover:shadow-primary/40"
            >
              <Plus size={16} />
              <span>Nouveau</span>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats cards */}
      {invoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <StatCard
            label="Total factures"
            value={String(invoices.length)}
            sub={`${paidInvoices.length} payées`}
            icon={ReceiptText}
            accent="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-800 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700"
          />
          <StatCard
            label="Revenus perçus"
            value={formatCurrency(totalRevenue)}
            sub={`${paidInvoices.length} facture${paidInvoices.length !== 1 ? 's' : ''}`}
            icon={BadgeDollarSign}
            accent="bg-gradient-to-br from-primary to-primary-dark text-white border-primary-dark dark:border-primary/30"
          />
          <StatCard
            label="En attente"
            value={formatCurrency(pendingAmount)}
            sub={`${sentInvoices.length} envoyée${sentInvoices.length !== 1 ? 's' : ''}`}
            icon={Hourglass}
            accent="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/20"
          />
          <StatCard
            label="En retard"
            value={formatCurrency(overdueAmount)}
            sub={`${overdueInvoices.length} document${overdueInvoices.length !== 1 ? 's' : ''}`}
            icon={AlertTriangle}
            accent={overdueInvoices.length > 0 ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/20' : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800/50 dark:to-slate-700/50 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-white/10'}
          />
        </motion.div>
      )}

      {/* Search + filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-2"
      >
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Rechercher par numéro ou client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={15} />}
              className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm',
              showFilters
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700',
            )}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filtres</span>
          </motion.button>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href="/invoices/new?type=quote"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-white/20 text-sm font-medium transition-all hover:bg-gray-50 dark:hover:bg-slate-800/50"
            >
              + Devis
            </Link>
          </motion.div>
        </div>

        {/* Status pills + type filter */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap gap-2 p-3 sm:p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 shadow-sm"
            >
              <div className="flex flex-wrap gap-1.5 flex-1">
                {STATUS_OPTS.map((s) => (
                  <motion.button
                    key={s.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStatusFilter(s.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      statusFilter === s.value
                        ? 'ring-2 ring-gray-900 dark:ring-white ring-offset-1 ring-offset-gray-50 dark:ring-offset-slate-800 ' + s.color
                        : s.color,
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                    {s.label}
                  </motion.button>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {TYPE_OPTS.map((t) => (
                  <motion.button
                    key={t.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTypeFilter(t.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      typeFilter === t.value
                        ? 'bg-gradient-to-r from-primary to-primary-dark text-white ring-2 ring-primary/30 ring-offset-1'
                        : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-white/10',
                    )}
                  >
                    {t.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm"
      >
        {filtered.length === 0 ? (
          <div className="text-center py-16 sm:py-20 px-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center mx-auto mb-4"
            >
              <FileText size={28} className="text-gray-300 dark:text-gray-600" />
            </motion.div>
            <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">
              {search || statusFilter || typeFilter ? 'Aucun résultat trouvé' : 'Prêt à envoyer votre première facture ?'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4 max-w-xs mx-auto">
              {search || statusFilter || typeFilter
                ? 'Essayez de modifier vos critères de recherche'
                : 'Créez une facture en moins d\'une minute et envoyez-la directement à votre client par email.'}
            </p>
            {!search && !statusFilter && !typeFilter && (
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <Link
                  href="/invoices/new"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:shadow-lg transition-all shadow-primary/30"
                >
                  <Plus size={14} /> Créer une facture
                </Link>
                <Link
                  href="/invoices/new?type=quote"
                  className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
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
                  <tr className="border-b border-gray-100 dark:border-white/10 bg-gray-50/70 dark:bg-white/5">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-primary cursor-pointer accent-primary"
                        title="Tout sélectionner"
                      />
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Document</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Émission</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Échéance</th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Montant TTC</th>
                    <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {filtered.map((inv, index) => {
                    const isOverdue = inv.status === 'overdue';
                    const isPaid = inv.status === 'paid';
                    const isSelected = selectedIds.has(inv.id);
                    return (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          'hover:bg-gray-50/80 dark:hover:bg-white/5 cursor-pointer transition-colors group',
                          isSelected && 'bg-primary/5 dark:bg-primary/10 hover:bg-primary/8 dark:hover:bg-primary/15',
                        )}
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                      >
                        <td className="px-4 py-3.5 w-10" onClick={(e) => toggleSelect(inv.id, e)}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-primary cursor-pointer accent-primary"
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', getDocBg(inv.document_type))}>
                              {getDocIcon(inv.document_type, 14)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-primary">{inv.number}</p>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500">{TYPE_LABELS[inv.document_type] || 'Facture'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">
                            {inv.client?.name || inv.client_name_override || <span className="text-gray-300 dark:text-gray-600 italic">Sans client</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">{formatDateShort(inv.issue_date)}</td>
                        <td className="px-4 py-3.5">
                          <span className={cn('text-sm', isOverdue && 'text-red-500 font-semibold', !isOverdue && 'text-gray-500 dark:text-gray-400')}>
                            {inv.due_date ? formatDateShort(inv.due_date) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <p className={cn('text-sm font-bold', isPaid ? 'text-primary' : isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-white')}>
                            {formatCurrency(inv.total)}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">HT {formatCurrency(inv.subtotal)}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {sub.canEditInvoice ? (
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Link
                                  href={`/invoices/${inv.id}/edit`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/20 text-blue-500 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
                                  title="Modifier"
                                >
                                  <Edit2 size={14} />
                                </Link>
                              </motion.div>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); router.push('/paywall'); }}
                                className="p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-all opacity-0 group-hover:opacity-100"
                                title="Modifier (Plan payant)"
                              >
                                <Lock size={14} />
                              </motion.button>
                            )}
                            <motion.div whileHover={{ x: 0.5 }} whileTap={{ x: 0 }}>
                              <ChevronRight
                                size={15}
                                className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-all ml-auto"
                              />
                            </motion.div>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Table footer summary */}
              {filtered.length > 1 && (
                <div className="border-t border-gray-100 dark:border-white/10 px-5 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                  <p className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Total : {formatCurrency(filtered.reduce((s, i) => s + i.total, 0))}
                  </p>
                </div>
              )}
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-gray-50 dark:divide-white/5">
              {filtered.map((inv, index) => {
                const isSelected = selectedIds.has(inv.id);
                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn('flex items-center gap-3 px-4 py-4 transition-colors', isSelected ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10')}
                  >
                    <div
                      className="flex-shrink-0"
                      onClick={(e) => toggleSelect(inv.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-primary cursor-pointer accent-primary"
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
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {inv.client?.name || inv.client_name_override || 'Sans client'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {inv.number} · {formatDateShort(inv.issue_date)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inv.total)}</p>
                        <StatusBadge status={inv.status} />
                      </div>
                    </Link>
                    {sub.canEditInvoice ? (
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Link
                          href={`/invoices/${inv.id}/edit`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/20 text-blue-500 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <Edit2 size={14} />
                        </Link>
                      </motion.div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); router.push('/paywall'); }}
                        className="p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                      >
                        <Lock size={14} />
                      </motion.button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>

      {/* Bulk action bar (sticky bottom) */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
          >
            <div className="flex items-center gap-2 bg-gray-900 dark:bg-slate-800 text-white rounded-2xl shadow-2xl shadow-black/30 px-4 py-3 border border-white/10 backdrop-blur-sm">
              {/* Count */}
              <span className="text-sm font-bold whitespace-nowrap mr-1">
                {selectedIds.size} sélectionné{selectedIds.size !== 1 ? 's' : ''}
              </span>

              <div className="flex-1 flex items-center gap-2 flex-wrap">
                {/* Mark paid */}
                {eligibleForPaidCount > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBulkMarkPaid}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shadow-lg shadow-green-500/20"
                  >
                    <CheckCircle2 size={13} />
                    Marquer payées
                    {eligibleForPaidCount !== selectedIds.size && (
                      <span className="opacity-70">({eligibleForPaidCount})</span>
                    )}
                  </motion.button>
                )}

                {/* Export CSV */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBulkExportCSV}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Download size={13} />
                  Exporter CSV
                </motion.button>

                {/* Delete */}
                {!sub.isFree && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shadow-lg shadow-red-500/20"
                  >
                    <Trash2 size={13} />
                    Supprimer
                  </motion.button>
                )}
                {sub.isFree && selectedIds.size > 0 && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      href="/paywall"
                      className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Lock size={13} />
                      Débloquer la suppression
                    </Link>
                  </motion.div>
                )}
              </div>

              {/* Deselect */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearSelection}
                className="flex items-center gap-1 text-white/50 hover:text-white text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap ml-1"
                title="Désélectionner"
              >
                <X size={14} />
                <span className="hidden sm:inline">Désélectionner</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
