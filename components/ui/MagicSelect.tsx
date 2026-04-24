'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check, Building2, Briefcase, FileText, Users, Calendar, Globe, Sparkles, Star } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: any;
  color?: string;
  category?: string;
}

interface MagicSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  icon?: any;
  variant?: 'default' | 'contract' | 'benefit' | 'company';
  disabled?: boolean;
  searchable?: boolean;
}

export const CONTRACT_CDD_REASONS = [
  {
    value: 'remplacement',
    label: 'CDD de remplacement',
    description: 'Remplacement d\'un salarié absent (maladie, congé maternité, etc.)',
    icon: Users,
    color: 'from-blue-500 to-cyan-500',
    category: 'CDD'
  },
  {
    value: 'usage',
    label: 'CDD d\'usage',
    description: 'Secteurs autorisés par décret (Horeca, événementiel, etc.)',
    icon: Briefcase,
    color: 'from-purple-500 to-pink-500',
    category: 'CDD'
  },
  {
    value: 'objet_defini',
    label: 'CDD à objet défini',
    description: 'Projet spécifique avec date de fin incertaine',
    icon: Sparkles,
    color: 'from-emerald-500 to-teal-500',
    category: 'CDD'
  },
  {
    value: 'accroissement',
    label: 'CDD d\'accroissement temporaire d\'activité',
    description: 'Augmentation temporaire de l\'activité de l\'entreprise',
    icon: Calendar,
    color: 'from-orange-500 to-red-500',
    category: 'CDD'
  },
  {
    value: 'saisonnier',
    label: 'CDD saisonnier',
    description: 'Travail saisonnier récurrent à dates fixées',
    icon: Calendar,
    color: 'from-amber-500 to-yellow-500',
    category: 'CDD'
  },
  {
    value: 'temps_partiel',
    label: 'Contrat à temps partiel / intermittent',
    description: 'Durée de travail inférieure à la durée légale',
    icon: FileText,
    color: 'from-indigo-500 to-violet-500',
    category: 'CDD'
  }
];

export const CONTRACT_CDI_TYPES = [
  {
    value: 'classique',
    label: 'CDI classique',
    description: 'Contrat à durée indéterminée standard',
    icon: Briefcase,
    color: 'from-emerald-500 to-green-600',
    category: 'CDI'
  },
  {
    value: 'temps_partiel',
    label: 'CDI à temps partiel',
    description: 'Durée de travail inférieure à la durée légale',
    icon: Calendar,
    color: 'from-blue-500 to-cyan-500',
    category: 'CDI'
  },
  {
    value: 'intermittent',
    label: 'CDI intermittent',
    description: 'Travail discontinu dans certains secteurs',
    icon: FileText,
    color: 'from-purple-500 to-pink-500',
    category: 'CDI'
  },
  {
    value: 'chantier',
    label: 'CDI de chantier',
    description: 'Travail sur un chantier avec succession de contrats',
    icon: Building2,
    color: 'from-orange-500 to-red-500',
    category: 'CDI'
  },
  {
    value: 'objet_defini',
    label: 'CDI à objet défini',
    description: 'CDI avec terme certain lié à un projet',
    icon: Sparkles,
    color: 'from-indigo-500 to-violet-500',
    category: 'CDI'
  }
];

export const CONTRACT_OTHER_TYPES = [
  {
    value: 'apprentissage',
    label: 'Contrat d\'apprentissage',
    description: 'Formation en alternance avec objectif d\'embauche',
    icon: FileText,
    color: 'from-blue-500 to-cyan-500',
    category: 'Alternance'
  },
  {
    value: 'professionnalisation',
    label: 'Contrat de professionnalisation',
    description: 'Formation en alternance pour adultes',
    icon: FileText,
    color: 'from-purple-500 to-pink-500',
    category: 'Alternance'
  },
  {
    value: 'cui_cie',
    label: 'CUI - CIE (Contrat initiative emploi)',
    description: 'Contrat unique d\'insertion pour les demandeurs d\'emploi',
    icon: Users,
    color: 'from-emerald-500 to-teal-500',
    category: 'Insertion'
  },
  {
    value: 'cui_cae',
    label: 'CUI - CAE (Contrat d\'accompagnement)',
    description: 'Contrat d\'accompagnement dans l\'emploi',
    icon: Users,
    color: 'from-teal-500 to-cyan-500',
    category: 'Insertion'
  },
  {
    value: 'portage',
    label: 'Portage salarial',
    description: 'Statut hybride salarié/entrepreneur',
    icon: Briefcase,
    color: 'from-orange-500 to-red-500',
    category: 'Autre'
  },
  {
    value: 'interim',
    label: 'Contrat de travail temporaire (Intérim)',
    description: 'Mission temporaire via une agence d\'intérim',
    icon: Calendar,
    color: 'from-amber-500 to-yellow-500',
    category: 'Autre'
  },
  {
    value: 'domicile',
    label: 'Contrat de travail à domicile',
    description: 'Travail effectué au domicile du salarié',
    icon: Building2,
    color: 'from-indigo-500 to-violet-500',
    category: 'Autre'
  }
];

export const BENEFIT_OPTIONS = [
  { value: 'transport', label: 'Titres de transport', icon: Calendar, color: 'from-blue-500 to-cyan-500' },
  { value: 'meal', label: 'Titres restaurant', icon: FileText, color: 'from-orange-500 to-red-500' },
  { value: 'health', label: 'Complémentaire santé', icon: Briefcase, color: 'from-emerald-500 to-teal-500' },
  { value: 'mutuelle', label: 'Mutuelle entreprise', icon: Users, color: 'from-purple-500 to-pink-500' },
  { value: 'prevoyance', label: 'Prévoyance', icon: Sparkles, color: 'from-indigo-500 to-violet-500' },
  { value: 'epargne', label: 'Épargne salariale', icon: Globe, color: 'from-amber-500 to-yellow-500' },
  { value: 'vehicule', label: 'Véhicule de fonction', icon: Building2, color: 'from-rose-500 to-pink-600' },
  { value: 'telephone', label: 'Téléphone', icon: FileText, color: 'from-cyan-500 to-blue-600' },
  { value: 'autres', label: 'Autres avantages', icon: Star, color: 'from-violet-500 to-purple-600' }
];

export function MagicSelect({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  label,
  icon: LabelIcon,
  variant = 'default',
  disabled = false,
  searchable = false
}: MagicSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Group options by category
  const groupedOptions = options.reduce((acc, option) => {
    const category = option.category || 'Autre';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(option);
    return acc;
  }, {} as Record<string, SelectOption[]>);

  // Filter options based on search term
  const filteredOptions = searchTerm
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const filteredGroupedOptions = searchTerm
    ? filteredOptions.reduce((acc, option) => {
        const category = option.category || 'Autre';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(option);
        return acc;
      }, {} as Record<string, SelectOption[]>)
    : groupedOptions;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={selectRef} className="relative">
      {label && (
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          {LabelIcon && <LabelIcon size={14} className="text-primary" />}
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.01 }}
        whileTap={{ scale: disabled ? 1 : 0.99 }}
        className={`
          w-full relative flex items-center justify-between gap-3
          px-4 py-3.5 rounded-2xl border-2
          bg-white/50 dark:bg-slate-800/50
          backdrop-blur-sm
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-white/5' : 'border-gray-200 dark:border-white/10 hover:border-primary/30 cursor-pointer'}
          ${isOpen ? 'border-primary/50 ring-2 ring-primary/20' : ''}
        `}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {selectedOption?.icon ? (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${selectedOption.color || 'from-gray-400 to-gray-500'}`}>
              <selectedOption.icon size={18} className="text-white" />
            </div>
          ) : LabelIcon && !selectedOption ? (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-slate-700">
              <LabelIcon size={18} className="text-gray-400" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary/20 to-purple-600/20">
              <Briefcase size={18} className="text-primary" />
            </div>
          )}

          <div className="flex-1 min-w-0 text-left">
            {selectedOption ? (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {selectedOption.label}
                </p>
                {selectedOption.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {selectedOption.description}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {placeholder}
              </p>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className={isOpen ? 'text-primary' : 'text-gray-400'} />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-[9999] w-full mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[400px] flex flex-col"
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-3 border-b border-gray-100 dark:border-white/5">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {Object.entries(filteredGroupedOptions).map(([category, categoryOptions]) => (
                <div key={category}>
                  {/* Category Header */}
                  {category !== 'Autre' && (
                    <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                      {category}
                    </div>
                  )}

                  {/* Category Options */}
                  {categoryOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = option.value === value;

                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`
                          w-full relative flex items-center gap-3
                          px-3 py-3 rounded-2xl
                          transition-all duration-150
                          ${isSelected
                            ? 'bg-gradient-to-r from-primary/20 to-purple-600/20 border-2 border-primary/30'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800 border-2 border-transparent'
                          }
                        `}
                      >
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${option.color || 'from-gray-400 to-gray-500'}`}>
                          {Icon ? <Icon size={18} className="text-white" /> : <Briefcase size={18} className="text-white" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                            {option.label}
                          </p>
                          {option.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {option.description}
                            </p>
                          )}
                        </div>

                        {/* Checkmark for selected */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex-shrink-0"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check size={14} className="text-white" />
                            </div>
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))}

              {/* No results */}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-8 text-center">
                  <Search size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aucun résultat pour "{searchTerm}"
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MagicSelect;
