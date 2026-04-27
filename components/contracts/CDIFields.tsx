'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { MagicSelect, FRENCH_CCN_OPTIONS } from '@/components/ui/MagicSelect';
import { ContractFormData } from '@/types';

const inputClass = 'w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm';

interface Props {
  formData: ContractFormData;
  onChange: (data: Partial<ContractFormData>) => void;
}

export function CDIFields({ formData, onChange }: Props) {
  const set = (updates: Partial<ContractFormData>) => onChange(updates);

  return (
    <>
      <input placeholder="Classification conventionnelle" value={formData.contract_classification || ''} onChange={(e) => set({ contract_classification: e.target.value })} className={inputClass} />
      <input placeholder="Heures hebdomadaires" value={formData.working_hours || ''} onChange={(e) => set({ working_hours: e.target.value })} className={inputClass} />
      <MagicSelect
        options={FRENCH_CCN_OPTIONS}
        value={formData.collective_agreement || ''}
        onChange={(value) => set({ collective_agreement: value })}
        placeholder="Sélectionner la convention collective..."
        label="Convention collective nationale"
        variant="default"
        searchable
      />

      {/* Clauses spéciales CDI */}
      <div className="space-y-2 pt-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Clauses spéciales</p>
        {[
          { key: 'probation_clause' as const, label: "Clause de période d'essai renouvelable" },
          { key: 'non_compete_clause' as const, label: 'Clause de non-concurrence' },
          { key: 'mobility_clause' as const, label: 'Clause de mobilité' },
        ].map((clause) => (
          <label key={clause.key} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-white/70 dark:hover:bg-slate-800/70 transition-colors">
            <input
              type="checkbox"
              checked={!!(formData as any)[clause.key]}
              onChange={(e) => set({ [clause.key]: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">{clause.label}</span>
          </label>
        ))}

        {formData.non_compete_clause && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 space-y-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"
          >
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Obligatoire : Indemnité compensatoire</p>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Durée (ex: 12 mois)" value={formData.non_compete_duration || ''} onChange={(e) => set({ non_compete_duration: e.target.value })} className="px-3 py-2 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <input placeholder="Indemnité mensuelle (€)" type="number" value={formData.non_compete_compensation || ''} onChange={(e) => set({ non_compete_compensation: e.target.value })} className="px-3 py-2 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <input placeholder="Zone géographique (ex: France métropolitaine)" value={formData.non_compete_area || ''} onChange={(e) => set({ non_compete_area: e.target.value })} className="w-full px-3 py-2 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </motion.div>
        )}

        {formData.mobility_clause && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
            <input placeholder="Zone géographique de mobilité" value={formData.mobility_area || ''} onChange={(e) => set({ mobility_area: e.target.value })} className={inputClass} />
          </motion.div>
        )}
      </div>
    </>
  );
}
