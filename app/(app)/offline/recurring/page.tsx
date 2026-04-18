'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import Button from '@/components/ui/Button';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { Plus, RefreshCw, Trash2, Zap } from 'lucide-react';

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Hebdomadaire', monthly: 'Mensuel', quarterly: 'Trimestriel', yearly: 'Annuel',
};

export default function RecurringPage() {
  const { recurringInvoices, fetchRecurringInvoices, deleteRecurringInvoice } = useDataStore();
  const { user } = useAuthStore();
  const sub = useSubscription();

  useEffect(() => { if (user) fetchRecurringInvoices(); }, [user]);

  if (!sub.canUseRecurring) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-gray-900">Factures récurrentes</h1>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={28} className="text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fonctionnalité Solo & Pro</h2>
          <p className="text-gray-500 mb-4">Les factures récurrentes automatiques sont disponibles avec un abonnement payant.</p>
          <Link href="/paywall">
            <Button>Voir les abonnements</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Récurrentes</h1>
        <Link href="/recurring/new"><Button icon={<Plus size={16} />}>Nouvelle</Button></Link>
      </div>

      {recurringInvoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-14">
          <RefreshCw size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-400">Aucune facture récurrente</p>
          <Link href="/recurring/new" className="mt-3 inline-flex items-center gap-1 text-primary text-sm font-semibold hover:underline">
            <Plus size={14} />Créer ma première récurrente
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recurringInvoices.map((rec) => (
            <div key={rec.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <RefreshCw size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{rec.client?.name || rec.client_name_override || 'Sans client'}</p>
                    <p className="text-sm text-gray-500">{FREQ_LABELS[rec.frequency] || rec.frequency} · {formatCurrency(rec.items?.reduce((s, i) => s + i.quantity * i.unit_price * (1 + i.vat_rate / 100), 0) || 0)}</p>
                  </div>
                </div>
                <button onClick={() => deleteRecurringInvoice(rec.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
              {rec.next_run_date && (
                <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-xs text-gray-400">Prochaine génération :</span>
                  <span className="text-xs font-bold text-gray-700">{formatDateShort(rec.next_run_date)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
