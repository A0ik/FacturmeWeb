'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText,
  User,
  Briefcase,
  CreditCard,
  Scale,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Zap,
  CheckCircle,
  Sparkles,
  Shield
} from 'lucide-react';

export default function CGU() {
  const sections = [
    {
      icon: FileText,
      title: '1. Objet des CGU',
      color: 'from-blue-500 to-cyan-500',
      content: `
        <p class="mb-3">Les présentes <strong class="text-primary">Conditions Générales d'Utilisation (CGU)</strong> régissent l'utilisation de la plateforme Factu.me, un service de facturation et de gestion d'entreprise en ligne propulsé par l'intelligence artificielle.</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">En vous inscrivant sur Factu.me, vous acceptez sans réserve les présentes CGU dans leur intégralité.</p>
      `
    },
    {
      icon: User,
      title: '2. Inscription et compte utilisateur',
      color: 'from-purple-500 to-pink-500',
      items: [
        {
          subtitle: 'Conditions d\'inscription',
          description: 'L\'utilisateur doit fournir des informations exactes, complètes et à jour lors de son inscription'
        },
        {
          subtitle: 'Capacité et âge',
          description: 'Le service est réservé aux personnes physiques majeures (18 ans et plus) ou aux personnes morales'
        },
        {
          subtitle: 'Identifiants de connexion',
          description: 'L\'utilisateur est responsable de la confidentialité de ses identifiants et de toute utilisation de son compte'
        },
        {
          subtitle: 'Compte individuel',
          description: 'Chaque compte est personnel et ne peut être partagé avec des tiers'
        }
      ]
    },
    {
      icon: Briefcase,
      title: '3. Services proposés',
      color: 'from-emerald-500 to-teal-500',
      items: [
        { subtitle: 'Facturation', description: 'Création et gestion de factures, devis, avoirs et autres documents commerciaux' },
        { subtitle: 'Intelligence Artificielle', description: 'Génération et modification intelligente de documents par IA' },
        { subtitle: 'CRM', description: 'Gestion de la base clients et historique commercial' },
        { subtitle: 'Scan OCR', description: 'Numérisation automatique de reçus et factures fournisseurs' },
        { subtitle: 'Paiements', description: 'Liens de paiement sécurisés et intégration Stripe' },
        { subtitle: 'Export comptable', description: 'Génération de exports conformes aux obligations fiscales françaises' },
        { subtitle: 'Espaces collaboratifs', description: 'Workspaces pour équipes et comptables' }
      ]
    },
    {
      icon: CreditCard,
      title: '4. Plans et tarification',
      color: 'from-orange-500 to-red-500',
      content: `
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Plan gratuit :</strong> Accès sans engagement aux fonctionnalités de base</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Plans payants :</strong> Accès étendu selon le plan souscrit (voir page Tarifs)</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Paiement :</strong> Prélèvement mensuel par Stripe (CB ou autre moyen)</span>
          </div>
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Résiliation :</strong> Possibilité de résilier à tout moment sans pénalité</span>
          </div>
        </div>
      `
    },
    {
      icon: AlertTriangle,
      title: '5. Responsabilités et obligations',
      color: 'from-indigo-500 to-violet-500',
      items: [
        {
          subtitle: 'Responsabilité de Factu.me',
          description: 'Mise en œuvre de tous les moyens raisonnables pour assurer la disponibilité, la sécurité et la performance du service'
        },
        {
          subtitle: 'Limitations de responsabilité',
          description: 'Factu.me ne peut être tenu responsable en cas de force majeure, panne technique, interruption de service ou perte de données'
        },
        {
          subtitle: 'Responsabilité de l\'utilisateur',
          description: 'L\'utilisateur reste seul responsable du contenu de ses documents commerciaux et de leur conformité légale'
        },
        {
          subtitle: 'Utilisation conforme',
          description: 'L\'utilisateur s\'engage à n\'utiliser le service que dans le respect des lois et règlements en vigueur'
        }
      ]
    },
    {
      icon: Scale,
      title: '6. Propriété intellectuelle',
      color: 'from-amber-500 to-yellow-500',
      content: `
        <div class="space-y-3">
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-1">Droits de Factu.me</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">L\'ensemble des éléments composant la plateforme (logiciels, designs, textes, marques, base de données) appartient à Factu.me et est protégé par le droit d\'auteur et le droit des marques.</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-1">Droits de l\'utilisateur</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">L\'utilisateur conserve la pleine propriété des données qu\'il saisit et des documents qu\'il crée. Factu.me ne revendique aucun droit sur ces contenus.</p>
          </div>
        </div>
      `
    },
    {
      icon: Shield,
      title: '7. Protection des données',
      color: 'from-rose-500 to-pink-600',
      content: `
        <p class="mb-3">Les données personnelles sont traitées conformément à notre <a href="/legal/confidentialite" class="text-primary hover:underline">Politique de Confidentialité</a> et au Règlement Général sur la Protection des Données (RGPD).</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
            <p class="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Traitement</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Conforme RGPD</p>
          </div>
          <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
            <p class="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Localisation</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">Serveurs en France</p>
          </div>
        </div>
      `
    },
    {
      icon: Trash2,
      title: '8. Résiliation et suppression',
      color: 'from-cyan-500 to-blue-600',
      content: `
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Résiliation à tout moment :</strong> L\'utilisateur peut supprimer son compte depuis les paramètres</span>
          </div>
          <div class="flex items-start gap-3">
            <AlertTriangle class="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Suppression définitive :</strong> La suppression entraîne la perte définitive des données</span>
          </div>
          <div class="flex items-start gap-3">
            <Sparkles class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span><strong class="text-gray-900 dark:text-white">Export recommandé :</strong> Un export préalable des données est recommandé avant suppression</span>
          </div>
        </div>
      `
    },
    {
      icon: Scale,
      title: '9. Droit applicable et juridiction',
      color: 'from-violet-500 to-purple-600',
      content: `
        <div class="space-y-3">
          <p class="mb-2">Les présentes CGU sont soumises au <strong class="text-primary">droit français</strong>.</p>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-2">En cas de litige :</p>
            <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• Tentative de résolution à l\'amiable</li>
              <li>• Recours possible à un médiateur</li>
              <li>• Compétence exclusive des tribunaux de commerce de Paris</li>
            </ul>
          </div>
        </div>
      `
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Conditions Générales d'Utilisation
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                CGU de la plateforme Factu.me
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Zap className="w-4 h-4" />
            Dernière mise à jour : avril 2026
          </div>
        </motion.div>

        {/* Acceptance Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 bg-gradient-to-r from-primary/10 to-purple-600/10 dark:from-primary/20 dark:to-purple-600/20 border-2 border-primary/20 dark:border-primary/30 rounded-3xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Acceptation des CGU
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                En créant un compte sur Factu.me, vous reconnaissez avoir lu, compris et accepté les présentes Conditions Générales d'Utilisation.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Legal Sections */}
        <div className="grid gap-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {section.title}
                  </h2>
                </div>

                <div className="text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">
                  {section.content && (
                    <div dangerouslySetInnerHTML={{ __html: section.content }} />
                  )}

                  {section.items && (
                    <div className="grid gap-4">
                      {section.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5"
                        >
                          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                            {item.subtitle}
                          </p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-gradient-to-br from-primary to-purple-600 rounded-3xl p-8 text-white"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Questions sur les CGU ?</h3>
                <p className="text-white/80 text-sm">
                  Notre équipe est à votre disposition pour toute question
                </p>
              </div>
            </div>

            <a
              href="mailto:contact@factu.me"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors"
            >
              Contactez-nous
            </a>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10 text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/legal/mentions-legales" className="hover:text-primary transition-colors">
              Mentions légales
            </Link>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <Link href="/legal/confidentialite" className="hover:text-primary transition-colors">
              Politique de confidentialité
            </Link>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Retour sur Factu.me
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
