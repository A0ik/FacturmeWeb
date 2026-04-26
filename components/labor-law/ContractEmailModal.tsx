'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Mail, FileText, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ContractEmailModalProps {
  contractType: string;
  employeeName: string;
  defaultEmail?: string;
  contractHtml: string;
  contractData?: any;
  onClose: () => void;
}

const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  stage: 'Convention de stage',
  apprentissage: "Contrat d'apprentissage",
  professionnalisation: 'Contrat de professionnalisation',
  interim: 'Contrat de travail temporaire',
  portage: 'Contrat de portage salarial',
  freelance: 'Contrat de prestation de services',
};

export function ContractEmailModal({
  contractType,
  employeeName,
  defaultEmail = '',
  contractHtml,
  contractData,
  onClose,
}: ContractEmailModalProps) {
  const label = CONTRACT_LABELS[contractType.toLowerCase()] || contractType;

  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState(`Votre ${label} — ${employeeName}`);
  const [message, setMessage] = useState(
    `Bonjour,\n\nVeuillez trouver ci-joint votre ${label}.\n\nMerci de le lire attentivement et de nous le retourner signé dans les meilleurs délais.\n\nCordialement`
  );
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Veuillez saisir une adresse email.');
      return;
    }
    if (!email.includes('@')) {
      setError('Adresse email invalide.');
      return;
    }

    setLoading(true);
    setError('');

    const fullHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
        <div style="background:#1D9E75;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">
            <span style="margin-right:8px;">📄</span>${label}
          </h2>
          <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">${employeeName}</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
          <p style="white-space:pre-line;font-size:14px;line-height:1.6;margin:0 0 20px;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
          <p style="font-size:12px;color:#888;margin:0;">Ce document a été généré automatiquement par Factu.me</p>
        </div>
      </div>
    `;

    try {
      const response = await fetch('/api/send-contract-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.trim(),
          contractType, // send raw ID like 'cdi', 'cdd', 'stage'
          employeeName,
          subject: subject.trim(),
          html: fullHtml,
          contractData,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errData.error || 'Erreur lors de l\'envoi');
      }

      setSent(true);
      toast.success('Contrat envoyé par email');
      setTimeout(onClose, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-white/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-primary/5 to-blue-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Envoyer le contrat</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label} — {employeeName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {sent ? (
              <div className="flex flex-col items-center py-8 gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">Email envoyé avec succès !</p>
                <p className="text-sm text-gray-500">Le contrat a été envoyé à {email}</p>
              </div>
            ) : (
              <>
                {/* Contract summary */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{employeeName}</p>
                  </div>
                </div>

                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Destinataire</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>

                {/* Subject field */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Objet</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>

                {/* Message field */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </>
            )}
          </div>

          {!sent && (
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={loading}
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
                ) : (
                  <><Send className="w-4 h-4" /> Envoyer</>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
