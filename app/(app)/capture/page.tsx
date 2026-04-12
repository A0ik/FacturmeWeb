'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getSupabaseClient } from '@/lib/supabase';
import { CapturedDocument, CaptureStatus } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Upload, Camera, FileText, Search, Trash2, CheckCircle2,
  Eye, X, ChevronDown, Image as ImageIcon, File as FileIcon, Plus,
  AlertTriangle, Download, Sparkles, Archive, ZoomIn,
  Check, FileSpreadsheet, Building2, RotateCcw, Database,
  CreditCard, Building, ShoppingBag, TrendingUp, Receipt,
  Layers, SlidersHorizontal,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

// ─── Image compression ────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return; }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ─── Reliable PDF page count ──────────────────────────────────────────────────
// Uses raw byte scanning instead of pdf-lib.getPageCount() which can return
// wildly wrong values for encrypted / hybrid-ref / linearized PDFs.
// Hard cap: 50 pages — no real invoice has more.

function detectPDFPageCount(arrayBuffer: ArrayBuffer): number {
  const MAX = 50;
  try {
    const scan = arrayBuffer.byteLength > 524288 ? arrayBuffer.slice(0, 524288) : arrayBuffer;
    const text = new TextDecoder('latin1').decode(new Uint8Array(scan));

    // Primary: Find the Pages catalog /Count - look for /Type /Pages followed by /Count
    // This is more specific than matching any /Count
    const pagesCatalogPattern = /\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/;
    const catalogMatch = text.match(pagesCatalogPattern);
    if (catalogMatch) {
      const count = parseInt(catalogMatch[1]);
      if (count >= 1 && count <= MAX) return count;
    }

    // Fallback 1: Look for /Count that appears before the first /Page (likely the catalog count)
    const firstPageIndex = text.indexOf('/Type /Page');
    if (firstPageIndex > 0) {
      const beforePages = text.slice(0, firstPageIndex);
      const countInCatalog = beforePages.match(/\/Count\s+(\d+)/);
      if (countInCatalog) {
        const count = parseInt(countInCatalog[1]);
        if (count >= 1 && count <= MAX) return count;
      }
    }

    // Fallback 2: count /Type /Page objects (exclude /Pages directory nodes)
    // This regex matches "/Type /Page" NOT followed by "s" (to exclude /Type /Pages)
    const pageObjs = text.match(/\/Type\s*\/Page(?!\s*[sS])/g);
    if (pageObjs && pageObjs.length >= 1 && pageObjs.length <= MAX) return pageObjs.length;
  } catch {}
  return 1;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type QueueItem = {
  id: string;
  file: File;
  name: string;
  status: 'waiting' | 'uploading' | 'analyzing' | 'done' | 'error';
  error?: string;
};

type SplitModal = {
  file: File;
  pageCount: number;
  resolve: (split: boolean) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
const VAT_RATES = ['20', '10', '5.5', '2.1', '0'];

const CATEGORIES = [
  { value: 'transport',     label: 'Transport',    color: 'bg-blue-100 text-blue-700'     },
  { value: 'meals',         label: 'Restauration', color: 'bg-orange-100 text-orange-700'  },
  { value: 'accommodation', label: 'Hébergement',  color: 'bg-purple-100 text-purple-700'  },
  { value: 'equipment',     label: 'Équipement',   color: 'bg-gray-100 text-gray-700'     },
  { value: 'office',        label: 'Fournitures',  color: 'bg-green-100 text-green-700'   },
  { value: 'services',      label: 'Services',     color: 'bg-indigo-100 text-indigo-700' },
  { value: 'shopping',      label: 'Achats',       color: 'bg-pink-100 text-pink-700'     },
  { value: 'other',         label: 'Autre',        color: 'bg-gray-100 text-gray-500'     },
];

const STATUS_CFG: Record<CaptureStatus, { label: string; color: string; dot: string }> = {
  pending:   { label: 'À traiter', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500'  },
  reviewed:  { label: 'Vérifié',   color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'   },
  published: { label: 'Archivé',   color: 'bg-green-100 text-green-700', dot: 'bg-green-500'  },
};

const DOC_TYPE_CFG: Record<string, { label: string; color: string; icon: any }> = {
  purchase: { label: 'Achat',   color: 'bg-red-100 text-red-700',         icon: ShoppingBag },
  sales:    { label: 'Vente',   color: 'bg-emerald-100 text-emerald-700', icon: TrendingUp  },
  expense:  { label: 'Dépense', color: 'bg-orange-100 text-orange-700',   icon: Receipt     },
  receipt:  { label: 'Reçu',    color: 'bg-sky-100 text-sky-700',         icon: FileText    },
};

const PAYMENT_METHODS = [
  { value: 'card',        label: 'Carte bancaire' },
  { value: 'cash',        label: 'Espèces'        },
  { value: 'transfer',    label: 'Virement'       },
  { value: 'check',       label: 'Chèque'         },
  { value: 'prelevement', label: 'Prélèvement'    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCat = (v?: string | null) => CATEGORIES.find(c => c.value === v) ?? CATEGORIES[CATEGORIES.length - 1];

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
}

function relativeDate(iso: string) {
  try {
    const dt = new Date(iso);
    const diff = Date.now() - dt.getTime();
    if (diff < 3_600_000)  return 'Il y a ' + Math.floor(diff / 60_000) + ' min';
    if (diff < 86_400_000) return 'Il y a ' + Math.floor(diff / 3_600_000) + ' h';
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch { return '—'; }
}

function groupByDate(docs: CapturedDocument[]) {
  const now = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86_400_000;
  const weekAgo   = today - 7 * 86_400_000;
  const groups    = new Map<string, CapturedDocument[]>();

  for (const doc of docs) {
    const dt  = new Date(doc.created_at);
    const day = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
    let key: string;
    if (day === today)       key = "Aujourd'hui";
    else if (day === yesterday) key = 'Hier';
    else if (day > weekAgo)  key = 'Cette semaine';
    else {
      const l = dt.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      key = l.charAt(0).toUpperCase() + l.slice(1);
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(doc);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CapturePage() {
  const { user } = useAuthStore();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [documents, setDocuments]   = useState<CapturedDocument[]>([]);
  const [loading, setLoading]       = useState(true);

  // ── PRO / workspace ──────────────────────────────────────────────────────────
  const [workspaces, setWorkspaces]         = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [isPro, setIsPro]                   = useState(false);
  const [showWsDropdown, setShowWsDropdown] = useState(false);
  const [showCreateWs, setShowCreateWs]     = useState(false);
  const [newWsName, setNewWsName]           = useState('');
  const [newWsDesc, setNewWsDesc]           = useState('');
  const [creatingWs, setCreatingWs]         = useState(false);

  // Keep refs in sync so processQueueItem doesn't have stale closures
  const isProRef       = useRef(isPro);
  const workspacesRef  = useRef(workspaces);
  useEffect(() => { isProRef.current = isPro; }, [isPro]);
  useEffect(() => { workspacesRef.current = workspaces; }, [workspaces]);

  // ── Upload queue ─────────────────────────────────────────────────────────────
  const [queue, setQueue]   = useState<QueueItem[]>([]);
  const uploadedKeysRef     = useRef<Set<string>>(new Set()); // name+size dedup

  // ── Detail / edit ────────────────────────────────────────────────────────────
  const [selectedDoc, setSelectedDoc] = useState<CapturedDocument | null>(null);
  const [editForm, setEditForm]       = useState<Partial<CapturedDocument>>({});
  const [saving, setSaving]           = useState(false);

  // ── Selection ────────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── UI ────────────────────────────────────────────────────────────────────────
  const [isDragging, setIsDragging]   = useState(false);
  const [showExport, setShowExport]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [splitModal, setSplitModal]   = useState<SplitModal | null>(null);
  const [filters, setFilters] = useState({
    search: '', status: 'all', expenseType: 'all', category: '', dateFrom: '', dateTo: '',
  });

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: docs } = await getSupabaseClient()
        .from('captured_documents').select('*, workspaces(name)')
        .eq('user_id', user.id).order('created_at', { ascending: false });
      setDocuments(docs || []);

      const { data: profile } = await getSupabaseClient()
        .from('profiles').select('subscription_tier').eq('id', user.id).single();
      const pro = profile?.subscription_tier === 'pro';
      setIsPro(pro);

      if (pro) {
        const { data: ws } = await getSupabaseClient()
          .from('workspaces').select('*').eq('owner_id', user.id);
        setWorkspaces(ws || []);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const pending   = documents.filter(d => d.status === 'pending').length;
    const reviewed  = documents.filter(d => d.status === 'reviewed').length;
    const published = documents.filter(d => d.status === 'published').length;
    const totalTTC  = documents.reduce((s, d) => s + (d.amount || 0), 0);
    const totalVAT  = documents.reduce((s, d) => s + (d.vat_amount || 0), 0);
    const now = new Date();
    const monthDocs = documents.filter(d => {
      const dt = new Date(d.created_at);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    });
    const monthTTC = monthDocs.reduce((s, d) => s + (d.amount || 0), 0);
    return { pending, reviewed, published, totalTTC, totalVAT, monthTTC, total: documents.length };
  }, [documents]);

  // ── Filtered + grouped ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = documents;
    if (isPro && selectedWorkspace) list = list.filter(d => d.workspace_id === selectedWorkspace);
    if (filters.status !== 'all')      list = list.filter(d => d.status === filters.status);
    if (filters.expenseType !== 'all') {
      list = list.filter(d => {
        const t = d.invoice_type || d.ocr_data?.invoice_type || d.ocr_data?.expense_type || 'purchase';
        return t === filters.expenseType;
      });
    }
    if (filters.category) list = list.filter(d => d.category === filters.category);
    if (filters.dateFrom)  list = list.filter(d => d.document_date && d.document_date >= filters.dateFrom);
    if (filters.dateTo)    list = list.filter(d => d.document_date && d.document_date <= filters.dateTo);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(d =>
        (d.vendor || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.supplier_reference || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [documents, filters, isPro, selectedWorkspace]);

  const grouped  = useMemo(() => groupByDate(filtered), [filtered]);
  const activeUploads = queue.filter(q => ['waiting', 'uploading', 'analyzing'].includes(q.status)).length;

  // ── Process single file ──────────────────────────────────────────────────────

  const processQueueItem = useCallback(async (item: QueueItem) => {
    if (!user) return;
    const upd = (u: Partial<QueueItem>) =>
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, ...u } : q));

    try {
      upd({ status: 'uploading' });
      const fileToUpload = item.file.type.startsWith('image/') ? await compressImage(item.file) : item.file;
      const ext  = fileToUpload.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `receipts/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await getSupabaseClient()
        .storage.from('assets').upload(path, fileToUpload, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = getSupabaseClient().storage.from('assets').getPublicUrl(path);
      const fileUrl  = urlData.publicUrl;
      const fileType = item.file.type.startsWith('image/') ? 'image'
                     : item.file.type === 'application/pdf' ? 'pdf' : 'other';

      const { data: doc, error: insertErr } = await getSupabaseClient()
        .from('captured_documents')
        .insert({ user_id: user.id, file_url: fileUrl, file_type: fileType, status: 'pending', amount: 0, vat_amount: 0, vat_rate: 0 })
        .select().single();
      if (insertErr) throw insertErr;
      setDocuments(prev => [doc, ...prev]);

      upd({ status: 'analyzing' });
      if (fileType === 'image' || fileType === 'pdf') {
        const fd = new FormData();
        fd.append('file', fileToUpload);

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 120_000);
        let res: Response;
        try {
          res = await fetch('/api/ai/analyze-document', { method: 'POST', body: fd, signal: ctrl.signal });
        } catch (e: any) {
          throw new Error(e.name === 'AbortError' ? 'Timeout IA (2 min). Réessayez avec un fichier plus léger.' : e.message);
        } finally { clearTimeout(timer); }

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Erreur API (${res.status}): ${txt.slice(0, 60)}`);
        }

        const data = await res.json();
        if (data.error) throw new Error(`Erreur IA : ${data.error}`);
        const ex = data.extracted;

        if (ex) {
          let finalCode: string | undefined = ex.suggested_account_code || undefined;
          let finalName: string | undefined = undefined;

          if (ex.vendor) {
            const { data: mapping } = await getSupabaseClient().from('vendor_mappings')
              .select('*').eq('user_id', user.id).ilike('vendor_name_pattern', ex.vendor).maybeSingle();
            if (mapping) { finalCode = mapping.account_code; finalName = mapping.account_name; }
          }

          const conf = typeof ex.confidence_score === 'number' ? ex.confidence_score : 100;
          const patch: Partial<CapturedDocument> = {
            vendor: ex.vendor || null, description: ex.description || null,
            amount: ex.amount || 0, vat_amount: ex.vat_amount ?? null,
            vat_rate: ex.vat_rate ?? null, document_date: ex.date || null,
            due_date: ex.due_date || null, category: ex.category || null,
            payment_method: ex.payment_method || null,
            supplier_reference: ex.invoice_number || null,
            ocr_data: ex, confidence_score: conf, needs_review: conf < 80,
            account_code: finalCode, account_name: finalName,
            invoice_type: ex.invoice_type || 'purchase',
            line_items: ex.line_items || [],
            supplier_iban: ex.supplier_iban || null,
            supplier_bic: ex.supplier_bic || null,
            supplier_bank_name: ex.supplier_bank_name || null,
          };

          // AI workspace routing (PRO)
          if (isProRef.current && ex.vendor && workspacesRef.current.length > 0) {
            const vl = ex.vendor.toLowerCase();
            const matched = workspacesRef.current.find((ws: any) =>
              vl.includes(ws.name.toLowerCase()) || ws.name.toLowerCase().includes(vl)
            );
            if (matched) patch.workspace_id = matched.id;
          }

          const { data: updated } = await getSupabaseClient()
            .from('captured_documents').update(patch).eq('id', doc.id).select().single();
          if (updated) setDocuments(prev => prev.map(d => d.id === doc.id ? updated : d));
        }
      }
      upd({ status: 'done' });
    } catch (e: any) {
      upd({ status: 'error', error: e.message || 'Erreur inconnue' });
    }
  }, [user]);

  // ── Split PDF into pages ──────────────────────────────────────────────────────

  const splitPDFIntoPages = async (file: File): Promise<File[]> => {
    try {
      const ab = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(ab, { ignoreEncryption: true });

      // Use our reliable page count instead of pdf-lib.getPageCount()
      const pageCount = detectPDFPageCount(ab);

      // Verify pdf-lib page count matches our detection
      // If they differ significantly, use pdf-lib's count as fallback
      const libPageCount = pdfDoc.getPageCount();
      const finalPageCount = Math.min(pageCount, libPageCount, 50); // Cap at 50

      if (finalPageCount < 1) return [file]; // Invalid, return original

      const base = file.name.replace(/\.[^/.]+$/, '');
      const parts: File[] = [];
      for (let i = 0; i < finalPageCount; i++) {
        const newPdf = await PDFDocument.create();
        const [p]    = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(p);
        const bytes = await newPdf.save();
        parts.push(new File([bytes.buffer as ArrayBuffer], `${base}_p${i + 1}.pdf`, { type: 'application/pdf' }));
      }
      console.log(`[PDF Split] ${file.name} - Split into ${parts.length} page(s)`);
      return parts;
    } catch {
      return [file]; // fallback: keep original
    }
  };

  // ── Process files (main entry) ────────────────────────────────────────────────

  const processFiles = useCallback(async (files: File[]) => {
    if (!user || files.length === 0) return;

    const valid = files.filter(f =>
      ALLOWED_TYPES.includes(f.type) || /\.(jpg|jpeg|png|webp|pdf|heic|heif)$/i.test(f.name)
    );
    if (valid.length === 0) return;

    // Deduplicate within this session (name + size)
    const unique = valid.filter(f => {
      const key = `${f.name}-${f.size}`;
      if (uploadedKeysRef.current.has(key)) return false;
      uploadedKeysRef.current.add(key);
      return true;
    });
    if (unique.length === 0) return;

    const finalFiles: File[] = [];

    for (const f of unique) {
      const isPDF = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      if (isPDF) {
        let ab: ArrayBuffer;
        try { ab = await f.arrayBuffer(); } catch { finalFiles.push(f); continue; }

        const pageCount = detectPDFPageCount(ab);

        // Debug: Log page count to verify correctness
        console.log(`[PDF] ${f.name} - Detected ${pageCount} page(s), file size: ${f.size} bytes`);

        if (pageCount > 1) {
          // Ask user whether to split or keep whole
          const split = await new Promise<boolean>(resolve => {
            setSplitModal({ file: f, pageCount, resolve });
          });
          setSplitModal(null);

          if (split) {
            const pages = await splitPDFIntoPages(f);
            finalFiles.push(...pages);
          } else {
            finalFiles.push(f);
          }
        } else {
          finalFiles.push(f);
        }
      } else {
        finalFiles.push(f);
      }
    }

    if (finalFiles.length === 0) return;

    const items: QueueItem[] = finalFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file, name: file.name, status: 'waiting',
    }));

    setQueue(prev => [...prev, ...items]);

    // Process in parallel batches of 3
    const BATCH = 3;
    for (let i = 0; i < items.length; i += BATCH) {
      await Promise.all(items.slice(i, i + BATCH).map(it => processQueueItem(it)));
    }
  }, [user, processQueueItem]);

  // ── Drag & drop ───────────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const { data } = await getSupabaseClient()
        .from('captured_documents')
        .update({ ...editForm, needs_review: false, updated_at: new Date().toISOString() })
        .eq('id', selectedDoc.id).select().single();
      if (data) {
        setDocuments(prev => prev.map(d => d.id === selectedDoc.id ? data : d));
        setSelectedDoc(data);
        if (editForm.vendor && editForm.account_code && user) {
          await getSupabaseClient().from('vendor_mappings').upsert({
            user_id: user.id, vendor_name_pattern: editForm.vendor,
            account_code: editForm.account_code, account_name: editForm.account_name || null,
          }, { onConflict: 'user_id,vendor_name_pattern' });
        }
      }
    } finally { setSaving(false); }
  };

  const changeStatus = async (id: string, status: CaptureStatus) => {
    const patch: any = { status, updated_at: new Date().toISOString() };
    if (status === 'reviewed')  patch.reviewed_at  = new Date().toISOString();
    if (status === 'published') patch.published_at = new Date().toISOString();
    const { data } = await getSupabaseClient()
      .from('captured_documents').update(patch).eq('id', id).select().single();
    if (data) {
      setDocuments(prev => prev.map(d => d.id === id ? data : d));
      if (selectedDoc?.id === id) setSelectedDoc(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    await getSupabaseClient().from('captured_documents').delete().eq('id', id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const bulkStatus = async (status: CaptureStatus) => {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds);
    const patch: any = { status, updated_at: new Date().toISOString() };
    if (status === 'reviewed')  patch.reviewed_at  = new Date().toISOString();
    if (status === 'published') patch.published_at = new Date().toISOString();
    await getSupabaseClient().from('captured_documents').update(patch).in('id', ids);
    setDocuments(prev => prev.map(d => selectedIds.has(d.id) ? { ...d, ...patch } : d));
    setSelectedIds(new Set());
  };

  const bulkDelete = async () => {
    if (!selectedIds.size || !confirm(`Supprimer ${selectedIds.size} document(s) ?`)) return;
    const ids = Array.from(selectedIds);
    await getSupabaseClient().from('captured_documents').delete().in('id', ids);
    setDocuments(prev => prev.filter(d => !selectedIds.has(d.id)));
    if (selectedDoc && selectedIds.has(selectedDoc.id)) setSelectedDoc(null);
    setSelectedIds(new Set());
  };

  const toggleSelect  = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => setSelectedIds(
    selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(d => d.id))
  );

  const openDetail = (doc: CapturedDocument) => {
    setSelectedDoc(doc);
    setEditForm({
      vendor: doc.vendor || '', description: doc.description || '',
      amount: doc.amount, vat_amount: doc.vat_amount, vat_rate: doc.vat_rate,
      document_date: doc.document_date || '', due_date: doc.due_date || '',
      category: doc.category || '', payment_method: doc.payment_method || '',
      notes: doc.notes || '', supplier_reference: doc.supplier_reference || '',
      account_code: doc.account_code || '', account_name: doc.account_name || '',
      invoice_type: doc.invoice_type || 'purchase',
      line_items: doc.line_items || [],
      supplier_iban: doc.supplier_iban || '', supplier_bic: doc.supplier_bic || '',
      supplier_bank_name: doc.supplier_bank_name || '',
      payment_status: doc.payment_status || 'unpaid', workspace_id: doc.workspace_id || '',
    });
  };

  // ── Exports ───────────────────────────────────────────────────────────────────

  const exportSet = useMemo(() =>
    selectedIds.size > 0 ? documents.filter(d => selectedIds.has(d.id)) : filtered,
  [documents, filtered, selectedIds]);

  const exportCSV = () => {
    const h = ['Date','Échéance','Fournisseur','N° Facture','Description','Montant HT','TVA','TTC','Taux TVA (%)','Catégorie','Paiement','Statut'];
    const rows = exportSet.map(d => {
      const ht = d.amount && d.vat_amount != null ? +(d.amount - d.vat_amount).toFixed(2) : (d.amount || 0);
      return [d.document_date||'', d.due_date||'', d.vendor||'', d.supplier_reference||'', d.description||'',
        ht.toFixed(2), (d.vat_amount||0).toFixed(2), (d.amount||0).toFixed(2),
        d.vat_rate != null ? String(d.vat_rate) : '',
        getCat(d.category).label,
        PAYMENT_METHODS.find(p => p.value === d.payment_method)?.label || '',
        STATUS_CFG[d.status].label];
    });
    const csv = [h, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
    downloadBlob('\uFEFF' + csv, `capture-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8;');
    setShowExport(false);
  };

  const exportFEC = () => {
    const headers = ['JournalCode','JournalLib','EcritureNum','EcritureDate','CompteNum','CompteLib','CompAuxNum','CompAuxLib','PieceRef','PieceDate','EcritureLib','Debit','Credit','EcritureLet','DateLet','ValidDate','Montantdevise','Idevise'];
    const rows: string[][] = [];
    exportSet.forEach(d => {
      if (!d.document_date) return;
      const dateFec = d.document_date.replace(/-/g,'');
      const pieceRef = d.supplier_reference || d.id.slice(0,8).toUpperCase();
      const numLogic = d.id.slice(0,6).toUpperCase();
      const vendorName = d.vendor || 'FOURNISSEUR INCONNU';
      const label = (vendorName.slice(0,20) + (d.supplier_reference ? ` - ${d.supplier_reference}` : '')).slice(0,35);
      const tva = d.vat_amount || 0;
      const ttc = d.amount || 0;
      const ht = +(ttc - tva).toFixed(2);
      if (ht > 0) rows.push(['ACH','Achats',numLogic,dateFec,d.account_code||'606400',d.account_name||'Achats divers','','',pieceRef,dateFec,label,ht.toFixed(2).replace('.',','),'0,00','','',dateFec,'','']);
      if (tva > 0) rows.push(['ACH','Achats',numLogic,dateFec,'445660','TVA Deductible','','',pieceRef,dateFec,label,tva.toFixed(2).replace('.',','),'0,00','','',dateFec,'','']);
      if (ttc > 0) { const aux = `F${vendorName.substring(0,5).toUpperCase().replace(/[^A-Z0-9]/g,'')}`; rows.push(['ACH','Achats',numLogic,dateFec,'401000','Fournisseurs',aux,vendorName,pieceRef,dateFec,label,'0,00',ttc.toFixed(2).replace('.',','),'','',dateFec,'','']); }
    });
    const csv = [headers, ...rows].map(r => r.join('\t')).join('\n');
    downloadBlob('\uFEFF' + csv, `FEC-ACHATS-${new Date().toISOString().slice(0,10)}.txt`, 'text/plain;charset=utf-8;');
    setShowExport(false);
  };

  const exportJSON = () => {
    const data = exportSet.map(d => ({
      date: d.document_date, echeance: d.due_date, fournisseur: d.vendor,
      numero_facture: d.supplier_reference, description: d.description,
      montant_ht: d.amount != null && d.vat_amount != null ? +(d.amount - d.vat_amount).toFixed(2) : d.amount,
      tva: d.vat_amount, montant_ttc: d.amount, taux_tva: d.vat_rate,
      categorie: d.category, mode_paiement: d.payment_method, statut: d.status,
      fichier: d.file_url, cree_le: d.created_at,
    }));
    downloadBlob(JSON.stringify(data, null, 2), `capture-${new Date().toISOString().slice(0,10)}.json`, 'application/json');
    setShowExport(false);
  };

  const exportOFX = () => {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
    let ofx = `OFXHEADER:100\nDATA:OFSGML\nVERSION:102\nSECURITY:NONE\nENCODING:USASCII\nCHARSET:1252\nCOMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n\n`;
    ofx += `<OFX>\n<BANKMSGSRSV1>\n<STMTTRNRS>\n<TRNUID>1\n<STATUS><CODE>0<SEVERITY>INFO</STATUS>\n<STMTRS>\n<CURDEF>EUR\n<BANKACCTFROM><BANKID>CAPTURE<ACCTID>FACTURME<ACCTTYPE>CHECKING</BANKACCTFROM>\n<BANKTRANLIST>\n<DTSTART>${ts}\n<DTEND>${ts}\n`;
    exportSet.forEach(d => {
      const dt = (d.document_date || d.created_at.slice(0,10)).replace(/-/g,'') + '000000';
      ofx += `<STMTTRN>\n<TRNTYPE>DEBIT\n<DTPOSTED>${dt}\n<TRNAMT>-${(d.amount||0).toFixed(2)}\n<FITID>${d.id}\n<NAME>${(d.vendor||'Unknown').slice(0,32)}\n<MEMO>${(d.description||'').slice(0,64)}\n</STMTTRN>\n`;
    });
    ofx += `</BANKTRANLIST>\n</STMTRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>`;
    downloadBlob(ofx, `export-ofx-${new Date().toISOString().slice(0,10)}.ofx`, 'application/x-ofx');
    setShowExport(false);
  };

  const generateSEPAXML = (doc: CapturedDocument) => {
    const iban   = (doc.supplier_iban || editForm.supplier_iban || '').replace(/\s/g,'');
    const bic    = (doc.supplier_bic  || editForm.supplier_bic  || '').replace(/\s/g,'');
    const amount = (doc.amount || 0).toFixed(2);
    const now    = new Date();
    const msgId  = `MSG-${now.getTime()}`;
    const pmtId  = `PMT-${doc.id.slice(0,8)}-${now.getTime()}`;
    const payDate = doc.due_date || now.toISOString().slice(0,10);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr><MsgId>${msgId}</MsgId><CreDtTm>${now.toISOString()}</CreDtTm><NbOfTxs>1</NbOfTxs><CtrlSum>${amount}</CtrlSum><InitgPty><Nm>FacturmeWeb</Nm></InitgPty></GrpHdr>
    <PmtInf>
      <PmtInfId>${pmtId}</PmtInfId><PmtMtd>TRF</PmtMtd><NbOfTxs>1</NbOfTxs><CtrlSum>${amount}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${payDate}</ReqdExctnDt>
      <Dbtr><Nm>Votre Entreprise</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>FR76XXXXXXXXXXXXXXXXXX</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BIC>XXXXXXXX</BIC></FinInstnId></DbtrAgt>
      <ChrgBr>SHAR</ChrgBr>
      <CdtTrfTxInf>
        <PmtId><EndToEndId>${doc.supplier_reference || doc.id.slice(0,35)}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${amount}</InstdAmt></Amt>
        <CdtrAgt><FinInstnId><BIC>${bic}</BIC></FinInstnId></CdtrAgt>
        <Cdtr><Nm>${doc.vendor || 'Fournisseur'}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${iban}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${doc.description || `Facture ${doc.supplier_reference || doc.id}`}</Ustrd></RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
    downloadBlob(xml, `SEPA-${doc.supplier_reference || doc.id.slice(0,8)}.xml`, 'application/xml');
    getSupabaseClient().from('captured_documents').update({ sepa_generated: true, payment_status: 'pending' }).eq('id', doc.id);
    setSelectedDoc(prev => prev ? { ...prev, sepa_generated: true, payment_status: 'pending' as any } : null);
  };

  const handleCreateWorkspace = async () => {
    if (!user || !newWsName.trim()) return;
    setCreatingWs(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWsName.trim(), user_id: user.id, description: newWsDesc.trim() || null }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        // Handle tier-specific error
        if (res.status === 403 && errorData.tier !== 'pro') {
          alert(`${errorData.message}\n\nVotre plan actuel: ${errorData.tier === 'free' ? 'Gratuit' : 'Solo'}\nDossiers existants: ${errorData.currentWorkspaces}\n\nPassez à Pro pour créer plusieurs dossiers.`);
          return;
        }

        throw new Error(errorData.error || errorData.message || 'Erreur lors de la création du dossier');
      }

      const { workspace } = await res.json();
      setWorkspaces(prev => [workspace, ...prev]);
      setSelectedWorkspace(workspace.id);
      setNewWsName(''); setNewWsDesc(''); setShowCreateWs(false);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création du dossier');
    } finally {
      setCreatingWs(false);
    }
  };

  // ── Detail panel (shared between desktop sticky + mobile drawer) ──────────────

  const DetailPanel = () => {
    if (!selectedDoc) return null;
    const st  = STATUS_CFG[selectedDoc.status];
    const inv = editForm.invoice_type || 'purchase';
    return (
      <>
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn('shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border', st.color, 'border-current/20')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
              {st.label}
            </span>
            {selectedDoc.needs_review && (
              <span title="Confiance faible — à vérifier" className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                <AlertTriangle size={10} /> À vérifier
              </span>
            )}
          </div>
          <button onClick={() => setSelectedDoc(null)}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Preview */}
          <div className="p-4 border-b border-gray-100">
            {selectedDoc.file_type === 'image' ? (
              <div className="relative group">
                <img src={selectedDoc.file_url} alt="Facture"
                  className="w-full rounded-xl border border-gray-200 max-h-52 object-contain bg-gray-50" />
                <a href={selectedDoc.file_url} target="_blank" rel="noreferrer"
                  className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                  <ZoomIn size={14} />
                </a>
              </div>
            ) : (
              <a href={selectedDoc.file_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors group">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800 group-hover:text-red-700">Ouvrir le PDF</p>
                  <p className="text-[10px] text-gray-400">Visualiser dans un nouvel onglet</p>
                </div>
              </a>
            )}
            {selectedDoc.ocr_data && (
              <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-xl border border-primary/10">
                <Sparkles size={11} className="text-primary shrink-0" />
                <p className="text-[10px] text-primary/80 font-medium">
                  Données extraites par IA
                  {selectedDoc.confidence_score != null && (
                    <span className={cn('ml-1.5 font-bold', selectedDoc.confidence_score >= 80 ? 'text-green-600' : 'text-amber-600')}>
                      {selectedDoc.confidence_score}% de confiance
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Status buttons */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Workflow</p>
            <div className="flex gap-2">
              {(['pending', 'reviewed', 'published'] as CaptureStatus[]).map(s => (
                <button key={s} onClick={() => changeStatus(selectedDoc.id, s)}
                  className={cn('flex-1 py-2 rounded-xl text-[11px] font-bold transition-colors',
                    selectedDoc.status === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                  {STATUS_CFG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Edit form */}
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Informations</p>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Fournisseur *</label>
                <input type="text" value={editForm.vendor || ''}
                  onChange={e => setEditForm(f => ({ ...f, vendor: e.target.value }))}
                  placeholder="Nom du fournisseur"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">N° Facture</label>
                <input type="text" value={editForm.supplier_reference || ''}
                  onChange={e => setEditForm(f => ({ ...f, supplier_reference: e.target.value }))}
                  placeholder="FAC-2024-001"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Description</label>
                <input type="text" value={editForm.description || ''}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Objet de la facture"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">TTC *</label>
                <input type="number" step="0.01" min="0" value={editForm.amount ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">TVA (€)</label>
                <input type="number" step="0.01" min="0" value={editForm.vat_amount ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, vat_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Taux %</label>
                <select value={editForm.vat_rate?.toString() || ''}
                  onChange={e => setEditForm(f => ({ ...f, vat_rate: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none bg-white">
                  <option value="">-</option>
                  {VAT_RATES.map(v => <option key={v} value={v}>{v}%</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Date facture</label>
                <input type="date" value={editForm.document_date || ''}
                  onChange={e => setEditForm(f => ({ ...f, document_date: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Échéance</label>
                <input type="date" value={editForm.due_date || ''}
                  onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            {/* Accounting */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-[10px] font-bold text-amber-800 uppercase mb-2 flex items-center gap-1">
                <Sparkles size={10} /> Affectation Comptable
              </p>
              <div className="flex gap-2">
                <input type="text" value={editForm.account_code || ''}
                  onChange={e => setEditForm(f => ({ ...f, account_code: e.target.value }))}
                  placeholder="Code (ex: 6061)"
                  className="w-24 px-3 py-2 text-xs rounded-xl border border-amber-200 bg-white focus:outline-none focus:border-amber-400" />
                <input type="text" value={editForm.account_name || ''}
                  onChange={e => setEditForm(f => ({ ...f, account_name: e.target.value }))}
                  placeholder="Nom du compte de charge"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-amber-200 bg-white focus:outline-none focus:border-amber-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Catégorie</label>
                <select value={editForm.category || ''}
                  onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none bg-white">
                  <option value="">Choisir...</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Paiement</label>
                <select value={editForm.payment_method || ''}
                  onChange={e => setEditForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none bg-white">
                  <option value="">Choisir...</option>
                  {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Invoice type */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Type de document</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['purchase', 'sales', 'expense', 'receipt'] as const).map(type => {
                  const cfg = DOC_TYPE_CFG[type];
                  return (
                    <button key={type} type="button"
                      onClick={() => setEditForm(f => ({ ...f, invoice_type: type }))}
                      className={cn('flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[9px] font-bold transition-colors',
                        inv === type ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                      <cfg.icon size={13} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Line items */}
            {editForm.line_items && editForm.line_items.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-[10px] font-bold text-gray-700 uppercase mb-2 flex items-center gap-1">
                  <FileSpreadsheet size={10} /> Lignes de facture
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead><tr className="text-left text-gray-400 font-semibold">
                      <th className="pb-1.5">Description</th>
                      <th className="pb-1.5 text-right">Qté</th>
                      <th className="pb-1.5 text-right">HT</th>
                      <th className="pb-1.5 text-right">TVA</th>
                      <th className="pb-1.5 text-right">Total</th>
                    </tr></thead>
                    <tbody>
                      {editForm.line_items.map((item: any, i: number) => (
                        <tr key={i} className="border-t border-gray-200">
                          <td className="py-1">{item.description}</td>
                          <td className="py-1 text-right">{item.quantity}</td>
                          <td className="py-1 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="py-1 text-right">{item.vat_rate}%</td>
                          <td className="py-1 text-right font-semibold">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SEPA */}
            {inv === 'purchase' && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-[10px] font-bold text-blue-800 uppercase mb-2 flex items-center gap-1">
                  <CreditCard size={10} /> Paiement Fournisseur (SEPA)
                </p>
                <div className="space-y-1.5">
                  <input type="text" value={editForm.supplier_iban || ''}
                    onChange={e => setEditForm(f => ({ ...f, supplier_iban: e.target.value.toUpperCase() }))}
                    placeholder="IBAN — FR76..."
                    className="w-full px-2 py-1.5 text-[10px] rounded-lg border border-blue-200 bg-white focus:outline-none focus:border-blue-400 font-mono" />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="text" value={editForm.supplier_bic || ''}
                      onChange={e => setEditForm(f => ({ ...f, supplier_bic: e.target.value.toUpperCase() }))}
                      placeholder="BIC/SWIFT"
                      className="px-2 py-1.5 text-[10px] rounded-lg border border-blue-200 bg-white focus:outline-none focus:border-blue-400 font-mono" />
                    <input type="text" value={editForm.supplier_bank_name || ''}
                      onChange={e => setEditForm(f => ({ ...f, supplier_bank_name: e.target.value }))}
                      placeholder="Banque"
                      className="px-2 py-1.5 text-[10px] rounded-lg border border-blue-200 bg-white focus:outline-none focus:border-blue-400" />
                  </div>
                  {editForm.supplier_iban && editForm.supplier_bic && (
                    <button type="button" onClick={() => generateSEPAXML(selectedDoc!)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors">
                      <Database size={11} /> Générer fichier SEPA
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Notes internes</label>
              <textarea value={editForm.notes || ''}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Commentaires, contexte..." rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
            </div>

            {/* Workspace (PRO) */}
            {isPro && workspaces.length > 0 && (
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1 flex items-center gap-1">
                  <Building size={10} /> Dossier client
                </label>
                <select value={editForm.workspace_id || ''}
                  onChange={e => setEditForm(f => ({ ...f, workspace_id: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none bg-white">
                  <option value="">Aucun dossier</option>
                  {workspaces.map((ws: any) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Panel footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 shrink-0 bg-white">
          <button onClick={() => handleDelete(selectedDoc.id)}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors shrink-0">
            <Trash2 size={14} />
          </button>
          <button onClick={() => { setSelectedDoc(null); setEditForm({}); }}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleUpdate} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50">
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input ref={fileInputRef}   type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFileInput} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"                className="hidden" onChange={handleFileInput} />

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Capture</h1>
          <p className="text-xs text-gray-400 mt-0.5">Importez vos documents — l'IA extrait automatiquement toutes les données</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Workspace selector (PRO) */}
          {isPro && (
            <div className="relative">
              <button onClick={() => setShowWsDropdown(v => !v)}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors min-w-[160px] justify-between shadow-sm">
                <span className="flex items-center gap-1.5 truncate">
                  <Building size={12} className="text-gray-400 shrink-0" />
                  {selectedWorkspace ? workspaces.find((ws: any) => ws.id === selectedWorkspace)?.name : 'Tous les dossiers'}
                </span>
                <ChevronDown size={11} className={showWsDropdown ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {showWsDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowWsDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden">
                    <button onClick={() => { setSelectedWorkspace(null); setShowWsDropdown(false); }}
                      className={cn('w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors border-b border-gray-50', !selectedWorkspace && 'bg-primary/5 text-primary font-semibold')}>
                      Tous les dossiers
                    </button>
                    {workspaces.map((ws: any) => (
                      <button key={ws.id} onClick={() => { setSelectedWorkspace(ws.id); setShowWsDropdown(false); }}
                        className={cn('w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors', selectedWorkspace === ws.id && 'bg-primary/5 text-primary font-semibold')}>
                        {ws.name}
                      </button>
                    ))}
                    {(isPro || workspaces.length === 0) && (
                      <div className="border-t border-gray-100 p-2">
                        <button onClick={() => { setShowWsDropdown(false); setShowCreateWs(true); }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 rounded-lg transition-colors">
                          <Plus size={11} /> Créer un dossier
                        </button>
                      </div>
                    )}
                    {!isPro && workspaces.length >= 1 && (
                      <div className="border-t border-gray-100 p-2">
                        <div className="px-3 py-2 text-[10px] text-gray-500 text-center">
                          <span className="block mb-1">🔒 Plan Solo - 1 dossier max</span>
                          <span className="text-primary font-semibold">Passez à Pro</span> pour en créer d'autres
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Export */}
          <div className="relative">
            <button onClick={() => setShowExport(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors">
              <Download size={13} /> Exporter <ChevronDown size={11} />
            </button>
            {showExport && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl z-40 overflow-hidden p-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase px-2 py-1.5">
                    {selectedIds.size > 0 ? `${selectedIds.size} sélectionné(s)` : `${filtered.length} document(s)`}
                  </p>
                  {[
                    { label: 'CSV Standard',  sub: 'Excel, LibreOffice, Sage',  fn: exportCSV,  Icon: FileSpreadsheet },
                    { label: 'JSON',           sub: 'API, intégrations',         fn: exportJSON, Icon: FileText       },
                    { label: 'FEC Achats',     sub: 'DGFiP, logiciels compta',   fn: exportFEC,  Icon: Building2      },
                    { label: 'OFX Bancaire',   sub: 'Sage, QuickBooks, EBP',     fn: exportOFX,  Icon: Download       },
                  ].map(({ label, sub, fn, Icon }) => (
                    <button key={label} onClick={fn}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 text-left transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Icon size={13} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{label}</p>
                        <p className="text-[10px] text-gray-400">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors">
            <Camera size={13} /> Photo
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors">
            <Plus size={13} /> Importer
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'À traiter',     value: stats.pending,                sub: 'documents en attente',  color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200/60',  status: 'pending'   },
          { label: 'Vérifiés',      value: stats.reviewed,               sub: 'confirmés par vous',    color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200/60',    status: 'reviewed'  },
          { label: 'Archivés',      value: stats.published,              sub: 'envoyés comptabilité',  color: 'text-green-600', bg: 'bg-green-50 border-green-200/60',  status: 'published' },
          { label: 'Total capturé', value: formatCurrency(stats.totalTTC), sub: `dont TVA ${formatCurrency(stats.totalVAT)}`, color: 'text-gray-900', bg: 'bg-gray-50 border-gray-200/60', status: 'all' },
        ].map(s => (
          <button key={s.label}
            onClick={() => setFilters(f => ({ ...f, status: s.status }))}
            className={cn('rounded-2xl border p-4 text-left transition-all hover:shadow-sm', s.bg, filters.status === s.status && 'ring-2 ring-gray-900/10')}>
            <p className="text-[11px] text-gray-500 font-semibold">{s.label}</p>
            <p className={cn('text-2xl font-black mt-1', s.color)}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </button>
        ))}
      </div>

      {/* ── Upload zone ── */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer',
          documents.length > 0 ? 'p-4' : 'p-8',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.005]'
            : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50/50',
        )}>
        {documents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center transition-colors', isDragging ? 'bg-primary/20' : 'bg-gray-100')}>
              <Upload size={24} className={isDragging ? 'text-primary' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">Glissez vos factures ici ou <span className="text-primary">parcourez</span></p>
              <p className="text-xs text-gray-400 mt-1">Images (JPG, PNG, HEIC) · PDF — Jusqu&apos;à <strong>60 fichiers</strong> en une fois</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
              {['Factures fournisseurs', 'Reçus & tickets', 'Notes de frais', 'Relevés PDF'].map(t => (
                <span key={t} className="flex items-center gap-1"><Check size={11} className="text-green-500" /> {t}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors', isDragging ? 'bg-primary/20' : 'bg-gray-100')}>
              <Upload size={16} className={isDragging ? 'text-primary' : 'text-gray-400'} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700">{isDragging ? 'Relâchez pour importer' : 'Déposez des fichiers ou cliquez pour importer'}</p>
              <p className="text-[10px] text-gray-400">JPG · PNG · HEIC · PDF — max 60 fichiers</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Processing queue ── */}
      {queue.length > 0 && (
        <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-primary" />
              <p className="text-xs font-bold text-gray-800">
                Traitement IA en cours
                {activeUploads > 0 && (
                  <span className="ml-2 text-[11px] font-semibold text-primary animate-pulse">
                    {activeUploads} fichier{activeUploads > 1 ? 's' : ''} en cours...
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => setQueue(prev => prev.filter(q => q.status !== 'done' && q.status !== 'error'))}
              className="text-[11px] text-gray-400 hover:text-gray-600 font-semibold">
              Effacer terminés
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
            {queue.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  {item.file.type === 'application/pdf'
                    ? <FileText size={12} className="text-red-400" />
                    : <ImageIcon size={12} className="text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">{item.name}</p>
                  <p className={cn('text-[10px]', item.status === 'error' ? 'text-red-500' : 'text-gray-400')}>
                    {item.status === 'waiting'   && 'En file d\'attente...'}
                    {item.status === 'uploading' && 'Envoi du fichier...'}
                    {item.status === 'analyzing' && 'Analyse IA — extraction des données...'}
                    {item.status === 'done'      && '✓ Terminé — données extraites'}
                    {item.status === 'error'     && `Erreur : ${item.error}`}
                  </p>
                </div>
                <div className="shrink-0">
                  {['waiting', 'uploading', 'analyzing'].includes(item.status) && (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  {item.status === 'done'  && <CheckCircle2 size={15} className="text-green-500" />}
                  {item.status === 'error' && <AlertTriangle size={15} className="text-red-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Type tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'purchase', 'sales', 'expense', 'receipt'] as const).map(t => {
            const cfg = DOC_TYPE_CFG[t];
            return (
              <button key={t}
                onClick={() => setFilters(f => ({ ...f, expenseType: t }))}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                  filters.expenseType === t
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}>
                {t !== 'all' && filters.expenseType === t && <cfg.icon size={11} />}
                {t === 'all' ? 'Tous' : cfg.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-40">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Fournisseur, description, n° facture..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1">
          {(['all', 'pending', 'reviewed', 'published'] as const).map(s => (
            <button key={s}
              onClick={() => setFilters(f => ({ ...f, status: s }))}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap',
                filters.status === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
              )}>
              {s === 'all' ? `Tous (${documents.length})` : STATUS_CFG[s].label}
            </button>
          ))}
        </div>

        {/* Advanced filters toggle */}
        <button onClick={() => setShowFilters(v => !v)}
          className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
            showFilters ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
          <SlidersHorizontal size={12} /> Filtres
        </button>

        <button onClick={fetchDocs} title="Actualiser"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="flex items-end gap-3 flex-wrap p-4 bg-gray-50 rounded-2xl border border-gray-200">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Catégorie</label>
            <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
              className="text-xs rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none">
              <option value="">Toutes</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Du</label>
            <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              className="text-xs rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Au</label>
            <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              className="text-xs rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none" />
          </div>
          <button onClick={() => setFilters({ search: '', status: 'all', category: '', expenseType: 'all', dateFrom: '', dateTo: '' })}
            className="text-xs text-gray-500 hover:text-gray-800 font-semibold pb-2">
            Réinitialiser
          </button>
        </div>
      )}

      {/* ── Main content: list + sticky panel ── */}
      <div className="flex items-start gap-4">

        {/* ── Document list ── */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload size={24} className="text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-500">Aucun document</p>
              <p className="text-xs text-gray-400 mt-1">
                {documents.length > 0 ? 'Aucun résultat pour ces filtres' : 'Importez vos premières factures ci-dessus'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
              {/* Table header */}
              <div className="grid grid-cols-[20px_40px_1fr_80px_90px_80px_120px] items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <input type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
                  onChange={toggleAll} className="rounded border-gray-300" />
                <span />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Fournisseur</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide hidden md:block text-center">Type</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right hidden sm:block">Montant TTC</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right hidden lg:block">Date</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Statut</span>
              </div>

              {/* Date-grouped rows */}
              {grouped.map(({ label, items }) => (
                <div key={label}>
                  {/* Date group header */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/80 border-y border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                    <span className="text-[10px] text-gray-300">· {items.length} doc{items.length > 1 ? 's' : ''}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[10px] text-gray-400 font-semibold">
                      {formatCurrency(items.reduce((s, d) => s + (d.amount || 0), 0))}
                    </span>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-gray-50">
                    {items.map(doc => {
                      const cat     = getCat(doc.category);
                      const st      = STATUS_CFG[doc.status];
                      const invType = doc.invoice_type || doc.ocr_data?.invoice_type || doc.ocr_data?.expense_type || 'purchase';
                      const typCfg  = DOC_TYPE_CFG[invType] || DOC_TYPE_CFG.purchase;
                      const isActive   = selectedDoc?.id === doc.id;
                      const isSelected = selectedIds.has(doc.id);

                      return (
                        <div
                          key={doc.id}
                          onClick={() => openDetail(doc)}
                          className={cn(
                            'grid grid-cols-[20px_40px_1fr_80px_90px_80px_120px] items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors group',
                            isSelected && 'bg-primary/5',
                            isActive   && 'bg-blue-50/60 border-l-2 border-l-primary',
                          )}>

                          {/* Checkbox */}
                          <input type="checkbox" checked={isSelected}
                            onChange={e => { e.stopPropagation(); toggleSelect(doc.id); }}
                            onClick={e => e.stopPropagation()}
                            className="rounded border-gray-300 text-primary focus:ring-primary/30" />

                          {/* Thumbnail */}
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                            {doc.file_type === 'image'
                              ? <img src={doc.file_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                              : doc.file_type === 'pdf'
                              ? <FileText size={14} className="text-red-400" />
                              : <FileIcon size={14} className="text-gray-400" />}
                          </div>

                          {/* Vendor + description */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {doc.vendor || <span className="text-gray-400 italic font-normal text-xs">Fournisseur non extrait</span>}
                              </p>
                              {doc.needs_review && (
                                <span title="Confiance faible — à vérifier">
                                  <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {doc.supplier_reference && (
                                <span className="text-[10px] text-gray-400 font-medium">#{doc.supplier_reference}</span>
                              )}
                              <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold hidden sm:inline-flex', cat.color)}>
                                {cat.label}
                              </span>
                              <span className="text-[10px] text-gray-400 truncate hidden sm:block">
                                {doc.description || <span className="italic">Aucune description</span>}
                              </span>
                            </div>
                          </div>

                          {/* Invoice type */}
                          <div className="hidden md:flex justify-center">
                            <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-[9px] font-bold', typCfg.color)}>
                              {typCfg.label}
                            </span>
                          </div>

                          {/* Amount */}
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(doc.amount || 0)}</p>
                            {doc.vat_amount != null && doc.vat_amount > 0 && (
                              <p className="text-[10px] text-gray-400">TVA {formatCurrency(doc.vat_amount)}</p>
                            )}
                          </div>

                          {/* Date */}
                          <div className="hidden lg:block text-right">
                            <p className="text-xs text-gray-600">
                              {fmtDate(doc.document_date) !== '—' ? fmtDate(doc.document_date) : relativeDate(doc.created_at)}
                            </p>
                            {doc.due_date && <p className="text-[10px] text-gray-400">Éch. {fmtDate(doc.due_date)}</p>}
                          </div>

                          {/* Status + actions */}
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap', st.color)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', st.dot)} />
                              {st.label}
                            </span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
                              {doc.status === 'pending' && (
                                <button title="Vérifier" onClick={() => changeStatus(doc.id, 'reviewed')}
                                  className="w-5 h-5 rounded hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors">
                                  <Eye size={11} />
                                </button>
                              )}
                              {doc.status === 'reviewed' && (
                                <button title="Archiver" onClick={() => changeStatus(doc.id, 'published')}
                                  className="w-5 h-5 rounded hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors">
                                  <Archive size={11} />
                                </button>
                              )}
                              <button title="Supprimer" onClick={() => handleDelete(doc.id)}
                                className="w-5 h-5 rounded hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Table footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">
                  {filtered.length} document{filtered.length !== 1 ? 's' : ''}
                  {selectedIds.size > 0 && (
                    <span className="font-semibold text-primary ml-1">· {selectedIds.size} sélectionné(s)</span>
                  )}
                </p>
                <p className="text-xs font-bold text-gray-700">
                  {formatCurrency(filtered.reduce((s, d) => s + (d.amount || 0), 0))}
                  <span className="text-gray-400 font-normal ml-1">
                    dont TVA {formatCurrency(filtered.reduce((s, d) => s + (d.vat_amount || 0), 0))}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Desktop sticky detail panel ── */}
        {selectedDoc && (
          <div className="hidden lg:flex flex-col w-[400px] shrink-0 bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-6 max-h-[calc(100vh-100px)]">
            <DetailPanel />
          </div>
        )}
      </div>

      {/* ── Mobile detail drawer ── */}
      {selectedDoc && (
        <div className="lg:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setSelectedDoc(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />
            <DetailPanel />
          </div>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-gray-900 rounded-2xl shadow-2xl border border-white/10">
          <span className="text-xs font-bold text-white shrink-0">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
          <div className="w-px h-4 bg-gray-700" />
          <button onClick={() => bulkStatus('reviewed')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">
            <Eye size={11} /> Vérifier
          </button>
          <button onClick={() => bulkStatus('published')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors">
            <Archive size={11} /> Archiver
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-700 text-white text-xs font-bold hover:bg-gray-600 transition-colors">
            <Download size={11} /> CSV
          </button>
          <button onClick={bulkDelete}
            className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-colors">
            <Trash2 size={12} />
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="w-8 h-8 rounded-xl bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white transition-colors">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── PDF Split Confirmation Modal ── */}
      {splitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">PDF multi-pages détecté</h3>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{splitModal.file.name}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Ce PDF contient <strong className="text-gray-900">{splitModal.pageCount} page{splitModal.pageCount > 1 ? 's' : ''}</strong>.
                {' '}Comment voulez-vous le traiter ?
              </p>
            </div>

            <div className="px-6 pb-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => splitModal.resolve(false)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                <FileText size={22} className="text-gray-500" />
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-800">Document entier</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">1 facture · 1 analyse IA</p>
                </div>
              </button>
              <button
                onClick={() => splitModal.resolve(true)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all">
                <Layers size={22} className="text-primary" />
                <div className="text-center">
                  <p className="text-xs font-bold text-primary">Séparer en pages</p>
                  <p className="text-[10px] text-primary/60 mt-0.5">{splitModal.pageCount} factures · {splitModal.pageCount} analyses</p>
                </div>
              </button>
            </div>

            <div className="px-6 pb-5">
              <p className="text-[10px] text-gray-400 text-center">
                ✨ Style Dext — chaque page traitée comme une facture individuelle
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Workspace Modal ── */}
      {showCreateWs && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setShowCreateWs(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Créer un nouveau dossier</p>
                <button onClick={() => setShowCreateWs(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
                  <X size={15} />
                </button>
              </div>
              {!isPro && workspaces.length >= 1 && (
                <div className="mx-5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-800">
                    <strong>Limitation de plan:</strong> Les utilisateurs Solo peuvent gérer un seul dossier.
                    {' '}Passez à <span className="font-semibold">Pro</span> pour créer plusieurs dossiers d'entreprise.
                  </p>
                </div>
              )}
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">Nom du dossier *</label>
                  <input type="text" value={newWsName} onChange={e => setNewWsName(e.target.value)}
                    placeholder="Ex: Client XYZ, Dossier Personnel..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">Description (optionnel)</label>
                  <textarea value={newWsDesc} onChange={e => setNewWsDesc(e.target.value)}
                    placeholder="Description de ce dossier..." rows={3}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>
              </div>
              <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
                <button onClick={() => setShowCreateWs(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white transition-colors">
                  Annuler
                </button>
                <button onClick={handleCreateWorkspace} disabled={!newWsName.trim() || creatingWs}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {creatingWs ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création...</>
                  ) : (
                    <><Plus size={14} /> Créer le dossier</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
