'use client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Check, CreditCard, Smartphone, Shield, Loader2, Lock, Sparkles, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Initialise Stripe avec ta clé PUBLIQUE
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK!);

// Interface pour les infos du plan
export interface PlanInfo {
  id: string;
  name: string;
  price: string;
  priceNote: string;
  features: string[];
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

  // Get plan icon and gradient based on plan ID
  const getPlanStyle = () => {
    switch(planInfo.id) {
      case 'solo':
        return {
          icon: Zap,
          gradient: 'from-emerald-500 to-emerald-600',
          bgGradient: 'from-emerald-50 to-green-50',
          borderColor: 'border-emerald-200',
          textColor: 'text-emerald-700',
          iconBg: 'bg-emerald-500'
        };
      case 'pro':
        return {
          icon: Crown,
          gradient: 'from-blue-600 to-blue-800',
          bgGradient: 'from-blue-50 to-indigo-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          iconBg: 'bg-blue-600'
        };
      case 'business':
        return {
          icon: Crown,
          gradient: 'from-purple-600 to-violet-700',
          bgGradient: 'from-purple-50 to-violet-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-700',
          iconBg: 'bg-purple-600'
        };
      default:
        return {
          icon: Sparkles,
          gradient: 'from-primary to-primary-dark',
          bgGradient: 'from-primary/10 to-primary/5',
          borderColor: 'border-primary/30',
          textColor: 'text-primary',
          iconBg: 'bg-primary'
        };
    }
  };

  const planStyle = getPlanStyle();
  const PlanIcon = planStyle.icon;

  return (
    <div className="space-y-6">
      {/* RÉCAPITULATIF DE L'ABONNEMENT - Glassmorphism Design */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl",
          "bg-gradient-to-br from-white/80 via-white/60 to-white/40",
          planStyle.borderColor,
          "shadow-xl"
        )}
      >
        {/* Animated gradient background */}
        <div className={cn(
          "absolute inset-0 opacity-10 bg-gradient-to-br",
          planStyle.bgGradient
        )} />

        <div className="relative p-6">
          {/* Plan Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg",
                  "bg-gradient-to-br",
                  planStyle.gradient
                )}
              >
                <PlanIcon size={24} className="text-white" />
              </motion.div>
              <div>
                <h3 className={cn("text-lg font-bold", planStyle.textColor)}>{planInfo.name}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Abonnement mensuel</p>
              </div>
            </div>
            <div className="text-right">
              <div className={cn("text-2xl font-black", planStyle.textColor)}>
                {planInfo.price}€
              </div>
              <div className="text-xs text-gray-600">{planInfo.priceNote}</div>
            </div>
          </div>

          {/* Animated divider */}
          <div className="relative h-px mb-5 overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            />
          </div>

          {/* Features incluses avec micro-interactions */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Inclus dans votre abonnement :
            </p>
            {planInfo.features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/40 transition-colors group"
              >
                <div className={cn(
                  "flex-shrink-0 mt-0.5 rounded-full p-0.5",
                  "bg-gradient-to-br",
                  planStyle.gradient
                )}>
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 transition-colors">
                  {feature}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-200/50">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/50">
              <Shield size={12} className="text-primary" />
              <span className="text-[10px] font-semibold text-gray-600">Sécurisé</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/50">
              <Lock size={12} className="text-primary" />
              <span className="text-[10px] font-semibold text-gray-600">RGPD</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* OPTIONS DE PAIEMENT - Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl",
          "bg-gradient-to-br from-white/80 via-white/60 to-white/40",
          "border-gray-200/50",
          "shadow-xl"
        )}
      >
        {/* Subtle animated background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/20 animate-pulse" />
        </div>

        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl shadow-lg",
                "bg-gradient-to-br",
                planStyle.gradient
              )}
            >
              <CreditCard size={20} className="text-white" />
            </motion.div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Mode de paiement</h3>
              <p className="text-xs text-gray-500">Carte bancaire ou portefeuille numérique</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* STRIPE PAYMENT ELEMENT AVEC WALLETS - Glassmorphism Container */}
            <div className={cn(
              "relative overflow-hidden rounded-xl border-2 backdrop-blur-sm",
              "bg-gradient-to-br from-white/90 to-white/70",
              "border-gray-200/50 shadow-inner",
              "transition-all duration-200 hover:border-primary/30"
            )}>
              {/* Subtle glow effect on focus */}
              <div className="absolute inset-0 opacity-0 transition-opacity duration-200 pointer-events-none bg-gradient-to-r from-primary/5 to-primary/10 focus-within:opacity-100" />

              <PaymentElement
                options={{
                  layout: 'tabs',
                  wallets: {
                    applePay: 'auto',
                    googlePay: 'auto',
                  },
                }}
                className="relative z-10"
              />
            </div>

            {/* Payment method icons */}
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/50">
                <CreditCard size={14} className="text-gray-500" />
                <span className="text-[10px] font-medium text-gray-600">Carte</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/50">
                <Smartphone size={14} className="text-gray-500" />
                <span className="text-[10px] font-medium text-gray-600">Apple/Google Pay</span>
              </div>
            </div>

            {/* BOUTON DE PAIEMENT - Enhanced Design avec couleur du plan */}
            <motion.button
              type="submit"
              disabled={!stripe || isLoading}
              whileHover={{ scale: !stripe || isLoading ? 1 : 1.02 }}
              whileTap={{ scale: !stripe || isLoading ? 1 : 0.98 }}
              className={cn(
                "relative w-full flex items-center justify-center gap-3 overflow-hidden rounded-2xl py-4 text-sm font-bold transition-all duration-200 shadow-lg",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-white/10 before:opacity-0 before:hover:opacity-100 before:transition-opacity",
                planStyle.gradient,
                "text-white shadow-lg hover:shadow-xl",
                isLoading && "opacity-90"
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
                  <Sparkles size={16} className="ml-1" />
                </>
              )}
            </motion.button>

            {/* SÉCURITÉ - Enhanced Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={cn(
                "relative overflow-hidden rounded-xl border-2 backdrop-blur-sm",
                "bg-gradient-to-r from-emerald-50/80 to-green-50/80",
                "border-emerald-200/50",
                "p-4 flex items-center justify-center gap-2"
              )}
            >
              {/* Animated particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(2)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-emerald-400/30 rounded-full"
                    animate={{
                      x: [0, Math.random() * 100 - 50],
                      y: [0, Math.random() * 50 - 25],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.5,
                    }}
                    style={{ left: `${20 + i * 40}%`, top: `${20 + i * 30}%` }}
                  />
                ))}
              </div>

              <Lock size={14} className="text-emerald-600 flex-shrink-0" />
              <span className="text-xs text-emerald-700 font-medium text-center">
                Paiement 100% sécurisé et crypté par Stripe
              </span>
            </motion.div>
          </form>
        </div>
      </motion.div>
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
  // Get plan style for Stripe Elements theme
  const getPlanColor = () => {
    switch(planInfo.id) {
      case 'solo': return '#10B981'; // emerald-500
      case 'pro': return '#2563EB'; // blue-600
      case 'business': return '#9333EA'; // purple-600
      default: return '#111827'; // gray-900
    }
  };

  const primaryColor = getPlanColor();

  const options = {
    clientSecret,
    appearance: {
      theme: 'flat' as const,
      variables: {
        colorPrimary: primaryColor,
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
        borderRadius: '12px',
        borderWidth: '1px',
        focusRing: `${primaryColor}20`,
      },
      rules: {
        '.Tab': {
          color: '#6B7280',
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          boxShadow: 'none',
        },
        '.Tab:hover': {
          backgroundColor: '#F3F4F6',
          borderColor: primaryColor,
          color: primaryColor,
        },
        '.Tab--selected': {
          backgroundColor: '#FFFFFF',
          borderColor: primaryColor,
          color: primaryColor,
          fontWeight: '600',
          boxShadow: `0 0 0 3px ${primaryColor}20`,
        },
        '.Tab--focus': {
          boxShadow: `0 0 0 3px ${primaryColor}20, 0 0 0 5px #FFFFFF`,
        },
        '.Input': {
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
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
          border: `1px solid ${primaryColor}`,
          backgroundColor: '#FFFFFF',
          boxShadow: `0 0 0 3px ${primaryColor}20`,
          outline: 'none',
        },
        '.Input--invalid': {
          border: '1px solid #EF4444',
          backgroundColor: '#FEF2F2',
        },
        '.Label': {
          color: '#374151',
          fontWeight: '600',
          fontSize: '13px',
          marginBottom: '8px',
          letterSpacing: '-0.01em',
        },
        '.Label--focused': {
          color: primaryColor,
        },
        '.Label--invalid': {
          color: '#EF4444',
        },
        '.Error': {
          color: '#EF4444',
          fontSize: '13px',
          marginTop: '8px',
          fontWeight: '500',
        },
        '.CardField': {
          backgroundColor: '#F9FAFB',
        },
        '.Divider': {
          borderColor: '#E5E7EB',
          margin: '16px 0',
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
