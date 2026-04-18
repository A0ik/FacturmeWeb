'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { ArrowLeft, Check, X, Crown, Zap, Rocket, Building2, Shield, Loader2, ArrowRight, Star, CreditCard, RefreshCw, Sparkles, Award, Infinity, Users, BarChart3, Database, Globe, HeadphonesIcon as Headphones, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import EmbeddedCheckout, { PlanInfo } from '@/components/ui/EmbeddedCheckout';
import TiltCard from '@/components/ui/TiltCard';

interface PlanFeature { label: string; included: boolean; }
interface Plan {
  id: string; name: string; price: string; tagline: string;
  icon: React.ElementType; iconColor: string; iconBg: string;
  features: PlanFeature[]; cta: string; badge?: string;
}

const PLANS: Plan[] = [
  {
    id: 'solo', name: 'Solo', price: '9,99€', tagline: 'Idéal pour démarrer', icon: Zap, iconColor: 'text-primary', iconBg: 'bg-primary/10', cta: 'Choisir Solo', badge: 'Populaire', features: [
      { label: 'Factures illimitées', included: true }, { label: 'Clients illimités', included: true }, { label: 'Envoi par email', included: true },
      { label: 'Paiement en ligne', included: true }, { label: '6 templates PDF', included: true }, { label: 'Logo & couleurs', included: true },
      { label: 'IA & Automatisation', included: false }, { label: 'FEC & Comptabilité', included: false },
    ]
  },
  {
    id: 'pro', name: 'Pro', price: '19,99€', tagline: 'Pour grandir', icon: Rocket, iconColor: 'text-violet-500', iconBg: 'bg-violet-50', cta: 'Choisir Pro', features: [
      { label: 'Tout dans Solo', included: true }, { label: 'IA & Relances', included: true }, { label: 'Export FEC', included: true },
      { label: 'Pipeline CRM', included: true }, { label: 'Factures récurrentes', included: true }, { label: 'Signature client', included: true },
      { label: 'Multi-espaces', included: false }, { label: 'API & Webhooks', included: false },
    ]
  },
  {
    id: 'business', name: 'Business', price: '39,99€', tagline: 'Pour les équipes', icon: Building2, iconColor: 'text-amber-500', iconBg: 'bg-amber-50', cta: 'Choisir Business', features: [
      { label: 'Tout dans Pro', included: true }, { label: '10 espaces de travail', included: true }, { label: 'API & Webhooks', included: true },
      { label: 'Multi-utilisateurs', included: true }, { label: 'Rapports avancés', included: true }, { label: 'Support prioritaire', included: true },
      { label: 'Onboarding dédié', included: true }, { label: 'SLA garanti', included: true },
    ]
  },
];

function getHighlightedPlan(tier: string): string {
  if (tier === 'free' || tier === 'solo') return 'pro';
  return 'business';
}

export default function PaywallPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const highlighted = getHighlightedPlan(sub.tier);

  // STATE POUR LE FORMULAIRE DE CARTE + PLAN INFO
  const [checkoutData, setCheckoutData] = useState<{
    clientSecret: string;
    userId: string;
    planInfo: PlanInfo;
  } | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const handleSelect = async (planId: string) => {
    if (planId === sub.tier) return;

    // Trouver le plan complet
    const selectedPlan = PLANS.find(p => p.id === planId);
    if (!selectedPlan) return;

    setLoading(planId);
    setSelectedPlan(selectedPlan);
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, userId: profile?.id }),
      });
      const data = await res.json();

      if (data.clientSecret) {
        // Préparer les infos du plan pour le checkout
        const planInfo: PlanInfo = {
          id: selectedPlan.id,
          name: selectedPlan.name,
          price: selectedPlan.price.replace('€', ''),
          priceNote: '/ mois',
          // Extraire les features incluses (max 4)
          features: selectedPlan.features
            .filter(f => f.included)
            .slice(0, 4)
            .map(f => f.label),
        };

        setCheckoutData({
          clientSecret: data.clientSecret,
          userId: profile?.id ?? '',
          planInfo,
        });
      } else {
        toast.error(data.error || "Impossible de créer l'abonnement");
        setSelectedPlan(null);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
      setSelectedPlan(null);
    } finally {
      setLoading(null);
    }
  };

  const handleBack = () => {
    setCheckoutData(null);
    setSelectedPlan(null);
  };

  const remainingInvoices = 5 - sub.invoiceCount;

  return (
    <div className="min-h-screen w-full min-w-0 flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-16 px-4 sm:px-6 lg:px-10 py-8">

      <button onClick={router.back} className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 w-fit">
        <ArrowLeft size={14} /> Retour
      </button>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary uppercase tracking-widest">
          <Crown size={11} /> Plans & Tarifs
        </div>
        <h1 className="mb-3 text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Choisissez votre plan</h1>
        <p className="mx-auto max-w-xl text-base text-gray-500">Commencez gratuitement, évoluez à votre rythme.</p>
      </motion.div>

      {/* ALERTE POUR LES UTILISATEURS GRATUITS */}
      {sub.isFree && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-10 max-w-3xl"
        >
          <div className={cn(
            "relative overflow-hidden rounded-2xl border-2 p-6",
            remainingInvoices > 0
              ? "border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
              : "border-red-200 bg-gradient-to-r from-red-50 via-orange-50 to-red-50"
          )}>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />

            <div className="relative flex items-start gap-4">
              <div className={cn(
                "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl",
                remainingInvoices > 0 ? "bg-primary/10" : "bg-red-100"
              )}>
                {remainingInvoices > 0 ? (
                  <Zap size={24} className="text-primary" />
                ) : (
                  <Lock size={24} className="text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={cn(
                  "text-lg font-bold mb-1",
                  remainingInvoices > 0 ? "text-primary" : "text-red-700"
                )}>
                  {remainingInvoices > 0 ? 'Plan Gratuit' : 'Limite atteinte'}
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  {remainingInvoices > 0
                    ? `Vous pouvez créer encore ${remainingInvoices} facture${remainingInvoices > 1 ? 's' : ''} ce mois-ci.`
                    : 'Vous avez atteint votre limite de 5 factures mensuelles.'}
                </p>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-gray-600">
                      {sub.invoiceCount} / 5 factures
                    </span>
                    <span className={cn(
                      "font-bold",
                      remainingInvoices > 0 ? "text-primary" : "text-red-500"
                    )}>
                      {remainingInvoices > 0 ? `${remainingInvoices} restantes` : 'Limite atteinte'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        remainingInvoices > 0 ? "bg-gradient-to-r from-primary to-primary-dark" : "bg-red-500"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${(sub.invoiceCount / 5) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Feature reminder */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 bg-white/50 px-3 py-1.5 rounded-lg border border-gray-200">
                    <Infinity size={14} className="text-gray-500" />
                    <span className="text-xs text-gray-600">Illimité avec Pro</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/50 px-3 py-1.5 rounded-lg border border-gray-200">
                    <Sparkles size={14} className="text-gray-500" />
                    <span className="text-xs text-gray-600">IA incluse</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ALERTE POUR LES UTILISATEURS PAYANTS */}
      {!sub.isFree && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-10 max-w-3xl"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Award size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-primary">Plan {sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)} actif</p>
              <p className="text-xs text-gray-600 mt-0.5">Accès illimité à toutes les fonctionnalités</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* -------------------------------------------------------- */}
      {/* SPLIT VIEW OU GRILLE DE PLANS ?  */}
      {/* -------------------------------------------------------- */}
      {checkoutData && selectedPlan ? (
        <AnimatePresence mode="wait">
          <motion.div
            key="checkout"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto"
          >
            {/* GAUCHE : PLAN SÉLECTIONNÉ */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:sticky lg:top-8"
            >
              <button
                onClick={handleBack}
                className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft size={14} /> Changer de plan
              </button>

              <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl border-2 border-gray-200 shadow-xl overflow-hidden">
                {/* Header du plan */}
                <div className={cn(
                  "p-6 pb-8 bg-gradient-to-br",
                  selectedPlan.id === 'solo' && "from-primary/5 to-primary/10",
                  selectedPlan.id === 'pro' && "from-violet-500/5 to-violet-500/10",
                  selectedPlan.id === 'business' && "from-amber-500/5 to-amber-500/10"
                )}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center", selectedPlan.iconBg)}>
                      <selectedPlan.icon size={28} className={selectedPlan.iconColor} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-black text-gray-900">{selectedPlan.name}</h2>
                        {selectedPlan.badge && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-primary text-white rounded-full uppercase tracking-wider">
                            {selectedPlan.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{selectedPlan.tagline}</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-gray-900">{selectedPlan.price}</span>
                    <span className="text-lg text-gray-400 mb-2">/ mois</span>
                  </div>
                </div>

                {/* Features */}
                <div className="p-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Inclus dans ce plan</p>
                  <div className="space-y-3">
                    {selectedPlan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-3">
                        {feat.included ? (
                          <div className="flex-shrink-0 w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                            <Check size={12} className="text-primary" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-5 h-5 rounded-lg bg-gray-100 flex items-center justify-center mt-0.5">
                            <X size={12} className="text-gray-400" strokeWidth={3} />
                          </div>
                        )}
                        <span className={cn("text-sm", feat.included ? "text-gray-700" : "text-gray-400")}>
                          {feat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* DROITE : STRIPE ELEMENT */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-xl p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                    <Shield size={20} className="text-black" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Paiement sécurisé</h2>
                    <p className="text-xs text-gray-500">Crypté et protégé par Stripe</p>
                  </div>
                </div>

                <EmbeddedCheckout
                  clientSecret={checkoutData.clientSecret}
                  userId={checkoutData.userId}
                  planInfo={checkoutData.planInfo}
                />
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <>
          {/* LA GRILLE DE PLANS 3D */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto perspective-1000">
            {PLANS.map((plan, index) => {
              const isHighlighted = plan.id === highlighted;
              const isCurrent = plan.id === sub.tier;
              const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === sub.tier);
              const Icon = plan.icon;
              const isLoading = loading === plan.id;

              return (
                <TiltCard key={plan.id} intensity={isHighlighted ? 8 : 5}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={cn(
                      'relative h-full flex flex-col rounded-3xl border-2 bg-white transition-all duration-300',
                      isHighlighted
                        ? 'border-primary shadow-2xl shadow-primary/20 ring-2 ring-primary/20'
                        : 'border-gray-200 shadow-lg hover:shadow-xl hover:border-gray-300',
                      isCurrent && !isHighlighted && 'border-primary/40 ring-2 ring-primary/10',
                      'cursor-pointer group overflow-hidden'
                    )}
                    onClick={() => handleSelect(plan.id)}
                  >
                    {/* Gradient background on hover */}
                    <div className={cn(
                      "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
                      plan.id === 'solo' && "bg-gradient-to-br from-primary/5 via-transparent to-primary/5",
                      plan.id === 'pro' && "bg-gradient-to-br from-violet-500/5 via-transparent to-violet-500/5",
                      plan.id === 'business' && "bg-gradient-to-br from-amber-500/5 via-transparent to-amber-500/5"
                    )} />

                    {/* Badge */}
                    {plan.badge && isHighlighted && (
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-primary-dark text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
                          <Sparkles size={10} />
                          {plan.badge}
                        </span>
                      </div>
                    )}
                    {isCurrent && !isHighlighted && (
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
                          <Check size={10} />
                          Plan actuel
                        </span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="relative p-6 flex flex-col flex-1">
                      {/* Icon & Name */}
                      <div className="mb-6">
                        <div className={cn(
                          'inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4 transition-transform duration-300 group-hover:scale-110',
                          plan.iconBg
                        )}>
                          <Icon size={28} className={plan.iconColor} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">{plan.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{plan.tagline}</p>
                      </div>

                      {/* Price */}
                      <div className="mb-6">
                        <div className="flex items-end gap-1">
                          <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                          <span className="text-sm text-gray-400 mb-2">/ mois</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Sans engagement</p>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 flex-1 mb-6">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            {feat.included ? (
                              <div className="flex-shrink-0 w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                                <Check size={12} className="text-primary" strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="flex-shrink-0 w-5 h-5 rounded-lg bg-gray-100 flex items-center justify-center mt-0.5">
                                <X size={12} className="text-gray-300" strokeWidth={3} />
                              </div>
                            )}
                            <span className={cn('text-sm break-words', feat.included ? 'text-gray-700' : 'text-gray-400')}>
                              {feat.label}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      <button
                        disabled={isCurrent || isLoading || isDowngrade}
                        className={cn(
                          'w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all duration-200 shadow-lg',
                          isCurrent
                            ? 'bg-gray-100 text-gray-600 cursor-default'
                            : isDowngrade
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:from-gray-800 hover:to-gray-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
                          plan.id === 'solo' && !isCurrent && 'from-primary to-primary-dark hover:from-primary-dark hover:to-primary',
                          plan.id === 'pro' && !isCurrent && 'from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800',
                          plan.id === 'business' && !isCurrent && 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                        )}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Chargement...</span>
                          </>
                        ) : isCurrent ? (
                          <>
                            <Check size={14} />
                            {plan.cta}
                          </>
                        ) : isDowngrade ? (
                          'Plan inférieur'
                        ) : (
                          <>
                            {plan.cta}
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </TiltCard>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mx-auto mt-12 max-w-2xl flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2"><Shield size={14} /><span>Paiement sécurisé Stripe</span></div>
            <div className="flex items-center gap-2"><RefreshCw size={14} /><span>Annulation en 1 clic</span></div>
            <div className="flex items-center gap-2"><CreditCard size={14} /><span>RGPD</span></div>
          </div>
        </>
      )}
    </div>
  );
}
