'use client';

import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';

export default function Confidentialite() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />Retour à l&apos;accueil
        </Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">Politique de Confidentialité</h1>
        <p className="text-sm text-slate-400 mb-8">Dernière mise à jour : janvier 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-sm sm:text-base leading-relaxed text-slate-600">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Responsable du traitement</h2>
            <p>Factu.me, société par actions simplifiée, est le responsable du traitement des données personnelles collectées sur la plateforme.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Données collectées</h2>
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Données d&apos;inscription :</strong> nom, prénom, adresse email, mot de passe (chiffré)</li>
              <li><strong>Données professionnelles :</strong> nom de l&apos;entreprise, SIRET, adresse, secteur d&apos;activité</li>
              <li><strong>Données d&apos;utilisation :</strong> documents créés, clients, historique de connexion</li>
              <li><strong>Données de paiement :</strong> traitées directement par Stripe (Factu.me ne stocke aucune donnée bancaire)</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Finalités du traitement</h2>
            <p>Les données sont utilisées pour :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fournir et améliorer le service de facturation</li>
              <li>Assurer le support technique</li>
              <li>Se conformer aux obligations légales et fiscales</li>
              <li>Communiquer sur les mises à jour du service (avec consentement)</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Sécurité des données</h2>
            <p>Toutes les données sont chiffrées en transit (TLS 1.3) et au repos (AES-256). Les serveurs sont localisés en France, à Paris. Chaque utilisateur ne peut accéder qu&apos;à ses propres données grâce à des règles d&apos;isolation strictes (Row Level Security).</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Durée de conservation</h2>
            <p>Les données sont conservées pendant la durée du contrat, puis supprimées dans un délai de 30 jours après la résiliation du compte. Les données fiscales sont conservées selon les obligations légales en vigueur (10 ans).</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données</li>
              <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
              <li><strong>Droit à l&apos;effacement :</strong> demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité :</strong> exporter vos données dans un format structuré</li>
              <li><strong>Droit d&apos;opposition :</strong> vous opposer au traitement de vos données</li>
            </ul>
            <p>Pour exercer ces droits, contactez-nous à : <strong>privacy@factu.me</strong></p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Sous-traitants</h2>
            <p>Factu.me fait appel aux sous-traitants suivants :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Supabase :</strong> hébergement et base de données (serveurs à Paris)</li>
              <li><strong>Stripe :</strong> traitement des paiements (conforme PCI-DSS)</li>
              <li><strong>Vercel :</strong> hébergement de l&apos;application</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Contact</h2>
            <p>Pour toute question relative à la présente politique, contactez-nous à : <strong>privacy@factu.me</strong></p>
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
