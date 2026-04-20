'use client';

import { useState, useEffect } from 'react';
import { X, Mail, FileText, Send, Loader2, CheckCircle2, Edit2, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Invoice, Profile } from '@/types';
import { cn } from '@/lib/utils';

interface EmailPreviewModalProps {
  invoice: Invoice;
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string, subject: string, message: string) => Promise<void>;
  defaultEmail?: string;
  isReminder?: boolean;
}

const DOC_LABELS: Record<string, string> = {
  invoice: 'Facture',
  quote: 'Devis',
  credit_note: 'Avoir',
  purchase_order: 'Bon de commande',
  delivery_note: 'Bon de livraison',
  deposit: 'Facture d\'acompte',
};

export default function EmailPreviewModal({
  invoice,
  profile,
  isOpen,
  onClose,
  onSend,
  defaultEmail = '',
  isReminder = false,
}: EmailPreviewModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [sending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const docLabel = DOC_LABELS[invoice.document_type] || 'Facture';
  const senderName = profile.company_name || 'Factu.me';
  const currency = profile.currency || 'EUR';
  const locale = profile.language === 'en' ? 'en-GB' : 'fr-FR';

  const fmtDate = (s: string) => new Date(s).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail);
      const firstItem = invoice.items?.[0]?.description || 'prestation';
      const defaultSubject = isReminder
        ? `[Rappel] ${docLabel} ${invoice.number} de ${senderName}`
        : `Votre ${docLabel.toLowerCase()} pour ${firstItem} — ${senderName}`;
      setSubject(defaultSubject);

      const defaultMessage = isReminder
        ? `Bonjour ${invoice.client?.name || invoice.client_name_override || 'Client'},\n\nJe me permets de revenir vers vous concernant la ${docLabel.toLowerCase()} ${invoice.number} restée impayée à ce jour.\n\nDe la part de ${senderName}.\n\nCordialement,`
        : `Bonjour ${invoice.client?.name || invoice.client_name_override || 'Client'},\n\nVeuillez trouver ci-joint votre ${docLabel.toLowerCase()} pour ${firstItem}.\n\nDe la part de ${senderName}.\n\nCordialement,`;
      setMessage(defaultMessage);
      setIsEditing(false);
      setSent(false);
    }
  }, [isOpen, defaultEmail, invoice, profile, isReminder, docLabel, senderName]);

  const handleSend = async () => {
    if (!email.trim()) return;
    setIsSending(true);
    try {
      await onSend(email.trim(), subject, message);
      setSent(true);
      setTimeout(() => onClose(), 1500);
    } catch (e: any) {
      console.error('Error sending email:', e);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">
                {isReminder ? 'Rappel par email' : 'Envoyer par email'}
              </h2>
              <p className="text-xs text-gray-400">{docLabel} {invoice.number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sending || sent}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Invoice summary */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                <FileText size={22} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{docLabel} {invoice.number}</p>
                <p className="text-xs text-gray-500">
                  {invoice.client?.name || invoice.client_name_override || 'Client'} · {formatCurrency(invoice.total)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Émise le</p>
                <p className="text-sm font-semibold text-gray-700">{fmtDate(invoice.issue_date)}</p>
              </div>
            </div>
          </div>

          {/* Email fields */}
          <div className="space-y-4">
            {/* Recipient */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                Destinataire
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@entreprise.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                Objet
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet de l'email"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-medium"
              />
            </div>

            {/* Message */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Message
                </label>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-semibold transition-colors"
                >
                  {isEditing ? <Eye size={13} /> : <Edit2 size={13} />}
                  {isEditing ? 'Aperçu' : 'Modifier'}
                </button>
              </div>

              {isEditing ? (
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="Votre message..."
                />
              ) : (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Email preview card */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-primary to-primary-dark px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Aperçu de l'email</p>
              <div className="w-12" />
            </div>

            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="text-center pb-4 border-b border-gray-100">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider bg-primary inline-block px-2 py-1 rounded-md">
                  {docLabel}
                </p>
                <p className="text-xl font-black text-white mt-2">{invoice.number}</p>
                <p className="text-xs text-white/80 mt-1">Émise le {fmtDate(invoice.issue_date)}</p>
              </div>

              {/* Greeting */}
              <div className="text-sm text-gray-700 space-y-2">
                <p>Bonjour <strong>{invoice.client?.name || invoice.client_name_override || 'Client'}</strong>,</p>
                <p className="text-gray-600">
                  {isReminder
                    ? <>Je me permets de revenir vers vous concernant la <strong>{docLabel.toLowerCase()} {invoice.number}</strong> restée impayée à ce jour.</>
                    : <>Veuillez trouver ci-joint votre {docLabel.toLowerCase()} pour <strong>{invoice.items?.[0]?.description || 'prestation'}</strong>.</>
                  }
                </p>
                <p className="text-gray-600">De la part de <strong>{senderName}</strong>.</p>
              </div>

              {/* Items table preview */}
              <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-bold text-gray-600">Prestation</th>
                      <th className="text-center py-2 px-2 font-bold text-gray-600">Qté</th>
                      <th className="text-right py-2 px-2 font-bold text-gray-600">P.U. HT</th>
                      <th className="text-right py-2 px-3 font-bold text-gray-600">Total HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.items.slice(0, 3).map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 text-gray-700">{item.description}</td>
                        <td className="py-2 px-2 text-center text-gray-500">{item.quantity}</td>
                        <td className="py-2 px-2 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-gray-900">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </td>
                      </tr>
                    ))}
                    {invoice.items.length > 3 && (
                      <tr>
                        <td colSpan={4} className="py-2 px-3 text-center text-gray-400 italic">
                          +{invoice.items.length - 3} autre(s) ligne(s)...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total HT</span>
                  <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>TVA</span>
                  <span className="font-semibold">{formatCurrency(invoice.vat_amount)}</span>
                </div>
                {(invoice.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Remise ({invoice.discount_percent}%)</span>
                    <span className="font-semibold">-{formatCurrency(invoice.discount_amount ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-900">Total TTC</span>
                  <span className="text-lg font-black text-primary">{formatCurrency(invoice.total)}</span>
                </div>
              </div>

              {/* Payment link */}
              {invoice.stripe_payment_url && (
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xs font-bold text-emerald-800">Payer en ligne</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Un lien de paiement sera inclus dans l'email</p>
                </div>
              )}

              {/* Bank info */}
              {profile.iban && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs">
                  <p className="font-bold text-gray-700 mb-1">Coordonnées bancaires</p>
                  {profile.bank_name && <p className="text-gray-600">Banque: {profile.bank_name}</p>}
                  <p className="text-gray-600">IBAN: {profile.iban}</p>
                  {profile.bic && <p className="text-gray-600">BIC: {profile.bic}</p>}
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-3 border-t border-gray-100 text-xs text-gray-400">
                <p>Ce document vous est transmis par <strong>{senderName}</strong> via Factu.me</p>
                {profile.siret && <p className="mt-1">SIRET: {profile.siret}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            disabled={sending || sent}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={sending || sent || !email.trim()}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg',
              sent
                ? 'bg-emerald-500 text-white'
                : 'bg-primary text-white hover:bg-primary-dark shadow-primary/20',
              (sending || !email.trim()) && 'cursor-not-allowed opacity-50'
            )}
          >
            {sending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Envoi en cours...
              </>
            ) : sent ? (
              <>
                <CheckCircle2 size={15} />
                Envoyé !
              </>
            ) : (
              <>
                <Send size={15} />
                Envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
