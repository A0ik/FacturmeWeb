'use client';
import React from 'react';
import { toast } from 'sonner';
import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDateShort, getInitials, cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase';
import { Pencil, Trash2, FileText, Plus, Tag, MessageSquare, X, Globe, Copy, Check, Star, TrendingUp, Clock, Upload, Camera, ArrowLeft, Mail, Phone, MapPin, Building2, FileCheck, AlertCircle } from 'lucide-react';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
];

interface ClientNote {
  id: string;
  client_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { clients, invoices, updateClient, deleteClient } = useDataStore();
  const { user } = useAuthStore();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [portalUrl, setPortalUrl] = useState('');
  const [portalCopied, setPortalCopied] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Tags state
  const [tagInput, setTagInput] = useState('');
  const [savingTags, setSavingTags] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const client = clients.find((c) => c.id === id);

  const [form, setForm] = useState({
    name: client?.name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    address: client?.address ?? '',
    city: client?.city ?? '',
    postal_code: client?.postal_code ?? '',
    country: client?.country ?? 'France',
    siret: client?.siret ?? '',
    vat_number: client?.vat_number ?? '',
  });

  // Fetch notes on mount — must be before early return (Rules of Hooks)
  useEffect(() => {
    const fetchNotes = async () => {
      setLoadingNotes(true);
      try {
        const { data, error } = await getSupabaseClient()
          .from('client_notes')
          .select('*')
          .eq('client_id', id)
          .order('created_at', { ascending: false });
        if (!error && data) setNotes(data);
      } catch (e) {
        // silently fail
      } finally {
        setLoadingNotes(false);
      }
    };
    fetchNotes();
  }, [id]);

  if (!client) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Client introuvable</p>
      <Link href="/clients" className="mt-3 text-primary font-semibold text-sm hover:underline block">Retour</Link>
    </div>
  );

  const clientInvoices = invoices.filter((inv) => inv.client_id === id);
  const totalRevenue = clientInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await updateClient(id, form); setShowEdit(false); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    await deleteClient(id);
    router.push('/clients');
  };

  // Logo upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image valide (JPG, PNG, etc.).');
      return;
    }

    setUploadingLogo(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Non authentifié');

      const fileExt = file.name.split('.').pop();
      const fileName = `${id}.${fileExt}`;
      const filePath = `client-logos/${session.user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('client-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('client-logos')
        .getPublicUrl(filePath);

      // Update client record
      await updateClient(id, { logo_url: publicUrl } as any);
      toast.success('Logo mis à jour avec succès !');
    } catch (e: any) {
      console.error('Logo upload error:', e);
      toast.error(e.message || 'Erreur lors du téléchargement du logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Tag handlers
  const handleAddTag = async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const currentTags: string[] = (client as any).tags || [];
    if (currentTags.includes(trimmed)) { setTagInput(''); return; }
    const newTags = [...currentTags, trimmed];
    setSavingTags(true);
    try {
      await updateClient(id, { tags: newTags } as any);
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingTags(false); setTagInput(''); }
  };

  const handleRemoveTag = async (tag: string) => {
    const currentTags: string[] = (client as any).tags || [];
    const newTags = currentTags.filter((t) => t !== tag);
    setSavingTags(true);
    try {
      await updateClient(id, { tags: newTags } as any);
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingTags(false); }
  };

  // Note handlers
  const handleAddNote = async () => {
    const content = noteInput.trim();
    if (!content || !user) return;
    setAddingNote(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from('client_notes')
        .insert({ client_id: id, user_id: user.id, content })
        .select()
        .single();
      if (error) throw new Error(error.message);
      setNotes((prev) => [data, ...prev]);
      setNoteInput('');
    } catch (e: any) { toast.error(e.message); }
    finally { setAddingNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await getSupabaseClient()
        .from('client_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw new Error(error.message);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e: any) { toast.error(e.message); }
  };

  const handleGeneratePortal = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) throw new Error('Non authentifié');
      const res = await fetch('/api/client-portal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ clientId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const url = `${window.location.origin}/client/${data.token}`;
      setPortalUrl(url);
      navigator.clipboard.writeText(url).catch(() => {});
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 3000);
    } catch (e: any) { toast.error(e.message); }
    finally { setPortalLoading(false); }
  };

  const clientTags: string[] = (client as any).tags || [];

  // Scoring client
  const paidInvoices = clientInvoices.filter((i) => i.status === 'paid' && i.paid_at && i.due_date);
  const avgPaymentDays = paidInvoices.length > 0
    ? paidInvoices.reduce((s, inv) => {
        const paid = new Date(inv.paid_at!).getTime();
        const due = new Date(inv.due_date!).getTime();
        return s + Math.max(0, (paid - due) / (1000 * 60 * 60 * 24));
      }, 0) / paidInvoices.length
    : null;
  const paymentRate = clientInvoices.length > 0
    ? (clientInvoices.filter((i) => i.status === 'paid').length / clientInvoices.filter((i) => i.status !== 'draft').length) * 100
    : null;
  const clientScore = (() => {
    if (clientInvoices.filter((i) => i.status !== 'draft').length === 0) return null;
    let score = 100;
    if (avgPaymentDays !== null) score -= Math.min(40, avgPaymentDays * 2);
    if (paymentRate !== null) score -= (100 - paymentRate) * 0.5;
    if (clientInvoices.some((i) => i.status === 'overdue')) score -= 15;
    return Math.max(0, Math.round(score));
  })();
  const scoreColor = clientScore === null ? '' : clientScore >= 80 ? 'text-green-600' : clientScore >= 60 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = clientScore === null ? '' : clientScore >= 80 ? 'bg-green-50 border-green-100' : clientScore >= 60 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';
  const scoreLabel = clientScore === null ? '—' : clientScore >= 80 ? 'Excellent' : clientScore >= 60 ? 'Moyen' : 'Risqué';

  const GlassCard = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'relative bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden',
        'shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
      {children}
    </motion.div>
  );

  const StatCard = ({ title, value, subtitle, icon: Icon, gradient, delay = 0 }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: any;
    gradient: string;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className={cn('relative overflow-hidden rounded-3xl p-5 border border-white/20 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 group', gradient)}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <Icon size={18} className="text-white/80" />
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 3 }}
          >
            <FileCheck size={16} className="text-white/60" />
          </motion.div>
        </div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-xs text-white/70 mt-0.5">{title}</p>
        <p className="text-[10px] text-white/50 mt-1">{subtitle}</p>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/[0.02] dark:bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/[0.02] dark:bg-purple-500/[0.03] rounded-full blur-3xl" />
      </div>

      {/* Header with glass effect */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Link
            href="/clients"
            className="flex items-center justify-center w-12 h-12 rounded-2xl border border-white/20 bg-white/70 dark:bg-white/5 backdrop-blur-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-white/30 hover:bg-white/80 dark:hover:bg-white/10 transition-all shadow-lg hover:shadow-xl"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">{client.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Fiche client</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={portalLoading}
            icon={portalCopied ? <Check size={14} className="text-green-500" /> : <Globe size={14} />}
            onClick={handleGeneratePortal}
            className="backdrop-blur-xl bg-white/70 border-white/20"
          >
            {portalCopied ? 'Copié !' : 'Portail'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Pencil size={14} />}
            onClick={() => setShowEdit(true)}
            className="backdrop-blur-xl bg-white/70 border-white/20"
          >
            Modifier
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={() => setShowDelete(true)}
          >
            Supprimer
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Factures"
          value={clientInvoices.length}
          subtitle={`${clientInvoices.filter((i) => i.status === 'paid').length} payée(s)`}
          icon={FileText}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          delay={0}
        />
        <StatCard
          title="CA encaissé"
          value={formatCurrency(totalRevenue)}
          subtitle={`sur ${formatCurrency(clientInvoices.reduce((s, i) => s + i.total, 0))} total`}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          delay={0.1}
        />
        <StatCard
          title="En attente"
          value={clientInvoices.filter((i) => i.status === 'sent').length}
          subtitle={clientInvoices.filter((i) => i.status === 'overdue').length > 0 ? `${clientInvoices.filter((i) => i.status === 'overdue').length} en retard` : 'À jour'}
          icon={Clock}
          gradient={clientInvoices.some((i) => i.status === 'overdue') ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-amber-500 to-amber-600'}
          delay={0.2}
        />
      </div>

      {/* Client score */}
      {clientScore !== null && (
        <GlassCard delay={0.3} className={cn('p-5', scoreBg)}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                <Star size={18} className={scoreColor} />
              </motion.div>
              <h3 className="font-bold text-gray-900 dark:text-white">Score de confiance</h3>
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                className={cn('text-3xl font-black', scoreColor)}
              >
                {clientScore}
              </motion.span>
              <span className={cn('text-xs font-bold px-3 py-1 rounded-full border', scoreBg, scoreColor)}>{scoreLabel}</span>
            </div>
          </div>
          <div className="relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${clientScore}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={cn('absolute inset-y-0 left-0 rounded-full', clientScore >= 80 ? 'bg-gradient-to-r from-green-400 to-green-500' : clientScore >= 60 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-red-500')}
            />
          </div>
          <div className="flex gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
            {avgPaymentDays !== null && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400" />
                Paiement moyen : <strong className="text-gray-900 dark:text-white">{Math.round(avgPaymentDays)}j après échéance</strong>
              </span>
            )}
            {paymentRate !== null && (
              <span className="flex items-center gap-1.5">
                <TrendingUp size={13} className="text-gray-400" />
                Taux de paiement : <strong className="text-gray-900 dark:text-white">{Math.round(paymentRate)}%</strong>
              </span>
            )}
          </div>
        </GlassCard>
      )}

      {/* Portal URL banner */}
      <AnimatePresence>
        {portalUrl && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-3xl px-5 py-3 backdrop-blur-xl"
          >
            <Globe size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-300 truncate flex-1 font-medium">{portalUrl}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(portalUrl); setPortalCopied(true); setTimeout(() => setPortalCopied(false), 2000); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 rounded-xl hover:bg-green-200 transition-all flex-shrink-0"
            >
              {portalCopied ? <Check size={14} /> : <Copy size={14} />}
              {portalCopied ? 'Copié' : 'Copier'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logo section */}
      <GlassCard delay={0.4} className="p-5">
        <div className="flex items-center gap-5">
          <div className="relative group">
            {client.logo_url ? (
              <img
                src={client.logo_url}
                alt={`Logo ${client.name}`}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-lg group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-2xl font-black shadow-lg group-hover:scale-105 transition-transform duration-300">
                {getInitials(client.name)}
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              title="Modifier le logo"
            >
              {uploadingLogo ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={14} />
              )}
            </motion.button>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Logo du client</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {client.logo_url
                ? 'Cliquez sur l\'icône caméra pour remplacer le logo'
                : 'Ajoutez un logo pour personnaliser les factures de ce client'}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Info */}
      <GlassCard delay={0.5} className="p-5 space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-4">Coordonnées</h3>
        <div className="grid gap-3">
          {client.email && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
              <Mail size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{client.email}</p>
              </div>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
              <Phone size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Téléphone</p>
                <p className="text-sm text-gray-900 dark:text-white font-medium">{client.phone}</p>
              </div>
            </div>
          )}
          {(client.address || client.city || client.postal_code) && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
              <MapPin size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Adresse</p>
                <p className="text-sm text-gray-900 dark:text-white font-medium">{[client.address, client.postal_code, client.city].filter(Boolean).join(', ')}</p>
              </div>
            </div>
          )}
          {client.siret && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
              <Building2 size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">SIRET</p>
                <p className="text-sm text-gray-900 dark:text-white font-medium">{client.siret}</p>
              </div>
            </div>
          )}
          {client.vat_number && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
              <FileCheck size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">N° TVA</p>
                <p className="text-sm text-gray-900 dark:text-white font-medium">{client.vat_number}</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Tags */}
      <GlassCard delay={0.6} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tag size={18} className="text-gray-400" />
          <h3 className="font-bold text-gray-900 dark:text-white">Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {clientTags.length === 0 && (
            <p className="text-sm text-gray-400 italic">Aucun tag. Ajoutez-en ci-dessous.</p>
          )}
          {clientTags.map((tag, i) => (
            <motion.button
              key={tag}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => handleRemoveTag(tag)}
              disabled={savingTags}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105 hover:shadow-lg', TAG_COLORS[i % TAG_COLORS.length])}
              title="Cliquer pour supprimer"
            >
              {tag}
              <X size={12} />
            </motion.button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(tagInput); } }}
            placeholder="Nouveau tag... (Entrée pour ajouter)"
            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all bg-white/50 dark:bg-white/5"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAddTag(tagInput)}
            disabled={!tagInput.trim() || savingTags}
            className="px-4 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-2xl text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-40"
          >
            <Plus size={16} />
          </motion.button>
        </div>
      </GlassCard>

      {/* Invoices */}
      <GlassCard delay={0.7} className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Documents</h3>
          <Link
            href={`/invoices/new?clientId=${id}&clientName=${encodeURIComponent(client.name)}`}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all hover:scale-105"
          >
            <Plus size={16} />
            Nouvelle facture
          </Link>
        </div>
        {clientInvoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
              <FileText size={32} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm text-gray-400">Aucune facture pour ce client</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {clientInvoices.map((inv, idx) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + idx * 0.05 }}
              >
                <Link
                  href={`/invoices/${inv.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{inv.number}</p>
                    <p className="text-xs text-gray-400">{formatDateShort(inv.issue_date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inv.total)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <ArrowLeft size={16} className="text-gray-300 group-hover:text-primary rotate-180 transition-colors" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Notes timeline */}
      <GlassCard delay={0.8} className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <MessageSquare size={18} className="text-gray-400" />
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Notes & suivi</h3>
        </div>

        {/* Add note */}
        <div className="space-y-3 mb-6">
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Ajouter une note ou un suivi..."
            rows={3}
            className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none bg-white/50 dark:bg-white/5"
          />
          <Button
            onClick={handleAddNote}
            loading={addingNote}
            disabled={!noteInput.trim()}
            size="sm"
            icon={<Plus size={16} />}
            className="bg-gradient-to-r from-primary to-primary-dark"
          >
            Ajouter une note
          </Button>
        </div>

        {/* Notes list */}
        {loadingNotes ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm text-gray-400">Aucune note pour ce client</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {notes.map((note, idx) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex gap-4 group"
                >
                  {/* Date column */}
                  <div className="flex-shrink-0 w-24 pt-2">
                    <p className="text-[11px] font-semibold text-gray-400 leading-tight">
                      {new Date(note.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-gray-300">
                      {new Date(note.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {/* Vertical line */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-primary to-primary-dark mt-2 shadow-lg shadow-primary/30"
                    />
                    <div className="w-px flex-1 bg-gradient-to-b from-primary/20 to-transparent mt-2" />
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 relative group/note"
                    >
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteNote(note.id)}
                        className="absolute top-3 right-3 opacity-0 group-hover/note:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Modifier le client" size="lg">
        <form onSubmit={handleUpdate} className="space-y-3">
          <Input label="Nom *" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            <Input label="Téléphone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
          </div>
          <Input label="Adresse" value={form.address} onChange={(e) => setField('address', e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Code postal" value={form.postal_code} onChange={(e) => setField('postal_code', e.target.value)} />
            <Input label="Ville" value={form.city} onChange={(e) => setField('city', e.target.value)} className="col-span-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="SIRET" value={form.siret} onChange={(e) => setField('siret', e.target.value)} />
            <Input label="N° TVA" value={form.vat_number} onChange={(e) => setField('vat_number', e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowEdit(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={loading}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* Delete modal */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Supprimer ce client">
        <p className="text-gray-600 mb-4">Êtes-vous sûr de vouloir supprimer <strong>{client.name}</strong> ? Cette action est irréversible.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>Annuler</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>Supprimer</Button>
        </div>
      </Modal>
    </div>
  );
}
