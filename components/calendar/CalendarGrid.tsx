'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DAYS } from './constants';
import { CalendarDayCell } from './CalendarDayCell';
import { Appointment, Invoice } from '@/types';
import { glassTokens } from './constants';

interface CalendarGridProps {
  cells: (number | null)[];
  currentYear: number;
  currentMonth: number;
  selectedDay: number | null;
  appointmentsByDay: Record<number, Appointment[]>;
  invoicesByDay: Record<number, Invoice[]>;
  onSelectDay: (day: number) => void;
  className?: string;
}

export function CalendarGrid({
  cells,
  currentYear,
  currentMonth,
  selectedDay,
  appointmentsByDay,
  invoicesByDay,
  onSelectDay,
  className,
}: CalendarGridProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.015,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex-1',
        glassTokens.cardElevated,
        'p-4 lg:p-6',
        className
      )}
    >
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-3">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center py-2 text-sm font-semibold text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {cells.map((day, index) => {
          const dayNumber = day as number | null;
          const isSelected = selectedDay === dayNumber;

          return (
            <CalendarDayCell
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
