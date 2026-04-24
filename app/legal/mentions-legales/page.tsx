'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  Mail,
  MapPin,
  Scale,
  Shield,
  Server,
  FileText,
  ArrowLeft,
  Zap,
  Users,
  Globe
} from 'lucide-react';

export default function MentionsLegales() {
  const sections = [
    {
      icon: Building2,
      title: 'Éditeur du site',
      color: 'from-blue-500 to-cyan-500',
      content: [
        { label: 'Raison sociale', value: 'Factu.me' },
        { label: 'Forme juridique', value: 'Société par actions simplifiée (SAS)' },
        { label: 'Capital social', value: 'Variable' },
        { label: 'Siège social', value: 'Paris, France' },
        { label: 'Email', value: 'contact@factu.me' },
        { label: 'Directeur de la publication', value: 'Le Président de la société' }
      ]
    },
    {
      icon: Server,
      title: 'Hébergement',
      color: 'from-purple-500 to-pink-500',
      content: [
        { label: 'Hébergeur', value: 'Vercel Inc.' },
        { label: 'Localisation', value: 'Serveurs situés en France (Paris)' },
        { label: 'Conformité', value: 'RGPD et législation française' }
      ]
    },
    {
      icon: Shield,
      title: 'Propriété intellectuelle',
      color: 'from-emerald-500 to-teal-500',
      content: [
        { label: 'Protection', value: 'Tous les éléments sont protégés par le droit d\'auteur' },
        { label: 'Interdiction', value: 'Toute reproduction même partielle est interdite' },
        { label: 'Marques', value: 'Les logos et marques sont déposés' }
      ]
    },
    {
      icon: Scale,
      title: 'Conformité légale',
      color: 'from-orange-500 to-red-500',
      content: [
        { label: 'RGPD', value: 'Conforme au Règlement (UE) 2016/679' },
        { label: 'CNIL', value: 'Déclaration auprès de la CNIL' },
        { label: 'LCEN', value: 'Conforme à la Loi pour la Confiance dans l\'Économie Numérique' },
        { label: 'Code de commerce', value: 'Respect des obligations commerciales' }
      ]
    },
    {
      icon: Users,
      title: 'Données personnelles',
      color: 'from-indigo-500 to-violet-500',
      content: [
        { label: 'Traitement', value: 'Conforme à notre politique de confidentialité' },
        { label: 'Droit d\'accès', value: 'Droit d\'accès et de rectification (RGPD)' },
        { label: 'Conservation', value: 'Durée limitée selon les obligations légales' }
      ]
    },
    {
      icon: Globe,
      title: 'Juridiction',
      color: 'from-amber-500 to-yellow-500',
      content: [
        { label: 'Droit applicable', value: 'Droit français' },
        { label: 'Compétence', value: 'Tribunaux de commerce de Paris' },
        { label: 'Médiation', value: 'Possibilité de recours à un médiateur' }
      ]
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
                Mentions Légales
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Conformément à l'article L.111-1 du Code de la consommation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Zap className="w-4 h-4" />
            Dernière mise à jour : avril 2026
          </div>
        </motion.div>

        {/* Legal Notice Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 bg-gradient-to-r from-primary/10 to-purple-600/10 dark:from-primary/20 dark:to-purple-600/20 border-2 border-primary/20 dark:border-primary/30 rounded-3xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Informations légales
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Conformément aux dispositions des articles L.111-1 et suivants du Code de la consommation,
                nous vous informons que ce site est édité par la société Factu.me, SAS immatriculée au RCS de Paris.
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

                <div className="grid md:grid-cols-2 gap-4">
                  {section.content.map((item) => (
                    <div
                      key={item.label}
                      className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5"
                    >
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        {item.label}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-12 bg-gradient-to-br from-primary to-purple-600 rounded-3xl p-8 text-white"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Mail className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Contactez-nous</h3>
                <p className="text-white/80 text-sm">
                  Pour toute question relative aux mentions légales
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
          transition={{ delay: 0.8 }}
          className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10 text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/legal/confidentialite" className="hover:text-primary transition-colors">
              Politique de confidentialité
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
