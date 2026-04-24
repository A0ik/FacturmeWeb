'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Receipt,
  ShoppingBag,
  Truck,
  Percent,
  FileCheck,
  Briefcase,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const documentCategories = [
  {
    title: 'Factures',
    description: 'Créez et gérez vos factures clients',
    icon: Receipt,
    href: '/documents/factures',
    color: 'from-blue-500/20 to-blue-600/20',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Devis',
    description: 'Créez des devis professionnels',
    icon: FileCheck,
    href: '/documents/devis',
    color: 'from-purple-500/20 to-purple-600/20',
    iconColor: 'text-purple-600',
  },
  {
    title: 'Commandes',
    description: 'Gérez vos bons de commande',
    icon: ShoppingBag,
    href: '/documents/commandes',
    color: 'from-orange-500/20 to-orange-600/20',
    iconColor: 'text-orange-600',
  },
  {
    title: 'Livraisons',
    description: 'Suivez vos livraisons',
    icon: Truck,
    href: '/documents/livraisons',
    color: 'from-indigo-500/20 to-indigo-600/20',
    iconColor: 'text-indigo-600',
  },
  {
    title: 'Acomptes',
    description: 'Gérez les paiements partiels',
    icon: Percent,
    href: '/documents/acomptes',
    color: 'from-teal-500/20 to-teal-600/20',
    iconColor: 'text-teal-600',
  },
  {
    title: 'Avoirs',
    description: 'Gérez vos notes d\'avoir',
    icon: FileText,
    href: '/documents/avoirs',
    color: 'from-rose-500/20 to-pink-600/20',
    iconColor: 'text-rose-600',
  },
];

const contractCategories = [
  {
    title: 'Contrat CDD',
    description: 'Contrat à durée déterminée',
    icon: Briefcase,
    href: '/contracts/cdd',
    color: 'from-rose-500/20 to-rose-600/20',
    iconColor: 'text-rose-600',
  },
  {
    title: 'Contrat CDI',
    description: 'Contrat à durée indéterminée',
    icon: Briefcase,
    href: '/contracts/cdi',
    color: 'from-emerald-500/20 to-emerald-600/20',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Autres Contrats',
    description: 'Stages, freelance, alternance...',
    icon: FileCheck,
    href: '/contracts/other',
    color: 'from-amber-500/20 to-amber-600/20',
    iconColor: 'text-amber-600',
  },
];

export default function DocumentsPage() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Documents
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Gérez tous vos documents commerciaux et juridiques
          </p>
        </motion.div>

        {/* Bouton Voir tous les documents */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Link
            href="/invoices"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary-dark text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <FileText size={20} />
            Voir tous les documents
          </Link>
        </motion.div>

        {/* Commercial Documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Documents Commerciaux
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentCategories.map((category, i) => {
              const Icon = category.icon;
              return (
                <motion.div
                  key={category.href}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={category.href}>
                    <div className="group h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-white/10 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-7 h-7 ${category.iconColor}`} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {category.description}
                      </p>
                      <div className="flex items-center text-primary font-semibold group-hover:gap-3 transition-all">
                        <span>Accéder</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Contract Documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Contrats de Travail
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {contractCategories.map((category, i) => {
              const Icon = category.icon;
              return (
                <motion.div
                  key={category.href}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <Link href={category.href}>
                    <div className="group h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-white/10 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-7 h-7 ${category.iconColor}`} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {category.description}
                      </p>
                      <div className="flex items-center text-primary font-semibold group-hover:gap-3 transition-all">
                        <span>Accéder</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
