'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, FileText, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment, Invoice } from '@/types';
import { AppointmentCard } from './AppointmentCard';
import { InvoiceCard } from './InvoiceCard';
import { formatFrenchDate, glassTokens } from './constants';

interface DayDetailPanelProps {
  selectedDay: number | null;
  currentMonth: number;
  currentYear: number;
  appointments: Appointment[];
  invoices: Invoice[];
  onAppointmentClick: (appointment: Appointment) => void;
  onNewAppointment: () => void;
  className?: string;
}

export function DayDetailPanel({
  selectedDay,
  currentMonth,
  currentYear,
  appointments,
  invoices,
  onAppointmentClick,
  onNewAppointment,
  className,
}: DayDetailPanelProps) {
  // Filter actionable invoices (sent or overdue)
  const actionableInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');

  const panelVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
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
          transition={{ duration: 0.2 }}
          className={cn(
            'lg:w-[380px] xl:w-[420px]',
            glassTokens.cardElevated,
            'p-4 lg:p-6 flex flex-col gap-4',
            className
          )}
        >
          {/* Date header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                {new Date(currentYear, currentMonth, selectedDay).toLocaleDateString('fr-FR', { weekday: 'long' })}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatFrenchDate(currentYear, currentMonth, selectedDay)}
              </div>
            </div>
            <motion.button
              onClick={onNewAppointment}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                glassTokens.btnPrimary
              )}
              title="Nouveau rendez-vous"
            >
              <Plus className="w-5 h-5 text-white" />
            </motion.button>
          </div>

          {/* Appointments section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <CalendarIcon className="w-4 h-4 text-primary" />
              Rendez-vous ({appointments.length})
            </div>

            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Sparkles className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun rendez-vous</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                {appointments.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onClick={() => onAppointmentClick(apt)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Invoices section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <FileText className="w-4 h-4 text-blue-500" />
              Factures dues ({actionableInvoices.length})
            </div>

            {actionableInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <FileText className="w-6 h-6 text-gray-300 dark:text-gray-600 mb-1" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Aucune facture due</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                {actionableInvoices.map((inv) => (
                  <InvoiceCard key={inv.id} invoice={inv} />
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
                'w-full py-3 px-4 rounded-xl text-sm font-medium',
                'bg-gradient-to-r from-primary/10 to-emerald-600/10',
                'border border-dashed border-primary/30',
                'text-primary dark:text-primary-light',
                'hover:from-primary/20 hover:to-emerald-600/20',
                'transition-all duration-200 cursor-pointer'
              )}
            >
              Créer un rendez-vous
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
