'use client';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
}

export default function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(value || new Date());

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 0 = Sunday, adjust to 6 for Sunday, 0 for Monday

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const isSelected = (date: Date) => value && isSameDay(date, value);
  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const isDisabled = (date: Date) => {
    if (disabled) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const handleDayClick = (date: Date) => {
    if (isDisabled(date)) return;
    onChange?.(date);
  };

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const calendarDays = useMemo(() => {
    const days = [];

    // Days from previous month
    const prevMonthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
    const prevMonthStartDay = adjustedFirstDay === 6 ? 0 : adjustedFirstDay;
    for (let i = prevMonthStartDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push({
        day,
        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, day),
        isOtherMonth: true,
      });
    }

    // Days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
        isOtherMonth: false,
      });
    }

    // Days from next month
    const totalCells = Math.ceil((daysInMonth + adjustedFirstDay) / 7) * 7;
    const remainingCells = totalCells - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      days.push({
        day,
        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, day),
        isOtherMonth: true,
      });
    }

    return days;
  }, [currentMonth, daysInMonth, adjustedFirstDay]);

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200">
        <button
          type="button"
          onClick={prevMonth}
          disabled={disabled}
          className="p-2 rounded-lg hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-base font-bold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          disabled={disabled}
          className="p-2 rounded-lg hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {dayNames.map((day) => (
          <div key={day} className="bg-gray-50 py-2 text-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {calendarDays.map((day, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleDayClick(day.date)}
            disabled={isDisabled(day.date)}
            className={cn(
              "relative h-11 transition-colors disabled:cursor-not-allowed",
              day.isOtherMonth ? "bg-gray-50" : "bg-white",
              !day.isOtherMonth && "hover:bg-primary/5",
              isDisabled(day.date) && "opacity-40",
              isSelected(day.date) && "bg-primary text-white hover:bg-primary-dark",
              !isSelected(day.date) && isToday(day.date) && "ring-2 ring-primary/30 ring-inset"
            )}
          >
            <span className={cn(
              "text-sm font-medium",
              day.isOtherMonth ? "text-gray-300" : isSelected(day.date) ? "text-white" : "text-gray-700"
            )}>
              {day.day}
            </span>
            {isToday(day.date) && !isSelected(day.date) && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
