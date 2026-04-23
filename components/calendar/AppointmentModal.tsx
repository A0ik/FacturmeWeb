'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, User, StickyNote, Loader2, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment, Client } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { APPOINTMENT_COLORS, AppointmentColor, glassTokens } from './constants';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AppointmentFormData) => Promise<void>;
  editingAppointment?: Appointment | null;
  clients: Client[];
  selectedDate?: string; // YYYY-MM-DD format
  googleConnected: boolean;
  className?: string;
}

export interface AppointmentFormData {
  title: string;
  description: string;
  location: string;
  client_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  color: AppointmentColor;
  sync_with_google: boolean;
}

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

export function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  editingAppointment,
  clients,
  selectedDate,
  googleConnected,
  className,
}: AppointmentModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AppointmentFormData>({
    title: '',
    description: '',
    location: '',
    client_id: '',
    appointment_date: selectedDate || new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    color: 'blue',
    sync_with_google: googleConnected,
  });

  // Reset form when opening or editing
  useEffect(() => {
    if (isOpen) {
      if (editingAppointment) {
        setFormData({
          title: editingAppointment.title,
          description: editingAppointment.description || '',
          location: editingAppointment.location || '',
          client_id: editingAppointment.client_id || '',
          appointment_date: editingAppointment.appointment_date,
          start_time: editingAppointment.start_time,
          end_time: editingAppointment.end_time,
          color: editingAppointment.color as AppointmentColor,
          sync_with_google: googleConnected && !!editingAppointment.google_event_id,
        });
      } else {
        setFormData({
          title: '',
          description: '',
          location: '',
          client_id: '',
          appointment_date: selectedDate || new Date().toISOString().split('T')[0],
          start_time: '09:00',
          end_time: '10:00',
          color: 'blue',
          sync_with_google: googleConnected,
        });
      }
    }
  }, [isOpen, editingAppointment, selectedDate, googleConnected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    // Validate end time is after start time
    if (formData.end_time <= formData.start_time) {
      return; // TODO: show error
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
    } finally {
      setSaving(false);
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
              {/* Header with color bar */}
              <div
                className={cn(
                  'h-2 bg-gradient-to-r',
                  getColorConfig(formData.color).gradient
                )}
              />
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 dark:border-white/5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingAppointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Titre *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Réunion client"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl',
                      'bg-white/50 dark:bg-slate-800/50',
                      'border border-white/20 dark:border-white/10',
                      'focus:border-primary/40 focus:ring-2 focus:ring-primary/20',
                      'text-gray-900 dark:text-white placeholder-gray-400',
                      'transition-all'
                    )}
                    required
                  />
                </div>

                {/* Client selector */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    Client
                  </label>
                  <CustomSelect
                    value={formData.client_id}
                    onChange={(value) => setFormData({ ...formData, client_id: value })}
                    options={[
                      { value: '', label: 'Aucun client' },
                      ...clients.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    placeholder="Sélectionner un client"
                    className="w-full"
                  />
                </div>

                {/* Date and time row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date</label>
                    <input
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                      className={cn(
                        'w-full px-4 py-2.5 rounded-xl',
                        'bg-white/50 dark:bg-slate-800/50',
                        'border border-white/20 dark:border-white/10',
                        'focus:border-primary/40 focus:ring-2 focus:ring-primary/20',
                        'text-gray-900 dark:text-white',
                        'transition-all'
                      )}
                      required
                    />
                  </div>

                  {/* Color picker */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Couleur</label>
                    <div className="flex gap-1.5">
                      {APPOINTMENT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: color.value })}
                          className={cn(
                            'w-8 h-8 rounded-full transition-all',
                            color.bg,
                            formData.color === color.value && 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600'
                          )}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Start and End time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Début</label>
                    <CustomSelect
                      value={formData.start_time}
                      onChange={(value) => setFormData({ ...formData, start_time: value })}
                      options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fin</label>
                    <CustomSelect
                      value={formData.end_time}
                      onChange={(value) => setFormData({ ...formData, end_time: value })}
                      options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Lieu
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: 123 Rue Example, Paris"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl',
                      'bg-white/50 dark:bg-slate-800/50',
                      'border border-white/20 dark:border-white/10',
                      'focus:border-primary/40 focus:ring-2 focus:ring-primary/20',
                      'text-gray-900 dark:text-white placeholder-gray-400',
                      'transition-all'
                    )}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <StickyNote className="w-4 h-4" />
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Notes ou détails du rendez-vous..."
                    rows={3}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl resize-none',
                      'bg-white/50 dark:bg-slate-800/50',
                      'border border-white/20 dark:border-white/10',
                      'focus:border-primary/40 focus:ring-2 focus:ring-primary/20',
                      'text-gray-900 dark:text-white placeholder-gray-400',
                      'transition-all'
                    )}
                  />
                </div>

                {/* Google sync toggle */}
                {googleConnected && (
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/30 dark:border-blue-800/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sync_with_google}
                      onChange={(e) => setFormData({ ...formData, sync_with_google: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Cloud className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Synchroniser avec Google Calendar
                    </span>
                  </label>
                )}
              </form>

              {/* Footer buttons */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-white/10 dark:border-white/5">
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl font-semibold',
                    glassTokens.btnSecondary
                  )}
                >
                  Annuler
                </motion.button>
                <motion.button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={saving || !formData.title.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2',
                    glassTokens.btnPrimary
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    editingAppointment ? 'Modifier' : 'Créer'
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

// Helper to get color config inside modal
function getColorConfig(color: string) {
  return APPOINTMENT_COLORS.find(c => c.value === color) || APPOINTMENT_COLORS[0];
}
