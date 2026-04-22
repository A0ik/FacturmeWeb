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
  Loader2,
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
      const { data } = await getSupabaseClient()
        .from('appointments')
        .select('*, client:clients(*)')
        .gte('appointment_date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .lt('appointment_date', `${currentMonth === 11 ? currentYear + 1 : currentYear}-${String(currentMonth === 11 ? 1 : currentMonth + 2).padStart(2, '0')}-01`)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });
      setAppointments(data || []);
    } catch (e) {
      console.error('Failed to fetch appointments', e);
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

  const selectedInvoices = selectedDay ? (invoicesByDay[selectedDay] || []) : [];
  const selectedAppts = selectedDay ? (appointmentsByDay[selectedDay] || []) : [];

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const isPast = (day: number) =>
    new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const getLabelColor = (inv: (typeof invoices)[0]) => {
    if (inv.status === 'paid') return 'bg-green-50/90 text-green-700 border-green-200/50 backdrop-blur-sm';
    if (inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < today)) return 'bg-red-50/90 text-red-700 border-red-200/50 backdrop-blur-sm';
    return 'bg-amber-50/90 text-amber-700 border-amber-200/50 backdrop-blur-sm';
  };

  const upcoming = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status !== 'paid' && inv.due_date)
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
        .slice(0, 7),
    [invoices]
  );

  const thisMonthInvoices = Object.values(invoicesByDay).flat();
  const monthStats = {
    pending: thisMonthInvoices.filter((i) => i.status !== 'paid' && i.status !== 'overdue').length,
    overdue: thisMonthInvoices.filter((i) => i.status === 'overdue' || (i.due_date && new Date(i.due_date) < today && i.status !== 'paid')).length,
    paid: thisMonthInvoices.filter((i) => i.status === 'paid').length,
  };

  const openNewAppointment = (day?: number) => {
    const d = day || selectedDay || today.getDate();
    setForm({
      title: '',
      description: '',
      location: '',
      client_id: '',
      appointment_date: formatDateISO(currentYear, currentMonth, d),
      start_time: '09:00',
      end_time: '10:00',
      color: 'blue',
    });
    setShowForm(true);
    setDetailAppt(null);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.appointment_date) return;
    setSaving(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.user) return;

      const { data, error } = await getSupabaseClient()
        .from('appointments')
        .insert({
          user_id: session.user.id,
          title: form.title.trim(),
          description: form.description || null,
          location: form.location || null,
          client_id: form.client_id || null,
          appointment_date: form.appointment_date,
          start_time: form.start_time,
          end_time: form.end_time,
          color: form.color,
        })
        .select('*, client:clients(*)')
        .single();

      if (error) throw error;
      setAppointments((prev) => [...prev, data].sort((a, b) =>
        a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time)
      ));
      setShowForm(false);
      toast.success('Rendez-vous créé avec succès');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    try {
      const { error } = await getSupabaseClient().from('appointments').delete().eq('id', id);
      if (error) throw error;
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      setDetailAppt(null);
      toast.success('Rendez-vous supprimé');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la suppression');
    }
  };

  // Google Calendar functions
  const checkGoogleConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/google/sync');
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(data.connected);
        setGoogleInfo({
          email: data.email || undefined,
          name: data.name || undefined,
          picture: data.picture || undefined,
        });
      }
    } catch (e) {
      console.error('Failed to check Google connection:', e);
    }
  }, []);

  const connectGoogle = async () => {
    setGoogleLoading(true);
    try {
      const res = await fetch('/api/google/oauth');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Erreur lors de la connexion Google');
      }
    } catch (e: any) {
      toast.error('Erreur lors de la connexion Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const disconnectGoogle = async () => {
    if (!confirm('Déconnecter Google Calendar ? La synchronisation sera arrêtée.')) return;
    setGoogleLoading(true);
    try {
      const res = await fetch('/api/google/disconnect', { method: 'POST' });
      if (res.ok) {
        setGoogleConnected(false);
        setGoogleInfo(null);
        toast.success('Google Calendar déconnecté');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la déconnexion');
      }
    } catch (e: any) {
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setGoogleLoading(false);
    }
  };

  const syncToGoogle = async (appointmentId: string) => {
    try {
      const res = await fetch('/api/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.action === 'created' ? 'Synchronisé avec Google Calendar' : 'Mis à jour sur Google Calendar');
        // Refresh appointments to get google_event_id
        fetchAppointments();
      } else {
        toast.error(data.error || 'Erreur lors de la synchronisation');
      }
    } catch (e: any) {
      toast.error('Erreur lors de la synchronisation');
    }
  };

  // Check Google connection on mount and check URL params
  useEffect(() => {
    checkGoogleConnection();

    // Check for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'google_connected') {
      toast.success('Google Calendar connecté avec succès !');
      // Clear URL params
      window.history.replaceState({}, '', '/calendar');
      setTimeout(() => checkGoogleConnection(), 500);
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'google_auth_failed': 'La connexion Google a échoué',
        'missing_params': 'Paramètres manquants',
        'invalid_state': 'État de sécurité invalide',
        'token_exchange_failed': 'Erreur lors de l\'échange de token',
        'google_not_configured': 'Google Calendar n\'est pas configuré',
      };
      toast.error(errorMessages[error] || 'Erreur lors de la connexion Google');
      window.history.replaceState({}, '', '/calendar');
    }
  }, [checkGoogleConnection]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Animated background particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Premium Header with animated gradient */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary-dark to-purple-600 p-8 shadow-2xl shadow-primary/20">
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />

            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-3 mb-3"
                  >
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                      <CalendarIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        Agenda
                      </h1>
                      <p className="text-white/80 text-sm mt-1">Gérez vos rendez-vous et échéances</p>
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <button
                    onClick={() => openNewAppointment()}
                    className="group relative px-6 py-3 bg-white text-primary rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative flex items-center gap-2">
                      <CalendarPlus size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                      Nouveau RDV
                    </span>
                  </button>

                  {/* Google Calendar Button */}
                  {googleConnected ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={disconnectGoogle}
                      disabled={googleLoading}
                      className="group relative px-6 py-3 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-2xl font-bold hover:bg-white/20 transition-all duration-300 overflow-hidden"
                    >
                      {googleLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <ExternalLink size={18} className="group-hover:scale-110 transition-transform" />
                          Google Calendar
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={connectGoogle}
                      disabled={googleLoading}
                      className="group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
                    >
                      {googleLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Video size={18} className="group-hover:scale-110 transition-transform" />
                          Connecter Google
                        </>
                      )}
                    </motion.button>
                  )}

                  <Link
                    href="/invoices/new"
                    className="group relative px-6 py-3 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-2xl font-bold hover:bg-white/20 transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative flex items-center gap-2">
                      <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                      Facture
                    </span>
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid - Premium Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="lg:col-span-2"
          >
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl shadow-black/5 overflow-hidden">
              {/* Month Navigation */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/50">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={prevMonth}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 hover:from-primary/5 hover:to-primary/10 transition-all duration-300 group"
                >
                  <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors" />
                </motion.button>

                <div className="flex items-center gap-4">
                  <motion.div
                    key={`${currentYear}-${currentMonth}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{MONTHS[currentMonth]}</p>
                    <p className="text-xs text-gray-400 font-semibold tracking-widest uppercase">{currentYear}</p>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToToday}
                    className="px-4 py-2 text-xs font-bold bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors duration-300"
                  >
                    Aujourd'hui
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={nextMonth}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 hover:from-primary/5 hover:to-primary/10 transition-all duration-300 group"
                >
                  <ChevronRight size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors" />
                </motion.button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-gradient-to-b from-gray-50/50 to-transparent border-b border-gray-100/30">
                {DAYS.map((d, i) => (
                  <motion.div
                    key={d}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="py-4 text-center"
                  >
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{d}</span>
                  </motion.div>
                ))}
              </div>

              {/* Calendar Cells */}
              <div className="grid grid-cols-7 gap-1 p-4">
                {cells.map((day, i) => {
                  const dayInvoices = day ? (invoicesByDay[day] || []) : [];
                  const dayAppts = day ? (appointmentsByDay[day] || []) : [];
                  const isSelected = day === selectedDay;
                  const todayCell = day ? isToday(day) : false;
                  const pastCell = day ? isPast(day) : false;

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.01, duration: 0.3 }}
                      onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                      className={cn(
                        'relative min-h-[90px] p-2 rounded-2xl transition-all duration-300',
                        day ? 'cursor-pointer hover:shadow-lg hover:scale-105' : 'bg-transparent cursor-default',
                        day && !isSelected ? 'hover:bg-gradient-to-br hover:from-primary/5 hover:to-purple-500/5' : null,
                        isSelected ? 'bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-xl shadow-primary/20 ring-2 ring-primary/30' : null,
                      )}
                    >
                      {day && (
                        <>
                          <div className={cn(
                            'w-9 h-9 mx-auto rounded-xl flex items-center justify-center text-sm font-bold mb-1.5 transition-all duration-300',
                            todayCell ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30' :
                            isSelected ? 'bg-primary/20 text-primary' :
                            pastCell ? 'text-gray-300' : 'text-gray-700',
                          )}>
                            {day}
                          </div>

                          <div className="space-y-1">
                            {/* Appointments */}
                            {dayAppts.slice(0, 2).map((appt, idx) => {
                              const color = getColorConfig(appt.color);
                              return (
                                <motion.div
                                  key={appt.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  layoutId={`appt-${appt.id}`}
                                  onClick={(e) => { e.stopPropagation(); setDetailAppt(appt); }}
                                  className={cn(
                                    'text-[10px] font-semibold px-2 py-1 rounded-lg truncate leading-tight text-left cursor-pointer hover:scale-105 transition-transform',
                                    color.light,
                                  )}
                                >
                                  {appt.start_time.slice(0, 5)} {appt.title}
                                </motion.div>
                              );
                            })}

                            {/* Invoices */}
                            {dayInvoices.slice(0, 1).map((inv, idx) => (
                              <motion.div
                                key={inv.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + idx * 0.1 }}
                                className={cn(
                                  'text-[10px] font-semibold px-2 py-1 rounded-lg truncate leading-tight',
                                  getLabelColor(inv)
                                )}
                              >
                                {inv.client?.name || inv.client_name_override || inv.number}
                              </motion.div>
                            ))}

                            {/* More indicator */}
                            {((dayAppts.length + dayInvoices.length) > 3) && (
                              <div className="text-[10px] font-semibold text-gray-400 text-center px-2">
                                +{dayAppts.length + dayInvoices.length - 3}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 px-6 py-4 border-t border-gray-100/50 flex-wrap">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RDV</span>
                {APPOINTMENT_COLORS.slice(0, 5).map((c) => (
                  <div key={c.value} className="flex items-center gap-2 group cursor-pointer">
                    <span className={cn('w-3 h-3 rounded-full shadow-lg group-hover:scale-125 transition-transform', c.dot, c.shadow)} />
                    <span className="text-xs text-gray-500 font-medium">{c.label}</span>
                  </div>
                ))}
                <span className="w-px h-6 bg-gray-200 mx-2" />
                {[
                  { color: 'bg-amber-400 shadow-amber-400/20', label: 'En attente' },
                  { color: 'bg-red-400 shadow-red-400/20', label: 'En retard' },
                  { color: 'bg-green-400 shadow-green-400/20', label: 'Payée' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2 group cursor-pointer">
                    <span className={cn('w-3 h-3 rounded-full shadow-lg group-hover:scale-125 transition-transform', color)} />
                    <span className="text-xs text-gray-500 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Side Panel - Premium Stats & Details */}
          <div className="space-y-6">
            {/* Month Stats - Glassmorphism Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{MONTHS[currentMonth]}</p>
                  <p className="text-2xl font-black text-white mt-1">{currentYear}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl">
                  <CalendarIcon className="w-6 h-6 text-white/80" />
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Rendez-vous', value: appointments.length, color: 'from-blue-400 to-blue-600', icon: CalendarIcon },
                  { label: 'En attente', value: monthStats.pending, color: 'from-amber-400 to-amber-600', icon: Clock },
                  { label: 'En retard', value: monthStats.overdue, color: 'from-red-400 to-red-600', icon: AlertTriangle },
                  { label: 'Payées', value: monthStats.paid, color: 'from-green-400 to-green-600', icon: CheckCircle2 },
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2.5 bg-gradient-to-br rounded-xl', stat.color, 'shadow-lg opacity-80 group-hover:opacity-100 transition-opacity')}>
                        <stat.icon size={16} className="text-white" />
                      </div>
                      <span className="text-sm text-gray-300 font-medium">{stat.label}</span>
                    </div>
                    <span className={cn('text-xl font-bold bg-gradient-to-r', stat.color, 'bg-clip-text text-transparent')}>
                      {stat.value}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Selected Day Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-100/50">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900 dark:text-white text-base">
                    {selectedDay
                      ? `${selectedDay} ${MONTHS[currentMonth]}`
                      : 'Sélectionnez un jour'}
                  </p>
                  {selectedDay && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openNewAppointment(selectedDay)}
                      className="p-2 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors"
                    >
                      <Plus size={16} className="text-primary" />
                    </motion.button>
                  )}
                </div>
              </div>

              {!selectedDay ? (
                <div className="text-center py-12">
                  <CalendarIcon size={48} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-sm text-gray-400">Cliquez sur un jour pour voir les événements</p>
                </div>
              ) : (selectedAppts.length === 0 && selectedInvoices.length === 0) ? (
                <div className="text-center py-12">
                  <CalendarIcon size={48} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-sm text-gray-400 mb-4">Aucun événement ce jour</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openNewAppointment(selectedDay)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors"
                  >
                    <Plus size={14} /> Planifier un RDV
                  </motion.button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {selectedAppts.map((appt, idx) => {
                      const color = getColorConfig(appt.color);
                      return (
                        <motion.button
                          key={appt.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => setDetailAppt(appt)}
                          className="w-full text-left group"
                        >
                          <div className="flex items-center gap-4 px-5 py-4 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-300">
                            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shadow-lg', color.bg, color.shadow)}>
                              <Clock size={18} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{appt.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{appt.start_time.slice(0, 5)} - {appt.end_time.slice(0, 5)}</p>
                            </div>
                            {appt.client?.name && (
                              <span className="text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full">
                                {appt.client.name}
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                    {selectedInvoices.map((inv, idx) => {
                      const isOverdue = inv.status === 'overdue' ||
                        (inv.due_date && new Date(inv.due_date) < today && inv.status !== 'paid');
                      return (
                        <Link key={inv.id} href={`/invoices/${inv.id}`} className="block group">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (selectedAppts.length + idx) * 0.1 }}
                            className="flex items-center gap-4 px-5 py-4 hover:bg-gradient-to-r hover:from-amber-500/5 hover:to-transparent transition-all duration-300"
                          >
                            <div className={cn(
                              'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg',
                              inv.status === 'paid' ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/20' :
                              isOverdue ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/20' :
                              'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/20'
                            )}>
                              {inv.status === 'paid'
                                ? <CheckCircle2 size={18} className="text-white" />
                                : isOverdue
                                  ? <AlertTriangle size={18} className="text-white" />
                                  : <FileText size={18} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {inv.client?.name || inv.client_name_override || 'Sans client'}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">{inv.number}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inv.total)}</p>
                              <StatusBadge status={inv.status} />
                            </div>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Appointment Creation Modal - Premium Glassmorphism */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 dark:bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/20"
            >
              <div className="p-6 border-b border-gray-100/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-lg shadow-primary/30">
                      <CalendarPlus size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nouveau rendez-vous</h3>
                      <p className="text-sm text-gray-500">Planifiez votre événement</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowForm(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </motion.button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Titre *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Ex: RDV client, Réunion projet..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                {/* Date + Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Date *</label>
                    <input
                      type="date"
                      value={form.appointment_date}
                      onChange={(e) => setForm((f) => ({ ...f, appointment_date: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Début *</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Fin *</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Client */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Client</label>
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  >
                    <option value="">— Aucun —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Lieu</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Ex: Bureau, Adresse, En ligne..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Notes</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Détails du rendez-vous..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block">Couleur</label>
                  <div className="flex items-center gap-3">
                    {APPOINTMENT_COLORS.map((c) => (
                      <motion.button
                        key={c.value}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                        className={cn(
                          'w-10 h-10 rounded-xl transition-all duration-300 shadow-lg',
                          c.bg,
                          form.color === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100',
                          c.shadow
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100/50 flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                  className={cn(
                    'flex-1 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary transition-all duration-300 shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed',
                    saving && 'cursor-wait'
                  )}
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Création...
                    </span>
                  ) : 'Créer le RDV'}
                </motion.button>
              </div>
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDetailAppt(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 dark:bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border border-white/20"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl', getColorConfig(detailAppt.color).bg, getColorConfig(detailAppt.color).shadow)}>
                      <CalendarIcon size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{detailAppt.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(detailAppt.appointment_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setDetailAppt(null)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </motion.button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50/50 dark:bg-white/5 rounded-xl">
                    <Clock size={18} className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {detailAppt.start_time.slice(0, 5)} — {detailAppt.end_time.slice(0, 5)}
                    </span>
                  </div>

                  {detailAppt.location && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50/50 dark:bg-white/5 rounded-xl">
                      <MapPin size={18} className="text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{detailAppt.location}</span>
                    </div>
                  )}

                  {detailAppt.client && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50/50 dark:bg-white/5 rounded-xl">
                      <User size={18} className="text-gray-400" />
                      <div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{detailAppt.client.name}</span>
                        {detailAppt.client.email && <span className="text-gray-400 text-xs ml-2">({detailAppt.client.email})</span>}
                      </div>
                    </div>
                  )}

                  {detailAppt.description && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50/50 dark:bg-white/5 rounded-xl">
                      <StickyNote size={18} className="text-gray-400 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{detailAppt.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-gray-100/50 space-y-3">
                {googleConnected ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => syncToGoogle(detailAppt.id)}
                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/20"
                  >
                    <LinkIcon size={18} />
                    Synchroniser avec Google Calendar
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openGoogleCalendar(detailAppt)}
                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <ExternalLink size={18} />
                    Ouvrir dans Google Agenda
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => downloadICS(detailAppt, profile)}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                >
                  <CalendarPlus size={18} />
                  Télécharger fichier .ics
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDelete(detailAppt.id)}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={18} />
                  Supprimer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}
