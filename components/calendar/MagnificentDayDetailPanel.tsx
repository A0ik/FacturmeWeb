'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Calendar as CalendarIcon, FileText, Plus, Sparkles, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment, Invoice } from '@/types';
import { MagnificentAppointmentCard } from './MagnificentAppointmentCard';
import { MagnificentInvoiceCard } from './MagnificentInvoiceCard';

// Helper function to format French date
function formatFrenchDateLocal(year: number, month: number, day: number): string {
  const date = new Date(year, month, day);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface MagnificentDayDetailPanelProps {
  selectedDay: number | null;
  currentMonth: number;
  currentYear: number;
  appointments: Appointment[];
  invoices: Invoice[];
  onAppointmentClick: (appointment: Appointment) => void;
  onNewAppointment: () => void;
  className?: string;
}

export function MagnificentDayDetailPanel({
  selectedDay,
  currentMonth,
  currentYear,
  appointments,
  invoices,
  onAppointmentClick,
  onNewAppointment,
  className,
}: MagnificentDayDetailPanelProps) {
  const actionableInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');

  const panelVariants: Variants = {
    hidden: { opacity: 0, x: 20, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 20, scale: 0.95 },
  };

  return (
    <AnimatePresence mode="wait">
      {selectedDay !== null && (
        <motion.div
          key={selectedDay}
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            'lg:w-[400px] xl:w-[440px]',
            'relative',
            // Glass card effect
            'before:absolute before:inset-0 before:rounded-[2rem] before:bg-gradient-to-br before:from-white/80 before:to-white/60 before:dark:from-slate-900/80 before:dark:to-slate-900/60 before:blur-2xl before:-z-10',
            'backdrop-blur-2xl bg-white/40 dark:bg-slate-900/40',
            'border border-white/30 dark:border-white/10 shadow-2xl',
            'rounded-[2rem]',
            'p-6 flex flex-col gap-5',
            className
          )}
        >
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 rounded-[2rem] overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-primary/30 to-emerald-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-accent/30 to-orange-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Date header */}
          <div className="relative flex items-center justify-between">
            <div>
              <motion.div
                key={`${currentMonth}-${selectedDay}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-bold text-primary/80 dark:text-primary/60 uppercase tracking-wider mb-1"
              >
                {new Date(currentYear, currentMonth, selectedDay).toLocaleDateString('fr-FR', { weekday: 'long' })}
              </motion.div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {formatFrenchDateLocal(currentYear, currentMonth, selectedDay)}
              </div>
            </div>
            <motion.button
              onClick={onNewAppointment}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'relative w-12 h-12 rounded-2xl flex items-center justify-center',
                'bg-gradient-to-r from-primary to-emerald-600',
                'text-white shadow-lg shadow-primary/30',
                'hover:shadow-xl hover:shadow-primary/40',
                'transition-all duration-300'
              )}
              title="Nouveau rendez-vous"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Stats row */}
          <div className="relative grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn(
                'bg-gradient-to-br from-primary/10 to-emerald-500/10 dark:from-primary/20 dark:to-emerald-500/20',
                'rounded-2xl p-4 border border-primary/20'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg">
                  <CalendarIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{appointments.length}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Rendez-vous</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={cn(
                'bg-gradient-to-br from-accent/10 to-orange-500/10 dark:from-accent/20 dark:to-orange-500/20',
                'rounded-2xl p-4 border border-accent/20'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-orange-600 flex items-center justify-center shadow-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{actionableInvoices.length}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Factures</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Appointments section */}
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
              <CalendarIcon className="w-4 h-4 text-primary" />
              Rendez-vous
            </div>

            {appointments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Aucun rendez-vous</p>
                <motion.button
                  onClick={onNewAppointment}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-emerald-500/10 text-primary text-xs font-semibold hover:from-primary/20 hover:to-emerald-500/20 transition-all"
                >
                  En créer un
                </motion.button>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                {appointments.map((apt, idx) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <MagnificentAppointmentCard
                      appointment={apt}
                      onClick={() => onAppointmentClick(apt)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Invoices section */}
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
              <FileText className="w-4 h-4 text-accent" />
              Factures dues
            </div>

            {actionableInvoices.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-2">
                  <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Aucune facture due</p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                {actionableInvoices.map((inv, idx) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <MagnificentInvoiceCard invoice={inv} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Empty state hint */}
          {appointments.length === 0 && actionableInvoices.length === 0 && (
            <motion.button
              onClick={onNewAppointment}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative w-full py-4 px-5 rounded-2xl text-sm font-bold overflow-hidden',
                'group',
                'before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary before:to-emerald-600 before:opacity-0 before:group-hover:opacity-100 before:transition-opacity',
                'border-2 border-dashed border-primary/30 dark:border-primary/20',
                'text-primary dark:text-primary-light',
                'hover:border-primary/50',
                'transition-all duration-300'
              )}
            >
              <span className="relative flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Créer un rendez-vous
              </span>
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
