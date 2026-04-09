'use client';

import { useState, useRef, useMemo } from 'react';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency, cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import {
  Building2, Upload, Check, X, Link2, AlertCircle,
  TrendingDown, TrendingUp, Search, RefreshCw, ChevronRight,
  FileText, CircleCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  matched_invoice_id?: string;
}

const BANKS = [
  { name: 'BNP Paribas', img: '🏦', format: 'CSV (séparateur ;)' },
  { name: 'Société Générale', img: '🏦', format: 'CSV (séparateur ;)' },
  { name: 'Crédit Agricole', img: '🏦', format: 'CSV (séparateur ,)' },
  { name: 'La Banque Postale', img: '🏦', format: 'CSV OFX' },
  { name: 'CIC / Crédit Mutuel', img: '🏦', format: 'CSV (séparateur ;)' },
  { name: 'Boursorama', img: '🏦', format: 'CSV (séparateur ,)' },
  { name: 'N26 / Revolut', img: '🏦', format: 'CSV (séparateur ,)' },
  { name: 'Autre', img: '🏦', format: 'CSV générique' },
];

function parseCSV(text: string): BankTransaction[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  // Try to detect separator
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ''));

  // Find column indexes
  const findCol = (...names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex((h) => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };

  const dateIdx   = findCol('date', 'dat');
  const descIdx   = findCol('libellé', 'libelle', 'description', 'opération', 'operation', 'label');
  const amtIdx    = findCol('montant', 'amount', 'débit/crédit', 'debit/credit', 'valeur');
  const debitIdx  = findCol('débit', 'debit', 'sortie');
  const creditIdx = findCol('crédit', 'credit', 'entrée');

  const transactions: BankTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.replace(/"/g, '').trim());
    if (cols.length < 2) continue;

    const dateStr = dateIdx >= 0 ? cols[dateIdx] : '';
    const desc    = descIdx >= 0 ? cols[descIdx] : cols[1] || '';

    let amount = 0;
    let type: 'credit' | 'debit' = 'credit';

    if (amtIdx >= 0) {
      const raw = cols[amtIdx].replace(',', '.').replace(/\s/g, '');
      amount = Math.abs(parseFloat(raw) || 0);
      type = parseFloat(raw) >= 0 ? 'credit' : 'debit';
    } else if (debitIdx >= 0 || creditIdx >= 0) {
      const debitRaw  = debitIdx >= 0 ? cols[debitIdx]?.replace(',', '.').replace(/\s/g, '') : '';
      const creditRaw = creditIdx >= 0 ? cols[creditIdx]?.replace(',', '.').replace(/\s/g, '') : '';
      const debit  = parseFloat(debitRaw || '0') || 0;
      const credit = parseFloat(creditRaw || '0') || 0;
      if (credit > 0) { amount = credit; type = 'credit'; }
      else if (debit > 0) { amount = debit; type = 'debit'; }
    }

    if (!desc || amount === 0) continue;

    // Parse date
    let parsedDate = dateStr;
    const parts = dateStr.split(/[/\-.]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      else if (parts[0].length === 4) parsedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }

    transactions.push({
      id: `tx-${i}`,
      date: parsedDate,
      description: desc,
      amount,
      type,
    });
  }

  return transactions.sort((a, b) => b.date.localeCompare(a.date));
}

export default function BankingPage() {
  const { invoices } = useDataStore();
  const { user } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [matchedMap, setMatchedMap] = useState<Record<string, string>>({});
  const [showMatchModal, setShowMatchModal] = useState<BankTransaction | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Auto-match: try to match by amount
  const autoMatch = (txs: BankTransaction[]) => {
    const newMap: Record<string, string> = {};
    txs.forEach((tx) => {
      if (tx.type !== 'credit') return;
      const match = invoices.find(
        (inv) =>
          inv.status !== 'paid' &&
          (inv.document_type === 'invoice' || !inv.document_type) &&
          Math.abs(inv.total - tx.amount) < 0.02
      );
      if (match) newMap[tx.id] = match.id;
    });
    return newMap;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const txs = parseCSV(text);
      setTransactions(txs);
      setMatchedMap(autoMatch(txs));
      setImportedCount(txs.length);
    } catch (err) {
      alert('Erreur lors de la lecture du fichier CSV');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleConfirmMatch = async (txId: string, invoiceId: string) => {
    // Mark invoice as paid in Supabase
    await getSupabaseClient()
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', invoiceId);
    setMatchedMap((m) => ({ ...m, [txId]: invoiceId }));
    setTransactions((txs) => txs.map((t) => t.id === txId ? { ...t, matched_invoice_id: invoiceId } : t));
    setShowMatchModal(null);
  };

  const filtered = useMemo(() =>
    transactions.filter((tx) =>
      !search || tx.description.toLowerCase().includes(search.toLowerCase())
    ),
    [transactions, search]
  );

  const creditTotal = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const debitTotal  = transactions.filter((t) => t.type === 'debit').reduce((s, t)  => s + t.amount, 0);
  const matchedCount = Object.keys(matchedMap).length;

  const unmatchedInvoices = invoices.filter(
    (inv) =>
      inv.status !== 'paid' &&
      (inv.document_type === 'invoice' || !inv.document_type)
  );

  return (
    <div className="space-y-6">
      <Header title="Synchronisation bancaire" />

      {/* How it works */}
      {transactions.length === 0 && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Import de relevé bancaire</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Exportez votre relevé de compte au format CSV depuis l&apos;espace client de votre banque,
                puis importez-le ici. Factu.me rapprochera automatiquement les transactions avec vos factures.
              </p>
            </div>
          </div>

          {/* Supported banks */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">Banques compatibles</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BANKS.map((bank) => (
                <div key={bank.name} className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl text-center">
                  <span className="text-2xl">{bank.img}</span>
                  <p className="text-xs font-semibold text-gray-700">{bank.name}</p>
                  <p className="text-[10px] text-gray-400">{bank.format}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">Comment ça marche</h3>
            <div className="space-y-3">
              {[
                { n: '1', title: 'Exportez votre relevé', desc: 'Dans l\'espace client de votre banque, exportez vos transactions au format CSV (généralement dans Historique → Exporter).' },
                { n: '2', title: 'Importez le fichier', desc: 'Cliquez sur "Importer un relevé" et sélectionnez le fichier CSV téléchargé.' },
                { n: '3', title: 'Rapprochement automatique', desc: 'Factu.me détecte automatiquement les transactions correspondant à vos factures en attente (même montant).' },
                { n: '4', title: 'Confirmez et marquez payées', desc: 'Validez les rapprochements et vos factures sont automatiquement marquées comme payées.' },
              ].map((s) => (
                <div key={s.n} className="flex gap-4 p-3.5 rounded-xl border border-gray-100">
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    {s.n}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload CTA */}
          <input ref={fileRef} type="file" accept=".csv,.ofx,.qif" className="hidden" onChange={handleFileUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="w-full flex flex-col items-center gap-3 py-10 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/2 transition-all group"
          >
            {importing
              ? <RefreshCw size={28} className="text-primary animate-spin" />
              : <Upload size={28} className="text-gray-300 group-hover:text-primary transition-colors" />
            }
            <div className="text-center">
              <p className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">
                {importing ? 'Lecture du fichier...' : 'Importer un relevé bancaire'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">CSV, OFX — Tous formats de banques françaises</p>
            </div>
          </button>
        </div>
      )}

      {/* After import */}
      {transactions.length > 0 && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center">
                  <FileText size={13} className="text-gray-500" />
                </div>
                <span className="text-xs text-gray-500">Transactions</span>
              </div>
              <p className="text-xl font-black text-gray-900">{transactions.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center">
                  <TrendingUp size={13} className="text-green-500" />
                </div>
                <span className="text-xs text-gray-500">Entrées</span>
              </div>
              <p className="text-xl font-black text-gray-900">{formatCurrency(creditTotal)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingDown size={13} className="text-red-500" />
                </div>
                <span className="text-xs text-gray-500">Sorties</span>
              </div>
              <p className="text-xl font-black text-gray-900">{formatCurrency(debitTotal)}</p>
            </div>
            <div className="bg-primary/5 rounded-2xl border border-primary/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 size={13} className="text-primary" />
                </div>
                <span className="text-xs text-primary">Rapprochements</span>
              </div>
              <p className="text-xl font-black text-primary">{matchedCount}</p>
              <p className="text-xs text-primary/60 mt-0.5">auto-détectés</p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une transaction..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".csv,.ofx" className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors"
              >
                <Upload size={13} /> Nouveau fichier
              </button>
              <button
                onClick={() => { setTransactions([]); setMatchedMap({}); }}
                className="flex items-center gap-1.5 text-xs font-bold text-red-500 border border-red-100 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors"
              >
                <X size={13} /> Effacer
              </button>
            </div>
          </div>

          {/* Transaction list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-700">Transactions ({filtered.length})</p>
              <span className="text-xs text-gray-400">{matchedCount} rapprochement{matchedCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {filtered.map((tx) => {
                const matchedInvoiceId = matchedMap[tx.id] || tx.matched_invoice_id;
                const matchedInvoice = matchedInvoiceId
                  ? invoices.find((i) => i.id === matchedInvoiceId)
                  : null;

                return (
                  <motion.div
                    key={tx.id}
                    layout
                    className={cn(
                      'flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition-colors',
                      matchedInvoice ? 'bg-green-50/30' : ''
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      tx.type === 'credit' ? 'bg-green-50' : 'bg-red-50'
                    )}>
                      {tx.type === 'credit'
                        ? <TrendingUp size={15} className="text-green-500" />
                        : <TrendingDown size={15} className="text-red-500" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{tx.date ? new Date(tx.date).toLocaleDateString('fr-FR') : tx.date}</p>
                      {matchedInvoice && (
                        <div className="flex items-center gap-1 mt-1">
                          <CircleCheck size={11} className="text-green-500" />
                          <p className="text-[11px] text-green-600 font-semibold">
                            → {matchedInvoice.number} ({matchedInvoice.client?.name || matchedInvoice.client_name_override})
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={cn(
                        'text-sm font-black',
                        tx.type === 'credit' ? 'text-green-600' : 'text-red-500'
                      )}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      {tx.type === 'credit' && !matchedInvoice && (
                        <button
                          onClick={() => setShowMatchModal(tx)}
                          className="text-[11px] font-bold text-primary hover:underline mt-0.5"
                        >
                          Rapprocher →
                        </button>
                      )}
                      {matchedInvoice && (
                        <button
                          onClick={() => handleConfirmMatch(tx.id, matchedInvoice.id)}
                          className="text-[11px] font-bold text-green-600 hover:underline mt-0.5"
                        >
                          ✓ Confirmer payée
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Match modal */}
      <AnimatePresence>
        {showMatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowMatchModal(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Rapprocher avec une facture</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {showMatchModal.description} · {formatCurrency(showMatchModal.amount)}
                  </p>
                </div>
                <button onClick={() => setShowMatchModal(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                {unmatchedInvoices.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Aucune facture en attente</p>
                ) : (
                  unmatchedInvoices.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => handleConfirmMatch(showMatchModal.id, inv.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary hover:bg-primary/3 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{inv.number}</p>
                        <p className="text-xs text-gray-400">{inv.client?.name || inv.client_name_override}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(inv.total)}</p>
                      <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
