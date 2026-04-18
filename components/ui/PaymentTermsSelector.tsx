'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Clock, CalendarDays, Receipt, Plus, X, Check, Zap } from 'lucide-react';

interface Term {
  id: string;
  label: string;
  shortLabel?: string;
  desc: string;
  days: number;
  icon: React.ElementType;
  popular?: boolean;
}

const STANDARD_TERMS: Term[] = [
  { id: 'reception',  label: 'À réception', desc: 'Paiement immédiat dès réception', days: 0,  icon: Zap },
  { id: 'days15',     label: '15 jours',    desc: 'Paiement sous 15 jours',           days: 15, icon: CalendarDays },
  { id: 'days30',     label: '30 jours',    desc: 'Délai standard recommandé',         days: 30, icon: Clock, popular: true },
  { id: 'days45',     label: '45 jours',    desc: 'Paiement sous 45 jours',           days: 45, icon: CalendarDays },
  { id: 'days60',     label: '60 jours',    desc: 'Délai maximum légal',              days: 60, icon: CalendarDays },
];

const MONTH_END_TERMS: Term[] = [
  { id: 'end_of_month',       label: 'Fin de mois',      shortLabel: 'Fin mois',     desc: 'Fin du mois en cours',          days: 0,  icon: CalendarDays },
  { id: 'end_of_month_30',    label: 'Fin mois + 30j',   shortLabel: '+30j FDM',     desc: '30 jours après fin du mois',    days: 30, icon: Clock },
  { id: 'end_of_next_month',  label: 'Fin mois suivant', shortLabel: 'Mois suivant', desc: 'Fin du mois prochain',          days: 0,  icon: CalendarDays },
];

export const ALL_PAYMENT_TERMS: Term[] = [...STANDARD_TERMS, ...MONTH_END_TERMS];

function computeEstimatedDue(issueDate: string, term: Term, customDays?: number): string | null {
  const days = term ? term.days : (customDays ?? 0);
  if (!issueDate) return null;
  const d = new Date(issueDate);
  if (term?.id === 'reception') return null;
  if (term?.id === 'end_of_month') { d.setMonth(d.getMonth() + 1, 0); }
  else if (term?.id === 'end_of_month_30') { d.setMonth(d.getMonth() + 1, 0); d.setDate(d.getDate() + 30); }
  else if (term?.id === 'end_of_next_month') { d.setMonth(d.getMonth() + 2, 0); }
  else if (days > 0) { d.setDate(d.getDate() + days); }
  else return null;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export interface PaymentTermsSelectorProps {
  termId?: string;
  value?: number;
  onChange: (days: number, termId: string) => void;
  issueDate?: string;
  className?: string;
  disabled?: boolean;
}

export default function PaymentTermsSelector({
  termId,
  value,
  onChange,
  issueDate,
  className,
  disabled = false,
}: PaymentTermsSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customDays, setCustomDays] = useState('');

  const selectedTerm = ALL_PAYMENT_TERMS.find(t => t.id === termId) ?? null;
  const isCustom = !selectedTerm && termId?.startsWith('custom-');

  const estimatedDue = issueDate && selectedTerm
    ? computeEstimatedDue(issueDate, selectedTerm)
    : issueDate && isCustom && value
    ? (() => { const d = new Date(issueDate); d.setDate(d.getDate() + value); return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); })()
    : null;

  const handleSelect = (term: Term) => {
    onChange(term.days, term.id);
    setShowCustom(false);
  };

  const handleCustomSubmit = () => {
    const days = parseInt(customDays);
    if (!isNaN(days) && days >= 0) {
      onChange(days, `custom-${days}`);
    }
    setShowCustom(false);
    setCustomDays('');
  };

  function TermBtn({ term }: { term: Term }) {
    const Icon = term.icon;
    const active = termId === term.id;
    return (
      <button
        type="button"
        onClick={() => handleSelect(term)}
        disabled={disabled}
        className={cn(
          'relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border',
          active
            ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
            : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
          disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        )}
      >
        {active ? <Check size={12} /> : <Icon size={12} className="opacity-50" />}
        <span>{term.shortLabel ?? term.label}</span>
        {term.popular && !active && (
          <span className="ml-0.5 text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded leading-none">★</span>
        )}
      </button>
    );
  }

  const displayTerm = selectedTerm;

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Standard terms */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Délai standard</p>
        <div className="flex flex-wrap gap-1.5">
          {STANDARD_TERMS.map(t => <TermBtn key={t.id} term={t} />)}
        </div>
      </div>

      {/* Month-end terms */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Fin de mois</p>
        <div className="flex flex-wrap gap-1.5">
          {MONTH_END_TERMS.map(t => <TermBtn key={t.id} term={t} />)}
        </div>
      </div>

      {/* Custom option */}
      {!showCustom ? (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-xs text-gray-400 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
        >
          <Plus size={11} />
          Délai personnalisé
        </button>
      ) : (
        <div className="flex gap-2 items-center">
          <div className="relative">
            <input
              type="number"
              min="0"
              max="365"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCustomSubmit(); } }}
              placeholder="30"
              autoFocus
              disabled={disabled}
              className="w-24 pl-3 pr-8 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">j</span>
          </div>
          <button
            type="button"
            onClick={handleCustomSubmit}
            disabled={disabled || !customDays}
            className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors disabled:opacity-40"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => { setShowCustom(false); setCustomDays(''); }}
            className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Selected term info */}
      {(displayTerm || isCustom) && (
        <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 bg-primary/5 border border-primary/20">
          {displayTerm && (
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <displayTerm.icon size={13} className="text-primary" />
            </div>
          )}
          {!displayTerm && isCustom && (
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Clock size={13} className="text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900">
              {displayTerm?.label ?? `${value} jours (personnalisé)`}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {estimatedDue
                ? `Échéance estimée : ${estimatedDue}`
                : displayTerm?.desc ?? `Paiement sous ${value} jours`}
            </p>
          </div>
          <Check size={14} className="text-primary flex-shrink-0" />
        </div>
      )}
    </div>
  );
}
