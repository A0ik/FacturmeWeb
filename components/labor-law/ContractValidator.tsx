'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, X, ChevronDown, ChevronRight, FileText, Shield, AlertCircle } from 'lucide-react';
import { validateContract, getAllSectors } from '@/lib/labor-law/rules';
import { calculerSalaireMinimum } from '@/lib/labor-law/bulletin-paie';

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source?: string;
}

interface ContractValidatorProps {
  contractType: 'cdd' | 'cdi' | 'alternance' | 'portage' | 'interim' | 'stage';
  contractData: any;
  sector?: string;
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
  compact?: boolean;
}

export function ContractValidator({
  contractType,
  contractData,
  sector,
  onValidationChange,
  compact = false
}: ContractValidatorProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string>(sector || '');

  useEffect(() => {
    if (!contractData) return;

    const validateContractAsync = async () => {
      const result = validateContract(contractType, contractData, selectedSector);
      const validationErrors: ValidationError[] = [];

      // Convertir les erreurs de validation
      result.errors.forEach((error, index) => {
        validationErrors.push({
          field: `error_${index}`,
          message: error,
          severity: 'error',
          source: 'Code du travail'
        });
      });

      // Convertir les warnings
      result.warnings.forEach((warning, index) => {
        validationErrors.push({
          field: `warning_${index}`,
          message: warning,
          severity: 'warning',
          source: 'Recommandation légale'
        });
      });

      // Vérifier le salaire minimum avec le service SMIC dynamique
      const salary = parseFloat(contractData.salaryAmount) || 0;
      const type = contractData.salaryFrequency === 'hourly' ? 'horaire' : 'mensuel';
      const hours = contractData.workingHours ? parseFloat(contractData.workingHours) : 35;

      try {
        const response = await fetch(`/api/smic?amount=${salary}&type=${type}&hours=${hours}`);
        if (response.ok) {
          const smicCheck = await response.json();
          if (!smicCheck.conforme && contractType !== 'stage') {
            validationErrors.push({
              field: 'salary',
              message: `Le salaire est inférieur au SMIC. ${smicCheck.message}`,
              severity: 'error',
              source: `Article L3231-12 du Code du travail - ${smicCheck.actuel?.dateMiseAJour || '2026'}`
            });
          }
        }
      } catch (smicError) {
        // En cas d'erreur API, utiliser la vérification de fallback
        const employeeAge = contractData.employeeBirthDate
          ? new Date().getFullYear() - new Date(contractData.employeeBirthDate).getFullYear()
          : 26;

        const minimumSalary = calculerSalaireMinimum(
          contractType,
          contractData.statut || 'non_cadre',
          employeeAge,
          parseFloat(contractData.workingHours) || 35
        );

        if (salary < minimumSalary.montant && contractType !== 'stage') {
          validationErrors.push({
            field: 'salary',
            message: `Le salaire (${salary.toFixed(2)}€) est inférieur au salaire minimum légal (${minimumSalary.montant.toFixed(2)}€). ${minimumSalary.source}`,
            severity: 'error',
            source: 'Article L3231-12 du Code du travail'
          });
        }
      }

      setErrors(validationErrors);
      onValidationChange?.(result.valid, validationErrors);
    };

    validateContractAsync();
  }, [contractData, contractType, selectedSector, onValidationChange]);

  const errorsBySeverity = {
    error: errors.filter(e => e.severity === 'error'),
    warning: errors.filter(e => e.severity === 'warning'),
    info: errors.filter(e => e.severity === 'info')
  };

  const hasErrors = errors.length > 0;
  const hasCriticalErrors = errorsBySeverity.error.length > 0;
  const isValid = !hasCriticalErrors;

  // Pour le mode compact
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isValid ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
            <span className="text-xs font-semibold text-green-700 dark:text-green-300">
              Contrat conforme
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
            <span className="text-xs font-semibold text-red-700 dark:text-red-300">
              {errorsBySeverity.error.length} erreur{errorsBySeverity.error.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header cliquable */}
      <motion.button
        type="button"
        onClick={() => setExpanded(!expanded)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`
          w-full flex items-center justify-between gap-3 p-4 rounded-2xl
          transition-all duration-200 border-2
          ${isValid
            ? 'bg-green-50/50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isValid
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {isValid ? <Shield size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {isValid ? 'Contrat conforme' : 'Action requise'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {isValid
                ? 'Toutes les mentions obligatoires sont présentes'
                : `${errorsBySeverity.error.length} erreur${errorsBySeverity.error.length > 1 ? 's' : ''} à corriger`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isValid && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
              <AlertCircle size={12} />
              Bloquant
            </span>
          )}
          {errorsBySeverity.warning.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Info size={12} />
              {errorsBySeverity.warning.length} avertissement{errorsBySeverity.warning.length > 1 ? 's' : ''}
            </span>
          )}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} className={isValid ? 'text-green-600' : 'text-red-600'} />
          </motion.div>
        </div>
      </motion.button>

      {/* Détails des erreurs/avertissements */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 p-2">
              {/* Sélecteur de secteur */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Secteur d'activité (optionnel)
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="">Sélectionner un secteur...</option>
                  {getAllSectors().map((sectorRule) => (
                    <option key={sectorRule.id} value={sectorRule.id}>
                      {sectorRule.sector} - {sectorRule.collectiveAgreement}
                    </option>
                  ))}
                </select>
              </div>

              {/* Erreurs bloquantes */}
              {errorsBySeverity.error.length > 0 && (
                <div className="space-y-2">
                  {errorsBySeverity.error.map((error) => (
                    <motion.div
                      key={error.field}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                    >
                      <X size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                          {error.message}
                        </p>
                        {error.source && (
                          <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                            📜 {error.source}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Avertissements */}
              {errorsBySeverity.warning.length > 0 && (
                <div className="space-y-2">
                  {errorsBySeverity.warning.map((warning) => (
                    <motion.div
                      key={warning.field}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
                    >
                      <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-amber-900 dark:text-amber-100">
                          {warning.message}
                        </p>
                        {warning.source && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            📜 {warning.source}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Infos */}
              {errorsBySeverity.info.length > 0 && (
                <div className="space-y-2">
                  {errorsBySeverity.info.map((info) => (
                    <motion.div
                      key={info.field}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
                    >
                      <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          {info.message}
                        </p>
                        {info.source && (
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            📜 {info.source}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Message de conformité si valide */}
              {isValid && errorsBySeverity.warning.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl"
                >
                  <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm font-bold text-green-900 dark:text-green-100">
                      Félicitations ! Votre contrat est conforme aux exigences légales.
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Toutes les mentions obligatoires du Code du travail sont présentes.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Mention légale importante */}
              <div className="mt-3 p-3 bg-gray-100 dark:bg-slate-800 rounded-xl">
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  <strong>⚠️ Important :</strong> Ce contrôle est basé sur les règles du Code du travail français.
                  Pour une validation juridique définitive, faites relire ce contrat par un avocat ou juriste spécialisé
                  en droit du travail. Les taux de cotisation sont mis à jour en 2024 mais peuvent varier selon votre convention collective.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Composant compact pour affichage inline
export function ValidationBadge({ contractType, contractData }: { contractType: string; contractData: any }) {
  const [isValid, setIsValid] = useState(false);
  const [errors, setErrors] = useState(0);

  useEffect(() => {
    if (contractData) {
      const result = validateContract(contractType, contractData);
      setIsValid(result.valid);
      setErrors(result.errors.length);
    }
  }, [contractData, contractType]);

  if (isValid) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
        <CheckCircle size={12} className="text-green-600 dark:text-green-400" />
        <span className="text-xs font-medium text-green-700 dark:text-green-300">Conforme</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-lg">
      <AlertTriangle size={12} className="text-red-600 dark:text-red-400" />
      <span className="text-xs font-medium text-red-700 dark:text-red-300">{errors} erreur{errors > 1 ? 's' : ''}</span>
    </div>
  );
}
