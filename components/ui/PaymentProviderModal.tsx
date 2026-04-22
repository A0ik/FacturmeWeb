'use client';

import { CreditCard, Stripe, Wallet } from 'lucide-react';
import { useState } from 'react';

interface PaymentProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider: (provider: 'stripe' | 'sumup') => void;
  hasStripe: boolean;
  hasSumUp: boolean;
  amount: number;
}

/**
 * PaymentProviderModal - Modal de sélection du moyen de paiement
 *
 * Permet de choisir entre Stripe et SumUp pour générer un lien de paiement
 */
export function PaymentProviderModal({
  isOpen,
  onClose,
  onSelectProvider,
  hasStripe,
  hasSumUp,
  amount,
}: PaymentProviderModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'sumup' | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelect = async (provider: 'stripe' | 'sumup') => {
    setSelectedProvider(provider);
    setLoading(true);
    try {
      await onSelectProvider(provider);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const fmtAmount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <CreditCard size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Lien de paiement</h2>
              <p className="text-xs text-gray-500">Choisissez votre moyen de paiement</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Amount display */}
          <div className="text-center py-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Montant à payer</p>
            <p className="text-3xl font-black text-gray-900">{fmtAmount}</p>
          </div>

          {/* Provider options */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Sélectionnez un prestataire</p>

            {/* Stripe option */}
            <button
              onClick={() => handleSelect('stripe')}
              disabled={!hasStripe || loading}
              className={`w-full relative p-4 rounded-xl border-2 transition-all ${
                !hasStripe
                  ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
                  : 'border-indigo-200 bg-indigo-50/50 hover:border-indigo-400 hover:bg-indigo-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  hasStripe ? 'bg-indigo-100' : 'bg-gray-200'
                }`}>
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 4.515.858l.66-4.067S15.652 1.5 12.521 1.5C9.088 1.5 6.525 3.392 6.525 6.327c0 2.635 2.057 3.986 4.639 5.043 2.105.86 2.81 1.525 2.81 2.463 0 .956-.784 1.532-2.164 1.532-2.278 0-5.08-1.208-5.08-1.208l-.683 4.218s2.028.878 5.312.878c3.625 0 6.455-1.707 6.455-4.857-.022-2.803-2.39-4.127-5.16-5.194l.002-.003z" fill="#635BFF"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-900">Stripe</div>
                  <div className="text-xs text-gray-500">Paiement sécurisé par carte</div>
                </div>
                {loading && selectedProvider === 'stripe' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
                )}
                {!hasStripe && (
                  <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-medium">
                    Non configuré
                  </span>
                )}
              </div>
            </button>

            {/* SumUp option */}
            <button
              onClick={() => handleSelect('sumup')}
              disabled={!hasSumUp || loading}
              className={`w-full relative p-4 rounded-xl border-2 transition-all ${
                !hasSumUp
                  ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
                  : 'border-orange-200 bg-orange-50/50 hover:border-orange-400 hover:bg-orange-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  hasSumUp ? 'bg-orange-100' : 'bg-gray-200'
                }`}>
                  <Wallet size={28} className={hasSumUp ? 'text-orange-600' : 'text-gray-400'} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-900">SumUp</div>
                  <div className="text-xs text-gray-500">Paiement mobile simplifié</div>
                </div>
                {loading && selectedProvider === 'sumup' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-600 border-t-transparent" />
                )}
                {!hasSumUp && (
                  <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-medium">
                    Non configuré
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Info message */}
          {(!hasStripe || !hasSumUp) && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Note :</strong> Configurez vos moyens de paiement dans les{' '}
                <span className="font-semibold">paramètres</span> pour activer toutes les options.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentProviderModal;
