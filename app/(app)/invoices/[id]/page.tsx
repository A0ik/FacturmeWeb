'use client';
import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate, DOC_LABELS } from '@/lib/utils';
import { downloadInvoicePdf } from '@/lib/pdf';
import { InvoiceStatus } from '@/types';
import { getSupabaseClient } from '@/lib/supabase';
import { Download, Send, CheckCircle, Trash2, Copy, Eye, Link2, MoreVertical, Bell, Share2, Paperclip, Upload, File, X as XIcon, Plus, CreditCard } from 'lucide-react';

interface PartialPayment {
  id: string;
  invoice_id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  note: string | null;
  created_at: string;
}

const STATUS_TRANSITIONS: Record<InvoiceStatus, { label: string; next: InvoiceStatus }[]> = {
  draft: [{ label: 'Marquer comme envoyée', next: 'sent' }],
  sent: [{ label: 'Marquer comme payée', next: 'paid' }],
  paid: [],
  overdue: [{ label: 'Marquer comme payée', next: 'paid' }],
  accepted: [{ label: 'Convertir en facture', next: 'sent' }],
  refused: [],
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { invoices, updateInvoiceStatus, deleteInvoice, duplicateInvoice } = useDataStore();
  const { profile } = useAuthStore();
  const [sending, setSending] = useState(false);
  const [payLinkLoading, setPayLinkLoading] = useState(false);
  const [payLink, setPayLink] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; size: number }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const attachRef = useRef<HTMLInputElement>(null);

  // Partial payments state
  const [partialPayments, setPartialPayments] = useState<PartialPayment[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paid_at: new Date().toISOString().slice(0, 10),
    method: '',
    note: '',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);

  // SEPA state
  const [showSepaModal, setShowSepaModal] = useState(false);
  const [sepaIban, setSepaIban] = useState('');
  const [sepaLoading, setSepaLoading] = useState(false);
  const [sepaResult, setSepaResult] = useState<{ success: boolean; ibanLast4?: string; error?: string } | null>(null);

  const invoice = invoices.find((i) => i.id === id);

  useEffect(() => {
    const loadAttachments = async () => {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.user) return;
      const prefix = `invoice-docs/${session.user.id}/${id}/`;
      const { data } = await getSupabaseClient().storage.from('assets').list(`invoice-docs/${session.user.id}/${id}`);
      if (!data) return;
      const files = data.map((f) => ({
        name: f.name,
        size: f.metadata?.size || 0,
        url: getSupabaseClient().storage.from('assets').getPublicUrl(`${prefix}${f.name}`).data.publicUrl,
      }));
      setAttachments(files);
    };
    loadAttachments();

    // Load partial payments
    const loadPartialPayments = async () => {
      const { data } = await getSupabaseClient()
        .from('partial_payments')
        .select('*')
        .eq('invoice_id', id)
        .order('paid_at', { ascending: false });
      if (data) setPartialPayments(data);
    };
    loadPartialPayments();
  }, [id]);

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingFile(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.user) throw new Error('Non authentifié');
      const path = `invoice-docs/${session.user.id}/${id}/${file.name}`;
      await getSupabaseClient().storage.from('assets').upload(path, file, { upsert: true });
      const url = getSupabaseClient().storage.from('assets').getPublicUrl(path).data.publicUrl;
      setAttachments((prev) => [...prev.filter((a) => a.name !== file.name), { name: file.name, size: file.size, url }]);
    } catch (e: any) { alert(e.message); }
    finally { setUploadingFile(false); if (attachRef.current) attachRef.current.value = ''; }
  };

  const handleDeleteAttachment = async (name: string) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    if (!session?.user) return;
    await getSupabaseClient().storage.from('assets').remove([`invoice-docs/${session.user.id}/${id}/${name}`]);
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  };

  const handleAddPartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setPaymentSaving(true);
    try {
      const amount = parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) throw new Error('Montant invalide');
      const { data, error } = await getSupabaseClient()
        .from('partial_payments')
        .insert({
          invoice_id: invoice.id,
          amount,
          paid_at: paymentForm.paid_at,
          method: paymentForm.method || null,
          note: paymentForm.note || null,
        })
        .select()
        .single();
      if (error) throw error;
      const newPayments = [data, ...partialPayments];
      setPartialPayments(newPayments);
      setPaymentForm({ amount: '', paid_at: new Date().toISOString().slice(0, 10), method: '', note: '' });
      setShowPaymentForm(false);
      // Auto-mark as paid if total reached
      const totalPaid = newPayments.reduce((s, p) => s + p.amount, 0);
      if (totalPaid >= invoice.total && invoice.status !== 'paid') {
        await updateInvoiceStatus(invoice.id, 'paid');
      }
    } catch (e: any) { alert(e.message); }
    finally { setPaymentSaving(false); }
  };

  const handleDeletePartialPayment = async (paymentId: string) => {
    await getSupabaseClient().from('partial_payments').delete().eq('id', paymentId);
    setPartialPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  if (!invoice) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Facture introuvable</p>
      <button onClick={() => router.push('/invoices')} className="mt-3 text-primary font-semibold text-sm hover:underline">Retour</button>
    </div>
  );

  const handleStatusChange = async (next: InvoiceStatus) => {
    await updateInvoiceStatus(invoice.id, next);
  };

  const handleDownload = () => downloadInvoicePdf(invoice, profile || undefined);

  const handlePreview = () => {
    import('@/lib/pdf').then(({ generateInvoiceHtml }) => {
      const html = generateInvoiceHtml(invoice, profile || undefined);
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    });
  };

  const handleDuplicate = async () => {
    try {
      const dup = await duplicateInvoice(invoice.id, profile);
      router.push(`/invoices/${dup.id}`);
    } catch (e: any) { alert(e.message); }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendLoading(true); setSendError('');
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, email: sendEmail, profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await handleStatusChange('sent');
      setShowSendModal(false);
    } catch (e: any) { setSendError(e.message); }
    finally { setSendLoading(false); }
  };

  const handlePaymentLink = async () => {
    setPayLinkLoading(true);
    try {
      const res = await fetch('/api/stripe/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.total,
          description: invoice.number,
          stripeConnectId: profile?.stripe_connect_id ?? null,
        }),
      });
      const data = await res.json();
      if (data.url) { setPayLink(data.url); navigator.clipboard.writeText(data.url).catch(() => {}); }
    } catch {}
    finally { setPayLinkLoading(false); }
  };

  const handleDelete = async () => {
    await deleteInvoice(invoice.id);
    router.push('/invoices');
  };

  const handleReminder = async () => {
    const email = invoice.client?.email;
    if (!email) return alert('Ce client n\'a pas d\'adresse email.');
    setReminderLoading(true);
    try {
      const res = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, email, profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 4000);
    } catch (e: any) { alert(e.message); }
    finally { setReminderLoading(false); }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/share/${invoice.id}`;
    setShareUrl(url);
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    });
  };

  const handleSepaCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice.client_id) return alert('Client introuvable');
    setSepaLoading(true); setSepaResult(null);
    try {
      const res = await fetch('/api/stripe/sepa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: invoice.client_id,
          iban: sepaIban.replace(/\s/g, ''),
          clientName: invoice.client?.name || '',
          clientEmail: invoice.client?.email || '',
          invoiceId: invoice.id,
          amount: invoice.total,
          description: `Facture ${invoice.number}`,
          stripeConnectId: profile?.stripe_connect_id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSepaResult({ success: true, ibanLast4: data.ibanLast4 });
      await updateInvoiceStatus(invoice.id, 'paid');
      setTimeout(() => setShowSepaModal(false), 2500);
    } catch (e: any) {
      setSepaResult({ success: false, error: e.message });
    } finally {
      setSepaLoading(false);
    }
  };

  const docLabel = DOC_LABELS[invoice.document_type as keyof typeof DOC_LABELS] || 'Facture';
  const transitions = STATUS_TRANSITIONS[invoice.status] || [];

  return (
    <div className="space-y-4 max-w-2xl">
      <Header
        title={`${docLabel} ${invoice.number}`}
        back="/invoices"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handlePreview} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors" title="Aperçu">
              <Eye size={18} />
            </button>
            <Button variant="secondary" size="sm" icon={<Download size={15} />} onClick={handleDownload}>Télécharger</Button>
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                <MoreVertical size={18} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-44 overflow-hidden">
                  <button onClick={() => { handleDuplicate(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Copy size={14} />Dupliquer
                  </button>
                  <button onClick={() => { setShowSendModal(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Send size={14} />Envoyer par email
                  </button>
                  {invoice.status === 'sent' || invoice.status === 'overdue' ? (
                    <button onClick={() => { handleReminder(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                      <Bell size={14} />Envoyer un rappel
                    </button>
                  ) : null}
                  <button onClick={() => { handleShare(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Share2 size={14} />Partager le lien
                  </button>
                  {invoice.document_type === 'invoice' && (
                    <button onClick={() => { handlePaymentLink(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                      <Link2 size={14} />Lien de paiement
                    </button>
                  )}
                  {invoice.document_type === 'invoice' && invoice.status !== 'paid' && (
                    <button onClick={() => { setShowSepaModal(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                      <CreditCard size={14} />Prélèvement SEPA
                    </button>
                  )}
                  <div className="border-t border-gray-100" />
                  <button onClick={() => { setShowDelete(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                    <Trash2 size={14} />Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* Status + transitions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">Statut</p>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {transitions.map((t) => (
              <Button key={t.next} size="sm" icon={<CheckCircle size={14} />} onClick={() => handleStatusChange(t.next)}>
                {t.label}
              </Button>
            ))}
            {invoice.document_type === 'invoice' && (invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'draft') && !payLink && (
              <Button
                size="sm"
                variant="secondary"
                icon={payLinkLoading ? undefined : <Link2 size={14} />}
                loading={payLinkLoading}
                onClick={handlePaymentLink}
              >
                Payer en ligne
              </Button>
            )}
          </div>
        </div>
        {payLink && (
          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <Link2 size={14} className="text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-700 truncate flex-1">{payLink}</p>
            <button onClick={() => navigator.clipboard.writeText(payLink)} className="text-xs font-bold text-green-600 hover:underline">Copier</button>
          </div>
        )}
        {reminderSent && (
          <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <Bell size={14} className="text-blue-600 flex-shrink-0" />
            <p className="text-xs text-blue-700 font-semibold">Rappel envoyé avec succès.</p>
          </div>
        )}
        {shareCopied && (
          <div className="mt-3 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
            <Share2 size={14} className="text-purple-600 flex-shrink-0" />
            <p className="text-xs text-purple-700 truncate flex-1">{shareUrl}</p>
            <span className="text-xs font-bold text-purple-600">Copié !</span>
          </div>
        )}
      </div>

      {/* Client & dates */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h3 className="font-bold text-gray-900">Informations</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Client</p>
            <p className="font-semibold text-gray-900">{invoice.client?.name || invoice.client_name_override || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Date d'émission</p>
            <p className="font-semibold text-gray-900">{formatDate(invoice.issue_date)}</p>
          </div>
          {invoice.due_date && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Échéance</p>
              <p className="font-semibold text-gray-900">{formatDate(invoice.due_date)}</p>
            </div>
          )}
          {invoice.paid_at && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Payée le</p>
              <p className="font-semibold text-gray-900">{formatDate(invoice.paid_at)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-bold text-gray-900 mb-3">Prestations</h3>
        <div className="space-y-2">
          {(invoice.items || []).map((item, idx) => (
            <div key={item.id || idx} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{item.description}</p>
                <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(item.unit_price)} · TVA {item.vat_rate}%</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(item.total || item.quantity * item.unit_price * (1 + item.vat_rate / 100))}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 mt-3 pt-3 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Sous-total HT</span><span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>TVA</span><span className="font-semibold">{formatCurrency(invoice.vat_amount)}</span>
          </div>
          <div className="flex justify-between text-lg font-black text-gray-900">
            <span>Total TTC</span><span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Partial Payments */}
      {invoice.document_type === 'invoice' && invoice.status !== 'paid' && (() => {
        const totalPaid = partialPayments.reduce((s, p) => s + p.amount, 0);
        const pct = Math.min(100, invoice.total > 0 ? Math.round((totalPaid / invoice.total) * 100) : 0);
        const METHOD_LABELS: Record<string, string> = {
          virement: 'Virement', carte: 'Carte', cheque: 'Chèque', especes: 'Espèces', prelevement: 'Prélèvement bancaire', autre: 'Autre',
        };
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-gray-400" />
                <h3 className="font-bold text-gray-900">Paiements partiels</h3>
                {partialPayments.length > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">{partialPayments.length}</span>
                )}
              </div>
              <button
                onClick={() => setShowPaymentForm((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                <Plus size={13} />
                Ajouter
              </button>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium">Payé: <span className="font-bold text-gray-900">{formatCurrency(totalPaid)}</span></span>
                <span className="text-gray-400">Total: {formatCurrency(invoice.total)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dark transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-right text-[11px] text-gray-400 mt-1">{pct}%</p>
            </div>

            {/* Payment list */}
            {partialPayments.length > 0 && (
              <div className="space-y-2">
                {partialPayments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(p.amount)}</span>
                        {p.method && (
                          <span className="text-[11px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{METHOD_LABELS[p.method] || p.method}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400">{formatDate(p.paid_at)}</span>
                        {p.note && <span className="text-[11px] text-gray-500 truncate">· {p.note}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePartialPayment(p.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <XIcon size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {partialPayments.length === 0 && !showPaymentForm && (
              <p className="text-xs text-gray-400 text-center py-2">Aucun paiement enregistré</p>
            )}

            {/* Add payment form */}
            {showPaymentForm && (
              <form onSubmit={handleAddPartialPayment} className="border border-dashed border-gray-200 rounded-xl p-3 space-y-2.5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nouveau paiement</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">Montant (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                      required
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">Date *</label>
                    <input
                      type="date"
                      value={paymentForm.paid_at}
                      onChange={(e) => setPaymentForm((f) => ({ ...f, paid_at: e.target.value }))}
                      required
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium block mb-1">Mode de paiement</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                  >
                    <option value="">— Choisir —</option>
                    <option value="virement">Virement</option>
                    <option value="carte">Carte</option>
                    <option value="cheque">Chèque</option>
                    <option value="especes">Espèces</option>
                    <option value="prelevement">Prélèvement bancaire</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium block mb-1">Note (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Référence, commentaire..."
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, note: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={paymentSaving}
                    className="flex-1 px-3 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {paymentSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        );
      })()}

      {/* Facture Cloud — attachments */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Paperclip size={15} className="text-gray-400" />
            <h3 className="font-bold text-gray-900">Pièces jointes</h3>
            {attachments.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">{attachments.length}</span>
            )}
          </div>
          <button
            onClick={() => attachRef.current?.click()}
            disabled={uploadingFile}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
          >
            {uploadingFile ? (
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            Ajouter
          </button>
          <input ref={attachRef} type="file" className="hidden" onChange={handleAttachFile} />
        </div>

        {attachments.length === 0 ? (
          <button
            onClick={() => attachRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-primary/40 hover:bg-primary/3 transition-all group"
          >
            <Upload size={18} className="text-gray-300 group-hover:text-primary/50 mx-auto mb-1.5 transition-colors" />
            <p className="text-xs text-gray-400 group-hover:text-gray-500">Déposez des fichiers ici</p>
            <p className="text-[11px] text-gray-300 mt-0.5">PDF, images, documents...</p>
          </button>
        ) : (
          <div className="space-y-1.5">
            {attachments.map((file) => (
              <div key={file.name} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 group">
                <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <File size={13} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{file.name}</p>
                  {file.size > 0 && <p className="text-[11px] text-gray-400">{(file.size / 1024).toFixed(0)} Ko</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-gray-700 transition-colors">
                    <Download size={12} />
                  </a>
                  <button onClick={() => handleDeleteAttachment(file.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <XIcon size={12} />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => attachRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors"
            >
              <Upload size={12} />
              Ajouter un fichier
            </button>
          </div>
        )}
      </div>

      {/* Delete modal */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Supprimer ce document">
        <p className="text-gray-600 mb-4">Cette action est irréversible. La facture {invoice.number} sera définitivement supprimée.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>Annuler</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>Supprimer</Button>
        </div>
      </Modal>

      {/* Send email modal */}
      <Modal open={showSendModal} onClose={() => setShowSendModal(false)} title="Envoyer par email">
        <form onSubmit={handleSendEmail} className="space-y-4">
          <p className="text-sm text-gray-500">La facture sera envoyée en PDF par email.</p>
          <input
            type="email"
            placeholder="Email du client"
            value={sendEmail}
            onChange={(e) => setSendEmail(e.target.value)}
            defaultValue={invoice.client?.email || ''}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {sendError && <p className="text-sm text-red-500">{sendError}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowSendModal(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={sendLoading} icon={<Send size={14} />}>Envoyer</Button>
          </div>
        </form>
      </Modal>

      {/* SEPA modal */}
      <Modal open={showSepaModal} onClose={() => { setShowSepaModal(false); setSepaResult(null); setSepaIban(''); }} title="Prélèvement SEPA">
        {sepaResult?.success ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CreditCard size={24} className="text-green-600" />
            </div>
            <p className="text-lg font-black text-gray-900 mb-1">Prélèvement initié</p>
            <p className="text-sm text-gray-500">IBAN se terminant par <strong>{sepaResult.ibanLast4}</strong>.<br />La facture a été marquée comme payée.</p>
          </div>
        ) : (
          <form onSubmit={handleSepaCharge} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700 font-medium">
                En soumettant ce formulaire, vous autorisez un prélèvement SEPA de <strong>{formatCurrency(invoice.total)}</strong> sur le compte renseigné.
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">IBAN du client</label>
              <input
                type="text"
                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                value={sepaIban}
                onChange={(e) => setSepaIban(e.target.value.toUpperCase())}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary tracking-wider"
              />
            </div>
            {sepaResult?.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-600">{sepaResult.error}</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowSepaModal(false); setSepaResult(null); setSepaIban(''); }}>Annuler</Button>
              <Button type="submit" className="flex-1" loading={sepaLoading} icon={<CreditCard size={14} />}>Prélever {formatCurrency(invoice.total)}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
