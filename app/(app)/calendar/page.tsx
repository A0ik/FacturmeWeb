'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { getSupabaseClient } from '@/lib/supabase';
import { Appointment, Invoice } from '@/types';

// Calendar sub-components
import {
  MagnificentCalendarHeader,
  MagnificentCalendarGrid,
  MagnificentDayDetailPanel,
  AppointmentModal,
  AppointmentDetailModal,
  AppointmentFormData,
  buildCalendarCells,
} from '@/components/calendar';

// Google Calendar hook
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

// Get today's date for initialization
const today = new Date();

export default function CalendarPage() {
  const { invoices, clients, fetchClients } = useDataStore();
  const { profile } = useAuthStore();

  // Google Calendar integration
  const { connected: googleConnected, syncAppointment } = useGoogleCalendar();

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  // Data state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Build calendar cells
  const cells = useMemo(() => buildCalendarCells(currentYear, currentMonth), [currentYear, currentMonth]);

  // Group appointments by day
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

  // Group invoices by day (only actionable: sent or overdue)
  const invoicesByDay = useMemo(() => {
    const map: Record<number, Invoice[]> = {};
    invoices
      .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
      .forEach((inv) => {
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

  // Get appointments and invoices for selected day
  const dayAppointments = selectedDay !== null ? (appointmentsByDay[selectedDay] || []) : [];
  const dayInvoices = selectedDay !== null ? (invoicesByDay[selectedDay] || []) : [];

  // Fetch appointments for current month
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
      const { error } = await supabase.from('appointments').select('id').limit(1);

      if (error && error.code === '42P01') {
        setAppointments([]);
        setLoadingAppts(false);
        return;
      }

      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(currentYear, currentMonth + 1, 1).toISOString().split('T')[0];

      const { data } = await supabase
        .from('appointments')
        .select('*, client:clients(*)')
        .gte('appointment_date', startDate)
        .lt('appointment_date', endDate)
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

  // Fetch clients on mount
  useEffect(() => {
    if (clients.length === 0) fetchClients();
  }, [clients.length, fetchClients]);

  // Fetch appointments when month changes
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Navigation handlers
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDay(now.getDate());
  };

  const openCreateModal = () => {
    setEditingAppointment(null);
    setShowCreateModal(true);
  };

  const openEditModal = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setShowEditModal(true);
    setShowDetailModal(false);
  };

  // Save appointment (create or update)
  const handleSaveAppointment = async (data: AppointmentFormData) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('No supabase client');

    if (editingAppointment) {
      // Update existing
      const { error } = await supabase
        .from('appointments')
        .update({
          title: data.title,
          description: data.description,
          location: data.location,
          client_id: data.client_id || null,
          appointment_date: data.appointment_date,
          start_time: data.start_time,
          end_time: data.end_time,
          color: data.color,
        })
        .eq('id', editingAppointment.id);

      if (error) throw error;

      toast.success('Rendez-vous modifié');

      // Sync with Google if connected and has google_event_id
      if (googleConnected && editingAppointment.google_event_id && data.sync_with_google) {
        await syncAppointment(editingAppointment.id);
      }
    } else {
      // Create new
      const { data: newAppt, error } = await supabase
        .from('appointments')
        .insert({
          user_id: profile?.id,
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          client_id: data.client_id || null,
          appointment_date: data.appointment_date,
          start_time: data.start_time,
          end_time: data.end_time,
          color: data.color,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Rendez-vous créé');

      // Sync with Google if connected and toggle enabled
      if (googleConnected && data.sync_with_google && newAppt) {
        await syncAppointment(newAppt.id);
      }
    }

    await fetchAppointments();
    setShowCreateModal(false);
    setShowEditModal(false);
  };

  // Delete appointment
  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;

    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('No supabase client');

    const { error } = await supabase.from('appointments').delete().eq('id', selectedAppointment.id);

    if (error) throw error;

    toast.success('Rendez-vous supprimé');
    setShowDetailModal(false);
    setSelectedAppointment(null);
    await fetchAppointments();
  };

  // Get selected date as ISO string for modal
  const getSelectedDateISO = () => {
    if (selectedDay === null) return new Date().toISOString().split('T')[0];
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-screen">
      {/* Animated background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-primary/15 via-purple-500/15 to-pink-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-blue-500/15 via-cyan-500/15 to-teal-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '700ms' }} />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1400ms' }} />
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-4 lg:p-6">
        {/* Left column: Header + Calendar Grid */}
        <div className="flex-1 flex flex-col gap-4">
          <MagnificentCalendarHeader
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onGoToday={goToToday}
            onNewAppointment={openCreateModal}
          />

          <MagnificentCalendarGrid
            cells={cells}
            currentYear={currentYear}
            currentMonth={currentMonth}
            selectedDay={selectedDay}
            appointmentsByDay={appointmentsByDay}
            invoicesByDay={invoicesByDay}
            onSelectDay={setSelectedDay}
          />
        </div>

        {/* Right column: Day Detail Panel */}
        <MagnificentDayDetailPanel
          selectedDay={selectedDay}
          currentMonth={currentMonth}
          currentYear={currentYear}
          appointments={dayAppointments}
          invoices={dayInvoices}
          onAppointmentClick={(apt: Appointment) => {
            setSelectedAppointment(apt);
            setShowDetailModal(true);
          }}
          onNewAppointment={openCreateModal}
        />
      </div>

      {/* Modals */}
      {/* Create modal */}
      <AppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveAppointment}
        clients={clients}
        selectedDate={getSelectedDateISO()}
        googleConnected={googleConnected}
      />

      {/* Edit modal */}
      <AppointmentModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAppointment(null);
        }}
        onSave={handleSaveAppointment}
        editingAppointment={editingAppointment}
        clients={clients}
        googleConnected={googleConnected}
      />

      {/* Detail modal */}
      <AppointmentDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onEdit={() => selectedAppointment && openEditModal(selectedAppointment)}
        onDelete={handleDeleteAppointment}
        onGoogleSync={syncAppointment}
        googleConnected={googleConnected}
        profile={profile}
      />
    </div>
  );
}
