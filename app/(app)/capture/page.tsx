'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getSupabaseClient } from '@/lib/supabase';
import { CapturedDocument, CaptureStatus } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Upload, Camera, FileText, Search, Filter, Trash2,
  CheckCircle2, Clock, Eye, Send, X, ChevronDown,
  Image as ImageIcon, File, MoreVertical, Plus,
  AlertTriangle, Download, Package, Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'transport', label: 'Transport', color: 'bg-blue-100 text-blue-700' },
  { value: 'meals', label: 'Restauration', color: 'bg-orange-100 text-orange-700' },
  { value: 'accommodation', label: 'Hébergement', color: 'bg-purple-100 text-purple-700' },
  { value: 'equipment', label: 'Équipement', color: 'bg-gray-100 text-gray-700' },
  { value: 'office', label: 'Fournitures', color: 'bg-green-100 text-green-700' },
  { value: 'shopping', label: 'Achats', color: 'bg-pink-100 text-pink-700' },
  { value: 'services', label: 'Services', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'other', label: 'Autre', color: 'bg-gray-100 text-gray-600' },
];

const STATUS_CONFIG: Record<CaptureStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  reviewed: { label: 'Vérifié', color: 'bg-blue-100 text-blue-700', icon: Eye },
  published: { label: 'Publié', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

const PAYMENT_METHODS = [
  { value: 'card', label: 'Carte bancaire' },
  { value: 'cash', label: 'Espèces' },
  { value: 'transfer', label: 'Virement' },
  { value: 'check', label: 'Chèque' },
  { value: 'prelevement', label: 'Prélèvement' },
];

function getCategoryConfig(cat?: string) {
  return CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
}

export default function CapturePage() {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<CapturedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | CaptureStatus>('all');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<CapturedDocument | null>(null);
  const [editForm, setEditForm] = useState<Partial<CapturedDocument>>({});
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);

  // Fetch documents
  const fetchDocs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await getSupabaseClient()
        .from('captured_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setDocuments(data || []);
    } catch (e) {
      console.error('Failed to fetch documents', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // Stats
  const stats = useMemo(() => {
    const pending = documents.filter(d => d.status === 'pending');
    const reviewed = documents.filter(d => d.status === 'reviewed');
    const published = documents.filter(d => d.status === 'published');
    const totalAmount = documents.reduce((s, d) => s + (d.amount || 0), 0);
    const pendingAmount = pending.reduce((s, d) => s + (d.amount || 0), 0);
    return { pending: pending.length, reviewed: reviewed.length, published: published.length, totalAmount, pendingAmount };
  }, [documents]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = documents;
    if (tab !== 'all') list = list.filter(d => d.status === tab);
    if (search) list = list.filter(d => (d.vendor || '').toLowerCase().includes(search.toLowerCase()) || (d.description || '').toLowerCase().includes(search.toLowerCase()));
    if (catFilter) list = list.filter(d => d.category === catFilter);
    return list;
  }, [documents, tab, search, catFilter]);

  // Upload + OCR
  const processFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `receipts/${user.id}/${Date.now()}.${ext}`;
      await getSupabaseClient().storage.from('assets').upload(path, file, { upsert: true });
      const { data: urlData } = getSupabaseClient().storage.from('assets').getPublicUrl(path);
      const fileUrl = urlData.publicUrl;
      const fileType = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'other';

      // Insert document
      const { data: doc, error } = await getSupabaseClient()
        .from('captured_documents')
        .insert({ user_id: user.id, file_url: fileUrl, file_type: fileType, status: 'pending' })
        .select().single();
      if (error) throw error;
      setDocuments(prev => [doc, ...prev]);

      // Auto-OCR for images
      if (fileType === 'image') {
        setOcrLoading(true);
        try {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/ai/ocr-receipt', { method: 'POST', body: fd });
          const { extracted } = await res.json();
          if (extracted) {
            const updates: any = {
              vendor: extracted.vendor || null,
              description: extracted.description || null,
              amount: extracted.amount || 0,
              vat_amount: extracted.vat_amount || 0,
              document_date: extracted.date || null,
              category: extracted.category || null,
              ocr_data: extracted,
            };
            const { data: updated } = await getSupabaseClient()
              .from('captured_documents')
              .update(updates)
              .eq('id', doc.id)
              .select().single();
            if (updated) {
              setDocuments(prev => prev.map(d => d.id === doc.id ? updated : d));
            }
          }
        } catch (e) {
          console.error('OCR failed', e);
        } finally {
          setOcrLoading(false);
        }
      }
    } catch (e: any) {
      alert(e.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [user]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  // Update document
  const handleUpdate = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const { data } = await getSupabaseClient()
        .from('captured_documents')
        .update({ ...editForm, updated_at: new Date().toISOString() })
        .eq('id', selectedDoc.id)
        .select().single();
      if (data) {
        setDocuments(prev => prev.map(d => d.id === selectedDoc.id ? data : d));
        setSelectedDoc(null);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Status change
  const changeStatus = async (id: string, status: CaptureStatus) => {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'reviewed') updates.reviewed_at = new Date().toISOString();
    if (status === 'published') updates.published_at = new Date().toISOString();
    const { data } = await getSupabaseClient()
      .from('captured_documents')
      .update(updates)
      .eq('id', id)
      .select().single();
    if (data) setDocuments(prev => prev.map(d => d.id === id ? data : d));
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    await getSupabaseClient().from('captured_documents').delete().eq('id', id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  // Bulk publish
  const bulkPublish = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await getSupabaseClient()
      .from('captured_documents')
      .update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('id', ids);
    setDocuments(prev => prev.map(d => selectedIds.has(d.id) ? { ...d, status: 'published' as CaptureStatus } : d));
    setSelectedIds(new Set());
  };

  // Bulk delete
  const bulkDelete = async () => {
    if (selectedIds.size === 0 || !confirm(`Supprimer ${selectedIds.size} documents ?`)) return;
    const ids = Array.from(selectedIds);
    await getSupabaseClient().from('captured_documents').delete().in('id', ids);
    setDocuments(prev => prev.filter(d => !selectedIds.has(d.id)));
    setSelectedIds(new Set());
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['Date', 'Fournisseur', 'Montant', 'TVA', 'Catégorie', 'Statut', 'Description'];
    const rows = filtered.map(d => [
      d.document_date || '', d.vendor || '', d.amount, d.vat_amount,
      getCategoryConfig(d.category).label, STATUS_CONFIG[d.status].label, d.description || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(String).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `capture-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const openDetail = (doc: CapturedDocument) => {
    setSelectedDoc(doc);
    setEditForm({
      vendor: doc.vendor || '',
      description: doc.description || '',
      amount: doc.amount,
      vat_amount: doc.vat_amount,
      vat_rate: doc.vat_rate,
      document_date: doc.document_date || '',
      category: doc.category || '',
      payment_method: doc.payment_method || '',
      notes: doc.notes || '',
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Capture</h1>
          <p className="text-sm text-gray-500 mt-0.5">Scannez, analysez et publiez vos justificatifs</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <button onClick={bulkPublish} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors">
                <Send size={13} /> Publier ({selectedIds.size})
              </button>
              <button onClick={bulkDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">
                <Trash2 size={13} /> Supprimer
              </button>
            </>
          )}
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'En attente', value: stats.pending, amount: stats.pendingAmount, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          { label: 'Vérifiés', value: stats.reviewed, amount: 0, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
          { label: 'Publiés', value: stats.published, amount: 0, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
          { label: 'Total capturé', value: documents.length, amount: stats.totalAmount, color: 'text-gray-900', bg: 'bg-gray-50 border-gray-100' },
        ].map((stat) => (
          <div key={stat.label} className={cn('rounded-2xl border p-3.5', stat.bg)}>
            <p className="text-xs text-gray-500 font-semibold">{stat.label}</p>
            <p className={cn('text-2xl font-black mt-1', stat.color)}>{stat.value}</p>
            {stat.amount > 0 && <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(stat.amount)}</p>}
          </div>
        ))}
      </div>

      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={cn(
          'relative rounded-2xl border-2 border-dashed p-4 sm:p-8 text-center transition-all duration-200 cursor-pointer',
          isDragging ? 'border-primary bg-primary/5 scale-[1.01]' :
          'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
        )}
        onClick={() => document.getElementById('capture-file-input')?.click()}
      >
        <input id="capture-file-input" type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileInput} />
        {(uploading || ocrLoading) ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-gray-700">
              {ocrLoading ? 'Analyse IA en cours...' : 'Upload en cours...'}
            </p>
            <p className="text-xs text-gray-400">
              {ocrLoading ? 'Extraction des données du justificatif' : 'Envoi du fichier...'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
              isDragging ? 'bg-primary/20' : 'bg-gray-100'
            )}>
              <Upload size={24} className={isDragging ? 'text-primary' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">
                Glissez un justificatif ici ou <span className="text-primary">parcourez</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Photos, PDF, captures d&apos;écran — L&apos;IA extrait les données automatiquement</p>
            </div>
          </div>
        )}
        {/* Mobile camera button */}
        <label
          htmlFor="capture-camera-input"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-4 top-4 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <Camera size={13} /> Photo
          <input id="capture-camera-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
        </label>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {[
            { key: 'all', label: 'Tout', count: documents.length },
            { key: 'pending', label: 'En attente', count: stats.pending },
            { key: 'reviewed', label: 'Vérifiés', count: stats.reviewed },
            { key: 'published', label: 'Publiés', count: stats.published },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t.label} <span className="text-[10px] opacity-60">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un fournisseur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setCatDropdownOpen(!catDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Filter size={13} />
              {catFilter ? getCategoryConfig(catFilter).label : 'Catégorie'}
              <ChevronDown size={12} />
            </button>
            {catDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-48">
                <button onClick={() => { setCatFilter(''); setCatDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-500">Toutes</button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => { setCatFilter(cat.value); setCatDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className={cn('w-2 h-2 rounded-full', cat.color.split(' ')[0])} />
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">Aucun document</p>
          <p className="text-sm text-gray-400 mt-1">Uploadez votre premier justificatif pour commencer</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const statusCfg = STATUS_CONFIG[doc.status];
            const catCfg = getCategoryConfig(doc.category);
            const StatusIcon = statusCfg.icon;
            const isSelected = selectedIds.has(doc.id);

            return (
              <div
                key={doc.id}
                onClick={() => openDetail(doc)}
                className={cn(
                  'flex items-center gap-3 p-3.5 bg-white rounded-2xl border transition-all cursor-pointer hover:shadow-sm group',
                  isSelected ? 'border-primary/30 bg-primary/5' : 'border-gray-100 hover:border-gray-200'
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (next.has(doc.id)) next.delete(doc.id); else next.add(doc.id);
                      return next;
                    });
                  }}
                  className={cn(
                    'w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    isSelected ? 'bg-primary border-primary' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  {isSelected && <CheckCircle2 size={12} className="text-white" />}
                </button>

                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {doc.file_type === 'image' ? (
                    <img src={doc.file_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FileText size={20} className="text-gray-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">{doc.vendor || 'Sans fournisseur'}</p>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', catCfg.color)}>{catCfg.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {doc.document_date ? new Date(doc.document_date).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    {doc.description && ` · ${doc.description}`}
                  </p>
                </div>

                {/* Amount + Status */}
                <div className="text-right flex-shrink-0 flex items-center gap-3">
                  <div>
                    <p className="text-sm font-black text-gray-900">{formatCurrency(doc.amount)}</p>
                    {doc.vat_amount > 0 && <p className="text-[10px] text-gray-400">TVA {formatCurrency(doc.vat_amount)}</p>}
                  </div>
                  <span className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full', statusCfg.color)}>
                    <StatusIcon size={10} />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-50 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {doc.status === 'pending' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); changeStatus(doc.id, 'reviewed'); }}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                      title="Marquer vérifié"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  {doc.status === 'reviewed' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); changeStatus(doc.id, 'published'); }}
                      className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors"
                      title="Publier"
                    >
                      <Send size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail / Edit Modal ── */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', STATUS_CONFIG[selectedDoc.status].color)}>
                  {(() => { const Icon = STATUS_CONFIG[selectedDoc.status].icon; return <Icon size={16} />; })()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{editForm.vendor || 'Sans fournisseur'}</h3>
                  <p className="text-xs text-gray-400">{STATUS_CONFIG[selectedDoc.status].label} · {new Date(selectedDoc.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-gray-100">
              {/* Left: Preview */}
              <div className="p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Aperçu</p>
                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                  {selectedDoc.file_type === 'image' ? (
                    <img src={selectedDoc.file_url} alt="Justificatif" className="w-full h-auto max-h-80 object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16">
                      <FileText size={48} className="text-gray-200 mb-3" />
                      <p className="text-sm text-gray-400">Fichier PDF</p>
                      <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-semibold mt-2 hover:underline">
                        Ouvrir le PDF
                      </a>
                    </div>
                  )}
                </div>
                {selectedDoc.ocr_data && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles size={12} className="text-blue-500" />
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Données extraites par IA</p>
                    </div>
                    <p className="text-xs text-blue-600">Les champs ci-contre ont été pré-remplis automatiquement par OCR.</p>
                  </div>
                )}
              </div>

              {/* Right: Edit Form */}
              <div className="p-5 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Détails</p>

                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Fournisseur</label>
                  <input type="text" value={editForm.vendor || ''} onChange={(e) => setEditForm(f => ({ ...f, vendor: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Description</label>
                  <input type="text" value={editForm.description || ''} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Montant TTC</label>
                    <input type="number" step="0.01" value={editForm.amount || ''} onChange={(e) => setEditForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">dont TVA</label>
                    <input type="number" step="0.01" value={editForm.vat_amount || ''} onChange={(e) => setEditForm(f => ({ ...f, vat_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Date</label>
                    <input type="date" value={editForm.document_date || ''} onChange={(e) => setEditForm(f => ({ ...f, document_date: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Catégorie</label>
                    <select value={editForm.category || ''} onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white">
                      <option value="">Choisir...</option>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Mode de paiement</label>
                    <select value={editForm.payment_method || ''} onChange={(e) => setEditForm(f => ({ ...f, payment_method: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white">
                      <option value="">Choisir...</option>
                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">% TVA</label>
                    <input type="number" step="0.1" value={editForm.vat_rate ?? 20} onChange={(e) => setEditForm(f => ({ ...f, vat_rate: parseFloat(e.target.value) || 20 }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Notes</label>
                  <textarea value={editForm.notes || ''} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <button onClick={() => handleDelete(selectedDoc.id)} className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">
                <Trash2 size={13} /> Supprimer
              </button>
              <div className="flex items-center gap-2">
                {/* Quick status buttons */}
                {selectedDoc.status === 'pending' && (
                  <button
                    onClick={async () => { await changeStatus(selectedDoc.id, 'reviewed'); setSelectedDoc(null); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    <Eye size={13} /> Marquer vérifié
                  </button>
                )}
                {selectedDoc.status === 'reviewed' && (
                  <button
                    onClick={async () => { await changeStatus(selectedDoc.id, 'published'); setSelectedDoc(null); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors"
                  >
                    <Send size={13} /> Publier
                  </button>
                )}
                <button onClick={handleUpdate} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={13} />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
