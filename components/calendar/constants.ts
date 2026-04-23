import { Appointment } from '@/types';

// French day names (Monday-first week)
export const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// French month names
export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// Premium color palette for appointments with glassmorphism variants
export const APPOINTMENT_COLORS = [
  {
    value: 'blue',
    label: 'Bleu',
    bg: 'bg-blue-500',
    light: 'bg-blue-50/90 text-blue-700 border-blue-200/50 backdrop-blur-sm',
    dot: 'bg-blue-400',
    gradient: 'from-blue-400 to-blue-600',
    shadow: 'shadow-blue-500/20',
  },
  {
    value: 'green',
    label: 'Vert',
    bg: 'bg-green-500',
    light: 'bg-green-50/90 text-green-700 border-green-200/50 backdrop-blur-sm',
    dot: 'bg-green-400',
    gradient: 'from-green-400 to-green-600',
    shadow: 'shadow-green-500/20',
  },
  {
    value: 'purple',
    label: 'Violet',
    bg: 'bg-purple-500',
    light: 'bg-purple-50/90 text-purple-700 border-purple-200/50 backdrop-blur-sm',
    dot: 'bg-purple-400',
    gradient: 'from-purple-400 to-purple-600',
    shadow: 'shadow-purple-500/20',
  },
  {
    value: 'amber',
    label: 'Ambre',
    bg: 'bg-amber-500',
    light: 'bg-amber-50/90 text-amber-700 border-amber-200/50 backdrop-blur-sm',
    dot: 'bg-amber-400',
    gradient: 'from-amber-400 to-amber-600',
    shadow: 'shadow-amber-500/20',
  },
  {
    value: 'red',
    label: 'Rouge',
    bg: 'bg-red-500',
    light: 'bg-red-50/90 text-red-700 border-red-200/50 backdrop-blur-sm',
    dot: 'bg-red-400',
    gradient: 'from-red-400 to-red-600',
    shadow: 'shadow-red-500/20',
  },
  {
    value: 'pink',
    label: 'Rose',
    bg: 'bg-pink-500',
    light: 'bg-pink-50/90 text-pink-700 border-pink-200/50 backdrop-blur-sm',
    dot: 'bg-pink-400',
    gradient: 'from-pink-400 to-pink-600',
    shadow: 'shadow-pink-500/20',
  },
] as const;

export type AppointmentColor = typeof APPOINTMENT_COLORS[number]['value'];

// Get color configuration by value
export function getColorConfig(color: string) {
  return APPOINTMENT_COLORS.find(c => c.value === color) || APPOINTMENT_COLORS[0];
}

// Build calendar cells array for a given month/year
// Returns array where each element is day number or null (empty cell)
export function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Monday = 0
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = Array(totalCells).fill(null);
  for (let i = 0; i < daysInMonth; i++) {
    cells[startOffset + i] = i + 1;
  }
  return cells;
}

// Format date as ISO string (YYYY-MM-DD)
export function formatDateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Generate ICS file content for appointment export
export function generateICS(appointment: Appointment, profile: any): string {
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
  if (appointment.client?.name) {
    lines.push(`ATTENDEE;CN=${appointment.client.name}:mailto:${appointment.client.email || ''}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

// Download appointment as ICS file
export function downloadICS(appointment: Appointment, profile: any): void {
  const ics = generateICS(appointment, profile);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appointment.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Open Google Calendar event creation page (URL-based, no OAuth)
export function openGoogleCalendar(appointment: Appointment): void {
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

// Check if a date is today
export function isToday(year: number, month: number, day: number): boolean {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
  );
}

// Format full French date (e.g., "Lundi 15 Juin 2026")
export function formatFrenchDate(year: number, month: number, day: number): string {
  const date = new Date(year, month, day);
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const dayName = dayNames[date.getDay()];
  return `${dayName} ${day} ${MONTHS[month]} ${year}`;
}

// Glassmorphism design tokens for reuse
export const glassTokens = {
  card: 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg',
  cardElevated: 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-white/10 shadow-xl',
  input: 'bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/20 dark:border-white/10 focus:border-primary/40 focus:ring-2 focus:ring-primary/20',
  btnPrimary: 'bg-gradient-to-r from-primary to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300',
  btnSecondary: 'bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-white/30 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-300',
  btnGhost: 'text-gray-600 dark:text-gray-400 hover:bg-white/30 hover:text-gray-900 dark:hover:text-white transition-all',
} as const;
