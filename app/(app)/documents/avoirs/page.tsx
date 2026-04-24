'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
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
} from 'lucide-react';
import Link from 'next/link';
import { useDataStore } from '@/stores/dataStore';

type StatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'cancelled' | 'refunded';

export default function AvoirsPage() {
  const { invoices, fetchInvoices } = useDataStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedAvoirs, setSelectedAvoirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Filtrer uniquement les avoirs
  const avoirs = invoices.filter((inv) => (inv.document_type || 'invoice') === 'credit_note');

  // Filtrer par recherche et statut
  const filteredAvoirs = avoirs.filter((avoir) => {
    const matchesSearch =
      searchQuery === '' ||
      avoir.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avoir.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avoir.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || avoir.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculer les statistiques
  const stats = {
    total: avoirs.length,
    draft: avoirs.filter((a) => a.status === 'draft').length,
    sent: avoirs.filter((a) => a.status === 'sent').length,
    paid: avoirs.filter((a) => a.status === 'paid').length,
    cancelled: avoirs.filter((a) => a.status === 'cancelled').length,
    refunded: avoirs.filter((a) => a.status === 'refunded').length,
    totalAmount: avoirs.reduce((sum, a) => sum + (a.total || 0), 0),
  };

  const handleSelectAll = () => {
    if (selectedAvoirs.size === filteredAvoirs.length) {
      setSelectedAvoirs(new Set());
    } else {
      setSelectedAvoirs(new Set(filteredAvoirs.map((a) => a.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedAvoirs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAvoirs(newSelected);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string; icon: any }> = {
      draft: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Brouillon', icon: FileText },
      sent: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Envoyé', icon: Calendar },
      paid: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Payé', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Annulé', icon: XCircle },
      refunded: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Remboursé', icon: XCircle },
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
                Avoirs
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gérez toutes vos notes d'avoir
              </p>
            </div>
            <Link
              href="/documents/avoirs/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus size={20} />
              Nouvel avoir
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
              <RefreshCw size={16} />
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
              <span className="text-xs font-medium">Envoyés</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sent}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle size={16} />
              <span className="text-xs font-medium">Payés</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.paid}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
              <XCircle size={16} />
              <span className="text-xs font-medium">Annulés</span>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.cancelled}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
              <XCircle size={16} />
              <span className="text-xs font-medium">Remboursés</span>
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.refunded}</p>
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
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillons</option>
                <option value="sent">Envoyés</option>
                <option value="paid">Payés</option>
                <option value="cancelled">Annulés</option>
                <option value="refunded">Remboursés</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Bulk Actions */}
        {selectedAvoirs.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-rose-700 dark:text-rose-300 font-semibold">
                {selectedAvoirs.size} avoir(s) sélectionné(s)
              </span>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-white dark:bg-gray-800 text-rose-700 dark:text-rose-300 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors border border-rose-200 dark:border-rose-800">
                  <Download size={16} />
                </button>
                <button className="px-4 py-2 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-800">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
        >
          {/* Mobile Cards */}
          <div className="md:hidden">
            {filteredAvoirs.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Aucun avoir trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAvoirs.map((avoir) => (
                  <div key={avoir.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedAvoirs.has(avoir.id)}
                          onChange={() => handleSelectOne(avoir.id)}
                          className="mt-1 w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {avoir.number || `AVR-${avoir.id?.slice(0, 8)}`}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{avoir.client_name}</p>
                        </div>
                      </div>
                      {getStatusBadge(avoir.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {(avoir.total || 0).toFixed(2)}€
                      </p>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/invoices/${avoir.id}`}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/invoices/${avoir.id}/edit`}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedAvoirs.size === filteredAvoirs.length && filteredAvoirs.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Numéro
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Échéance
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-right">
                      Total HT
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAvoirs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <RefreshCw className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">Aucun avoir trouvé</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAvoirs.map((avoir) => (
                      <tr
                        key={avoir.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedAvoirs.has(avoir.id)}
                            onChange={() => handleSelectOne(avoir.id)}
                            className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {avoir.number || `AVR-${avoir.id?.slice(0, 8)}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {avoir.client_name}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {avoir.date ? new Date(avoir.date).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {avoir.due_date ? new Date(avoir.due_date).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(avoir.status)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">
                          {(avoir.total || 0).toFixed(2)}€
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/invoices/${avoir.id}`}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            >
                              <Eye size={18} />
                            </Link>
                            <Link
                              href={`/invoices/${avoir.id}/edit`}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <Edit size={18} />
                            </Link>
                            <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
                              <Copy size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
