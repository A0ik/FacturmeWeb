'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getSupabaseClient } from '@/lib/supabase';
import { VendorMapping } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Building2, Search, Plus, Edit, Trash2, Save, X,
  FileText, TrendingUp, CheckCircle2, AlertTriangle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendorStats {
  vendor: string;
  count: number;
  totalAmount: number;
  lastDate: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupVendorsByPattern(mappings: VendorMapping[]): VendorStats[] {
  const grouped = new Map<string, VendorStats>();

  // Fetch documents to get vendor stats
  return []; // Will be populated from documents
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const { user } = useAuthStore();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [mappings, setMappings] = useState<VendorMapping[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── UI State ────────────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<VendorMapping | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    vendor_name_pattern: '',
    account_code: '',
    account_name: '',
  });

  // ── Fetch data ───────────────────────────────────────────────────────────────

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [mappingsRes, docsRes] = await Promise.all([
        getSupabaseClient()
          .from('vendor_mappings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        getSupabaseClient()
          .from('captured_documents')
          .select('id, vendor, amount, document_date, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      setMappings(mappingsRes.data || []);
      setDocuments(docsRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  // ── Vendor statistics ─────────────────────────────────────────────────────────

  const vendorStats = useMemo(() => {
    const stats = new Map<string, VendorStats>();

    documents.forEach(doc => {
      if (!doc.vendor) return;

      const existing = stats.get(doc.vendor);
      const count = (existing?.count || 0) + 1;
      const totalAmount = (existing?.totalAmount || 0) + (doc.amount || 0);

      const lastDate = doc.document_date || doc.created_at;
      const existingLastDate = existing?.lastDate || '';
      const newerDate = lastDate > existingLastDate ? lastDate : existingLastDate;

      stats.set(doc.vendor, {
        vendor: doc.vendor,
        count,
        totalAmount,
        lastDate: newerDate,
      });
    });

    return Array.from(stats.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [documents]);

  // ── Filtered data ─────────────────────────────────────────────────────────────

  const filteredMappings = useMemo(() => {
    if (!searchQuery) return mappings;
    const q = searchQuery.toLowerCase();
    return mappings.filter(m =>
      m.vendor_name_pattern.toLowerCase().includes(q) ||
      m.account_code?.toLowerCase().includes(q) ||
      m.account_name?.toLowerCase().includes(q)
    );
  }, [mappings, searchQuery]);

  const filteredStats = useMemo(() => {
    if (!searchQuery) return vendorStats;
    const q = searchQuery.toLowerCase();
    return vendorStats.filter(s => s.vendor.toLowerCase().includes(q));
  }, [vendorStats, searchQuery]);

  // ── CRUD Operations ───────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!user || !formData.vendor_name_pattern.trim() || !formData.account_code.trim()) return;

    const { error } = await getSupabaseClient()
      .from('vendor_mappings')
      .insert({
        user_id: user.id,
        vendor_name_pattern: formData.vendor_name_pattern.trim(),
        account_code: formData.account_code.trim(),
        account_name: formData.account_name.trim() || null,
      });

    if (error) {
      alert(`Erreur: ${error.message}`);
      return;
    }

    setFormData({ vendor_name_pattern: '', account_code: '', account_name: '' });
    setShowCreateModal(false);
    fetchData();
  };

  const handleUpdate = async () => {
    if (!editingMapping) return;

    const { error } = await getSupabaseClient()
      .from('vendor_mappings')
      .update({
        vendor_name_pattern: formData.vendor_name_pattern.trim(),
        account_code: formData.account_code.trim(),
        account_name: formData.account_name.trim() || null,
      })
      .eq('id', editingMapping.id);

    if (error) {
      alert(`Erreur: ${error.message}`);
      return;
    }

    setEditingMapping(null);
    setFormData({ vendor_name_pattern: '', account_code: '', account_name: '' });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce mapping de fournisseur ?')) return;

    const { error } = await getSupabaseClient()
      .from('vendor_mappings')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Erreur: ${error.message}`);
      return;
    }

    fetchData();
  };

  const openEditModal = (mapping: VendorMapping) => {
    setEditingMapping(mapping);
    setFormData({
      vendor_name_pattern: mapping.vendor_name_pattern,
      account_code: mapping.account_code,
      account_name: mapping.account_name || '',
    });
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingMapping(null);
    setFormData({ vendor_name_pattern: '', account_code: '', account_name: '' });
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Fournisseurs</h1>
          <p className="text-xs text-gray-400 mt-1">Gérez vos mappings fournisseurs pour l'affectation comptable automatique</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors">
          <Plus size={14} /> Nouveau mapping
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Mappings actifs', value: mappings.length, color: 'bg-blue-50 text-blue-600', icon: Building2 },
          { label: 'Fournisseurs uniques', value: vendorStats.length, color: 'bg-green-50 text-green-600', icon: FileText },
          { label: 'Total traité', value: formatCurrency(vendorStats.reduce((s, v) => s + v.totalAmount, 0)), color: 'bg-amber-50 text-amber-600', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className={cn('rounded-2xl border p-4', s.color, 'border-current/20')}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} />
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{s.label}</p>
            </div>
            <p className="text-2xl font-black">{typeof s.value === 'number' ? s.value : s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un fournisseur ou un compte comptable..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Vendor Stats Table */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-800">Top Fournisseurs</p>
          <p className="text-xs text-gray-400 mt-0.5">Basé sur vos documents capturés</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredStats.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-500">Aucun fournisseur</p>
            <p className="text-xs text-gray-400 mt-1">
              {vendorStats.length > 0 ? 'Aucun résultat pour cette recherche' : 'Importez des documents pour voir vos fournisseurs'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredStats.slice(0, 20).map((stat, i) => {
              const mapping = mappings.find(m => stat.vendor.toLowerCase().includes(m.vendor_name_pattern.toLowerCase()));
              return (
                <div key={i} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{stat.vendor}</p>
                        {mapping && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary">
                            <CheckCircle2 size={9} /> Mappé
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{stat.count} document{stat.count > 1 ? 's' : ''}</span>
                        <span>• Dernier: {new Date(stat.lastDate).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(stat.totalAmount)}</p>
                      {mapping && (
                        <p className="text-[10px] text-gray-400">
                          {mapping.account_code} {mapping.account_name && `• ${mapping.account_name}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mappings Table */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-800">Mappings Comptables</p>
          <p className="text-xs text-gray-400 mt-0.5">Règles d'affectation automatique</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-500">Aucun mapping</p>
            <p className="text-xs text-gray-400 mt-1">
              {mappings.length > 0 ? 'Aucun résultat pour cette recherche' : 'Créez des mappings pour automatiser la comptabilisation'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredMappings.map(mapping => (
              <div key={mapping.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{mapping.vendor_name_pattern}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="font-mono bg-gray-100 px-1.5 rounded">{mapping.account_code}</span>
                      {mapping.account_name && <span>{mapping.account_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(mapping)}
                      className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(mapping.id)}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingMapping) && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">
                  {editingMapping ? 'Modifier le mapping' : 'Nouveau mapping'}
                </p>
                <button onClick={closeModal}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
                  <X size={15} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">
                    Nom du fournisseur (ou partie) *
                  </label>
                  <input
                    type="text"
                    value={formData.vendor_name_pattern}
                    onChange={e => setFormData(f => ({ ...f, vendor_name_pattern: e.target.value }))}
                    placeholder="Ex: Amazon, Orange, Total..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Utilisez un mot-clé (ex: "Amaz") pour matcher "Amazon France" et "Amazon Business"
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">
                    Code comptable *
                  </label>
                  <input
                    type="text"
                    value={formData.account_code}
                    onChange={e => setFormData(f => ({ ...f, account_code: e.target.value }))}
                    placeholder="Ex: 6064, 6251, 706..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">
                    Nom du compte (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.account_name}
                    onChange={e => setFormData(f => ({ ...f, account_name: e.target.value }))}
                    placeholder="Ex: Fournitures informatiques, Voyages..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
                <button onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white transition-colors">
                  Annuler
                </button>
                <button
                  onClick={editingMapping ? handleUpdate : handleCreate}
                  disabled={!formData.vendor_name_pattern.trim() || !formData.account_code.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save size={14} />
                  {editingMapping ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
