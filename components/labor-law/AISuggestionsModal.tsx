'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, AlertCircle, Check, Plus, Building2, Lightbulb, AlertTriangle } from 'lucide-react';

interface SuggestedClause {
  title: string;
  description: string;
  content: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  legal_reference?: string;
}

interface AISuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyClause: (clause: SuggestedClause) => void;
  contractType: 'cdi' | 'cdd' | 'other';
}

const SECTORS = [
  { value: 'informatique', label: 'Informatique / Tech', icon: '💻' },
  { value: 'btp', label: 'BTP / Construction', icon: '🏗️' },
  { value: 'horeca', label: 'Horeca / Restauration', icon: '🍽️' },
  { value: 'sante', label: 'Santé / Médical', icon: '🏥' },
  { value: 'commerce', label: 'Commerce / Distribution', icon: '🛒' },
  { value: 'industrie', label: 'Industrie', icon: '🏭' },
  { value: 'services', label: 'Services', icon: '📋' },
  { value: 'autre', label: 'Autre', icon: '📌' },
];

export function AISuggestionsModal({ isOpen, onClose, onApplyClause, contractType }: AISuggestionsModalProps) {
  const [selectedSector, setSelectedSector] = useState('');
  const [specificNeeds, setSpecificNeeds] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedClause[]>([]);
  const [error, setError] = useState('');

  const fetchSuggestions = async () => {
    if (!selectedSector) {
      setError('Veuillez sélectionner un secteur d\'activité');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contracts/ai-suggest-clauses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector: selectedSector,
          contractType,
          specificNeeds: specificNeeds || undefined
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de la génération des suggestions');

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération des suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClause = (clause: SuggestedClause) => {
    onApplyClause(clause);
    onClose();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getPriorityIcon = (priority: string): typeof AlertTriangle => {
    switch (priority) {
      case 'high': return AlertTriangle;
      case 'medium': return Lightbulb;
      case 'low': return Sparkles;
      default: return Sparkles;
    }
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
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden relative flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Assistant IA - Suggestions
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Clauses personnalisées par secteur d'activité
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
              <div className="p-6 overflow-y-auto flex-1">
                {!suggestions.length ? (
                  <div className="space-y-6">
                    {/* Sector Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Secteur d'activité
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {SECTORS.map((sector) => (
                          <button
                            key={sector.value}
                            onClick={() => setSelectedSector(sector.value)}
                            className={`p-3 rounded-xl border-2 transition-all text-left ${
                              selectedSector === sector.value
                                ? 'border-primary bg-primary/10 dark:bg-primary/20'
                                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                            }`}
                          >
                            <span className="text-xl mr-2">{sector.icon}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{sector.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Specific Needs */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Besoins spécifiques (optionnel)
                      </label>
                      <textarea
                        value={specificNeeds}
                        onChange={(e) => setSpecificNeeds(e.target.value)}
                        placeholder="Ex: Télétravail fréquent, données sensibles, horaires décalés..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
                      />
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Generate Button */}
                    <button
                      onClick={fetchSuggestions}
                      disabled={loading || !selectedSector}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Génération en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Générer les suggestions
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Back Button */}
                    <button
                      onClick={() => {
                        setSuggestions([]);
                        setSelectedSector('');
                        setSpecificNeeds('');
                      }}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors mb-4"
                    >
                      ← Nouvelle recherche
                    </button>

                    {/* Suggestions List */}
                    {suggestions.map((suggestion, index) => {
                      const PriorityIconComponent = getPriorityIcon(suggestion.priority);
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${getPriorityColor(suggestion.priority)}`}>
                                  <PriorityIconComponent className="w-3 h-3" />
                                  {suggestion.priority === 'high' ? 'Important' : suggestion.priority === 'medium' ? 'Recommandé' : 'Optionnel'}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{suggestion.category}</span>
                              </div>
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                {suggestion.title}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {suggestion.description}
                              </p>
                              {suggestion.legal_reference && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                                  Référence : {suggestion.legal_reference}
                            </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleApplyClause(suggestion)}
                              className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1 flex-shrink-0"
                            >
                              <Plus className="w-4 h-4" />
                              Ajouter
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
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
