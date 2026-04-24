'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Shield, ArrowRight, CheckCircle2, Circle, Infinity, Lock, HeadphonesIcon as Headphones } from 'lucide-react';
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
  // Prorata props
  prorataAmount?: number;
  prorataPercent?: number;
  currentPlan?: string;
}

const PlanFeature = ({ feature, delay }: { feature: PlanFeature; delay: number }) => (
  <motion.li
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: delay + 0.05 }}
    className={cn(
      'flex items-start gap-3 py-2 px-3 -mx-3 rounded-xl transition-all duration-200',
      feature.included ? 'hover:bg-white/40' : '',
      feature.highlight && 'bg-gradient-to-r from-emerald-50/80 to-green-50/80 dark:from-emerald-500/10 dark:to-green-500/5 border border-emerald-200/50 dark:border-emerald-500/30'
    )}
  >
    {feature.included ? (
      <div className="flex-shrink-0 mt-0.5">
        <CheckCircle2 size={16} className={cn(
          'stroke-2.5',
          feature.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'
        )} />
      </div>
    ) : (
      <div className="flex-shrink-0 mt-0.5">
        <Circle size={16} className="text-gray-300 dark:text-gray-600 stroke-2" />
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
        className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full uppercase tracking-wider ml-auto"
      >
        Top
      </motion.span>
    )}
  </motion.li>
);

/**
 * OptimizedPricingCard - Carte de prix avec glassmorphism moderne
 *
 * Meilleures pratiques appliquées :
 * - Effet glassmorphism avec backdrop-blur
 * - Animations fluides avec Framer Motion
 * - Micro-interactions au hover
 * - Palette de couleurs conservée (emerald, blue, purple/violet)
 * - Design bento grid moderne
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
  prorataAmount = 0,
  prorataPercent = 0,
  currentPlan,
}: OptimizedPricingCardProps) {
  const Icon = plan.icon;

  // Calculer le prix affiché - TOUJOURS afficher le prix normal, pas le prorata
  const displayPrice = plan.price;

  const hasProrata = prorataAmount > 0 && !isCurrent && !isDowngrade;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative group"
    >
      {/* Card Container avec Glassmorphism */}
      <motion.div
        whileHover={{ y: -8 }}
        className={cn(
          'relative h-full flex flex-col rounded-3xl border-2 transition-all duration-300 overflow-hidden backdrop-blur-xl',
          'bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-900/80 dark:via-gray-900/60 dark:to-gray-900/40',
          'shadow-xl hover:shadow-2xl',
          isHighlighted && `border-${plan.borderColor}/50 shadow-${plan.glowColor}/30`,
          !isHighlighted && 'border-gray-200/50 dark:border-gray-700/50',
          isCurrent && !isHighlighted && 'ring-2 ring-primary/20',
          'cursor-pointer'
        )}
        onClick={onClick}
        style={{
          boxShadow: isHighlighted
            ? `0 20px 60px -15px ${plan.id === 'solo' ? 'rgba(16, 185, 129, 0.3)' : plan.id === 'pro' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(147, 51, 234, 0.3)'}`
            : undefined
        }}
      >
        {/* Animated gradient background overlay */}
        <div className={cn(
          "absolute inset-0 opacity-20 transition-opacity duration-300 group-hover:opacity-30",
          "bg-gradient-to-br",
          plan.gradientFrom,
          plan.gradientTo
        )} />

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: plan.id === 'solo' ? 'rgba(16, 185, 129, 0.4)' : plan.id === 'pro' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(147, 51, 234, 0.4)',
                left: `${20 + i * 25}%`,
                top: `${20 + i * 15}%`
              }}
              animate={{
                x: [0, Math.random() * 200 - 100],
                y: [0, Math.random() * 100 - 50],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.7,
              }}
            />
          ))}
        </div>

        {/* Highlighted top border */}
        {isHighlighted && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: delay + 0.2 }}
            className={cn(
              'absolute top-0 left-0 right-0 z-20 h-1 bg-gradient-to-r',
              plan.gradientFrom,
              plan.gradientTo
            )}
          />
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header Section */}
          <div className={cn(
            'relative p-6 pb-8 rounded-t-3xl',
            'bg-gradient-to-br',
            plan.gradientFrom,
            plan.gradientTo
          )}>
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-[0.15]">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }} />
            </div>

            {/* Top Badges */}
            <div className="relative flex justify-between items-start mb-4">
              {plan.badge && isHighlighted && (
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: delay + 0.3, type: 'spring', bounce: 0.5 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/30 shadow-lg"
                >
                  <Sparkles size={10} />
                  {plan.badge}
                </motion.div>
              )}

              {isCurrent && !isHighlighted && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/30 shadow-lg">
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
                className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4 bg-white/20 backdrop-blur-md shadow-xl"
              >
                <Icon size={28} className={plan.iconColor} />
              </motion.div>
              <h3 className="text-2xl font-black text-white">{plan.name}</h3>
              <p className="text-sm text-white/90 mt-1">{plan.tagline}</p>
            </div>

            {/* Pricing Anchor */}
            <div className="relative mt-6">
              <div className="flex items-end gap-1">
                <span className="text-5xl font-black text-white">{displayPrice}</span>
                <span className="text-lg text-white/70 mb-2">
                  {hasProrata ? 'à payer' : '/ mois'}
                </span>
              </div>

              {hasProrata && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: delay + 0.3 }}
                  className="mt-2 flex items-center gap-2"
                >
                  <span className="px-2 py-0.5 bg-emerald-400/30 text-white text-[10px] font-bold rounded-full">
                    Prorata {prorataPercent}%
                  </span>
                  <span className="text-xs text-white/80">
                    Au lieu de {plan.price}
                  </span>
                </motion.div>
              )}

              <p className="text-xs text-white/90 mt-2">Sans engagement • Résiliable à tout moment</p>

              {isHighlighted && !hasProrata && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: delay + 0.4 }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/20"
                >
                  <Infinity size={12} />
                  Facturation illimitée
                </motion.div>
              )}
            </div>
          </div>

          {/* Features List avec glassmorphism */}
          <div className="flex-1 p-6 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm">
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
              className="px-6 pt-4 pb-2 bg-white/40 dark:bg-gray-900/40"
            >
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                  <Shield size={12} className="text-primary" />
                  <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Sécurisé</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                  <Lock size={12} className="text-primary" />
                  <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">RGPD</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                  <Headphones size={12} className="text-primary" />
                  <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Support</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* CTA Button */}
          <div className="p-6 pt-2 bg-white/40 dark:bg-gray-900/40">
            <motion.button
              whileHover={{ scale: isCurrent || isDowngrade ? 1 : 1.02 }}
              whileTap={{ scale: isCurrent || isDowngrade ? 1 : 0.98 }}
              disabled={isCurrent || isLoading || isDowngrade}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all duration-200 shadow-lg relative overflow-hidden',
                'before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-white/10 before:opacity-0 before:hover:opacity-100 before:transition-opacity',
                isCurrent
                  ? 'bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-400 cursor-default backdrop-blur-sm'
                  : isDowngrade
                    ? 'bg-gray-200/60 dark:bg-gray-700/60 text-gray-400 dark:text-gray-600 cursor-not-allowed backdrop-blur-sm'
                    : cn(
                      'text-white hover:shadow-xl backdrop-blur-sm',
                      plan.id === 'solo' && 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/30',
                      plan.id === 'pro' && 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-800 hover:to-indigo-900 shadow-blue-600/30',
                      plan.id === 'business' && 'bg-gradient-to-r from-purple-600 to-violet-700 hover:from-violet-700 hover:to-purple-800 shadow-purple-600/30'
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
        </div>
      </motion.div>
    </motion.div>
  );
}

export default OptimizedPricingCard;
