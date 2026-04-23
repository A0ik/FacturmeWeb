'use client';

import { motion } from 'framer-motion';
import { User, MapPin, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types';
import { getColorConfig, glassTokens } from './constants';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
  compact?: boolean;
  className?: string;
}

export function AppointmentCard({ appointment, onClick, compact = false, className }: AppointmentCardProps) {
  const colorConfig = getColorConfig(appointment.color);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative w-full text-left flex items-start gap-3 p-3 rounded-xl',
        'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm',
        'border border-white/20 dark:border-white/10',
        'hover:bg-white/70 dark:hover:bg-slate-700/50 hover:border-primary/20',
        'transition-all duration-200 cursor-pointer',
        !compact && 'min-h-[80px]',
        className
      )}
    >
      {/* Left color bar */}
      <div
        className={cn(
          'absolute left-0 top-3 bottom-3 w-1 rounded-full',
          `bg-gradient-to-b ${colorConfig.gradient}`
        )}
      />

      {/* Content */}
      <div className="flex-1 pl-3 flex flex-col gap-1.5">
        {/* Time range */}
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {appointment.start_time} - {appointment.end_time}
        </div>

        {/* Title */}
        <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
          {appointment.title}
        </div>

        {/* Client or location */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {appointment.client && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate">{appointment.client.name}</span>
            </div>
          )}
          {appointment.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{appointment.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Google sync indicator */}
      {appointment.google_event_id && (
        <div
          className={cn(
            'w-6 h-6 rounded-lg flex items-center justify-center',
            'bg-blue-50 dark:bg-blue-900/20',
            'text-blue-500'
          )}
          title="Synchronisé avec Google Calendar"
        >
          <Cloud className="w-3.5 h-3.5" />
        </div>
      )}
    </motion.button>
  );
}
