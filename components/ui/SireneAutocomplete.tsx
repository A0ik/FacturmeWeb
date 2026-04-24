'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Building2, MapPin, Check, Loader2, X } from 'lucide-react';

interface SireneCompany {
  siren: string;
  siret: string;
  nom_complet: string;
  nom_raison_sociale: string;
  adresse: string;
  code_postal: string;
  ville: string;
  pays?: string;
  activite_principale?: string;
  date_creation?: string;
  etat_administratif?: string;
}

interface SireneAutocompleteProps {
  onCompanySelect: (company: {
    name: string;
    address: string;
    postalCode: string;
    city: string;
    siret: string;
    siren: string;
  }) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  initialCompanyName?: string;
  initialAddress?: string;
  initialPostalCode?: string;
  initialCity?: string;
  initialSiret?: string;
}

export function SireneAutocomplete({
  onCompanySelect,
  disabled = false,
  placeholder = 'Rechercher une entreprise...',
  label,
  initialCompanyName = '',
  initialAddress = '',
  initialPostalCode = '',
  initialCity = '',
  initialSiret = ''
}: SireneAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState(initialCompanyName);
  const [suggestions, setSuggestions] = useState<SireneCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedCompany, setSelectedCompany] = useState<SireneCompany | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch companies from API SIRENE (via INSEE)
  const searchCompanies = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Utilisation de l'API publique SIRENE/INSEE
      const response = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&perPage=10`
      );

      if (!response.ok) throw new Error('Erreur lors de la recherche');

      const data = await response.json();

      if (data.results && Array.isArray(data.results)) {
        const companies: SireneCompany[] = data.results
          .filter((result: any) => result.etat_administratif === 'A') // Uniquement les entreprises actives
          .map((result: any) => ({
            siren: result.siren || '',
            siret: result.siege.siret || result.siren || '',
            nom_complet: result.nom_complet || result.nom_raison_sociale || '',
            nom_raison_sociale: result.nom_raison_sociale || result.nom_complet || '',
            adresse: result.siege?.adresse || '',
            code_postal: result.siege?.code_postal || '',
            ville: result.siege?.libelle_commune || result.siege?.ville || '',
            pays: result.siege?.pays || 'France',
            activite_principale: result.activite_principale || '',
            date_creation: result.date_creation_immatriculation || '',
            etat_administratif: result.etat_administratif || ''
          }));
        setSuggestions(companies);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Erreur recherche SIRENE:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 2 && !selectedCompany) {
        searchCompanies(searchTerm);
        setIsOpen(true);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            handleSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, suggestions]);

  const handleSelect = (company: SireneCompany) => {
    setSelectedCompany(company);
    setSearchTerm(company.nom_complet);
    setIsOpen(false);

    // Notify parent component
    onCompanySelect({
      name: company.nom_raison_sociale || company.nom_complet,
      address: company.adresse,
      postalCode: company.code_postal,
      city: company.ville,
      siret: company.siret,
      siren: company.siren
    });
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedCompany(null);
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Building2 size={14} className="text-primary" />
          {label}
        </label>
      )}

      {/* Input Field */}
      <div className="relative">
        <motion.div
          className="relative flex items-center gap-3"
          animate={{ scale: isOpen ? 1.01 : 1 }}
          transition={{ duration: 0.15 }}
        >
          {/* Search Icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            {loading ? (
              <Loader2 size={20} className="text-primary animate-spin" />
            ) : (
              <Search size={20} className={selectedCompany ? 'text-primary' : 'text-gray-400'} />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (selectedCompany) setSelectedCompany(null);
            }}
            onFocus={() => {
              if (searchTerm.length >= 2) {
                setIsOpen(true);
              }
            }}
            disabled={disabled}
            placeholder={placeholder}
            className={`
              w-full pl-12 pr-12 py-3.5 rounded-2xl border-2 bg-white/50 dark:bg-slate-800/50
              backdrop-blur-sm transition-all duration-200 text-sm
              ${disabled
                ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-white/5'
                : 'border-gray-200 dark:border-white/10 hover:border-primary/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none'
              }
              ${isOpen ? 'border-primary/50 ring-2 ring-primary/20' : ''}
              ${selectedCompany ? 'border-primary/30 bg-primary/5' : ''}
            `}
          />

          {/* Clear Button */}
          {searchTerm && !disabled && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={handleClear}
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={16} className="text-gray-400" />
            </motion.button>
          )}
        </motion.div>

        {/* Selected Badge */}
        <AnimatePresence>
          {selectedCompany && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-2 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary/20 to-purple-600/20 border border-primary/30 rounded-xl"
            >
              <Check size={16} className="text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {selectedCompany.nom_raison_sociale}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  SIRET: {selectedCompany.siret}
                </p>
              </div>
              <button
                onClick={handleClear}
                type="button"
                className="p-1 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={14} className="text-gray-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dropdown Suggestions */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-[9999] w-full mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[350px]"
          >
            {/* Results Header */}
            <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {suggestions.length} entreprise{suggestions.length > 1 ? 's' : ''} trouvée{suggestions.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Results List */}
            <div className="overflow-y-auto max-h-[300px] py-2">
              {suggestions.map((company, index) => (
                <motion.button
                  key={company.siret || index}
                  type="button"
                  onClick={() => handleSelect(company)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`
                    w-full px-4 py-3 flex items-start gap-3 transition-all duration-150
                    ${index === selectedIndex
                      ? 'bg-gradient-to-r from-primary/20 to-purple-600/20 border-l-4 border-primary'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800 border-l-4 border-transparent'
                    }
                  `}
                >
                  {/* Company Icon */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 size={18} className="text-white" />
                  </div>

                  {/* Company Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-sm font-semibold truncate ${index === selectedIndex ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                      {company.nom_raison_sociale || company.nom_complet}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {company.code_postal} {company.ville}
                      </p>
                    </div>
                    {company.activite_principale && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                        {company.activite_principale}
                      </p>
                    )}
                  </div>

                  {/* SIRET */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-mono text-gray-400 dark:text-gray-500">
                      {company.siret?.slice(0, 3)} {company.siret?.slice(3, 6)} {company.siret?.slice(6, 9)} {company.siret?.slice(9)}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/50">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Données provenant de l'API SIRENE (INSEE)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      <AnimatePresence>
        {isOpen && !loading && searchTerm.length >= 2 && suggestions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[9999] w-full mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-8 text-center"
          >
            <Building2 size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aucune entreprise trouvée pour "{searchTerm}"
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Essayez avec le nom de l'entreprise, le SIRET ou le SIREN
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SireneAutocomplete;
