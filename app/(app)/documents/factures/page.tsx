'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Edit,
  Copy,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';

type StatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

export default function FacturesPage() {
  const router = useRouter();
  const { invoices, fetchInvoices, clients } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedFactures, setSelectedFactures] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Filtrer uniquement les factures
  const factures = invoices.filter((inv) => (inv.document_type || 'invoice') === 'invoice');

  // Filtrer par recherche et statut
  const filteredFactures = factures.filter((facture) => {
    const clientName = facture.client?.name || facture.client_name_override || '';
    const matchesSearch =
      searchQuery === '' ||
      facture.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facture.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || facture.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculer les statistiques
  const stats = {
    total: factures.length,
    draft: factures.filter((f) => f.status === 'draft').length,
    sent: factures.filter((f) => f.status === 'sent').length,
    paid: factures.filter((f) => f.status === 'paid').length,
    overdue: factures.filter((f) => f.status === 'overdue').length,
    totalAmount: factures.reduce((sum, f) => sum + (f.total || 0), 0),
  };

  const handleSelectAll = () => {
    if (selectedFactures.size === filteredFactures.length) {
      setSelectedFactures(new Set());
    } else {
      setSelectedFactures(new Set(filteredFactures.map((f) => f.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedFactures);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFactures(newSelected);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string; icon: any }> = {
      draft: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Brouillon', icon: FileText },
      sent: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Envoyée', icon: Calendar },
      paid: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Payée', icon: CheckCircle },
      overdue: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'En retard', icon: XCircle },
    };

    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Factures
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gérez toutes vos factures clients
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/documents/factures/new"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Nouvelle facture</span>
                <span className="sm:hidden">Nouvelle</span>
              </Link>
              <Link
                href="/documents/factures/recurring"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <RefreshCw size={18} />
                <span className="hidden sm:inline">Facture récurrente</span>
                <span className="sm:hidden">Récurrente</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
              <Receipt size={16} />
              <span className="text-xs font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
              <FileText size={16} />
              <span className="text-xs font-medium">Brouillons</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.draft}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Calendar size={16} />
              <span className="text-xs font-medium">Envoyées</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sent}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle size={16} />
              <span className="text-xs font-medium">Payées</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.paid}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
              <XCircle size={16} />
              <span className="text-xs font-medium">En retard</span>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par numéro, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setStatusFilter('draft')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  statusFilter === 'draft'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Brouillons
              </button>
              <button
                onClick={() => setStatusFilter('sent')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  statusFilter === 'sent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Envoyées
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Payées
              </button>
              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  statusFilter === 'overdue'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                En retard
              </button>
            </div>
          </div>
        </motion.div>

        {/* Table */}
        {filteredFactures.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-200 dark:border-gray-700 shadow-sm text-center"
          >
            <Receipt className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || statusFilter !== 'all'
                ? 'Aucune facture trouvée'
                : 'Aucune facture pour le moment'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Essayez de modifier vos critères de recherche'
                : 'Créez une facture en moins d\'une minute et envoyez-la directement à votre client par email.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/documents/factures/new"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:shadow-lg transition-all shadow-blue-500/30"
                >
                  <Plus size={14} /> Nouvelle facture
                </Link>
                <Link
                  href="/documents/factures/recurring"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:shadow-lg transition-all shadow-purple-500/30"
                >
                  <RefreshCw size={14} /> Facture récurrente
                </Link>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
          >
            {/* Table header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedFactures.size === filteredFactures.length && filteredFactures.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                />
              </div>
              <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Numéro</div>
              <div className="col-span-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Client</div>
              <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</div>
              <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total TTC</div>
              <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Statut</div>
            </div>

            {/* Table body */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredFactures.map((facture) => (
                <div
                  key={facture.id}
                  className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors items-center"
                >
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedFactures.has(facture.id)}
                      onChange={() => handleSelectOne(facture.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div className="col-span-2">
                    <Link
                      href={`/invoices/${facture.id}`}
                      className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {facture.number || '—'}
                    </Link>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                      {facture.client?.name || facture.client_name_override || 'Client inconnu'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {facture.issue_date ? new Date(facture.issue_date).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {facture.total ? facture.total.toFixed(2) + ' €' : '—'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    {getStatusBadge(facture.status || 'draft')}
                  </div>
                </div>
              ))}

              {/* Mobile cards */}
              {filteredFactures.map((facture) => (
                <div key={facture.id} className="md:hidden p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="checkbox"
                      checked={selectedFactures.has(facture.id)}
                      onChange={() => handleSelectOne(facture.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                    />
                    {getStatusBadge(facture.status || 'draft')}
                  </div>
                  <Link
                    href={`/invoices/${facture.id}`}
                    className="block"
                  >
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                      {facture.number || 'Sans numéro'}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                      {facture.client?.name || facture.client_name_override || 'Client inconnu'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{facture.issue_date ? new Date(facture.issue_date).toLocaleDateString('fr-FR') : '—'}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {facture.total ? facture.total.toFixed(2) + ' €' : '—'}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
