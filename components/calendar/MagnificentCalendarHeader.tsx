'use client';

import { motion, Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleConnectButton } from './GoogleConnectButton';
import { MONTHS } from './constants';

interface MagnificentCalendarHeaderProps {
  currentMonth: number;
  currentYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToday: () => void;
  onNewAppointment: () => void;
  className?: string;
}

export function MagnificentCalendarHeader({
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  onNewAppointment,
  className,
}: MagnificentCalendarHeaderProps) {
  const containerVariants: Variants = {
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

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'relative',
        // Glass card effect
        'before:absolute before:inset-0 before:rounded-[2rem] before:bg-gradient-to-br before:from-white/80 before:to-white/60 before:dark:from-slate-900/80 before:dark:to-slate-900/60 before:blur-2xl before:-z-10',
        'backdrop-blur-2xl bg-white/40 dark:bg-slate-900/40',
        'border border-white/30 dark:border-white/10 shadow-2xl',
        'rounded-[2rem]',
        'p-6 lg:p-8',
        className
      )}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 rounded-[2rem] overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-gradient-to-br from-primary/30 to-emerald-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-gradient-to-tr from-accent/30 to-orange-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Title + Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-start gap-4 w-full lg:w-auto">
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            {/* Icon with gradient */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-emerald-600 rounded-2xl blur-lg opacity-50 animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-xl">
                <CalendarIcon className="w-7 h-7 text-white" />
              </div>
            </div>

            <div>
              <h1 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-gray-900 via-primary to-gray-900 dark:from-white dark:via-primary dark:to-white bg-clip-text text-transparent bg-[length:200%] animate-gradient bg-[position:0%]">
                Agenda
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                Gérez vos rendez-vous et échéances
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <GoogleConnectButton />
            <motion.button
              onClick={onNewAppointment}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'hidden lg:flex items-center gap-2.5 px-5 py-3 rounded-2xl min-h-[48px]',
                'bg-gradient-to-r from-primary to-emerald-600',
                'text-white text-sm font-bold shadow-lg shadow-primary/30',
                'hover:shadow-xl hover:shadow-primary/40',
                'transition-all duration-300'
              )}
            >
              <CalendarIcon className="w-5 h-5" />
              <span>Nouveau rendez-vous</span>
            </motion.button>
          </motion.div>
        </div>

        {/* Right: Month navigation */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full lg:w-auto"
        >
          <div className="flex items-center gap-3">
            <motion.button
              onClick={onPrevMonth}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center',
                'bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm',
                'border border-white/30 dark:border-white/10',
                'hover:bg-white/80 dark:hover:bg-slate-700/60',
                'transition-all duration-200 shadow-md hover:shadow-lg',
                'text-gray-700 dark:text-gray-300'
              )}
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>

            <div className="text-center px-6 py-2 min-w-[160px]">
              <motion.div
                key={`${currentMonth}-${currentYear}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-black text-gray-900 dark:text-white"
              >
                {MONTHS[currentMonth]}
              </motion.div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                {currentYear}
              </div>
            </div>

            <motion.button
              onClick={onNextMonth}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center',
                'bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm',
                'border border-white/30 dark:border-white/10',
                'hover:bg-white/80 dark:hover:bg-slate-700/60',
                'transition-all duration-200 shadow-md hover:shadow-lg',
                'text-gray-700 dark:text-gray-300'
              )}
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>

          <motion.button
            onClick={onGoToday}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'px-5 py-3 rounded-2xl text-sm font-bold',
              'bg-gradient-to-r from-primary/10 to-emerald-500/10 dark:from-primary/20 dark:to-emerald-500/20',
              'backdrop-blur-sm border border-primary/20',
              'text-primary dark:text-primary-light',
              'hover:from-primary/20 hover:to-emerald-500/20',
              'transition-all duration-200 shadow-md hover:shadow-lg',
              'flex items-center gap-2'
            )}
          >
            <Sparkles className="w-4 h-4" />
            Aujourd'hui
          </motion.button>
        </motion.div>

        {/* Mobile: Show new appointment button */}
        <motion.button
          variants={itemVariants}
          onClick={onNewAppointment}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'lg:hidden flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl min-h-[48px] w-full',
            'bg-gradient-to-r from-primary to-emerald-600',
            'text-white text-sm font-bold shadow-lg shadow-primary/30',
            'hover:shadow-xl hover:shadow-primary/40',
            'transition-all duration-300'
          )}
        >
          <CalendarIcon className="w-5 h-5" />
          <span>Nouveau</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
