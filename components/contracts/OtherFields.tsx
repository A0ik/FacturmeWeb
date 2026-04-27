'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { MagicSelect, CONTRACT_OTHER_TYPES, FRENCH_CCN_OPTIONS } from '@/components/ui/MagicSelect';
import { MagnificentDatePicker } from '@/components/ui/MagnificentDatePicker';
import { ContractFormData, ContractCategory } from '@/types';

const inputClass = 'w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm';

interface Props {
  formData: ContractFormData;
  onChange: (data: Partial<ContractFormData>) => void;
}

export function OtherFields({ formData, onChange }: Props) {
  const set = (updates: Partial<ContractFormData>) => onChange(updates);
  const cat = formData.contract_category || 'stage';
  const isStage = cat === 'stage';
  const isAlternance = cat === 'apprentissage' || cat === 'professionnalisation';

  return (
    <>
      <MagicSelect
        options={CONTRACT_OTHER_TYPES}
        value={formData.contract_category || 'stage'}
        onChange={(value) => set({ contract_category: value as ContractCategory })}
        placeholder="Type de contrat"
        label="Catégorie"
        variant="default"
      />
      <input placeholder="Titre du contrat (optionnel)" value={formData.contract_title || ''} onChange={(e) => set({ contract_title: e.target.value })} className={inputClass} />
      <MagnificentDatePicker
        value={formData.contract_end_date || ''}
        onChange={(value) => set({ contract_end_date: value })}
        placeholder="Date de fin"
        label="Date de fin"
      />
      <input placeholder="Durée en semaines" value={formData.duration_weeks || ''} onChange={(e) => set({ duration_weeks: e.target.value })} className={inputClass} />

      {(isStage || isAlternance) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">{isStage ? 'Stage' : 'Alternance'}</p>
          <input placeholder="Nom du tuteur / maître d'apprentissage" value={formData.tutor_name || ''} onChange={(e) => set({ tutor_name: e.target.value })} className={inputClass} />
          <input placeholder="Nom de l'école / CFA" value={formData.school_name || ''} onChange={(e) => set({ school_name: e.target.value })} className={inputClass} />
          <input placeholder="Spécialité / Diplôme préparé" value={formData.speciality || ''} onChange={(e) => set({ speciality: e.target.value })} className={inputClass} />
          <textarea placeholder="Objectifs de la formation" value={formData.objectives || ''} onChange={(e) => set({ objectives: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
          <textarea placeholder="Tâches et missions confiées" value={formData.tasks || ''} onChange={(e) => set({ tasks: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
          <input placeholder="Heures hebdomadaires" value={formData.working_hours || ''} onChange={(e) => set({ working_hours: e.target.value })} className={inputClass} />
        </motion.div>
      )}

      <MagicSelect
        options={FRENCH_CCN_OPTIONS}
        value={formData.collective_agreement || ''}
        onChange={(value) => set({ collective_agreement: value })}
        placeholder="Convention collective..."
        label="Convention collective nationale"
        variant="default"
        searchable
      />
    </>
  );
}
