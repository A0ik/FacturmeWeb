'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDataStore } from '@/stores/dataStore';
import { formatCurrency, cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Appointment } from '@/types';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Calendar, AlertTriangle,
  Clock, CheckCircle2, Plus, FileText, X, MapPin,
  Trash2, ExternalLink, CalendarPlus, User, StickyNote,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const APPOINTMENT_COLORS = [
  { value: 'blue', label: 'Bleu', bg: 'bg-blue-500', light: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  { value: 'green', label: 'Vert', bg: 'bg-green-500', light: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-400' },
  { value: 'purple', label: 'Violet', bg: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
  { value: 'amber', label: 'Ambre', bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  { value: 'red', label: 'Rouge', bg: 'bg-red-500', light: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-400' },
  { value: 'pink', label: 'Rose', bg: 'bg-pink-500', light: 'bg-pink-50 text-pink-700 border-pink-200', dot: 'bg-pink-400' },
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

// Generate .ics file content for an appointment
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

  const cells = useMemo(
    () => buildCalendarCells(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  // Fetch appointments
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

  // Map invoice due dates
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

  // Map appointments by day
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
    if (inv.status === 'paid') return 'bg-green-50 text-green-700';
    if (inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < today)) return 'bg-red-50 text-red-700';
    return 'bg-amber-50 text-amber-700';
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

  // Open form pre-filled for a specific day
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
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la création');
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
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rendez-vous, échéances et planification</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openNewAppointment()}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-all"
          >
            <CalendarPlus size={15} /> Rendez-vous
          </button>
          <Link
            href="/invoices/new"
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
          >
            <Plus size={15} /> Facture
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Calendar grid ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="font-black text-gray-900 text-lg">{MONTHS[currentMonth]}</p>
                <p className="text-xs text-gray-400">{currentYear}</p>
              </div>
              <button
                onClick={goToToday}
                className="text-xs font-bold text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 px-3 py-1 rounded-lg transition-colors"
              >
                Aujourd&apos;hui
              </button>
            </div>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-50">
            {DAYS.map((d) => (
              <div key={d} className="py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const dayInvoices = day ? (invoicesByDay[day] || []) : [];
              const dayAppts = day ? (appointmentsByDay[day] || []) : [];
              const isSelected = day === selectedDay;
              const todayCell = day ? isToday(day) : false;
              const pastCell = day ? isPast(day) : false;

              return (
                <div
                  key={i}
                  onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                  className={cn(
                    'min-h-[80px] p-1.5 border-b border-r border-gray-50 transition-colors',
                    day ? 'cursor-pointer' : 'bg-gray-50/40',
                    day && !isSelected ? 'hover:bg-gray-50' : '',
                    isSelected && 'bg-primary/5 border-primary/10',
                  )}
                >
                  {day && (
                    <>
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mb-1 transition-colors mx-auto',
                        todayCell ? 'bg-primary text-white shadow-sm shadow-primary/30' :
                        isSelected ? 'bg-primary/10 text-primary' :
                        pastCell ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100',
                      )}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {/* Appointments */}
                        {dayAppts.slice(0, 2).map((appt) => {
                          const color = getColorConfig(appt.color);
                          return (
                            <button
                              key={appt.id}
                              onClick={(e) => { e.stopPropagation(); setDetailAppt(appt); }}
                              className={cn(
                                'w-full text-[10px] font-semibold px-1 py-0.5 rounded truncate leading-tight text-left border',
                                color.light,
                              )}
                            >
                              {appt.start_time.slice(0, 5)} {appt.title}
                            </button>
                          );
                        })}
                        {/* Invoices */}
                        {dayInvoices.slice(0, 2).map((inv) => (
                          <div
                            key={inv.id}
                            className={cn(
                              'text-[10px] font-semibold px-1 py-0.5 rounded truncate leading-tight',
                              getLabelColor(inv)
                            )}
                          >
                            {inv.client?.name || inv.client_name_override || inv.number}
                          </div>
                        ))}
                        {((dayAppts.length + dayInvoices.length) > 2) && (
                          <div className="text-[10px] text-gray-400 font-semibold px-1">
                            +{dayAppts.length + dayInvoices.length - 2} autre{(dayAppts.length + dayInvoices.length - 2) > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-50 flex-wrap">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mr-1">RDV :</span>
            {APPOINTMENT_COLORS.slice(0, 4).map((c) => (
              <div key={c.value} className="flex items-center gap-1 text-xs text-gray-500">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', c.dot)} />
                {c.label}
              </div>
            ))}
            <span className="text-gray-200 mx-1">|</span>
            {[
              { color: 'bg-amber-400', label: 'En attente' },
              { color: 'bg-red-400', label: 'En retard' },
              { color: 'bg-green-400', label: 'Payée' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', color)} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Side panel ── */}
        <div className="space-y-4">
          {/* Month stats */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 text-white">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">
              {MONTHS[currentMonth]} {currentYear}
            </p>
            <div className="space-y-2">
              {[
                { label: 'Rendez-vous', value: appointments.length, color: 'text-blue-400' },
                { label: 'En attente', value: monthStats.pending, color: 'text-amber-400' },
                { label: 'En retard', value: monthStats.overdue, color: 'text-red-400' },
                { label: 'Payées', value: monthStats.paid, color: 'text-green-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className={cn('text-sm font-bold', color)}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected day panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm">
                {selectedDay
                  ? `${selectedDay} ${MONTHS[currentMonth]} ${currentYear}`
                  : 'Sélectionnez un jour'}
              </p>
              {selectedDay && (
                <button
                  onClick={() => openNewAppointment(selectedDay)}
                  className="text-xs font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> RDV
                </button>
              )}
            </div>

            {!selectedDay ? (
              <div className="text-center py-8">
                <Calendar size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Cliquez sur un jour du calendrier</p>
              </div>
            ) : (selectedAppts.length === 0 && selectedInvoices.length === 0) ? (
              <div className="text-center py-8">
                <Calendar size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400 mb-3">Aucun événement ce jour</p>
                <button
                  onClick={() => openNewAppointment(selectedDay)}
                  className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 mx-auto"
                >
                  <Plus size={12} /> Planifier un rendez-vous
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {/* Appointments for selected day */}
                {selectedAppts.map((appt) => {
                  const color = getColorConfig(appt.color);
                  return (
                    <button
                      key={appt.id}
                      onClick={() => setDetailAppt(appt)}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors w-full text-left group"
                    >
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', color.bg + '/10')}>
                        <Clock size={14} className={cn(color.bg.replace('bg-', 'text-'))} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{appt.title}</p>
                        <p className="text-xs text-gray-400">{appt.start_time.slice(0, 5)} - {appt.end_time.slice(0, 5)}</p>
                      </div>
                      {appt.client?.name && (
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
                          {appt.client.name}
                        </span>
                      )}
                    </button>
                  );
                })}
                {/* Invoices for selected day */}
                {selectedInvoices.map((inv) => {
                  const isOverdue = inv.status === 'overdue' ||
                    (inv.due_date && new Date(inv.due_date) < today && inv.status !== 'paid');
                  return (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                        inv.status === 'paid' ? 'bg-green-50' : isOverdue ? 'bg-red-50' : 'bg-amber-50'
                      )}>
                        {inv.status === 'paid'
                          ? <CheckCircle2 size={14} className="text-green-500" />
                          : isOverdue
                            ? <AlertTriangle size={14} className="text-red-500" />
                            : <FileText size={14} className="text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {inv.client?.name || inv.client_name_override || 'Sans client'}
                        </p>
                        <p className="text-xs text-gray-400">{inv.number}</p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                        <StatusBadge status={inv.status} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming invoices */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm">Prochaines échéances</p>
              <Link href="/invoices" className="text-xs text-primary font-semibold hover:underline">
                Voir tout
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Tout est à jour !</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcoming.map((inv) => {
                  const daysLeft = inv.due_date
                    ? Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86400000)
                    : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isUrgent = daysLeft !== null && daysLeft <= 3 && !isOverdue;
                  return (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black',
                        isOverdue ? 'bg-red-50 text-red-600' :
                        isUrgent ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                      )}>
                        {isOverdue ? `${Math.abs(daysLeft!)}j` : daysLeft === 0 ? '0j' : `J-${daysLeft}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {inv.client?.name || inv.client_name_override || 'Sans client'}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {inv.number} · {formatCurrency(inv.total)}
                        </p>
                      </div>
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        isOverdue ? 'bg-red-400' : isUrgent ? 'bg-amber-400' : 'bg-gray-300'
                      )} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick action */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Créer rapidement</p>
            <div className="space-y-2">
              <button
                onClick={() => openNewAppointment()}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary text-sm font-semibold transition-colors"
              >
                <CalendarPlus size={14} /> Nouveau rendez-vous
              </button>
              <Link
                href="/invoices/new?type=invoice"
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold transition-colors"
              >
                <FileText size={14} /> Nouvelle facture
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Appointment Creation Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Nouveau rendez-vous</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Titre *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: RDV client, Réunion projet..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Date *</label>
                  <input
                    type="date"
                    value={form.appointment_date}
                    onChange={(e) => setForm((f) => ({ ...f, appointment_date: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Début *</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Fin *</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Client */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Client</label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                >
                  <option value="">— Aucun —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Lieu</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Ex: Bureau, Adresse, En ligne..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Détails du rendez-vous..."
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Couleur</label>
                <div className="flex items-center gap-2">
                  {APPOINTMENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                      className={cn(
                        'w-7 h-7 rounded-full transition-all',
                        c.bg,
                        form.color === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Créer le RDV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Appointment Detail Modal ── */}
      {detailAppt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailAppt(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', getColorConfig(detailAppt.color).bg + '/10')}>
                    <Calendar size={20} className={getColorConfig(detailAppt.color).bg.replace('bg-', 'text-') + '-500'} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{detailAppt.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(detailAppt.appointment_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button onClick={() => setDetailAppt(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Clock size={14} className="text-gray-400 flex-shrink-0" />
                  {detailAppt.start_time.slice(0, 5)} — {detailAppt.end_time.slice(0, 5)}
                </div>

                {detailAppt.location && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                    {detailAppt.location}
                  </div>
                )}

                {detailAppt.client && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <User size={14} className="text-gray-400 flex-shrink-0" />
                    {detailAppt.client.name}
                    {detailAppt.client.email && <span className="text-gray-400 text-xs">({detailAppt.client.email})</span>}
                  </div>
                )}

                {detailAppt.description && (
                  <div className="flex items-start gap-2.5 text-sm text-gray-600">
                    <StickyNote size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="whitespace-pre-wrap">{detailAppt.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <button
                onClick={() => openGoogleCalendar(detailAppt)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <ExternalLink size={14} />
                Ajouter à Google Agenda
              </button>
              <button
                onClick={() => downloadICS(detailAppt, profile)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <CalendarPlus size={14} />
                Télécharger fichier .ics
              </button>
              <button
                onClick={() => handleDelete(detailAppt.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
