'use client';

import { motion, Variants } from 'framer-motion';
import { cn, formatTime } from '@/lib/utils';
import { Clock, MapPin, User } from 'lucide-react';
import { Appointment } from '@/types';

interface MagnificentAppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
  className?: string;
}

export function MagnificentAppointmentCard({
  appointment,
  onClick,
  className,
}: MagnificentAppointmentCardProps) {
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl cursor-pointer',
        'bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm',
        'border border-white/30 dark:border-white/10',
        'hover:border-primary/30 dark:hover:border-primary/20',
        'hover:shadow-lg hover:shadow-primary/10',
        'transition-all duration-300',
        'p-4',
        className
      )}
    >
      {/* Gradient accent on left */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1',
        'bg-gradient-to-b from-primary to-emerald-600',
        'rounded-l-2xl'
      )} />

      <div className="flex items-start gap-3">
        {/* Time */}
        <div className="flex-shrink-0">
          <div className={cn(
            'w-12 h-12 rounded-xl',
            'bg-gradient-to-br from-primary/10 to-emerald-500/10 dark:from-primary/20 dark:to-emerald-500/20',
            'flex flex-col items-center justify-center',
            'border border-primary/20'
          )}>
            <Clock className="w-4 h-4 text-primary mb-0.5" />
            <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">
              {formatTime(appointment.start_time)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1 truncate">
            {appointment.title}
          </h4>
          {appointment.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
              {appointment.description}
            </p>
          )}
          {appointment.location && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{appointment.location}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
