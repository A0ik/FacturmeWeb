'use client';
import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency } from '@/lib/utils';
import { downloadInvoicePdf } from '@/lib/pdf';
import { Invoice, InvoiceStatus } from '@/types';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Edit2, Download, Mail, CreditCard, Copy, CheckCircle,
  Clock, AlertTriangle, FileText, Send, Trash2, MoreVertical,
  Receipt, ShoppingCart, Truck, RefreshCw, Banknote, Check,
  ExternalLink, X, Loader2, Building2, Calendar, Hash, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import EmailPreviewModal from '@/components/ui/EmailPreviewModal';
import PdfPreviewModal from '@/components/ui/PdfPreviewModal';
import PaymentProviderModal from '@/components/ui/PaymentProviderModal';
import { FacturXButton, FacturXInfoTooltip } from '@/components/ui/FacturXButton';
import { isFacturXEligible } from '@/lib/facturx';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: any }> = {
  draft:    { label: 'Brouillon',  color: 'text-gray-500',   bg: 'bg-gray-100',   icon: FileText },
  sent:     { label: 'Envoyée',    color: 'text-blue-600',   bg: 'bg-blue-50',    icon: Send },
  paid:     { label: 'Payée',      color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  overdue:  { label: 'En retard', color: 'text-red-600',    bg: 'bg-red-50',     icon: AlertTriangle },
  accepted: { label: 'Accepté',   color: 'text-teal-600',   bg: 'bg-teal-50',    icon: Check },
  refused:  { label: 'Refusé',    color: 'text-orange-600', bg: 'bg-orange-50',  icon: X },
};

const DOC_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  invoice:        { label: 'Facture',           icon: Receipt,      color: 'text-primary' },
  quote:          { label: 'Devis',             icon: FileText,     color: 'text-blue-600' },
  purchase_order: { label: 'Bon de commande',   icon: ShoppingCart, color: 'text-amber-600' },
  delivery_note:  { label: 'Bon de livraison',  icon: Truck,        color: 'text-cyan-600' },
  credit_note:    { label: 'Avoir',             icon: RefreshCw,    color: 'text-purple-600' },
  deposit:        { label: "Facture d'acompte", icon: Banknote,     color: 'text-emerald-600' },
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuthStore();
  const { invoices, updateInvoiceStatus, deleteInvoice, duplicateInvoice } = useDataStore();
  const { isFree, isPro, isBusiness, isTrialActive, tier } = useSubscription();

  // Vérifier si l'utilisateur a accès à Factur-X (Pro ou Business)
  const canUseFacturX = isPro || isBusiness || isTrialActive;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isReminder, setIsReminder] = useState(false);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [generatingSumUpLink, setGeneratingSumUpLink] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const found = invoices.find((inv) => inv.id === id);
    if (found) setInvoice(found);
  }, [invoices, id]);

  // Handle ?paid=true redirect from Stripe
  useEffect(() => {
    if (searchParams.get('paid') === 'true' && invoice && invoice.status !== 'paid') {
      updateInvoiceStatus(id, 'paid').then(() => {
        toast.success('Paiement reçu ! La facture a été marquée comme payée.', { duration: 5000 });
      });
    }
  }, [searchParams, invoice?.id]);

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-gray-400">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;
  const docCfg = DOC_CONFIG[invoice.document_type] || DOC_CONFIG.invoice;
  const DocIcon = docCfg.icon;
  const clientName = invoice.client?.name || invoice.client_name_override || 'Client inconnu';
  const clientEmail = invoice.client?.email || '';

  const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  // Calculer les warnings Factur-X pour cette facture
  const facturXEligibility = profile ? isFacturXEligible(invoice, profile) : { eligible: false, reason: 'Profil utilisateur manquant', warnings: [] };
  const facturXWarnings = facturXEligibility.warnings || [];

  const handleDownloadPdf = async () => {
    await downloadInvoicePdf(invoice, profile);
  };

  const handleSendEmail = async (email: string, subject: string, message: string) => {
    setSendingEmail(true);
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          email: email.trim(),
          subject,
          message,
          profile,
          isReminder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (invoice.status === 'draft') await updateInvoiceStatus(id, 'sent');
      toast.success(`Facture envoyée à ${email} !`);
      setShowEmailModal(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi.");
      throw e;
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCreatePaymentLink = async () => {
    if (!profile?.stripe_connect_id && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      toast.error('Stripe non connecté. Configurez votre compte dans les paramètres.');
      return;
    }
    setGeneratingPaymentLink(true);
    try {
      const res = await fetch('/api/stripe/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.total,
          description: `${docCfg.label} ${invoice.number}`,
          stripeConnectId: profile?.stripe_connect_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Lien de paiement Stripe créé ! Ouverture dans un nouvel onglet.');
      window.open(data.url, '_blank');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la création du lien.');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handleSumUpLink = async () => {
    setGeneratingSumUpLink(true);
    try {
      const res = await fetch('/api/sumup/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.warning) {
        toast.error(data.warning, { duration: 8000 });
      } else {
        toast.success('Lien SumUp créé !');
        window.open(data.url, '_blank');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la création du lien SumUp.');
    } finally {
      setGeneratingSumUpLink(false);
    }
  };

  // Handler pour la sélection du provider via la modale
  const handleSelectPaymentProvider = async (provider: 'stripe' | 'sumup') => {
    if (provider === 'stripe') {
      await handleCreatePaymentLink();
    } else {
      await handleSumUpLink();
    }
  };

  const handleMarkPaid = async () => {
    setStatusLoading(true);
    try {
      await updateInvoiceStatus(id, 'paid');
      toast.success('Facture marquée comme payée !');
    } catch (e: any) {
      toast.error(e.message || 'Erreur.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleMarkSent = async () => {
    setStatusLoading(true);
    try {
      await updateInvoiceStatus(id, 'sent');
      toast.success('Facture marquée comme envoyée.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const dup = await duplicateInvoice(id, profile);
      toast.success('Facture dupliquée !');
      router.push(`/invoices/${dup.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la duplication.');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteInvoice(id);
      toast.success('Facture supprimée.');
      router.push('/invoices');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la suppression.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const discountAmount = invoice.discount_amount || 0;

  return (
    <div className="max-w-4xl space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/invoices')}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <DocIcon size={16} className={docCfg.color} />
              <h1 className="text-xl font-black text-gray-900">{invoice.number}</h1>
              <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full', status.bg, status.color)}>
                <StatusIcon size={11} />
                {status.label}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{docCfg.label} · {clientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Factur-X - Uniquement pour les factures, pas devis/avoirs */}
          {invoice.document_type === 'invoice' && canUseFacturX && (
            <FacturXButton
              invoiceId={invoice.id}
              invoiceNumber={invoice.number}
              variant="secondary"
              warnings={facturXWarnings}
            />
          )}

          {/* Edit */}
          <button
            onClick={() => router.push(`/invoices/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all shadow-sm"
          >
            <Edit2 size={15} />
            Modifier
          </button>

          {/* More actions */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-40 w-56 overflow-hidden">
                  {invoice.status !== 'paid' && (
                    <button
                      onClick={() => { setShowMenu(false); handleMarkPaid(); }}
                      disabled={statusLoading}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <CheckCircle size={16} />
                      Marquer comme payée
                    </button>
                  )}
                  {invoice.status === 'draft' && (
                    <button
                      onClick={() => { setShowMenu(false); handleMarkSent(); }}
                      disabled={statusLoading}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                      <Send size={16} />
                      Marquer comme envoyée
                    </button>
                  )}
                  <button
                    onClick={() => { setShowMenu(false); handleDuplicate(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Copy size={16} />
                    Dupliquer
                  </button>
                  <div className="h-px bg-gray-100 mx-4" />
                  {/* Factur-X dans le menu - toujours visible pour les factures si abonnement OK */}
                  {invoice.document_type === 'invoice' && canUseFacturX && (
                    <FacturXButton
                      invoiceId={invoice.id}
                      invoiceNumber={invoice.number}
                      variant="compact"
                      warnings={facturXWarnings}
                    />
                  )}
                  <div className="h-px bg-gray-100 mx-4" />
                  <button
                    onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Paid banner */}
      {invoice.status === 'paid' && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Facture payée {invoice.paid_at ? `le ${fmtDate(invoice.paid_at)}` : ''}</p>
            <p className="text-xs text-emerald-600">Le paiement a bien été reçu et enregistré.</p>
          </div>
        </div>
      )}

      {/* Overdue banner */}
      {invoice.status === 'overdue' && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">Facture en retard</p>
              <p className="text-xs text-red-600">Échéance dépassée le {fmtDate(invoice.due_date)}.</p>
            </div>
          </div>
          <button
            onClick={() => { setIsReminder(true); setShowEmailModal(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors flex-shrink-0"
          >
            <Mail size={13} />
            Relancer
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Invoice header card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DocIcon size={15} className={docCfg.color} />
                <span className="text-sm font-bold text-gray-700">{docCfg.label}</span>
              </div>
              <span className="text-sm font-black text-gray-900">{invoice.number}</span>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-5">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Client</p>
                <p className="text-sm font-bold text-gray-900">{clientName}</p>
                {clientEmail && <p className="text-xs text-gray-400 mt-0.5">{clientEmail}</p>}
                {invoice.client?.address && <p className="text-xs text-gray-400 mt-0.5">{invoice.client.address}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Date d'émission</p>
                <p className="text-sm font-bold text-gray-900">{fmtDate(invoice.issue_date)}</p>
              </div>
              {invoice.due_date && (
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Échéance</p>
                  <p className={cn('text-sm font-bold', invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-900')}>
                    {fmtDate(invoice.due_date)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-700">Prestations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-5 py-2.5">Description</th>
                    <th className="text-center text-xs font-bold text-gray-400 uppercase tracking-wide px-3 py-2.5 w-16">Qté</th>
                    <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-wide px-3 py-2.5 w-28">Prix HT</th>
                    <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-wide px-3 py-2.5 w-16">TVA</th>
                    <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-wide px-5 py-2.5 w-28">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoice.items.map((item, i) => (
                    <tr key={item.id || i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-gray-900">{item.description || '—'}</td>
                      <td className="px-3 py-3.5 text-sm text-gray-600 text-center">{item.quantity}</td>
                      <td className="px-3 py-3.5 text-sm text-gray-700 text-right tabular-nums">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-3.5 text-xs text-gray-400 text-right">{item.vat_rate}%</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 text-right tabular-nums">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-100 px-5 py-4">
              <div className="ml-auto max-w-xs space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Sous-total HT</span>
                  <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>TVA</span>
                  <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(invoice.vat_amount)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Remise ({invoice.discount_percent}%)</span>
                    <span className="font-semibold tabular-nums">−{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900">Total TTC</span>
                  <span className="text-2xl font-black text-gray-900 tabular-nums">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Total card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-1">Montant total</p>
            <p className="text-4xl font-black text-gray-900 tabular-nums">{formatCurrency(invoice.total)}</p>
            <div className={cn('inline-flex items-center gap-1.5 mt-3 text-xs font-bold px-3 py-1.5 rounded-full', status.bg, status.color)}>
              <StatusIcon size={12} />
              {status.label}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Actions rapides</h3>

            <button
              onClick={() => setShowPdfPreview(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-semibold transition-colors"
            >
              <Eye size={16} />
              Prévisualiser le PDF
            </button>

            <button
              onClick={() => { setIsReminder(false); setShowEmailModal(true); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold transition-colors"
            >
              <Mail size={16} />
              Envoyer par e-mail
            </button>

            {invoice.document_type === 'invoice' && invoice.status !== 'paid' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-50 to-orange-50 hover:from-emerald-100 hover:to-orange-100 text-gray-700 text-sm font-semibold transition-colors border border-gray-200"
              >
                <CreditCard size={16} />
                Créer un lien de paiement
              </button>
            )}

            <button
              onClick={handleDownloadPdf}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold transition-colors"
            >
              <Download size={16} />
              Télécharger en PDF
            </button>

            {invoice.status !== 'paid' && (
              <button
                onClick={handleMarkPaid}
                disabled={statusLoading}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {statusLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Marquer comme payée
              </button>
            )}

            <button
              onClick={() => router.push(`/invoices/${id}/edit`)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/20 text-primary hover:bg-primary-light text-sm font-semibold transition-colors"
            >
              <Edit2 size={16} />
              Modifier la facture
            </button>
          </div>

          {/* Factur-X Info - Visible pour tous les factures, avec incitation à l'upgrade si nécessaire */}
          {invoice.document_type === 'invoice' && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Factur-X</h3>
                {canUseFacturX && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    Actif
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Format de facture électronique conforme à la <span className="font-semibold text-indigo-600">réforme 2026+</span>.
              </p>

              {canUseFacturX ? (
                <div className="w-full">
                  <FacturXButton
                    invoiceId={invoice.id}
                    invoiceNumber={invoice.number}
                    variant="primary"
                    className="w-full"
                    warnings={facturXWarnings}
                  />
                </div>
              ) : (
                <button
                  onClick={() => router.push('/paywall')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Débloquer Factur-X
                </button>
              )}

              <a
                href="https://fnfe-mpe.org/factur-x/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-indigo-600 hover:underline block text-center"
              >
                Qu'est-ce que Factur-X ? →
              </a>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Informations</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Hash size={14} className="text-gray-300" />
                <span className="text-xs">Numéro :</span>
                <span className="font-semibold text-gray-900 ml-auto">{invoice.number}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar size={14} className="text-gray-300" />
                <span className="text-xs">Créée le :</span>
                <span className="font-semibold text-gray-900 ml-auto">{fmtDate(invoice.created_at)}</span>
              </div>
              {invoice.sent_at && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Send size={14} className="text-gray-300" />
                  <span className="text-xs">Envoyée le :</span>
                  <span className="font-semibold text-gray-900 ml-auto">{fmtDate(invoice.sent_at)}</span>
                </div>
              )}
              {invoice.client?.siret && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Building2 size={14} className="text-gray-300" />
                  <span className="text-xs">SIRET :</span>
                  <span className="font-semibold text-gray-900 ml-auto">{invoice.client.siret}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email modal with preview */}
      {profile && (
        <EmailPreviewModal
          invoice={invoice}
          profile={profile}
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onSend={handleSendEmail}
          defaultEmail={invoice.client?.email || ''}
          isReminder={isReminder}
        />
      )}

      {/* PDF preview modal */}
      {showPdfPreview && (
        <PdfPreviewModal
          invoice={invoice}
          profile={profile}
          onClose={() => setShowPdfPreview(false)}
        />
      )}

      {/* Payment provider selection modal */}
      <PaymentProviderModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSelectProvider={handleSelectPaymentProvider}
        hasStripe={!!(profile?.stripe_connect_id || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)}
        hasSumUp={!!(profile?.sumup_api_key && profile?.sumup_merchant_code)}
        amount={invoice.total}
      />

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h2 className="text-lg font-black text-gray-900">Supprimer la facture ?</h2>
              <p className="text-sm text-gray-500 mt-1">Cette action est irréversible. La facture <strong>{invoice.number}</strong> sera définitivement supprimée.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
