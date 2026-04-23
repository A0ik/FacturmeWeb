// Calendar sub-components barrel export

export { GoogleConnectButton } from './GoogleConnectButton';
export { CalendarHeader } from './CalendarHeader';
export { CalendarDayCell } from './CalendarDayCell';
export { CalendarGrid } from './CalendarGrid';
export { AppointmentCard } from './AppointmentCard';
export { InvoiceCard } from './InvoiceCard';
export { DayDetailPanel } from './DayDetailPanel';
export { AppointmentModal } from './AppointmentModal';
export { AppointmentDetailModal } from './AppointmentDetailModal';
export type { AppointmentFormData } from './AppointmentModal';

// Re-export constants
export {
  DAYS,
  MONTHS,
  APPOINTMENT_COLORS,
  getColorConfig,
  buildCalendarCells,
  formatDateISO,
  generateICS,
  downloadICS,
  openGoogleCalendar,
  isToday,
  formatFrenchDate,
  glassTokens,
} from './constants';
export type { AppointmentColor } from './constants';
