import { Shield, CheckCircle2, AlertTriangle, Info, FileText, Users, Building2, Clock, ArrowRight, ExternalLink, Award, Lock, Send } from 'lucide-react';
import Link from 'next/link';

export default function PDPHelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Conformité PDP</h1>
              <p className="text-sm text-gray-600">Plateforme de Dématérialisation Partagée</p>
            </div>
          </div>
          <p className="text-gray-700">
            Toutes les informations nécessaires pour que vos factures soient conformes à la réglementation française
            sur la facture électronique et prêtes pour la transmission à la PDP de l'État.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* What is PDP */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Info size={20} className="text-blue-600" />
              Qu'est-ce que la PDP ?
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-gray-700">
              La <strong>Plateforme de Dématérialisation Partagée (PDP)</strong> est le dispositif mis en place par l'État français
              pour la réforme de la facture électronique. Cette réforme, qui s'applique progressivement jusqu'en 2026,
              vise à lutter contre la fraude à la TVA.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-800 mb-1">Calendrier de déploiement</p>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• <strong>2024</strong> : Entreprises assujetties à la TVA (≥10 M€ CA)</li>
                    <li>• <strong>2025</strong> : Entreprises assujetties à la TVA (CA entre thresholds)</li>
                    <li>• <strong>2026</strong> : Toutes les entreprises assujetties à la TVA</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Required Information */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-emerald-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-600" />
              Informations obligatoires PDP
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                Vendeur (votre entreprise)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoItem label="Nom de l'entreprise" required />
                <InfoItem label="SIRET (14 chiffres)" required />
                <InfoItem label="Numéro TVA intracommunautaire" required />
                <InfoItem label="Adresse complète" required />
                <InfoItem label="Code postal" required />
                <InfoItem label="Ville" required />
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Users size={18} className="text-primary" />
                Client
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoItem label="Nom du client" required />
                <InfoItem label="SIRET client (14 chiffres)" required />
                <InfoItem label="Numéro TVA client" required />
                <InfoItem label="Adresse complète" required />
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                Facture
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <InfoItem label="Numéro de facture" required />
                <InfoItem label="Date d'émission" required />
                <InfoItem label="Date d'échéance" recommended />
              </div>
            </div>
          </div>
        </section>

        {/* Factur-X */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4 border-b border-violet-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Award size={20} className="text-violet-600" />
              Factur-X : Le format hybride
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-gray-700">
              <strong>Factur-X</strong> (aussi appelé ZUGFeRD en Allemagne) est un format de facture électronique hybride
              qui combine un PDF lisible par un humain avec des données XML structurées intégrées.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="font-bold text-emerald-800">Conforme EN 16931</span>
                </div>
                <p className="text-sm text-emerald-700">Norme européenne pour l'interopérabilité</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-blue-600" />
                  <span className="font-bold text-blue-800">PDF + XML</span>
                </div>
                <p className="text-sm text-blue-700">Lisible par humains ET logiciels</p>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-violet-600" />
                  <span className="font-bold text-violet-800">Prêt pour PDP</span>
                </div>
                <p className="text-sm text-violet-700">Toutes les infos obligatoires incluses</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Lock size={20} className="text-amber-600" />
              Sécurité et traçabilité
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-700 mb-4">
              FacturMe assure la sécurité et la traçabilité de toutes les opérations Factur-X :
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Logs d'audit</p>
                  <p className="text-sm text-gray-600">Chaque génération, téléchargement et envoi est enregistré</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Validation PDP automatique</p>
                  <p className="text-sm text-gray-600">Vérification en temps réel de la conformité</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Envoi sécurisé par email</p>
                  <p className="text-sm text-gray-600">Transmission directe à vos clients avec Factur-X attaché</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-br from-primary via-primary-dark to-primary rounded-2xl p-8 text-center text-white shadow-xl">
          <h2 className="text-2xl font-black mb-3">Prêt pour la facture électronique ?</h2>
          <p className="text-white/90 mb-6">
            Créez votre première facture conforme PDP maintenant
          </p>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Créer une facture
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* Resources */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
          <h3 className="font-bold text-gray-900 mb-4">Ressources utiles</h3>
          <div className="space-y-3">
            <a
              href="https://www.economie.gouv.fr/files/files/2023/contributions/facture-electronique/FS-facture-electronique.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-gray-700 hover:text-primary transition-colors group"
            >
              <ExternalLink size={16} className="text-gray-400 group-hover:text-primary flex-shrink-0" />
              <span className="text-sm">Fiche officielle - Facture électronique (economie.gouv.fr)</span>
            </a>
            <a
              href="https://fnfe-mpe.org/factur-x/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-gray-700 hover:text-primary transition-colors group"
            >
              <ExternalLink size={16} className="text-gray-400 group-hover:text-primary flex-shrink-0" />
              <span className="text-sm">Comité Français Factur-X (FNFE-MPE)</span>
            </a>
            <Link
              href="/help/factur-x"
              className="flex items-center gap-3 text-gray-700 hover:text-primary transition-colors group"
            >
              <ExternalLink size={16} className="text-gray-400 group-hover:text-primary flex-shrink-0" />
              <span className="text-sm">Guide complet Factur-X sur FacturMe</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, required, recommended }: { label: string; required?: boolean; recommended?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {required && <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />}
      {recommended && <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />}
      <span className={required ? "text-gray-900 font-medium" : "text-gray-700"}>{label}</span>
      {required && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Obligatoire</span>}
      {recommended && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Recommandé</span>}
    </div>
  );
}
