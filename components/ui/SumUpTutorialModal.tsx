'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, AlertCircle, ChevronRight, Search, ExternalLink, Lock, CheckCircle2, Key, Globe, User as UserIcon, Settings, Code } from 'lucide-react';
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
      description: 'Accédez au portail marchand SumUp',
      icon: Globe,
      content: (
        <div className="space-y-4">
          <a
            href="https://me.sumup.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-[#1D9E75] hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center">
                <Globe size={18} className="text-[#1D9E75]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">me.sumup.com</p>
                <p className="text-xs text-gray-500">Portail marchand SumUp</p>
              </div>
            </div>
            <ExternalLink size={16} className="text-gray-400 group-hover:text-[#1D9E75] transition-colors" />
          </a>
        </div>
      ),
    },
    {
      title: '2. Allez dans Paramètres',
      description: 'Accédez à la section API',
      icon: Settings,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold">1</div>
              <div className="flex items-center gap-2">
                <UserIcon size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">Cliquez sur votre photo de profil</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-[#1D9E75] shadow-sm">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold">2</div>
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-[#1D9E75]" />
                <span className="text-sm font-semibold text-gray-900">Sélectionnez "Paramètres"</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold">3</div>
              <div className="flex items-center gap-2">
                <Code size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">Cherchez "API" ou "Développeurs"</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '3. Générez une clé API privée',
      description: 'Créez une nouvelle clé API privée',
      icon: Key,
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Lock size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Clé privée requise</p>
                <p className="text-xs text-blue-700 mt-1">Vous devez générer une <strong>clé privée</strong> (commençant par <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-800 font-mono text-xs">sup_sk_</code>), PAS une clé publique.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-700">
            <p className="font-semibold">Étapes de création :</p>
            <ol className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">1</span>
                <span>Cliquez sur "Générer une nouvelle clé"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">2</span>
                <span>Donnez un nom (ex: "Factu.me")</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">3</span>
                <span>Cochez "Paiements" pour les droits</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">4</span>
                <span>Générez et copiez la clé</span>
              </li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      title: '4. Trouvez votre code marchand',
      description: 'Récupérez votre code marchand SumUp',
      icon: Code,
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Search size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Où trouver le code marchand ?</p>
                <p className="text-xs text-amber-700 mt-1">Le code marchand est visible dans les paramètres de votre compte, généralement dans la section "Compte" ou "Profil".</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Exemple de code marchand :</p>
            <code className="block w-full p-3 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-800">
              MCGKP3GE
            </code>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Exemple de clé API privée :</p>
            <code className="block w-full p-3 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-800 break-all">
              sup_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
            </code>
          </div>
        </div>
      ),
    },
    {
      title: '5. Entrez vos identifiants',
      description: 'Collez vos informations dans Factu.me',
      icon: CheckCircle2,
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-[#1D9E75]/10 to-green-500/10 border border-[#1D9E75]/20 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 size={20} className="text-[#1D9E75]" />
              <p className="font-bold text-gray-900">Prêt à connecter !</p>
            </div>
            <p className="text-sm text-gray-700">
              Une fois vos identifiants récupérés, ouvrez les paramètres Factu.me, section "Paiement en ligne (SumUp)" et entrez :
            </p>
            <ul className="text-sm text-gray-700 mt-3 space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-[#1D9E75] mt-0.5">•</span>
                <span>Votre <strong>clé API privée</strong> (commence par sup_sk_)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1D9E75] mt-0.5">•</span>
                <span>Votre <strong>code marchand</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1D9E75] mt-0.5">•</span>
                <span>L'<strong>email</strong> de votre compte SumUp</span>
              </li>
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 p-5 z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1D9E75] to-[#188A66] flex items-center justify-center shadow-lg">
                      <Key size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Connecter SumUp
                      </h2>
                      <p className="text-xs text-gray-500">Guide étape par étape</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="p-5 space-y-4">
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-[#1D9E75] to-[#188A66] text-white flex items-center justify-center text-xs font-bold shadow">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-900">{step.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                      </div>
                    </div>
                    {step.content}
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 rounded-b-2xl">
                <div className="flex items-center justify-between">
                  <a
                    href="https://developer.sumup.com/docs/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#1D9E75] hover:underline font-semibold flex items-center gap-1"
                  >
                    <ExternalLink size={12} />
                    Documentation SumUp
                  </a>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gradient-to-r from-[#1D9E75] to-[#188A66] text-white rounded-xl text-sm font-semibold hover:from-[#188A66] hover:to-[#166958] transition-all shadow-md"
                  >
                    J'ai compris
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
