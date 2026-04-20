'use client';

import { motion } from 'framer-motion';
import { Crown, Star, Users, TrendingUp, Shield, Award, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface PaywallHeaderProps {
  onCTAClick?: () => void;
}

/**
 * PaywallHeader - En-tête optimisé pour la conversion
 *
 * Éléments clés :
 * - Preuve sociale (nombre d'utilisateurs, étoiles)
 * - Autorité (badges de confiance)
 * - Urgence (essai gratuit limité)
 * - CTA clair et visible
 */
export function PaywallHeader({ onCTAClick }: PaywallHeaderProps) {
  return (
    <div className="space-y-8 mb-12">
      {/* Hero Section with Social Proof */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        {/* Trust Badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/30"
        >
          <Crown size={14} className="text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Solutions de facturation #1 en France
          </span>
        </motion.div>

        {/* Main Title */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight">
            Choisissez votre plan
            <span className="block bg-gradient-to-r from-primary via-emerald-500 to-primary bg-clip-text text-transparent">
              pour libérer votre potentiel
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-base text-gray-500">
            Commencez gratuitement, évoluez à votre rythme. Rejoignez <span className="font-bold text-gray-700">+2,500 entreprises</span> qui nous font confiance.
          </p>
        </div>

        {/* Social Proof Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-6 text-sm"
        >
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="font-semibold text-gray-700">4.9/5</span>
            <span className="text-gray-400">(2,847 avis)</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200">
            <Users size={14} className="text-gray-500" />
            <span className="font-semibold text-gray-700">+2,500</span>
            <span className="text-gray-400">entreprises</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200">
            <TrendingUp size={14} className="text-emerald-500" />
            <span className="font-semibold text-emerald-600">+120%</span>
            <span className="text-gray-400">productivité</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Trust Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200">
          <Shield size={16} className="text-primary" />
          <span className="text-xs font-semibold text-gray-700">Sécurisé Stripe</span>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200">
          <CheckCircle2 size={16} className="text-primary" />
          <span className="text-xs font-semibold text-gray-700">RGPD Compliant</span>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200">
          <Award size={16} className="text-primary" />
          <span className="text-xs font-semibold text-gray-700">Support 24/7</span>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200">
          <Users size={16} className="text-primary" />
          <span className="text-xs font-semibold text-gray-700">+2M€ facturés</span>
        </div>
      </motion.div>

      {/* Free Trial Banner - With Urgency */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: 'spring' }}
        className="max-w-4xl mx-auto"
      >
        <Link href="/trial" className="block group">
          <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-6 shadow-xl shadow-amber-200/50 hover:shadow-2xl hover:shadow-amber-300/60 transition-all">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 via-orange-400/5 to-amber-400/5 animate-pulse" />

            {/* Particles */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(4)].map((_, i) => (
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
                    repeat: Number.POSITIVE_INFINITY,
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
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    className="px-2.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full uppercase tracking-wider"
                  >
                    Limité
                  </motion.span>
                </div>
                <p className="text-sm text-amber-800 mb-3">
                  <strong>Accès complet aux fonctionnalités Pro</strong> • Testez Factur-X, l'IA et tous nos outils sans engagement
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  <span>Commencer maintenant - Crédit non requis</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}

export default PaywallHeader;
