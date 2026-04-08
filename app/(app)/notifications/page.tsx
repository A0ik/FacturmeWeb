'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore, type Notification } from '@/stores/workspaceStore';
import { useDataStore } from '@/stores/dataStore';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Bell, CheckCheck, FileText, AlertTriangle, Users,
  Info, Zap, Check, ChevronRight, Clock, BellRing,
} from 'lucide-react';
import Link from 'next/link';

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; label: string }> = {
  invoice_paid:    { icon: Check,          color: 'text-green-600',  bg: 'bg-green-50',  label: 'Paiement reçu' },
  invoice_overdue: { icon: AlertTriangle,  color: 'text-red-600',    bg: 'bg-red-50',    label: 'Facture en retard' },
  invoice_sent:    { icon: FileText,       color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Facture envoyée' },
  workspace_invite:{ icon: Users,          color: 'text-purple-600', bg: 'bg-purple-50', label: 'Invitation' },
  system:          { icon: Info,           color: 'text-gray-600',   bg: 'bg-gray-100',  label: 'Système' },
  upgrade:         { icon: Zap,            color: 'text-amber-600',  bg: 'bg-amber-50',  label: 'Offre' },
};

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'À l\'instant';
  const m = Math.floor(s / 60);
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function NotifItem({ notif, onRead }: { notif: Notification; onRead: (id: string) => void }) {
  const conf = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
  const Icon = conf.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-4 px-5 py-4 border-b border-gray-50 last:border-0 transition-colors cursor-pointer group',
        !notif.read ? 'bg-primary/2 hover:bg-primary/4' : 'hover:bg-gray-50',
      )}
      onClick={() => { if (!notif.read) onRead(notif.id); }}
    >
      {/* Icon */}
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', conf.bg)}>
        <Icon size={16} className={conf.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-semibold leading-snug', !notif.read ? 'text-gray-900' : 'text-gray-700')}>
            {notif.title}
          </p>
          {!notif.read && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
          )}
        </div>
        {notif.body && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Clock size={9} />
            {formatRelative(notif.created_at)}
          </span>
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', conf.bg, conf.color)}>
            {conf.label}
          </span>
        </div>
      </div>

      {/* Link arrow */}
      {notif.link && (
        <Link
          href={notif.link}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-primary transition-all mt-0.5"
        >
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

type PushStatus = 'unknown' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'subscribing';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const { invoices } = useDataStore();
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead, createNotification } = useWorkspaceStore();

  const [pushStatus, setPushStatus] = useState<PushStatus>('unknown');
  const [pushError, setPushError] = useState('');

  useEffect(() => {
    if (user) {
      fetchNotifications(user.id);
      generateInvoiceNotifications();
    }
    checkPushStatus();
  }, [user]);

  const checkPushStatus = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported');
      return;
    }
    const permission = Notification.permission;
    if (permission === 'denied') { setPushStatus('denied'); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      setPushStatus(existing ? 'subscribed' : 'unsubscribed');
    } catch {
      setPushStatus('unsubscribed');
    }
  };

  const handleSubscribePush = async () => {
    setPushStatus('subscribing');
    setPushError('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('denied');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error('Clé VAPID non configurée');

      // Convert base64 VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
      };

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      setPushStatus('subscribed');
    } catch (e: any) {
      setPushError(e.message);
      setPushStatus('unsubscribed');
    }
  };

  const generateInvoiceNotifications = async () => {
    if (!user) return;
    const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
    for (const inv of overdueInvoices.slice(0, 3)) {
      // Only create if not already notified (basic check)
      const alreadyNotified = notifications.some(
        (n) => n.type === 'invoice_overdue' && (n.data as any)?.invoice_id === inv.id,
      );
      if (!alreadyNotified) {
        await createNotification(
          user.id,
          'invoice_overdue',
          `Facture en retard — ${inv.client?.name || inv.client_name_override || 'Client inconnu'}`,
          `La facture ${inv.number} de ${formatCurrency(inv.total)} est en retard de paiement.`,
          `/invoices/${inv.id}`,
        );
      }
    }
  };

  const today = notifications.filter((n) => {
    const d = new Date(n.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const older = notifications.filter((n) => {
    const d = new Date(n.created_at);
    const now = new Date();
    return d.toDateString() !== now.toDateString();
  });

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Push notification banner */}
      {pushStatus !== 'unknown' && pushStatus !== 'unsupported' && (
        <div className={cn(
          'rounded-2xl p-4 flex items-start gap-3 border',
          pushStatus === 'subscribed'
            ? 'bg-green-50 border-green-200'
            : pushStatus === 'denied'
            ? 'bg-red-50 border-red-200'
            : pushStatus === 'subscribing'
            ? 'bg-blue-50 border-blue-200'
            : 'bg-primary/5 border-primary/15'
        )}>
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
            pushStatus === 'subscribed' ? 'bg-green-100' : pushStatus === 'denied' ? 'bg-red-100' : 'bg-primary/15'
          )}>
            <BellRing size={16} className={
              pushStatus === 'subscribed' ? 'text-green-600' : pushStatus === 'denied' ? 'text-red-600' : 'text-primary'
            } />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Notifications push</p>
            {pushStatus === 'subscribed' && (
              <p className="text-xs text-green-700 mt-0.5 font-semibold">Notifications activées ✓</p>
            )}
            {pushStatus === 'denied' && (
              <p className="text-xs text-red-600 mt-0.5">
                L'accès aux notifications a été refusé. Modifiez les permissions dans les réglages de votre navigateur.
              </p>
            )}
            {pushStatus === 'unsubscribed' && (
              <>
                <p className="text-xs text-gray-500 mt-0.5">
                  Activez les notifications push pour recevoir des alertes en temps réel sur vos factures.
                </p>
                {pushError && <p className="text-xs text-red-500 mt-1">{pushError}</p>}
              </>
            )}
            {pushStatus === 'subscribing' && (
              <p className="text-xs text-blue-700 mt-0.5">Activation en cours...</p>
            )}
          </div>
          {pushStatus === 'unsubscribed' && (
            <button
              onClick={handleSubscribePush}
              className="flex-shrink-0 text-xs font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary hover:text-white transition-all"
            >
              Activer
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount !== 1 ? 's' : ''}`
              : 'Tout est à jour'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark transition-colors border border-primary/20 px-3 py-1.5 rounded-xl hover:bg-primary/5"
          >
            <CheckCheck size={14} />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
            <Bell size={28} className="text-gray-200" />
          </div>
          <p className="font-bold text-gray-400 text-sm">Aucune notification</p>
          <p className="text-xs text-gray-300 mt-1">Vous recevrez des alertes sur vos factures et l'activité du workspace</p>
        </div>
      ) : (
        <div className="space-y-3">
          {today.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/60">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Aujourd'hui</p>
              </div>
              {today.map((n) => (
                <NotifItem key={n.id} notif={n} onRead={markRead} />
              ))}
            </div>
          )}

          {older.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/60">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Plus ancien</p>
              </div>
              {older.map((n) => (
                <NotifItem key={n.id} notif={n} onRead={markRead} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      {pushStatus === 'unsupported' && (
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Notifications push non disponibles</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Votre navigateur ne supporte pas les notifications push. Utilisez Chrome, Firefox ou Edge pour cette fonctionnalité.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
