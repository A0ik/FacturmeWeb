'use client';

import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DAYS } from './constants';
import { MagnificentCalendarDayCell } from './MagnificentCalendarDayCell';
import { Appointment, Invoice } from '@/types';

interface MagnificentCalendarGridProps {
  cells: (number | null)[];
  currentYear: number;
  currentMonth: number;
  selectedDay: number | null;
  appointmentsByDay: Record<number, Appointment[]>;
  invoicesByDay: Record<number, Invoice[]>;
  onSelectDay: (day: number) => void;
  className?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
    },
  },
};

export function MagnificentCalendarGrid({
  cells,
  currentYear,
  currentMonth,
  selectedDay,
  appointmentsByDay,
  invoicesByDay,
  onSelectDay,
  className,
}: MagnificentCalendarGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex-1',
        'relative',
        // Glass card effect
        'before:absolute before:inset-0 before:rounded-[2rem] before:bg-gradient-to-br before:from-white/80 before:to-white/60 before:dark:from-slate-900/80 before:dark:to-slate-900/60 before:blur-2xl before:-z-10',
        'backdrop-blur-2xl bg-white/40 dark:bg-slate-900/40',
        'border border-white/30 dark:border-white/10 shadow-2xl',
        'rounded-[2rem]',
        'p-4 lg:p-6',
        className
      )}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 rounded-[2rem] overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-primary/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-accent/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Day headers */}
      <div className="relative grid grid-cols-7 gap-1 md:gap-2 mb-4">
        {DAYS.map((day, idx) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="text-center py-3"
          >
            <span className="text-xs font-bold text-primary/80 dark:text-primary/60 uppercase tracking-wider">
              {day.substring(0, 3)}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="relative grid grid-cols-7 gap-1 md:gap-2">
        {cells.map((day, index) => {
          const dayNumber = day as number | null;
          const isSelected = selectedDay === dayNumber;

          return (
            <MagnificentCalendarDayCell
              key={index}
              day={dayNumber}
              currentYear={currentYear}
              currentMonth={currentMonth}
              isSelected={isSelected}
              appointments={dayNumber !== null ? (appointmentsByDay[dayNumber] || []) : []}
              invoices={dayNumber !== null ? (invoicesByDay[dayNumber] || []) : []}
              onClick={() => dayNumber !== null && onSelectDay(dayNumber)}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
