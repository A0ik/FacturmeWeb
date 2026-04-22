'use client';
import { toast } from 'sonner';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDataStore } from '@/stores/dataStore';
import { formatCurrency, cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Appointment } from '@/types';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle,
  Clock, CheckCircle2, Plus, FileText, X, MapPin,
  Trash2, ExternalLink, CalendarPlus, User, StickyNote,
  Sparkles, Video, Phone, Mail, MoreVertical, Link as LinkIcon,
  Loader2, Unlink, Sun, Moon, Zap,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// Premium color palette for appointments
const APPOINTMENT_COLORS = [
  {
    value: 'blue',
    label: 'Bleu',
    bg: 'bg-blue-500',
    light: 'bg-blue-50/90 text-blue-700 border-blue-200/50 backdrop-blur-sm',
    dot: 'bg-blue-400',
    gradient: 'from-blue-400 to-blue-600',
    shadow: 'shadow-blue-500/20'
  },
  {
    value: 'green',
    label: 'Vert',
    bg: 'bg-green-500',
    light: 'bg-green-50/90 text-green-700 border-green-200/50 backdrop-blur-sm',
    dot: 'bg-green-400',
    gradient: 'from-green-400 to-green-600',
    shadow: 'shadow-green-500/20'
  },
  {
    value: 'purple',
    label: 'Violet',
    bg: 'bg-purple-500',
    light: 'bg-purple-50/90 text-purple-700 border-purple-200/50 backdrop-blur-sm',
    dot: 'bg-purple-400',
    gradient: 'from-purple-400 to-purple-600',
    shadow: 'shadow-purple-500/20'
  },
  {
    value: 'amber',
    label: 'Ambre',
    bg: 'bg-amber-500',
    light: 'bg-amber-50/90 text-amber-700 border-amber-200/50 backdrop-blur-sm',
    dot: 'bg-amber-400',
    gradient: 'from-amber-400 to-amber-600',
    shadow: 'shadow-amber-500/20'
  },
  {
    value: 'red',
    label: 'Rouge',
    bg: 'bg-red-500',
    light: 'bg-red-50/90 text-red-700 border-red-200/50 backdrop-blur-sm',
    dot: 'bg-red-400',
    gradient: 'from-red-400 to-red-600',
    shadow: 'shadow-red-500/20'
  },
  {
    value: 'pink',
    label: 'Rose',
    bg: 'bg-pink-500',
    light: 'bg-pink-50/90 text-pink-700 border-pink-200/50 backdrop-blur-sm',
    dot: 'bg-pink-400',
    gradient: 'from-pink-400 to-pink-600',
    shadow: 'shadow-pink-500/20'
  },
];

function getColorConfig(color: string) {
  return APPOINTMENT_COLORS.find(c => c.value === color) || APPOINTMENT_COLORS[0];
}

function buildCalendarCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = Array(totalCells).fill(null);
  for (let i = 0; i < daysInMonth; i++) cells[startOffset + i] = i + 1;
  return cells;
}

function formatDateISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateICS(appointment: Appointment, profile: any) {
  const dateStr = appointment.appointment_date.replace(/-/g, '');
  const start = appointment.start_time.replace(':', '') + '00';
  const end = appointment.end_time.replace(':', '') + '00';
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `${appointment.id}@facturme.app`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Factu.me//Agenda//FR',
    'BEGIN:VEVENT',
    `DTSTART;TZID=Europe/Paris:${dateStr}T${start}`,
    `DTEND;TZID=Europe/Paris:${dateStr}T${end}`,
    `DTSTAMP:${dtstamp}`,
    `UID:${uid}`,
    `SUMMARY:${appointment.title}`,
  ];
  if (appointment.description) lines.push(`DESCRIPTION:${appointment.description}`);
  if (appointment.location) lines.push(`LOCATION:${appointment.location}`);
  if (appointment.client?.name) lines.push(`ATTENDEE;CN=${appointment.client.name}:mailto:${appointment.client.email || ''}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICS(appointment: Appointment, profile: any) {
  const ics = generateICS(appointment, profile);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appointment.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function openGoogleCalendar(appointment: Appointment) {
  const date = appointment.appointment_date.replace(/-/g, '');
  const start = appointment.start_time.replace(':', '') + '00';
  const end = appointment.end_time.replace(':', '') + '00';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: appointment.title,
    dates: `${date}T${start}/${date}T${end}`,
    details: appointment.description || '',
    location: appointment.location || '',
  });
  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
}

interface AppointmentFormData {
  title: string;
  description: string;
  location: string;
  client_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  color: string;
}

export default function CalendarPage() {
  const { invoices, clients, fetchClients } = useDataStore();
  const { profile } = useAuthStore();
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AppointmentFormData>({
    title: '',
    description: '',
    location: '',
    client_id: '',
    appointment_date: formatDateISO(today.getFullYear(), today.getMonth(), today.getDate()),
    start_time: '09:00',
    end_time: '10:00',
    color: 'blue',
  });
  const [saving, setSaving] = useState(false);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);

  // Google Calendar states
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleInfo, setGoogleInfo] = useState<{ email?: string; name?: string; picture?: string } | null>(null);

  const cells = useMemo(
    () => buildCalendarCells(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const fetchAppointments = useCallback(async () => {
    setLoadingAppts(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setAppointments([]);
        setLoadingAppts(false);
        return;
      }

      // Check if table exists
      const { error } = await supabase
        .from('appointments')
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        setAppointments([]);
        setLoadingAppts(false);
        return;
      }

      const { data } = await supabase
        .from('appointments')
        .select('*, client:clients(*)')
        .gte('appointment_date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .lt('appointment_date', `${currentMonth === 11 ? currentYear + 1 : currentYear}-${String((currentMonth === 11 ? 1 : currentMonth + 2) + 1).padStart(2, '0')}-01`)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });
      setAppointments(data || []);
    } catch (e) {
      console.error('Failed to fetch appointments', e);
      setAppointments([]);
    } finally {
      setLoadingAppts(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
  useEffect(() => { if (clients.length === 0) fetchClients(); }, [clients.length, fetchClients]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
    setSelectedDay(null);
  };
  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDay(today.getDate());
  };

  const invoicesByDay = useMemo(() => {
    const map: Record<number, typeof invoices> = {};
    invoices.forEach((inv) => {
      if (!inv.due_date) return;
      const d = new Date(inv.due_date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(inv);
      }
    });
    return map;
  }, [invoices, currentYear, currentMonth]);

  const appointmentsByDay = useMemo(() => {
    const map: Record<number, Appointment[]> = {};
    appointments.forEach((appt) => {
      const d = new Date(appt.appointment_date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(appt);
      }
    });
    return map;
  }, [appointments, currentYear, currentMonth]);

  const selectedDateStr = selectedDay !== null ? formatDateISO(currentYear, currentMonth, selectedDay) : null;
  const dayInvoices = selectedDateStr && selectedDay !== null ? invoicesByDay[selectedDay] || [] : [];
  const dayAppointments = selectedDateStr && selectedDay !== null ? appointmentsByDay[selectedDay] || [] : [];

  const isToday = (day: number) => {
    const now = new Date();
    return day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
  };

  const handleSaveAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { error } = await supabase.from('appointments').insert({
        user_id: profile?.id,
        ...form,
      });
      if (error) throw error;
      toast.success('Rendez-vous créé');
      setShowForm(false);
      setForm({
        title: '',
        description: '',
        location: '',
        client_id: '',
        appointment_date: selectedDateStr || formatDateISO(currentYear, currentMonth, today.getDate()),
        start_time: '09:00',
        end_time: '10:00',
        color: 'blue',
      });
      fetchAppointments();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAppt = async (id: string) => {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Rendez-vous supprimé');
      setDetailAppt(null);
      fetchAppointments();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-slate-900 dark:to-slate-950">
      {/* Animated Background with enhanced effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-primary/15 via-purple-500/15 to-pink-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-blue-500/15 via-cyan-500/15 to-teal-500/15 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-3xl animate-pulse delay-1400" />
      </div>

      {/* Left: Calendar Grid */}
      <div className="flex-1">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/30 dark:border-white/10 overflow-hidden">
          {/* Header with enhanced design */}
          <div className="p-8 border-b border-gray-100/50 dark:border-white/5 bg-gradient-to-r from-white/50 to-transparent dark:from-white/5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
                  Agenda
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedDay(today.getDate());
                  setForm({
                    ...form,
                    appointment_date: formatDateISO(today.getFullYear(), today.getMonth(), today.getDate()),
                  });
                  setShowForm(true);
                }}
                className="group flex items-center gap-2.5 bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                Nouveau
              </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={prevMonth}
                className="group p-3 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:from-primary/20 hover:to-purple-600/20 dark:hover:from-primary/20 dark:hover:to-purple-600/20 transition-all duration-300 border border-gray-200 dark:border-white/10 hover:border-primary/30 shadow-sm hover:shadow-md"
              >
                <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors" />
              </button>
              <div className="text-center px-8 py-3 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-600/10 to-pink-600/10 dark:from-primary/20 dark:via-purple-600/20 dark:to-pink-600/20 shadow-sm">
                <h2 className="text-2xl font-black bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {MONTHS[currentMonth]}
                </h2>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mt-0.5">{currentYear}</p>
              </div>
              <button
                onClick={nextMonth}
                className="group p-3 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:from-primary/20 hover:to-purple-600/20 dark:hover:from-primary/20 dark:hover:to-purple-600/20 transition-all duration-300 border border-gray-200 dark:border-white/10 hover:border-primary/30 shadow-sm hover:shadow-md"
              >
                <ChevronRight size={24} className="text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-8 pt-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-3 mb-6">
              {DAYS.map((day) => (
                <div key={day} className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-white/10 shadow-md">
                    <span className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                      {day.substring(0, 3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-3">
              {cells.map((day, idx) => {
                const dateStr = day !== null ? formatDateISO(currentYear, currentMonth, day) : null;
                const dayInvoices = day !== null ? invoicesByDay[day] || [] : [];
                const dayAppts = day !== null ? appointmentsByDay[day] || [] : [];
                const isSelected = selectedDay === day;
                const isCurrentDay = day !== null ? isToday(day) : false;

                return (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.02, type: "spring", stiffness: 260, damping: 20 }}
                    onClick={() => day !== null && setSelectedDay(day)}
                    disabled={day === null}
                    className={cn(
                      'relative min-h-[90px] sm:min-h-[110px] p-3 rounded-3xl border-2 transition-all duration-300 group',
                      'hover:shadow-2xl hover:scale-105 hover:-translate-y-1',
                      day === null
                        ? 'bg-transparent border-transparent cursor-default'
                        : isSelected
                        ? 'bg-gradient-to-br from-primary/30 via-purple-600/30 to-pink-600/30 border-primary shadow-xl shadow-primary/40 ring-4 ring-primary/20'
                        : isCurrentDay
                        ? 'bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 dark:from-amber-950/50 dark:via-orange-950/50 dark:to-amber-900/50 border-amber-400 dark:border-amber-600 shadow-lg shadow-amber-500/30'
                        : 'bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-md hover:shadow-xl',
                      day !== null && 'cursor-pointer overflow-hidden'
                    )}
                  >
                    {day !== null && (
                      <>
                        {/* Background gradient overlay */}
                        <div className={cn(
                          'absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300',
                          isSelected && 'bg-gradient-to-br from-primary/10 via-purple-600/10 to-pink-600/10 opacity-100',
                          isCurrentDay && !isSelected && 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-100'
                        )} />

                        {/* Day number */}
                        <div className="relative z-10">
                          <div className={cn(
                            'inline-flex items-center justify-center w-10 h-10 rounded-2xl text-base font-bold transition-all duration-300',
                            isSelected
                              ? 'bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg'
                              : isCurrentDay
                              ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md'
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 group-hover:from-gray-200 group-hover:to-gray-300 dark:group-hover:from-gray-600 dark:group-hover:to-gray-500'
                          )}>
                            {day}
                          </div>
                        </div>

                        {/* Invoice dots with enhanced design */}
                        {dayInvoices.length > 0 && (
                          <div className="relative z-10 flex flex-wrap gap-1.5 mt-2">
                            {dayInvoices.slice(0, 3).map((inv) => (
                              <div
                                key={inv.id}
                                className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-500 via-pink-500 to-rose-600 shadow-lg shadow-red-500/50 ring-2 ring-red-500/30"
                                title={`Facture ${inv.number}`}
                              />
                            ))}
                            {dayInvoices.length > 3 && (
                              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 shadow-md" />
                            )}
                          </div>
                        )}

                        {/* Appointment bars with enhanced design */}
                        {dayAppts.length > 0 && (
                          <div className="relative z-10 mt-2 space-y-1.5">
                            {dayAppts.slice(0, 2).map((appt) => {
                              const colorConfig = getColorConfig(appt.color);
                              return (
                                <div
                                  key={appt.id}
                                  className={cn(
                                    'h-2 rounded-full bg-gradient-to-r shadow-md ring-1 ring-black/5',
                                    colorConfig.gradient
                                  )}
                                  title={appt.title}
                                />
                              );
                            })}
                            {dayAppts.length > 2 && (
                              <div className="h-2 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 shadow-md" />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Today Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={goToToday}
                className="group flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:from-primary/20 hover:to-purple-600/20 dark:hover:from-primary/20 dark:hover:to-purple-600/20 border border-gray-200 dark:border-white/10 hover:border-primary/30 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <CalendarIcon size={18} className="text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors" />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                  Aujourd'hui
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Selected Day Details */}
      <div className="lg:w-96">
        <AnimatePresence mode="wait">
          {selectedDay !== null ? (
            <motion.div
              key={selectedDateStr || 'empty'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Date Header with enhanced design */}
              <div className="relative overflow-hidden rounded-3xl p-8 border-2 bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20 dark:from-primary/30 dark:via-purple-600/30 dark:to-pink-600/30 border-primary/30 dark:border-primary/50 shadow-2xl shadow-primary/20">
                {/* Animated background pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMTAiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-10" />
                <div className="relative z-10">
                  <h2 className="text-4xl font-black bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                    {selectedDay} {MONTHS[currentMonth].slice(0, -1)}
                  </h2>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    {isToday(selectedDay) ? (
                      <>
                        <Zap size={16} className="text-amber-600" />
                        <span className="text-amber-700 dark:text-amber-400">Aujourd'hui</span>
                      </>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400">
                        {new Date(currentYear, currentMonth, selectedDay).toLocaleDateString('fr-FR', { weekday: 'long' })}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Appointments with enhanced design */}
              {dayAppointments.length > 0 && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-white/10 overflow-hidden">
                  <div className="p-5 border-b border-gray-100/50 dark:border-white/5 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/50 dark:to-transparent">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20">
                        <CalendarIcon size={18} className="text-primary" />
                      </div>
                      Rendez-vous ({dayAppointments.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100/50 dark:divide-white/5">
                    {dayAppointments.map((appt) => {
                      const colorConfig = getColorConfig(appt.color);
                      return (
                        <button
                          key={appt.id}
                          onClick={() => setDetailAppt(appt)}
                          className="w-full p-5 text-left hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50 dark:hover:from-white/5 dark:hover:to-white/10 transition-all duration-200 group"
                        >
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              'w-2 rounded-full bg-gradient-to-b shadow-lg',
                              colorConfig.gradient
                            )} style={{ height: '3rem' }} />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white text-base truncate group-hover:text-primary transition-colors">
                                {appt.title}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1 flex items-center gap-2">
                                <Clock size={14} />
                                {appt.start_time} - {appt.end_time}
                              </p>
                              {appt.client?.name && (
                                <p className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-1.5 mt-1.5 font-medium">
                                  <User size={12} />
                                  {appt.client.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Invoices with enhanced design */}
              {dayInvoices.length > 0 && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-white/10 overflow-hidden">
                  <div className="p-5 border-b border-gray-100/50 dark:border-white/5 bg-gradient-to-r from-red-50/50 to-pink-50/50 dark:from-red-950/20 dark:to-pink-950/20">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20">
                        <FileText size={18} className="text-red-600" />
                      </div>
                      Factures ({dayInvoices.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100/50 dark:divide-white/5">
                    {dayInvoices.map((inv) => (
                      <Link
                        key={inv.id}
                        href={`/invoices/${inv.id}`}
                        className="block p-5 hover:bg-gradient-to-r hover:from-red-50/50 hover:to-pink-50/50 dark:hover:from-red-950/20 dark:hover:to-pink-950/20 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 group-hover:from-red-500/30 group-hover:to-pink-500/30 transition-all">
                              <FileText size={16} className="text-red-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white text-sm truncate group-hover:text-red-600 transition-colors">
                                {inv.number}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                {inv.client?.name || inv.client_name_override}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                              {formatCurrency(inv.total)}
                            </p>
                            <StatusBadge status={inv.status} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State with enhanced design */}
              {dayAppointments.length === 0 && dayInvoices.length === 0 && (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-white/10 p-10 text-center">
                  <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 mb-4 shadow-inner">
                    <CalendarIcon size={36} className="text-gray-400 dark:text-gray-600" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-base font-semibold mb-6">
                    Aucun rendez-vous ou facture prévue
                  </p>
                  <button
                    onClick={() => {
                      setForm({
                        ...form,
                        appointment_date: selectedDateStr || formatDateISO(currentYear, currentMonth, selectedDay),
                      });
                      setShowForm(true);
                    }}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl text-sm font-semibold shadow hover:shadow-lg transition-all"
                  >
                    <Plus size={14} />
                    Ajouter un rendez-vous
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-white/10 p-8 text-center"
            >
              <CalendarIcon size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                Sélectionnez une date
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choisissez un jour pour voir les rendez-vous et factures prévues
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Appointment Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nouveau rendez-vous</h2>
              </div>

              <form onSubmit={handleSaveAppt} className="p-6 space-y-4">
                <input
                  required
                  placeholder="Titre du rendez-vous"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                <textarea
                  placeholder="Description (optionnel)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />

                <input
                  placeholder="Lieu (optionnel)"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                <select
                  required
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name || client.name}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="time"
                    required
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="time"
                    required
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Couleur</label>
                  <div className="grid grid-cols-6 gap-2">
                    {APPOINTMENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setForm({ ...form, color: color.value })}
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                          form.color === color.value
                            ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                            : 'hover:scale-105',
                          color.gradient
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Créer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Appointment Detail Modal */}
      <AnimatePresence>
        {detailAppt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setDetailAppt(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20"
            >
              <div className={cn('p-6', `bg-gradient-to-r ${getColorConfig(detailAppt.color).gradient}`)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{detailAppt.title}</h2>
                    <p className="text-white/80 text-sm mt-1">
                      {detailAppt.start_time} - {detailAppt.end_time}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailAppt(null)}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X size={18} className="text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {detailAppt.description && (
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{detailAppt.description}</p>
                  </div>
                )}

                {detailAppt.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin size={16} />
                    {detailAppt.location}
                  </div>
                )}

                {detailAppt.client && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User size={16} />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      downloadICS(detailAppt, profile);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <CalendarIcon size={16} />
                    Exporter
                  </button>
                  <button
                    onClick={() => {
                      openGoogleCalendar(detailAppt);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <ExternalLink size={16} />
                    Google Calendar
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteAppt(detailAppt.id)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
