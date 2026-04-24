'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Download,
  FileEdit,
  Trash2,
  Calendar,
  Clock,
  User,
  Building2,
  FileText
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CDDContract {
  id: string;
  employee_first_name: string;
  employee_last_name: string;
  employee_email: string;
  company_name: string;
  contract_start_date: string;
  contract_end_date: string;
  contract_reason: string;
  job_title: string;
  salary_amount: number;
  salary_frequency: string;
  document_status: 'draft' | 'pending' | 'signed' | 'active' | 'ended';
  created_at: string;
}

export default function CDDListPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [contracts, setContracts] = useState<CDDContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('contracts_cdd')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setContracts(data as CDDContract[]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des contrats:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteContract = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contrat ?')) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('contracts_cdd')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadContracts();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch =
      contract.employee_first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.employee_last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.job_title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.document_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    signed: { label: 'Signé', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    active: { label: 'Actif', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    ended: { label: 'Terminé', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <Link href="/contracts">
                <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                  Retour aux contrats
                </button>
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Contrats CDD
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gérez vos contrats à durée déterminée
              </p>
            </div>
            <Link href="/contracts/cdd">
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Nouveau CDD
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{contracts.length}</p>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Brouillons</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{contracts.filter(c => c.document_status === 'draft').length}</p>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">En attente</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{contracts.filter(c => c.document_status === 'pending').length}</p>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Signés</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{contracts.filter(c => c.document_status === 'signed').length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un contrat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>
            <div className="relative">
              <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillons</option>
                <option value="pending">En attente</option>
                <option value="signed">Signés</option>
                <option value="active">Actifs</option>
                <option value="ended">Terminés</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contracts List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredContracts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-12 text-center"
            >
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Aucun contrat CDD trouvé
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Essayez de modifier vos filtres de recherche'
                  : 'Créez votre premier contrat CDD'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Link href="/contracts/cdd">
                  <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                    Créer un CDD
                  </button>
                </Link>
              )}
            </motion.div>
          ) : (
            filteredContracts.map((contract, index) => (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusLabels[contract.document_status]?.color}`}>
                        {statusLabels[contract.document_status]?.label}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        CDD
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {contract.employee_first_name} {contract.employee_last_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4" />
                      {contract.company_name} · {contract.job_title}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Du {new Date(contract.contract_start_date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Au {new Date(contract.contract_end_date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="flex items-center gap-1">
                        {contract.salary_amount?.toFixed(2)} € {contract.salary_frequency === 'monthly' ? '/mois' : '/heure'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/contracts/cdd?edit=${contract.id}`}>
                      <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-400">
                        <Eye className="w-5 h-5" />
                      </button>
                    </Link>
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-400">
                      <Download className="w-5 h-5" />
                    </button>
                    <Link href={`/contracts/cdd?edit=${contract.id}`}>
                      <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-400">
                        <FileEdit className="w-5 h-5" />
                      </button>
                    </Link>
                    <button
                      onClick={() => deleteContract(contract.id)}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
