'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MagnificentDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
  disablePastDates?: boolean; // Nouveau prop pour masquer les dates passées
  allowTextInput?: boolean; // Nouveau prop pour permettre la saisie directe
}

type ViewMode = 'days' | 'months' | 'years';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function MagnificentDatePicker({
  value,
  onChange,
  placeholder = 'Sélectionner une date',
  label,
  className,
  minDate,
  maxDate,
  required = false,
  disablePastDates = false,
  allowTextInput = true,
}: MagnificentDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [textInput, setTextInput] = useState('');
  const [inputError, setInputError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  // Définir minDate automatiquement si disablePastDates est true
  const effectiveMinDate = useMemo(() => {
    if (minDate) return minDate;
    if (disablePastDates) {
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
    return undefined;
  }, [minDate, disablePastDates]);

  // Réinitialiser la vue quand on ouvre
  useEffect(() => {
    if (isOpen) {
      setViewMode('days');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // --- Plage d'années affichées (12 ans par page) ---
  const yearRange = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const startYear = Math.floor(currentYear / 12) * 12;
    const years = [];
    for (let i = 0; i < 12; i++) {
      years.push(startYear + i);
    }
    return years;
  }, [currentDate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateEnabled = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];

    if (effectiveMinDate && dateStr < effectiveMinDate) return false;
    if (maxDate && dateStr > maxDate) return false;

    return true;
  };

  // Fonction pour parser la saisie directe JJ/MM/AAAA
  const parseDateInput = (input: string): Date | null => {
    // Format JJ/MM/AAAA ou JJ/MM/AA ou JJ-MM-AAAA
    const regex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/;
    const match = input.match(regex);

    if (!match) return null;

    let [, day, month, year] = match;

    // Convertir en nombres
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    let y = parseInt(year, 10);

    // Gérer les années à 2 chiffres (AA -> 20AA)
    if (y < 100) {
      y += 2000;
    }

    // Valider la date
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) {
      return null;
    }

    return new Date(y, m - 1, d);
  };

  // Fonction pour formater la date en JJ/MM/AAAA
  const formatDateForInput = (date: Date): string => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  // Gestion de la saisie directe
  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setTextInput(input);
    setInputError('');

    // Détecter le format JJ/MM/AAAA
    if (input.length >= 8) {
      const parsedDate = parseDateInput(input);

      if (parsedDate) {
        // Vérifier si la date est dans les limites
        if (!isDateEnabled(parsedDate)) {
          setInputError('Date non autorisée');
          return;
        }

        // Mettre à jour la date sélectionnée
        const dateStr = parsedDate.toISOString().split('T')[0];
        onChange(dateStr);
        setTextInput(formatDateForInput(parsedDate));
        setIsOpen(false);
      } else {
        setInputError('Format invalide (JJ/MM/AAAA)');
      }
    }
  };

  // Gestion de la touche Entrée pour valider la saisie
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const parsedDate = parseDateInput(textInput);
      if (parsedDate && isDateEnabled(parsedDate)) {
        const dateStr = parsedDate.toISOString().split('T')[0];
        onChange(dateStr);
        setIsOpen(false);
      } else if (textInput.length > 0) {
        setInputError('Format invalide (JJ/MM/AAAA)');
      }
    }
  };

  const isYearEnabled = (year: number) => {
    if (effectiveMinDate) {
      const minY = new Date(effectiveMinDate + 'T00:00:00').getFullYear();
      if (year < minY) return false;
    }
    if (maxDate) {
      const maxY = new Date(maxDate + 'T00:00:00').getFullYear();
      if (year > maxY) return false;
    }
    return true;
  };

  const isMonthEnabled = (year: number, month: number) => {
    if (effectiveMinDate) {
      const minD = new Date(effectiveMinDate + 'T00:00:00');
      if (year < minD.getFullYear()) return false;
      if (year === minD.getFullYear() && month < minD.getMonth()) return false;
    }
    if (maxDate) {
      const maxD = new Date(maxDate + 'T00:00:00');
      if (year > maxD.getFullYear()) return false;
      if (year === maxD.getFullYear() && month > maxD.getMonth()) return false;
    }
    return true;
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const isSelected = (date: Date) => {
    return selectedDate ? isSameDay(date, selectedDate) : false;
  };

  const isCurrentYear = () => {
    return selectedDate
      ? selectedDate.getFullYear() === currentDate.getFullYear()
      : false;
  };

  const isCurrentMonth = (month: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === currentDate.getFullYear() &&
      selectedDate.getMonth() === month
    );
  };

  const handleDateClick = (date: Date) => {
    if (!isDateEnabled(date)) return;

    const dateStr = date.toISOString().split('T')[0];
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleMonthClick = (month: number) => {
    if (!isMonthEnabled(currentDate.getFullYear(), month)) return;
    setCurrentDate(new Date(currentDate.getFullYear(), month, 1));
    setViewMode('days');
  };

  const handleYearClick = (year: number) => {
    if (!isYearEnabled(year)) return;
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
    setViewMode('months');
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToPreviousYearRange = () => {
    const startYear = Math.floor(currentDate.getFullYear() / 12) * 12;
    setCurrentDate(new Date(startYear - 12, 0, 1));
  };

  const goToNextYearRange = () => {
    const startYear = Math.floor(currentDate.getFullYear() / 12) * 12;
    setCurrentDate(new Date(startYear + 12, 0, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    handleDateClick(today);
  };

  const headerTitle = () => {
    if (viewMode === 'days') {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === 'months') {
      return `${currentDate.getFullYear()}`;
    }
    // years
    return `${yearRange[0]} – ${yearRange[11]}`;
  };

  const handleHeaderClick = () => {
    if (viewMode === 'days') {
      setViewMode('months');
    } else if (viewMode === 'months') {
      setViewMode('years');
    }
  };

  const handlePrevious = () => {
    if (viewMode === 'days') goToPreviousMonth();
    else if (viewMode === 'months') {
      setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1));
    } else {
      goToPreviousYearRange();
    }
  };

  const handleNext = () => {
    if (viewMode === 'days') goToNextMonth();
    else if (viewMode === 'months') {
      setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1));
    } else {
      goToNextYearRange();
    }
  };

  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth();

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button avec saisie directe */}
      <div
        className={cn(
          'w-full relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-2',
          'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm',
          'transition-all duration-200',
          'hover:border-primary/30 hover:bg-white/70 dark:hover:bg-slate-800/70',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
          isOpen && 'border-primary/50 bg-white/70 dark:bg-slate-800/70 ring-2 ring-primary/20',
          'shadow-sm hover:shadow-md'
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
          <CalendarIcon className="w-5 h-5 text-primary" />
        </div>

        {allowTextInput ? (
          <input
            ref={inputRef}
            type="text"
            value={textInput || (selectedDate ? formatDateForInput(selectedDate) : '')}
            onChange={handleTextInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={cn(
              'flex-1 bg-transparent outline-none text-sm font-semibold',
              'text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500'
            )}
          />
        ) : (
          <div
            className="flex-1 text-left cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            {selectedDate ? (
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatDateDisplay(selectedDate)}
              </span>
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-500">{placeholder}</span>
            )}
          </div>
        )}

        {inputError && (
          <span className="text-xs text-red-500 whitespace-nowrap">{inputError}</span>
        )}

        <motion.button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.button>
      </div>

      {/* Calendar Popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Calendar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 mt-2 w-full sm:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-purple-600 px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={handleHeaderClick}
                    className={cn(
                      'text-center px-3 py-1 rounded-lg transition-colors',
                      viewMode !== 'years' && 'hover:bg-white/20 cursor-pointer'
                    )}
                  >
                    <motion.div
                      key={`${currentDate.getFullYear()}-${currentDate.getMonth()}-${viewMode}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-white font-bold"
                    >
                      {headerTitle()}
                    </motion.div>
                    {viewMode !== 'years' && (
                      <div className="text-white/60 text-[10px] mt-0.5">
                        {viewMode === 'days' ? 'Cliquer pour les mois' : 'Cliquer pour les années'}
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>

                {viewMode === 'days' && (
                  <button
                    type="button"
                    onClick={goToToday}
                    className="w-full py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    Aujourd&apos;hui
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <AnimatePresence mode="wait">
                  {/* ==================== DAYS VIEW ==================== */}
                  {viewMode === 'days' && (
                    <motion.div
                      key="days-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Weekday Headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {WEEKDAYS.map((day) => (
                          <div
                            key={day}
                            className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Days */}
                      <div className="grid grid-cols-7 gap-1">
                        {getDaysInMonth(currentDate).map((date, index) => {
                          if (!date) {
                            return <div key={`empty-${index}`} className="h-10" />;
                          }

                          const enabled = isDateEnabled(date);
                          const selected = isSelected(date);
                          const today = isToday(date);

                          return (
                            <motion.button
                              key={index}
                              type="button"
                              onClick={() => handleDateClick(date)}
                              disabled={!enabled}
                              whileHover={enabled ? { scale: 1.05 } : {}}
                              whileTap={enabled ? { scale: 0.95 } : {}}
                              className={cn(
                                'relative h-10 rounded-xl font-semibold text-sm transition-all duration-200',
                                'flex items-center justify-center',
                                selected && 'bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg',
                                !selected && enabled && 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300',
                                !enabled && 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                                today && !selected && 'ring-2 ring-primary/50'
                              )}
                            >
                              <span>{date.getDate()}</span>
                              {selected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute inset-0 flex items-center justify-center"
                                >
                                  <Check className="w-4 h-4 text-white" />
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* ==================== MONTHS VIEW ==================== */}
                  {viewMode === 'months' && (
                    <motion.div
                      key="months-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                      className="grid grid-cols-3 gap-2"
                    >
                      {MONTHS.map((month, index) => {
                        const enabled = isMonthEnabled(currentDate.getFullYear(), index);
                        const current = isCurrentMonth(index);
                        const isNow = currentDate.getFullYear() === todayYear && index === todayMonth;

                        return (
                          <motion.button
                            key={month}
                            type="button"
                            onClick={() => handleMonthClick(index)}
                            disabled={!enabled}
                            whileHover={enabled ? { scale: 1.05 } : {}}
                            whileTap={enabled ? { scale: 0.95 } : {}}
                            className={cn(
                              'relative h-16 rounded-xl font-semibold text-sm transition-all duration-200',
                              'flex flex-col items-center justify-center gap-0.5',
                              current && 'bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg',
                              !current && enabled && 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300',
                              !enabled && 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                              isNow && !current && 'ring-2 ring-primary/50'
                            )}
                          >
                            <span className="text-xs leading-tight">{month}</span>
                            {current && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}

                  {/* ==================== YEARS VIEW ==================== */}
                  {viewMode === 'years' && (
                    <motion.div
                      key="years-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                      className="grid grid-cols-3 gap-2"
                    >
                      {yearRange.map((year) => {
                        const enabled = isYearEnabled(year);
                        const current = selectedDate
                          ? selectedDate.getFullYear() === year
                          : false;
                        const isNow = year === todayYear;

                        return (
                          <motion.button
                            key={year}
                            type="button"
                            onClick={() => handleYearClick(year)}
                            disabled={!enabled}
                            whileHover={enabled ? { scale: 1.05 } : {}}
                            whileTap={enabled ? { scale: 0.95 } : {}}
                            className={cn(
                              'relative h-16 rounded-xl font-bold text-base transition-all duration-200',
                              'flex flex-col items-center justify-center gap-0.5',
                              current && 'bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg',
                              !current && enabled && 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300',
                              !enabled && 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                              isNow && !current && 'ring-2 ring-primary/50'
                            )}
                          >
                            <span>{year}</span>
                            {current && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <Check className="w-3.5 h-3.5 text-white" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer breadcrumb */}
              {viewMode !== 'days' && (
                <div className="px-4 pb-3 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                  <button
                    type="button"
                    onClick={() => setViewMode('years')}
                    className={cn(
                      'hover:text-primary transition-colors',
                      viewMode === 'years' && 'text-primary font-semibold'
                    )}
                  >
                    Années
                  </button>
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => setViewMode('months')}
                    className={cn(
                      'hover:text-primary transition-colors',
                      viewMode === 'months' && 'text-primary font-semibold'
                    )}
                  >
                    Mois
                  </button>
                  {viewMode !== 'months' && (
                    <>
                      <span>/</span>
                      <span className="text-gray-300 dark:text-gray-600">Jours</span>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}