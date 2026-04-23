'use client';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, formatCurrency, formatDateShort } from '@/lib/utils';
import {
  RefreshCw, Plus, Trash2, Edit2, Mail, Calendar,
  Clock, DollarSign, TrendingUp, Users, Check,
  X, Sparkles, Zap, Bell, Settings, Play, Pause,
  FileText, CreditCard, AlertCircle, ChevronDown,
  Filter, Search, Eye, Copy, MoreHorizontal, Mic, Send, AtSign,
} from 'lucide-react';
import { VoiceInput } from '@/components/ui/VoiceInput'; // Gardé pour compatibilité mais plus utilisé
import { VoiceAssistant, VoiceAnalysisResult } from '@/components/ui/VoiceAssistant';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { DatePicker } from '@/components/ui/DatePicker';

interface RecurringInvoice {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name_override: string | null;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_run_date: string;
  is_active: boolean;
  email_config: {
    enabled: boolean;
    subject: string;
    message: string;
    send_before_days: number;
  } | null;
  items: Array<{
    id: string;
    name: string;
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }>;
  client?: {
    id: string;
    name: string;
    email: string;
    company_name: string;
  };
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  company_name: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Hebdomadaire', icon: Clock, color: 'from-blue-500 to-cyan-500', days: 7 },
  { value: 'monthly', label: 'Mensuel', icon: Calendar, color: 'from-purple-500 to-pink-500', days: 30 },
  { value: 'quarterly', label: 'Trimestriel', icon: Calendar, color: 'from-orange-500 to-red-500', days: 90 },
  { value: 'yearly', label: 'Annuel', icon: Sparkles, color: 'from-emerald-500 to-teal-500', days: 365 },
];

const GlassCard = ({ children, className, hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/20 dark:border-white/10 rounded-3xl shadow-xl',
      hover && 'hover:shadow-2xl hover:scale-[1.01] hover:border-white/30 transition-all duration-300 cursor-pointer',
      className
    )}
  >
    {children}
  </motion.div>
);

const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
  color
}: {
  icon: any;
  label: string;
  value: string | number;
  trend?: string;
  color: string;
}) => (
  <GlassCard className="p-5">
    <div className="flex items-start justify-between mb-3">
      <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg', color)}>
        <Icon size={22} className="text-white" />
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          <TrendingUp size={10} />
          {trend}
        </span>
      )}
    </div>
    <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
  </GlassCard>
);

export default function RecurringInvoicesPage() {
  const { user } = useAuthStore();
  const { canUseVoice } = useSubscription();
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringInvoice | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    client_id: '',
    client_name_override: '',
    frequency: 'monthly' as RecurringInvoice['frequency'],
    start_date: new Date().toISOString().split('T')[0],
    items: [{ name: '', description: '', quantity: 1, unit_price: '', vat_rate: 20 }],
    is_active: true,
    email_enabled: true,
    email_subject: 'Votre facture récurrente',
    email_message: 'Bonjour {{client_name}},\n\nVeuillez trouver ci-joint votre facture récurrente.\n\nCordialement.',
    email_send_before_days: 3,
  });

  useEffect(() => {
    if (user) {
      fetchRecurringInvoices();
      fetchClients();
    }
  }, [user]);

  const fetchRecurringInvoices = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.warn('Supabase client not available');
        setRecurringInvoices([]);
        return;
      }

      // Vérifier d'abord si la table existe
      const { data, error, status } = await supabase
        .from('recurring_invoices')
        .select('*, client:clients(id, name, email, company_name)')
        .order('next_run_date', { ascending: true })
        .limit(1);

      // Si la table n'existe pas
      if (error) {
        if (error.code === '42P01' || status === 404 || error.message.includes('does not exist')) {
          console.log('Recurring invoices table does not exist yet');
          setRecurringInvoices([]);
          return;
        }
        throw error;
      }

      // Récupérer toutes les factures récurrentes
      const { data: allInvoices, error: allError } = await supabase
        .from('recurring_invoices')
        .select('*, client:clients(id, name, email, company_name)')
        .order('next_run_date', { ascending: true });

      if (allError) throw allError;
      setRecurringInvoices(allInvoices || []);
    } catch (e: any) {
      console.error('Error fetching recurring invoices:', e);
      // Pas de toast d'erreur pour les problèmes de connexion
      if (e.message && !e.message.includes('Failed to fetch')) {
        toast.error('Erreur lors du chargement des factures récurrentes');
      }
      setRecurringInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setClients([]);
        return;
      }

      // Vérifier d'abord si la table existe
      const { data, error, status } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })
        .limit(1);

      // Si la table n'existe pas
      if (error) {
        if (error.code === '42P01' || status === 404 || error.message.includes('does not exist')) {
          console.log('Clients table does not exist yet');
          setClients([]);
          return;
        }
        throw error;
      }

      // Récupérer tous les clients
      const { data: allClients, error: allError } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (allError) throw allError;
      setClients(allClients || []);
    } catch (e: any) {
      console.error('Error fetching clients:', e);
      setClients([]);
    }
  };

  const handleVoiceResult = (data: VoiceAnalysisResult) => {
    // Find client by name if provided
    let clientId = form.client_id;
    let clientNameOverride = form.client_name_override;

    if (data.client) {
      const matchingClient = clients.find(c =>
        c.name.toLowerCase().includes(data.client!.toLowerCase()) ||
        c.name.toLowerCase() === data.client!.toLowerCase()
      );
      if (matchingClient) {
        clientId = matchingClient.id;
        clientNameOverride = matchingClient.name;
      } else {
        clientId = '';
        clientNameOverride = data.client;
      }
    }

    // Set frequency if provided
    const frequencyMap: Record<string, RecurringInvoice['frequency']> = {
      'hebdomadaire': 'weekly',
      'mensuel': 'monthly',
      'trimestrielle': 'quarterly',
      'annuelle': 'yearly',
    };

    // Build new item from voice data
    const newItem = {
      name: data.name || '',
      description: data.description || '',
      quantity: data.quantity || 1,
      unit_price: data.price ? String(data.price) : '',
      vat_rate: data.vatRate || 20,
    };

    // Only update form if we have meaningful data
    const updates: any = {};

    if (clientId) updates.client_id = clientId;
    if (clientNameOverride) updates.client_name_override = clientNameOverride;
    if (data.frequency && frequencyMap[data.frequency]) updates.frequency = frequencyMap[data.frequency];
    if (data.startDate) updates.start_date = data.startDate;

    // Update items: replace first empty item or add new one
    const hasEmptyItem = form.items.length === 1 && !form.items[0].name;
    updates.items = hasEmptyItem
      ? [newItem]
      : [...form.items, newItem];

    setForm({
      ...form,
      ...updates,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const total_amount = form.items.reduce((sum, item) =>
        sum + (item.quantity * parseFloat(item.unit_price || '0')), 0
      );

      const payload = {
        user_id: user.id,
        client_id: form.client_id || null,
        client_name_override: form.client_name_override || null,
        frequency: form.frequency,
        next_run_date: new Date(form.start_date).toISOString(),
        is_active: form.is_active,
        email_config: {
          enabled: form.email_enabled,
          subject: form.email_subject,
          message: form.email_message,
          send_before_days: form.email_send_before_days,
        },
        items: form.items.map(item => ({
          id: crypto.randomUUID(),
          name: item.name,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price || '0'),
          vat_rate: item.vat_rate,
        })),
      };

      if (editingId) {
        const { error } = await supabase
          .from('recurring_invoices')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Facture récurrente mise à jour');
      } else {
        const { error } = await supabase
          .from('recurring_invoices')
          .insert(payload)
          .select();
        if (error) throw error;
        toast.success('Facture récurrente créée');
      }

      setShowCreateModal(false);
      setEditingId(null);
      fetchRecurringInvoices();
    } catch (e: any) {
      console.error('Error saving recurring invoice:', e);
      toast.error(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette facture récurrente ?')) return;
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('recurring_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRecurringInvoices(ri => ri.filter(r => r.id !== id));
      toast.success('Facture récurrente supprimée');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('recurring_invoices')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      setRecurringInvoices(ri => ri.map(r =>
        r.id === id ? { ...r, is_active: !isActive } : r
      ));
      toast.success(isActive ? 'Facture pause' : 'Facture activée');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la modification');
    }
  };

  const filteredInvoices = useMemo(() => {
    return recurringInvoices.filter(ri => {
      const matchesSearch = search === '' ||
        ri.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
        ri.client_name_override?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterStatus === 'all' ||
        (filterStatus === 'active' && ri.is_active) ||
        (filterStatus === 'paused' && !ri.is_active);
      return matchesSearch && matchesFilter;
    });
  }, [recurringInvoices, search, filterStatus]);

  // Stats calculations
  const totalRecurring = recurringInvoices.length;
  const activeRecurring = recurringInvoices.filter(ri => ri.is_active).length;
  const estimatedMonthlyRevenue = useMemo(() => {
    return recurringInvoices.reduce((sum, ri) => {
      if (!ri.is_active) return sum;
      const itemTotal = ri.items?.reduce((s, i) => s + i.quantity * i.unit_price, 0) || 0;
      const monthlyMultiplier = {
        weekly: 4.33,
        monthly: 1,
        quarterly: 1/3,
        yearly: 1/12,
      }[ri.frequency] || 1;
      return sum + (itemTotal * monthlyMultiplier);
    }, 0);
  }, [recurringInvoices]);

  const getFrequencyConfig = (freq: RecurringInvoice['frequency']) =>
    FREQUENCY_OPTIONS.find(f => f.value === freq) || FREQUENCY_OPTIONS[1];

  return (
    <div className="space-y-6 p-4 min-h-screen">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Factures récurrentes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Automatisez vos factures périodiques et gagnez du temps
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({
              client_id: '',
              client_name_override: '',
              frequency: 'monthly',
              start_date: new Date().toISOString().split('T')[0],
              items: [{ name: '', description: '', quantity: 1, unit_price: '', vat_rate: 20 }],
              is_active: true,
              email_enabled: true,
              email_subject: 'Votre facture récurrente',
              email_message: 'Bonjour {{client_name}},\n\nVeuillez trouver ci-joint votre facture récurrente.\n\nCordialement.',
              email_send_before_days: 3,
            });
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          <Plus size={16} />
          Nouvelle récurrente
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={RefreshCw}
          label="Total récurrentes"
          value={totalRecurring}
          color="from-blue-500 to-cyan-500"
        />
        <StatCard
          icon={Play}
          label="Actives"
          value={activeRecurring}
          trend={totalRecurring > 0 ? `${Math.round(activeRecurring / totalRecurring * 100)}%` : undefined}
          color="from-emerald-500 to-green-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Revenu mensuel estimé"
          value={formatCurrency(estimatedMonthlyRevenue)}
          color="from-purple-500 to-pink-600"
        />
      </div>

      {/* Filters & Search */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border-0 bg-white/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                filterStatus === 'all'
                  ? 'bg-gradient-to-r from-primary to-purple-600 text-white'
                  : 'bg-white/50 text-gray-600 hover:bg-white'
              )}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                filterStatus === 'active'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                  : 'bg-white/50 text-gray-600 hover:bg-white'
              )}
            >
              Actives
            </button>
            <button
              onClick={() => setFilterStatus('paused')}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                filterStatus === 'paused'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                  : 'bg-white/50 text-gray-600 hover:bg-white'
              )}
            >
              En pause
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Recurring Invoices List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400">Chargement...</p>
          </div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={36} className="text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-2">
            {search || filterStatus !== 'all' ? 'Aucun résultat' : 'Aucune facture récurrente'}
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            {search || filterStatus !== 'all'
              ? 'Modifiez vos filtres pour voir plus de résultats'
              : 'Créez votre première facture récurrente pour automatiser vos facturations'}
          </p>
          {!search && filterStatus === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Plus size={18} />
              Créer une récurrente
            </button>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {filteredInvoices.map((invoice, idx) => {
              const freqConfig = getFrequencyConfig(invoice.frequency);
              const FreqIcon = freqConfig.icon;
              const totalAmount = invoice.items?.reduce((sum, item) =>
                sum + (item.quantity * item.unit_price), 0
              ) || 0;

              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <GlassCard hover className="overflow-hidden group">
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={cn(
                          'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg',
                          'bg-gradient-to-br ' + freqConfig.color
                        )}>
                          <FreqIcon size={24} className="text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg">
                                {invoice.client?.name || invoice.client_name_override || 'Sans client'}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                  'text-xs font-semibold px-2 py-1 rounded-full',
                                  invoice.is_active
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                )}>
                                  {invoice.is_active ? 'Active' : 'En pause'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {freqConfig.label}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleToggleActive(invoice.id, invoice.is_active)}
                                className={cn(
                                  'p-2 rounded-xl transition-colors',
                                  invoice.is_active
                                    ? 'hover:bg-amber-100 text-gray-400 hover:text-amber-600'
                                    : 'hover:bg-emerald-100 text-gray-400 hover:text-emerald-600'
                                )}
                                title={invoice.is_active ? 'Mettre en pause' : 'Activer'}
                              >
                                {invoice.is_active ? <Pause size={16} /> : <Play size={16} />}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRecurring(invoice);
                                  setShowEmailConfigModal(true);
                                }}
                                className="p-2 rounded-xl hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Configuration email"
                              >
                                <Mail size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(invoice.id);
                                  setForm({
                                    client_id: invoice.client_id || '',
                                    client_name_override: invoice.client_name_override || '',
                                    frequency: invoice.frequency,
                                    start_date: invoice.next_run_date.split('T')[0],
                                    items: invoice.items?.map(item => ({ ...item, unit_price: String(item.unit_price) }))
                                      || [{ name: '', description: '', quantity: 1, unit_price: '', vat_rate: 20 }],
                                    is_active: invoice.is_active,
                                    email_enabled: invoice.email_config?.enabled ?? true,
                                    email_subject: invoice.email_config?.subject || '',
                                    email_message: invoice.email_config?.message || '',
                                    email_send_before_days: invoice.email_config?.send_before_days ?? 3,
                                  });
                                  setShowCreateModal(true);
                                }}
                                className="p-2 rounded-xl hover:bg-primary/10 text-gray-400 hover:text-primary transition-colors"
                                title="Modifier"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(invoice.id)}
                                className="p-2 rounded-xl hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3">
                              <p className="text-xs text-gray-500 mb-1">Montant</p>
                              <p className="text-lg font-black text-gray-900">
                                {formatCurrency(totalAmount)}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3">
                              <p className="text-xs text-gray-500 mb-1">Prochain envoi</p>
                              <p className="text-sm font-bold text-gray-900">
                                {formatDateShort(invoice.next_run_date)}
                              </p>
                            </div>
                          </div>

                          {/* Email config badge */}
                          {invoice.email_config?.enabled && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                              <Mail size={12} />
                              <span>Email activé ({invoice.email_config.send_before_days}j avant)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/20"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingId ? 'Modifier' : 'Nouvelle'} facture récurrente
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Configurez l'automatisation de vos factures périodiques
                  </p>
                </div>
                {canUseVoice && !editingId && (
                  <button
                    onClick={() => setShowVoiceAssistant(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:shadow-lg transition-all"
                  >
                    <Mic size={16} />
                    Créer à la voix
                  </button>
                )}
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Client selection - Improved with CustomSelect */}
                <div>
                  <CustomSelect
                    options={[
                      { value: '', label: 'Sélectionner un client...' },
                      ...clients.map(client => ({
                        value: client.id,
                        label: client.name || client.company_name,
                        description: client.email || '',
                      }))
                    ]}
                    value={form.client_id}
                    onChange={(value) => {
                      const client = clients.find(c => c.id === value);
                      setForm({
                        ...form,
                        client_id: value,
                        client_name_override: client?.name || '',
                      });
                    }}
                    placeholder="Sélectionner un client..."
                    label="Client *"
                    icon={AtSign}
                    variant="client"
                  />
                  {form.client_id && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-1">
                      <Check size={12} className="text-green-500" />
                      <span>{clients.find(c => c.id === form.client_id)?.name || 'Client sélectionné'}</span>
                    </div>
                  )}
                </div>

                {/* Frequency */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3">
                    Fréquence
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FREQUENCY_OPTIONS.map(freq => {
                      const Icon = freq.icon;
                      return (
                        <button
                          key={freq.value}
                          type="button"
                          onClick={() => setForm({ ...form, frequency: freq.value as any })}
                          className={cn(
                            'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                            form.frequency === freq.value
                              ? 'border-primary bg-gradient-to-br from-primary/10 to-purple-600/10'
                              : 'border-gray-200 hover:border-gray-300 bg-white/50'
                          )}
                        >
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                            form.frequency === freq.value ? 'bg-gradient-to-br ' + freq.color : 'bg-gray-100'
                          )}>
                            <Icon size={14} className={form.frequency === freq.value ? 'text-white' : 'text-gray-500'} />
                          </div>
                          <span className={cn('text-xs font-semibold',
                            form.frequency === freq.value ? 'text-primary' : 'text-gray-600'
                          )}>
                            {freq.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Start date */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                    Date de première génération
                  </label>
                  <DatePicker
                    value={form.start_date}
                    onChange={(value) => setForm({ ...form, start_date: value })}
                    placeholder="Sélectionner la date de première génération"
                  />
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                      <FileText size={14} className="text-purple-600" />
                      Articles
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        items: [...form.items, { name: '', description: '', quantity: 1, unit_price: '', vat_rate: 20 }]
                      })}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-semibold shadow hover:shadow-lg transition-all"
                    >
                      <Plus size={12} />
                      Ajouter
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.items.map((item, idx) => {
                      const itemTotal = (item.quantity || 0) * (parseFloat(item.unit_price as string) || 0);
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gradient-to-br from-gray-50 to-white dark:from-slate-800/50 dark:to-slate-800 rounded-2xl p-5 space-y-4 border border-gray-200 dark:border-white/10 hover:border-primary/30 transition-all"
                        >
                          {/* Article header */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                {idx + 1}
                              </span>
                              Article {idx + 1}
                            </span>
                            {form.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = form.items.filter((_, i) => i !== idx);
                                  setForm({ ...form, items: newItems });
                                }}
                                className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          {/* Name */}
                          <div className="space-y-2">
                            <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Nom de l'article *</label>
                            <input
                              placeholder="Ex: Développement site web v3"
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...form.items];
                                newItems[idx].name = e.target.value;
                                setForm({ ...form, items: newItems });
                              }}
                              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              required
                            />
                          </div>

                          {/* Description */}
                          <div className="space-y-2">
                            <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Description</label>
                            <textarea
                              placeholder="Description détaillée..."
                              value={item.description}
                              onChange={(e) => {
                                const newItems = [...form.items];
                                newItems[idx].description = e.target.value;
                                setForm({ ...form, items: newItems });
                              }}
                              rows={2}
                              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                            />
                          </div>

                          {/* Price and quantity */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Prix HT (€) *</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">€</span>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={item.unit_price}
                                  onChange={(e) => {
                                    const newItems = [...form.items];
                                    newItems[idx].unit_price = e.target.value;
                                    setForm({ ...form, items: newItems });
                                  }}
                                  className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                  required
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Quantité</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...form.items];
                                  newItems[idx].quantity = parseInt(e.target.value) || 1;
                                  setForm({ ...form, items: newItems });
                                }}
                                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                min="1"
                              />
                            </div>
                            <div className="space-y-2">
                              <CustomSelect
                                options={[
                                  { value: '0', label: '0%' },
                                  { value: '5.5', label: '5.5%' },
                                  { value: '10', label: '10%' },
                                  { value: '20', label: '20%' },
                                ]}
                                value={String(item.vat_rate)}
                                onChange={(value) => {
                                  const newItems = [...form.items];
                                  newItems[idx].vat_rate = parseFloat(value);
                                  setForm({ ...form, items: newItems });
                                }}
                                placeholder="TVA"
                                className="!py-3"
                              />
                            </div>
                          </div>

                          {/* Item total */}
                          <div className="pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Total ligne</span>
                            <span className="text-sm font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                              {formatCurrency(itemTotal)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Email config - Enhanced Design */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-gray-100 dark:border-white/10 bg-white dark:bg-slate-800/50">
                  {/* Header */}
                  <div className="relative p-5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMTAiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-10" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Mail size={22} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">Automatisation par email</h3>
                          <p className="text-xs text-white/80">Envoyez vos factures automatiquement</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, email_enabled: !form.email_enabled })}
                        className={cn(
                          'relative px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2',
                          form.email_enabled
                            ? 'bg-white text-purple-600 shadow-lg'
                            : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
                        )}
                      >
                        <Send size={16} />
                        {form.email_enabled ? 'Activé' : 'Désactivé'}
                        <div className={cn(
                          'absolute w-5 h-5 rounded-full transition-all',
                          form.email_enabled ? 'right-1 bg-green-400' : 'left-1 bg-white/50'
                        )} />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  {form.email_enabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-5 space-y-4"
                    >
                      {/* Subject with icon */}
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                            <AtSign size={12} className="text-blue-600" />
                          </span>
                          Sujet de l'email
                        </label>
                        <input
                          placeholder="Votre facture récurrente"
                          value={form.email_subject}
                          onChange={(e) => setForm({ ...form, email_subject: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                        />
                      </div>

                      {/* Message with template variables */}
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                            <FileText size={12} className="text-purple-600" />
                          </span>
                          Message personnalisé
                        </label>
                        <textarea
                          placeholder="Bonjour {{client_name}},&#10;&#10;Veuillez trouver ci-joint votre facture..."
                          value={form.email_message}
                          onChange={(e) => setForm({ ...form, email_message: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {[
                            { var: '{{client_name}}', label: 'Nom du client', color: 'bg-pink-100 text-pink-700' },
                            { var: '{{amount}}', label: 'Montant', color: 'bg-green-100 text-green-700' },
                            { var: '{{due_date}}', label: 'Date d\'échéance', color: 'bg-blue-100 text-blue-700' },
                            { var: '{{invoice_id}}', label: 'ID facture', color: 'bg-purple-100 text-purple-700' },
                          ].map((v) => (
                            <button
                              key={v.var}
                              type="button"
                              onClick={() => {
                                setForm({ ...form, email_message: (form.email_message || '') + ' ' + v.var });
                              }}
                              className={cn(
                                'px-2 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105',
                                v.color
                              )}
                            >
                              +{v.var}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Timing */}
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1 flex items-center gap-2">
                              <Clock size={14} className="text-amber-600" />
                              Envoi automatique
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Jours avant la date d'échéance
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, email_send_before_days: Math.max(0, form.email_send_before_days - 1) })}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-white/10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <input
                              type="number"
                              value={form.email_send_before_days}
                              onChange={(e) => setForm({ ...form, email_send_before_days: parseInt(e.target.value) || 0 })}
                              className="w-16 text-center px-2 py-2 rounded-xl border-2 border-gray-300 dark:border-white/10 bg-white dark:bg-slate-800 text-sm font-bold text-gray-900 dark:text-white"
                              min="0"
                              max="30"
                            />
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, email_send_before_days: Math.min(30, form.email_send_before_days + 1) })}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-white/10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                              <ChevronDown size={16} className="rotate-180" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                      {editingId ? 'Mettre à jour' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Config Quick Modal */}
      <AnimatePresence>
        {showEmailConfigModal && selectedRecurring && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowEmailConfigModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border border-white/20"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Mail size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Configuration email</h3>
                    <p className="text-sm text-gray-500">
                      {selectedRecurring.client?.name || selectedRecurring.client_name_override}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Email automatique</span>
                      <span className={cn(
                        'text-xs font-semibold px-2 py-1 rounded-full',
                        selectedRecurring.email_config?.enabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-200 text-gray-600'
                      )}>
                        {selectedRecurring.email_config?.enabled ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                    {selectedRecurring.email_config?.enabled && (
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        <p><strong>Sujet:</strong> {selectedRecurring.email_config.subject}</p>
                        <p><strong>Envoi:</strong> {selectedRecurring.email_config.send_before_days} jours avant</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setShowEmailConfigModal(false);
                      setEditingId(selectedRecurring.id);
                      setForm({
                        client_id: selectedRecurring.client_id || '',
                        client_name_override: selectedRecurring.client_name_override || '',
                        frequency: selectedRecurring.frequency,
                        start_date: selectedRecurring.next_run_date.split('T')[0],
                        items: selectedRecurring.items?.map(item => ({ ...item, unit_price: String(item.unit_price) }))
                          || [{ name: '', description: '', quantity: 1, unit_price: '', vat_rate: 20 }],
                        is_active: selectedRecurring.is_active,
                        email_enabled: selectedRecurring.email_config?.enabled ?? true,
                        email_subject: selectedRecurring.email_config?.subject || '',
                        email_message: selectedRecurring.email_config?.message || '',
                        email_send_before_days: selectedRecurring.email_config?.send_before_days ?? 3,
                      });
                      setShowCreateModal(true);
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white text-sm font-semibold hover:shadow-lg transition-all"
                  >
                    Modifier la configuration
                  </button>

                  <button
                    onClick={() => setShowEmailConfigModal(false)}
                    className="w-full py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
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
                mode="recurring"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
