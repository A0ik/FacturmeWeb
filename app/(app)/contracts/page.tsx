'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  Calendar,
  User,
  Building2,
  Eye,
  Download,
  Trash2,
  FileEdit
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';

interface ContractSummary {
  id: string;
  type: 'cdd' | 'cdi' | 'other';
  employeeName: string;
  companyName: string;
  startDate: string;
  endDate?: string;
  status: 'draft' | 'pending' | 'signed' | 'active' | 'ended';
  createdAt: string;
}

export default function ContractsPage() {
  const { profile } = useAuthStore();
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
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

      // Charger les contrats CDD
      const { data: cddData } = await supabase
        .from('contracts_cdd')
        .select('id, employee_first_name, employee_last_name, company_name, contract_start_date, contract_end_date, document_status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Charger les contrats CDI
      const { data: cdiData } = await supabase
        .from('contracts_cdi')
        .select('id, employee_first_name, employee_last_name, company_name, contract_start_date, document_status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Charger les autres contrats
      const { data: otherData } = await supabase
        .from('contracts_other')
        .select('id, employee_first_name, employee_last_name, company_name, start_date, end_date, document_status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const allContracts: ContractSummary[] = [];

      // Transformer les données CDD
      cddData?.forEach((c: any) => {
        allContracts.push({
          id: c.id,
          type: 'cdd',
          employeeName: `${c.employee_first_name} ${c.employee_last_name}`,
          companyName: c.company_name,
          startDate: c.contract_start_date,
          endDate: c.contract_end_date,
          status: c.document_status,
          createdAt: c.created_at
        });
      });

      // Transformer les données CDI
      cdiData?.forEach((c: any) => {
        allContracts.push({
          id: c.id,
          type: 'cdi',
          employeeName: `${c.employee_first_name} ${c.employee_last_name}`,
          companyName: c.company_name,
          startDate: c.contract_start_date,
          status: c.document_status,
          createdAt: c.created_at
        });
      });

      // Transformer les autres contrats
      otherData?.forEach((c: any) => {
        allContracts.push({
          id: c.id,
          type: 'other',
          employeeName: `${c.employee_first_name} ${c.employee_last_name}`,
          companyName: c.company_name,
          startDate: c.start_date,
          endDate: c.end_date,
          status: c.document_status,
          createdAt: c.created_at
        });
      });

      setContracts(allContracts);
    } catch (error) {
      console.error('Erreur lors du chargement des contrats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contract.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const contractTypeLabels: Record<string, string> = {
    cdd: 'CDD',
    cdi: 'CDI',
    other: 'Autre'
  };

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
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Contrats de travail
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez tous vos contrats de travail au même endroit
          </p>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link href="/contracts/cdd">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white cursor-pointer shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-1">Nouveau CDD</h3>
              <p className="text-sm text-white/80">Créer un contrat à durée déterminée</p>
            </motion.div>
          </Link>

          <Link href="/contracts/cdi">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white cursor-pointer shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-1">Nouveau CDI</h3>
              <p className="text-sm text-white/80">Créer un contrat à durée indéterminée</p>
            </motion.div>
          </Link>

          <Link href="/contracts/other">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white cursor-pointer shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-1">Autre contrat</h3>
              <p className="text-sm text-white/80">Stage, freelance, alternance...</p>
            </motion.div>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un contrat (salarié, entreprise...)"
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
                Aucun contrat trouvé
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Essayez de modifier vos filtres de recherche'
                  : 'Commencez par créer votre premier contrat'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <div className="flex justify-center gap-4">
                  <Link href="/contracts/cdd">
                    <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                      Créer un CDD
                    </button>
                  </Link>
                  <Link href="/contracts/cdi">
                    <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                      Créer un CDI
                    </button>
                  </Link>
                </div>
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
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        contract.type === 'cdd' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        contract.type === 'cdi' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {contractTypeLabels[contract.type]}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusLabels[contract.status]?.color}`}>
                        {statusLabels[contract.status]?.label}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {contract.employeeName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {contract.companyName}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Début: {new Date(contract.startDate).toLocaleDateString('fr-FR')}
                      </span>
                      {contract.endDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Fin: {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-400">
                      <Eye className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-400">
                      <Download className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-400">
                      <FileEdit className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400">
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
