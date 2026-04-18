'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useDataStore } from '@/stores/dataStore';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/layout/Header';
import {
  Activity, Clock, CheckCircle, Send, AlertTriangle, Plus,
  Receipt, UserPlus, TrendingUp, Bell,
  FileText, Users, DollarSign,
} from 'lucide-react';

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "À l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function formatDateFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

type EventType = 'invoice' | 'expense' | 'client' | 'notification';

interface TimelineEvent {
  id: string;
  type: EventType;
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  amount?: number;
  date: string;
  href?: string;
}

const INVOICE_STATUS: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; label: string }> = {
  paid:     { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  label: 'payée' },
  sent:     { icon: Send,          color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'envoyée' },
  overdue:  { icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50',    label: 'en retard' },
  draft:    { icon: Plus,          color: 'text-gray-500',   bg: 'bg-gray-100',  label: 'créée' },
  accepted: { icon: CheckCircle,   color: 'text-purple-600', bg: 'bg-purple-50', label: 'acceptée' },
  refused:  { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'refusée' },
};

const NOTIF_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; bg: string }> = {
  invoice_paid:    { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50' },
  invoice_overdue: { icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50' },
  invoice_sent:    { icon: Send,          color: 'text-blue-600',   bg: 'bg-blue-50' },
  system:          { icon: Activity,      color: 'text-gray-600',   bg: 'bg-gray-100' },
  upgrade:         { icon: TrendingUp,    color: 'text-amber-600',  bg: 'bg-amber-50' },
};

type TabId = 'all' | 'invoices' | 'expenses' | 'clients' | 'notifications';

export default function ActivityPage() {
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markRead } = useWorkspaceStore();
  const { invoices, clients } = useDataStore();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('all');

  useEffect(() => {
    if (!user) return;
    fetchNotifications(user.id);
    getSupabaseClient()
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setExpenses(data || []));
  }, [user]);

  // Build unified timeline
  const allEvents = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Invoice events
    invoices.slice(0, 30).forEach((inv) => {
      const conf = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.draft;
      const clientName = inv.client?.name || inv.client_name_override || 'Sans client';
      events.push({
        id: `inv-${inv.id}`,
        type: 'invoice',
        icon: conf.icon,
        iconColor: conf.color,
        iconBg: conf.bg,
        title: `Facture ${inv.number} ${conf.label}`,
        subtitle: `${clientName} · ${formatCurrency(inv.total)}`,
        amount: inv.total,
        date: inv.updated_at || inv.created_at || '',
        href: `/invoices/${inv.id}`,
      });
    });

    // Expense events
    expenses.slice(0, 15).forEach((exp) => {
      events.push({
        id: `exp-${exp.id}`,
        type: 'expense',
        icon: Receipt,
        iconColor: 'text-orange-600',
        iconBg: 'bg-orange-50',
        title: `Dépense ajoutée — ${exp.vendor}`,
        subtitle: `${exp.category} · ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(exp.amount)}`,
        amount: exp.amount,
        date: exp.created_at || exp.date,
        href: '/expenses',
      });
    });

    // Client events
    clients.slice(0, 10).forEach((client) => {
      events.push({
        id: `cli-${client.id}`,
        type: 'client',
        icon: UserPlus,
        iconColor: 'text-violet-600',
        iconBg: 'bg-violet-50',
        title: `Client ajouté — ${client.name}`,
        subtitle: client.email || client.city || 'Nouveau client',
        date: (client as any).created_at || '',
        href: `/clients/${client.id}`,
      });
    });

    // Notification events
    notifications.slice(0, 10).forEach((n) => {
      const conf = NOTIF_CONFIG[n.type] ?? NOTIF_CONFIG.system;
      events.push({
        id: `notif-${n.id}`,
        type: 'notification',
        icon: conf.icon,
        iconColor: conf.color,
        iconBg: conf.bg,
        title: n.title,
        subtitle: n.body || '',
        date: n.created_at,
      });
    });

    return events
      .filter((e) => e.date)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, expenses, clients, notifications]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return allEvents;
    const map: Record<TabId, EventType[]> = {
      all: [],
      invoices: ['invoice'],
      expenses: ['expense'],
      clients: ['client'],
      notifications: ['notification'],
    };
    return allEvents.filter((e) => map[activeTab].includes(e.type));
  }, [allEvents, activeTab]);

  // Group by date
  const groups = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {};
    filtered.forEach((ev) => {
      const key = ev.date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Summary stats
  const stats = useMemo(() => ({
    invoicesPaid: invoices.filter((i) => i.status === 'paid').length,
    totalRevenue: invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0),
    expensesCount: expenses.length,
    unreadNotifs: notifications.filter((n) => !n.read).length,
  }), [invoices, expenses, notifications]);

  const TABS: { id: TabId; label: string; icon: React.ComponentType<any>; count: number }[] = [
    { id: 'all', label: 'Tout', icon: Activity, count: allEvents.length },
    { id: 'invoices', label: 'Factures', icon: FileText, count: allEvents.filter((e) => e.type === 'invoice').length },
    { id: 'expenses', label: 'Dépenses', icon: Receipt, count: allEvents.filter((e) => e.type === 'expense').length },
    { id: 'clients', label: 'Clients', icon: Users, count: allEvents.filter((e) => e.type === 'client').length },
    { id: 'notifications', label: 'Notifs', icon: Bell, count: stats.unreadNotifs },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <Header title="Journal d'activité" back="/dashboard" />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Factures payées', value: stats.invoicesPaid, icon: CheckCircle, color: 'text-green-500 bg-green-50' },
          { label: 'CA encaissé', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-primary bg-primary/10' },
          { label: 'Dépenses', value: stats.expensesCount, icon: Receipt, color: 'text-orange-500 bg-orange-50' },
          { label: 'Non lues', value: stats.unreadNotifs, icon: Bell, color: 'text-amber-500 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${color.split(' ')[1]}`}>
                <Icon size={13} className={color.split(' ')[0]} />
              </div>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="text-xl font-black text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === id
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <Icon size={12} />
            {label}
            {count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-14">
          <Activity size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">Aucune activité</p>
          <p className="text-xs text-gray-400 mt-1">Les actions apparaîtront ici au fil du temps</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([dateKey, events]) => (
            <div key={dateKey}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                  {formatDateFull(dateKey)}
                </span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              {/* Events for this date */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {events.map((ev, idx) => {
                    const Icon = ev.icon;
                    const isNotif = ev.type === 'notification';
                    const notif = isNotif
                      ? notifications.find((n) => ev.id === `notif-${n.id}`)
                      : null;

                    return (
                      <div
                        key={ev.id}
                        className={`flex items-start gap-3.5 px-5 py-3.5 transition-colors ${
                          isNotif && notif && !notif.read
                            ? 'bg-primary/2 hover:bg-primary/4 cursor-pointer'
                            : ev.href ? 'hover:bg-gray-50 cursor-pointer' : ''
                        }`}
                        onClick={() => {
                          if (isNotif && notif && !notif.read) markRead(notif.id);
                          if (ev.href) window.location.href = ev.href;
                        }}
                      >
                        {/* Timeline dot + icon */}
                        <div className="relative flex flex-col items-center flex-shrink-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ev.iconBg}`}>
                            <Icon size={14} className={ev.iconColor} />
                          </div>
                          {idx < events.length - 1 && (
                            <div className="w-px flex-1 bg-gray-100 mt-1 min-h-[12px]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{ev.title}</p>
                            {isNotif && notif && !notif.read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          {ev.subtitle && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{ev.subtitle}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                            <Clock size={9} />
                            {formatRelative(ev.date)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
