'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, AlertCircle, ChevronRight, Search, ExternalLink, Lock, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface SumUpTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SumUpTutorialModal({ isOpen, onClose }: SumUpTutorialModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const steps = [
    {
      title: '1. Connectez-vous à votre compte SumUp',
      description: 'Allez sur le portail marchand SumUp',
      content: (
        <div className="space-y-4">
          <a
            href="https://me.sumup.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-gradient-to-r from-[#1D9E75]/10 to-[#188A66]/10 border border-[#1D9E75]/20 rounded-xl hover:from-[#1D9E75]/20 hover:border-[#1D9E75]/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1D9E75]/10 rounded-lg">
                <ExternalLink size={20} className="text-[#1D9E75]" />
              </div>
              <div>
                <p className="font-bold text-gray-900">me.sumup.com</p>
                <p className="text-xs text-gray-500">Portail marchand SumUp</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 group-hover:text-[#1D9E75] group-hover:translate-x-1 transition-all" />
          </a>
        </div>
      ),
    },
    {
      title: '2. Allez dans Paramètres développeurs',
      description: 'Accédez à la section API et clés',
      content: (
        <div className="space-y-4">
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] text-white flex items-center justify-center font-bold text-sm">2</div>
              <p className="font-semibold text-gray-900">Cliquez sur votre photo de profil</p>
            </div>
            <div className="ml-11 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1D9E75] to-[#188A66] flex items-center justify-center text-white font-bold">
                  {'U'}
                </div>
                <span className="text-sm text-gray-600">Cliquez ici →</span>
              </div>
              <p className="text-xs text-gray-500">Menu déroulant</p>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] text-white flex items-center justify-center font-bold text-sm">2</div>
              <p className="font-semibold text-gray-900">Sélectionnez "Paramètres"</p>
            </div>
            <div className="ml-11 space-y-2">
              <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-700">⚙️ Paramètres</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-500">📊 Tableau de bord</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-500">💳 Paiements</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '3. Accédez aux clés API',
      description: 'Dans la section développeurs du portail',
      content: (
        <div className="space-y-4">
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] text-white flex items-center justify-center font-bold text-sm">3</div>
              <p className="font-semibold text-gray-900">Cherchez "Développeurs" ou "API"</p>
            </div>
            <div className="ml-11 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Search size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">Utilisez la recherche</p>
                  <p className="text-sm text-amber-700">Tapez "API" ou "Développeurs" dans la barre de recherche</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '4. Créez ou réutilisez une clé API',
      description: 'Génèrez une nouvelle clé ou utilisez une existante',
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-start gap-2">
              <Lock size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-blue-900">Sécurité importante</p>
            </div>
            <p className="text-xs text-blue-700">Les clés API donnent un accès complet à votre compte. Gardez-les secrètes !</p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm font-bold text-gray-900 mb-2">📱 Créer une nouvelle clé</p>
              <ul className="text-xs text-gray-600 space-y-1 ml-4">
                <li>• Cliquez sur "Générer une nouvelle clé"</li>
                <li>• Donnez un nom à votre clé (ex: "Factu.me")</li>
                <li>• Cochez "Paiements" pour les droits nécessaires</li>
              </ul>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-amber-900">Important : Clé PRIVÉE requise</p>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Assurez-vous de générer une <strong>clé privée</strong> (commençant par <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-800 font-mono text-xs">sup_sk_</code>), PAS une clé publique.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '5. Copiez votre clé API et code marchand',
      description: 'Récupérez vos identifiants SumUp',
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Clé API (commence par sup_sk_)</label>
              <div className="relative">
                <code className="block w-full p-3 bg-gray-900 text-green-400 rounded-xl text-xs font-mono break-all">
                  sup_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('sup_sk_example');
                    setCopiedKey('api');
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {copiedKey === 'api' ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-300" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Code marchand</label>
              <p className="text-xs text-gray-500 mb-2">Visible dans Paramètres → Commercant</p>
              <div className="relative">
                <code className="block w-full p-3 bg-gray-900 text-blue-400 rounded-xl text-xs font-mono">
                  MCGKP3GE
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('MCGKP3GE');
                    setCopiedKey('merchant');
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {copiedKey === 'merchant' ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-300" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '6. Entrez vos identifiants',
      description: 'Collez vos informations dans Factu.me',
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 size={20} className="text-primary" />
              <p className="font-bold text-primary">Prêt à connecter !</p>
            </div>
            <p className="text-sm text-primary/80">
              Une fois vos identifiants récupérés, ouvrez les paramètres Factu.me, section "Paiement en ligne (SumUp)" et entrez :
            </p>
            <ul className="text-sm text-primary/80 mt-2 space-y-1 ml-4">
              <li>• Votre clé API privée</li>
              <li>• Votre code marchand</li>
              <li>• L'email de votre compte SumUp</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 p-6 z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-[#1D9E75] to-[#188A66] rounded-2xl shadow-lg shadow-[#1D9E75]/20">
                      <Lock size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">
                        Comment trouver vos identifiants SumUp
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Suivez ce guide étape par étape pour connecter votre compte
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="p-6 space-y-6">
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-3"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#1D9E75] to-[#188A66] text-white flex items-center justify-center font-bold text-sm shadow-lg">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                      </div>
                    </div>
                    {step.content}
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 rounded-b-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ExternalLink size={16} />
                    <a
                      href="https://developer.sumup.com/docs/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1D9E75] hover:underline font-semibold"
                    >
                      Documentation SumUp API
                    </a>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gradient-to-r from-[#1D9E75] to-[#188A66] text-white rounded-xl font-bold hover:from-[#188A66] hover:to-[#166958] transition-all shadow-lg shadow-[#1D9E75]/20"
                  >
                    J'ai compris !
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
