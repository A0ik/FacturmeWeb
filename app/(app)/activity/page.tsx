'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useDataStore } from '@/stores/dataStore';
import { formatCurrency } from '@/lib/utils';
import Header from '@/components/layout/Header';
import {
  Activity, Clock, CheckCircle, Send, AlertTriangle, Plus,
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

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; label: string }> = {
  paid:     { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  label: 'Payée' },
  sent:     { icon: Send,          color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Envoyée' },
  overdue:  { icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50',    label: 'En retard' },
  draft:    { icon: Plus,          color: 'text-gray-600',   bg: 'bg-gray-100',  label: 'Créée' },
  accepted: { icon: CheckCircle,   color: 'text-purple-600', bg: 'bg-purple-50', label: 'Acceptée' },
  refused:  { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Refusée' },
};

const NOTIF_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; bg: string }> = {
  invoice_paid:     { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50' },
  invoice_overdue:  { icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50' },
  invoice_sent:     { icon: Send,          color: 'text-blue-600',   bg: 'bg-blue-50' },
  system:           { icon: Activity,      color: 'text-gray-600',   bg: 'bg-gray-100' },
  upgrade:          { icon: Activity,      color: 'text-amber-600',  bg: 'bg-amber-50' },
};

export default function ActivityPage() {
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markRead } = useWorkspaceStore();
  const { invoices } = useDataStore();

  useEffect(() => {
    if (user) fetchNotifications(user.id);
  }, [user]);

  // Build recent invoice actions sorted by updated_at/created_at
  const recentActions = [...invoices]
    .sort((a, b) => {
      const aDate = a.updated_at || a.created_at || '';
      const bDate = b.updated_at || b.created_at || '';
      return bDate.localeCompare(aDate);
    })
    .slice(0, 20);

  // Group invoice actions by date
  const actionGroups: { date: string; label: string; items: typeof recentActions }[] = [];
  recentActions.forEach((inv) => {
    const refDate = inv.updated_at || inv.created_at || '';
    const dateKey = refDate.slice(0, 10);
    let group = actionGroups.find((g) => g.date === dateKey);
    if (!group) {
      group = {
        date: dateKey,
        label: formatDateFull(refDate),
        items: [],
      };
      actionGroups.push(group);
    }
    group.items.push(inv);
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <Header
        title="Journal d'activité"
        back="/dashboard"
      />

      {/* Notifications feed */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50/60 flex items-center gap-2">
          <Activity size={14} className="text-primary" />
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Notifications récentes</p>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-10">
            <Activity size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-semibold">Aucune notification</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.slice(0, 15).map((n) => {
              const conf = NOTIF_CONFIG[n.type] ?? NOTIF_CONFIG.system;
              const Icon = conf.icon;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3.5 px-5 py-3.5 transition-colors cursor-pointer ${!n.read ? 'bg-primary/2 hover:bg-primary/4' : 'hover:bg-gray-50'}`}
                  onClick={() => { if (!n.read) markRead(n.id); }}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${conf.bg}`}>
                    <Icon size={14} className={conf.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold leading-snug ${!n.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                    </div>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.body}</p>}
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={9} />
                      {formatRelative(n.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dernières actions on invoices */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Clock size={14} className="text-gray-400" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dernières actions</p>
        </div>

        {actionGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-10">
            <Activity size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-semibold">Aucune activité</p>
            <p className="text-xs text-gray-300 mt-1">Créez votre première facture pour commencer</p>
          </div>
        ) : (
          actionGroups.map((group) => (
            <div key={group.date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/60">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{group.label}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {group.items.map((inv) => {
                  const conf = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;
                  const Icon = conf.icon;
                  const clientName = inv.client?.name || inv.client_name_override || 'Sans client';
                  const refDate = inv.updated_at || inv.created_at || '';
                  return (
                    <a
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${conf.bg}`}>
                        <Icon size={14} className={conf.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          Facture {inv.number}
                          {' '}
                          <span className={`text-xs font-bold ${conf.color}`}>{conf.label}</span>
                        </p>
                        <p className="text-xs text-gray-400 truncate">{clientName} · {formatCurrency(inv.total)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] text-gray-400">{formatRelative(refDate)}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
