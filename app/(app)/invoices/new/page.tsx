'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { formatCurrency, generateId } from '@/lib/utils';
import { InvoiceItem, DocumentType } from '@/types';
import { Mic, MicOff, Plus, Trash2, Zap, FileText, Clipboard, RefreshCw } from 'lucide-react';

const DOC_TYPES = [
  { value: 'invoice', label: 'Facture', icon: FileText, color: 'bg-primary', border: 'border-primary' },
  { value: 'quote', label: 'Devis', icon: Clipboard, color: 'bg-blue-500', border: 'border-blue-500' },
  { value: 'credit_note', label: 'Avoir', icon: RefreshCw, color: 'bg-purple-500', border: 'border-purple-500' },
];

const VAT_RATES = [
  { value: '0', label: '0%' },
  { value: '5.5', label: '5.5%' },
  { value: '10', label: '10%' },
  { value: '20', label: '20%' },
];

export default function NewInvoicePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile, fetchProfile, user } = useAuthStore();
  const { createInvoice, clients } = useDataStore();
  const sub = useSubscription();

  const initType = (params.get('type') || 'invoice') as DocumentType;
  const initMode = params.get('mode') || 'voice';

  const [docType, setDocType] = useState<DocumentType>(initType);
  const [mode, setMode] = useState<'voice' | 'manual'>(initMode === 'manual' ? 'manual' : 'voice');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Voice
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Form
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [items, setItems] = useState<Omit<InvoiceItem, 'total'>[]>([
    { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
  ]);
  const [notes, setNotes] = useState('');
  const [issueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [error, setError] = useState('');

  const suggestions = clients.filter((c) => clientName.length >= 1 && c.name.toLowerCase().includes(clientName.toLowerCase()));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const vatAmount = items.reduce((s, i) => s + i.quantity * i.unit_price * (i.vat_rate / 100), 0);
  const total = subtotal + vatAmount;

  // ── Voice ──
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
      setVoiceError('Accès au microphone refusé. Vérifiez les permissions.');
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
      const res = await fetch('/api/process-voice', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Erreur de traitement');
      const result = await res.json();
      setTranscript(result.transcript || '');
      const parsed = result.parsed;
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
      if (parsed?.due_days > 0) {
        const d = new Date(); d.setDate(d.getDate() + parsed.due_days);
        setDueDate(d.toISOString().split('T')[0]);
      }
      setMode('manual');
    } catch (e: any) {
      setVoiceError(e.message || 'Erreur lors du traitement vocal');
    } finally {
      setLoading(false);
    }
  };

  // ── Items ──
  const updateItem = (id: string, field: string, value: string | number) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };
  const addItem = () => setItems((prev) => [...prev, { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 }]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  // ── Save ──
  const handleSave = async () => {
    if (!clientName && !items[0].description) { setError('Renseignez au moins un client ou une prestation'); return; }
    if (sub.isAtLimit) { router.push('/paywall'); return; }
    setSaving(true);
    setError('');
    try {
      const inv = await createInvoice({
        client_id: clientId || undefined,
        client_name_override: clientId ? undefined : clientName || undefined,
        document_type: docType,
        issue_date: issueDate,
        due_date: dueDate || undefined,
        items: items as InvoiceItem[],
        notes: notes || undefined,
      }, profile);
      if (user) await fetchProfile(user.id);
      router.push(`/invoices/${inv.id}`);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const docConfig = DOC_TYPES.find((d) => d.value === docType)!;

  return (
    <div className="space-y-4 max-w-2xl">
      <Header title="Nouveau document" back="/invoices" />

      {/* Doc type selector */}
      <div className="flex gap-2">
        {DOC_TYPES.map((dt) => {
          const Icon = dt.icon;
          return (
            <button
              key={dt.value}
              onClick={() => setDocType(dt.value as DocumentType)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition-all ${docType === dt.value ? `${dt.border} text-white ${dt.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}
            >
              <Icon size={18} />
              {dt.label}
            </button>
          );
        })}
      </div>

      {/* Voice / Manual toggle */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setMode('voice')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'voice' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          <Mic size={14} className="inline mr-1.5" />Dictée vocale
        </button>
        <button onClick={() => setMode('manual')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          <FileText size={14} className="inline mr-1.5" />Saisie manuelle
        </button>
      </div>

      {/* Voice recorder */}
      {mode === 'voice' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-4">
          {!sub.canUseVoice && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
              <Zap size={16} className="text-yellow-500 flex-shrink-0" />
              La dictée vocale est disponible avec un abonnement Solo ou Pro.
            </div>
          )}

          <div className="relative inline-flex">
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={loading}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${recording ? 'bg-red-500 scale-110 animate-pulse' : 'bg-primary hover:bg-primary-dark'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : recording ? (
                <MicOff size={28} className="text-white" />
              ) : (
                <Mic size={28} className="text-white" />
              )}
            </button>
            {recording && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full animate-ping" />}
          </div>

          <p className="text-sm text-gray-500">
            {loading ? 'Traitement en cours...' : recording ? 'Parlez maintenant, cliquez pour arrêter' : 'Cliquez pour commencer la dictée'}
          </p>

          {transcript && (
            <div className="text-left bg-gray-50 rounded-xl p-3 text-sm text-gray-600 border border-gray-200">
              <p className="text-xs font-bold text-gray-400 mb-1">Transcription :</p>
              {transcript}
            </div>
          )}

          {voiceError && <p className="text-sm text-red-500 bg-red-50 rounded-xl p-3">{voiceError}</p>}

          <button onClick={() => setMode('manual')} className="text-sm text-primary font-semibold hover:underline">
            Passer en saisie manuelle →
          </button>
        </div>
      )}

      {/* Manual form */}
      {mode === 'manual' && (
        <div className="space-y-4">
          {/* Client */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h3 className="font-bold text-gray-900">Client</h3>
            <div className="relative">
              <Input
                placeholder="Nom du client"
                value={clientName}
                onChange={(e) => { setClientName(e.target.value); setClientId(null); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map((c) => (
                    <button key={c.id} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 font-medium text-gray-900" onMouseDown={() => { setClientName(c.name); setClientId(c.id); setShowSuggestions(false); }}>
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h3 className="font-bold text-gray-900">Dates</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date d'émission" type="date" value={issueDate} readOnly className="bg-gray-50" />
              <Input label="Échéance" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h3 className="font-bold text-gray-900">Prestations</h3>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">Ligne {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <Input placeholder="Description de la prestation" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="number" label="Qté" min="0" step="0.5" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                    <Input type="number" label="Prix unit. (€)" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)} />
                    <Select label="TVA" value={String(item.vat_rate)} onChange={(e) => updateItem(item.id, 'vat_rate', parseFloat(e.target.value))} options={VAT_RATES} />
                  </div>
                  <p className="text-right text-sm font-bold text-gray-700">{formatCurrency(item.quantity * item.unit_price * (1 + item.vat_rate / 100))} TTC</p>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="flex items-center gap-2 text-sm text-primary font-semibold hover:underline">
              <Plus size={16} /> Ajouter une ligne
            </button>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Sous-total HT</span><span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>TVA</span><span className="font-semibold">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900">
                <span>Total TTC</span><span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <Textarea label="Notes / Conditions de paiement" placeholder="Payable par virement sous 30 jours..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

          <Button className="w-full" size="lg" onClick={handleSave} loading={saving}>
            Créer {docConfig.label.toLowerCase()}
          </Button>
        </div>
      )}
    </div>
  );
}
