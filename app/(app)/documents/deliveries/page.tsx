'use client';

import { motion } from 'framer-motion';
import { Truck, Clock } from 'lucide-react';
import Link from 'next/link';

export default function DeliveriesPage() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Truck className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Bons de Livraison
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Gérez vos livraisons clients
          </p>

          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl p-8 border border-primary/20">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-accent animate-pulse" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Bientôt disponible
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Cette fonctionnalité est en cours de développement. Vous pourrez bientôt :
            </p>
            <ul className="text-left space-y-3 max-w-md mx-auto mb-8">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Créer des bons de livraison</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Lier aux commandes</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Suivi des expéditions</span>
              </li>
            </ul>
            <Link
              href="/documents"
              className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Retour aux documents
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
