'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { getSupabaseClient } from '@/lib/supabase';
import { CURRENCIES, LEGAL_STATUSES, SECTORS, ACCENT_COLORS } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { CompanySearch } from '@/components/ui/CompanySearch';

import { Camera, Crown, LogOut, Trash2, Download, AlertTriangle, ShieldAlert, Zap, CreditCard, XCircle, ArrowUpRight, PenTool, X, Link2, CheckCircle2, Unlink, Webhook, Globe, Plus } from 'lucide-react';
import { changeLanguage } from '@/i18n';

const CURRENCY_OPTS = CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.label}` }));
const LANG_OPTS = [{ value: 'fr', label: '🇫🇷 Français' }, { value: 'en', label: '🇬🇧 English' }];
const TEMPLATE_OPTS = [{ value: '1', label: 'Minimaliste' }, { value: '2', label: 'Classique' }, { value: '3', label: 'Moderne' }];

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
  const [portalLoading, setPortalLoading] = useState(false);
  const [stripeConnectLoading, setStripeConnectLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<'connected' | 'error' | null>(null);

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
      else alert(data.error || 'Impossible de lancer la connexion Stripe');
    } catch (e: any) { alert(e.message); }
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
        alert(data.error || 'Erreur lors de la déconnexion');
      }
    } catch (e: any) { alert(e.message); }
    finally { setStripeConnectLoading(false); }
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
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const user = session?.user; if (!user) throw new Error('Non authentifié');
      const ext = file.name.split('.').pop();
      const path = `logos/${user.id}.${ext}`;
      await getSupabaseClient().storage.from('assets').upload(path, file, { upsert: true });
      const { data } = getSupabaseClient().storage.from('assets').getPublicUrl(path);
      await updateProfile({ logo_url: data.publicUrl } as any);
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Impossible d\'accéder au portail');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingSig(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const user = session?.user; if (!user) throw new Error('Non authentifié');
      const ext = file.name.split('.').pop();
      const path = `signatures/${user.id}.${ext}`;
      await getSupabaseClient().storage.from('assets').upload(path, file, { upsert: true });
      const { data } = getSupabaseClient().storage.from('assets').getPublicUrl(path);
      await updateProfile({ signature_url: data.publicUrl } as any);
    } catch (e: any) { setError(e.message); }
    finally { setUploadingSig(false); }
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
      alert(e.message);
      setDeleting(false);
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
    } catch (e: any) { alert(e.message); }
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
    } catch (e: any) { alert(e.message); }
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
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            <Input label="Nom" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <Input label="Téléphone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <Input label="Adresse" value={form.address} onChange={(e) => set('address', e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="CP" value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
            <Input label="Ville" value={form.city} onChange={(e) => set('city', e.target.value)} className="col-span-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Statut juridique" value={form.legal_status} onChange={(e) => set('legal_status', e.target.value)} options={[{ value: '', label: 'Choisir...' }, ...LEGAL_STATUSES.map((s) => ({ value: s.value, label: s.label }))]} />
            <Select label="Secteur" value={form.sector} onChange={(e) => set('sector', e.target.value)} options={[{ value: '', label: 'Choisir...' }, ...SECTORS.map((s) => ({ value: s, label: s }))]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-3 gap-3">
            <Input label="Préfixe numéro" value={form.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} placeholder="FACT" />
            <Select label="Devise" value={form.currency} onChange={(e) => set('currency', e.target.value)} options={CURRENCY_OPTS} />
            <Select label="Modèle PDF" value={form.template_id} onChange={(e) => set('template_id', e.target.value)} options={TEMPLATE_OPTS} />
          </div>
          <Textarea label="Conditions de paiement" value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} rows={2} placeholder="Payable sous 30 jours par virement..." />
          <Textarea label="Mentions légales" value={form.legal_mention} onChange={(e) => set('legal_mention', e.target.value)} rows={2} placeholder="Numéro RCS, capital social..." />
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
              <div className="grid grid-cols-3 gap-3 text-center">
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
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set('accent_color', c)} className={`w-8 h-8 rounded-full border-2 transition-all ${form.accent_color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c }} />
              ))}
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
          <div key={title} className="bg-white rounded-2xl border border-gray-100 p-4">
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
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-all flex-shrink-0"
          >
            <LogOut size={14} />
            Déconnexion
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
    </div>
  );
}
