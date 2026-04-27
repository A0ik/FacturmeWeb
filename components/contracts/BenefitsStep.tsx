'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Euro, Check, Sparkles } from 'lucide-react';
import { BENEFIT_OPTIONS } from '@/components/ui/MagicSelect';
import { ContractFormData } from '@/types';

interface Props {
  formData: ContractFormData;
  onChange: (data: Partial<ContractFormData>) => void;
}

export function BenefitsStep({ formData, onChange }: Props) {
  const set = (updates: Partial<ContractFormData>) => onChange(updates);

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Euro className="w-5 h-5 text-primary" />
        Avantages
      </h3>
      <div className="space-y-2">
        {BENEFIT_OPTIONS.map((benefit) => {
          const key = benefit.value === 'transport' ? 'has_transport' : benefit.value === 'meal' ? 'has_meal' : benefit.value === 'health' ? 'has_health' : null;
          if (!key) return null;
          const checked = !!(formData as any)[key];

          return (
            <motion.label
              key={benefit.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                checked
                  ? 'bg-gradient-to-r from-primary/20 to-purple-600/20 border-primary/30'
                  : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:border-gray-200 dark:hover:border-white/10'
              }`}
            >
              <input type="checkbox" checked={checked} onChange={(e) => set({ [key]: e.target.checked })} className="sr-only" />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${benefit.color}`}>
                <benefit.icon size={18} className="text-white" />
              </div>
              <span className="flex-1 font-medium text-sm text-gray-900 dark:text-white">{benefit.label}</span>
              {checked && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-white" />
                </motion.div>
              )}
            </motion.label>
          );
        })}

        <motion.label
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
            formData.has_other
              ? 'bg-gradient-to-r from-violet-500/20 to-purple-600/20 border-violet-500/30'
              : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:border-gray-200 dark:hover:border-white/10'
          }`}
        >
          <input type="checkbox" checked={formData.has_other} onChange={(e) => set({ has_other: e.target.checked })} className="sr-only" />
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-violet-500 to-purple-600">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="flex-1 font-medium text-sm text-gray-900 dark:text-white">Autres avantages</span>
          {formData.has_other && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
              <Check size={14} className="text-white" />
            </motion.div>
          )}
        </motion.label>

        {formData.has_other && (
          <motion.input
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            placeholder="Précisez les autres avantages"
            value={formData.other_benefits || ''}
            onChange={(e) => set({ other_benefits: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
          />
        )}
      </div>
    </div>
  );
}
