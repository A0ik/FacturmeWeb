'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  Eye,
  Database,
  Lock,
  Clock,
  UserCheck,
  Building,
  Mail,
  ArrowLeft,
  Zap,
  AlertCircle,
  CheckCircle,
  FileText
} from 'lucide-react';

export default function Confidentialite() {
  const sections = [
    {
      icon: UserCheck,
      title: '1. Responsable du traitement',
      color: 'from-blue-500 to-cyan-500',
      content: `
        <p class="mb-3">La société <strong class="text-primary">Factu.me</strong>, SAS au capital variable, immatriculée au RCS de Paris, est le responsable du traitement des données personnelles collectées sur la plateforme.</p>
        <p><strong>Adresse de contact :</strong> <a href="mailto:contact@factu.me" class="text-primary hover:underline">contact@factu.me</a></p>
      `
    },
    {
      icon: Database,
      title: '2. Données collectées',
      color: 'from-purple-500 to-pink-500',
      items: [
        {
          subtitle: 'Données d\'inscription',
          description: 'Nom, prénom, adresse email, mot de passe (chiffré)'
        },
        {
          subtitle: 'Données professionnelles',
          description: 'Nom de l\'entreprise, SIRET, adresse, secteur d\'activité'
        },
        {
          subtitle: 'Données d\'utilisation',
          description: 'Documents créés, clients, historique de connexion'
        },
        {
          subtitle: 'Données de paiement',
          description: 'Traitées directement par Stripe (PCI-DSS compliant) - Factu.me ne stocke aucune donnée bancaire'
        }
      ]
    },
    {
      icon: Eye,
      title: '3. Finalités du traitement',
      color: 'from-emerald-500 to-teal-500',
      items: [
        { subtitle: 'Fourniture du service', description: 'Création et gestion de documents commerciaux' },
        { subtitle: 'Support technique', description: 'Assistance et amélioration du service' },
        { subtitle: 'Conformité légale', description: 'Obligations fiscales et comptables' },
        { subtitle: 'Communication', description: 'Avec consentement préalable pour les newsletters' }
      ]
    },
    {
      icon: Lock,
      title: '4. Sécurité des données',
      color: 'from-orange-500 to-red-500',
      content: `
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle class="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">Chiffrement</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">TLS 1.3 en transit, AES-256 au repos</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle class="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">Localisation</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Serveurs hébergés en France (Paris)</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle class="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">Isolement</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">Row Level Security (RLS) pour chaque utilisateur</p>
            </div>
          </div>
        </div>
      `
    },
    {
      icon: Clock,
      title: '5. Durée de conservation',
      color: 'from-indigo-500 to-violet-500',
      content: `
        <div class="space-y-3">
          <p>Les données sont conservées pendant la durée du contrat, puis :</p>
          <ul class="space-y-2">
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Compte actif :</strong> Conservation illimitée durant la souscription</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Après résiliation :</strong> Suppression dans un délai de 30 jours</span>
            </li>
            <li class="flex items-start gap-2">
              <CheckCircle class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span><strong class="text-gray-900 dark:text-white">Données fiscales :</strong> Conservation de 10 ans (obligation légale)</span>
            </li>
          </ul>
        </div>
      `
    },
    {
      icon: Shield,
      title: '6. Vos droits (RGPD)',
      color: 'from-amber-500 to-yellow-500',
      items: [
        {
          subtitle: 'Droit d\'accès (Article 15)',
          description: 'Obtenir une copie de vos données personnelles'
        },
        {
          subtitle: 'Droit de rectification (Article 16)',
          description: 'Corriger des données inexactes ou incomplètes'
        },
        {
          subtitle: 'Droit à l\'effacement (Article 17)',
          description: 'Demander la suppression de vos données (« droit à l\'oubli »)'
        },
        {
          subtitle: 'Droit à la portabilité (Article 20)',
          description: 'Exporter vos données dans un format structuré'
        },
        {
          subtitle: 'Droit d\'opposition (Article 21)',
          description: 'Vous opposer au traitement de vos données'
        }
      ]
    },
    {
      icon: Building,
      title: '7. Sous-traitants',
      color: 'from-rose-500 to-pink-600',
      content: `
        <div class="space-y-3">
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-1">Supabase</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Hébergement et base de données (serveurs à Paris) - Conforme RGPD</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-1">Stripe</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Traitement des paiements (conforme PCI-DSS Level 1)</p>
          </div>
          <div class="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p class="font-semibold text-gray-900 dark:text-white mb-1">Vercel</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Hébergement de l\'application (infrastructures certifiées ISO 27001)</p>
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
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Politique de Confidentialité
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Conformément au RGPD (Règlement UE 2016/679)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Zap className="w-4 h-4" />
            Dernière mise à jour : avril 2026
          </div>
        </motion.div>

        {/* GDPR Compliance Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 bg-gradient-to-r from-primary/10 to-purple-600/10 dark:from-primary/20 dark:to-purple-600/20 border-2 border-primary/20 dark:border-primary/30 rounded-3xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Protection de vos données
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Factu.me s\'engage à protéger vos données personnelles et à respecter votre vie privée.
                Cette politique décrit comment nous collectons, utilisons et sécurisons vos informations.
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
                transition={{ delay: 0.1 * index }}
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

        {/* Exercise Rights Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 bg-gradient-to-br from-primary to-purple-600 rounded-3xl p-8 text-white"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Mail className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Exercez vos droits</h3>
                <p className="text-white/80 text-sm">
                  Pour exercer vos droits RGPD, contactez-nous
                </p>
              </div>
            </div>

            <a
              href="mailto:contact@factu.me"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors"
            >
              <Mail className="w-5 h-5" />
              contact@factu.me
            </a>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10 text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/legal/mentions-legales" className="hover:text-primary transition-colors">
              Mentions légales
            </Link>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <Link href="/legal/cgu" className="hover:text-primary transition-colors">
              Conditions Générales d'Utilisation
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
