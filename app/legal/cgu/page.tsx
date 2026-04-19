'use client';

import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';

export default function CGU() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />Retour à l&apos;accueil
        </Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-sm text-slate-400 mb-8">Dernière mise à jour : janvier 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-sm sm:text-base leading-relaxed text-slate-600">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Objet</h2>
            <p>Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;utilisation de la plateforme Factu.me, un service de facturation et de gestion d&apos;entreprise en ligne propulsé par l&apos;intelligence artificielle.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Inscription et compte</h2>
            <p>L&apos;utilisateur doit fournir des informations exactes lors de son inscription. Il est responsable de la confidentialité de ses identifiants de connexion. L&apos;utilisation du service est réservée aux personnes physiques majeures ou aux personnes morales.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Services proposés</h2>
            <p>Factu.me propose les services suivants selon le plan souscrit :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Création et gestion de factures, devis, avoirs et autres documents commerciaux</li>
              <li>Intelligence artificielle pour la génération et la modification de documents</li>
              <li>CRM et gestion de clients</li>
              <li>Scan OCR de reçus et factures fournisseurs</li>
              <li>Liens de paiement et intégration Stripe</li>
              <li>Export comptable pour les impôts français</li>
              <li>Espaces de travail collaboratifs</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Plans et tarification</h2>
            <p>Factu.me propose un plan gratuit sans engagement et des plans payants. Les tarifs sont indiqués sur la page <Link href="/#tarifs" className="text-brand-600 hover:underline">Tarifs</Link>. Le paiement est prélevé mensuellement. L&apos;utilisateur peut résilier à tout moment.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Responsabilité</h2>
            <p>Factu.me met tout en oeuvre pour assurer la disponibilité et la fiabilité du service. Toutefois, la responsabilité de Factu.me ne saurait être engagée en cas de force majeure, de panne technique ou d&apos;interruption de service. L&apos;utilisateur reste seul responsable du contenu de ses documents commerciaux.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Propriété intellectuelle</h2>
            <p>L&apos;ensemble des éléments composant la plateforme (logiciels, designs, textes, marques) appartient à Factu.me. L&apos;utilisateur conserve la pleine propriété des données qu&apos;il saisit.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Résiliation</h2>
            <p>L&apos;utilisateur peut supprimer son compte à tout moment depuis les paramètres. La suppression entraîne la perte définitive des données. Un export préalable est recommandé.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Droit applicable</h2>
            <p>Les présentes CGU sont soumises au droit français. Tout différend sera soumis à la compétence exclusive des tribunaux de Paris.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 px-5 py-2.5 rounded-xl transition-colors">
            <Zap className="w-4 h-4" />Retour sur Factu.me
          </Link>
        </div>
      </div>
    </div>
  );
}
