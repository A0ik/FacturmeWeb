'use client';

import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />Retour à l&apos;accueil
        </Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-8">Mentions légales</h1>
        <div className="prose prose-slate max-w-none space-y-6 text-sm sm:text-base leading-relaxed text-slate-600">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Éditeur du site</h2>
            <p><strong>Raison sociale :</strong> Factu.me</p>
            <p><strong>Forme juridique :</strong> Société par actions simplifiée (SAS)</p>
            <p><strong>Siège social :</strong> Paris, France</p>
            <p><strong>Email :</strong> contact@factu.me</p>
            <p><strong>Directeur de la publication :</strong> Le président de la société</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Hébergement</h2>
            <p>Le site est hébergé en France. Les données sont stockées sur des serveurs localisés à Paris, conformément à la législation française et européenne.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Propriété intellectuelle</h2>
            <p>L&apos;ensemble des contenus présents sur le site (textes, images, logos, design) est protégé par le droit d&apos;auteur et le droit des marques. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Données personnelles</h2>
            <p>Les données personnelles collectées sont traitées conformément à notre <Link href="/legal/confidentialite" className="text-brand-600 hover:underline">politique de confidentialité</Link> et au Règlement Général sur la Protection des Données (RGPD).</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Cookies</h2>
            <p>Le site utilise des cookies strictement nécessaires au fonctionnement du service. Aucun cookie publicitaire n&apos;est déposé. Pour plus d&apos;informations, consultez notre politique de confidentialité.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Droit applicable</h2>
            <p>Le présent site est soumis au droit français. Tout litige relatif à l&apos;utilisation du site sera de la compétence exclusive des tribunaux de Paris.</p>
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
