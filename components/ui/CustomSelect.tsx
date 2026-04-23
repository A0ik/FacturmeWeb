'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  description?: string;
  color?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'frequency' | 'client';
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  label,
  icon: Icon,
  className,
  disabled = false,
  variant = 'default',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative', className)} ref={ref}>
      {label && (
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2 flex items-center gap-2">
          {Icon && <Icon size={14} className="text-primary" />}
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'relative w-full px-4 py-3 rounded-2xl border-2 appearance-none cursor-pointer',
          'transition-all duration-200',
          'flex items-center justify-between gap-3',
          'text-sm font-medium',
          disabled && 'opacity-50 cursor-not-allowed',
          variant === 'frequency' && 'min-h-[80px]',
          variant === 'client' && 'min-h-[60px]',
          isOpen
            ? 'border-primary/50 shadow-primary/30 ring-2 ring-primary/20'
            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20',
          !isOpen && 'bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-slate-800',
        )}
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {selectedOption?.icon && (
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              selectedOption.color || 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600',
            )}>
              <selectedOption.icon size={18} className={selectedOption.color?.includes('text-') ? selectedOption.color : 'text-gray-600 dark:text-gray-300'} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 dark:text-white">
              {selectedOption?.label || placeholder}
            </div>
            {selectedOption?.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {selectedOption.description}
              </div>
            )}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            'text-gray-400 transition-transform duration-200 flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'absolute z-20 w-full mt-2 rounded-2xl',
                'bg-white dark:bg-slate-800 border-2 border-primary/30 shadow-xl shadow-primary/20',
                'overflow-hidden'
              )}
            >
              <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                {options.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl transition-all duration-150',
                        'flex items-center gap-3 text-left',
                        value === option.value
                          ? 'bg-gradient-to-r from-primary/20 to-purple-600/20'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-700/50',
                      )}
                    >
                      {Icon && (
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                          option.color || 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600',
                        )}>
                          <Icon size={18} className={option.color?.includes('text-') ? option.color : 'text-gray-600 dark:text-gray-300'} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'font-semibold text-sm',
                          value === option.value ? 'text-primary' : 'text-gray-700 dark:text-gray-300'
                        )}>
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {option.description}
                          </div>
                        )}
                      </div>
                      {value === option.value && (
                        <Check size={16} className="text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
