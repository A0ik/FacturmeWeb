'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { Invoice, Profile } from '@/types';
import { isFacturXEligible } from '@/lib/facturx';
import { motion, AnimatePresence } from 'framer-motion';

interface FacturXWarningsProps {
  invoice: {
    number?: string;
    issue_date?: string;
    due_date?: string;
    document_type?: string;
    client?: {
      name?: string;
      siret?: string;
      vat_number?: string;
      address?: string;
      city?: string;
      postal_code?: string;
      country?: string;
    };
    client_name_override?: string;
    client_email?: string;
    client_phone?: string;
    client_address?: string;
    client_city?: string;
    client_postal_code?: string;
    client_siret?: string;
    client_vat_number?: string;
    items?: Array<{
      description?: string;
      quantity?: number;
      unit_price?: number;
      vat_rate?: number;
    }>;
  } | Partial<Invoice>;
  profile?: Profile | null;
  variant?: 'inline' | 'banner' | 'card' | 'accordion';
}

/**
 * Composant d'avertissements Factur-X
 * Affiche les champs manquants pour être conforme au format Factur-X
 */
export function FacturXWarnings({ invoice, profile, variant = 'inline' }: FacturXWarningsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Vérifier l'éligibilité Factur-X
  const eligibility = isFacturXEligible(invoice as Invoice, (profile || {}) as Profile);

  if (eligibility.eligible && (!eligibility.warnings || eligibility.warnings.length === 0)) {
    return null;
  }

  // Extraire les warnings
  const warnings = eligibility.warnings || [];

  // Champs manquants pour Factur-X
  const missingFields: string[] = [];
  const criticalFields: string[] = [];

  // Vérifier les champs vendeur (profil)
  if (!profile?.company_name?.trim()) criticalFields.push('Nom de l\'entreprise');
  if (!profile?.siret?.trim()) missingFields.push('SIRET du vendeur');
  if (!profile?.vat_number?.trim()) missingFields.push('Numéro de TVA du vendeur');
  if (!profile?.address?.trim()) missingFields.push('Adresse du vendeur');
  if (!profile?.city?.trim()) missingFields.push('Ville du vendeur');
  if (!profile?.postal_code?.trim()) missingFields.push('Code postal du vendeur');

  // Vérifier les champs client (priorité aux champs directs de l'invoice)
  const clientName = invoice.client?.name || invoice.client_name_override;
  const clientSiret = invoice.client_siret || invoice.client?.siret;
  const clientVat = invoice.client_vat_number || invoice.client?.vat_number;
  const clientAddress = invoice.client_address || invoice.client?.address;
  const clientCity = invoice.client_city || invoice.client?.city;
  const clientPostalCode = invoice.client_postal_code || invoice.client?.postal_code;

  if (!clientName?.trim()) criticalFields.push('Nom du client');
  if (!clientSiret?.trim()) missingFields.push('SIRET du client');
  if (!clientVat?.trim()) missingFields.push('Numéro de TVA du client');
  if (!clientAddress?.trim()) missingFields.push('Adresse du client');
  if (!clientCity?.trim()) missingFields.push('Ville du client');
  if (!clientPostalCode?.trim()) missingFields.push('Code postal du client');

  // Vérifier les champs de facture
  if (!invoice.number?.trim()) criticalFields.push('Numéro de facture');
  if (!invoice.issue_date) criticalFields.push('Date d\'émission');

  // Vérifier les lignes
  if (!invoice.items || invoice.items.length === 0) {
    criticalFields.push('Aucune ligne de facturation');
  } else {
    invoice.items.forEach((item, idx) => {
      if (!item.description?.trim()) missingFields.push(`Description ligne ${idx + 1}`);
      if (!item.quantity || item.quantity <= 0) missingFields.push(`Quantité ligne ${idx + 1}`);
      if (!item.unit_price || item.unit_price <= 0) missingFields.push(`Prix ligne ${idx + 1}`);
    });
  }

  // Variant inline - compact
  if (variant === 'inline') {
    return (
      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
        <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-400">
            Factur-X : {criticalFields.length > 0 ? 'Champs obligatoires manquants' : 'Informations incomplètes'}
          </p>
          {criticalFields.length > 0 && (
            <p className="text-[10px] text-amber-700 dark:text-amber-500 mt-0.5">
              Obligatoires : {criticalFields.slice(0, 3).join(', ')}
              {criticalFields.length > 3 && ` ...et ${criticalFields.length - 3} autres`}
            </p>
          )}
          {criticalFields.length === 0 && missingFields.length > 0 && (
            <p className="text-[10px] text-amber-700 dark:text-amber-500 mt-0.5">
              Recommandé : {missingFields.slice(0, 2).join(', ')}
              {missingFields.length > 2 && ` ...et ${missingFields.length - 2} autres`}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Variant banner - plus détaillé
  if (variant === 'banner') {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">
              Factur-X : Données manquantes
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
              Pour générer un PDF Factur-X conforme, veuillez compléter les informations suivantes :
            </p>
            {criticalFields.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">
                  Obligatoires
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {criticalFields.map((field, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded text-[10px] font-semibold">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {missingFields.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase">
                  Recommandés
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {missingFields.map((field, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-500 rounded text-[10px] font-semibold">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Variant card - complet avec check
  return (
    <div className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
          <AlertCircle size={18} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            Compatibilité Factur-X
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Vérifiez que toutes les informations requises sont présentes.
          </p>
        </div>
      </div>

      {/* Vendeur */}
      <div className="space-y-2 mb-4">
        <p className="text-[10px] font-bold text-gray-500 uppercase">Vos informations</p>
        <div className="grid grid-cols-2 gap-2">
          <FieldStatus
            label="Entreprise"
            present={!!profile?.company_name?.trim()}
          />
          <FieldStatus
            label="SIRET"
            present={!!profile?.siret?.trim()}
          />
          <FieldStatus
            label="TVA"
            present={!!profile?.vat_number?.trim()}
          />
          <FieldStatus
            label="Adresse complète"
            present={!!profile?.address?.trim() && !!profile?.city?.trim() && !!profile?.postal_code?.trim()}
          />
        </div>
      </div>

      {/* Client */}
      <div className="space-y-2 mb-4">
        <p className="text-[10px] font-bold text-gray-500 uppercase">Client</p>
        <div className="grid grid-cols-2 gap-2">
          <FieldStatus
            label="Nom"
            present={!!clientName?.trim()}
          />
          <FieldStatus
            label="SIRET"
            present={!!clientSiret?.trim()}
          />
          <FieldStatus
            label="TVA"
            present={!!clientVat?.trim()}
          />
          <FieldStatus
            label="Adresse complète"
            present={!!clientAddress?.trim() && !!clientCity?.trim() && !!clientPostalCode?.trim()}
          />
        </div>
      </div>

      {/* Facture */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-gray-500 uppercase">Facture</p>
        <div className="grid grid-cols-2 gap-2">
          <FieldStatus
            label="Numéro"
            present={!!invoice.number?.trim()}
          />
          <FieldStatus
            label="Date d'émission"
            present={!!invoice.issue_date}
          />
          <FieldStatus
            label="Lignes valides"
            present={!!invoice.items && invoice.items.length > 0 && invoice.items.every(i => i.description?.trim() && i.quantity && i.unit_price)}
          />
        </div>
      </div>

      {(criticalFields.length > 0 || missingFields.length > 0) && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10">
          <p className="text-[10px] text-gray-500">
            {criticalFields.length > 0 && <span className="text-red-600 font-bold">{criticalFields.length} obligatoire{criticalFields.length > 1 ? 's' : ''}</span>}
            {criticalFields.length > 0 && missingFields.length > 0 && <span> • </span>}
            {missingFields.length > 0 && <span className="text-amber-600 font-bold">{missingFields.length} recommandé{missingFields.length > 1 ? 's' : ''}</span>}
          </p>
        </div>
      )}
    </div>
  );

  // Variant accordion - replié par défaut
  if (variant === 'accordion') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-3 p-3 hover:bg-amber-100/50 dark:hover:bg-amber-500/20 transition-colors text-left"
        >
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex-shrink-0">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-900 dark:text-amber-300 truncate">
              Factur-X : {criticalFields.length > 0 ? 'Champs obligatoires manquants' : 'Informations incomplètes'}
            </p>
            <p className="text-[10px] text-amber-700 dark:text-amber-500">
              {criticalFields.length > 0 ? `${criticalFields.length} champ(s) obligatoire(s)` : `${missingFields.length} champ(s) recommandé(s)`}
            </p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronRight size={16} className="text-amber-600 dark:text-amber-400" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-1 border-t border-amber-200/50 dark:border-amber-500/20">
                {criticalFields.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1">
                      Obligatoires
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {criticalFields.map((field, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded text-[10px] font-semibold">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {missingFields.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase mb-1">
                      Recommandés
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {missingFields.map((field, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-500 rounded text-[10px] font-semibold">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
}

function FieldStatus({ label, present }: { label: string; present: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {present ? (
        <CheckCircle2 size={12} className="text-emerald-500" />
      ) : (
        <AlertCircle size={12} className="text-red-500" />
      )}
      <span className={`text-[10px] font-medium ${present ? 'text-gray-700 dark:text-gray-300' : 'text-red-600 dark:text-red-400'}`}>
        {label}
      </span>
    </div>
  );
}

export default FacturXWarnings;
