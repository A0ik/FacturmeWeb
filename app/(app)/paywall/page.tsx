'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { Check, Crown, Zap, X } from 'lucide-react';

const PLANS = [
  {
    id: 'solo',
    name: 'Solo',
    price: '9',
    period: 'mois',
    color: 'bg-blue-500',
    features: [
      'Factures illimitées',
      'Devis & avoirs',
      'Dictée vocale IA',
      'Envoi par email',
      'Factures récurrentes',
      'Relances automatiques',
      'Export comptable',
    ],
    notIncluded: ['Templates premium', 'Stripe Connect'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '19',
    period: 'mois',
    color: 'bg-primary',
    popular: true,
    features: [
      'Tout Solo inclus',
      'Templates premium',
      'Paiement Stripe intégré',
      'Import clients (CSV / IA)',
      'Pipeline CRM avancé',
      'Statistiques avancées',
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

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, userId: profile?.id }),
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
    <div className="space-y-6 max-w-2xl">
      <Header title="Abonnements" back="/settings" />

      {/* Current plan */}
      {!sub.isFree && (
        <div className="bg-primary-light border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
          <Crown size={20} className="text-primary flex-shrink-0" />
          <div>
            <p className="font-bold text-primary">Abonnement actif : <span className="capitalize">{sub.tier}</span></p>
            <p className="text-sm text-primary-dark/70">Merci pour votre confiance !</p>
          </div>
        </div>
      )}

      {/* Free limits */}
      {sub.isFree && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-3">
          <Zap size={20} className="text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-yellow-800">Plan gratuit : {sub.invoiceCount}/3 factures utilisées</p>
            <p className="text-sm text-yellow-700">Passez à Solo ou Pro pour des factures illimitées.</p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`bg-white rounded-2xl border-2 overflow-hidden ${plan.popular ? 'border-primary shadow-lg shadow-primary/10' : 'border-gray-200'}`}>
            {plan.popular && (
              <div className="bg-primary text-white text-xs font-bold text-center py-1.5 tracking-wider uppercase">
                Recommandé
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg ${plan.color} flex items-center justify-center`}>
                  <Crown size={16} className="text-white" />
                </div>
                <h3 className="text-lg font-black text-gray-900">{plan.name}</h3>
              </div>

              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-black text-gray-900">{plan.price}€</span>
                <span className="text-gray-400 pb-1">/{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={14} className="text-primary flex-shrink-0" />{f}
                  </li>
                ))}
                {plan.notIncluded.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                    <X size={14} className="flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? 'primary' : 'outline'}
                loading={loading === plan.id}
                disabled={sub.tier === plan.id}
                onClick={() => handleSubscribe(plan.id)}
              >
                {sub.tier === plan.id ? 'Plan actuel' : `Choisir ${plan.name}`}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400">
        Paiement sécurisé par Stripe · Résiliation à tout moment · Sans engagement
      </p>
    </div>
  );
}
