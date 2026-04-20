'use client';

import { AlertTriangle, Shield, CheckCircle2, XCircle, Info, Lock, FileText, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PDPValidationResult {
  isValid: boolean;
  complianceLevel: 'full' | 'partial' | 'none';
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

interface PDPValidatorProps {
  invoice: {
    number?: string;
    issue_date?: string;
    due_date?: string;
    client?: {
      name?: string;
      siret?: string;
      vat_number?: string;
      address?: string;
      city?: string;
      postal_code?: string;
      country?: string;
    };
    client_siret?: string;
    client_vat_number?: string;
    client_address?: string;
    client_city?: string;
    client_postal_code?: string;
    items?: Array<{
      description?: string;
      quantity?: number;
      unit_price?: number;
      vat_rate?: number;
    }>;
  } | any;
  profile?: {
    company_name?: string;
    siret?: string;
    vat_number?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  } | null;
  onFix?: (field: string) => void;
  mode?: 'inline' | 'full' | 'minimal';
}

/**
 * PDPValidator - Validation pour la conformité PDP (Plateforme de Dématérialisation Partagée)
 *
 * Vérifie que la facture contient toutes les informations requises pour :
 * - La transmission électronique (loi anti-fraude TVA)
 * - L'archivage légal (durée de conservation)
 * - L'audit et les contrôles
 * - L'interopérabilité PDP
 */
export function PDPValidator({ invoice, profile, onFix, mode = 'inline' }: PDPValidatorProps) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Vérification du profil vendeur
  if (!profile?.company_name?.trim()) errors.push('Nom de l\'entreprise obligatoire');
  if (!profile?.siret?.trim() || !/^\d{14}$/.test(profile.siret.trim())) errors.push('SIRET invalide (14 chiffres requis)');
  if (!profile?.vat_number?.trim() || !/^FR[A-Z0-9]{11}$/.test(profile.vat_number.trim())) {
    errors.push('Numéro de TVA invalide (format FRXX123456789)');
  }
  if (!profile?.address?.trim()) errors.push('Adresse de l\'entreprise obligatoire');
  if (!profile?.city?.trim()) errors.push('Ville de l\'entreprise obligatoire');
  if (!profile?.postal_code?.trim()) errors.push('Code postal de l\'entreprise obligatoire');

  // Vérification du client
  const clientName = invoice.client?.name || invoice.client_name_override;
  const clientSiret = invoice.client_siret || invoice.client?.siret;
  const clientVat = invoice.client_vat_number || invoice.client?.vat_number;
  const clientAddress = invoice.client_address || invoice.client?.address;
  const clientCity = invoice.client_city || invoice.client?.city;
  const clientPostalCode = invoice.client_postal_code || invoice.client?.postal_code;

  if (!clientName?.trim()) errors.push('Nom du client obligatoire');
  if (clientSiret && !/^\d{14}$/.test(clientSiret.trim())) {
    errors.push('SIRET client invalide (14 chiffres requis)');
  }
  if (clientVat && !/^FR[A-Z0-9]{11}$/.test(clientVat.trim())) {
    errors.push('Numéro de TVA client invalide (format FRXX123456789)');
  }

  // Vérification de la facture
  if (!invoice.number?.trim()) errors.push('Numéro de facture obligatoire');
  if (!invoice.issue_date) errors.push('Date d\'émission obligatoire');
  if (!invoice.due_date) warnings.push('Date d\'échéance recommandée');

  // Vérification des lignes
  if (!invoice.items || invoice.items.length === 0) {
    errors.push('Au moins une ligne de facturation requise');
  } else {
    invoice.items.forEach((item: any, idx: number) => {
      if (!item.description?.trim()) {
        errors.push(`Description de la ligne ${idx + 1} obligatoire`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Quantité ligne ${idx + 1} invalide`);
      }
      if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
        errors.push(`Prix unitaire ligne ${idx + 1} invalide`);
      }
      if (typeof item.vat_rate !== 'number' || ![0, 2.1, 5.5, 10, 20].includes(item.vat_rate)) {
        warnings.push(`Taux de TVA ligne ${idx + 1} non standard (${item.vat_rate}%)`);
      }
    });
  }

  // Recommandations PDP
  if (!clientSiret?.trim()) recommendations.push('Ajoutez le SIRET du client pour la conformité PDP');
  if (!clientVat?.trim()) recommendations.push('Ajoutez le numéro de TVA du client pour les échanges B2B');
  if (!clientAddress?.trim() || !clientCity?.trim() || !clientPostalCode?.trim()) {
    recommendations.push('Adresse complète du client requise pour la facture électronique');
  }

  const complianceLevel: 'full' | 'partial' | 'none' =
    errors.length === 0 && recommendations.length <= 2 ? 'full' :
    errors.length === 0 ? 'partial' :
    'none';

  const result: PDPValidationResult = {
    isValid: errors.length === 0,
    complianceLevel,
    errors,
    warnings,
    recommendations,
  };

  // Mode inline - compact
  if (mode === 'inline') {
    if (result.isValid) {
      return null; // Pas d'affichage si tout est bon
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl border',
          result.complianceLevel === 'none'
            ? 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30'
            : 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30'
        )}
      >
        <div className="flex-shrink-0 mt-0.5">
          {result.complianceLevel === 'none' ? (
            <XCircle size={18} className="text-red-600 dark:text-red-400" />
          ) : (
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            {result.complianceLevel === 'none' ? 'Facture non conforme PDP' : 'Facture partiellement conforme'}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {result.errors.slice(0, 3).map((error, idx) => (
                <li key={idx} className="text-xs text-red-700 dark:text-red-400">
                  • {error}
                </li>
              ))}
              {result.errors.length > 3 && (
                <li className="text-xs text-red-700 dark:text-red-400">
                  • ...et {result.errors.length - 3} autres
                </li>
              )}
            </ul>
          )}
        </div>
      </motion.div>
    );
  }

  // Mode full - détaillé avec actions
  if (mode === 'full') {
    return (
      <div className="space-y-6">
        {/* Compliance Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-start gap-4 p-5 rounded-2xl border-2 shadow-sm',
            result.complianceLevel === 'full'
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30'
              : result.complianceLevel === 'partial'
                ? 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30'
                : 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30'
          )}
        >
          <div className="flex-shrink-0">
            {result.complianceLevel === 'full' ? (
              <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
            ) : result.complianceLevel === 'partial' ? (
              <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400" />
            ) : (
              <XCircle size={24} className="text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {result.complianceLevel === 'full' ? 'Conforme PDP' : 'Conformité PDP incomplète'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {result.complianceLevel === 'full'
                ? 'Toutes les informations requises sont présentes pour la transmission PDP.'
                : result.complianceLevel === 'partial'
                ? 'Certaines informations manquent pour une conformité PDP complète.'
                : 'Informations manquantes pour la conformité PDP.'}
            </p>
          </div>
        </motion.div>

        {/* Vendor Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5"
        >
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <Shield size={20} className="text-primary" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              Vérification vendeur
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldCheck
              label="Nom entreprise"
              present={!!profile?.company_name?.trim()}
              error={!profile?.company_name?.trim() ? 'Obligatoire' : undefined}
            />
            <FieldCheck
              label="SIRET"
              present={!!profile?.siret?.trim() && /^\d{14}$/.test(profile.siret || '')}
              error={!profile?.siret?.trim() ? 'Obligatoire (14 chiffres)' : undefined}
            />
            <FieldCheck
              label="Numéro TVA"
              present={!!profile?.vat_number?.trim() && /^FR[A-Z0-9]{11}$/.test(profile.vat_number || '')}
              error={!profile?.vat_number?.trim() ? 'Format FRXX123456789' : undefined}
            />
            <FieldCheck
              label="Adresse complète"
              present={!!profile?.address?.trim() && !!profile?.city?.trim() && !!profile?.postal_code?.trim()}
              error={!profile?.address?.trim() || !profile?.city?.trim() || !profile?.postal_code?.trim() ? 'Obligatoire' : undefined}
            />
          </div>
        </motion.div>

        {/* Client Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5"
        >
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <Users size={20} className="text-primary" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              Vérification client
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldCheck
              label="Nom client"
              present={!!clientName?.trim()}
              error={!clientName?.trim() ? 'Obligatoire' : undefined}
            />
            <FieldCheck
              label="SIRET client"
              present={!!clientSiret?.trim() && /^\d{14}$/.test(clientSiret || '')}
              error={clientSiret && !/^\d{14}$/.test(clientSiret) ? 'Format invalide' : undefined}
            />
            <FieldCheck
              label="Numéro TVA client"
              present={!!clientVat?.trim() && /^FR[A-Z0-9]{11}$/.test(clientVat || '')}
              error={clientVat && !/^FR[A-Z0-9]{11}$/.test(clientVat) ? 'Format FRXX123456789' : undefined}
            />
            <FieldCheck
              label="Adresse client"
              present={!!clientAddress?.trim() && !!clientCity?.trim() && !!clientPostalCode?.trim()}
              error={!clientAddress?.trim() || !clientCity?.trim() || !clientPostalCode?.trim() ? 'Recommandé' : undefined}
            />
          </div>
        </motion.div>

        {/* Invoice Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5"
        >
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <FileText size={20} className="text-primary" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              Vérification facture
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldCheck
              label="Numéro facture"
              present={!!invoice.number?.trim()}
              error={!invoice.number?.trim() ? 'Obligatoire' : undefined}
            />
            <FieldCheck
              label="Date émission"
              present={!!invoice.issue_date}
              error={!invoice.issue_date ? 'Obligatoire' : undefined}
            />
            <FieldCheck
              label="Lignes valides"
              present={!!invoice.items && invoice.items.length > 0 && invoice.items.every((i: any) => i.description?.trim() && i.quantity && i.unit_price)}
              error={!invoice.items || invoice.items.length === 0 ? 'Au moins une ligne requise' : undefined}
            />
          </div>
        </motion.div>

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-200 dark:border-blue-500/30 p-5"
          >
            <div className="flex items-start gap-3 mb-3">
              <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">
                  Recommandations pour une conformité PDP optimale
                </h4>
              </div>
            </div>
            <ul className="space-y-2">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/30 p-5"
          >
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-1">
                  Points d'attention
                </h4>
              </div>
            </div>
            <ul className="space-y-2">
              {result.warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <Clock size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    );
  }

  // Mode minimal - juste le statut
  if (mode === 'minimal') {
    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold',
        result.complianceLevel === 'full'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
          : result.complianceLevel === 'partial'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
            : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
      )}>
        <Shield size={12} />
        {result.complianceLevel === 'full' ? 'PDP OK' : 'PDP incomplet'}
      </div>
    );
  }

  return result;
}

function FieldCheck({ label, present, error }: { label: string; present: boolean; error?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {present ? (
          <CheckCircle2 size={16} className="text-emerald-500" />
        ) : (
          <XCircle size={16} className={error ? "text-red-500" : "text-gray-300"} />
        )}
      </div>
      {error && (
        <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export default PDPValidator;
