'use client';

import React, { useState, useRef, useEffect } from 'react';
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
}

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
}: MagnificentDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Adjust for Monday start

    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateEnabled = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];

    if (minDate && dateStr < minDate) return false;
    if (maxDate && dateStr > maxDate) return false;

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

  const handleDateClick = (date: Date) => {
    if (!isDateEnabled(date)) return;

    const dateStr = date.toISOString().split('T')[0];
    onChange(dateStr);
    setIsOpen(false);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    handleDateClick(today);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
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

        <div className="flex-1 text-left">
          {selectedDate ? (
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatDateDisplay(selectedDate)}
            </span>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">{placeholder}</span>
          )}
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </motion.button>

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
                    onClick={goToPreviousMonth}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>

                  <div className="text-center">
                    <motion.div
                      key={`${currentDate.getFullYear()}-${currentDate.getMonth()}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-white font-bold"
                    >
                      {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </motion.div>
                  </div>

                  <button
                    type="button"
                    onClick={goToNextMonth}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={goToToday}
                  className="w-full py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  Aujourd'hui
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="p-4">
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
