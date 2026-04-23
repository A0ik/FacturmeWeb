'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleConnectButton } from './GoogleConnectButton';
import { MONTHS, glassTokens } from './constants';

interface CalendarHeaderProps {
  currentMonth: number;
  currentYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToday: () => void;
  onNewAppointment: () => void;
  className?: string;
}

export function CalendarHeader({
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  onNewAppointment,
  className,
}: CalendarHeaderProps) {
  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        duration: 0.4,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4',
        'bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl',
        'rounded-3xl border border-white/30 dark:border-white/10 shadow-xl',
        'p-4 lg:p-6',
        className
      )}
    >
      {/* Left: Title + Buttons */}
      <div className="flex items-center justify-between sm:justify-start gap-4">
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Agenda
          </h1>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <GoogleConnectButton />
          <motion.button
            onClick={onNewAppointment}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl min-h-[44px]',
              glassTokens.btnPrimary
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Nouveau rendez-vous</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Right: Month navigation */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-center gap-3 sm:gap-4"
      >
        <div className="flex items-center gap-2">
          <motion.button
            onClick={onPrevMonth}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm',
              'border border-white/20 dark:border-white/10',
              'hover:bg-white/70 dark:hover:bg-slate-700/50',
              'transition-all duration-200 cursor-pointer'
            )}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </motion.button>

          <div className="text-center px-4">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {MONTHS[currentMonth]}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currentYear}
            </div>
          </div>

          <motion.button
            onClick={onNextMonth}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm',
              'border border-white/20 dark:border-white/10',
              'hover:bg-white/70 dark:hover:bg-slate-700/50',
              'transition-all duration-200 cursor-pointer'
            )}
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </motion.button>
        </div>

        <motion.button
          onClick={onGoToday}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium',
            'bg-gradient-to-r from-primary/10 to-purple-600/10',
            'backdrop-blur-sm border border-white/20 dark:border-white/10',
            'text-primary dark:text-primary-light',
            'hover:from-primary/20 hover:to-purple-600/20',
            'transition-all duration-200 cursor-pointer'
          )}
        >
          Aujourd&apos;hui
        </motion.button>
      </motion.div>

      {/* Mobile: Show new appointment button */}
      <motion.button
        variants={itemVariants}
        onClick={onNewAppointment}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'sm:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl min-h-[44px]',
          glassTokens.btnPrimary
        )}
      >
        <CalendarIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Nouveau</span>
      </motion.button>
    </motion.div>
  );
}
