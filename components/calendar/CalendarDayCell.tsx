'use client';

import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment, Invoice } from '@/types';
import { getColorConfig, isToday, glassTokens } from './constants';

interface CalendarDayCellProps {
  day: number | null;
  currentYear: number;
  currentMonth: number;
  isSelected: boolean;
  appointments: Appointment[];
  invoices: Invoice[];
  onClick: () => void;
  className?: string;
}

export function CalendarDayCell({
  day,
  currentYear,
  currentMonth,
  isSelected,
  appointments,
  invoices,
  onClick,
  className,
}: CalendarDayCellProps) {
  const isEmpty = day === null;
  const dayIsToday = !isEmpty && isToday(currentYear, currentMonth, day);

  // Filter actionable invoices (sent or overdue)
  const actionableInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');

  // Count overdue invoices for red indicator
  const overdueCount = actionableInvoices.filter(inv => inv.status === 'overdue').length;

  const cellVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  };

  if (isEmpty) {
    return <div className="bg-transparent" aria-hidden="true" />;
  }

  return (
    <motion.button
      variants={cellVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-start gap-1.5 p-2 lg:p-3 min-h-[80px] md:min-h-[100px] lg:min-h-[120px]',
        'rounded-2xl border transition-all duration-200 cursor-pointer',
        // Empty cell base
        'bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm',
        'border-white/40 dark:border-white/10',
        'shadow-md hover:shadow-lg hover:bg-white/80 dark:hover:bg-slate-800/60',
        // Today
        dayIsToday && 'bg-amber-50/60 dark:bg-amber-900/20 border-amber-300/50 dark:border-amber-500/30 shadow-amber-500/20',
        // Selected
        isSelected && 'bg-primary/10 border-primary/40 ring-2 ring-primary/20 shadow-primary/20',
        className
      )}
      aria-label={`Jour ${day}`}
    >
      {/* Today pulse effect */}
      {dayIsToday && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-amber-400/20"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Day number badge */}
      <div className="relative z-10">
        <span
          className={cn(
            'inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold',
            dayIsToday && 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg',
            isSelected && !dayIsToday && 'bg-gradient-to-br from-primary to-emerald-600 text-white shadow-lg',
            !dayIsToday && !isSelected && 'text-gray-700 dark:text-gray-300'
          )}
        >
          {day}
        </span>
      </div>

      {/* Appointment bars (max 2 visible) */}
      <div className="flex-1 w-full flex flex-col gap-1 relative z-10">
        {appointments.slice(0, 2).map((apt) => {
          const colorConfig = getColorConfig(apt.color);
          return (
            <div
              key={apt.id}
              className={cn(
                'hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md',
                'text-xs font-medium truncate',
                colorConfig.light
              )}
            >
              <span className="hidden md:inline">{apt.start_time}</span>
              <span className="truncate flex-1 text-left">{apt.title}</span>
            </div>
          );
        })}

        {/* Overflow indicator for appointments */}
        {appointments.length > 2 && (
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100/80 dark:bg-slate-700/50 text-xs text-gray-600 dark:text-gray-400">
            +{appointments.length - 2} plus
          </div>
        )}

        {/* Mobile: show dots for appointments instead of bars */}
        <div className="sm:hidden flex gap-1">
          {appointments.slice(0, 3).map((apt) => (
            <div
              key={apt.id}
              className={cn('w-2 h-2 rounded-full', getColorConfig(apt.color).dot)}
            />
          ))}
          {appointments.length > 3 && (
            <div className="w-2 h-2 rounded-full bg-gray-400" />
          )}
        </div>
      </div>

      {/* Invoice indicator dots */}
      {actionableInvoices.length > 0 && (
        <div className="flex items-center gap-1 relative z-10 mt-auto">
          {actionableInvoices.slice(0, 3).map((inv) => (
            <div
              key={inv.id}
              className={cn(
                'flex items-center justify-center w-5 h-5 rounded-full',
                inv.status === 'overdue' && 'bg-red-500',
                inv.status === 'sent' && 'bg-blue-500'
              )}
              title={`${inv.number} - ${inv.client?.name || 'Client'} - ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(inv.total)}`}
            >
              <FileText className="w-3 h-3 text-white" />
            </div>
          ))}
          {actionableInvoices.length > 3 && (
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-400 text-white text-xs font-bold">
              +{actionableInvoices.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Overdue badge (red indicator) */}
      {overdueCount > 0 && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
        </div>
      )}
    </motion.button>
  );
}
