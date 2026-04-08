'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, FileText, Image, FileSpreadsheet, File,
  Sparkles, Check, AlertCircle, ChevronRight, Building2,
  Trash2, Edit2, CheckSquare, Square, ArrowLeft, RefreshCw,
  Info, Hash, Mail, Phone, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExtractedCompany {
  name: string;
  siret: string | null;
  vat_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string;
  website: string | null;
}

interface ImportResult {
  companies: ExtractedCompany[];
  summary: string;
  total: number;
}

type Step = 'upload' | 'analyzing' | 'review' | 'importing' | 'done';

const FILE_TYPES = [
  { ext: 'PDF', icon: FileText, color: 'text-red-500 bg-red-50' },
  { ext: 'CSV', icon: FileSpreadsheet, color: 'text-green-600 bg-green-50' },
  { ext: 'Excel', icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-50' },
  { ext: 'Image', icon: Image, color: 'text-blue-500 bg-blue-50' },
  { ext: 'Word', icon: FileText, color: 'text-blue-700 bg-blue-50' },
  { ext: 'TXT', icon: File, color: 'text-gray-500 bg-gray-50' },
];

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' };
  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) return { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50' };
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return { icon: Image, color: 'text-blue-500', bg: 'bg-blue-50' };
  if (['doc', 'docx'].includes(ext)) return { icon: FileText, color: 'text-blue-700', bg: 'bg-blue-50' };
  return { icon: File, color: 'text-gray-500', bg: 'bg-gray-50' };
}

function SiretBadge({ siret }: { siret: string | null }) {
  if (!siret) return null;
  const valid = /^\d{14}$/.test(siret);
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border',
      valid ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'
    )}>
      <Hash size={9} />
      {siret}
    </span>
  );
}

const DOTS_MESSAGES = [
  'Lecture du fichier...',
  'Analyse du contenu avec l\'IA...',
  'Détection des entreprises...',
  'Extraction des SIRET...',
  'Validation des données...',
  'Finalisation...',
];

function AnalyzingStep({ fileName }: { fileName: string }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((i) => Math.min(i + 1, DOTS_MESSAGES.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Animated rings */}
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" style={{ animationDuration: '1.5s' }} />
        <div className="absolute inset-2 rounded-full border-4 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
            <Sparkles size={24} className="text-white" />
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-1">Analyse IA en cours</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-xs">
        GPT-4o analyse votre fichier <span className="font-semibold text-gray-700">{fileName}</span> pour détecter les entreprises
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={msgIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/8 border border-primary/15"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <span className="text-xs font-medium text-primary">{DOTS_MESSAGES[msgIdx]}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (companies: ExtractedCompany[]) => Promise<void>;
}

export function ImportClientsModal({ open, onClose, onImport }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtractedCompany>>({});
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setResult(null);
    setError('');
    setSelected(new Set());
    setEditing(null);
    setImportProgress(0);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelected(dropped);
  }, []);

  const handleFileSelected = (f: File) => {
    setFile(f);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep('analyzing');
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/import/clients', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'analyse');

      setResult(data);
      // Pre-select all valid companies
      setSelected(new Set(data.companies.map((_: any, i: number) => i)));
      setStep('review');
    } catch (e: any) {
      setError(e.message);
      setStep('upload');
    }
  };

  const toggleSelect = (i: number) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (!result) return;
    if (selected.size === result.companies.length) setSelected(new Set());
    else setSelected(new Set(result.companies.map((_, i) => i)));
  };

  const startEdit = (i: number) => {
    setEditing(i);
    setEditForm({ ...result!.companies[i] });
  };

  const saveEdit = () => {
    if (editing === null || !result) return;
    const updated = [...result.companies];
    updated[editing] = { ...updated[editing], ...editForm } as ExtractedCompany;
    setResult({ ...result, companies: updated });
    setEditing(null);
  };

  const removeCompany = (i: number) => {
    if (!result) return;
    const updated = result.companies.filter((_, idx) => idx !== i);
    setResult({ ...result, companies: updated, total: updated.length });
    setSelected((s) => {
      const next = new Set<number>();
      s.forEach((v) => { if (v < i) next.add(v); else if (v > i) next.add(v - 1); });
      return next;
    });
  };

  const handleImport = async () => {
    if (!result) return;
    const toImport = result.companies.filter((_, i) => selected.has(i));
    if (toImport.length === 0) return;

    setStep('importing');
    setImportProgress(0);

    try {
      // Simulate progress while importing
      const progressInterval = setInterval(() => {
        setImportProgress((p) => Math.min(p + Math.random() * 20, 90));
      }, 300);

      await onImport(toImport);

      clearInterval(progressInterval);
      setImportProgress(100);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
      setStep('review');
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
          style={{ maxHeight: '90vh' }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Import IA de clients</h2>
                <p className="text-xs text-gray-500">Dépose n'importe quel fichier — l'IA fait le reste</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(step === 'review' || step === 'done') && (
                <button onClick={reset} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                  <RefreshCw size={15} />
                </button>
              )}
              <button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Step indicator */}
          <div className="px-6 py-2.5 flex items-center gap-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
            {(['upload', 'analyzing', 'review', 'done'] as Step[]).map((s, i, arr) => {
              const currentIdx = arr.indexOf(step === 'importing' ? 'done' : step);
              return (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                  step === s || (step === 'importing' && s === 'done') ? 'bg-primary text-white scale-110' :
                  currentIdx > i ? 'bg-green-500 text-white' :
                  'bg-gray-200 text-gray-400'
                )}>
                  {currentIdx > i ? <Check size={10} /> : i + 1}
                </div>
                <span className={cn(
                  'text-xs font-medium capitalize hidden sm:inline',
                  step === s ? 'text-gray-900' : 'text-gray-400'
                )}>
                  {s === 'upload' ? 'Fichier' : s === 'analyzing' ? 'Analyse' : s === 'review' ? 'Vérification' : 'Importé'}
                </span>
                {i < arr.length - 1 && <ChevronRight size={12} className="text-gray-300" />}
              </div>
              );
            })}
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
            <AnimatePresence mode="wait">

              {/* ── UPLOAD STEP ── */}
              {step === 'upload' && (
                <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
                  {/* Drop zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
                      isDragging ? 'border-primary bg-primary/5 scale-[1.01]' :
                      file ? 'border-green-400 bg-green-50' :
                      'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.csv,.xlsx,.xls,.ods,.png,.jpg,.jpeg,.webp,.txt,.json,.xml,.doc,.docx"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }}
                    />

                    {file ? (
                      <div className="space-y-3">
                        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto', getFileIcon(file.name).bg)}>
                          {(() => { const { icon: Icon, color } = getFileIcon(file.name); return <Icon size={26} className={color} />; })()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-400 mt-0.5">{(file.size / 1024).toFixed(0)} Ko · Cliquer pour changer</p>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-green-600">
                          <Check size={15} />
                          <span className="text-sm font-semibold">Fichier prêt pour l'analyse</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
                          <Upload size={24} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700">Dépose ton fichier ici</p>
                          <p className="text-sm text-gray-400 mt-0.5">ou clique pour parcourir</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Supported formats */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Formats acceptés</p>
                    <div className="flex flex-wrap gap-2">
                      {FILE_TYPES.map(({ ext, icon: Icon, color }) => (
                        <div key={ext} className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', color)}>
                          <Icon size={12} />
                          {ext}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Examples */}
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                    <div className="flex items-start gap-2">
                      <Info size={14} className="text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-primary/80 leading-relaxed">
                        Fonctionne avec <span className="font-semibold">factures fournisseurs, contrats, annuaires, fichiers comptables, exports CRM, captures d'écran</span>… L'IA détecte automatiquement les entreprises et leurs SIRET.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100 text-red-600">
                      <AlertCircle size={15} className="flex-shrink-0" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={!file}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                  >
                    <Sparkles size={16} />
                    Analyser avec l'IA
                    <ChevronRight size={15} />
                  </button>
                </motion.div>
              )}

              {/* ── ANALYZING STEP ── */}
              {step === 'analyzing' && (
                <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AnalyzingStep fileName={file?.name || ''} />
                </motion.div>
              )}

              {/* ── REVIEW STEP ── */}
              {step === 'review' && result && (
                <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
                  {/* Summary bar */}
                  <div className="px-6 py-3 bg-gradient-to-r from-primary/8 to-transparent border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Building2 size={13} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{result.companies.length} entreprise{result.companies.length > 1 ? 's' : ''} détectée{result.companies.length > 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-500">{result.summary}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary">{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
                  </div>

                  {result.companies.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                        <AlertCircle size={22} className="text-amber-500" />
                      </div>
                      <p className="font-bold text-gray-800">Aucune entreprise détectée</p>
                      <p className="text-sm text-gray-400 mt-1">L'IA n'a pas trouvé de données exploitables dans ce fichier.</p>
                    </div>
                  ) : (
                    <div>
                      {/* Select all */}
                      <div className="px-6 py-2.5 border-b border-gray-50 flex items-center justify-between">
                        <button
                          onClick={toggleAll}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          {selected.size === result.companies.length
                            ? <CheckSquare size={14} className="text-primary" />
                            : <Square size={14} className="text-gray-400" />}
                          {selected.size === result.companies.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                        <span className="text-[11px] text-gray-400">Cliquez sur ✏️ pour modifier</span>
                      </div>

                      {/* Company list */}
                      <div className="divide-y divide-gray-50">
                        {result.companies.map((company, i) => (
                          <div key={i} className={cn('px-6 py-3.5 transition-colors', selected.has(i) ? 'bg-white' : 'bg-gray-50/50')}>
                            {editing === i ? (
                              /* Edit form */
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Raison sociale *</label>
                                    <input
                                      value={editForm.name || ''}
                                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                      className="w-full px-3 py-2 rounded-lg border border-primary/30 text-sm font-semibold bg-primary/3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">SIRET</label>
                                    <input
                                      value={editForm.siret || ''}
                                      onChange={(e) => setEditForm((f) => ({ ...f, siret: e.target.value || null }))}
                                      placeholder="14 chiffres"
                                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">N° TVA</label>
                                    <input
                                      value={editForm.vat_number || ''}
                                      onChange={(e) => setEditForm((f) => ({ ...f, vat_number: e.target.value || null }))}
                                      placeholder="FR12345678901"
                                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Email</label>
                                    <input
                                      value={editForm.email || ''}
                                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value || null }))}
                                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Téléphone</label>
                                    <input
                                      value={editForm.phone || ''}
                                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value || null }))}
                                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Adresse</label>
                                    <input
                                      value={editForm.address || ''}
                                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value || null }))}
                                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">CP</label>
                                    <input
                                      value={editForm.postal_code || ''}
                                      onChange={(e) => setEditForm((f) => ({ ...f, postal_code: e.target.value || null }))}
                                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Ville</label>
                                    <input
                                      value={editForm.city || ''}
                                      onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value || null }))}
                                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => setEditing(null)}
                                    className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    onClick={saveEdit}
                                    className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    <Check size={13} /> Sauvegarder
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Company card */
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => toggleSelect(i)}
                                  className="mt-0.5 flex-shrink-0"
                                >
                                  {selected.has(i)
                                    ? <CheckSquare size={17} className="text-primary" />
                                    : <Square size={17} className="text-gray-300" />}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-gray-900">{company.name}</p>
                                    <SiretBadge siret={company.siret} />
                                    {company.vat_number && (
                                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 border border-purple-100 text-purple-700">
                                        TVA {company.vat_number}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                    {company.email && (
                                      <span className="flex items-center gap-1 text-xs text-gray-400">
                                        <Mail size={10} />{company.email}
                                      </span>
                                    )}
                                    {company.phone && (
                                      <span className="flex items-center gap-1 text-xs text-gray-400">
                                        <Phone size={10} />{company.phone}
                                      </span>
                                    )}
                                    {(company.city || company.postal_code) && (
                                      <span className="flex items-center gap-1 text-xs text-gray-400">
                                        <MapPin size={10} />{[company.postal_code, company.city].filter(Boolean).join(' ')}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => startEdit(i)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => removeCompany(i)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mx-6 mb-4 flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100 text-red-600">
                      <AlertCircle size={15} />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  {/* Import footer */}
                  <div className="sticky bottom-0 px-6 py-4 bg-white border-t border-gray-100 flex gap-3">
                    <button
                      onClick={reset}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <ArrowLeft size={14} />
                      Retour
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={selected.size === 0}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Building2 size={15} />
                      Importer {selected.size} client{selected.size > 1 ? 's' : ''}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── IMPORTING STEP ── */}
              {step === 'importing' && (
                <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Building2 size={26} className="text-primary" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Import en cours…</h3>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <motion.div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                      animate={{ width: `${importProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-sm text-gray-400">{Math.round(importProgress)}%</p>
                </motion.div>
              )}

              {/* ── DONE STEP ── */}
              {step === 'done' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-10 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
                  >
                    <Check size={36} className="text-green-500" strokeWidth={2.5} />
                  </motion.div>
                  <h3 className="text-xl font-black text-gray-900 mb-1">Import réussi !</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    {selected.size} client{selected.size > 1 ? 's' : ''} ajouté{selected.size > 1 ? 's' : ''} à votre carnet
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-8 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors"
                  >
                    Parfait !
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ImportClientsModal;
