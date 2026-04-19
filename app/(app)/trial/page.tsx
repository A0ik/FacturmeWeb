"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Zap, FileText, BarChart3, Shield, Clock, Star,
  CheckCircle2, ArrowRight, Sparkles, TrendingUp
} from "lucide-react";
import Button from "@/components/ui/Button";
import TiltCard from "@/components/ui/TiltCard";

export default function TrialPage() {
  const [isActivating, setIsActivating] = React.useState(false);
  const [isActivated, setIsActivated] = React.useState(false);

  const handleActivateTrial = async () => {
    setIsActivating(true);
    try {
      const response = await fetch('/api/subscription/activate-trial', {
        method: 'POST'
      });

      if (response.ok) {
        setIsActivated(true);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de l\'activation de l\'essai');
      }
    } catch (error) {
      console.error('Error activating trial:', error);
      alert('Erreur lors de l\'activation de l\'essai');
    } finally {
      setIsActivating(false);
    }
  };

  const features = [
    {
      icon: FileText,
      title: "Factures illimitées",
      description: "Créez autant de factures que vous le souhaitez pendant 4 jours",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Zap,
      title: "IA & Voix",
      description: "Dictée vocale et génération d'factures par intelligence artificielle",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: BarChart3,
      title: "CRM & Recouvrement",
      description: "Gérez vos clients et suivez vos opportunités commerciales",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Shield,
      title: "Signature électronique",
      description: "Faites signer vos devis et contrats en ligne",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Clock,
      title: "Factures récurrentes",
      description: "Automatisez vos factures périodiques",
      color: "from-indigo-500 to-violet-500"
    },
    {
      icon: TrendingUp,
      title: "Export comptable",
      description: "Exportez vos données au format FEC pour votre comptable",
      color: "from-teal-500 to-cyan-500"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden py-20 px-4"
      >
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [90, 0, 90],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-green-400/20 to-cyan-400/20 rounded-full blur-3xl"
          />
        </div>

        <div className="container mx-auto max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center"
          >
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Offre limitée
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Essai Gratuit 4 Jours
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              Découvrez toutes les fonctionnalités Pro de FacturmeWeb sans engagement.
              Après l'essai, votre abonnement Pro continuera automatiquement.
            </p>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isActivated ? (
                <div className="inline-flex items-center gap-2 bg-green-500 text-white px-8 py-4 rounded-full text-lg font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                  Essai activé ! Redirection...
                </div>
              ) : (
                <Button
                  onClick={handleActivateTrial}
                  disabled={isActivating}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg shadow-blue-500/25"
                >
                  {isActivating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        <Zap className="w-5 h-5" />
                      </motion.div>
                      Activation en cours...
                    </>
                  ) : (
                    <>
                      Commencer mon essai gratuit
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              )}
            </motion.div>

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Aucune carte bancaire requise • Annulation à tout moment
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-800 dark:text-slate-100">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Accédez à toutes les fonctionnalités Pro pendant votre essai
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <TiltCard key={index} className="h-full">
                <motion.div
                  variants={itemVariants}
                  className="h-full bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-slate-200 dark:border-slate-700"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-4`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300">
                    {feature.description}
                  </p>
                </motion.div>
              </TiltCard>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-800 dark:text-slate-100">
              Comment ça marche ?
            </h2>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Activez votre essai",
                description: "Cliquez sur le bouton ci-dessus pour démarrer votre essai gratuit de 4 jours",
                icon: "🚀"
              },
              {
                step: "2",
                title: "Profitez de toutes les fonctionnalités",
                description: "Créez des factures, utilisez l'IA, gérez votre CRM, et bien plus encore",
                icon: "✨"
              },
              {
                step: "3",
                title: "Votre abonnement Pro continue",
                description: "Après 4 jours, votre abonnement Pro commence automatiquement à 19.99€/mois",
                icon: "💎"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                className="flex items-start gap-6 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {item.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{item.icon}</span>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="container mx-auto max-w-3xl"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Star className="w-4 h-4 fill-current" />
              Satisfaction garantie
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Prêt à transformer votre facturation ?
            </h2>
            <p className="text-lg opacity-90 mb-8">
              Rejoignez des milliers d'entrepreneurs qui font confiance à FacturmeWeb
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleActivateTrial}
                disabled={isActivating || isActivated}
                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-full text-lg font-bold"
              >
                {isActivated ? 'Essai déjà activé' : 'Démarrer maintenant'}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
