'use client';
import React from 'react';
import { Building2 } from 'lucide-react';
import { SireneAutocomplete } from '@/components/ui/SireneAutocomplete';
import { ContractFormData } from '@/types';

const inputClass = 'w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm';

interface Props {
  formData: ContractFormData;
  onChange: (data: Partial<ContractFormData>) => void;
}

export function CompanyInfoStep({ formData, onChange }: Props) {
  const set = (updates: Partial<ContractFormData>) => onChange(updates);

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        Entreprise
      </h3>
      <div className="space-y-4">
        <SireneAutocomplete
          onCompanySelect={(company) => {
            set({
              company_name: company.name,
              company_address: company.address,
              company_postal_code: company.postalCode,
              company_city: company.city,
              company_siret: company.siret,
            });
          }}
          initialCompanyName={formData.company_name}
          placeholder="Rechercher ou saisir le nom de l'entreprise..."
          label="Nom de l'entreprise"
        />
        <input placeholder="Adresse" value={formData.company_address || ''} onChange={(e) => set({ company_address: e.target.value })} className={inputClass} />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Code postal" value={formData.company_postal_code || ''} onChange={(e) => set({ company_postal_code: e.target.value })} className={inputClass} />
          <input placeholder="Ville" value={formData.company_city || ''} onChange={(e) => set({ company_city: e.target.value })} className={inputClass} />
        </div>
        <input placeholder="SIRET" value={formData.company_siret || ''} onChange={(e) => set({ company_siret: e.target.value })} className={`${inputClass} font-mono`} />
        <input placeholder="Nom de l'employeur" value={formData.employer_name || ''} onChange={(e) => set({ employer_name: e.target.value })} className={inputClass} />
        <input placeholder="Titre de l'employeur" value={formData.employer_title || ''} onChange={(e) => set({ employer_title: e.target.value })} className={inputClass} />
      </div>
    </div>
  );
}
