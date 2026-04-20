'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Crown, Zap, Rocket, Building2, Sparkles, Award, Shield, ArrowRight, CheckCircle2, Circle, Star, Users, TrendingUp, Lock, HeadphonesIcon as Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanFeature { label: string; included: boolean; highlight?: boolean; }
interface Plan {
  id: string; name: string; price: string; tagline: string;
  icon: React.ElementType; iconColor: string; iconBg: string;
  gradient: string; gradientFrom: string; gradientTo: string;
  features: PlanFeature[]; cta: string; badge?: string;
  borderColor: string; glowColor: string; popular?: boolean;
}

interface OptimizedPricingCardProps {
  plan: Plan;
  isHighlighted: boolean;
  isCurrent: boolean;
  isLoading: boolean;
  isDowngrade: boolean;
  onClick: () => void;
  delay: number;
  userCount?: string;
}

const PlanFeature = ({ feature, delay }: { feature: PlanFeature; delay: number }) => (
  <motion.li
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: delay + 0.05 }}
    className={cn(
      'flex items-start gap-3 py-2',
      feature.highlight && 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/5 px-3 -mx-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30'
    )}
  >
    {feature.included ? (
      <div className="flex-shrink-0 mt-0.5">
        <CheckCircle2 size={18} className={cn(
          'stroke-2.5',
          feature.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'
        )} />
      </div>
    ) : (
      <div className="flex-shrink-0 mt-0.5">
        <Circle size={18} className="text-gray-300 dark:text-gray-600 stroke-2" />
      </div>
    )}
    <span className={cn(
      'text-sm break-words flex-1',
      feature.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500',
      feature.highlight && 'font-semibold'
    )}>
      {feature.label}
    </span>
    {feature.highlight && (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full uppercase tracking-wider ml-auto"
      >
        Top
      </motion.span>
    )}
  </motion.li>
);

/**
 * OptimizedPricingCard - Carte de prix optimisée pour la conversion
 *
 * Meilleures pratiques appliquées :
 * - Ancrage de prix (pricing anchor)
 * - Contraste visuel (plans côte à côte)
 * - Urgence (badges limités)
 * - Preuve sociale (nombre d'utilisateurs)
 * - Sécurité (badges de confiance)
 * - CTA psychologiques
 */
export function OptimizedPricingCard({
  plan,
  isHighlighted,
  isCurrent,
  isLoading,
  isDowngrade,
  onClick,
  delay,
  userCount = '+2,500',
}: OptimizedPricingCardProps) {
  const Icon = plan.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        'relative group',
        isHighlighted ? 'lg:col-span-1' : 'lg:col-span-1'
      )}
    >
      {/* Card Container */}
      <motion.div
        whileHover={{ y: -8 }}
        className={cn(
          'relative h-full flex flex-col rounded-3xl border-2 transition-all duration-300 overflow-hidden',
          'bg-white dark:bg-gray-900 shadow-xl hover:shadow-2xl',
          isHighlighted && `border-${plan.borderColor} shadow-${plan.glowColor}/20`,
          !isHighlighted && 'border-gray-200 dark:border-gray-700',
          isCurrent && !isHighlighted && 'ring-2 ring-primary/20',
          'cursor-pointer'
        )}
        onClick={onClick}
      >
        {/* Highlighted Badge */}
        {isHighlighted && (
          <div className="absolute top-0 left-0 right-0 z-20">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: delay + 0.2 }}
              className={cn(
                'h-1 bg-gradient-to-r',
                plan.gradientFrom,
                plan.gradientTo
              )}
            />
          </div>
        )}

        {/* Header Section */}
        <div className={cn(
          'relative p-6 pb-8 bg-gradient-to-br',
          plan.gradientFrom,
          plan.gradientTo
        )}>
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-[0.1]">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />
          </div>

          {/* Top Badges */}
          <div className="relative flex justify-between items-start mb-4">
            {/* Popular Badge */}
            {plan.badge && isHighlighted && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: delay + 0.3, type: 'spring', bounce: 0.5 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider border border-white/30"
              >
                <Sparkles size={10} />
                {plan.badge}
              </motion.div>
            )}

            {/* Current Plan Badge */}
            {isCurrent && !isHighlighted && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider border border-white/30">
              <Check size={10} />
              Actuel
            </div>
            )}
          </div>

          {/* Icon & Title */}
          <div className="relative">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4 bg-white/20 backdrop-blur-sm"
            >
              <Icon size={28} className={plan.iconColor} />
            </motion.div>
            <h3 className="text-2xl font-black text-white">{plan.name}</h3>
            <p className="text-sm text-white/80 mt-1">{plan.tagline}</p>
          </div>

          {/* Pricing Anchor */}
          <div className="relative mt-6">
            <div className="flex items-end gap-1">
              <span className="text-5xl font-black text-white">{plan.price}</span>
              <span className="text-lg text-white/60 mb-2">/ mois</span>
            </div>
            <p className="text-xs text-white/80 mt-2">Sans engagement • Résiliable à tout moment</p>

            {/* Annual Savings Badge (for highlighted plan) */}
            {isHighlighted && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.4 }}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/20"
              >
                <TrendingUp size={12} />
                -50% vs annuel
              </motion.div>
            )}
          </div>
        </div>

        {/* Social Proof - User Count */}
        {isHighlighted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.3 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-lg border border-gray-100">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-white flex items-center justify-center">
                    <Users size={12} className="text-white" />
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold text-gray-700">
                <span className="text-primary font-bold">{userCount}</span> utilisateurs
              </span>
            </div>
          </motion.div>
        )}

        {/* Features List */}
        <div className="flex-1 p-6 bg-white dark:bg-gray-900">
          {/* Key Features Highlight */}
          {isHighlighted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.2 }}
              className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/5 border border-emerald-200 dark:border-emerald-500/30"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                <Award size={16} />
                Choisi par les pros
              </div>
            </motion.div>
          )}

          <ul className="space-y-1">
            {plan.features.map((feat, i) => (
              <PlanFeature key={i} feature={feat} delay={delay} />
            ))}
          </ul>
        </div>

        {/* Trust & Security Badges */}
        {isHighlighted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.4 }}
            className="px-6 pt-4 bg-white dark:bg-gray-900"
          >
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Shield size={14} className="text-primary" />
                <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Sécurisé</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Lock size={14} className="text-primary" />
                <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">RGPD</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Headphones size={14} className="text-primary" />
                <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Support 24/7</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* CTA Button */}
        <div className="p-6 pt-0 bg-white dark:bg-gray-900">
          <motion.button
            whileHover={{ scale: isCurrent || isDowngrade ? 1 : 1.02 }}
            whileTap={{ scale: isCurrent || isDowngrade ? 1 : 0.98 }}
            disabled={isCurrent || isLoading || isDowngrade}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all duration-200 shadow-lg relative overflow-hidden',
              isCurrent
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-default'
                : isDowngrade
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : cn(
                    'text-white hover:shadow-xl',
                    'before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-white/10 before:opacity-0 before:hover:opacity-100 before:transition-opacity',
                    plan.id === 'solo' && 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
                    plan.id === 'pro' && 'bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-indigo-900',
                    plan.id === 'business' && 'bg-gradient-to-r from-purple-600 to-violet-700 hover:from-violet-700 hover:to-purple-800'
                  ),
            )}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
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
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.button>

          {/* Guarantee Badge */}
          {!isCurrent && !isDowngrade && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.5 }}
              className="text-[10px] text-gray-500 text-center mt-3 flex items-center justify-center gap-1"
            >
              <Shield size={10} />
              Satisfait ou remboursé sous 30 jours
            </motion.p>
          )}
        </div>

        {/* Ribbon for popular plan */}
        {isHighlighted && (
          <div className={cn(
            'absolute top-6 -right-8 w-24 h-24 flex items-center justify-center',
            'transform rotate-45'
          )}>
            <div className={cn(
              'w-full h-full flex items-center justify-center text-center text-[10px] font-bold text-white uppercase tracking-wider',
              'bg-gradient-to-br',
              plan.gradientFrom,
              plan.gradientTo
            )}>
              Top
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default OptimizedPricingCard;
