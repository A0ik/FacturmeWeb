'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, Plus, Trash2, Mail, Calendar, Clock,
  Sparkles, Check, DollarSign, FileText, Save,
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  company_name: string;
}

interface InvoiceItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Hebdomadaire', icon: Clock, color: 'from-blue-500 to-cyan-500', days: 7 },
  { value: 'monthly', label: 'Mensuel', icon: Calendar, color: 'from-purple-500 to-pink-500', days: 30 },
  { value: 'quarterly', label: 'Trimestriel', icon: Calendar, color: 'from-orange-500 to-red-500', days: 90 },
  { value: 'yearly', label: 'Annuel', icon: Sparkles, color: 'from-emerald-500 to-teal-500', days: 365 },
];

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/20 dark:border-white/10 rounded-3xl shadow-xl',
      className
    )}
  >
    {children}
  </motion.div>
);

export default function NewRecurringPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [form, setForm] = useState({
    client_id: '',
    client_name_override: '',
    frequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ id: crypto.randomUUID(), name: '', description: '', quantity: 1, unit_price: 0, vat_rate: 20 }] as InvoiceItem[],
    notes: '',
    is_active: true,
    email_enabled: true,
    email_subject: 'Votre facture récurrente',
    email_message: 'Bonjour {{client_name}},\n\nVeuillez trouver ci-joint votre facture récurrente.\n\nCordialement.',
    email_send_before_days: 3,
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setClients([]);
        setLoading(false);
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
          setLoading(false);
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
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        vat_rate: 20,
      }],
    }));
  };

  const removeItem = (id: string) => {
    if (form.items.length === 1) return;
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

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
          id: item.id,
          name: item.name,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: typeof item.unit_price === 'number' ? item.unit_price : (typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price as string)) || 0,
          vat_rate: item.vat_rate,
        })),
      };

      const { error } = await supabase
        .from('recurring_invoices')
        .insert(payload);

      if (error) throw error;

      toast.success('Facture récurrente créée avec succès');
      router.push('/offline/recurring');
    } catch (e: any) {
      console.error('Error creating recurring invoice:', e);
      toast.error(e.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const subtotal = form.items.reduce((sum, item) =>
    sum + (item.quantity * (typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price as string)) || 0), 0
  );
  const vatAmount = form.items.reduce((sum, item) => {
    const itemTotal = item.quantity * (typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price as string)) || 0;
    return sum + (itemTotal * item.vat_rate / 100);
  }, 0);
  const total = subtotal + vatAmount;

  return (
    <div className="space-y-6 p-4 min-h-screen">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Retour
        </button>
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Nouvelle facture récurrente
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configurez l'automatisation de vos factures périodiques
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* Client selection */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <FileText size={20} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Client</h2>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white/50"
            />
            <AnimatePresence>
              {showSuggestions && filteredClients.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 z-10 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                >
                  {filteredClients.map(client => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, client_id: client.id, client_name_override: client.name });
                        setSearch(client.name);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <p className="font-semibold text-gray-900">{client.name}</p>
                      {client.company_name && (
                        <p className="text-xs text-gray-500">{client.company_name}</p>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>

        {/* Frequency */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Calendar size={20} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Fréquence et date</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
            {FREQUENCY_OPTIONS.map(freq => {
              const Icon = freq.icon;
              return (
                <button
                  key={freq.value}
                  type="button"
                  onClick={() => setForm({ ...form, frequency: freq.value as any })}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    form.frequency === freq.value
                      ? 'border-primary bg-gradient-to-br from-primary/10 to-purple-600/10 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 bg-white/50'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
                    form.frequency === freq.value ? 'bg-gradient-to-br ' + freq.color : 'bg-gray-100'
                  )}>
                    <Icon size={18} className={form.frequency === freq.value ? 'text-white' : 'text-gray-500'} />
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

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
              Date de première génération
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white/50"
            />
          </div>
        </GlassCard>

        {/* Items */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <DollarSign size={20} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Articles</h2>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <Plus size={16} />
              Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {form.items.map((item, idx) => (
              <div key={item.id} className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Article {idx + 1}
                  </span>
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input
                  placeholder="Nom de l'article"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  required
                />
                <textarea
                  placeholder="Description (optionnel)"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none bg-white"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Quantité</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Prix HT (€)</label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">TVA (%)</label>
                    <select
                      value={item.vat_rate}
                      onChange={(e) => updateItem(item.id, 'vat_rate', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                    >
                      <option value="0">0%</option>
                      <option value="5.5">5.5%</option>
                      <option value="10">10%</option>
                      <option value="20">20%</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Sous-total HT</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>TVA</span>
                <span className="font-semibold">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-xl font-black text-gray-900 pt-2 border-t border-gray-200">
                <span>Total TTC</span>
                <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Email configuration */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Mail size={20} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Configuration email</h2>
            <button
              type="button"
              onClick={() => setForm({ ...form, email_enabled: !form.email_enabled })}
              className={cn(
                'ml-auto w-12 h-7 rounded-full transition-all relative flex-shrink-0',
                form.email_enabled ? 'bg-gradient-to-r from-primary to-purple-600' : 'bg-gray-300'
              )}
            >
              <span className={cn(
                'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all',
                form.email_enabled ? 'left-6' : 'left-1'
              )} />
            </button>
          </div>

          {form.email_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs text-gray-500 block mb-2">Sujet de l'email</label>
                <input
                  type="text"
                  value={form.email_subject}
                  onChange={(e) => setForm({ ...form, email_subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-2">Message</label>
                <textarea
                  value={form.email_message}
                  onChange={(e) => setForm({ ...form, email_message: e.target.value })}
                  placeholder="Utilisez {{client_name}} pour le nom du client..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none bg-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variables disponibles: {'{{client_name}}'}, {'{{amount}}'}, {'{{due_date}}'}, {'{{invoice_id}}'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-2">
                  Envoyer l'email (jours avant l'échéance)
                </label>
                <input
                  type="number"
                  value={form.email_send_before_days}
                  onChange={(e) => setForm({ ...form, email_send_before_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  min="0"
                  max="30"
                />
              </div>
            </motion.div>
          )}
        </GlassCard>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-4 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                Créer la facture récurrente
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
