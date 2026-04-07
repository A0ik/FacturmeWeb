'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { Check, Crown, Zap, X, Sparkles, Shield, ArrowLeft, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'solo',
    name: 'Solo',
    monthly: 9,
    yearly: 7,
    badge: null,
    icon: Zap,
    iconColor: 'text-blue-400',
    description: 'Idéal pour les indépendants',
    features: [
      'Factures & devis illimités',
      'Dictée vocale IA',
      'Envoi par email',
      'Factures récurrentes',
      'Relances automatiques',
      'Export CSV & FEC',
    ],
    notIncluded: ['Templates premium', 'Paiement Stripe intégré'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 19,
    yearly: 15,
    badge: 'Recommandé',
    icon: Crown,
    iconColor: 'text-amber-400',
    description: 'Pour les professionnels exigeants',
    features: [
      'Tout Solo inclus',
      'Templates PDF premium',
      'Paiement Stripe intégré',
      'Pipeline CRM avancé',
      'Import clients CSV / IA',
      'Support prioritaire',
    ],
    notIncluded: [],
  },
];

export default function PaywallPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const [yearly, setYearly] = useState(false);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, userId: profile?.id, yearly }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la création de l\'abonnement');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-full">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        Retour
      </button>

      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-4 py-1.5 rounded-full mb-4">
          <Sparkles size={12} />
          Débloquez tout le potentiel de Factu.me
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">
          Choisissez votre plan
        </h1>
        <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
          Passez à la vitesse supérieure. Facturation illimitée, IA intégrée et outils professionnels pour booster votre activité.
        </p>
      </div>

      {/* Current plan alert */}
      {!sub.isFree && (
        <div className="max-w-lg mx-auto mb-8 bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
          <Crown size={18} className="text-primary flex-shrink-0" />
          <div>
            <p className="font-bold text-primary text-sm">Abonnement actif — <span className="capitalize">{sub.tier}</span></p>
            <p className="text-xs text-primary/70 mt-0.5">Merci de votre confiance !</p>
          </div>
        </div>
      )}

      {/* Free limit alert */}
      {sub.isFree && (
        <div className="max-w-lg mx-auto mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Zap size={15} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm">Plan gratuit — {sub.invoiceCount}/3 factures</p>
            <div className="mt-1.5 h-1.5 bg-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${(sub.invoiceCount / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={cn('text-sm font-semibold', !yearly ? 'text-gray-900' : 'text-gray-400')}>
          Mensuel
        </span>
        <button
          onClick={() => setYearly(!yearly)}
          className={cn(
            'relative w-12 h-6 rounded-full transition-all duration-200',
            yearly ? 'bg-primary' : 'bg-gray-200'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200',
            yearly ? 'left-6' : 'left-0.5'
          )} />
        </button>
        <span className={cn('text-sm font-semibold flex items-center gap-1.5', yearly ? 'text-gray-900' : 'text-gray-400')}>
          Annuel
          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">-20%</span>
        </span>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
        {PLANS.map((plan) => {
          const PlanIcon = plan.icon;
          const price = yearly ? plan.yearly : plan.monthly;
          const isActive = sub.tier === plan.id;
          const isPro = plan.id === 'pro';

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-2xl overflow-hidden transition-all duration-200',
                isPro
                  ? 'bg-gray-950 text-white shadow-2xl shadow-gray-900/30 scale-[1.02]'
                  : 'bg-white border border-gray-200 shadow-lg shadow-gray-100/50'
              )}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute top-0 left-0 right-0 text-center py-1.5 bg-primary text-white text-[11px] font-bold tracking-widest uppercase">
                  ⭐ {plan.badge}
                </div>
              )}

              <div className={cn('p-6', plan.badge && 'pt-10')}>
                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    isPro ? 'bg-white/10' : 'bg-gray-100'
                  )}>
                    <PlanIcon size={20} className={plan.iconColor} />
                  </div>
                  <div>
                    <h3 className={cn('text-lg font-black', isPro ? 'text-white' : 'text-gray-900')}>
                      {plan.name}
                    </h3>
                    <p className={cn('text-xs', isPro ? 'text-gray-400' : 'text-gray-500')}>
                      {plan.description}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-end gap-1.5 mb-1">
                  <span className={cn('text-5xl font-black tracking-tight', isPro ? 'text-white' : 'text-gray-900')}>
                    {price}€
                  </span>
                  <span className={cn('pb-1.5 text-sm', isPro ? 'text-gray-400' : 'text-gray-400')}>
                    /mois
                  </span>
                </div>
                {yearly && (
                  <p className={cn('text-xs mb-5', isPro ? 'text-gray-500' : 'text-gray-400')}>
                    Facturé {price * 12}€/an · Économisez {(plan.monthly - plan.yearly) * 12}€
                  </p>
                )}

                {/* CTA */}
                <button
                  onClick={() => !isActive && handleSubscribe(plan.id)}
                  disabled={isActive || loading === plan.id}
                  className={cn(
                    'w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 mb-6 mt-3',
                    isActive
                      ? isPro
                        ? 'bg-white/10 text-white/50 cursor-default'
                        : 'bg-gray-100 text-gray-400 cursor-default'
                      : isPro
                        ? 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/30'
                        : 'bg-gray-900 hover:bg-gray-800 text-white',
                    loading === plan.id && 'opacity-60'
                  )}
                >
                  {loading === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Chargement...
                    </span>
                  ) : isActive ? 'Plan actuel ✓' : `Commencer avec ${plan.name}`}
                </button>

                {/* Divider */}
                <div className={cn('h-px mb-5', isPro ? 'bg-white/10' : 'bg-gray-100')} />

                {/* Features */}
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <div className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                        isPro ? 'bg-primary/20' : 'bg-primary/10'
                      )}>
                        <Check size={10} className="text-primary" />
                      </div>
                      <span className={isPro ? 'text-gray-300' : 'text-gray-700'}>{f}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <X size={10} className="text-gray-400" />
                      </div>
                      <span className="text-gray-400 line-through">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust signals */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <Shield size={13} className="text-gray-300" />
          Paiement sécurisé Stripe
        </div>
        <div className="flex items-center gap-1.5">
          <Check size={13} className="text-gray-300" />
          Résiliation à tout moment
        </div>
        <div className="flex items-center gap-1.5">
          <Star size={13} className="text-gray-300" />
          Sans engagement
        </div>
      </div>
    </div>
  );
}
