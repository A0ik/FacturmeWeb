'use client';

import { motion, Variants } from 'framer-motion';
import { cn, formatFrenchDate } from '@/lib/utils';
import { Calendar, FileText } from 'lucide-react';
import { Appointment, Invoice } from '@/types';

// Helper function to check if date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

interface MagnificentCalendarDayCellProps {
  day: number | null;
  currentYear: number;
  currentMonth: number;
  isSelected: boolean;
  appointments: Appointment[];
  invoices: Invoice[];
  onClick: () => void;
  className?: string;
}

export function MagnificentCalendarDayCell({
  day,
  currentYear,
  currentMonth,
  isSelected,
  appointments,
  invoices,
  onClick,
  className,
}: MagnificentCalendarDayCellProps) {
  if (day === null) {
    return <div className="aspect-square" />;
  }

  const date = new Date(currentYear, currentMonth, day);
  const today = isToday(date);
  const totalEvents = appointments.length + invoices.length;

  const cellVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
  };

  return (
    <motion.div
      variants={cellVariants}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'relative aspect-square rounded-2xl cursor-pointer transition-all duration-300',
        'group overflow-hidden',
        // Background
        today
          ? 'bg-gradient-to-br from-primary/20 to-emerald-500/20 dark:from-primary/30 dark:to-emerald-500/30'
          : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80',
        isSelected && 'bg-gradient-to-br from-primary to-emerald-600 shadow-lg shadow-primary/30',
        // Border
        isSelected
          ? 'border-2 border-primary dark:border-primary'
          : 'border-2 border-transparent hover:border-primary/30 dark:hover:border-primary/30',
        className
      )}
    >
      {/* Day number */}
      <div className="absolute top-2 left-2 z-10">
        <span
          className={cn(
            'text-sm font-bold tabular-nums',
            today && 'text-primary',
            isSelected && 'text-white',
            !today && !isSelected && 'text-gray-700 dark:text-gray-300'
          )}
        >
          {day}
        </span>
      </div>

      {/* Today indicator */}
      {today && !isSelected && (
        <motion.div
          layoutId="today-indicator"
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50"
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
      )}

      {/* Events dots */}
      {totalEvents > 0 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {/* Appointments */}
          {appointments.length > 0 && (
            <div
              className={cn(
                'w-2 h-2 rounded-full shadow-md',
                isSelected ? 'bg-white/90' : 'bg-primary'
              )}
              title={`${appointments.length} rendez-vous`}
            />
          )}
          {/* Invoices */}
          {invoices.length > 0 && (
            <div
              className={cn(
                'w-2 h-2 rounded-full shadow-md',
                isSelected ? 'bg-white/90' : 'bg-accent'
              )}
              title={`${invoices.length} facture(s)`}
            />
          )}
        </div>
      )}

      {/* Hover overlay effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        initial={false}
      />

      {/* Events preview on hover */}
      {totalEvents > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0, y: 10 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block w-48"
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 dark:border-white/10 p-3">
            <div className="space-y-2">
              {appointments.slice(0, 2).map((apt) => (
                <div key={apt.id} className="flex items-center gap-2 text-xs">
                  <Calendar size={10} className="text-primary flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {apt.title}
                  </span>
                </div>
              ))}
              {invoices.slice(0, 1).map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 text-xs">
                  <FileText size={10} className="text-accent flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    Facture {inv.number}
                  </span>
                </div>
              ))}
              {totalEvents > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium pt-1 border-t border-gray-200 dark:border-white/10">
                  +{totalEvents - 3} autres
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
