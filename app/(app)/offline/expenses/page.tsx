'use client';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import {
  Receipt, Plus, Search, Edit2, Trash2, TrendingDown,
  X, Check, Calendar, Upload, FileImage, ExternalLink,
  ShoppingCart, Car, Coffee, Home, Laptop, Briefcase, MoreHorizontal,
  ArrowDownUp, Filter, Sparkles, Wand2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Expense {
  id: string;
  user_id: string;
  vendor: string;
  amount: number;
  vat_amount: number;
  category: string;
  date: string;
  description: string;
  receipt_url: string | null;
  payment_method: string;
  status: 'pending' | 'validated' | 'rejected';
  created_at: string;
}

const CATEGORIES = [
  { value: 'transport', label: 'Transport', icon: Car, color: 'text-blue-500 bg-blue-50' },
  { value: 'meals', label: 'Repas', icon: Coffee, color: 'text-amber-500 bg-amber-50' },
  { value: 'accommodation', label: 'Hébergement', icon: Home, color: 'text-green-500 bg-green-50' },
  { value: 'equipment', label: 'Matériel', icon: Laptop, color: 'text-purple-500 bg-purple-50' },
  { value: 'office', label: 'Bureau', icon: Briefcase, color: 'text-cyan-500 bg-cyan-50' },
  { value: 'shopping', label: 'Achats', icon: ShoppingCart, color: 'text-pink-500 bg-pink-50' },
  { value: 'other', label: 'Autre', icon: MoreHorizontal, color: 'text-gray-500 bg-gray-50' },
];

const PAYMENT_METHODS = [
  { value: 'card', label: 'Carte bancaire' },
  { value: 'cash', label: 'Espèces' },
  { value: 'transfer', label: 'Virement' },
  { value: 'check', label: 'Chèque' },
];

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  pending: { label: 'En attente', class: 'bg-amber-50 text-amber-600 border-amber-100' },
  validated: { label: 'Validée', class: 'bg-green-50 text-green-600 border-green-100' },
  rejected: { label: 'Rejetée', class: 'bg-red-50 text-red-600 border-red-100' },
};

const EMPTY_FORM = {
  vendor: '',
  amount: '',
  vat_amount: '',
  category: 'transport',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  payment_method: 'card',
};

const getCat = (v: string) => CATEGORIES.find((c) => c.value === v) || CATEGORIES[6];

export default function ExpensesPage() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [categorizingAI, setCategorizingAI] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (user) fetchExpenses();
  }, [user]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await getSupabaseClient()
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      setExpenses(data || []);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setReceiptUrl(null);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setForm({
      vendor: e.vendor,
      amount: String(e.amount),
      vat_amount: String(e.vat_amount || ''),
      category: e.category,
      date: e.date,
      description: e.description || '',
      payment_method: e.payment_method,
    });
    setReceiptUrl(e.receipt_url);
    setEditingId(e.id);
    setShowModal(true);
  };

  const handleReceiptUpload = async (file: File) => {
    if (!user) return;
    setUploadingReceipt(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `receipts/${user.id}/${Date.now()}.${ext}`;
      await getSupabaseClient().storage.from('assets').upload(path, file, { upsert: true });
      const { data } = getSupabaseClient().storage.from('assets').getPublicUrl(path);
      setReceiptUrl(data.publicUrl);
      // Auto-OCR if image
      if (file.type.startsWith('image/')) {
        handleOCR(file);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleOCR = async (file: File) => {
    setOcrLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ai/ocr-receipt', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { extracted } = data;
      if (extracted?.vendor) set('vendor', extracted.vendor);
      if (extracted?.amount) set('amount', String(extracted.amount));
      if (extracted?.vat_amount) set('vat_amount', String(extracted.vat_amount));
      if (extracted?.date) set('date', extracted.date);
      if (extracted?.description) set('description', extracted.description);
      if (extracted?.category) set('category', extracted.category);
    } catch {
      // silent fail — OCR is best-effort
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCategorizeAI = async () => {
    if (!form.vendor && !form.description) return;
    setCategorizingAI(true);
    try {
      const res = await fetch('/api/ai/categorize-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: form.vendor, description: form.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.category) set('category', data.category);
    } catch {
      // silent fail
    } finally {
      setCategorizingAI(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        vendor: form.vendor,
        amount: parseFloat(form.amount) || 0,
        vat_amount: parseFloat(form.vat_amount) || 0,
        category: form.category,
        date: form.date,
        description: form.description,
        payment_method: form.payment_method,
        receipt_url: receiptUrl,
        status: 'pending' as const,
        user_id: user.id,
      };
      if (editingId) {
        const { data, error } = await getSupabaseClient()
          .from('expenses')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId)
          .select()
          .single();
        if (error) throw error;
        setExpenses((es) => es.map((ex) => (ex.id === editingId ? data : ex)));
      } else {
        const { data, error } = await getSupabaseClient()
          .from('expenses')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setExpenses((es) => [data, ...es]);
      }
      setShowModal(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette note de frais ?')) return;
    setDeletingId(id);
    try {
      await getSupabaseClient().from('expenses').delete().eq('id', id);
      setExpenses((es) => es.filter((e) => e.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleValidate = async (id: string, status: 'validated' | 'rejected') => {
    const { data, error } = await getSupabaseClient()
      .from('expenses')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (!error) setExpenses((es) => es.map((e) => (e.id === id ? data : e)));
  };

  const filtered = expenses.filter((e) => {
    const matchSearch = !search || e.vendor.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || e.category === filterCat;
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  const totalMonth = expenses
    .filter((e) => e.date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, e) => s + e.amount, 0);
  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
  const totalVat = expenses.reduce((s, e) => s + (e.vat_amount || 0), 0);
  const pending = expenses.filter((e) => e.status === 'pending').length;

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  const byMonth = filtered.reduce<Record<string, Expense[]>>((acc, e) => {
    const key = e.date.slice(0, 7);
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Notes de frais</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivez vos dépenses professionnelles et factures d'achats</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:bg-primary-dark transition-all active:scale-95"
        >
          <Plus size={16} />
          Nouvelle dépense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ce mois', value: fmt(totalMonth), sub: 'dépensé', icon: TrendingDown, color: 'text-red-500 bg-red-50' },
          { label: 'Total cumulé', value: fmt(totalAll), sub: 'toutes périodes', icon: Receipt, color: 'text-blue-500 bg-blue-50' },
          { label: 'TVA déductible', value: fmt(totalVat), sub: 'récupérable', icon: ArrowDownUp, color: 'text-green-500 bg-green-50' },
          { label: 'En attente', value: String(pending), sub: 'à valider', icon: Filter, color: 'text-amber-500 bg-amber-50' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', color.split(' ')[1])}>
                <Icon size={14} className={color.split(' ')[0]} />
              </div>
              <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un fournisseur ou description..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'pending', 'validated'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn('px-3 py-2 rounded-xl text-xs font-semibold border transition-all', filterStatus === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}
            >
              {s === '' ? 'Tout' : s === 'pending' ? 'En attente' : 'Validées'}
            </button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('')} className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all', filterCat === '' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}>
          Toutes catégories
        </button>
        {CATEGORIES.map((cat) => (
          <button key={cat.value} onClick={() => setFilterCat(cat.value === filterCat ? '' : cat.value)} className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all', filterCat === cat.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Expenses list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <Receipt size={24} className="text-gray-300" />
          </div>
          <h3 className="font-bold text-gray-800 mb-1">Aucune dépense</h3>
          <p className="text-sm text-gray-400 mb-4">Commencez à suivre vos notes de frais</p>
          <button onClick={openCreate} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold">
            <Plus size={14} /> Ajouter une dépense
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byMonth).map(([month, items]) => (
            <div key={month}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide capitalize">{monthLabel(month)}</h3>
                <span className="text-xs font-bold text-gray-900">{fmt(items.reduce((s, e) => s + e.amount, 0))}</span>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {items.map((expense, idx) => {
                  const cat = getCat(expense.category);
                  const Icon = cat.icon;
                  const statusStyle = STATUS_STYLES[expense.status];
                  return (
                    <motion.div
                      key={expense.id}
                      layout
                      className={cn('flex items-center gap-4 px-4 py-3.5 group hover:bg-gray-50/80 transition-colors', idx > 0 && 'border-t border-gray-50')}
                    >
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', cat.color.split(' ')[1])}>
                        <Icon size={16} className={cat.color.split(' ')[0]} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{expense.vendor}</p>
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', statusStyle.class)}>
                            {statusStyle.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{new Date(expense.date).toLocaleDateString('fr-FR')}</span>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-400">{cat.label}</span>
                          {expense.description && (
                            <>
                              <span className="text-gray-200">·</span>
                              <span className="text-xs text-gray-400 truncate">{expense.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {expense.receipt_url && (
                          <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-gray-300 hover:text-primary hover:bg-primary/5 transition-colors">
                            <FileImage size={14} />
                          </a>
                        )}
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{fmt(expense.amount)}</p>
                          {expense.vat_amount > 0 && <p className="text-xs text-gray-400">TVA {fmt(expense.vat_amount)}</p>}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {expense.status === 'pending' && (
                            <button onClick={() => handleValidate(expense.id, 'validated')} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-300 hover:text-green-500 transition-colors" title="Valider">
                              <Check size={13} />
                            </button>
                          )}
                          <button onClick={() => openEdit(expense)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-700 transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(expense.id)} disabled={deletingId === expense.id} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Note de frais ou facture d'achat</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Catégorie</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => set('category', cat.value)}
                          className={cn(
                            'flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all',
                            form.category === cat.value
                              ? 'border-primary bg-primary/8 text-primary'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                          )}
                        >
                          <Icon size={16} />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* OCR indicator */}
                {ocrLoading && (
                  <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl p-3">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <p className="text-xs text-purple-700 font-medium">L'IA analyse votre justificatif...</p>
                  </div>
                )}

                {/* Vendor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fournisseur *</label>
                    {(form.vendor || form.description) && (
                      <button
                        type="button"
                        onClick={handleCategorizeAI}
                        disabled={categorizingAI}
                        className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-700 transition-colors disabled:opacity-50"
                      >
                        {categorizingAI ? <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={11} />}
                        Catégoriser par IA
                      </button>
                    )}
                  </div>
                  <input
                    required
                    value={form.vendor}
                    onChange={(e) => set('vendor', e.target.value)}
                    placeholder="Ex : SNCF, Amazon, Leroy Merlin..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Amount + VAT */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Montant TTC *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">€</span>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => set('amount', e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">TVA récupérable</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">€</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.vat_amount}
                        onChange={(e) => set('vat_amount', e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Date + Payment */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Date *</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        required
                        type="date"
                        value={form.date}
                        onChange={(e) => set('date', e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Moyen de paiement</label>
                    <select
                      value={form.payment_method}
                      onChange={(e) => set('payment_method', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Objet de la dépense..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Receipt upload */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Justificatif</label>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} />
                  {receiptUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                      <FileImage size={16} className="text-green-500 flex-shrink-0" />
                      <span className="text-sm text-green-700 font-medium flex-1 truncate">Justificatif ajouté</span>
                      <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
                        <ExternalLink size={14} />
                      </a>
                      <button type="button" onClick={() => setReceiptUrl(null)} className="text-green-400 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadingReceipt}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/3 transition-all"
                    >
                      {uploadingReceipt ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Upload size={15} />}
                      {uploadingReceipt ? 'Upload en cours...' : 'Ajouter un justificatif (PDF, image)'}
                    </button>
                  )}
                </div>
              </form>

              <div className="px-6 pb-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-60"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={15} />}
                  {editingId ? 'Enregistrer' : 'Ajouter la dépense'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
