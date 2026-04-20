'use client';
import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { formatCurrency, generateId } from '@/lib/utils';
import { InvoiceItem, DocumentType } from '@/types';
import Calendar from '@/components/ui/Calendar';
import PaymentTermsSelector from '@/components/ui/PaymentTermsSelector';
import {
  Mic, MicOff, Plus, Trash2, Zap, FileText, Clipboard,
  RefreshCw, ChevronUp, ChevronDown, Sparkles, Calendar as CalendarIcon,
  User, AlignLeft, Receipt, AlertCircle, CheckCircle2,
  ArrowLeft, ShoppingCart, Truck, Banknote, Wand2, Percent,
  Save, X as XIcon, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DOC_TYPES = [
  {
    value: 'invoice',
    label: 'Facture',
    description: 'Document de facturation standard',
    icon: Receipt,
    color: 'text-primary',
    bg: 'bg-primary/10',
    activeBg: 'bg-primary',
    border: 'border-primary',
  },
  {
    value: 'quote',
    label: 'Devis',
    description: 'Proposition commerciale',
    icon: Clipboard,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    activeBg: 'bg-blue-600',
    border: 'border-blue-500',
  },
  {
    value: 'purchase_order',
    label: 'Bon de commande',
    description: 'Commande d\'achat officielle',
    icon: ShoppingCart,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    activeBg: 'bg-amber-600',
    border: 'border-amber-500',
  },
  {
    value: 'delivery_note',
    label: 'Bon de livraison',
    description: 'Confirmation de livraison',
    icon: Truck,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    activeBg: 'bg-cyan-600',
    border: 'border-cyan-500',
  },
  {
    value: 'credit_note',
    label: 'Avoir',
    description: 'Note de credit ou remboursement',
    icon: RefreshCw,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    activeBg: 'bg-purple-600',
    border: 'border-purple-500',
  },
  {
    value: 'deposit',
    label: 'Acompte',
    description: 'Facture d\'acompte partielle',
    icon: Banknote,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    activeBg: 'bg-emerald-600',
    border: 'border-emerald-500',
  },
];

const VAT_RATES = [
  { value: '0',   label: '0% — Exonéré' },
  { value: '5.5', label: '5.5% — Réduit' },
  { value: '10',  label: '10% — Intermédiaire' },
  { value: '20',  label: '20% — Normal' },
];

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { profile, fetchProfile, user } = useAuthStore();
  const { invoices, updateInvoice } = useDataStore();
  const sub = useSubscription();

  const invoice = invoices.find((i) => i.id === id);

  const [mode, setMode] = useState<'voice' | 'ai' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Voice
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [recordTime, setRecordTime] = useState(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Form - initialized from invoice data
  const [docType, setDocType] = useState<DocumentType>(invoice?.document_type || 'invoice');
  const [clientName, setClientName] = useState(invoice?.client?.name || invoice?.client_name_override || '');
  const [clientId, setClientId] = useState<string | null>(invoice?.client_id || null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [items, setItems] = useState<Omit<InvoiceItem, 'total'>[]>(invoice?.items || [
    { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
  ]);
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [internalNotes, setInternalNotes] = useState((invoice as any)?.internal_notes || '');
  const [discountPercent, setDiscountPercent] = useState(invoice?.discount_percent || 0);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [issueDate, setIssueDate] = useState(invoice?.issue_date || new Date().toISOString().split('T')[0]);
  const _initialDays = invoice?.due_date
    ? Math.round((new Date(invoice.due_date).getTime() - new Date(invoice.issue_date).getTime()) / (1000 * 60 * 60 * 24))
    : 30;
  const [paymentDays, setPaymentDays] = useState<number>(_initialDays);
  const [paymentTermId, setPaymentTermId] = useState<string>(
    ({ 0: 'reception', 15: 'days15', 30: 'days30', 45: 'days45', 60: 'days60' } as Record<number, string>)[_initialDays] ?? 'days30'
  );

  // Additional fields
  const [orderReference, setOrderReference] = useState((invoice as any)?.order_reference || '');
  const [orderNumber, setOrderNumber] = useState((invoice as any)?.order_number || '');
  const [legalMentions, setLegalMentions] = useState((invoice as any)?.legal_mentions || '');

  // Calendar visibility
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDueCalendar, setShowDueCalendar] = useState(false);

  const suggestions = invoices
    .filter((inv) => inv.client && clientName.length >= 1)
    .map((inv) => inv.client)
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .filter((c) => c.name.toLowerCase().includes(clientName.toLowerCase()));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const vatAmount = items.reduce((s, i) => s + i.quantity * i.unit_price * (i.vat_rate / 100), 0);
  const discountAmount = discountPercent > 0 ? (subtotal + vatAmount) * (discountPercent / 100) : 0;
  const total = subtotal + vatAmount - discountAmount;

  const dueDate = paymentDays === 0
    ? ''
    : (() => {
        const d = new Date(issueDate);
        d.setDate(d.getDate() + paymentDays);
        return d.toISOString().split('T')[0];
      })();

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    if (!sub.canUseVoice) { router.push('/paywall'); return; }
    setAiLoading(true); setAiError('');
    try {
      const res = await fetch('/api/ai/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          sector: profile?.sector,
          isEdit: true,
          existingItems: items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { parsed, summary } = data;
      if (summary) toast.success(summary);
      if (parsed?.client_name) { setClientName(parsed.client_name); setClientId(null); }
      if (parsed?.items?.length) {
        setItems(parsed.items.map((item: any) => ({
          id: generateId(),
          description: item.description || '',
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          vat_rate: Number(item.vat_rate) || 20,
        })));
      }
      if (parsed?.notes) setNotes(parsed.notes);
      if (parsed?.discount_percent > 0) setDiscountPercent(parsed.discount_percent);
      if (parsed?.due_days != null) setPaymentDays(parsed.due_days);
      setAiPrompt('');
      setMode('manual');
    } catch (e: any) {
      setAiError(e.message || 'Erreur IA');
    } finally {
      setAiLoading(false);
    }
  };

  // Voice recording timer
  useEffect(() => {
    if (recording) {
      recordTimerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setRecordTime(0);
    }
    return () => { if (recordTimerRef.current) clearInterval(recordTimerRef.current); };
  }, [recording]);

  const startRecording = async () => {
    if (!sub.canUseVoice) { router.push('/paywall'); return; }
    setVoiceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); processVoiceBlob(); };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      setVoiceError('Acces au microphone refuse. Verifiez les permissions dans votre navigateur.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setLoading(true);
  };

  const processVoiceBlob = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      if (profile?.sector) fd.append('sector', profile.sector);
      fd.append('isEdit', 'true');
      fd.append('existingItems', JSON.stringify(items));
      const res = await fetch('/api/process-voice', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Erreur de traitement');
      const result = await res.json();
      setTranscript(result.transcript || '');
      const parsed = result.parsed;
      if (result.summary) toast.success(result.summary);
      if (parsed?.client_name) setClientName(parsed.client_name);
      if (parsed?.items?.length) {
        setItems(parsed.items.map((item: any) => ({
          id: generateId(),
          description: item.description || '',
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          vat_rate: Number(item.vat_rate) || 20,
        })));
      }
      if (parsed?.notes) setNotes(parsed.notes);
      if (parsed?.discount_percent > 0) setDiscountPercent(parsed.discount_percent);
      if (parsed?.due_days != null) setPaymentDays(parsed.due_days);
      setMode('manual');
    } catch (e: any) {
      setVoiceError(e.message || 'Erreur lors du traitement vocal');
    } finally {
      setLoading(false);
    }
  };

  // Items
  const updateItem = (id: string, field: string, value: string | number) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };
  const addItem = () => setItems((prev) => [
    ...prev,
    { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
  ]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const moveItem = (id: string, dir: 'up' | 'down') => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (dir === 'up' && idx === 0) return prev;
      if (dir === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  // Save
  const handleSave = async () => {
    if (!invoice) return;

    if (!clientName && !items[0].description) {
      setError('Renseignez au moins un client ou une prestation');
      return;
    }

    if (!sub.canEditInvoice) {
      router.push('/paywall');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateInvoice(invoice.id, {
        client_id: clientId || undefined,
        client_name_override: clientId ? undefined : clientName || undefined,
        document_type: docType,
        issue_date: issueDate,
        due_date: dueDate || undefined,
        items: items as InvoiceItem[],
        notes: notes || undefined,
        internal_notes: internalNotes || undefined,
        discount_percent: discountPercent > 0 ? discountPercent : undefined,
        order_reference: orderReference || undefined,
        order_number: orderNumber || undefined,
        legal_mentions: legalMentions || undefined,
      });
      toast.success('Facture modifiée avec succès !');
      setSuccess(true);
      setTimeout(() => router.push(`/invoices/${invoice.id}`), 600);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const docConfig = DOC_TYPES.find((d) => d.value === docType)!;

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Check if user can edit
  if (!sub.canEditInvoice) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Lock size={32} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Modification de facture</h1>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          La modification de factures est reservee aux abonnes payants. Passez a un plan Solo, Pro ou Business pour debloquer cette fonctionnalite.
        </p>
        <Button onClick={() => router.push('/paywall')} icon={<ArrowLeft size={16} />}>
          Voir les plans
        </Button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Facture introuvable</p>
        <button onClick={() => router.push('/invoices')} className="mt-3 text-primary font-semibold text-sm hover:underline">Retour</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/invoices/${invoice.id}`}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-black text-gray-900">Modifier {docConfig.label.toLowerCase()}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{invoice.number}</p>
        </div>
        {saving && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-ping" />
            Modification en cours...
          </span>
        )}
        {success && (
          <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <CheckCircle2 size={13} /> Sauvegarde
          </span>
        )}
      </div>

      {/* Document type selector - read only */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 opacity-60 pointer-events-none">
        {DOC_TYPES.map((dt) => {
          const Icon = dt.icon;
          const active = dt.value === docType;
          return (
            <div
              key={dt.value}
              className={cn(
                'relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 text-center',
                active
                  ? `${dt.border} bg-white shadow-md shadow-black/5`
                  : 'border-gray-100 bg-white text-gray-400',
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                active ? dt.bg : 'bg-gray-100',
              )}>
                <Icon size={19} className={active ? dt.color : 'text-gray-400'} />
              </div>
              <div>
                <p className={cn('text-sm font-bold', active ? 'text-gray-900' : 'text-gray-500')}>{dt.label}</p>
                <p className={cn('text-[10px] mt-0.5 hidden sm:block', active ? 'text-gray-400' : 'text-gray-300')}>{dt.description}</p>
              </div>
              {active && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
          );
        })}
      </div>

      {/* Voice / AI / Manual toggle */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
        <button
          onClick={() => setMode('voice')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-initial justify-center',
            mode === 'voice' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Mic size={14} />
          Dictee vocale
        </button>
        <button
          onClick={() => setMode('ai')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-initial justify-center',
            mode === 'ai' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Wand2 size={14} />
          Modifier par IA
        </button>
        <button
          onClick={() => setMode('manual')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-initial justify-center',
            mode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <FileText size={14} />
          Saisie manuelle
        </button>
      </div>

      {/* Voice recorder */}
      {mode === 'voice' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-5 shadow-sm">
          {!sub.canUseVoice && (
            <Link
              href="/paywall"
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-left hover:border-amber-300 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">Disponible avec Solo ou Pro</p>
                <p className="text-xs text-amber-600 mt-0.5">Dictez vos factures a voix haute, l'IA les remplit automatiquement</p>
              </div>
            </Link>
          )}

          {/* Mic button */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {recording && (
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              )}
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={loading}
                className={cn(
                  'relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl',
                  recording
                    ? 'bg-red-500 hover:bg-red-600 scale-110'
                    : 'bg-primary hover:bg-primary-dark hover:scale-105',
                  loading && 'opacity-50 cursor-not-allowed scale-100',
                )}
              >
                {loading ? (
                  <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : recording ? (
                  <MicOff size={30} className="text-white" />
                ) : (
                  <Mic size={30} className="text-white" />
                )}
              </button>
            </div>

            <div className="space-y-1 text-center">
              {recording && (
                <p className="text-lg font-black text-red-500 tabular-nums">{formatTime(recordTime)}</p>
              )}
              <p className="text-sm text-gray-500 font-medium">
                {loading
                  ? 'L\'IA analyse votre enregistrement...'
                  : recording
                  ? 'Parlez clairement — cliquez pour arrêter'
                  : 'Cliquez pour commencer la dictee'}
              </p>
              {!recording && !loading && (
                <p className="text-xs text-gray-300">
                  Ex: "Ajouter une prestation: Design web, 5 jours a 800e, TVA 20%"
                </p>
              )}
            </div>
          </div>

          {transcript && (
            <div className="text-left bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} className="text-primary" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Transcription IA</p>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{transcript}</p>
            </div>
          )}

          {voiceError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{voiceError}</p>
            </div>
          )}

          <button
            onClick={() => setMode('manual')}
            className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors"
          >
            Passer en saisie manuelle &rarr;
          </button>
        </div>
      )}

      {/* AI text generation */}
      {mode === 'ai' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-sm">
          {!sub.canUseVoice && (
            <Link
              href="/paywall"
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-left hover:border-amber-300 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">Disponible avec Solo ou Pro</p>
                <p className="text-xs text-amber-600 mt-0.5">Decrivez vos modifications en texte, l'IA les appliquera</p>
              </div>
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wand2 size={15} className="text-purple-500" />
              <h3 className="text-sm font-bold text-gray-900">Decrivez les modifications</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Exemples: "Ajouter une ligne: Consultation 2h, TVA 20%" ou "Modifier le prix de la premiere ligne a 500e"
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Decrivez vos modifications en langage naturel..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all"
              onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleAiGenerate(); }}
            />
            <p className="text-[11px] text-gray-300 mt-1">Cmd + Entree pour generer</p>
          </div>
          {aiError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{aiError}</p>
            </div>
          )}
          <button
            onClick={handleAiGenerate}
            disabled={aiLoading || !aiPrompt.trim() || !sub.canUseVoice}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-purple-500/20"
          >
            {aiLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                L'IA modifie votre facture...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Modifier avec l'IA
              </>
            )}
          </button>
        </div>
      )}

      {/* Manual form */}
      {mode === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: form */}
          <div className="lg:col-span-2 space-y-3">

            {/* Client section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                <User size={14} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-700">Client</h3>
              </div>
              <div className="p-4">
                <div className="relative">
                  <Input
                    placeholder="Nom du client ou de l'entreprise"
                    value={clientName}
                    onChange={(e) => { setClientName(e.target.value); setClientId(null); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      {suggestions.map((c) => (
                        <button
                          key={c.id}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
                          onMouseDown={() => { setClientName(c.name); setClientId(c.id); setShowSuggestions(false); }}
                        >
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{c.name}</p>
                            {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {clientId && (
                  <p className="text-xs text-primary flex items-center gap-1 mt-2">
                    <CheckCircle2 size={11} /> Client associe — infos bancaires incluses automatiquement
                  </p>
                )}
              </div>
            </div>

            {/* Additional details section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                <Receipt size={14} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-700">Details supplementaires</h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Reference commande</label>
                  <Input
                    value={orderReference}
                    onChange={(e) => setOrderReference(e.target.value)}
                    placeholder="CMD-2024-001"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Numero bon de commande</label>
                  <Input
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="BC-2024-001"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Mentions legales</label>
                <Textarea
                  value={legalMentions}
                  onChange={(e) => setLegalMentions(e.target.value)}
                  placeholder="Conditions generales de vente, penalites de retard..."
                  rows={2}
                />
              </div>
            </div>

            {/* Dates section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                <CalendarIcon size={14} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-700">Dates</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Date d'emission</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      readOnly
                      className="bg-gray-50 cursor-pointer"
                    />
                    {showCalendar && (
                      <div className="absolute top-full right-0 z-30 mt-1">
                        <Calendar
                          value={new Date(issueDate)}
                          onChange={(date) => {
                            setIssueDate(date.toISOString().split('T')[0]);
                            setShowCalendar(false);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Conditions de paiement</label>
                <PaymentTermsSelector
                  termId={paymentTermId}
                  value={paymentDays}
                  onChange={(days, id) => { setPaymentDays(days); setPaymentTermId(id); }}
                  issueDate={issueDate}
                />
                {dueDate && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <span>Date d'echeance estimee : <strong className="text-gray-900">{new Date(dueDate).toLocaleDateString('fr-FR')}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Items section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                <AlignLeft size={14} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-700">Prestations</h3>
                <span className="ml-auto text-[11px] text-gray-300 font-medium">{items.length} ligne{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="p-4 space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="group relative p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary/20 transition-colors"
                  >
                    {/* Line number + move buttons */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-400 bg-white border border-gray-200 w-5 h-5 rounded-md flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {items.length > 1 && (
                          <div className="flex gap-0.5">
                            <button
                              onClick={() => moveItem(item.id, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded text-gray-300 hover:text-gray-600 disabled:opacity-30 transition-colors"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              onClick={() => moveItem(item.id, 'down')}
                              disabled={idx === items.length - 1}
                              className="p-1 rounded text-gray-300 hover:text-gray-600 disabled:opacity-30 transition-colors"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <Input
                      placeholder="Description de la prestation ou du produit"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="mb-2"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        type="number"
                        label="Qte"
                        min="0"
                        step="0.5"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        label="Prix unitaire HT (euro)"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                      <Select
                        label="TVA"
                        value={String(item.vat_rate)}
                        onChange={(e) => updateItem(item.id, 'vat_rate', parseFloat(e.target.value))}
                        options={VAT_RATES}
                      />
                    </div>

                    {/* Line total */}
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-200">
                      <span className="text-xs text-gray-400">
                        {formatCurrency(item.quantity * item.unit_price)} HT
                        {item.vat_rate > 0 && ` + ${item.vat_rate}% TVA`}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(item.quantity * item.unit_price * (1 + item.vat_rate / 100))} TTC
                      </span>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addItem}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary/40 hover:text-primary hover:bg-primary/2 text-sm font-semibold transition-all"
                >
                  <Plus size={15} />
                  Ajouter une ligne
                </button>
              </div>
            </div>

            {/* Notes section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                <AlignLeft size={14} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-700">Notes & conditions</h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Notes visibles par le client</label>
                  <Textarea
                    placeholder={profile?.payment_terms || 'Payable par virement bancaire sous 30 jours a compter de la date de facture...'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                  {profile?.payment_terms && !notes && (
                    <button
                      onClick={() => setNotes(profile.payment_terms ?? '')}
                      className="mt-2 text-xs text-primary font-semibold hover:underline"
                    >
                      Utiliser mes conditions habituelles
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium block mb-1.5">Notes internes (masquees)</label>
                  <Textarea
                    placeholder="Notes pour votre suivi interne..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={2}
                  />
                  <p className="text-[11px] text-gray-300 mt-1">Ces notes ne seront pas affichees sur la facture.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: sticky summary */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 space-y-3">

              {/* Global discount */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Percent size={14} className="text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-700">Remise globale</h3>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-24 px-3 py-2 rounded-xl border border-gray-200 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <span className="text-sm text-gray-500">%</span>
                  {discountPercent > 0 && (
                    <span className="text-sm font-bold text-green-600">−{formatCurrency(discountAmount)}</span>
                  )}
                  {discountPercent > 0 && (
                    <button onClick={() => setDiscountPercent(0)} className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors">Retirer</button>
                  )}
                </div>
                {discountPercent === 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {[5, 10, 15, 20].map((p) => (
                      <button key={p} onClick={() => setDiscountPercent(p)} className={cn('text-xs px-2 py-1 rounded-lg font-semibold transition-colors', discountPercent === p ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-primary/10 hover:text-primary')}>
                        {p}%
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals card */}
              <div className="bg-gray-950 rounded-2xl text-white overflow-hidden shadow-xl">
                <div className="px-5 py-4 border-b border-white/8">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Recapitulatif</p>
                  <p className="text-2xl font-black mt-1 tabular-nums">{formatCurrency(total)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total TTC</p>
                </div>
                <div className="px-5 py-4 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Sous-total HT</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">TVA</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(vatAmount)}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-sm text-green-400">
                      <span>Remise {discountPercent}%</span>
                      <span className="font-semibold tabular-nums">−{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="h-px bg-white/8" />
                  <div className="flex justify-between">
                    <span className="text-white font-bold">Total TTC</span>
                    <span className="text-primary font-black text-lg tabular-nums">{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Items breakdown */}
                {items.filter((i) => i.description || i.unit_price > 0).length > 0 && (
                  <div className="px-5 pb-4">
                    <div className="h-px bg-white/8 mb-3" />
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Lignes</p>
                    <div className="space-y-1.5">
                      {items.filter((i) => i.description || i.unit_price > 0).map((item, idx) => (
                        <div key={item.id} className="flex justify-between items-start gap-2">
                          <p className="text-xs text-gray-400 truncate flex-1">
                            {item.description || `Ligne ${idx + 1}`}
                          </p>
                          <p className="text-xs text-white font-semibold tabular-nums flex-shrink-0">
                            {formatCurrency(item.quantity * item.unit_price * (1 + item.vat_rate / 100))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5 shadow-sm">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Type</span>
                  <span className="font-semibold text-gray-700">{docConfig.label}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Client</span>
                  <span className="font-semibold text-gray-700 truncate max-w-[120px]">{clientName || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Echeance</span>
                  <span className="font-semibold text-gray-700">{dueDate ? new Date(dueDate).toLocaleDateString('fr-FR') : '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Lignes</span>
                  <span className="font-semibold text-gray-700">{items.length}</span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-lg',
                  'bg-primary text-white hover:bg-primary-dark shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]',
                  saving && 'cursor-not-allowed'
                )}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Modification en cours...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Enregistrer les modifications
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
