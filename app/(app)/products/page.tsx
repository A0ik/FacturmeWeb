'use client';
import { toast } from 'sonner';
import { useState, useEffect, useMemo, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import {
  Package, Plus, Search, Edit2, Trash2, Tag, Layers,
  X, Check, DollarSign, Hash, Percent,
  Archive, ShoppingBag, Wrench, Cpu, FileText,
  Grid3X3, List, ArrowUpDown, SlidersHorizontal,
  TrendingUp, TrendingDown, Star, Zap, Eye,
  Filter, ChevronDown, Info, Copy, MoreHorizontal, Mic,
  Loader2, MicOff, Sparkles, AlertCircle, Wand2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { VoiceAssistant, VoiceAnalysisResult } from '@/components/ui/VoiceAssistant';
import { CustomSelect } from '@/components/ui/CustomSelect';

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
  { value: 'service', label: 'Service', icon: Wrench, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10' },
  { value: 'product', label: 'Produit', icon: ShoppingBag, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-500/10' },
  { value: 'software', label: 'Logiciel', icon: Cpu, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10' },
  { value: 'consulting', label: 'Conseil', icon: FileText, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10' },
  { value: 'other', label: 'Autre', icon: Archive, color: 'from-gray-500 to-slate-500', bg: 'bg-gray-500/10' },
];

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nom A-Z', icon: ArrowUpDown },
  { value: 'name-desc', label: 'Nom Z-A', icon: ArrowUpDown },
  { value: 'price-asc', label: 'Prix croissant', icon: TrendingUp },
  { value: 'price-desc', label: 'Prix décroissant', icon: TrendingDown },
  { value: 'created-desc', label: 'Plus récent', icon: Star },
  { value: 'created-asc', label: 'Plus ancien', icon: Archive },
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

// Glass Card Component
const GlassCard = ({ children, className, hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-3xl shadow-lg',
      hover && 'hover:shadow-2xl hover:scale-[1.02] hover:border-white/30 transition-all duration-300',
      className
    )}
  >
    {children}
  </motion.div>
);

export default function ProductsPage() {
  const { user } = useAuthStore();
  const { canUseVoice } = useSubscription();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterPrice, setFilterPrice] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [mode, setMode] = useState<'voice' | 'ai' | 'manual'>('manual');

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [recordTime, setRecordTime] = useState(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleVoiceResult = (data: VoiceAnalysisResult) => {
    // Populate form with voice analysis results
    if (data.name) set('name', data.name);
    if (data.description) set('description', data.description);
    if (data.price) set('unit_price', String(data.price));
    if (data.quantity) setForm((f) => ({ ...f, quantity: data.quantity }));
    if (data.vatRate) set('vat_rate', String(data.vatRate));
    if (data.reference) set('reference', data.reference);
    if (data.unit) {
      // Map voice units to form units - utiliser directement la valeur si elle existe dans UNITS
      const unitOption = UNITS.find(u => u.value === data.unit);
      if (unitOption) {
        set('unit', data.unit);
      } else {
        // Fallback sur unité par défaut
        set('unit', 'unit');
      }
    }
    // Auto-generate reference if not provided
    if (!data.reference && data.name) {
      const ref = data.name
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // Enlever les accents
        .replace(/[^a-zA-Z0-9]/g, '') // Garder seulement alphanumérique
        .substring(0, 8)
        .toUpperCase();
      set('reference', ref + '-' + Date.now().toString().slice(-4));
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const startRecording = async () => {
    if (!canUseVoice) { toast.error('La reconnaissance vocale est disponible avec les abonnements Pro et Business'); return; }
    setVoiceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); processVoiceBlob(); };
      mediaRecorderRef.current = mr;
      mr.start();
      recordTimerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
      setRecording(true);
    } catch {
      setVoiceError('Accès au micro refusé. Vérifiez les permissions dans votre navigateur.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);
    setRecordTime(0);
  };

  const processVoiceBlob = async () => {
    setProcessingVoice(true);
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      if (user?.id) fd.append('user_id', user.id);

      const res = await fetch('/api/process-voice-product', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Erreur de traitement');
      const result = await res.json();
      setTranscript(result.transcript || '');
      const parsed = result.parsed;

      // Update form with parsed data
      const updates: any = {};

      if (parsed?.name) updates.name = parsed.name;
      if (parsed?.description) updates.description = parsed.description;
      if (parsed?.unit_price) updates.unit_price = String(parsed.unit_price);
      if (parsed?.quantity) updates.quantity = parsed.quantity;
      if (parsed?.vatRate) updates.vat_rate = String(parsed.vatRate);
      if (parsed?.reference) updates.reference = parsed.reference;
      if (parsed?.unit) {
        const unitOption = UNITS.find(u => u.value === parsed.unit);
        if (unitOption) updates.unit = parsed.unit;
      }

      // Auto-detect category from voice
      if (parsed?.category) {
        // Map category to CATEGORIES values
        const categoryMap: Record<string, string> = {
          'service': 'service',
          'product': 'product',
          'software': 'software',
          'consulting': 'consulting',
          'other': 'other',
        };
        if (categoryMap[parsed.category]) {
          updates.category = categoryMap[parsed.category];
        }
      }

      // Auto-generate reference if not provided
      if (!parsed?.reference && parsed?.name) {
        const ref = parsed.name
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .substring(0, 8)
          .toUpperCase();
        updates.reference = ref + '-' + Date.now().toString().slice(-4);
      }

      // Apply all updates at once
      if (Object.keys(updates).length > 0) {
        setForm({ ...form, ...updates });
      }

      if (result.summary) toast.success(result.summary);
      setMode('manual');
    } catch (e: any) {
      setVoiceError(e.message || 'Erreur lors du traitement vocal');
    } finally {
      setProcessingVoice(false);
    }
  };

  useEffect(() => {
    if (user) fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.warn('Supabase client not available');
        setProducts([]);
        setLoading(false);
        return;
      }

      // Vérifier d'abord si la table existe en faisant une requête simple
      const { data, error, status } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      // Si la table n'existe pas (code 404 ou erreur specific)
      if (error) {
        // Code d'erreur PostgreSQL pour "relation does not exist"
        if (error.code === '42P01' || status === 404 || error.message.includes('does not exist')) {
          console.warn('Products table does not exist yet');
          setProducts([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Si on a un résultat, récupérer tous les produits
      const { data: allProducts, error: allError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) throw allError;
      setProducts(allProducts || []);
    } catch (e: any) {
      console.error('Error fetching products:', e);
      // Ne pas afficher de toast pour les erreurs de connexion
      if (e.message && !e.message.includes('Failed to fetch')) {
        toast.error('Erreur lors du chargement des produits');
      }
      setProducts([]);
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
        toast.success('Produit mis à jour avec succès');
      } else {
        const { data, error } = await getSupabaseClient()
          .from('products')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setProducts((ps) => [...ps, data]);
        toast.success('Produit créé avec succès');
      }
      setShowModal(false);
    } catch (e: any) {
      toast.error(e.message);
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
      toast.success('Produit supprimé');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (p: Product) => {
    try {
      const { data, error } = await getSupabaseClient()
        .from('products')
        .insert({
          ...p,
          name: `${p.name} (copie)`,
          id: undefined,
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();
      if (error) throw error;
      setProducts((ps) => [...ps, data]);
      toast.success('Produit dupliqué');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedProducts.size} produit(s) ?`)) return;
    try {
      await getSupabaseClient().from('products').delete().in('id', Array.from(selectedProducts));
      setProducts((ps) => ps.filter((p) => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
      toast.success(`${selectedProducts.size} produit(s) supprimé(s)`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...products];

    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.reference?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filterCat) {
      result = result.filter((p) => p.category === filterCat);
    }

    // Price filter
    if (filterPrice.min) {
      result = result.filter((p) => p.unit_price >= parseFloat(filterPrice.min));
    }
    if (filterPrice.max) {
      result = result.filter((p) => p.unit_price <= parseFloat(filterPrice.max));
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.unit_price - b.unit_price;
        case 'price-desc':
          return b.unit_price - a.unit_price;
        case 'created-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [products, search, filterCat, filterPrice, sortBy]);

  const totalActive = products.filter((p) => p.is_active).length;
  const totalInactive = products.length - totalActive;
  const avgPrice = products.length ? products.reduce((s, p) => s + p.unit_price, 0) / products.length : 0;
  const byCategory = CATEGORIES.map((c) => ({ ...c, count: products.filter((p) => p.category === c.value).length }));

  const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <div className="space-y-6 p-4">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl" />
      </div>

      {/* Header with Stats */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Catalogue produits
            </h1>
            <p className="text-sm text-gray-500 mt-1">Gérez vos produits et services pour les ajouter rapidement à vos factures</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                showFilters ? 'bg-primary text-white' : 'bg-white/70 backdrop-blur text-gray-700 hover:bg-white'
              )}
            >
              <SlidersHorizontal size={16} />
              Filtres
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Plus size={16} />
              Nouveau produit
            </button>
          </div>
        </div>

        {/* Stats Cards - Bento Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                <Package size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{products.length}</p>
                <p className="text-xs text-gray-500">Total produits</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                <Check size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{totalActive}</p>
                <p className="text-xs text-gray-500">Actifs</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <DollarSign size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{formatPrice(avgPrice)}</p>
                <p className="text-xs text-gray-500">Prix moyen</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg">
                <Archive size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{totalInactive}</p>
                <p className="text-xs text-gray-500">Inactifs</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-5 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, référence ou description..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border-0 bg-white/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <CustomSelect
                    options={[
                      { value: '', label: 'Toutes les catégories' },
                      ...CATEGORIES.map((c) => ({
                        value: c.value,
                        label: c.label,
                        icon: c.icon,
                        color: c.color,
                      }))
                    ]}
                    value={filterCat}
                    onChange={setFilterCat}
                    placeholder="Toutes les catégories"
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Prix (HT)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={filterPrice.min}
                      onChange={(e) => setFilterPrice({ ...filterPrice, min: e.target.value })}
                      placeholder="Min"
                      className="flex-1 px-3 py-2.5 rounded-xl border-0 bg-white/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur"
                    />
                    <span className="text-gray-400 self-center">-</span>
                    <input
                      type="number"
                      value={filterPrice.max}
                      onChange={(e) => setFilterPrice({ ...filterPrice, max: e.target.value })}
                      placeholder="Max"
                      className="flex-1 px-3 py-2.5 rounded-xl border-0 bg-white/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur"
                    />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <CustomSelect
                    options={SORT_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                      icon: o.icon,
                    }))}
                    value={sortBy}
                    onChange={setSortBy}
                    placeholder="Trier par"
                  />
                </div>
              </div>

              {/* Active Filters Display */}
              {(filterCat || filterPrice.min || filterPrice.max || search) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">Filtres actifs :</span>
                  {filterCat && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold">
                      {CATEGORIES.find(c => c.value === filterCat)?.label}
                      <button onClick={() => setFilterCat('')}><X size={12} /></button>
                    </span>
                  )}
                  {filterPrice.min && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold">
                      Min: {filterPrice.min}€
                      <button onClick={() => setFilterPrice({ ...filterPrice, min: '' })}><X size={12} /></button>
                    </span>
                  )}
                  {filterPrice.max && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold">
                      Max: {filterPrice.max}€
                      <button onClick={() => setFilterPrice({ ...filterPrice, max: '' })}><X size={12} /></button>
                    </span>
                  )}
                  {search && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold">
                      "{search.slice(0, 15)}{search.length > 15 ? '...' : ''}"
                      <button onClick={() => setSearch('')}><X size={12} /></button>
                    </span>
                  )}
                  <button
                    onClick={() => { setFilterCat(''); setFilterPrice({ min: '', max: '' }); setSearch(''); }}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold ml-2"
                  >
                    Tout effacer
                  </button>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">{filteredAndSorted.length}</span> produit(s)
          </span>
          {selectedProducts.size > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-primary font-semibold">{selectedProducts.size} sélectionné(s)</span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-200"
              >
                <Trash2 size={12} />
                Supprimer
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-xl transition-all',
              viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white/70 text-gray-500 hover:bg-white'
            )}
          >
            <Grid3X3 size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-xl transition-all',
              viewMode === 'list' ? 'bg-primary text-white' : 'bg-white/70 text-gray-500 hover:bg-white'
            )}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Products Display */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400">Chargement des produits...</p>
          </div>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
            <Package size={36} className="text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-2">
            {search || filterCat ? 'Aucun résultat' : 'Aucun produit'}
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            {search || filterCat ? 'Modifiez vos filtres pour voir plus de résultats' : 'Créez votre premier produit ou service'}
          </p>
          {!search && !filterCat && (
            <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              <Plus size={18} />
              Créer un produit
            </button>
          )}
        </GlassCard>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
            )}
          >
            {filteredAndSorted.map((product, idx) => {
              const cat = getCategoryStyle(product.category);
              const Icon = cat.icon;
              const isSelected = selectedProducts.has(product.id);

              if (viewMode === 'grid') {
                return (
                  <GlassCard key={product.id} className="overflow-hidden group">
                    <div className="relative p-5">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelect(product.id)}
                        className={cn(
                          'absolute top-4 left-4 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all z-10',
                          isSelected ? 'bg-primary border-primary' : 'border-gray-300 hover:border-primary'
                        )}
                      >
                        {isSelected && <Check size={14} className="text-white" />}
                      </button>

                      {/* Category Badge */}
                      <div className={cn('absolute top-4 right-4 px-2 py-1 rounded-full bg-gradient-to-r text-white text-[10px] font-bold shadow-lg', cat.color)}>
                        {cat.label}
                      </div>

                      {/* Icon */}
                      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mt-6 shadow-lg', cat.bg)}>
                        <Icon size={24} className={cat.color.split(' ')[0]} />
                      </div>

                      {/* Content */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-start gap-2">
                          <h3 className="font-bold text-gray-900 text-sm leading-tight flex-1">{product.name}</h3>
                          {!product.is_active && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
                              Inactif
                            </span>
                          )}
                        </div>
                        {product.reference && (
                          <p className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                            <Hash size={10} />
                            {product.reference}
                          </p>
                        )}
                        {product.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                        )}
                      </div>

                      {/* Price & Actions */}
                      <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            {formatPrice(product.unit_price)}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            HT / {UNITS.find((u) => u.value === product.unit)?.label} · TVA {product.vat_rate}%
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(product)}
                            className="p-2 rounded-xl hover:bg-primary/10 text-gray-400 hover:text-primary transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(product)}
                            className="p-2 rounded-xl hover:bg-emerald-100 text-gray-400 hover:text-emerald-600 transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deletingId === product.id}
                            className="p-2 rounded-xl hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              } else {
                // List view
                return (
                  <GlassCard key={product.id} className="overflow-hidden">
                    <div className="flex items-center gap-4 p-4">
                      <button
                        onClick={() => toggleSelect(product.id)}
                        className={cn(
                          'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0',
                          isSelected ? 'bg-primary border-primary' : 'border-gray-300 hover:border-primary'
                        )}
                      >
                        {isSelected && <Check size={14} className="text-white" />}
                      </button>

                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', cat.bg)}>
                        <Icon size={20} className={cat.color.split(' ')[0]} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-sm">{product.name}</h3>
                          {!product.is_active && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold">Inactif</span>
                          )}
                        </div>
                        {product.reference && (
                          <p className="text-[11px] text-gray-400 font-mono">#{product.reference}</p>
                        )}
                        {product.description && (
                          <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-black text-gray-900">{formatPrice(product.unit_price)}</p>
                        <p className="text-[11px] text-gray-400">HT · TVA {product.vat_rate}%</p>
                      </div>

                      <span className={cn('px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r text-white', cat.color)}>
                        {cat.label}
                      </span>

                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(product)}
                          className="p-2 rounded-xl hover:bg-primary/10 text-gray-400 hover:text-primary transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(product)}
                          className="p-2 rounded-xl hover:bg-emerald-100 text-gray-400 hover:text-emerald-600 transition-colors"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={deletingId === product.id}
                          className="p-2 rounded-xl hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                );
              }
            })}

            {/* Add Card - Grid only */}
            {viewMode === 'grid' && (
              <button
                onClick={openCreate}
                className="bg-white/50 backdrop-blur border-2 border-dashed border-gray-200 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 transition-all group min-h-[220px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Plus size={24} className="text-gray-300 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-sm font-semibold text-gray-400 group-hover:text-primary transition-colors">
                  Ajouter un produit
                </span>
              </button>
            )}
          </motion.div>
        </AnimatePresence>
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20"
            >
              {/* Modal header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Modifier' : 'Nouveau produit'}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Ajoutez-le directement à vos factures</p>
                </div>
                <div className="flex items-center gap-2">
                  {canUseVoice && !editingId && (
                    <>
                      <button
                        onClick={() => setMode('voice')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                          mode === 'voice'
                            ? 'bg-gradient-to-r from-primary to-purple-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        <Mic size={14} />
                        Voix
                      </button>
                      <button
                        onClick={() => setMode('manual')}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                          mode === 'manual'
                            ? 'bg-gradient-to-r from-primary to-purple-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        <FileText size={14} />
                        Manuel
                      </button>
                    </>
                  )}
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Voice mode */}
              {canUseVoice && !editingId && mode === 'voice' && (
                <div className="px-6 py-4 bg-gradient-to-br from-primary/10 to-purple-600/10 border-b border-primary/20">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      {recording && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.2, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="absolute inset-0 rounded-full bg-red-500/20"
                        />
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={recording ? stopRecording : startRecording}
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl ${
                          recording
                            ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                            : 'bg-gradient-to-br from-primary to-purple-600 hover:from-purple-600 hover:to-purple-700'
                        }`}
                      >
                        {recording ? (
                          <MicOff size={24} className="text-white" />
                        ) : (
                          <Mic size={24} className="text-white" />
                        )}
                      </motion.button>
                    </div>

                    <div className="space-y-1 text-center">
                      {recording && (
                        <motion.p
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className="text-lg font-black text-red-500 tabular-nums"
                        >
                          {formatTime(recordTime)}
                        </motion.p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {recording
                          ? 'Parlez clairement — cliquez pour arrêter'
                          : 'Cliquez pour commencer la dictée'}
                      </p>
                      {!recording && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Ex: "Site web vitrine 850 euros HT"
                        </p>
                      )}
                    </div>

                    {transcript && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full text-left bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 border border-primary/20"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles size={12} className="text-primary" />
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Transcription</p>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{transcript}</p>
                      </motion.div>
                    )}

                    {processingVoice && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full text-left bg-gradient-to-r from-primary/10 to-purple-600/10 dark:from-primary/20 dark:to-purple-600/20 rounded-xl p-3 border border-primary/20"
                      >
                        <div className="flex items-center gap-3">
                          <Loader2 size={16} className="text-primary animate-spin" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-primary uppercase tracking-wide">Traitement en cours</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Analyse de votre dictée vocale...</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {voiceError && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 rounded-xl p-3"
                      >
                        <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-600 dark:text-red-400">{voiceError}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Category selection */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3">Catégorie</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = form.category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => set('category', cat.value)}
                          className={cn(
                            'flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold border-2 transition-all',
                            isSelected
                              ? 'border-primary bg-gradient-to-r from-primary/10 to-purple-600/10 text-primary'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white/50'
                          )}
                        >
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', cat.bg, isSelected && cat.color.replace('from-', 'to-').split(' ')[0])}>
                            <Icon size={14} className={isSelected ? cat.color.split(' ')[0].replace('from-', 'text-') : 'text-gray-500'} />
                          </div>
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Nom *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Ex : Développement web, Formation..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white/50"
                  />
                </div>

                {/* Reference */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Référence</label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={form.reference}
                      onChange={(e) => set('reference', e.target.value)}
                      placeholder="REF-001"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white/50"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Description détaillée du produit ou service..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white/50"
                  />
                </div>

                {/* Price + Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Prix HT *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">€</span>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.unit_price}
                        onChange={(e) => set('unit_price', e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white/50"
                      />
                    </div>
                  </div>
                  <div>
                    <CustomSelect
                      options={UNITS.map((u) => ({
                        value: u.value,
                        label: u.label,
                      }))}
                      value={form.unit}
                      onChange={(v) => set('unit', v)}
                      placeholder="Unité"
                    />
                  </div>
                </div>

                {/* VAT */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Taux de TVA</label>
                  <div className="flex gap-2">
                    {VAT_RATES.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => set('vat_rate', String(rate))}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
                          String(rate) === form.vat_rate
                            ? 'bg-gradient-to-r from-primary to-purple-600 text-white border-primary'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white/50'
                        )}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Produit actif</p>
                    <p className="text-xs text-gray-500">Visible lors de la création de facture</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set('is_active', !form.is_active)}
                    className={cn(
                      'w-12 h-7 rounded-full transition-all duration-200 relative flex-shrink-0',
                      form.is_active ? 'bg-gradient-to-r from-primary to-purple-600' : 'bg-gray-300'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-200',
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
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-60"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={18} />
                      {editingId ? 'Enregistrer' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Assistant Modal */}
      <AnimatePresence>
        {showVoiceAssistant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20"
            >
              <VoiceAssistant
                onResult={(data) => {
                  handleVoiceResult(data);
                  setShowVoiceAssistant(false);
                }}
                onClose={() => setShowVoiceAssistant(false)}
                isPro={canUseVoice}
                mode="product"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
