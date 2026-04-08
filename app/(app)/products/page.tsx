'use client';
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import {
  Package, Plus, Search, Edit2, Trash2, Tag, Layers,
  ChevronRight, X, Check, DollarSign, Hash, Percent,
  Archive, ShoppingBag, Wrench, Cpu, FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string;
  unit_price: number;
  unit: string;
  vat_rate: number;
  category: string;
  reference: string;
  is_active: boolean;
  created_at: string;
}

const UNITS = [
  { value: 'unit', label: 'Unité' },
  { value: 'hour', label: 'Heure' },
  { value: 'day', label: 'Jour' },
  { value: 'month', label: 'Mois' },
  { value: 'kg', label: 'Kilogramme' },
  { value: 'km', label: 'Kilomètre' },
  { value: 'forfait', label: 'Forfait' },
];

const VAT_RATES = [0, 5.5, 10, 20];

const CATEGORIES = [
  { value: 'service', label: 'Service', icon: Wrench, color: 'text-blue-500 bg-blue-50' },
  { value: 'product', label: 'Produit', icon: ShoppingBag, color: 'text-green-500 bg-green-50' },
  { value: 'software', label: 'Logiciel', icon: Cpu, color: 'text-purple-500 bg-purple-50' },
  { value: 'consulting', label: 'Conseil', icon: FileText, color: 'text-amber-500 bg-amber-50' },
  { value: 'other', label: 'Autre', icon: Archive, color: 'text-gray-500 bg-gray-50' },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  unit_price: '',
  unit: 'unit',
  vat_rate: '20',
  category: 'service',
  reference: '',
  is_active: true,
};

const getCategoryStyle = (cat: string) => CATEGORIES.find((c) => c.value === cat) || CATEGORIES[4];

export default function ProductsPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (user) fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await getSupabaseClient()
        .from('products')
        .select('*')
        .order('name');
      setProducts(data || []);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description || '',
      unit_price: String(p.unit_price),
      unit: p.unit,
      vat_rate: String(p.vat_rate),
      category: p.category,
      reference: p.reference || '',
      is_active: p.is_active,
    });
    setEditingId(p.id);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        unit_price: parseFloat(form.unit_price) || 0,
        unit: form.unit,
        vat_rate: parseFloat(form.vat_rate) || 0,
        category: form.category,
        reference: form.reference,
        is_active: form.is_active,
        user_id: user.id,
      };
      if (editingId) {
        const { data, error } = await getSupabaseClient()
          .from('products')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId)
          .select()
          .single();
        if (error) throw error;
        setProducts((ps) => ps.map((p) => (p.id === editingId ? data : p)));
      } else {
        const { data, error } = await getSupabaseClient()
          .from('products')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setProducts((ps) => [...ps, data].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowModal(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    setDeletingId(id);
    try {
      await getSupabaseClient().from('products').delete().eq('id', id);
      setProducts((ps) => ps.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.reference?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalActive = products.filter((p) => p.is_active).length;
  const avgPrice = products.length ? products.reduce((s, p) => s + p.unit_price, 0) / products.length : 0;
  const byCategory = CATEGORIES.map((c) => ({ ...c, count: products.filter((p) => p.category === c.value).length }));

  const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Catalogue produits</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez vos produits et services pour les ajouter rapidement à vos factures</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:bg-primary-dark transition-all active:scale-95"
        >
          <Plus size={16} />
          Nouveau produit
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package size={14} className="text-primary" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Total</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{products.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{totalActive} actifs</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign size={14} className="text-green-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Prix moyen</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{formatPrice(avgPrice)}</p>
          <p className="text-xs text-gray-400 mt-0.5">HT par article</p>
        </div>
        {byCategory.slice(0, 2).map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.value} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', cat.color.split(' ')[1])}>
                  <Icon size={14} className={cat.color.split(' ')[0]} />
                </div>
                <span className="text-xs text-gray-500 font-medium">{cat.label}s</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{cat.count}</p>
              <p className="text-xs text-gray-400 mt-0.5">articles</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit ou référence..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCat('')}
            className={cn('px-3 py-2 rounded-xl text-xs font-semibold border transition-all', filterCat === '' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}
          >
            Tous
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilterCat(cat.value === filterCat ? '' : cat.value)}
              className={cn('px-3 py-2 rounded-xl text-xs font-semibold border transition-all', filterCat === cat.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <Package size={24} className="text-gray-300" />
          </div>
          <h3 className="font-bold text-gray-800 mb-1">{search || filterCat ? 'Aucun résultat' : 'Aucun produit'}</h3>
          <p className="text-sm text-gray-400 mb-4">{search || filterCat ? 'Modifiez vos filtres' : 'Créez votre premier produit ou service'}</p>
          {!search && !filterCat && (
            <button onClick={openCreate} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold">
              <Plus size={14} /> Créer un produit
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((product) => {
            const cat = getCategoryStyle(product.category);
            const Icon = cat.icon;
            return (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm hover:border-gray-200 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', cat.color.split(' ')[1])}>
                    <Icon size={16} className={cat.color.split(' ')[0]} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(product.id)} disabled={deletingId === product.id} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{product.name}</h3>
                    {!product.is_active && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold">Inactif</span>}
                  </div>
                  {product.reference && (
                    <p className="text-[11px] text-gray-400 font-mono">#{product.reference}</p>
                  )}
                  {product.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                  )}
                </div>
                <div className="flex items-end justify-between pt-3 border-t border-gray-50">
                  <div>
                    <p className="text-lg font-black text-gray-900">{formatPrice(product.unit_price)}</p>
                    <p className="text-[11px] text-gray-400">HT / {UNITS.find((u) => u.value === product.unit)?.label || product.unit} · TVA {product.vat_rate}%</p>
                  </div>
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', cat.color)}>
                    {cat.label}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Add card */}
          <button
            onClick={openCreate}
            className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-4 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/2 transition-all group min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <Plus size={20} className="text-gray-300 group-hover:text-primary transition-colors" />
            </div>
            <span className="text-sm font-semibold text-gray-400 group-hover:text-primary transition-colors">Ajouter un produit</span>
          </button>
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
              {/* Modal header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Modifier le produit' : 'Nouveau produit'}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Ajoutez-le directement à vos factures</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Category pills */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Catégorie</label>
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => set('category', cat.value)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                            form.category === cat.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                          )}
                        >
                          <Icon size={12} />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Nom *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Ex : Développement web, Formation..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Reference */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Référence (optionnel)</label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={form.reference}
                      onChange={(e) => set('reference', e.target.value)}
                      placeholder="REF-001"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Description détaillée du produit ou service..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Price + Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Prix HT *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">€</span>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.unit_price}
                        onChange={(e) => set('unit_price', e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Unité</label>
                    <select
                      value={form.unit}
                      onChange={(e) => set('unit', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* VAT */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Taux de TVA</label>
                  <div className="flex gap-2">
                    {VAT_RATES.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => set('vat_rate', String(rate))}
                        className={cn(
                          'flex-1 py-2 rounded-xl text-sm font-bold border transition-all',
                          String(rate) === form.vat_rate
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        )}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Produit actif</p>
                    <p className="text-xs text-gray-500">Visible lors de la création de facture</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set('is_active', !form.is_active)}
                    className={cn(
                      'w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0',
                      form.is_active ? 'bg-primary' : 'bg-gray-300'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
                      form.is_active ? 'left-6' : 'left-1'
                    )} />
                  </button>
                </div>
              </form>

              {/* Footer */}
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
                  {editingId ? 'Enregistrer' : 'Créer le produit'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
