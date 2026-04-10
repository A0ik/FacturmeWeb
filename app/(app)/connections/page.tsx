'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getSupabaseClient } from '@/lib/supabase';
import { MerchantConnection, MERCHANT_PROVIDERS, MerchantProvider } from '@/types';
import {
  Plus, Link2, RefreshCw, Trash2, CheckCircle2, AlertTriangle,
  Settings, Download, ChevronDown, Building, ExternalLink as ExternalLinkIcon
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type ConnectionStatus = 'active' | 'suspended' | 'error' | 'revoked';

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string; dot: string }> = {
  active:     { label: 'Actif',     color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  suspended:  { label: 'Suspendu',  color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  error:      { label: 'Erreur',    color: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  revoked:    { label: 'Révoqué',   color: 'bg-gray-100 text-gray-700',   dot: 'bg-gray-500' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const { user } = useAuthStore();
  const [connections, setConnections] = useState<MerchantConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await getSupabaseClient()
        .from('merchant_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setConnections(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    try {
      const res = await fetch(`/api/merchant/sync?id=${id}`, { method: 'POST' });
      if (res.ok) {
        await fetchConnections();
      }
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette connexion ?')) return;
    await getSupabaseClient().from('merchant_connections').delete().eq('id', id);
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleAutoImport = async (conn: MerchantConnection) => {
    await getSupabaseClient().from('merchant_connections').update({
      auto_import: !conn.auto_import
    }).eq('id', conn.id);
    setConnections(prev => prev.map(c =>
      c.id === conn.id ? { ...c, auto_import: !conn.auto_import } : c
    ));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Connexions Marchands</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Connectez vos comptes Amazon, Orange, Uber pour importer automatiquement vos factures
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
        >
          <Plus size={13} /> Ajouter une connexion
        </button>
      </div>

      {/* Connections List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : connections.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Link2 size={28} className="text-gray-300" />
          </div>
          <p className="text-sm font-bold text-gray-500">Aucune connexion</p>
          <p className="text-xs text-gray-400 mt-1">
            Connectez vos comptes marchands pour importer vos factures automatiquement
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map(conn => {
            const provider = MERCHANT_PROVIDERS[conn.provider as MerchantProvider] || MERCHANT_PROVIDERS.other;
            const status = STATUS_CONFIG[conn.status as ConnectionStatus] || STATUS_CONFIG.active;

            return (
              <div key={conn.id} className="rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg', provider.color)}>
                      {provider.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{provider.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {conn.provider_account_id || 'Compte connecté'}
                      </p>
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', status.color)}>
                    <span className={cn('w-1 h-1 rounded-full', status.dot)} />
                    {status.label}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4">
                  {conn.last_sync_at && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-400">Dernière synchro</span>
                      <span className="text-gray-600">
                        {new Date(conn.last_sync_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                  {conn.auto_import && (
                    <div className="flex items-center gap-1 text-[10px] text-green-600">
                      <CheckCircle2 size={10} />
                      Import automatique activé
                    </div>
                  )}
                  {conn.sync_error && (
                    <div className="flex items-start gap-1 text-[10px] text-red-600">
                      <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{conn.sync_error}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleSync(conn.id)}
                    disabled={syncing === conn.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-gray-100 text-gray-700 text-[10px] font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {syncing === conn.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        Synchro...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={11} />
                        Synchroniser
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleAutoImport(conn)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-bold transition-colors',
                      conn.auto_import
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {conn.auto_import ? (
                      <>
                        <CheckCircle2 size={11} />
                        Auto ON
                      </>
                    ) : (
                      <>
                        <Settings size={11} />
                        Auto
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(conn.id)}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowAddModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Ajouter une connexion</p>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {Object.entries(MERCHANT_PROVIDERS).map(([key, provider]) => (
                  <button
                    key={key}
                    onClick={() => handleConnect(key as MerchantProvider)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-primary/50 hover:bg-gray-50 transition-all group"
                  >
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110', provider.color)}>
                      {provider.icon}
                    </div>
                    <p className="text-xs font-semibold text-gray-700">{provider.name}</p>
                    <ExternalLinkIcon size={10} className="text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  function handleConnect(provider: MerchantProvider) {
    // This would redirect to OAuth flow for the provider
    window.location.href = `/api/merchant/oauth?provider=${provider}`;
  }
}
