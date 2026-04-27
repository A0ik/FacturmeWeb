'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Plus, Search, Filter, FileCheck, Clock, AlertCircle,
  CheckCircle, FileEdit, ArrowRight, Trash2, Copy, Loader2
} from 'lucide-react';
import { useContractStore } from '@/stores/contractStore';
import { useAuthStore } from '@/stores/authStore';
import { ContractSummary, ContractType, ContractStatus } from '@/types';
import { ContractCard } from '@/components/contracts/ContractCard';
import { toast } from 'sonner';
import Link from 'next/link';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'pending_signature', label: 'En attente' },
  { value: 'signed', label: 'Signés' },
  { value: 'active', label: 'Actifs' },
  { value: 'ended', label: 'Terminés' },
];

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous types' },
  { value: 'cdi', label: 'CDI' },
  { value: 'cdd', label: 'CDD' },
  { value: 'other', label: 'Autres' },
];

export default function ContractsPage() {
  const { profile } = useAuthStore();
  const { contracts, stats, loading, fetchContracts, deleteContract, duplicateContract } = useContractStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchContracts(); }, []);

  const filtered = contracts.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (typeFilter !== 'all' && c.contract_type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.employee_name.toLowerCase().includes(q) ||
             c.company_name.toLowerCase().includes(q) ||
             (c.contract_number || '').toLowerCase().includes(q) ||
             c.job_title.toLowerCase().includes(q);
    }
    return true;
  });

  const handleDelete = async (id: string, type: ContractType) => {
    if (!confirm('Supprimer ce contrat ?')) return;
    try {
      await deleteContract(id, type);
      toast.success('Contrat supprimé');
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDuplicate = async (id: string, type: ContractType) => {
    try {
      await duplicateContract(id, type, profile);
      toast.success('Contrat dupliqué');
    } catch (e) {
      toast.error('Erreur lors de la duplication');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedIds.size} contrat(s) ?`)) return;
    try {
      for (const id of selectedIds) {
        const c = contracts.find(c => c.id === id);
        if (c) await deleteContract(id, c.contract_type);
      }
      setSelectedIds(new Set());
      toast.success('Contrats supprimés');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contrats</h1>
          <p className="text-gray-600 dark:text-gray-400">Gérez vos contrats de travail conformes 2026</p>
        </div>
        <div className="flex gap-3">
          <Link href="/contracts/new/cdi" className="px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />CDI
          </Link>
          <Link href="/contracts/new/cdd" className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />CDD
          </Link>
          <Link href="/contracts/new/other" className="px-4 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />Autre
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Brouillons', value: stats.drafts, icon: FileEdit, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
            { label: 'En attente', value: stats.pendingSignature, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            { label: 'Actifs', value: stats.active + stats.signed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, entreprise, numéro..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 text-sm outline-none focus:border-primary/50">
            {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 text-sm outline-none focus:border-primary/50">
            {TYPE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </motion.div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
          <span className="text-sm font-medium">{selectedIds.size} sélectionné(s)</span>
          <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">Supprimer</button>
          <button onClick={() => setSelectedIds(new Set())} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Annuler</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aucun contrat</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Créez votre premier contrat de travail conforme 2026</p>
          <div className="flex justify-center gap-3">
            <Link href="/contracts/new/cdi" className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Plus className="w-5 h-5" />CDI
            </Link>
            <Link href="/contracts/new/cdd" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus className="w-5 h-5" />CDD
            </Link>
          </div>
        </motion.div>
      )}

      {/* Contract List */}
      {!loading && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contract) => (
            <div key={contract.id} className="relative">
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(contract.id)}
                  onChange={(e) => {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      e.target.checked ? next.add(contract.id) : next.delete(contract.id);
                      return next;
                    });
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <ContractCard contract={contract} onDelete={handleDelete} onDuplicate={handleDuplicate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
