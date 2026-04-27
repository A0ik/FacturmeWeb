'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { User, Check } from 'lucide-react';
import { MagnificentDatePicker } from '@/components/ui/MagnificentDatePicker';
import { MagicSelect } from '@/components/ui/MagicSelect';
import { ContractFormData } from '@/types';

const NATIONALITY_OPTIONS = [
  { value: 'Française', label: 'Française', description: 'Ressortissant français' },
  { value: 'Européenne', label: 'Européenne (UE)', description: "Citoyen de l'Union Européenne" },
  { value: 'Hors UE', label: 'Hors Union Européenne', description: 'Ressortissant non-UE' },
];

const inputClass = 'w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm';

interface Props {
  formData: ContractFormData;
  onChange: (data: Partial<ContractFormData>) => void;
  showQualification?: boolean;
}

export function EmployeeInfoStep({ formData, onChange, showQualification = true }: Props) {
  const set = (updates: Partial<ContractFormData>) => onChange(updates);

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-primary" />
        Salarié
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Prénom" value={formData.employee_first_name} onChange={(e) => set({ employee_first_name: e.target.value })} className={inputClass} />
          <input placeholder="Nom" value={formData.employee_last_name} onChange={(e) => set({ employee_last_name: e.target.value })} className={inputClass} />
        </div>
        <input placeholder="Adresse" value={formData.employee_address} onChange={(e) => set({ employee_address: e.target.value })} className={inputClass} />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Code postal" value={formData.employee_postal_code} onChange={(e) => set({ employee_postal_code: e.target.value })} className={inputClass} />
          <input placeholder="Ville" value={formData.employee_city} onChange={(e) => set({ employee_city: e.target.value })} className={inputClass} />
        </div>
        <input type="email" placeholder="Email" value={formData.employee_email || ''} onChange={(e) => set({ employee_email: e.target.value })} className={inputClass} />
        <input type="tel" placeholder="Téléphone" value={formData.employee_phone || ''} onChange={(e) => set({ employee_phone: e.target.value })} className={inputClass} />
        <MagnificentDatePicker
          value={formData.employee_birth_date || ''}
          onChange={(value) => set({ employee_birth_date: value })}
          placeholder="Date de naissance"
          label="Date de naissance"
          maxDate={new Date().toISOString().split('T')[0]}
        />
        <input placeholder="Numéro Sécurité Sociale" value={formData.employee_social_security || ''} onChange={(e) => set({ employee_social_security: e.target.value })} className={inputClass} />
        <MagicSelect
          options={NATIONALITY_OPTIONS}
          value={formData.employee_nationality || 'Française'}
          onChange={(value) => set({ employee_nationality: value })}
          placeholder="Sélectionner la nationalité"
          label="Nationalité"
          variant="default"
        />
        {showQualification && (
          <input placeholder="Qualification / Diplôme" value={formData.employee_qualification || ''} onChange={(e) => set({ employee_qualification: e.target.value })} className={inputClass} />
        )}
      </div>
    </div>
  );
}
