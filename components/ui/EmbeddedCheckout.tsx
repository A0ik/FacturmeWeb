'use client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Check, CreditCard, Smartphone, Shield, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Initialise Stripe avec ta clé PUBLIQUE
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK!);

// Interface pour les infos du plan
export interface PlanInfo {
  id: string;
  name: string;
  price: string;
  priceNote: string;
  features: string[]; // Top 3-4 features principales
}

// Composant interne pour gérer le submit
function CheckoutForm({ userId, planInfo }: { userId: string; planInfo: PlanInfo }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?success=true`,
      },
    });

    if (error) {
      console.error(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* RÉCAPITULATIF DE L'ABONNEMENT */}
      <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-5 border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">{planInfo.name}</h3>
            <p className="text-xs text-gray-600 mt-0.5">Abonnement mensuel</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-gray-900">{planInfo.price}€</div>
            <div className="text-xs text-gray-600">{planInfo.priceNote}</div>
          </div>
        </div>

        {/* Features incluses */}
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <p className="text-xs font-bold text-gray-700 mb-3">Inclus dans votre abonnement :</p>
          {planInfo.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check size={14} className="mt-0.5 flex-shrink-0 text-gray-700" strokeWidth={2.5} />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* OPTIONS DE PAIEMENT */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <CreditCard size={16} />
            <span>Mode de paiement</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* STRIPE PAYMENT ELEMENT AVEC WALLETS */}
          <div className="rounded-xl border border-gray-300 bg-white p-4">
            <PaymentElement
              options={{
                layout: 'tabs',
                wallets: {
                  applePay: 'auto',
                  googlePay: 'auto',
                },
              }}
            />
          </div>

          {/* BOUTON DE PAIEMENT */}
          <button
            type="submit"
            disabled={!stripe || isLoading}
            className={cn(
              'w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800',
              isLoading && 'bg-gray-800'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Traitement en cours...</span>
              </>
            ) : (
              <>
                <Shield size={18} />
                <span>Confirmer et s'abonner</span>
              </>
            )}
          </button>

          {/* SÉCURITÉ */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            <Lock size={12} />
            <span>Paiement 100% sécurisé et crypté par Stripe</span>
          </div>
        </form>
      </div>
    </div>
  );
}

// Le composant principal
export default function EmbeddedCheckout({
  clientSecret,
  userId,
  planInfo,
}: {
  clientSecret: string;
  userId: string;
  planInfo: PlanInfo;
}) {
  const options = {
    clientSecret,
    appearance: {
      theme: 'flat' as const,
      variables: {
        colorPrimary: '#111827',
        colorBackground: '#FFFFFF',
        colorText: '#111827',
        colorDanger: '#EF4444',
        colorWarning: '#F59E0B',
        colorSuccess: '#10B981',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSizeBase: '15px',
        fontSizeSm: '13px',
        fontSizeXs: '11px',
        fontSizeLg: '17px',
        fontWeightNormal: '400',
        fontWeightMedium: '500',
        fontWeightBold: '600',
        spacingUnit: '4px',
        borderRadius: '8px',
        borderWidth: '1px',
        focusRing: 'rgba(17, 24, 39, 0.1)',
      },
      rules: {
        // Tab styles
        '.Tab': {
          color: '#6B7280',
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          boxShadow: 'none',
        },
        '.Tab:hover': {
          backgroundColor: '#F3F4F6',
          borderColor: '#D1D5DB',
          color: '#111827',
        },
        '.Tab--selected': {
          backgroundColor: '#FFFFFF',
          borderColor: '#111827',
          color: '#111827',
          fontWeight: '600',
          boxShadow: '0 0 0 1px #111827',
        },
        '.Tab--focus': {
          boxShadow: '0 0 0 2px rgba(17, 24, 39, 0.1), 0 0 0 4px #FFFFFF',
        },

        // Input styles
        '.Input': {
          backgroundColor: '#FFFFFF',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '15px',
          color: '#111827',
          boxShadow: 'none',
          transition: 'all 0.2s ease',
        },
        '.Input::placeholder': {
          color: '#9CA3AF',
        },
        '.Input:focus': {
          border: '1px solid #111827',
          boxShadow: '0 0 0 3px rgba(17, 24, 39, 0.1)',
          outline: 'none',
        },
        '.Input--invalid': {
          border: '1px solid #EF4444',
          color: '#111827',
        },
        '.Input--invalid:focus': {
          boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
        },

        // Label styles
        '.Label': {
          color: '#374151',
          fontWeight: '600',
          fontSize: '13px',
          marginBottom: '8px',
          letterSpacing: '-0.01em',
        },
        '.Label--focused': {
          color: '#111827',
        },
        '.Label--invalid': {
          color: '#EF4444',
        },

        // Error message styles
        '.Error': {
          color: '#EF4444',
          fontSize: '13px',
          marginTop: '8px',
          fontWeight: '500',
        },

        // Button styles (if using default Stripe buttons)
        '.PayButton': {
          backgroundColor: '#111827',
          color: '#FFFFFF',
          fontWeight: '600',
          fontSize: '15px',
          padding: '14px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease',
        },
        '.PayButton:hover': {
          backgroundColor: '#000000',
          boxShadow: '0 6px 8px -1px rgba(0, 0, 0, 0.15)',
        },
        '.PayButton:active': {
          transform: 'scale(0.98)',
        },

        // Card element specific
        '.CardField': {
          backgroundColor: '#FFFFFF',
        },

        // Divider
        '.Divider': {
          borderColor: '#E5E7EB',
          margin: '16px 0',
        },

        // Text colors
        '.Text': {
          color: '#374151',
          fontSize: '14px',
        },
        '.Text--muted': {
          color: '#9CA3AF',
        },

        // Link styles
        '.Link': {
          color: '#111827',
          fontWeight: '500',
          textDecoration: 'none',
        },
        '.Link:hover': {
          textDecoration: 'underline',
        },
      },
    },
  };

  return (
    <Elements options={options} stripe={stripePromise}>
      <CheckoutForm userId={userId} planInfo={planInfo} />
    </Elements>
  );
}
