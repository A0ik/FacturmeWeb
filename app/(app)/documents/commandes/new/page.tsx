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
import { formatCurrency, generateId } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase';
import { InvoiceItem, DocumentType } from '@/types';
import {
  Mic, MicOff, Plus, Trash2, Zap, FileText, Clipboard,
  RefreshCw, ChevronUp, ChevronDown, Sparkles, Calendar as CalendarIcon,
  User, AlignLeft, Receipt, AlertCircle, CheckCircle2,
  ArrowLeft, ShoppingCart, Truck, Banknote, Wand2, Percent, X,
  Send, Loader2, ArrowRight, Package, Search,
} from 'lucide-react';

import { toast } from 'sonner';

const VAT_RATES = [
  { value: '0',   label: '0% — Exonéré' },
  { value: '5.5', label: '5.5% — Réduit' },
  { value: '10',  label: '10% — Intermédiaire' },
  { value: '20',  label: '20% — Normal' },
];

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

export default function NewCommandePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuthStore();
  const { clients, createInvoice } = useDataStore();
  const sub = useSubscription();

  const docType: DocumentType = 'purchase_order';

  const paramClientId = searchParams.get('clientId');
  const paramClientName = searchParams.get('clientName');

  const [mode, setMode] = useState<'voice' | 'ai' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [recordTime, setRecordTime] = useState(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

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

  const [showProductCatalog, setShowProductCatalog] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);

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
          prompt: hasContent ? `MODIFICATION DE COMMANDE:\n${aiPrompt}` : aiPrompt,
          sector: profile?.sector,
          isEdit: hasContent,
          existingItems: hasContent ? items : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { parsed, summary } = data;

      if (parsed?.client_name) {
        const searchTerm = parsed.client_name.toLowerCase();
        let matchingClient = clients.find(c => c.name.toLowerCase() === searchTerm);
        if (!matchingClient) {
          matchingClient = clients.find(c =>
            c.name.toLowerCase().includes(searchTerm) ||
            searchTerm.includes(c.name.toLowerCase())
          );
        }
        if (matchingClient) {
          setClientId(matchingClient.id);
          setClientName(matchingClient.name);
          toast.success(`Client "${matchingClient.name}" sélectionné automatiquement`);
        } else {
          setClientName(parsed.client_name);
          setClientId(null);
        }
      }

      if (!clientId) {
        if (parsed?.client_email) setClientEmail(parsed.client_email);
        if (parsed?.client_phone) setClientPhone(parsed.client_phone);
        if (parsed?.client_address) setClientAddress(parsed.client_address);
        if (parsed?.client_city) setClientCity(parsed.client_city);
        if (parsed?.client_postal_code) setClientPostalCode(parsed.client_postal_code);
        if (parsed?.client_siret) setClientSiret(parsed.client_siret);
        if (parsed?.client_vat_number) setClientVatNumber(parsed.client_vat_number);
      }

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

      if (parsed?.client_name) {
        const searchTerm = parsed.client_name.toLowerCase();
        let matchingClient = clients.find(c => c.name.toLowerCase() === searchTerm);
        if (!matchingClient) {
          matchingClient = clients.find(c =>
            c.name.toLowerCase().includes(searchTerm) ||
            searchTerm.includes(c.name.toLowerCase())
          );
        }
        if (matchingClient) {
          setClientId(matchingClient.id);
          setClientName(matchingClient.name);
          toast.success(`Client "${matchingClient.name}" sélectionné automatiquement`);
        } else {
          setClientName(parsed.client_name);
          setClientId(null);
        }
      }

      if (!clientId) {
        if (parsed?.client_email) setClientEmail(parsed.client_email);
        if (parsed?.client_phone) setClientPhone(parsed.client_phone);
        if (parsed?.client_address) setClientAddress(parsed.client_address);
        if (parsed?.client_city) setClientCity(parsed.client_city);
        if (parsed?.client_postal_code) setClientPostalCode(parsed.client_postal_code);
        if (parsed?.client_siret) setClientSiret(parsed.client_siret);
        if (parsed?.client_vat_number) setClientVatNumber(parsed.client_vat_number);
      }

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

  const fetchProducts = async () => {
    if (!profile?.id) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from('products')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (e: any) {
      console.error('Error fetching products:', e);
      toast.error('Erreur lors du chargement du catalogue');
    } finally {
      setLoadingProducts(false);
    }
  };

  const openProductCatalog = (itemIndex: number) => {
    setCurrentItemIndex(itemIndex);
    setShowProductCatalog(true);
    if (products.length === 0) {
      fetchProducts();
    }
  };

  const selectProduct = (product: Product) => {
    if (currentItemIndex === null) return;
    const updatedItems = [...items];
    updatedItems[currentItemIndex] = {
      ...updatedItems[currentItemIndex],
      description: product.name + (product.description ? `\n${product.description}` : ''),
      unit_price: product.unit_price,
      vat_rate: product.vat_rate,
    };
    setItems(updatedItems);
    setShowProductCatalog(false);
    setCurrentItemIndex(null);
    setProductSearch('');
    toast.success('Produit importé depuis le catalogue');
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.description?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.reference?.toLowerCase().includes(productSearch.toLowerCase())
  );

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
      console.error('[new purchase order] createInvoice error:', e);
      setError(e.message || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-amber-500/[0.02] dark:bg-amber-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-orange-500/[0.02] dark:bg-orange-500/[0.03] rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/documents/commandes')}
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm hover:shadow-md"
        >
          <ArrowLeft size={17} />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Nouveau bon de commande</h1>
          <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-0.5">Remplissez les informations ci-dessous pour créer votre bon de commande.</p>
        </div>
      </motion.div>

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
                  <p className="text-xs text-amber-600 dark:text-amber-500/80 mt-0.5">Dicttez vos commandes à voix haute, l'IA les remplit automatiquement</p>
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
                  className={`relative w-24 sm:w-28 h-24 sm:h-28 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl ${recording ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    Ex: "Bon de commande pour Entreprise XYZ, design web 5 jours à 2000€, TVA 20%"
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
                  <Sparkles size={14} className="text-amber-500" />
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
              className="text-sm text-amber-600 font-semibold hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
            >
              Passer en saisie manuelle →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

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
                  <p className="text-xs text-amber-600 dark:text-amber-500/80 mt-0.5">Décrivez votre bon de commande en texte, l'IA remplit tout</p>
                </div>
              </motion.button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wand2 size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Décrivez votre bon de commande</h3>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Ex: "Bon de commande pour Entreprise XYZ pour développement web, 5 jours à 2000€ HT, TVA 20%"
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 dark:focus:ring-amber-500 dark:focus:border-amber-400 transition-all"
                placeholder="Décrivez votre bon de commande en langage naturel..."
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
              className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold transition-all disabled:opacity-40 shadow-lg shadow-amber-500/20"
            >
              {aiLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  L'IA génère votre bon de commande...
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

      <AnimatePresence>
        {mode === 'manual' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="lg:col-span-2 space-y-3">

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
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 text-xs font-bold flex-shrink-0">
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
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-2">
                      <CheckCircle2 size={12} /> Client associé
                    </p>
                  )}

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
                      className="group relative p-3 sm:p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-white/5 hover:border-amber-500/20 dark:hover:border-amber-500/30 transition-colors"
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

                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Description de la prestation ou du produit"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          className="flex-1"
                        />
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openProductCatalog(idx)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all whitespace-nowrap"
                          title="Importer depuis le catalogue"
                        >
                          <Package size={14} />
                          <span className="hidden sm:inline">Catalogue</span>
                        </motion.button>
                      </div>

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
                    className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:border-amber-500/40 dark:hover:border-amber-500/30 hover:text-amber-600 dark:hover:text-amber-400 text-sm font-semibold transition-all"
                  >
                    <Plus size={15} />
                    Ajouter une ligne
                  </motion.button>
                </div>
              </div>

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
                      className="mt-2 text-xs text-amber-600 font-semibold hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:underline transition-colors"
                    >
                      Utiliser mes conditions habituelles
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-6 space-y-3">

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
                      className="w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-center font-bold bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-amber-500/30 focus:border-amber-500 transition-all"
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
                          className="text-xs px-2 py-1 rounded-lg font-semibold transition-colors bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400"
                        >
                          {p}%
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>

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
                      <span className="text-amber-400 font-black text-lg sm:text-xl tabular-nums">{formatCurrency(total)}</span>
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

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 p-4 space-y-2.5 shadow-sm"
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 dark:text-gray-500">Type</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Bon de commande</span>
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

                <motion.button
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(245,158,11,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-2xl text-sm font-bold transition-all shadow-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30 hover:shadow-amber-500/40 ${saving ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={17} />
                      Créer le bon de commande
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProductCatalog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowProductCatalog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Package size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Catalogue de produits</h3>
                    <p className="text-xs text-gray-500">Sélectionnez un produit à importer</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowProductCatalog(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </motion.button>
              </div>

              <div className="p-4 border-b border-gray-200 dark:border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, référence, description..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="text-amber-500 animate-spin" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {productSearch ? 'Aucun produit trouvé' : 'Votre catalogue est vide'}
                    </p>
                    {!productSearch && (
                      <button
                        onClick={() => { setShowProductCatalog(false); router.push('/products'); }}
                        className="mt-4 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                      >
                        Créer des produits
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <motion.button
                        key={product.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => selectProduct(product)}
                        className="w-full p-4 bg-gray-50 dark:bg-white/5 hover:bg-amber-50 dark:hover:bg-amber-500/10 border border-gray-200 dark:border-white/10 hover:border-amber-200 dark:hover:border-amber-500/30 rounded-2xl transition-all text-left group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {product.name}
                              </p>
                              {product.reference && (
                                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-semibold rounded-full">
                                  {product.reference}
                                </span>
                              )}
                            </div>
                            {product.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded-lg">
                                {product.unit}
                              </span>
                              <span>TVA {product.vat_rate}%</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatCurrency(product.unit_price)}
                            </p>
                            <p className="text-xs text-gray-400">HT/unité</p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
