'use client';
import React from 'react';
import { MagicSelect, CONTRACT_CDD_REASONS, FRENCH_CCN_OPTIONS } from '@/components/ui/MagicSelect';
import { MagnificentDatePicker } from '@/components/ui/MagnificentDatePicker';
import { ContractFormData } from '@/types';

const inputClass = 'w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm';

interface Props {
  formData: ContractFormData;
  onChange: (data: Partial<ContractFormData>) => void;
}

export function CDDFields({ formData, onChange }: Props) {
  const set = (updates: Partial<ContractFormData>) => onChange(updates);

  return (
    <>
      <MagnificentDatePicker
        value={formData.contract_end_date || ''}
        onChange={(value) => set({ contract_end_date: value })}
        placeholder="Date de fin du contrat"
        label="Date de fin"
      />
      <MagicSelect
        options={CONTRACT_CDD_REASONS}
        value={formData.contract_reason || ''}
        onChange={(value) => set({ contract_reason: value })}
        placeholder="Sélectionner le motif de recours"
        label="Motif de recours"
        variant="default"
      />
      {(formData.contract_reason === 'remplacement' || formData.contract_reason === 'Remplacement') && (
        <input placeholder="Nom du salarié remplacé" value={formData.replaced_employee_name || ''} onChange={(e) => set({ replaced_employee_name: e.target.value })} className={inputClass} />
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
