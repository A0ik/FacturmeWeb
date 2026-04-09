'use client';

import { useState, useMemo } from 'react';
import { useDataStore } from '@/stores/dataStore';
import { formatCurrency, cn } from '@/lib/utils';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Calendar, AlertTriangle,
  Clock, CheckCircle2, Plus, FileText,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function buildCalendarCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon-start
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = Array(totalCells).fill(null);
  for (let i = 0; i < daysInMonth; i++) cells[startOffset + i] = i + 1;
  return cells;
}

export default function CalendarPage() {
  const { invoices } = useDataStore();
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const cells = useMemo(
    () => buildCalendarCells(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

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

  // Map invoice due dates to calendar day numbers
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

  const selectedInvoices = selectedDay ? (invoicesByDay[selectedDay] || []) : [];

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const isPast = (day: number) =>
    new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const getDotColor = (inv: (typeof invoices)[0]) => {
    if (inv.status === 'paid') return 'bg-green-400';
    if (inv.status === 'overdue') return 'bg-red-400';
    if (inv.due_date && new Date(inv.due_date) < today) return 'bg-red-400';
    return 'bg-amber-400';
  };

  const getLabelColor = (inv: (typeof invoices)[0]) => {
    if (inv.status === 'paid') return 'bg-green-50 text-green-700';
    if (inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < today)) return 'bg-red-50 text-red-700';
    return 'bg-amber-50 text-amber-700';
  };

  // Upcoming invoices (not paid, with due date, sorted)
  const upcoming = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status !== 'paid' && inv.due_date)
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
        .slice(0, 7),
    [invoices]
  );

  // This-month stats
  const thisMonthInvoices = Object.values(invoicesByDay).flat();
  const monthStats = {
    pending: thisMonthInvoices.filter((i) => i.status !== 'paid' && i.status !== 'overdue').length,
    overdue: thisMonthInvoices.filter((i) => i.status === 'overdue' || (i.due_date && new Date(i.due_date) < today && i.status !== 'paid')).length,
    paid: thisMonthInvoices.filter((i) => i.status === 'paid').length,
    total: thisMonthInvoices.reduce((s, i) => s + i.total, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visualisez vos échéances et dates importantes</p>
        </div>
        <Link
          href="/invoices/new"
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
        >
          <Plus size={15} /> Nouvelle facture
        </Link>
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
              const isSelected = day === selectedDay;
              const todayCell = day ? isToday(day) : false;
              const pastCell = day ? isPast(day) : false;

              return (
                <div
                  key={i}
                  onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                  className={cn(
                    'min-h-[72px] p-1.5 border-b border-r border-gray-50 transition-colors',
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
                        {dayInvoices.length > 2 && (
                          <div className="text-[10px] text-gray-400 font-semibold px-1">
                            +{dayInvoices.length - 2} autre{dayInvoices.length - 2 > 1 ? 's' : ''}
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
          <div className="flex items-center gap-5 px-5 py-3 border-t border-gray-50">
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
                { label: 'En attente', value: monthStats.pending, color: 'text-amber-400' },
                { label: 'En retard', value: monthStats.overdue, color: 'text-red-400' },
                { label: 'Payées', value: monthStats.paid, color: 'text-green-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className={cn('text-sm font-bold', color)}>{value}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Total à recevoir</span>
                  <span className="text-sm font-bold text-white">
                    {formatCurrency(thisMonthInvoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.total, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Selected day panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="font-bold text-gray-900 text-sm">
                {selectedDay
                  ? `${selectedDay} ${MONTHS[currentMonth]} ${currentYear}`
                  : 'Sélectionnez un jour'}
              </p>
              {selectedDay && selectedInvoices.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedInvoices.length} échéance{selectedInvoices.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {!selectedDay || selectedInvoices.length === 0 ? (
              <div className="text-center py-8">
                <Calendar size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {selectedDay ? 'Aucune échéance ce jour' : 'Cliquez sur un jour du calendrier'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
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
                            : <Clock size={14} className="text-amber-500" />}
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
              <Link
                href="/invoices/new?type=invoice"
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary text-sm font-semibold transition-colors"
              >
                <FileText size={14} /> Nouvelle facture
              </Link>
              <Link
                href="/invoices/new?type=quote"
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-semibold transition-colors"
              >
                <FileText size={14} /> Nouveau devis
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
