'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, User, StickyNote, Edit, Download, Cloud, Trash2, ExternalLink, Loader2, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types';
import { downloadICS, openGoogleCalendar, getColorConfig, glassTokens } from './constants';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onGoogleSync: (appointmentId: string) => Promise<{ success: boolean; eventId?: string; error?: string }>;
  googleConnected: boolean;
  profile: any;
  className?: string;
}

export function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  onEdit,
  onDelete,
  onGoogleSync,
  googleConnected,
  profile,
  className,
}: AppointmentDetailModalProps) {
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!appointment) return null;

  const colorConfig = getColorConfig(appointment.color);

  const handleGoogleSync = async () => {
    setSyncing(true);
    try {
      await onGoogleSync(appointment.id);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              className={cn(
                'relative w-full max-w-lg max-h-[90vh] overflow-hidden',
                'bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl',
                'rounded-3xl border border-white/30 dark:border-white/10 shadow-2xl',
                'flex flex-col',
                className
              )}
            >
              {/* Gradient header */}
              <div
                className={cn(
                  'relative px-6 py-5',
                  'bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300'
                )}
              >
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      colorConfig.bg
                    )}
                  >
                    <CalendarIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">{appointment.title}</h2>
                    <div className="flex items-center gap-2 text-white/80 text-sm mt-1">
                      <Clock className="w-4 h-4" />
                      <span>{appointment.start_time} - {appointment.end_time}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Date */}
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl',
                    'bg-white/50 dark:bg-slate-800/50',
                    'border border-white/20 dark:border-white/10'
                  )}
                >
                  <CalendarIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Date</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Date(appointment.appointment_date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                {/* Location */}
                {appointment.location && (
                  <div
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl',
                      'bg-white/50 dark:bg-slate-800/50',
                      'border border-white/20 dark:border-white/10'
                    )}
                  >
                    <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Lieu</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {appointment.location}
                      </div>
                    </div>
                  </div>
                )}

                {/* Client */}
                {appointment.client && (
                  <div
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl',
                      'bg-white/50 dark:bg-slate-800/50',
                      'border border-white/20 dark:border-white/10'
                    )}
                  >
                    <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Client</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {appointment.client.name}
                      </div>
                      {appointment.client.email && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {appointment.client.email}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {appointment.description && (
                  <div
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl',
                      'bg-white/50 dark:bg-slate-800/50',
                      'border border-white/20 dark:border-white/10'
                    )}
                  >
                    <StickyNote className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {appointment.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Google sync status */}
                {googleConnected && (
                  <div
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl',
                      appointment.google_event_id
                        ? 'bg-green-50/50 dark:bg-green-900/20 border-green-200/30 dark:border-green-800/30'
                        : 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-200/30 dark:border-gray-700/30'
                    )}
                  >
                    <Cloud className={cn(
                      'w-5 h-5',
                      appointment.google_event_id ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                    )} />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Google Calendar</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {appointment.google_event_id ? 'Synchronisé' : 'Non synchronisé'}
                      </div>
                    </div>
                    {appointment.google_event_id && (
                      <button
                        onClick={() => openGoogleCalendar(appointment)}
                        className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/5 transition-colors"
                        title="Ouvrir dans Google Calendar"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-6 py-4 border-t border-white/10 dark:border-white/5">
                <div className="grid grid-cols-2 gap-3">
                  {/* Edit */}
                  <motion.button
                    onClick={onEdit}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold',
                      glassTokens.btnSecondary
                    )}
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </motion.button>

                  {/* Export ICS */}
                  <motion.button
                    onClick={() => downloadICS(appointment, profile)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold',
                      glassTokens.btnSecondary
                    )}
                  >
                    <Download className="w-4 h-4" />
                    Exporter
                  </motion.button>

                  {/* Sync Google */}
                  {googleConnected && !appointment.google_event_id && (
                    <motion.button
                      onClick={handleGoogleSync}
                      disabled={syncing}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold',
                        'bg-blue-500 hover:bg-blue-600 text-white',
                        'transition-all disabled:opacity-50'
                      )}
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Synchronisation...
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4" />
                          Synchroniser avec Google
                        </>
                      )}
                    </motion.button>
                  )}
                </div>

                {/* Delete */}
                <motion.button
                  onClick={handleDelete}
                  disabled={deleting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold',
                    'bg-red-500 hover:bg-red-600 text-white',
                    'transition-all disabled:opacity-50'
                  )}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
