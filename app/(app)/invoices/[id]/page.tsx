'use client';
import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { formatCurrency, generateId } from '@/lib/utils';
import { InvoiceItem, DocumentType } from '@/types';
import {
  Mic, MicOff, Plus, Trash2, Zap, FileText, Clipboard,
  RefreshCw, ChevronUp, ChevronDown, Sparkles, Calendar,
  User, AlignLeft, Receipt, AlertCircle,
  ArrowLeft, ShoppingCart, Truck, Banknote, Wand2, Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DOC_TYPES = [
  { value: 'invoice', label: 'Facture', description: 'Document de facturation standard', icon: Receipt, color: 'text-primary', bg: 'bg-primary-light', activeBg: 'bg-primary', border: 'border-primary' },
  { value: 'quote', label: 'Devis', description: 'Proposition commerciale', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', activeBg: 'bg-blue-600', border: 'border-blue-500' },
  { value: 'purchase_order', label: 'Bon de commande', description: "Commande d'achat officielle", icon: ShoppingCart, color: 'text-amber-600', bg: 'bg-amber-50', activeBg: 'bg-amber-600', border: 'border-amber-500' },
  { value: 'delivery_note', label: 'Bon de livraison', description: 'Confirmation de livraison', icon: Truck, color: 'text-cyan-600', bg: 'bg-cyan-50', activeBg: 'bg-cyan-600', border: 'border-cyan-500' },
  { value: 'credit_note', label: 'Avoir', description: 'Note de credit ou remboursement', icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-50', activeBg: 'bg-purple-600', border: 'border-purple-500' },
  { value: 'deposit', label: 'Acompte', description: "Facture d'acompte partielle", icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50', activeBg: 'bg-emerald-600', border: 'border-emerald-500' },
];

const VAT_RATES = [
  { value: '0', label: '0% — Exonéré' },
  { value: '5.5', label: '5.5% — Réduit' },
  { value: '10', label: '10% — Intermédiaire' },
  { value: '20', label: '20% — Normal' },
];

export default function NewInvoicePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile } = useAuthStore();
  const { clients, createInvoice } = useDataStore();

  const initType = (params.get('type') || 'invoice') as DocumentType;
  const initMode = params.get('mode') || 'manual';

  const [docType, setDocType] = useState<DocumentType>(initType);
  const [mode, setMode] = useState<'voice' | 'ai' | 'manual'>('manual');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // AI generation
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Form state
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [items, setItems] = useState<Omit<InvoiceItem, 'total'>[]>([
    { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 }
  ]);

  const [notes, setNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDays, setDueDays] = useState<number>(30);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const vatAmount = items.reduce((s, i) => s + i.quantity * i.unit_price * (i.vat_rate / 100), 0);
  const discountAmount = discountPercent > 0 ? (subtotal + vatAmount) * (discountPercent / 100) : 0;
  const total = subtotal + vatAmount - discountAmount;

  const getDueDate = () => {
    if (dueDays <= 0) return '';
    const d = new Date(issueDate);
    d.setDate(d.getDate() + dueDays);
    return d.toISOString().split('T')[0];
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiError('');
    try {
      const res = await fetch('/api/ai/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { parsed } = data;
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
      if (parsed?.due_days !== undefined) setDueDays(parsed.due_days);
      setAiPrompt('');
      setMode('manual');
    } catch (e: any) {
      setAiError(e.message || 'Erreur lors de la génération IA');
    } finally {
      setAiLoading(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    setVoiceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        processVoiceBlob();
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      setVoiceError('Accès au microphone refusé. Vérifiez les permissions dans votre navigateur.');
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
      const formData = new FormData();
      formData.append('audio', blob);

      const res = await fetch('/api/process-voice', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Erreur de traitement');

      const result = await res.json();
      setTranscript(result.transcript || '');
      const parsed = result.parsed;

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
      if (parsed?.due_days !== undefined) setDueDays(parsed.due_days);
      setMode('manual');
    } catch (e: any) {
      setVoiceError(e.message || 'Erreur lors du traitement vocal');
    } finally {
      setLoading(false);
    }
  };

  // Form handlers
  const updateItem = (id: string, field: string, value: string | number) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 }
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const newItems = [...prev];
      const [movedItem] = newItems.splice(index, 1);
      newItems.splice(newIndex, 0, movedItem);
      return newItems;
    });
  };

  const handleSave = async () => {
    if (!clientName && items.filter((i) => i.description).length === 0) {
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
      const newInvoice = await createInvoice(
        {
          client_id: clientId || undefined,
          client_name_override: clientId ? undefined : clientName || undefined,
          document_type: docType,
          issue_date: issueDate,
          due_date: getDueDate() || undefined,
          items: items,
          notes: notes || undefined,
          discount_percent: discountPercent > 0 ? discountPercent : undefined,
        },
        profile
      );
      router.push(`/invoices/${newInvoice.id}`);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const handleVoice = () => {
    setMode('voice');
  };

  const handleAi = () => {
    setMode('ai');
  };

  const handleManual = () => {
    setMode('manual');
  };

  const docConfig = DOC_TYPES.find((d) => d.value === docType)!;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900">Nouveau document</h1>
          <p className="text-sm text-gray-400 mt-0.5">Remplissez les informations ci-dessous pour créer votre document.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/invoices')}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>

      {/* Document type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {DOC_TYPES.map((dt) => {
          const Icon = dt.icon;
          const active = docType === dt.value;
          return (
            <button
              key={dt.value}
              onClick={() => setDocType(dt.value as DocumentType)}
              className={cn(
                'relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 text-center transition-all',
                active
                  ? `${dt.activeBg} text-white shadow-md`
                  : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50',
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                active ? dt.bg : 'bg-gray-100',
              )}>
                <Icon size={19} className={active ? dt.color : 'text-gray-400'} />
              </div>
              <div className="text-[10px] font-bold mt-1">{dt.label}</div>
              {active && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
              )}
              <p className={cn('text-[10px] mt-0.5 hidden sm:block transition-opacity', active ? 'opacity-100' : 'opacity-0')}>
                {dt.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={handleVoice}
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            mode === 'voice' ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-700',
          )}
        >
          <MicOff size={14} />
          Dicée vocale
        </button>
        <button
          onClick={handleAi}
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            mode === 'ai' ? 'bg-purple-500 text-white' : 'text-gray-600 hover:text-gray-700',
          )}
        >
          <Wand2 size={14} />
          Générer par IA
        </button>
        <button
          onClick={handleManual}
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            mode === 'manual' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-700',
          )}
        >
          <FileText size={14} />
          Saisie manuelle
        </button>
      </div>

      {/* Voice recorder */}
      {mode === 'voice' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-6">
          {!loading && (
            <>
              <p className="text-sm text-gray-500 mb-4">Cliquez sur le bouton pour commencer à dicter.</p>
              <div className="flex flex-wrap justify-center gap-4">
                {[15, 30, 45, 60].map((days) => (
                  <button
                    key={days}
                    onClick={() => setDueDays(days)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-primary hover:bg-primary-light transition-all"
                  >
                    J+{days}
                  </button>
                ))}
              </div>
            </>
          )}
          {recording && (
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mb-8">
              <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
              <button
                onClick={stopRecording}
                className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xl"
              >
                <Mic size={32} className="text-white" />
              </button>
            </div>
          )}
          {loading && (
            <p className="text-lg text-gray-500 animate-pulse">L'IA écoute votre enregistrement...</p>
          )}
          {transcript && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-purple-500 flex-shrink-0" />
                <p className="text-sm text-gray-700 font-medium">Transcription IA</p>
              </div>
              <p className="text-xs text-gray-500">{transcript}</p>
            </div>
          )}
          {voiceError && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-left">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{voiceError}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI generator */}
      {mode === 'ai' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {!loading && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Décrivez votre facture en langage naturel. L'IA analysera votre demande et remplira automatiquement tous les champs.
              </p>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                placeholder="Ex: 'Facture pour Entreprise XYZ pour développement web site, 5 jours à 2000€ HT, TVA 20%'"
                className="flex-1"
              />
              <p className="text-[11px] text-gray-300 mt-1">Appuyez sur Entrée pour générer.</p>
              {aiError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600">{aiError}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-purple-500/20"
              >
                {aiLoading ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Wand2 size={16} className="text-white" />
                    Générer
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* Manual form */}
      {mode === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Client section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                <User size={14} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-700">Client</h3>
              </div>
              <div className="p-4">
                <Input
                  placeholder="Nom du client ou de l'entreprise"
                  value={clientName}
                  onChange={(e) => { setClientName(e.target.value); setClientId(null); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && clientName.length > 0 && clients.length > 0 && (
                  <div className="relative">
                    <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-64 max-h-48 overflow-y-auto">
                      {clients.slice(0, 5).map((client) => (
                        <button
                          key={client.id}
                          onMouseDown={() => { setClientName(client.name); setClientId(client.id); setShowSuggestions(false); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                              <p className="text-xs text-gray-400">{client.email || ''}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dates section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                <Calendar size={14} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-700">Dates & Conditions</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Date d'émission</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Échéance</label>
                    <input
                      type="date"
                      value={dueDays > 0 ? getDueDate() : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const today = new Date();
                          const selected = new Date(e.target.value);
                          const diffTime = Math.ceil((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          setDueDays(diffTime > 0 ? diffTime : 0);
                        } else {
                          setDueDays(0);
                        }
                      }}
                      min={issueDate}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[0, 15, 30, 45, 60, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() => setDueDays(days)}
                      className={cn(
                        "text-xs px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-primary hover:bg-primary-light transition-all",
                        dueDays === days && "bg-primary text-white border-primary"
                      )}
                    >
                      {days === 0 ? "Comptant" : `À ${days} jours`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Items section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <AlignLeft size={14} className="text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-700">Prestations</h3>
                </div>
                <span className="text-[11px] text-gray-300 font-medium">{items.length} ligne{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="p-4 space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4 group">
                    {/* Line controls */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] text-gray-300 font-medium">#{idx + 1}</span>
                      <div className="flex gap-1">
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
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          className="p-1 rounded text-red-300 hover:text-red-600 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Line content */}
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Description de la prestation"
                      className="flex-1"
                    />
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Input
                        type="number"
                        label="Qté"
                        min="0"
                        step="0.5"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        label="Prix HT"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.id, 'unit_price', Number(e.target.value) || 0)}
                      />
                      <Select
                        value={String(item.vat_rate)}
                        options={VAT_RATES}
                        onChange={(e) => updateItem(item.id, 'vat_rate', Number(e.target.value) || 20)}
                      />
                    </div>
                    <div className="mt-2">
                      <Input
                        type="number"
                        label="Total TTC"
                        readOnly
                        value={item.quantity * item.unit_price * (1 + item.vat_rate / 100)}
                        className="text-center font-bold bg-gray-900 text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3 px-4">
                <button
                  onClick={addItem}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary/40 hover:text-primary transition-all"
                >
                  <Plus size={16} />
                  Ajouter une ligne
                </button>
              </div>
            </div>

            {/* Notes section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-50 bg-gray-50/50">
                <AlignLeft size={14} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-700">Notes</h3>
              </div>
              <div className="p-4">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes ou conditions de paiement..."
                  className="flex-1"
                />
              </div>
            </div>

            {/* Discount section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                <Percent size={14} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-700">Remise globale</h3>
              </div>
              <div className="p-4 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  placeholder="0"
                  className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
                <span className="text-gray-500">%</span>
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setDiscountPercent(pct)}
                    className={cn(
                      "text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors",
                      discountPercent === pct && "bg-primary text-white"
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: summary */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm sticky top-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Récapitulatif</h3>
              <p className="text-xs text-gray-400 mb-1">Sous-total HT</p>
              <p className="text-2xl font-black tabular-nums text-gray-900">{formatCurrency(subtotal)}</p>

              <div className="h-px bg-gray-200 rounded-full overflow-hidden my-4"></div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>TVA :</span>
                  <span className="font-bold text-gray-900">{formatCurrency(vatAmount)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Remise :</span>
                    <span className="font-bold">{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="h-px bg-gray-200 rounded-full overflow-hidden"></div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-400">Total TTC</p>
                    <p className="text-2xl font-black tabular-nums text-gray-900">{formatCurrency(total)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="sticky bottom-0 left-1/2 -translate-x-1/2 z-50 pb-4">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-bold hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FileText size={16} className="text-white" />
                    Créer le document
                  </>
                )}
              </button>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <AlertCircle size={14} className="text-red-500 mx-auto mb-1" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}