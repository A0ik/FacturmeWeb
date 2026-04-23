'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// French day names (Monday-first)
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Sélectionner une date',
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const dateValue = value ? new Date(value) : new Date();
  const currentMonth = dateValue.getMonth();
  const currentYear = dateValue.getFullYear();

  // Build calendar cells
  const cells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const cells: (number | null)[] = Array(totalCells).fill(null);
    for (let i = 0; i < daysInMonth; i++) {
      cells[startOffset + i] = i + 1;
    }
    return cells;
  }, [currentYear, currentMonth]);

  const today = new Date();
  const isToday = (day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const selectedDate = new Date(value);
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  const isDisabled = (day: number) => {
    const cellDate = new Date(currentYear, currentMonth, day);
    const cellDateStr = cellDate.toISOString().split('T')[0];

    if (minDate && cellDateStr < minDate) return true;
    if (maxDate && cellDateStr > maxDate) return true;
    return false;
  };

  const handleDayClick = (day: number) => {
    if (isDisabled(day)) return;
    const newDate = new Date(currentYear, currentMonth, day);
    onChange(newDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const prevMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    onChange(newDate.toISOString().split('T')[0]);
  };

  const nextMonth = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    onChange(newDate.toISOString().split('T')[0]);
  };

  const goToday = () => {
    onChange(today.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const popoverVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  return (
    <div className={cn('relative', className)}>
      {/* Trigger button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left',
          'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl',
          'border border-white/30 dark:border-white/10 shadow-lg',
          'hover:bg-white/80 dark:hover:bg-slate-800/80 hover:shadow-xl',
          'transition-all duration-200 cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-primary/40'
        )}
      >
        <CalendarIcon className="w-5 h-5 text-primary" />
        <span className={cn(
          'flex-1 text-sm',
          value ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'
        )}>
          {value ? formatDate(value) : placeholder}
        </span>
      </motion.button>

      {/* Calendar popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Popover */}
            <motion.div
              variants={popoverVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute z-50 mt-2 p-4 w-[320px]',
                'bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl',
                'rounded-3xl border border-white/30 dark:border-white/10 shadow-2xl'
              )}
            >
              {/* Header with month navigation */}
              <div className="flex items-center justify-between mb-4">
                <motion.button
                  type="button"
                  onClick={prevMonth}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    'bg-white/50 dark:bg-slate-800/50',
                    'border border-white/20 dark:border-white/10',
                    'hover:bg-white/70 dark:hover:bg-slate-700/50',
                    'transition-all'
                  )}
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </motion.button>

                <div className="text-center">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {MONTHS[currentMonth]}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {currentYear}
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={nextMonth}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    'bg-white/50 dark:bg-slate-800/50',
                    'border border-white/20 dark:border-white/10',
                    'hover:bg-white/70 dark:hover:bg-slate-700/50',
                    'transition-all'
                  )}
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </motion.button>
              </div>

              {/* Today button */}
              <motion.button
                type="button"
                onClick={goToday}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full py-2 mb-3 rounded-lg text-xs font-medium',
                  'bg-gradient-to-r from-primary/10 to-emerald-600/10',
                  'border border-primary/20',
                  'text-primary',
                  'hover:from-primary/20 hover:to-emerald-600/20',
                  'transition-all'
                )}
              >
                Aujourd'hui
              </motion.button>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                  const disabled = day !== null && isDisabled(day);
                  const selected = day !== null && isSelected(day);
                  const today = day !== null && isToday(day);

                  return (
                    <motion.button
                      key={idx}
                      type="button"
                      onClick={() => day !== null && handleDayClick(day)}
                      disabled={disabled}
                      whileHover={{ scale: disabled ? 1 : 1.05 }}
                      whileTap={{ scale: disabled ? 1 : 0.95 }}
                      className={cn(
                        'aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                        // Empty cell
                        day === null && 'bg-transparent',
                        // Disabled
                        disabled && day !== null && 'opacity-30 cursor-not-allowed',
                        // Normal day
                        !disabled && day !== null && !selected && !today && 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/70 dark:hover:bg-slate-700/50 cursor-pointer',
                        // Today
                        today && !selected && 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20',
                        // Selected
                        selected && 'bg-gradient-to-br from-primary to-emerald-600 text-white shadow-lg shadow-primary/20 ring-2 ring-primary/30'
                      )}
                    >
                      {day}
                    </motion.button>
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
