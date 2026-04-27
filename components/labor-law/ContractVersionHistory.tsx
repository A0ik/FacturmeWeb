'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Clock, User, FileText, X, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface ContractVersion {
  id: string;
  contract_id: string;
  version_number: number;
  contract_data: any;
  changes: any;
  created_at: string;
  created_by: string;
  comment?: string;
}

interface ContractVersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractType: 'cdi' | 'cdd' | 'other';
}

export function ContractVersionHistory({ isOpen, onClose, contractId, contractType }: ContractVersionHistoryProps) {
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && contractId) {
      fetchVersions();
    }
  }, [isOpen, contractId]);

  const fetchVersions = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      const { data, error } = await supabase
        .from('contract_versions')
        .select('*')
        .eq('contract_id', contractId)
        .eq('contract_type', contractType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des versions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangesSummary = (changes: any) => {
    if (!changes || typeof changes !== 'object') return 'Aucun détail';

    const changeList = [];
    for (const [key, value] of Object.entries(changes)) {
      if (key === 'modified') {
        changeList.push(`${Object.keys(value as any).length} champs modifiés`);
      } else if (key === 'added') {
        changeList.push(`${Object.keys(value as any).length} champs ajoutés`);
      } else if (key === 'removed') {
        changeList.push(`${Object.keys(value as any).length} champs supprimés`);
      }
    }
    return changeList.join(', ') || 'Modifications';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden relative"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                      <History className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Historique des versions
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {versions.length} version{versions.length > 1 ? 's' : ''} enregistrée{versions.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Aucune version enregistrée
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versions.map((version, index) => (
                      <motion.div
                        key={version.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedVersion(expandedVersion === version.version_number ? null : version.version_number)}
                          className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                Version {version.version_number}
                              </span>
                              {index === 0 && (
                                <span className="px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary rounded-full">
                                  Actuelle
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(version.created_at)}
                              </span>
                              {version.comment && (
                                <span className="text-gray-400">• {version.comment}</span>
                              )}
                            </div>
                          </div>
                          {expandedVersion === version.version_number ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>

                        {expandedVersion === version.version_number && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10"
                          >
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {getChangesSummary(version.changes)}
                            </p>
                            {version.changes?.modified && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                <p className="font-semibold mb-1">Champs modifiés :</p>
                                <ul className="list-disc list-inside">
                                  {Object.keys(version.changes.modified).slice(0, 5).map(key => (
                                    <li key={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</li>
                                  ))}
                                  {Object.keys(version.changes.modified).length > 5 && (
                                    <li>...et {Object.keys(version.changes.modified).length - 5} autres</li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
