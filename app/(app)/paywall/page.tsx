'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import {
  ArrowLeft, Check, X, Crown, Zap, Rocket, Building2, Shield, Loader2, ArrowRight,
  Star, CreditCard, RefreshCw, Sparkles, Award, Infinity, Users, BarChart3,
  Database, Globe, HeadphonesIcon as Headphones, Lock, CheckCircle2, Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import EmbeddedCheckout, { PlanInfo } from '@/components/ui/EmbeddedCheckout';

interface PlanFeature { label: string; included: boolean; }
interface Plan {
  id: string; name: string; price: string; tagline: string;
  icon: React.ElementType; iconColor: string; iconBg: string;
  gradient: string; features: PlanFeature[]; cta: string; badge?: string;
}

const PLANS: Plan[] = [
  {
    id: 'solo', name: 'Solo', price: '9,99€', tagline: 'Idéal pour démarrer',
    icon: Zap, iconColor: 'text-white', iconBg: 'from-primary to-primary-dark',
    gradient: 'from-primary via-primary to-primary-dark',
    cta: 'Choisir Solo', badge: 'Populaire', features: [
      { label: 'Factures illimitées', included: true },
      { label: 'Clients illimités', included: true },
      { label: 'Envoi par email', included: true },
      { label: 'Paiement en ligne', included: true },
      { label: '6 templates PDF', included: true },
      { label: 'Logo & couleurs', included: true },
      { label: 'IA & Automatisation', included: false },
      { label: 'FEC & Comptabilité', included: false },
    ]
  },
  {
    id: 'pro', name: 'Pro', price: '19,99€', tagline: 'Pour grandir',
    icon: Rocket, iconColor: 'text-white', iconBg: 'from-violet-500 to-violet-600',
    gradient: 'from-violet-500 via-violet-600 to-violet-700',
    cta: 'Choisir Pro', features: [
      { label: 'Tout dans Solo', included: true },
      { label: 'IA & Relances', included: true },
      { label: 'Export FEC', included: true },
      { label: 'Pipeline CRM', included: true },
      { label: 'Factures récurrentes', included: true },
      { label: 'Signature client', included: true },
      { label: 'Multi-espaces', included: false },
      { label: 'API & Webhooks', included: false },
    ]
  },
  {
    id: 'business', name: 'Business', price: '39,99€', tagline: 'Pour les équipes',
    icon: Building2, iconColor: 'text-white', iconBg: 'from-amber-500 to-amber-600',
    gradient: 'from-amber-500 via-amber-600 to-amber-700',
    cta: 'Choisir Business', features: [
      { label: 'Tout dans Pro', included: true },
      { label: '10 espaces de travail', included: true },
      { label: 'API & Webhooks', included: true },
      { label: 'Multi-utilisateurs', included: true },
      { label: 'Rapports avancés', included: true },
      { label: 'Support prioritaire', included: true },
      { label: 'Onboarding dédié', included: true },
      { label: 'SLA garanti', included: true },
    ]
  },
];

function getHighlightedPlan(tier: string): string {
  if (tier === 'free' || tier === 'solo') return 'pro';
  return 'business';
}

// Glass Plan Card Component
const GlassPlanCard = ({
  plan, isHighlighted, isCurrent, isLoading, isDowngrade, onClick, delay,
}: {
  plan: Plan;
  isHighlighted: boolean;
  isCurrent: boolean;
  isLoading: boolean;
  isDowngrade: boolean;
  onClick: () => void;
  delay: number;
}) => {
  const Icon = plan.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative h-full"
    >
      {/* Glow effect */}
      {isHighlighted && (
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-violet-500/20 to-primary/20 rounded-[40px] blur-2xl opacity-75" />
      )}

      <motion.div
        whileHover={{ y: -8 }}
        className={cn(
          'relative h-full flex flex-col rounded-3xl border-2 overflow-hidden transition-all duration-300',
          isHighlighted
            ? 'border-primary shadow-2xl shadow-primary/20'
            : 'border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl',
          isCurrent && !isHighlighted && 'border-primary/40 ring-2 ring-primary/20',
          'cursor-pointer group bg-white dark:bg-gray-900'
        )}
        onClick={onClick}
      >
        {/* Header with gradient */}
        <div className={cn(
          'relative p-6 pb-8 bg-gradient-to-br',
          plan.gradient
        )}>
          {/* Animated pattern */}
          <div className="absolute inset-0 opacity-[0.1]">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />
          </div>

          {/* Badge */}
          {plan.badge && isHighlighted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.3, type: 'spring', bounce: 0.5 }}
              className="absolute top-4 right-4"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider border border-white/30">
                <Sparkles size={10} />
                {plan.badge}
              </span>
            </motion.div>
          )}
          {isCurrent && !isHighlighted && (
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider border border-white/30">
                <Check size={10} />
                Plan actuel
              </span>
            </div>
          )}

          <div className="relative">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
              className={cn(
                'inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4 bg-white/20 backdrop-blur-sm',
              )}
            >
              <Icon size={28} className={plan.iconColor} />
            </motion.div>
            <h3 className="text-2xl font-black text-white">{plan.name}</h3>
            <p className="text-sm text-white/80 mt-1">{plan.tagline}</p>
          </div>

          <div className="relative mt-6">
            <div className="flex items-end gap-1">
              <span className="text-5xl font-black text-white">{plan.price}</span>
              <span className="text-lg text-white/60 mb-2">/ mois</span>
            </div>
            <p className="text-xs text-white/60 mt-2">Sans engagement • Résiliable à tout moment</p>
          </div>
        </div>

        {/* Features */}
        <div className="flex-1 p-6 bg-white dark:bg-gray-900">
          <ul className="space-y-3">
            {plan.features.map((feat, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.1 + (i * 0.05) }}
                className="flex items-start gap-3"
              >
                {feat.included ? (
                  <div className="flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={18} className="text-primary" strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="flex-shrink-0 mt-0.5">
                    <Circle size={18} className="text-gray-300 dark:text-gray-600" strokeWidth={2} />
                  </div>
                )}
                <span className={cn('text-sm break-words', feat.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500')}>
                  {feat.label}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <div className="p-6 pt-0 bg-white dark:bg-gray-900">
          <motion.button
            whileHover={{ scale: isCurrent || isDowngrade ? 1 : 1.02 }}
            whileTap={{ scale: isCurrent || isDowngrade ? 1 : 0.98 }}
            disabled={isCurrent || isLoading || isDowngrade}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all duration-200 shadow-lg',
              isCurrent
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-default'
                : isDowngrade
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : cn(
                    'text-white hover:shadow-xl',
                    plan.id === 'solo' && 'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary',
                    plan.id === 'pro' && 'bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700',
                    plan.id === 'business' && 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                  ),
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
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function PaywallPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const sub = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const highlighted = getHighlightedPlan(sub.tier);

  const [checkoutData, setCheckoutData] = useState<{
    clientSecret: string;
    userId: string;
    planInfo: PlanInfo;
  } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const handleSelect = async (planId: string) => {
    if (planId === sub.tier) return;

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
        const planInfo: PlanInfo = {
          id: selectedPlan.id,
          name: selectedPlan.name,
          price: selectedPlan.price.replace('€', ''),
          priceNote: '/ mois',
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-20 px-4 sm:px-6 lg:px-8 py-8">

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={router.back}
        className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 w-fit transition-colors"
      >
        <ArrowLeft size={14} /> Retour
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 px-5 py-2 text-xs font-bold text-primary uppercase tracking-widest"
        >
          <Crown size={12} />
          Plans & Tarifs
        </motion.div>
        <h1 className="mb-4 text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
          Choisissez votre plan
        </h1>
        <p className="mx-auto max-w-xl text-base text-gray-500">
          Commencez gratuitement, évoluez à votre rythme. Sans engagement.
        </p>
      </motion.div>

      {/* Free User Alerts */}
      {sub.isFree && (
        <>
          {/* Trial Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-8 max-w-3xl"
          >
            <Link href="/trial" className="block group">
              <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-6 shadow-xl shadow-amber-200/50 hover:shadow-2xl hover:shadow-amber-300/60 transition-all">
                {/* Animated particles */}
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-amber-400/30 rounded-full"
                      animate={{
                        x: [0, Math.random() * 400 - 200],
                        y: [0, Math.random() * 100 - 50],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: i * 0.5,
                      }}
                      style={{ left: `${20 + i * 30}%`, top: `${20 + i * 20}%` }}
                    />
                  ))}
                </div>

                <div className="relative flex items-center gap-5">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                    className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg group-hover:shadow-xl transition-shadow"
                  >
                    <Sparkles size={32} className="fill-current" />
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-amber-700">
                        Essai Gratuit 4 Jours
                      </h3>
                      <motion.span
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="px-2.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full uppercase tracking-wider"
                      >
                        Nouveau
                      </motion.span>
                    </div>
                    <p className="text-sm text-amber-800 mb-2">
                      Accédez à TOUTES les fonctionnalités Pro pendant 4 jours, sans engagement.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-amber-700 font-semibold">
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      <span>Commencer maintenant</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Usage Alert */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-auto mb-10 max-w-3xl"
          >
            <div className={cn(
              "relative overflow-hidden rounded-3xl border-2 p-6 backdrop-blur-xl",
              remainingInvoices > 0
                ? "border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10"
                : "border-red-300 bg-gradient-to-r from-red-50 via-orange-50 to-red-50"
            )}>
              {/* Animated pattern */}
              <div className="absolute inset-0 opacity-[0.05]">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }} />
              </div>

              <div className="relative flex items-start gap-5">
                <motion.div
                  animate={remainingInvoices > 0 ? { rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn(
                    "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg",
                    remainingInvoices > 0
                      ? "bg-gradient-to-br from-primary/20 to-primary/10"
                      : "bg-gradient-to-br from-red-100 to-red-200"
                  )}
                >
                  {remainingInvoices > 0 ? (
                    <Zap size={24} className="text-primary" />
                  ) : (
                    <Lock size={24} className="text-red-500" />
                  )}
                </motion.div>
                <div className="flex-1">
                  <h3 className={cn(
                    "text-xl font-bold mb-1",
                    remainingInvoices > 0 ? "text-primary" : "text-red-700"
                  )}>
                    {remainingInvoices > 0 ? 'Plan Gratuit' : 'Limite atteinte'}
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    {remainingInvoices > 0
                      ? `Vous pouvez créer encore ${remainingInvoices} facture${remainingInvoices > 1 ? 's' : ''} ce mois-ci.`
                      : 'Vous avez atteint votre limite de 5 factures mensuelles.'}
                  </p>

                  {/* Progress bar */}
                  <div className="mb-5">
                    <div className="flex justify-between text-xs mb-2">
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
                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          remainingInvoices > 0
                            ? "bg-gradient-to-r from-primary to-primary-dark"
                            : "bg-gradient-to-r from-red-400 to-red-500"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${(sub.invoiceCount / 5) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50">
                      <Infinity size={15} className="text-gray-500" />
                      <span className="text-xs text-gray-700 font-medium">Illimité avec Pro</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50">
                      <Sparkles size={15} className="text-gray-500" />
                      <span className="text-xs text-gray-700 font-medium">IA incluse</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Paid User Alert */}
      {!sub.isFree && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mb-10 max-w-3xl"
        >
          <div className="flex items-center gap-4 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-5 backdrop-blur-xl">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10"
            >
              <Award size={24} className="text-primary" />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-bold text-primary">Plan {sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)} actif</p>
              <p className="text-xs text-gray-600 mt-0.5">Accès illimité à toutes les fonctionnalités</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Checkout View or Plans Grid */}
      <AnimatePresence mode="wait">
        {checkoutData && selectedPlan ? (
          <motion.div
            key="checkout"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto"
          >
            {/* Selected Plan Summary */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:sticky lg:top-8"
            >
              <button
                onClick={handleBack}
                className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={14} /> Changer de plan
              </button>

              <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl border-2 border-gray-200 shadow-xl overflow-hidden">
                <div className={cn(
                  "p-6 pb-8 bg-gradient-to-br",
                  selectedPlan.gradient
                )}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
                      <selectedPlan.icon size={28} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-black text-white">{selectedPlan.name}</h2>
                        {selectedPlan.badge && (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-white/20 backdrop-blur-sm text-white rounded-full uppercase tracking-wider border border-white/30">
                            {selectedPlan.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/80 mt-1">{selectedPlan.tagline}</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-white">{selectedPlan.price}</span>
                    <span className="text-lg text-white/60 mb-2">/ mois</span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Inclus dans ce plan</p>
                  <div className="space-y-3">
                    {selectedPlan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-3">
                        {feat.included ? (
                          <CheckCircle2 size={18} className="text-primary flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                        ) : (
                          <Circle size={18} className="text-gray-300 flex-shrink-0 mt-0.5" strokeWidth={2} />
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

            {/* Stripe Checkout */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
                    <Shield size={24} className="text-white" />
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
        ) : (
          /* Plans Grid */
          <motion.div
            key="plans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
          >
            {PLANS.map((plan, index) => {
              const isHighlighted = plan.id === highlighted;
              const isCurrent = plan.id === sub.tier;
              const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === sub.tier);
              const isLoading = loading === plan.id;

              return (
                <GlassPlanCard
                  key={plan.id}
                  plan={plan}
                  isHighlighted={isHighlighted}
                  isCurrent={isCurrent}
                  isLoading={isLoading}
                  isDowngrade={isDowngrade}
                  onClick={() => handleSelect(plan.id)}
                  delay={index * 0.1}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mx-auto mt-16 max-w-2xl flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-gray-200">
          <Shield size={15} className="text-primary" />
          <span>Paiement sécurisé Stripe</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-gray-200">
          <RefreshCw size={15} className="text-primary" />
          <span>Annulation en 1 clic</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-gray-200">
          <CreditCard size={15} className="text-primary" />
          <span>RGPD compliant</span>
        </div>
      </motion.div>
    </div>
  );
}
