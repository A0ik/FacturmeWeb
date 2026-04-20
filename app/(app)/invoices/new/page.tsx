'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { Input, Select, Textarea } from '@/components/ui/Input';
import Calendar from '@/components/ui/Calendar';
import PaymentTermsSelector from '@/components/ui/PaymentTermsSelector';
import FacturXWarnings from '@/components/ui/FacturXWarnings';
import { PDPValidator } from '@/components/ui/PDPValidator';
import { formatCurrency, generateId } from '@/lib/utils';
import { InvoiceItem, DocumentType } from '@/types';
import {
  Mic, MicOff, Plus, Trash2, Zap, FileText, Clipboard,
  RefreshCw, ChevronUp, ChevronDown, Sparkles, Calendar as CalendarIcon,
  User, AlignLeft, Receipt, AlertCircle, CheckCircle2,
  ArrowLeft, ShoppingCart, Truck, Banknote, Wand2, Percent, X,
  Send, Loader2, ArrowRight,
} from 'lucide-react';

import { toast } from 'sonner';

const DOC_TYPES = [
  {
    value: 'invoice',
    label: 'Facture',
    description: 'Document de facturation standard',
    icon: Receipt,
    color: 'text-primary',
    bg: 'bg-primary/10',
    activeBg: 'bg-gradient-to-br from-primary to-primary-dark',
    border: 'border-primary',
  },
  {
    value: 'quote',
    label: 'Devis',
    description: 'Proposition commerciale',
    icon: Clipboard,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    activeBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    border: 'border-blue-500',
  },
  {
    value: 'purchase_order',
    label: 'Bon de commande',
    description: "Commande d'achat officielle",
    icon: ShoppingCart,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    activeBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    border: 'border-amber-500',
  },
  {
    value: 'delivery_note',
    label: 'Bon de livraison',
    description: 'Confirmation de livraison',
    icon: Truck,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    activeBg: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    border: 'border-cyan-500',
  },
  {
    value: 'credit_note',
    label: 'Avoir',
    description: 'Note de credit ou remboursement',
    icon: RefreshCw,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    activeBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    border: 'border-purple-500',
  },
  {
    value: 'deposit',
    label: 'Acompte',
    description: "Facture d'acompte partielle",
    icon: Banknote,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    activeBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    border: 'border-emerald-500',
  },
];

const VAT_RATES = [
  { value: '0',   label: '0% — Exonéré' },
  { value: '5.5', label: '5.5% — Réduit' },
  { value: '10',  label: '10% — Intermédiaire' },
  { value: '20',  label: '20% — Normal' },
];

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuthStore();
  const { clients, createInvoice } = useDataStore();
  const sub = useSubscription();

  // Read URL params (from client page "Nouvelle facture" link)
  const paramClientId = searchParams.get('clientId');
  const paramClientName = searchParams.get('clientName');
  const paramType = searchParams.get('type') as DocumentType | null;

  const [docType, setDocType] = useState<DocumentType>(paramType || 'invoice');
  const [mode, setMode] = useState<'voice' | 'ai' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [recordTime, setRecordTime] = useState(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // AI generation
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Form state
  const [clientName, setClientName] = useState(paramClientName || '');
  const [clientId, setClientId] = useState<string | null>(paramClientId || null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientPostalCode, setClientPostalCode] = useState('');
  const [clientSiret, setClientSiret] = useState('');
  const [clientVatNumber, setClientVatNumber] = useState('');

  const [items, setItems] = useState<Omit<InvoiceItem, 'total'>[]>([
    { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
  ]);

  const [notes, setNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDays, setPaymentDays] = useState<number>(30);
  const [paymentTermId, setPaymentTermId] = useState<string>('days30');
  const [showCalendar, setShowCalendar] = useState(false);
  const [lastGenSource, setLastGenSource] = useState<'voice' | 'ai' | null>(null);

  // Pre-fill client details from selected client
  useEffect(() => {
    if (clientId) {
      const c = clients.find((cl) => cl.id === clientId);
      if (c) {
        setClientEmail(c.email || '');
        setClientPhone(c.phone || '');
        setClientAddress(c.address || '');
        setClientCity(c.city || '');
        setClientPostalCode(c.postal_code || '');
        setClientSiret(c.siret || '');
        setClientVatNumber(c.vat_number || '');
      }
    }
  }, [clientId, clients]);

  const suggestions = clients.filter(
    (c) => clientName.length >= 1 && c.name.toLowerCase().includes(clientName.toLowerCase()),
  );

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

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    if (!sub.canUseVoice) { router.push('/paywall'); return; }
    setAiLoading(true); setAiError('');
    const hasContent = items.some(i => i.description || i.unit_price > 0);
    try {
      const res = await fetch('/api/ai/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: hasContent ? `MODIFICATION DE FACTURE:\n${aiPrompt}` : aiPrompt,
          sector: profile?.sector,
          isEdit: hasContent,
          existingItems: hasContent ? items : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { parsed, summary } = data;
      if (parsed?.client_name) { setClientName(parsed.client_name); setClientId(null); }
      // Auto-fill client details from AI generation
      if (parsed?.client_email) setClientEmail(parsed.client_email);
      if (parsed?.client_phone) setClientPhone(parsed.client_phone);
      if (parsed?.client_address) setClientAddress(parsed.client_address);
      if (parsed?.client_city) setClientCity(parsed.client_city);
      if (parsed?.client_postal_code) setClientPostalCode(parsed.client_postal_code);
      if (parsed?.client_siret) setClientSiret(parsed.client_siret);
      if (parsed?.client_vat_number) setClientVatNumber(parsed.client_vat_number);
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
      if (parsed?.due_days != null) {
        setPaymentDays(parsed.due_days);
        const days = parsed.due_days;
        const termMap: Record<number, string> = { 0: 'reception', 15: 'days15', 30: 'days30', 45: 'days45', 60: 'days60' };
        setPaymentTermId(termMap[days] || `custom-${days}`);
      }
      if (summary) toast.success(summary);
      setAiPrompt('');
      setLastGenSource('ai');
      setMode('manual');
    } catch (e: any) {
      setAiError(e.message || 'Erreur lors de la génération IA');
    } finally {
      setAiLoading(false);
    }
  };

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
    setLoading(true);
  };

  const processVoiceBlob = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      if (profile?.sector) fd.append('sector', profile.sector);
      const hasContent = items.some(i => i.description || i.unit_price > 0);
      if (hasContent) {
        fd.append('isEdit', 'true');
        fd.append('existingItems', JSON.stringify(items));
      }
      const res = await fetch('/api/process-voice', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Erreur de traitement');
      const result = await res.json();
      setTranscript(result.transcript || '');
      const parsed = result.parsed;
      if (parsed?.client_name) { setClientName(parsed.client_name); setClientId(null); }
      // Auto-fill client details from voice input
      if (parsed?.client_email) setClientEmail(parsed.client_email);
      if (parsed?.client_phone) setClientPhone(parsed.client_phone);
      if (parsed?.client_address) setClientAddress(parsed.client_address);
      if (parsed?.client_city) setClientCity(parsed.client_city);
      if (parsed?.client_postal_code) setClientPostalCode(parsed.client_postal_code);
      if (parsed?.client_siret) setClientSiret(parsed.client_siret);
      if (parsed?.client_vat_number) setClientVatNumber(parsed.client_vat_number);
      if (parsed?.items?.length) {
        setItems(parsed.items.map((item: any) => ({
          id: generateId(),
          description: item.description || '',
          quantity: Number(item.quantity) ||1,
          unit_price: Number(item.unit_price) || 0,
          vat_rate: Number(item.vat_rate) || 20,
        })));
      }
      if (parsed?.notes) setNotes(parsed.notes);
      if (parsed?.due_days != null) {
        setPaymentDays(parsed.due_days);
        const days = parsed.due_days;
        const termMap: Record<number, string> = { 0: 'reception', 15: 'days15', 30: 'days30', 45: 'days45', 60: 'days60' };
        setPaymentTermId(termMap[days] || `custom-${days}`);
      }
      if (result.summary) toast.success(result.summary);
      setLastGenSource('voice');
      setMode('manual');
    } catch (e: any) {
      setVoiceError(e.message || 'Erreur lors du traitement vocal');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    if (!clientName && !items[0].description) {
      setError('Renseignez au moins un client ou une prestation.');
      return;
    }
    if (!items.some((i) => i.quantity > 0 && i.unit_price > 0)) {
      setError('Ajoutez au moins une prestation avec un montant.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const newInvoice = await createInvoice({
        client_id: clientId || undefined,
        client_name_override: clientId ? undefined : clientName || undefined,
        document_type: docType,
        issue_date: issueDate,
        due_date: dueDate || undefined,
        items: items,
        notes: notes || undefined,
        discount_percent: discountPercent > 0 ? discountPercent : undefined,
        client_email: clientId ? undefined : clientEmail || undefined,
        client_phone: clientId ? undefined : clientPhone || undefined,
        client_address: clientId ? undefined : clientAddress || undefined,
        client_city: clientId ? undefined : clientCity || undefined,
        client_postal_code: clientId ? undefined : clientPostalCode || undefined,
        client_siret: clientId ? undefined : clientSiret || undefined,
        client_vat_number: clientId ? undefined : clientVatNumber || undefined,
      }, profile);
      toast.success('Document créé avec succès !');
      router.push(`/invoices/${newInvoice.id}`);
    } catch (e: any) {
      console.error('[new invoice] createInvoice error:', e);
      setError(e.message || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const docConfig = DOC_TYPES.find((d) => d.value === docType)!;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/[0.02] dark:bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-purple-500/[0.02] dark:bg-purple-500/[0.03] rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/invoices')}
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm hover:shadow-md"
        >
          <ArrowLeft size={17} />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Nouveau document</h1>
          <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-0.5">Remplissez les informations ci-dessous pour créer votre document.</p>
        </div>
      </motion.div>

      {/* Document type selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3"
      >
        {DOC_TYPES.map((dt) => {
          const Icon = dt.icon;
          const active = docType === dt.value;
          return (
            <motion.button
              key={dt.value}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setDocType(dt.value as DocumentType)}
              className={`relative flex flex-col items-center gap-2 py-4 px-3 sm:py-5 rounded-2xl border-2 text-center transition-all shadow-sm hover:shadow-md ${active ? `${dt.border} bg-white dark:bg-slate-800 shadow-lg shadow-black/5` : 'border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800/50 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors ${active ? dt.activeBg : 'bg-gray-100 dark:bg-slate-700'}`}>
                <Icon size={20} className={active ? 'text-white' : 'text-gray-500'} />
              </div>
              <div>
                <p className={`text-sm sm:text-base font-bold ${active ? 'text-gray-900 dark:text-white' : ''}`}>{dt.label}</p>
                <p className={`text-[10px] sm:text-xs mt-0.5 hidden sm:block ${active ? 'text-gray-400 dark:text-gray-500' : 'text-gray-300 dark:text-gray-600'}`}>{dt.description}</p>
              </div>
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50"
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Mode toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMode('voice')}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-initial justify-center ${mode === 'voice' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-slate-700'}`}
        >
          <Mic size={15} />
          <span className="hidden sm:inline">Dictée vocale</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMode('ai')}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-initial justify-center ${mode === 'ai' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-slate-700'}`}
        >
          <Wand2 size={15} />
          <span className="hidden sm:inline">Générer par IA</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMode('manual')}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-initial justify-center ${mode === 'manual' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-slate-700'}`}
        >
          <FileText size={15} />
          <span className="hidden sm:inline">Saisie manuelle</span>
        </motion.button>
      </motion.div>

      {/* Voice recorder */}
      <AnimatePresence>
        {mode === 'voice' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 p-6 sm:p-8 text-center space-y-5 shadow-sm"
          >
            {!sub.canUseVoice && (
              <motion.button
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => router.push('/paywall')}
                className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3.5 sm:p-4 text-left hover:border-amber-300 dark:hover:border-amber-500/40 transition-colors w-full"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={18} className="text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Disponible avec Solo ou Pro</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500/80 mt-0.5">Dicttez vos factures à voix haute, l'IA les remplit automatiquement</p>
                </div>
              </motion.button>
            )}

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
                  disabled={loading}
                  className={`relative w-24 sm:w-28 h-24 sm:h-28 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl ${recording ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'bg-gradient-to-br from-primary to-primary-dark hover:from-primary-dark hover:to-primary-dark'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <Loader2 size={30} className="text-white animate-spin" />
                  ) : recording ? (
                    <MicOff size={32} className="text-white" />
                  ) : (
                    <Mic size={32} className="text-white" />
                  )}
                </motion.button>
              </div>

              <div className="space-y-1 text-center">
                {recording && (
                  <motion.p
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-lg sm:text-xl font-black text-red-500 tabular-nums"
                  >
                    {formatTime(recordTime)}
                  </motion.p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {loading
                    ? "L'IA analyse votre enregistrement..."
                    : recording
                    ? 'Parlez clairement — cliquez pour arrêter'
                    : 'Cliquez pour commencer la dictée'}
                </p>
                {!recording && !loading && (
                  <p className="text-xs text-gray-300 dark:text-gray-600">
                    Ex: "Facture pour Entreprise XYZ, design web 5 jours à 2000€, TVA 20%"
                  </p>
                )}
              </div>
            </div>

            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-left bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-primary" />
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Transcription IA</p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{transcript}</p>
              </motion.div>
            )}

            {voiceError && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 rounded-xl p-3"
              >
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{voiceError}</p>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode('manual')}
              className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors"
            >
              Passer en saisie manuelle →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI generator */}
      <AnimatePresence>
        {mode === 'ai' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 p-6 sm:p-8 space-y-4 shadow-sm"
          >
            {!sub.canUseVoice && (
              <motion.button
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => router.push('/paywall')}
                className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3.5 sm:p-4 text-left hover:border-amber-300 dark:hover:border-amber-500/40 transition-colors w-full"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={18} className="text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Disponible avec Solo ou Pro</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500/80 mt-0.5">Décrivez votre facture en texte, l'IA remplit tout</p>
                </div>
              </motion.button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wand2 size={16} className="text-purple-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Décrivez votre facture</h3>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Ex: "Facture pour Entreprise XYZ pour développement web, 5 jours à 2000€ HT, TVA 20%"
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 dark:focus:ring-purple-500 dark:focus:border-purple-400 transition-all"
                placeholder="Décrivez votre facture en langage naturel..."
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleAiGenerate(); }}
              />
              <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">Cmd + Entrée pour générer</p>
            </div>
            {aiError && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 rounded-xl p-3"
              >
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAiGenerate}
              disabled={aiLoading || !aiPrompt.trim() || !sub.canUseVoice}
              className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-bold transition-all disabled:opacity-40 shadow-lg shadow-purple-500/20"
            >
              {aiLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  L'IA génère votre facture...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Générer avec l'IA
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual form */}
      <AnimatePresence>
        {mode === 'manual' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            {/* Left: form */}
            <div className="lg:col-span-2 space-y-3">

              {/* Factur-X warnings - only for invoices */}
              {docType === 'invoice' && (
                <>
                  <FacturXWarnings
                    invoice={{
                      number: undefined, // Will be generated
                      issue_date: issueDate,
                      due_date: dueDate || undefined,
                      document_type: docType,
                      client: clientId ? clients.find(c => c.id === clientId) : undefined,
                      client_name_override: clientId ? undefined : clientName || undefined,
                      client_email: clientId ? undefined : clientEmail || undefined,
                      client_phone: clientId ? undefined : clientPhone || undefined,
                      client_address: clientId ? undefined : clientAddress || undefined,
                      client_city: clientId ? undefined : clientCity || undefined,
                      client_postal_code: clientId ? undefined : clientPostalCode || undefined,
                      client_siret: clientId ? undefined : clientSiret || undefined,
                      client_vat_number: clientId ? undefined : clientVatNumber || undefined,
                      items: items,
                    }}
                    profile={profile}
                    variant="banner"
                  />

                  {/* PDP Validator - Conformité État */}
                  <PDPValidator
                    invoice={{
                      number: undefined,
                      issue_date: issueDate,
                      due_date: dueDate || undefined,
                      client: clientId ? clients.find(c => c.id === clientId) : undefined,
                      client_name_override: clientId ? undefined : clientName || undefined,
                      client_siret: clientId ? undefined : clientSiret || undefined,
                      client_vat_number: clientId ? undefined : clientVatNumber || undefined,
                      client_address: clientId ? undefined : clientAddress || undefined,
                      client_city: clientId ? undefined : clientCity || undefined,
                      client_postal_code: clientId ? undefined : clientPostalCode || undefined,
                      items: items,
                    }}
                    profile={profile}
                    mode="inline"
                  />
                </>
              )}

              {/* Generation success banner */}
              {lastGenSource && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-4 py-3 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {lastGenSource === 'ai' ? <Wand2 size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Mic size={16} className="text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                      {lastGenSource === 'ai' ? 'Document généré par IA' : 'Document dicté vocalement'}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500/80 mt-0.5">
                      Vérifiez les informations ci-dessous et modifiez si besoin.
                      {lastGenSource === 'ai' && ' Revenez en mode IA pour affiner.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setMode(lastGenSource)}
                      className="text-xs text-emerald-700 dark:text-emerald-500 font-semibold hover:text-emerald-900 dark:hover:text-emerald-400 underline underline-offset-2 transition-colors"
                    >
                      {lastGenSource === 'ai' ? 'Modifier par IA →' : 'Re-dicter →'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setLastGenSource(null)}
                      className="p-1 rounded text-emerald-400 hover:text-emerald-600 dark:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                    >
                      <X size={13} />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Client section */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm" style={{ overflow: 'visible' }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/50">
                  <User size={15} className="text-gray-400 dark:text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Client</h3>
                </div>
                <div className="p-4">
                  <div className="relative" style={{ zIndex: showSuggestions && suggestions.length > 0 ? 50 : 'auto' }}>
                    <Input
                      placeholder="Nom du client ou de l'entreprise"
                      value={clientName}
                      onChange={(e) => { setClientName(e.target.value); setClientId(null); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden"
                      >
                        {suggestions.slice(0, 5).map((c) => (
                          <button
                            key={c.id}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
                            onMouseDown={() => { setClientName(c.name); setClientId(c.id); setShowSuggestions(false); }}
                          >
                            <div className="w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                              {c.email && <p className="text-xs text-gray-400 dark:text-gray-500">{c.email}</p>}
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                  {clientId && (
                    <p className="text-xs text-primary flex items-center gap-1 mt-2">
                      <CheckCircle2 size={12} /> Client associé
                    </p>
                  )}

                  {/* Expandable client details */}
                  {!clientId && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowClientDetails(!showClientDetails)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 font-medium mt-3 flex items-center gap-1 transition-colors"
                    >
                      <motion.div
                        animate={{ rotate: showClientDetails ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={12} />
                      </motion.div>
                      {showClientDetails ? 'Masquer les détails' : 'Ajouter plus d\'informations'}
                    </motion.button>
                  )}
                  {showClientDetails && !clientId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 space-y-3 border-t border-gray-100 dark:border-white/10 pt-3"
                    >
                      <Input
                        placeholder="Email"
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                      />
                      <Input
                        placeholder="Téléphone"
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                      />
                      <Input
                        placeholder="Adresse"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Code postal"
                          value={clientPostalCode}
                          onChange={(e) => setClientPostalCode(e.target.value)}
                        />
                        <Input
                          placeholder="Ville"
                          value={clientCity}
                          onChange={(e) => setClientCity(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="SIRET (14 chiffres)"
                          value={clientSiret}
                          onChange={(e) => setClientSiret(e.target.value)}
                          maxLength={14}
                        />
                        <Input
                          placeholder="N° TVA (ex: FRXX123456789)"
                          value={clientVatNumber}
                          onChange={(e) => setClientVatNumber(e.target.value)}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Dates section */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/50">
                  <CalendarIcon size={15} className="text-gray-400 dark:text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Dates</h3>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-400 dark:text-gray-500 font-medium block mb-1.5">Date d'émission</label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="bg-gray-50 dark:bg-slate-800 cursor-pointer"
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
                  <label className="text-[11px] text-gray-400 dark:text-gray-500 font-medium block mb-1.5">Conditions de paiement</label>
                  <PaymentTermsSelector
                    termId={paymentTermId}
                    value={paymentDays}
                    onChange={(days, id) => { setPaymentDays(days); setPaymentTermId(id); }}
                    issueDate={issueDate}
                  />
                </div>
              </div>

              {/* Items section */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/50">
                  <AlignLeft size={15} className="text-gray-400 dark:text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Prestations</h3>
                  <span className="ml-auto text-[11px] text-gray-300 dark:text-gray-600 font-medium">{items.length} ligne{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="p-4 space-y-2">
                  {items.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group relative p-3 sm:p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-white/5 hover:border-primary/20 dark:hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-700 border border-gray-200 dark:border-white/10 w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center">
                            {idx + 1}
                          </span>
                          {items.length > 1 && (
                            <div className="flex gap-0.5">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => moveItem(item.id, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                              >
                                <ChevronUp size={12} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => moveItem(item.id, 'down')}
                                disabled={idx === items.length - 1}
                                className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                              >
                                <ChevronDown size={12} />
                              </motion.button>
                            </div>
                          )}
                        </div>
                        {items.length > 1 && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 sm:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-all"
                          >
                            <Trash2 size={13} />
                          </motion.button>
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
                          label="Prix unitaire HT"
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

                      <div className="flex items-center justify-between mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-gray-200 dark:border-white/10">
                        <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                          {formatCurrency(item.quantity * item.unit_price)} HT
                          {item.vat_rate > 0 && ` + ${item.vat_rate}% TVA`}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(item.quantity * item.unit_price * (1 + item.vat_rate / 100))} TTC
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addItem}
                    className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:border-primary/40 dark:hover:border-primary/30 hover:text-primary dark:hover:text-primary text-sm font-semibold transition-all"
                  >
                    <Plus size={15} />
                    Ajouter une ligne
                  </motion.button>
                </div>
              </div>

              {/* Notes section */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/50">
                  <AlignLeft size={15} className="text-gray-400 dark:text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Notes & conditions</h3>
                </div>
                <div className="p-4">
                  <Textarea
                    placeholder={profile?.payment_terms || 'Notes ou conditions de paiement...'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                  {profile?.payment_terms && !notes && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setNotes(profile.payment_terms ?? '')}
                      className="mt-2 text-xs text-primary font-semibold hover:text-primary-dark hover:underline transition-colors"
                    >
                      Utiliser mes conditions habituelles
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: sticky summary */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-6 space-y-3">

                {/* Global discount */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Percent size={15} className="text-gray-400 dark:text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Remise globale</h3>
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
                      className="w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-center font-bold bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                    {discountPercent > 0 && (
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">−{formatCurrency(discountAmount)}</span>
                    )}
                    {discountPercent > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setDiscountPercent(0)}
                        className="ml-auto text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        Retirer
                      </motion.button>
                    )}
                  </div>
                  {discountPercent === 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {[5, 10, 15, 20].map((p) => (
                        <motion.button
                          key={p}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setDiscountPercent(p)}
                          className="text-xs px-2 py-1 rounded-lg font-semibold transition-colors bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary"
                        >
                          {p}%
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Totals card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-slate-900 dark:to-slate-950 rounded-2xl text-white overflow-hidden shadow-xl"
                >
                  <div className="px-5 py-4 border-b border-white/10">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Récapitulatif</p>
                    <p className="text-2xl sm:text-3xl font-black mt-1 tabular-nums">{formatCurrency(total)}</p>
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
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between">
                      <span className="text-white font-bold">Total TTC</span>
                      <span className="text-primary font-black text-lg sm:text-xl tabular-nums">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {items.filter((i) => i.description || i.unit_price > 0).length > 0 && (
                    <div className="px-5 pb-4">
                      <div className="h-px bg-white/10 mb-3" />
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
                </motion.div>

                {/* Info */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 p-4 space-y-2.5 shadow-sm"
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 dark:text-gray-500">Type</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{docConfig.label}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 dark:text-gray-500">Client</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{clientName || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 dark:text-gray-500">Échéance</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{dueDate ? new Date(dueDate).toLocaleDateString('fr-FR') : '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 dark:text-gray-500">Lignes</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{items.length}</span>
                  </div>
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 rounded-xl px-3 py-2.5"
                    >
                      <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CTA */}
                <motion.button
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(29,158,117,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-2xl text-sm font-bold transition-all shadow-xl bg-gradient-to-r from-primary to-primary-dark text-white hover:from-primary-dark hover:to-primary-dark shadow-primary/30 hover:shadow-primary/40 ${saving ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <FileText size={17} />
                      Créer le document
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
