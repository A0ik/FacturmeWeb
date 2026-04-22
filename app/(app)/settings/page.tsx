'use client';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { getSupabaseClient } from '@/lib/supabase';
import { CURRENCIES, LEGAL_STATUSES, SECTORS, ACCENT_COLORS } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { CompanySearch } from '@/components/ui/CompanySearch';

import { Camera, Crown, LogOut, Trash2, Download, AlertTriangle, ShieldAlert, Zap, CreditCard, XCircle, ArrowUpRight, PenTool, X, Link2, CheckCircle2, Unlink, Webhook, Globe, Plus, Sparkles, Eye, Upload, Lock } from 'lucide-react';
import { changeLanguage } from '@/i18n';
import { SumUpTutorialModal } from '@/components/ui/SumUpTutorialModal';

const CURRENCY_OPTS = CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.label}` }));
const LANG_OPTS = [{ value: 'fr', label: '🇫🇷 Français' }, { value: 'en', label: '🇬🇧 English' }];
const TEMPLATE_OPTS = [
  { value: '1', label: 'Minimaliste' },
  { value: '2', label: 'Classique' },
  { value: '3', label: 'Moderne' },
  { value: '4', label: 'Élégant' },
  { value: '5', label: 'Corporate' },
  { value: '6', label: 'Nature' },
];

const WEBHOOK_EVENTS = [
  { value: 'invoice.created', label: 'Facture créée' },
  { value: 'invoice.sent', label: 'Facture envoyée' },
  { value: 'invoice.paid', label: 'Facture payée' },
  { value: 'invoice.overdue', label: 'Facture en retard' },
];

interface WebhookEndpoint {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { profile, updateProfile, signOut, fetchProfile } = useAuthStore();
  const sub = useSubscription();
  const fileRef = useRef<HTMLInputElement>(null);
  const sigFileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [stripeConnectLoading, setStripeConnectLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<'connected' | 'error' | null>(null);

  // SumUp state
  const [sumupApiKey, setSumupApiKey] = useState('');
  const [sumupMerchantCode, setSumupMerchantCode] = useState('');
  const [sumupMerchantName, setSumupMerchantName] = useState('');
  const [sumupEmail, setSumupEmail] = useState('');
  const [sumupEmailMissing, setSumupEmailMissing] = useState(false);
  const [sumupConnected, setSumupConnected] = useState(false);
  const [sumupLoading, setSumupLoading] = useState(false);
  const [sumupStatus, setSumupStatus] = useState<'connected' | 'error' | null>(null);
  const [showSumupTutorial, setShowSumupTutorial] = useState(false);

  // Webhook state
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookForm, setWebhookForm] = useState<{ url: string; events: string[] }>({ url: '', events: [] });
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);

  const [form, setForm] = useState({
    company_name: profile?.company_name || '',
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    city: profile?.city || '',
    postal_code: profile?.postal_code || '',
    country: profile?.country || 'France',
    siret: profile?.siret || '',
    vat_number: profile?.vat_number || '',
    legal_status: profile?.legal_status || '',
    sector: profile?.sector || '',
    invoice_prefix: profile?.invoice_prefix || 'FACT',
    currency: profile?.currency || 'EUR',
    language: profile?.language || 'fr',
    template_id: String(profile?.template_id || 1),
    accent_color: profile?.accent_color || '#1D9E75',
    bank_name: profile?.bank_name || '',
    iban: profile?.iban || '',
    bic: profile?.bic || '',
    payment_terms: profile?.payment_terms || '',
    legal_mention: profile?.legal_mention || '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // AI Template analysis state
  const templateFileRef = useRef<HTMLInputElement>(null);
  const [analyzingTemplate, setAnalyzingTemplate] = useState(false);
  const [analyzedTemplateHtml, setAnalyzedTemplateHtml] = useState<string | null>(null);
  const [analyzedStyleDesc, setAnalyzedStyleDesc] = useState('');
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const handleAnalyzeTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!sub.canUseCustomTemplate) { router.push('/paywall'); return; }
    setAnalyzingTemplate(true);
    setTemplateError('');
    setAnalyzedTemplateHtml(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ai/analyze-invoice-template', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur analyse');
      setAnalyzedTemplateHtml(data.template_html);
      setAnalyzedStyleDesc(data.style_description || 'Style personnalisé');
      if (data.accent_color) set('accent_color', data.accent_color);
    } catch (err: any) {
      setTemplateError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setAnalyzingTemplate(false);
    }
  };

  const handleSaveCustomTemplate = async () => {
    if (!analyzedTemplateHtml) return;
    setSavingTemplate(true);
    try {
      await updateProfile({ custom_template_html: analyzedTemplateHtml, template_id: 0 } as any);
      setAnalyzedTemplateHtml(null);
      setAnalyzedStyleDesc('');
    } catch (e: any) { setTemplateError(e.message); }
    finally { setSavingTemplate(false); }
  };

  const handleResetCustomTemplate = async () => {
    if (!confirm('Revenir aux templates par défaut ?')) return;
    try {
      await updateProfile({ custom_template_html: null, template_id: parseInt(form.template_id) || 1 } as any);
    } catch (e: any) { setTemplateError(e.message); }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripe = params.get('stripe');
    if (stripe === 'connected') {
      setStripeStatus('connected');
      fetchProfile(profile?.id ?? '');
    } else if (stripe === 'error') {
      setStripeStatus('error');
    }
  }, []);

  // Fetch webhooks on mount
  useEffect(() => {
    if (!profile?.id) return;
    const fetchWebhooks = async () => {
      const { data, error } = await getSupabaseClient()
        .from('webhook_endpoints')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (!error && data) setWebhooks(data);
    };
    fetchWebhooks();
  }, [profile?.id]);

  const handleConnectStripe = async () => {
    setStripeConnectLoading(true);
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error || 'Impossible de lancer la connexion Stripe');
    } catch (e: any) { toast.error(e.message || 'Erreur de connexion Stripe'); }
    finally { setStripeConnectLoading(false); }
  };

  const handleDisconnectStripe = async () => {
    if (!confirm('Déconnecter votre compte Stripe ? Les liens de paiement existants ne seront plus actifs.')) return;
    setStripeConnectLoading(true);
    try {
      const res = await fetch('/api/stripe/connect', { method: 'DELETE' });
      if (res.ok) {
        await fetchProfile(profile?.id ?? '');
        setStripeStatus(null);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la déconnexion');
      }
    } catch (e: any) { toast.error(e.message || 'Erreur de déconnexion'); }
    finally { setStripeConnectLoading(false); }
  };

  // Check SumUp connection on mount
  useEffect(() => {
    fetch('/api/sumup/connect')
      .then((r) => r.json())
      .then((d) => {
        if (d.connected) {
          setSumupConnected(true);
          setSumupMerchantCode(d.merchantCode || '');
          if (d.merchantName) setSumupMerchantName(d.merchantName);
          if (d.sumupEmail) setSumupEmail(d.sumupEmail);
          setSumupEmailMissing(!!d.emailMissing);
        }
      })
      .catch(() => {});
  }, []);

  const handleConnectSumUp = async () => {
    setSumupLoading(true); setSumupStatus(null);
    try {
      const res = await fetch('/api/sumup/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: sumupApiKey, merchantCode: sumupMerchantCode, merchantEmail: sumupEmail || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSumupConnected(true);
      if (data.merchantName) setSumupMerchantName(data.merchantName);
      if (data.sumupEmail) setSumupEmail(data.sumupEmail);
      setSumupEmailMissing(!data.emailDetected);
      setSumupStatus('connected');
      toast.success('SumUp connecté avec succès !');
    } catch (e: any) {
      setSumupStatus('error');
      toast.error(e.message || 'Erreur de connexion SumUp');
    } finally {
      setSumupLoading(false);
    }
  };

  const handleDisconnectSumUp = async () => {
    if (!confirm('Déconnecter votre compte SumUp ? Les liens de paiement existants ne seront plus actifs.')) return;
    setSumupLoading(true);
    try {
      const res = await fetch('/api/sumup/connect', { method: 'DELETE' });
      if (res.ok) {
        setSumupConnected(false);
        setSumupApiKey('');
        setSumupMerchantCode('');
        setSumupEmail('');
        setSumupEmailMissing(false);
        setSumupStatus(null);
      }
    } catch (e: any) { toast.error(e.message || 'Erreur lors de la déconnexion SumUp'); }
    finally { setSumupLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      await updateProfile({ ...form, template_id: parseInt(form.template_id) } as any);
      if (form.language !== profile?.language) await changeLanguage(form.language);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

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

    setUploading(true);
    setError('');
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Non authentifié');

      const ext = file.name.split('.').pop();
      const fileName = `${user.id}.${ext}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to the 'logos' bucket (correct bucket)
      const { error: uploadError } = await getSupabaseClient()
        .storage
        .from('logos')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error('[Logo Upload] Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = getSupabaseClient()
        .storage
        .from('logos')
        .getPublicUrl(filePath);

      // Update profile with new logo URL
      await updateProfile({ logo_url: publicUrl } as any);

      toast.success('Logo mis à jour avec succès !');
    } catch (e: any) {
      console.error('[Logo Upload] Error:', e);
      setError(e.message || 'Erreur lors du téléchargement du logo');
      toast.error(e.message || 'Erreur lors du téléchargement du logo');
    } finally {
      setUploading(false);
      // Reset file input
      if (e.target) e.target.value = '';
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error || 'Impossible d\'accéder au portail');
    } catch (e: any) {
      toast.error(e.message || 'Erreur portail');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingSig(true);
    setError('');
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Non authentifié');

      const ext = file.name.split('.').pop();
      const fileName = `signature.${ext}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to the 'logos' bucket with correct path format for RLS
      const { error: uploadError } = await getSupabaseClient()
        .storage
        .from('logos')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error('[Signature Upload] Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = getSupabaseClient()
        .storage
        .from('logos')
        .getPublicUrl(filePath);

      // Update profile with new signature URL
      await updateProfile({ signature_url: publicUrl } as any);

      toast.success('Signature mise à jour avec succès !');
    } catch (e: any) {
      console.error('[Signature Upload] Error:', e);
      setError(e.message || 'Erreur lors du téléchargement de la signature');
      toast.error(e.message || 'Erreur lors du téléchargement de la signature');
    } finally {
      setUploadingSig(false);
      // Reset file input
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveSignature = async () => {
    try {
      await updateProfile({ signature_url: null } as any);
    } catch (e: any) { setError(e.message); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') return;
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      await signOut();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la suppression du compte');
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      toast.loading('Déconnexion en cours...', { id: 'logout' });
      await signOut();
      toast.success('Déconnecté avec succès', { id: 'logout' });
    } catch (error) {
      toast.error('Erreur lors de la déconnexion', { id: 'logout' });
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  };

  // Webhook handlers
  const handleToggleWebhookEvent = (eventValue: string) => {
    setWebhookForm((prev) => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter((e) => e !== eventValue)
        : [...prev.events, eventValue],
    }));
  };

  const handleSaveWebhook = async () => {
    if (!webhookForm.url.trim() || webhookForm.events.length === 0 || !profile?.id) return;
    setSavingWebhook(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from('webhook_endpoints')
        .insert({ user_id: profile.id, url: webhookForm.url.trim(), events: webhookForm.events, active: true })
        .select()
        .single();
      if (error) throw new Error(error.message);
      setWebhooks((prev) => [data, ...prev]);
      setShowWebhookModal(false);
      setWebhookForm({ url: '', events: [] });
    } catch (e: any) { toast.error(e.message || 'Erreur lors de la sauvegarde'); }
    finally { setSavingWebhook(false); }
  };

  const handleToggleWebhookActive = async (webhook: WebhookEndpoint) => {
    const { error } = await getSupabaseClient()
      .from('webhook_endpoints')
      .update({ active: !webhook.active })
      .eq('id', webhook.id);
    if (!error) {
      setWebhooks((prev) => prev.map((w) => w.id === webhook.id ? { ...w, active: !w.active } : w));
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    setDeletingWebhookId(id);
    try {
      const { error } = await getSupabaseClient()
        .from('webhook_endpoints')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (e: any) { toast.error(e.message || 'Erreur lors de la suppression'); }
    finally { setDeletingWebhookId(null); }
  };

  const SECTIONS = [
    {
      title: 'Entreprise',
      fields: (
        <div className="space-y-3">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-gray-300">{(form.company_name || 'F').charAt(0)}</span>
                )}
              </div>
            </div>
            <div>
              <Button variant="secondary" size="sm" icon={<Camera size={14} />} onClick={() => fileRef.current?.click()} loading={uploading}>
                {profile?.logo_url ? 'Changer' : 'Ajouter un logo'}
              </Button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG · max 2MB</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>
          <CompanySearch
            label="Nom de l'entreprise"
            value={form.company_name}
            onChange={(v) => set('company_name', v)}
            onSelect={(company) => {
              set('company_name', company.name);
              if (company.siret) set('siret', company.siret);
              if (company.address) set('address', company.address);
              if (company.postal_code) set('postal_code', company.postal_code);
              if (company.city) set('city', company.city);
              if (company.vat_number) set('vat_number', company.vat_number);
            }}
            placeholder="Rechercher votre entreprise..."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Prénom" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            <Input label="Nom" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <Input label="Téléphone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <Input label="Adresse" value={form.address} onChange={(e) => set('address', e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="CP" value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
            <Input label="Ville" value={form.city} onChange={(e) => set('city', e.target.value)} className="sm:col-span-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Statut juridique" value={form.legal_status} onChange={(e) => set('legal_status', e.target.value)} options={[{ value: '', label: 'Choisir...' }, ...LEGAL_STATUSES.map((s) => ({ value: s.value, label: s.label }))]} />
            <Select label="Secteur" value={form.sector} onChange={(e) => set('sector', e.target.value)} options={[{ value: '', label: 'Choisir...' }, ...SECTORS.map((s) => ({ value: s, label: s }))]} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="SIRET" value={form.siret} onChange={(e) => set('siret', e.target.value)} />
            <Input label="N° TVA" value={form.vat_number} onChange={(e) => set('vat_number', e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      title: 'Facturation',
      fields: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Préfixe numéro" value={form.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} placeholder="FACT" />
            <Select label="Devise" value={form.currency} onChange={(e) => set('currency', e.target.value)} options={CURRENCY_OPTS} />
          </div>
          <Textarea label="Conditions de paiement" value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} rows={2} placeholder="Payable sous 30 jours par virement..." />
          <Textarea label="Mentions légales" value={form.legal_mention} onChange={(e) => set('legal_mention', e.target.value)} rows={2} placeholder="Numéro RCS, capital social..." />
        </div>
      ),
    },
    {
      title: 'Modèle de facture',
      fields: (
        <div className="space-y-4">
          {profile?.custom_template_html && (
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5">
              <Sparkles size={15} className="text-purple-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-purple-700">Template personnalisé actif</p>
              <button onClick={handleResetCustomTemplate} className="ml-auto text-xs text-purple-500 hover:text-purple-700 font-semibold">Réinitialiser</button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: '1', name: 'Minimaliste', desc: 'Épuré et moderne',     headerBg: 'bg-primary', headerH: 'h-1', bodyBg: 'bg-white' },
              { id: '2', name: 'Classique',   desc: 'Sobre et formel',       headerBg: 'bg-gray-900', headerH: 'h-5', bodyBg: 'bg-white' },
              { id: '3', name: 'Moderne',     desc: 'Dynamique et coloré',   headerBg: 'bg-primary',  headerH: 'h-5', bodyBg: 'bg-white' },
              { id: '4', name: 'Élégant',     desc: 'Chaleureux et raffiné', headerBg: 'bg-amber-200', headerH: 'h-1', bodyBg: 'bg-amber-50' },
              { id: '5', name: 'Corporate',   desc: 'Structuré et pro',      headerBg: 'bg-slate-800', headerH: 'h-5', bodyBg: 'bg-white' },
              { id: '6', name: 'Nature',      desc: 'Frais et organique',    headerBg: 'bg-green-700', headerH: 'h-5', bodyBg: 'bg-green-50' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { if (!profile?.custom_template_html) set('template_id', t.id); }}
                className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                  profile?.custom_template_html ? 'opacity-40 cursor-not-allowed' :
                  form.template_id === t.id ? 'border-primary shadow-md bg-primary/5' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Mini invoice preview */}
                <div className={`w-full h-16 rounded-lg ${t.bodyBg} mb-2 overflow-hidden border border-gray-100 flex flex-col`}>
                  <div className={`${t.headerBg} ${t.headerH} w-full`} />
                  <div className="flex-1 p-1.5 space-y-1">
                    <div className="bg-gray-200 h-1.5 rounded-full w-2/3" />
                    <div className="bg-gray-100 h-1 rounded-full w-full" />
                    <div className="bg-gray-100 h-1 rounded-full w-4/5" />
                    <div className="bg-gray-200 h-1 rounded-full w-1/2" />
                  </div>
                </div>
                <p className="text-xs font-bold text-gray-900">{t.name}</p>
                <p className="text-[10px] text-gray-400">{t.desc}</p>
                {form.template_id === t.id && !profile?.custom_template_html && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                    <CheckCircle2 size={10} />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* AI Template Upload - Pro only */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className={sub.canUseCustomTemplate ? 'text-purple-500' : 'text-gray-300'} />
              <h4 className="text-sm font-bold text-gray-900">Importer un template avec l'IA</h4>
              {!sub.canUseCustomTemplate && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">PRO</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-3">Uploadez une facture et l'IA créera un template basé sur son style.</p>

            {sub.canUseCustomTemplate ? (
              <div className="space-y-3">
                <div
                  onClick={() => templateFileRef.current?.click()}
                  className="relative rounded-xl border-2 border-dashed p-4 text-center transition-all cursor-pointer border-gray-200 hover:border-primary/40 hover:bg-gray-50"
                >
                  <input ref={templateFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleAnalyzeTemplate} />
                  {analyzingTemplate ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-semibold text-gray-600">L'IA analyse votre facture...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={20} className="text-gray-400" />
                      <p className="text-xs font-semibold text-gray-600">Glissez ou <span className="text-primary">parcourez</span></p>
                      <p className="text-[10px] text-gray-400">PNG, JPG, PDF</p>
                    </div>
                  )}
                </div>

                {analyzedTemplateHtml && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                      <CheckCircle2 size={14} className="text-green-600" />
                      <div>
                        <p className="text-xs font-bold text-green-700">Template généré</p>
                        <p className="text-[10px] text-green-600">{analyzedStyleDesc}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowTemplatePreview(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:border-primary hover:text-primary transition-colors"
                      >
                        <Eye size={13} /> Aperçu
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCustomTemplate}
                        disabled={savingTemplate}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                      >
                        {savingTemplate ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        Sauvegarder comme mon template
                      </button>
                    </div>
                  </div>
                )}

                {templateError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <AlertTriangle size={13} className="text-red-500" />
                    <p className="text-xs text-red-600">{templateError}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                <p className="text-xs text-gray-400">Disponible avec le plan Pro</p>
                <button onClick={() => router.push('/paywall')} className="mt-2 text-xs text-primary font-bold hover:underline">Voir les offres →</button>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Coordonnées bancaires',
      fields: (
        <div className="space-y-3">
          <Input label="Banque" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="BNP Paribas" />
          <Input label="IBAN" value={form.iban} onChange={(e) => set('iban', e.target.value)} placeholder="FR76 1234 5678 9012 3456 7890 123" />
          <Input label="BIC/SWIFT" value={form.bic} onChange={(e) => set('bic', e.target.value)} placeholder="BNPAFRPP" />
        </div>
      ),
    },
    {
      title: 'Paiement en ligne (Stripe Connect)',
      fields: (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Connectez votre compte Stripe pour accepter des paiements en ligne directement sur vos factures. Les fonds arrivent directement sur votre compte Stripe.
          </p>

          {stripeStatus === 'connected' && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-green-700">Stripe connecté avec succès !</p>
            </div>
          )}
          {stripeStatus === 'error' && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <XCircle size={15} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">Erreur lors de la connexion. Réessayez.</p>
            </div>
          )}

          {profile?.stripe_connect_id ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3.5 bg-green-50 rounded-xl border border-green-100">
                <div className="w-9 h-9 rounded-lg bg-white border border-green-200 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-green-800">Compte Stripe connecté</p>
                  <p className="text-xs text-green-600 font-mono truncate">{profile.stripe_connect_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <Link2 size={14} className="text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Un bouton <strong>Payer en ligne</strong> apparaît sur vos factures. Les paiements arrivent directement sur votre compte Stripe.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDisconnectStripe}
                disabled={stripeConnectLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Unlink size={14} />
                Déconnecter Stripe
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Paiement par carte', desc: 'Visa, Mastercard, Amex' },
                  { label: 'Virement direct', desc: 'Les fonds vont sur votre Stripe' },
                  { label: 'Mise à jour auto', desc: 'Facture passée en "Payée"' },
                ].map((f) => (
                  <div key={f.label} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-700">{f.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleConnectStripe}
                disabled={stripeConnectLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#635BFF] text-white text-sm font-bold hover:bg-[#4F46E5] transition-colors disabled:opacity-50 shadow-sm"
              >
                {stripeConnectLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Link2 size={15} />
                )}
                Connecter avec Stripe
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Paiement en ligne (SumUp)',
      fields: (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Acceptez des paiements en ligne directement sur vos factures avec SumUp. Simple, rapide et sécurisé.
          </p>

          {sumupStatus === 'connected' && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-green-700">SumUp connecté avec succès !</p>
            </div>
          )}
          {sumupStatus === 'error' && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <XCircle size={15} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">Erreur lors de la connexion. Vérifiez vos identifiants.</p>
            </div>
          )}

          {sumupConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3.5 bg-green-50 rounded-xl border border-green-100">
                <div className="w-9 h-9 rounded-lg bg-white border border-green-200 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-green-800">Compte SumUp connecté</p>
                  <p className="text-xs text-green-600 font-mono truncate">{sumupMerchantCode}</p>
                </div>
              </div>
              {sumupEmailMissing ? (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <XCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">Email SumUp manquant — liens de paiement bloqués</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">Déconnectez votre compte et reconnectez-le en renseignant votre email SumUp pour débloquer la création de liens de paiement.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <Link2 size={14} className="text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Un bouton <strong>Payer avec SumUp</strong> apparaît sur vos factures. Les paiements arrivent directement sur votre compte SumUp.
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={handleDisconnectSumUp}
                disabled={sumupLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Unlink size={14} />
                Déconnecter SumUp
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowSumupTutorial(true)}
                className="w-full relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#1D9E75] via-[#188A66] to-[#166958] transition-all duration-500 group-hover:scale-[1.02]" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                </div>
                <div className="relative flex items-center justify-center gap-3 py-6 px-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Lock size={24} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-black text-white">Connecter SumUp</p>
                    <p className="text-sm text-white/80">Suivez le guide pour trouver vos identifiants</p>
                  </div>
                  <ArrowUpRight size={20} className="text-white/60 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </div>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Paiement par carte', desc: 'Visa, Mastercard', icon: '💳' },
                  { label: 'Terminal SumUp', desc: 'Paiement en personne', icon: '📱' },
                  { label: 'Mise à jour auto', desc: 'Facture → Payée', icon: '✨' },
                ].map((f) => (
                  <div key={f.label} className="p-3 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
                    <p className="text-lg mb-1">{f.icon}</p>
                    <p className="text-xs font-bold text-gray-700">{f.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700">
                  <strong>Comment ça marche ?</strong> Cliquez sur "Connecter SumUp", suivez le tutoriel pour récupérer votre clé API et code marchand, puis entrez-les pour activer les paiements en ligne.
                </p>
              </div>

              {sumupStatus === 'error' && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Ou entrez vos identifiants directement :</p>
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={sumupApiKey}
                      onChange={(e) => setSumupApiKey(e.target.value)}
                      placeholder="Clé API SumUp (sup_sk_...)"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
                    />
                    <input
                      type="text"
                      value={sumupMerchantCode}
                      onChange={(e) => setSumupMerchantCode(e.target.value)}
                      placeholder="Code marchand"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
                    />
                    <input
                      type="email"
                      value={sumupEmail}
                      onChange={(e) => setSumupEmail(e.target.value)}
                      placeholder="Email du compte SumUp"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectSumUp}
                    disabled={sumupLoading || !sumupApiKey || !sumupMerchantCode || !sumupEmail}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-bold hover:bg-[#188A66] transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {sumupLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Link2 size={15} />
                    )}
                    Connecter
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Signature électronique',
      fields: (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Ajoutez votre signature manuscrite. Elle apparaîtra automatiquement en bas de vos factures et devis.</p>
          <div className="flex items-start gap-4">
            <div className="w-48 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile?.signature_url ? (
                <img src={profile.signature_url} alt="Signature" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                <div className="text-center">
                  <PenTool size={20} className="text-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Aucune signature</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Button variant="secondary" size="sm" icon={<Camera size={14} />} onClick={() => sigFileRef.current?.click()} loading={uploadingSig}>
                {profile?.signature_url ? 'Changer la signature' : 'Importer une signature'}
              </Button>
              {profile?.signature_url && (
                <button type="button" onClick={handleRemoveSignature} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors">
                  <X size={12} />
                  Supprimer la signature
                </button>
              )}
              <p className="text-xs text-gray-400">PNG transparent recommandé · max 1MB</p>
              <input ref={sigFileRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700">
              <strong>Conseil :</strong> Signez sur une feuille blanche, prenez une photo, puis utilisez un outil en ligne pour supprimer le fond et exporter en PNG transparent.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Préférences',
      fields: (
        <div className="space-y-3">
          <Select label="Langue" value={form.language} onChange={(e) => set('language', e.target.value)} options={LANG_OPTS} />
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Couleur accent</label>
            <div className="space-y-3">
              {/* Couleurs prédéfinies */}
              <div className="flex gap-2 flex-wrap">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('accent_color', c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.accent_color === c ? 'border-gray-900 scale-110 ring-2 ring-gray-300' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>

              {/* Couleur customisée */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Ou choisir une couleur personnalisée :</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={(e) => set('accent_color', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                      title="Sélectionner une couleur personnalisée"
                    />
                    <input
                      type="text"
                      value={form.accent_color}
                      onChange={(e) => {
                        // Valider que c'est un code hex valide
                        const hexColor = e.target.value;
                        if (/^#[0-9A-F]{6}$/i.test(hexColor)) {
                          set('accent_color', hexColor);
                        }
                      }}
                      placeholder="Ex: #FF5733"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
                {/* Aperçu de la couleur sélectionnée */}
                <div
                  className="w-12 h-12 rounded-xl border-2 border-gray-200 shadow-sm"
                  style={{ backgroundColor: form.accent_color }}
                  title={`Couleur actuelle: ${form.accent_color}`}
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Paramètres</h1>
        {!sub.isFree && (
          <div className="flex items-center gap-1.5 bg-primary-light px-3 py-1.5 rounded-full">
            <Crown size={14} className="text-primary" />
            <span className="text-xs font-bold text-primary capitalize">{sub.tier}</span>
          </div>
        )}
      </div>

      {/* Subscription banner */}
      {sub.isFree && (
        <button onClick={() => router.push('/paywall')} className="w-full bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-4 flex items-center gap-3 hover:opacity-95 transition-opacity text-left">
          <Crown size={22} className="text-yellow-300 flex-shrink-0" />
          <div>
            <p className="font-bold text-white">Passer à Solo ou Pro</p>
            <p className="text-sm text-primary-light/80">Factures illimitées, dictée vocale, templates...</p>
          </div>
        </button>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {SECTIONS.map(({ title, fields }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4">
            <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
            {fields}
          </div>
        ))}

        {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={saving}>
          {saved ? '✓ Enregistré !' : 'Enregistrer les modifications'}
        </Button>
      </form>

      {/* Accounting export */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h3 className="font-bold text-gray-900">Export comptabilité</h3>
        <p className="text-sm text-gray-500">Exportez vos écritures comptables au format FEC (Fichier des Écritures Comptables) pour votre expert-comptable.</p>
        <div className="flex gap-2 flex-wrap">
          {[new Date().getFullYear(), new Date().getFullYear() - 1].map((year) => (
            <a
              key={year}
              href={`/api/export/fec?year=${year}`}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
            >
              <Download size={14} />
              FEC {year}
            </a>
          ))}
        </div>
      </div>

      {/* Subscription management */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Mon abonnement</h3>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            sub.tier === 'pro' ? 'bg-amber-50 text-amber-600' :
            sub.tier === 'solo' ? 'bg-primary/10 text-primary' :
            'bg-gray-100 text-gray-500'
          }`}>
            {sub.tier === 'pro' ? <Crown size={11} /> : sub.tier === 'solo' ? <Zap size={11} /> : null}
            {sub.tier === 'free' ? 'Plan Gratuit' : sub.tier === 'solo' ? 'Plan Solo' : 'Plan Pro'}
          </div>
        </div>

        {sub.isFree ? (
          <div className="p-4 bg-gradient-to-r from-primary/8 to-primary/4 rounded-xl border border-primary/15">
            <p className="text-sm font-semibold text-gray-800 mb-1">Passez à Solo ou Pro</p>
            <p className="text-xs text-gray-500 mb-3">Factures illimitées, dictée vocale IA, templates premium et bien plus.</p>
            <button onClick={() => router.push('/paywall')} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all">
              <Zap size={14} />
              Voir les offres
              <ArrowUpRight size={13} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Abonnement actif</p>
                  <p className="text-xs text-gray-400">Gérez votre facturation et vos méthodes de paiement</p>
                </div>
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary transition-all flex-shrink-0 disabled:opacity-50"
              >
                {portalLoading ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <ArrowUpRight size={14} />}
                Gérer
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 p-3.5 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                  <XCircle size={16} className="text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Résilier l&apos;abonnement</p>
                  <p className="text-xs text-gray-400">Accédez au portail Stripe pour résilier</p>
                </div>
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-all flex-shrink-0 disabled:opacity-50"
              >
                Résilier
              </button>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <ArrowUpRight size={14} className="text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Pour changer de plan, <button onClick={() => router.push('/paywall')} className="font-semibold underline underline-offset-2">consultez les offres</button> ou gérez directement depuis le portail Stripe.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Webhooks */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-gray-400" />
            <h3 className="font-bold text-gray-900">Webhooks sortants</h3>
          </div>
          <button
            onClick={() => { setWebhookForm({ url: '', events: [] }); setShowWebhookModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors"
          >
            <Plus size={13} />
            Ajouter
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Recevez des notifications HTTP POST sur votre URL quand une facture est créée, envoyée ou payée.
        </p>

        {webhooks.length === 0 ? (
          <div className="text-center py-5 rounded-xl border border-dashed border-gray-200">
            <Globe size={22} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucun webhook configuré</p>
            <p className="text-xs text-gray-300 mt-1">Ajoutez une URL pour recevoir des notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div key={wh.id} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{wh.url}</p>
                    <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${wh.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {wh.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map((ev) => (
                      <span key={ev} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleToggleWebhookActive(wh)}
                    className="text-xs text-gray-500 hover:text-primary transition-colors font-medium"
                    title={wh.active ? 'Désactiver' : 'Activer'}
                  >
                    {wh.active ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(wh.id)}
                    disabled={deletingWebhookId === wh.id}
                    className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-bold text-gray-900">Gestion du compte</h3>

        {/* Logout */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Se déconnecter</p>
            <p className="text-xs text-gray-400 mt-0.5">Vous serez redirigé vers la page de connexion</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingOut ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                <span>Déconnexion...</span>
              </>
            ) : (
              <>
                <LogOut size={14} />
                Déconnexion
              </>
            )}
          </button>
        </div>

        {/* Delete account */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-700">Supprimer le compte</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Supprime définitivement votre compte, vos factures et vos clients. Irréversible.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-all flex-shrink-0"
          >
            <Trash2 size={14} />
            Supprimer
          </button>
        </div>
      </div>

      {/* Webhook modal */}
      <Modal
        open={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
        title="Ajouter un webhook"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">URL de destination</label>
            <input
              type="url"
              value={webhookForm.url}
              onChange={(e) => setWebhookForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://votre-serveur.com/webhook"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Événements à écouter</label>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={webhookForm.events.includes(ev.value)}
                    onChange={() => handleToggleWebhookEvent(ev.value)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{ev.label}</span>
                  <span className="text-[11px] text-gray-400 font-mono">{ev.value}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-700">
              Votre URL recevra un POST avec <code className="font-mono bg-amber-100 px-1 rounded">{"{ event, data, timestamp }"}</code>. Assurez-vous qu&apos;elle est accessible publiquement.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowWebhookModal(false)}>
              Annuler
            </Button>
            <Button
              className="flex-1"
              loading={savingWebhook}
              disabled={!webhookForm.url.trim() || webhookForm.events.length === 0}
              onClick={handleSaveWebhook}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Template preview modal */}
      <Modal
        open={showTemplatePreview}
        onClose={() => setShowTemplatePreview(false)}
        title="Aperçu du template"
        size="xl"
      >
        {analyzedTemplateHtml && (
          <div className="space-y-3">
            <div className="bg-gray-100 rounded-xl overflow-hidden" style={{ maxHeight: '70vh' }}>
              <iframe
                srcDoc={analyzedTemplateHtml}
                className="w-full border-0"
                style={{ height: '600px', minWidth: '600px', transform: 'scale(0.6)', transformOrigin: 'top left', width: '166.6%' }}
                title="Template preview"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowTemplatePreview(false)}>
                Fermer
              </Button>
              <Button
                className="flex-1"
                loading={savingTemplate}
                onClick={async () => { await handleSaveCustomTemplate(); setShowTemplatePreview(false); }}
              >
                Sauvegarder ce template
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete account confirmation modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
        title="Supprimer le compte"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
            <ShieldAlert size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              Cette action est <strong>irréversible</strong>. Toutes vos données seront supprimées définitivement.
            </p>
          </div>

          <ul className="text-sm text-gray-600 space-y-1 pl-4">
            <li className="list-disc">Toutes vos factures et devis</li>
            <li className="list-disc">Tous vos clients</li>
            <li className="list-disc">Vos factures récurrentes</li>
            <li className="list-disc">Votre profil et paramètres</li>
          </ul>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Tapez <span className="font-black text-red-600">SUPPRIMER</span> pour confirmer
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
            >
              Annuler
            </Button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'SUPPRIMER' || deleting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Supprimer définitivement
            </button>
          </div>
        </div>
      </Modal>

      {/* SumUp Tutorial Modal */}
      <SumUpTutorialModal
        isOpen={showSumupTutorial}
        onClose={() => setShowSumupTutorial(false)}
      />
    </div>
  );
}
