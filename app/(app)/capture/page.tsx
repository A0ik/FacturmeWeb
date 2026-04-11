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
  SlidersHorizontal, Check, FileSpreadsheet, Building2,
  RotateCcw, Database, CreditCard, Building, Users, Wallet,
  Banknote, CheckCircle, ArrowRight, PlusCircle, Link2, Unlink,
  ShoppingBag, TrendingUp, Receipt
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

// ─── Image compression (client-side, no library needed) ─────────────────────

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
        else                { width = Math.round(width * MAX / height); height = MAX; }
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

// ─── Types ──────────────────────────────────────────────────────────────────

type QueueItem = {
  id: string;
  file: File;
  name: string;
  status: 'waiting' | 'uploading' | 'analyzing' | 'done' | 'error';
  error?: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'transport',      label: 'Transport',     color: 'bg-blue-100 text-blue-700' },
  { value: 'meals',          label: 'Restauration',  color: 'bg-orange-100 text-orange-700' },
  { value: 'accommodation',  label: 'Hébergement',   color: 'bg-purple-100 text-purple-700' },
  { value: 'equipment',      label: 'Équipement',    color: 'bg-gray-100 text-gray-700' },
  { value: 'office',         label: 'Fournitures',   color: 'bg-green-100 text-green-700' },
  { value: 'services',       label: 'Services',      color: 'bg-indigo-100 text-indigo-700' },
  { value: 'shopping',       label: 'Achats',        color: 'bg-pink-100 text-pink-700' },
  { value: 'other',          label: 'Autre',         color: 'bg-gray-100 text-gray-500' },
];

const STATUS_CONFIG: Record<CaptureStatus, { label: string; color: string; dot: string }> = {
  pending:   { label: 'À traiter', color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  reviewed:  { label: 'Vérifié',   color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  published: { label: 'Archivé',   color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
};

const INVOICE_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  purchase: { label: 'Achat',    color: 'bg-red-100 text-red-700',    icon: ShoppingBag },
  sales:    { label: 'Vente',    color: 'bg-green-100 text-green-700', icon: TrendingUp },
  expense:  { label: 'Dépense',  color: 'bg-orange-100 text-orange-700', icon: Receipt },
  receipt:  { label: 'Reçu',     color: 'bg-blue-100 text-blue-700',   icon: FileText },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unpaid:   { label: 'Non payé',   color: 'bg-red-100 text-red-700' },
  pending:  { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  paid:     { label: 'Payé',      color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé',   color: 'bg-gray-100 text-gray-700' },
};

const PAYMENT_METHODS = [
  { value: 'card',        label: 'Carte bancaire' },
  { value: 'cash',        label: 'Espèces' },
  { value: 'transfer',    label: 'Virement' },
  { value: 'check',       label: 'Chèque' },
  { value: 'prelevement', label: 'Prélèvement' },
];

const VAT_RATES = ['20', '10', '5.5', '2.1', '0'];
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCat(v?: string | null) {
  return CATEGORIES.find(c => c.value === v) ?? CATEGORIES[CATEGORIES.length - 1];
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CapturePage() {
  const { user } = useAuthStore();

  // Data
  const [documents, setDocuments]     = useState<CapturedDocument[]>([]);
  const [loading, setLoading]         = useState(true);

  // Workspace support (PRO)
  const [workspaces, setWorkspaces]   = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [isPro, setIsPro]             = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  // Upload queue
  const [queue, setQueue]             = useState<QueueItem[]>([]);

  // Detail panel
  const [selectedDoc, setSelectedDoc] = useState<CapturedDocument | null>(null);
  const [editForm, setEditForm]       = useState<Partial<CapturedDocument>>({});
  const [saving, setSaving]           = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // UI state
  const [isDragging, setIsDragging]   = useState(false);
  const [showExport, setShowExport]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [filters, setFilters]         = useState({
    search: '', status: 'all', category: '', expenseType: 'all', dateFrom: '', dateTo: '',
  });

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const processedFilesRef = useRef<Set<string>>(new Set()); // Track processed files to prevent duplicates
  const processingFileHashesRef = useRef<Set<string>>(new Set()); // Track files currently being processed
  const isProcessingRef = useRef(false); // Prevent simultaneous processing

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch documents with workspace data
      const { data: docs } = await getSupabaseClient()
        .from('captured_documents').select('*, workspaces(name)')
        .eq('user_id', user.id).order('created_at', { ascending: false });
      setDocuments(docs || []);

      // Fetch profile and workspaces
      const { data: profile } = await getSupabaseClient()
        .from('profiles').select('subscription_tier').eq('id', user.id).single();
      const proTier = profile?.subscription_tier === 'pro';
      setIsPro(proTier);

      if (proTier) {
        const { data: ws } = await getSupabaseClient()
          .from('workspaces').select('*').eq('owner_id', user.id);
        setWorkspaces(ws || []);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ── Stats ──────────────────────────────────────────────────────────────────

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

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = documents;

    // Workspace filter (PRO only)
    if (isPro && selectedWorkspace) {
      list = list.filter(d => d.workspace_id === selectedWorkspace);
    }

    // Status filter
    if (filters.status !== 'all') list = list.filter(d => d.status === filters.status);

    // Invoice type filter (purchases/sales/expense/receipt)
    if (filters.expenseType !== 'all') {
      list = list.filter(d => {
         // Use invoice_type field if available, fallback to ocr_data.expense_type
         const type = d.invoice_type || d.ocr_data?.expense_type || d.ocr_data?.invoice_type || 'purchase';
         return type === filters.expenseType;
      });
    }

    // Other filters
    if (filters.category)         list = list.filter(d => d.category === filters.category);
    if (filters.dateFrom)         list = list.filter(d => d.document_date && d.document_date >= filters.dateFrom);
    if (filters.dateTo)           list = list.filter(d => d.document_date && d.document_date <= filters.dateTo);
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

  const activeUploads = queue.filter(q => ['waiting', 'uploading', 'analyzing'].includes(q.status)).length;

  // ── Process single file ────────────────────────────────────────────────────

  const processQueueItem = useCallback(async (item: QueueItem) => {
    if (!user) return;

    const upd = (u: Partial<QueueItem>) =>
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, ...u } : q));

    try {
      // 1. Compress image if needed, then upload to Supabase storage
      upd({ status: 'uploading' });
      const fileToUpload = item.file.type.startsWith('image/') ? await compressImage(item.file) : item.file;
      const ext  = fileToUpload.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `receipts/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const uploadPromise = new Promise<{error: any}>((resolve) => {
        const timer = setTimeout(() => resolve({ error: new Error('Timeout de l\'upload (60s)') }), 60000);
        getSupabaseClient().storage.from('assets').upload(path, fileToUpload, { upsert: true })
          .then(res => { clearTimeout(timer); resolve(res); })
          .catch(err => { clearTimeout(timer); resolve({ error: err }); });
      });
      const { error: uploadErr } = await uploadPromise;
      if (uploadErr) throw uploadErr;

      const { data: urlData } = getSupabaseClient().storage.from('assets').getPublicUrl(path);
      const fileUrl  = urlData.publicUrl;
      const fileType = item.file.type.startsWith('image/') ? 'image'
                     : item.file.type === 'application/pdf' ? 'pdf' : 'other';

      // 2. Insert document record immediately (shows in list right away)
      const { data: doc, error: insertErr } = await getSupabaseClient()
        .from('captured_documents')
        .insert({ user_id: user.id, file_url: fileUrl, file_type: fileType, status: 'pending', amount: 0, vat_amount: 0, vat_rate: 0 })
        .select().single();
      if (insertErr) throw insertErr;
      setDocuments(prev => [doc, ...prev]);

      // 3. AI analysis — send compressed/original file directly
      upd({ status: 'analyzing' });
      if (fileType === 'image' || fileType === 'pdf') {
        const fd = new FormData();
        fd.append('file', fileToUpload); // use compressed version for images
        
        const timeoutController = new AbortController();
        const timerId = setTimeout(() => timeoutController.abort(), 120000); // Increased to 2 minutes
        let res: Response;
        try {
          res = await fetch('/api/ai/analyze-document', { method: 'POST', body: fd, signal: timeoutController.signal });
        } catch (fetchErr: any) {
          throw new Error(fetchErr.name === 'AbortError' ? 'Timeout de l\'IA (2min). Réessayez avec un fichier plus léger.' : fetchErr.message);
        } finally {
          clearTimeout(timerId);
        }

        if (!res.ok) {
           const errText = await res.text();
           throw new Error(`Erreur API (${res.status}): ${errText.slice(0, 40)}`);
        }

        const data = await res.json();
        if (data.error) throw new Error(`Erreur IA : ${data.error}`);
        const extracted = data.extracted;

        if (extracted) {
          let finalAccountCode = extracted.suggested_account_code || null;
          let finalAccountName = null;
          
          if (extracted.vendor) {
             const { data: mapping } = await getSupabaseClient().from('vendor_mappings')
               .select('*').eq('user_id', user.id).ilike('vendor_name_pattern', extracted.vendor).maybeSingle();
             if (mapping) {
                finalAccountCode = mapping.account_code;
                finalAccountName = mapping.account_name;
             }
          }
          const confScore = typeof extracted.confidence_score === 'number' ? extracted.confidence_score : 100;

          const patch: Partial<CapturedDocument> = {
            vendor:             extracted.vendor        || null,
            description:        extracted.description   || null,
            amount:             extracted.amount        || 0,
            vat_amount:         extracted.vat_amount    ?? null,
            vat_rate:           extracted.vat_rate      ?? null,
            document_date:      extracted.date          || null,
            due_date:           extracted.due_date      || null,
            category:           extracted.category      || null,
            payment_method:     extracted.payment_method|| null,
            supplier_reference: extracted.invoice_number|| null,
            ocr_data:           extracted,
            confidence_score:   confScore,
            needs_review:       confScore < 80,
            account_code:       finalAccountCode,
            account_name:       finalAccountName,
            // New Dext fields
            invoice_type:       extracted.invoice_type || 'purchase',
            line_items:         extracted.line_items || [],
            supplier_iban:      extracted.supplier_iban || null,
            supplier_bic:       extracted.supplier_bic || null,
            supplier_bank_name: extracted.supplier_bank_name || null,
          };

          // AI-based workspace assignment for PRO users
          if (isPro && extracted.vendor && workspaces.length > 0) {
            // Simple AI logic: match vendor name pattern to workspace
            // In production, this could use a more sophisticated ML model
            const vendorLower = extracted.vendor.toLowerCase();
            const matchedWorkspace = workspaces.find((ws: any) =>
              vendorLower.includes(ws.name.toLowerCase()) ||
              ws.name.toLowerCase().includes(vendorLower)
            );
            if (matchedWorkspace) {
              patch.workspace_id = matchedWorkspace.id;
            }
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

  // ── Process multiple files ─────────────────────────────────────────────────

  // Helper function to create a hash from file content for reliable duplicate detection
  const getFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashArray = Array.from(new Uint8Array(buffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `${file.name}-${file.size}-${hashHex.substring(0, 32)}`;
  };

  const processFiles = useCallback(async (files: File[]) => {
    if (!user || files.length === 0) return;

    // Prevent simultaneous processing
    if (isProcessingRef.current) {
      console.log('Already processing files, skipping duplicate request');
      return;
    }

    isProcessingRef.current = true;
    try {
    const valid = files.filter(f => ALLOWED_TYPES.includes(f.type) || /\.(jpg|jpeg|png|webp|pdf|heic|heif)$/i.test(f.name));
    if (valid.length === 0) return;

    let finalFiles: File[] = [];
    const processedFiles = processedFilesRef.current;
    const processingFileHashes = processingFileHashesRef.current;

    for (const f of valid) {
      try {
        // Create a more reliable hash for duplicate detection
        const fileHash = await getFileHash(f);

        // Skip if this exact file has already been processed
        if (processedFiles.has(fileHash)) {
          console.log(`Skipping duplicate file: ${f.name}`);
          continue;
        }

        // Skip if this file is currently being processed
        if (processingFileHashes.has(fileHash)) {
          console.log(`File already being processed: ${f.name}`);
          continue;
        }

        // Mark this file as being processed
        processingFileHashes.add(fileHash);

        if (f.type === 'application/pdf') {
          try {
            const arrayBuffer = await f.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();

            if (pageCount > 1) {
              // Split PDF automatiquement
              for (let i = 0; i < pageCount; i++) {
                const newPdf = await PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                newPdf.addPage(copiedPage);
                const pdfBytes = await newPdf.save();
                const baseName = f.name.replace(/\.[^/.]+$/, "");
                const splitFileName = `${baseName}_p${i + 1}.pdf`;

                // Create File directly from pdfBytes using proper type casting
                const newFile = new File(
                  [pdfBytes.buffer as any],
                  splitFileName,
                  { type: 'application/pdf' }
                );

                // Create unique hash for split files to prevent duplicates
                const splitFileHash = await getFileHash(newFile);
                if (processedFiles.has(splitFileHash)) {
                  console.log(`Skipping duplicate split file: ${splitFileName}`);
                  continue;
                }

                processedFiles.add(splitFileHash);
                finalFiles.push(newFile);
              }
            } else {
              // Single page PDF - add directly
              processedFiles.add(fileHash);
              finalFiles.push(f);
            }
          } catch (err) {
            console.error("PDF Split Error", err);
            processedFiles.add(fileHash);
            finalFiles.push(f); // Fallback
          }
        } else {
          // Non-PDF file - add directly
          processedFiles.add(fileHash);
          finalFiles.push(f);
        }
      } catch (hashError) {
        console.error("Error creating file hash:", hashError);
        // Fallback to simple name-size check
        const fileKey = `${f.name}-${f.size}`;
        if (processedFiles.has(fileKey)) {
          console.log(`Skipping duplicate file (fallback): ${f.name}`);
          continue;
        }
        processedFiles.add(fileKey);
        finalFiles.push(f);
      }
    }

    const items: QueueItem[] = finalFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file, name: file.name, status: 'waiting',
    }));

    if (items.length > 0) {
      setQueue(prev => [...prev, ...items]);

      // Parallel batches of 5
      const BATCH = 5;
      for (let i = 0; i < items.length; i += BATCH) {
        await Promise.all(items.slice(i, i + BATCH).map(it => processQueueItem(it)));
      }
    }

    // Clean up processing hashes after processing is complete
    processingFileHashes.clear();

    // Clean up processed files after 5 minutes to allow re-uploads
    setTimeout(() => {
      processedFilesRef.current.clear();
    }, 5 * 60 * 1000);
    } finally {
      isProcessingRef.current = false;
    }
  }, [user, processQueueItem]);

  // ── Drag & drop ────────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      processFiles(files);
      e.target.value = '';
    }
  }, [processFiles]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

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

        // Update ML mappings if vendor and account code are set
        if (editForm.vendor && editForm.account_code && user) {
          await getSupabaseClient().from('vendor_mappings').upsert({
            user_id: user.id,
            vendor_name_pattern: editForm.vendor,
            account_code: editForm.account_code,
            account_name: editForm.account_name || null
          }, { onConflict: 'user_id,vendor_name_pattern' });
        }
      }
    } finally {
      setSaving(false);
    }
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

  // ── Bulk ops ───────────────────────────────────────────────────────────────

  const bulkStatus = async (status: CaptureStatus) => {
    if (!selectedIds.size) return;
    const ids  = Array.from(selectedIds);
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

  const toggleSelect   = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll      = () => setSelectedIds(
    selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(d => d.id)),
  );

  const openDetail = (doc: CapturedDocument) => {
    setSelectedDoc(doc);
    setEditForm({
      vendor:             doc.vendor             || '',
      description:        doc.description        || '',
      amount:             doc.amount,
      vat_amount:         doc.vat_amount,
      vat_rate:           doc.vat_rate,
      document_date:      doc.document_date      || '',
      due_date:           doc.due_date           || '',
      category:           doc.category           || '',
      payment_method:     doc.payment_method     || '',
      notes:              doc.notes              || '',
      supplier_reference: doc.supplier_reference || '',
      account_code:       doc.account_code       || '',
      account_name:       doc.account_name       || '',
      // New fields
      invoice_type:       doc.invoice_type       || 'purchase',
      line_items:         doc.line_items         || [],
      supplier_iban:      doc.supplier_iban      || '',
      supplier_bic:       doc.supplier_bic       || '',
      supplier_bank_name: doc.supplier_bank_name || '',
      payment_status:     doc.payment_status     || 'unpaid',
      workspace_id:       doc.workspace_id       || '',
    });
  };

  // ── Exports ────────────────────────────────────────────────────────────────

  const exportSet = useMemo(() =>
    selectedIds.size > 0 ? documents.filter(d => selectedIds.has(d.id)) : filtered,
  [documents, filtered, selectedIds]);

  const exportCSV = () => {
    const headers = ['Date', 'Échéance', 'Fournisseur', 'N° Facture', 'Description',
                     'Montant HT', 'TVA', 'Montant TTC', 'Taux TVA (%)', 'Catégorie', 'Paiement', 'Statut'];
    const rows = exportSet.map(d => {
      const ht = d.amount && d.vat_amount != null ? +(d.amount - d.vat_amount).toFixed(2) : (d.amount || 0);
      return [
        d.document_date || '',
        d.due_date || '',
        d.vendor || '',
        d.supplier_reference || '',
        d.description || '',
        ht.toFixed(2),
        (d.vat_amount || 0).toFixed(2),
        (d.amount || 0).toFixed(2),
        d.vat_rate != null ? String(d.vat_rate) : '',
        getCat(d.category).label,
        PAYMENT_METHODS.find(p => p.value === d.payment_method)?.label || '',
        STATUS_CONFIG[d.status].label,
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    downloadBlob('\uFEFF' + csv, `capture-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    setShowExport(false);
  };

  const exportFEC = () => {
    // Norme Fichier des Ecritures Comptables (FEC)
    const headers = ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'];
    const rows: string[][] = [];
    
    exportSet.forEach(d => {
      if (!d.document_date) return;
      const dateFec = d.document_date.replace(/-/g, ''); // YYYYMMDD
      const pieceRef = d.supplier_reference || d.id.slice(0, 8).toUpperCase();
      const numLogic = d.id.slice(0, 6).toUpperCase();
      const vendorName = d.vendor || 'FOURNISSEUR INCONNU';
      const label = (vendorName.slice(0, 20) + (d.supplier_reference ? ` - ${d.supplier_reference}` : '')).slice(0, 35);
      const tva = d.vat_amount || 0;
      const amountTtc = d.amount || 0;
      const ht = +(amountTtc - tva).toFixed(2);
      
      // Ligne de Charge (HT) au débit
      if (ht > 0) {
        rows.push(['ACH', 'Achats', numLogic, dateFec, d.account_code || '606400', d.account_name || 'Achats divers', '', '', pieceRef, dateFec, label, ht.toFixed(2).replace('.', ','), '0,00', '', '', dateFec, '', '']);
      }
      // Ligne de TVA au débit
      if (tva > 0) {
        rows.push(['ACH', 'Achats', numLogic, dateFec, '445660', 'TVA Deductible', '', '', pieceRef, dateFec, label, tva.toFixed(2).replace('.', ','), '0,00', '', '', dateFec, '', '']);
      }
      // Ligne Fournisseur (Dette TTC) au crédit
      if (amountTtc > 0) {
        const auxCompte = `F${vendorName.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
        rows.push(['ACH', 'Achats', numLogic, dateFec, '401000', 'Fournisseurs', auxCompte, vendorName, pieceRef, dateFec, label, '0,00', amountTtc.toFixed(2).replace('.', ','), '', '', dateFec, '', '']);
      }
    });

    const csv = [headers, ...rows].map(r => r.join('\t')).join('\n'); // FEC est souvent tabulaire (.txt)
    downloadBlob('\uFEFF' + csv, `FEC-ACHATS-${new Date().toISOString().slice(0, 10)}.txt`, 'text/plain;charset=utf-8;');
    setShowExport(false);
  };

  const exportJSON = () => {
    const data = exportSet.map(d => ({
      date:            d.document_date,
      echeance:        d.due_date,
      fournisseur:     d.vendor,
      numero_facture:  d.supplier_reference,
      description:     d.description,
      montant_ht:      d.amount != null && d.vat_amount != null ? +(d.amount - d.vat_amount).toFixed(2) : d.amount,
      tva:             d.vat_amount,
      montant_ttc:     d.amount,
      taux_tva:        d.vat_rate,
      categorie:       d.category,
      mode_paiement:   d.payment_method,
      statut:          d.status,
      fichier:         d.file_url,
      cree_le:         d.created_at,
    }));
    downloadBlob(JSON.stringify(data, null, 2), `capture-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    setShowExport(false);
  };



  const exportOFX = () => {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    let ofx = `OFXHEADER:100\nDATA:OFSGML\nVERSION:102\nSECURITY:NONE\nENCODING:USASCII\nCHARSET:1252\nCOMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n\n`;
    ofx += `<OFX>\n<BANKMSGSRSV1>\n<STMTTRNRS>\n<TRNUID>1\n<STATUS><CODE>0<SEVERITY>INFO</STATUS>\n<STMTRS>\n<CURDEF>EUR\n<BANKACCTFROM><BANKID>CAPTURE<ACCTID>FACTURME<ACCTTYPE>CHECKING</BANKACCTFROM>\n<BANKTRANLIST>\n<DTSTART>${ts}\n<DTEND>${ts}\n`;
    exportSet.forEach(d => {
      const dtposted = (d.document_date || d.created_at.slice(0, 10)).replace(/-/g, '') + '000000';
      ofx += `<STMTTRN>\n<TRNTYPE>DEBIT\n<DTPOSTED>${dtposted}\n<TRNAMT>-${(d.amount || 0).toFixed(2)}\n<FITID>${d.id}\n<NAME>${(d.vendor || 'Unknown').slice(0, 32)}\n<MEMO>${(d.description || '').slice(0, 64)}\n</STMTTRN>\n`;
    });
    ofx += `</BANKTRANLIST>\n</STMTRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>`;
    downloadBlob(ofx, `export-ofx-${new Date().toISOString().slice(0, 10)}.ofx`, 'application/x-ofx');
    setShowExport(false);
  };

  // ── Create Workspace ───────────────────────────────────────────────────────

  const handleCreateWorkspace = async () => {
    if (!user || !newWorkspaceName.trim()) return;

    setCreatingWorkspace(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          user_id: user.id,
          description: newWorkspaceDesc.trim() || null,
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de la création du dossier');

      const { workspace } = await res.json();

      // Add new workspace to list
      setWorkspaces(prev => [workspace, ...prev]);

      // Select the new workspace
      setSelectedWorkspace(workspace.id);

      // Reset form and close modal
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      setShowCreateWorkspace(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingWorkspace(false);
    }
  };

  // ── SEPA XML Generation (ISO 20022) ───────────────────────────────────────

  const generateSEPAXML = (doc: CapturedDocument) => {
    const iban = (doc.supplier_iban || editForm.supplier_iban || '').replace(/\s/g, '');
    const bic = (doc.supplier_bic || editForm.supplier_bic || '').replace(/\s/g, '');
    const amount = (doc.amount || 0).toFixed(2);
    const now = new Date();
    const msgId = `MSG-${now.getTime()}`;
    const pmtId = `PMT-${doc.id.slice(0, 8)}-${now.getTime()}`;
    const paymentDate = doc.due_date || now.toISOString().slice(0, 10);

    // Generate SEPA Customer Credit Transfer XML (pain.001.001.03)
    const sepaXml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${now.toISOString()}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${amount}</CtrlSum>
      <InitgPty>
        <Nm>FacturmeWeb</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${pmtId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${amount}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${paymentDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>Votre Entreprise</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>FR76XXXXXXXXXXXXXXXXXX</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>XXXXXXXX</BIC>
        </FinInstnId>
      </DbtrAgt>
      <ChrgBr>SHAR</ChrgBr>
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${doc.supplier_reference || doc.id.slice(0, 35)}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${amount}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <BIC>${bic}</BIC>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${doc.vendor || 'Fournisseur'}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${iban}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${doc.description || `Facture ${doc.supplier_reference || doc.id}`}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    downloadBlob(sepaXml, `SEPA-${doc.supplier_reference || doc.id.slice(0, 8)}.xml`, 'application/xml');

    // Update document to mark SEPA as generated
    getSupabaseClient().from('captured_documents').update({
      sepa_generated: true,
      payment_status: 'pending'
    }).eq('id', doc.id);

    setSelectedDoc(prev => prev ? { ...prev, sepa_generated: true, payment_status: 'pending' as any } : null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Hidden file inputs */}
      <input ref={fileInputRef}   type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFileInput} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Capture de documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Importez vos factures — l&apos;IA extrait automatiquement toutes les données
          </p>
          {/* Workspace Selector (PRO only) */}
          {isPro && (
            <div className="flex items-center gap-2 mt-3 relative">
              <Building size={14} className="text-gray-400" />
              <div className="relative">
                <button
                  onClick={() => setShowWorkspaceDropdown(prev => !prev)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[180px] justify-between shadow-sm"
                >
                  <span className="truncate flex items-center gap-1.5">
                    {selectedWorkspace ? (
                      <>
                        <Building size={11} className="text-primary" />
                        {workspaces.find((ws: any) => ws.id === selectedWorkspace)?.name || 'Dossier inconnu'}
                      </>
                    ) : workspaces.length === 0 ? (
                      'Aucun dossier'
                    ) : (
                      'Tous les dossiers'
                    )}
                  </span>
                  <ChevronDown size={11} className={showWorkspaceDropdown ? 'rotate-180 transition-transform duration-200' : 'transition-transform duration-200'} />
                </button>

                {/* Dropdown Menu */}
                {showWorkspaceDropdown && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowWorkspaceDropdown(false)} />
                    <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden animate-in slide-in-from-top-1 fade-in duration-200">
                      <div className="max-h-64 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedWorkspace(null);
                            setShowWorkspaceDropdown(false);
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors border-b border-gray-100',
                            !selectedWorkspace ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Building2 size={11} className={cn(selectedWorkspace ? 'text-gray-400' : 'text-primary')} />
                            Tous les dossiers
                          </span>
                        </button>
                        {workspaces.map((ws: any) => (
                          <button
                            key={ws.id}
                            onClick={() => {
                              setSelectedWorkspace(ws.id);
                              setShowWorkspaceDropdown(false);
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors',
                              selectedWorkspace === ws.id ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700'
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Building size={11} className={selectedWorkspace === ws.id ? 'text-primary' : 'text-gray-400'} />
                              <span className="truncate">{ws.name}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 p-2 bg-gray-50">
                        <button
                          onClick={() => {
                            setShowWorkspaceDropdown(false);
                            setShowCreateWorkspace(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary bg-white hover:bg-primary/5 rounded-lg transition-colors border border-gray-200 shadow-sm"
                        >
                          <Plus size={12} />
                          Créer un nouveau dossier
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExport(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              <Download size={13} />
              Exporter
              <ChevronDown size={11} />
            </button>
            {showExport && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl z-40 overflow-hidden">
                  <div className="p-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 py-1.5">
                      {selectedIds.size > 0 ? `${selectedIds.size} sélectionné(s)` : `${filtered.length} document(s)`}
                    </p>
                    {[
                      { label: 'CSV Standard',  sub: 'Excel, LibreOffice, Sage',  fn: exportCSV,  Icon: FileSpreadsheet },
                      { label: 'JSON',           sub: 'API, intégrations',         fn: exportJSON, Icon: FileText },
                      { label: 'FEC Achats',     sub: 'DGFiP, logiciels compta',   fn: exportFEC,  Icon: Building2 },
                      { label: 'OFX Bancaire',   sub: 'Sage, QuickBooks, EBP',     fn: exportOFX,  Icon: Download },
                    ].map(({ label, sub, fn, Icon }) => (
                      <button key={label} onClick={fn}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 text-left transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Icon size={14} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{label}</p>
                          <p className="text-[10px] text-gray-400">{sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors"
          >
            <Camera size={13} /> Photo
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
          >
            <Plus size={13} /> Importer
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'À traiter',     value: stats.pending,               sub: 'documents en attente',  color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200/60', status: 'pending' },
          { label: 'Vérifiés',      value: stats.reviewed,              sub: 'confirmés par vous',    color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200/60',   status: 'reviewed' },
          { label: 'Archivés',      value: stats.published,             sub: 'envoyés comptabilité',  color: 'text-green-600', bg: 'bg-green-50 border-green-200/60', status: 'published' },
          { label: 'Total capturé', value: formatCurrency(stats.totalTTC), sub: `TVA ${formatCurrency(stats.totalVAT)}`, color: 'text-gray-900', bg: 'bg-gray-50 border-gray-200/60', status: 'all' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilters(f => ({ ...f, status: s.status }))}
            className={cn('rounded-2xl border p-4 text-left transition-all hover:shadow-sm cursor-pointer', s.bg, filters.status === s.status && 'ring-2 ring-gray-900/10')}
          >
            <p className="text-xs text-gray-500 font-semibold">{s.label}</p>
            <p className={cn('text-2xl font-black mt-1', s.color)}>{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>
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
          'rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.005]'
            : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50',
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center transition-colors', isDragging ? 'bg-primary/20' : 'bg-gray-100')}>
            <Upload size={24} className={isDragging ? 'text-primary' : 'text-gray-400'} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700">
              Glissez vos factures ici ou <span className="text-primary">parcourez</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Images (JPG, PNG, HEIC) · PDF — Jusqu&apos;à <strong>60 fichiers</strong> en une fois
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
            {['Factures fournisseurs', 'Reçus & tickets', 'Notes de frais', 'Relevés PDF'].map(t => (
              <span key={t} className="flex items-center gap-1"><Check size={11} className="text-green-500" /> {t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Processing queue ── */}
      {queue.length > 0 && (
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <p className="text-sm font-bold text-gray-800">
                Traitement IA en cours
                {activeUploads > 0 && (
                  <span className="ml-2 text-xs font-semibold text-primary animate-pulse">
                    {activeUploads} fichier{activeUploads > 1 ? 's' : ''} en cours...
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => setQueue(prev => prev.filter(q => q.status !== 'done' && q.status !== 'error'))}
              className="text-xs text-gray-400 hover:text-gray-600 font-semibold"
            >
              Effacer terminés
            </button>
          </div>
          <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
            {queue.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  {item.file.type === 'application/pdf'
                    ? <FileText size={14} className="text-red-500" />
                    : <ImageIcon size={14} className="text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">{item.name}</p>
                  <p className={cn('text-[10px]', item.status === 'error' ? 'text-red-500' : 'text-gray-400')}>
                    {item.status === 'waiting'   && 'En file d\'attente...'}
                    {item.status === 'uploading' && 'Envoi du fichier...'}
                    {item.status === 'analyzing' && 'Analyse IA : extraction des données...'}
                    {item.status === 'done'      && '✓ Terminé — données extraites'}
                    {item.status === 'error'     && `Erreur : ${item.error}`}
                  </p>
                </div>
                <div className="shrink-0">
                  {['waiting', 'uploading', 'analyzing'].includes(item.status) && (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  {item.status === 'done'  && <CheckCircle2 size={16} className="text-green-500" />}
                  {item.status === 'error' && <AlertTriangle size={16} className="text-red-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {/* Type pills (Dext style - expanded) */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
          {(['all', 'purchase', 'sales', 'expense', 'receipt'] as const).map(t => {
            const config = INVOICE_TYPE_CONFIG[t] || INVOICE_TYPE_CONFIG.purchase;
            return (
              <button
                key={t}
                onClick={() => setFilters(f => ({ ...f, expenseType: t }))}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap',
                  filters.expenseType === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {filters.expenseType === t && <config.icon size={12} />}
                {t === 'all' ? 'Tous' : config.label}
              </button>
            );
          })}
        </div>
        {/* Search */}
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Fournisseur, description, n° facture..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          />
        </div>
        {/* Status pills */}
        <div className="flex items-center gap-1">
          {(['all', 'pending', 'reviewed', 'published'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilters(f => ({ ...f, status: s }))}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap',
                filters.status === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {s === 'all' ? `Tous (${documents.length})` : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        {/* More filters */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
            showFilters ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          <SlidersHorizontal size={12} /> Filtres
        </button>
        {/* Refresh */}
        <button onClick={fetchDocs} title="Actualiser"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
          <RotateCcw size={13} />
        </button>
      </div>

      {/* ── Advanced filters ── */}
      {showFilters && (
        <div className="flex items-end gap-3 flex-wrap p-4 bg-gray-50 rounded-2xl border border-gray-200">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Catégorie</label>
            <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
              className="text-xs rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Toutes</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Du</label>
            <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              className="text-xs rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Au</label>
            <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              className="text-xs rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <button
            onClick={() => setFilters({ search: '', status: 'all', category: '', expenseType: 'all', dateFrom: '', dateTo: '' })}
            className="text-xs text-gray-500 hover:text-gray-800 font-semibold pb-2"
          >
            Réinitialiser
          </button>
        </div>
      )}

      {/* ── Document table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload size={28} className="text-gray-300" />
          </div>
          <p className="text-sm font-bold text-gray-500">Aucun document</p>
          <p className="text-xs text-gray-400 mt-1">
            {documents.length > 0 ? 'Aucun résultat pour ces filtres' : 'Importez vos premières factures ci-dessus'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          {/* Table head */}
          <div className="grid grid-cols-[auto_40px_1fr_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            <input type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
              onChange={toggleAll}
              className="rounded" />
            <span />
            <span>Fournisseur / Description</span>
            <span className="hidden md:block w-20 text-center">Type</span>
            <span className="text-right hidden sm:block w-24">TTC</span>
            <span className="hidden lg:block w-20 text-right">TVA</span>
            <span className="hidden xl:block w-24">Date</span>
            <span className="w-24">Statut</span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-gray-100">
            {filtered.map(doc => {
              const cat      = getCat(doc.category);
              const st       = STATUS_CONFIG[doc.status];
              const selected = selectedIds.has(doc.id);
              const active   = selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => openDetail(doc)}
                  className={cn(
                    'grid grid-cols-[auto_40px_1fr_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group',
                    selected && 'bg-primary/5',
                    active   && 'bg-blue-50/60',
                  )}
                >
                  {/* Checkbox */}
                  <input type="checkbox"
                    checked={selected}
                    onChange={e => { e.stopPropagation(); toggleSelect(doc.id); }}
                    onClick={e => e.stopPropagation()}
                    className="rounded" />

                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                    {doc.file_type === 'image'
                      ? <img src={doc.file_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : doc.file_type === 'pdf'
                        ? <FileText size={16} className="text-red-400" />
                        : <FileIcon size={16} className="text-gray-400" />}
                  </div>

                  {/* Vendor + description */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {doc.vendor || <span className="text-gray-400 italic font-normal">Fournisseur non extrait</span>}
                      </p>
                      <span className={cn('shrink-0 hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold', cat.color)}>
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {doc.supplier_reference && <span className="text-gray-500 font-medium">#{doc.supplier_reference} · </span>}
                      {doc.description || <span className="italic">Aucune description</span>}
                    </p>
                  </div>

                  {/* Invoice Type */}
                  <div className="hidden md:block w-20 text-center shrink-0">
                    {(() => {
                      const invType = doc.invoice_type || doc.ocr_data?.invoice_type || doc.ocr_data?.expense_type || 'purchase';
                      const config = INVOICE_TYPE_CONFIG[invType] || INVOICE_TYPE_CONFIG.purchase;
                      return (
                        <span className={cn('inline-flex items-center justify-center px-2 py-1 rounded-full text-[10px] font-semibold', config.color)}>
                          {config.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Amount TTC */}
                  <div className="text-right hidden sm:block w-28 shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(doc.amount || 0)}</p>
                    {doc.vat_amount != null && doc.vat_amount > 0 && (
                      <p className="text-[10px] text-gray-400">HT {formatCurrency((doc.amount || 0) - doc.vat_amount)}</p>
                    )}
                  </div>

                  {/* VAT */}
                  <div className="hidden md:block w-20 text-right shrink-0">
                    {doc.vat_amount != null && doc.vat_amount > 0 ? (
                      <>
                        <p className="text-xs font-semibold text-gray-700">{formatCurrency(doc.vat_amount)}</p>
                        {doc.vat_rate != null && <p className="text-[10px] text-gray-400">{doc.vat_rate}%</p>}
                      </>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>

                  {/* Date */}
                  <div className="hidden lg:block w-24 shrink-0">
                    <p className="text-xs text-gray-600">{fmtDate(doc.document_date)}</p>
                    {doc.due_date && <p className="text-[10px] text-gray-400">Éch. {fmtDate(doc.due_date)}</p>}
                  </div>

                  {/* Status + inline actions */}
                  <div className="w-24 shrink-0 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {doc.needs_review && (
                      <span title="Confiance < 80% (à vérifier)">
                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                      </span>
                    )}
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0', st.color)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                      {st.label}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {doc.status === 'pending' && (
                        <button title="Vérifier" onClick={() => changeStatus(doc.id, 'reviewed')}
                          className="w-6 h-6 rounded-lg hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors">
                          <Eye size={12} />
                        </button>
                      )}
                      {doc.status === 'reviewed' && (
                        <button title="Archiver" onClick={() => changeStatus(doc.id, 'published')}
                          className="w-6 h-6 rounded-lg hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors">
                          <Archive size={12} />
                        </button>
                      )}
                      <button title="Supprimer" onClick={() => handleDelete(doc.id)}
                        className="w-6 h-6 rounded-lg hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">
              {filtered.length} document{filtered.length !== 1 ? 's' : ''}
              {selectedIds.size > 0 && <span className="font-semibold text-primary ml-1">· {selectedIds.size} sélectionné(s)</span>}
            </p>
            <p className="text-xs font-semibold text-gray-700">
              Total : {formatCurrency(filtered.reduce((s, d) => s + (d.amount || 0), 0))}
              <span className="text-gray-400 font-normal ml-1">
                dont TVA {formatCurrency(filtered.reduce((s, d) => s + (d.vat_amount || 0), 0))}
              </span>
            </p>
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
            <Eye size={12} /> Vérifier
          </button>
          <button onClick={() => bulkStatus('published')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors">
            <Archive size={12} /> Archiver
          </button>
          <button onClick={exportFEC}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-900 text-xs font-bold hover:bg-white transition-colors">
            <Database size={12} /> FEC
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-700 text-white text-xs font-bold hover:bg-gray-600 transition-colors">
            <Download size={12} /> CSV
          </button>
          <button onClick={bulkDelete}
            className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-colors">
            <Trash2 size={13} />
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="w-8 h-8 rounded-xl bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white transition-colors">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Detail side panel (overlay drawer) ── */}
      {selectedDoc && (
        <>
          {/* Backdrop (mobile) */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSelectedDoc(null)}
          />
          {/* Panel */}
          <div className="fixed top-0 bottom-0 right-0 w-full sm:w-[480px] bg-white z-50 flex flex-col shadow-2xl border-l border-gray-200 overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn('shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold', STATUS_CONFIG[selectedDoc.status].color)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[selectedDoc.status].dot)} />
                  {STATUS_CONFIG[selectedDoc.status].label}
                </span>
                <p className="text-sm font-bold text-gray-900 truncate">
                  {editForm.vendor || 'Fournisseur inconnu'}
                </p>
              </div>
              <button onClick={() => setSelectedDoc(null)}
                className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors shrink-0">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Document preview */}
              <div className="p-4 border-b border-gray-100">
                {selectedDoc.file_type === 'image' ? (
                  <div className="relative group">
                    <img
                      src={selectedDoc.file_url}
                      alt="Facture"
                      className="w-full rounded-xl border border-gray-200 max-h-64 object-contain bg-gray-50"
                    />
                    <a href={selectedDoc.file_url} target="_blank" rel="noreferrer"
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                      <ZoomIn size={14} />
                    </a>
                  </div>
                ) : (
                  <a href={selectedDoc.file_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={20} className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Ouvrir le PDF</p>
                      <p className="text-xs text-gray-400">Cliquez pour visualiser dans un nouvel onglet</p>
                    </div>
                  </a>
                )}
                {selectedDoc.ocr_data && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                    <Sparkles size={13} className="text-blue-500 shrink-0" />
                    <p className="text-[11px] text-blue-700 font-medium">Données extraites automatiquement par IA</p>
                  </div>
                )}
              </div>

              {/* Status buttons */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Changer le statut</p>
                <div className="flex items-center gap-2">
                  {(['pending', 'reviewed', 'published'] as CaptureStatus[]).map(s => (
                    <button key={s}
                      onClick={() => changeStatus(selectedDoc.id, s)}
                      className={cn(
                        'flex-1 py-2 rounded-xl text-xs font-semibold transition-colors',
                        selectedDoc.status === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                      )}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Edit form */}
              <div className="p-4 space-y-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Informations</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Fournisseur *</label>
                    <input type="text" value={editForm.vendor || ''}
                      onChange={e => setEditForm(f => ({ ...f, vendor: e.target.value }))}
                      placeholder="Nom du fournisseur"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">N° Facture</label>
                    <input type="text" value={editForm.supplier_reference || ''}
                      onChange={e => setEditForm(f => ({ ...f, supplier_reference: e.target.value }))}
                      placeholder="FAC-2024-001"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Description</label>
                  <input type="text" value={editForm.description || ''}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Description de la dépense"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">TTC *</label>
                    <input type="number" step="0.01" min="0" value={editForm.amount ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">TVA (€)</label>
                    <input type="number" step="0.01" min="0" value={editForm.vat_amount ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, vat_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Taux %</label>
                    <select value={editForm.vat_rate?.toString() || ''}
                      onChange={e => setEditForm(f => ({ ...f, vat_rate: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none bg-white">
                      <option value="">-</option>
                      {VAT_RATES.map(v => <option key={v} value={v}>{v}%</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Date facture</label>
                    <input type="date" value={editForm.document_date || ''}
                      onChange={e => setEditForm(f => ({ ...f, document_date: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Échéance</label>
                    <input type="date" value={editForm.due_date || ''}
                      onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>

                {/* Intelligence Comptable */}
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                  <p className="text-[10px] font-bold text-amber-800 uppercase mb-2 flex items-center gap-1">
                    <Sparkles size={11} /> Affectation Comptable
                  </p>
                  <div className="flex gap-2">
                    <input type="text" value={editForm.account_code || ''}
                      onChange={e => setEditForm(f => ({ ...f, account_code: e.target.value }))}
                      placeholder="Code (ex: 6061)"
                      className="w-24 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-amber-300" />
                    <input type="text" value={editForm.account_name || ''}
                      onChange={e => setEditForm(f => ({ ...f, account_name: e.target.value }))}
                      placeholder="Nom du compte de charge"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-amber-300" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Catégorie</label>
                    <select value={editForm.category || ''}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none bg-white">
                      <option value="">Choisir...</option>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Paiement</label>
                    <select value={editForm.payment_method || ''}
                      onChange={e => setEditForm(f => ({ ...f, payment_method: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none bg-white">
                      <option value="">Choisir...</option>
                      {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Notes internes</label>
                  <textarea value={editForm.notes || ''}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Commentaires, contexte..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>

                {/* Invoice Type (Purchases vs Sales) */}
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Type de document</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['purchase', 'sales', 'expense', 'receipt'] as const).map(type => {
                      const config = INVOICE_TYPE_CONFIG[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEditForm(f => ({ ...f, invoice_type: type }))}
                          className={cn(
                            'flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[10px] font-semibold transition-colors',
                            editForm.invoice_type === type
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          )}
                        >
                          <config.icon size={14} />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Line Items Table */}
                {(editForm.line_items && editForm.line_items.length > 0) && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-800 uppercase mb-2 flex items-center gap-1">
                      <FileSpreadsheet size={11} /> Lignes de facture
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="text-left text-gray-500 font-semibold">
                            <th className="pb-2">Description</th>
                            <th className="pb-2 text-right">Qté</th>
                            <th className="pb-2 text-right">Prix HT</th>
                            <th className="pb-2 text-right">TVA %</th>
                            <th className="pb-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editForm.line_items.map((item: any, idx: number) => (
                            <tr key={idx} className="border-t border-gray-200">
                              <td className="py-1.5">{item.description}</td>
                              <td className="py-1.5 text-right">{item.quantity}</td>
                              <td className="py-1.5 text-right">{formatCurrency(item.unit_price)}</td>
                              <td className="py-1.5 text-right">{item.vat_rate}%</td>
                              <td className="py-1.5 text-right font-semibold">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SEPA Payment Hub */}
                {editForm.invoice_type === 'purchase' && (
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                    <p className="text-[10px] font-bold text-blue-800 uppercase mb-2 flex items-center gap-1">
                      <CreditCard size={11} /> Paiement Fournisseur (SEPA)
                    </p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] font-semibold text-blue-700 uppercase block mb-1">IBAN</label>
                        <input type="text" value={editForm.supplier_iban || ''}
                          onChange={e => setEditForm(f => ({ ...f, supplier_iban: e.target.value.toUpperCase() }))}
                          placeholder="FR76..."
                          className="w-full px-2 py-1.5 text-[10px] rounded-lg border border-blue-200 bg-white focus:outline-none focus:border-blue-400 font-mono" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-semibold text-blue-700 uppercase block mb-1">BIC/SWIFT</label>
                          <input type="text" value={editForm.supplier_bic || ''}
                            onChange={e => setEditForm(f => ({ ...f, supplier_bic: e.target.value.toUpperCase() }))}
                            placeholder="XXXXXXXX"
                            className="w-full px-2 py-1.5 text-[10px] rounded-lg border border-blue-200 bg-white focus:outline-none focus:border-blue-400 font-mono" />
                        </div>
                        <div>
                          <label className="text-[9px] font-semibold text-blue-700 uppercase block mb-1">Banque</label>
                          <input type="text" value={editForm.supplier_bank_name || ''}
                            onChange={e => setEditForm(f => ({ ...f, supplier_bank_name: e.target.value }))}
                            placeholder="Nom de la banque"
                            className="w-full px-2 py-1.5 text-[10px] rounded-lg border border-blue-200 bg-white focus:outline-none focus:border-blue-400" />
                        </div>
                      </div>
                      {(editForm.supplier_iban && editForm.supplier_bic) && (
                        <button
                          type="button"
                          onClick={() => generateSEPAXML(selectedDoc!)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Database size={12} />
                          Générer le fichier SEPA pour paiement
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Workspace Selector (PRO only) */}
                {isPro && workspaces.length > 0 && (
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1 flex items-center gap-1">
                      <Building size={11} /> Dossier client
                    </label>
                    <select value={editForm.workspace_id || ''}
                      onChange={e => setEditForm(f => ({ ...f, workspace_id: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none bg-white">
                      <option value="">Aucun dossier</option>
                      {workspaces.map((ws: any) => (
                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Panel footer */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 shrink-0">
              <button onClick={() => handleDelete(selectedDoc.id)}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors shrink-0">
                <Trash2 size={15} />
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
          </div>
        </>
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={() => setShowCreateWorkspace(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Créer un nouveau dossier</p>
                <button
                  onClick={() => setShowCreateWorkspace(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">Nom du dossier *</label>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Ex: Client XYZ, Dossier Personnel..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">Description (optionnel)</label>
                  <textarea
                    value={newWorkspaceDesc}
                    onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                    placeholder="Description de ce dossier..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setShowCreateWorkspace(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateWorkspace}
                  disabled={!newWorkspaceName.trim() || creatingWorkspace}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingWorkspace ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Créer le dossier
                    </>
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
