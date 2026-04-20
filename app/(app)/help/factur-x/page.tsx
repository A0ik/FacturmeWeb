'use client';

import { FileText, Download, CheckCircle, AlertCircle, ExternalLink, Sparkles, Shield, Clock, Users, Zap } from 'lucide-react';

/**
 * Page d'aide Factur-X
 *
 * Documentation complète sur le format Factur-X,
 * son utilisation et ses bénéfices pour la réforme 2026+
 */

export default function FacturXHelpPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
          <Sparkles size={16} className="text-indigo-500" />
          <span className="text-sm font-bold text-indigo-700">Nouveau</span>
        </div>
        <h1 className="text-4xl font-black text-gray-900">
          Guide Factur-X
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Tout ce que vous devez savoir sur le format de facture électronique qui prépare votre entreprise à la réforme 2026+
        </p>
      </div>

      {/* Qu'est-ce que Factur-X */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <FileText size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-gray-900 mb-4">
              Qu'est-ce que Factur-X ?
            </h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong className="text-gray-900">Factur-X</strong> est un format de facture électronique hybride franco-allemand,
                basé sur la norme européenne <strong className="text-indigo-600">EN 16931</strong>.
                C'est la version française du standard allemand ZUGFeRD.
              </p>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                <h3 className="font-bold text-gray-900 mb-2">📄 Format hybride PDF + XML</h3>
                <p className="text-sm">
                  Un fichier Factur-X est un <strong>PDF standard</strong> qui contient un <strong>fichier XML embarqué</strong> dans ses métadonnées.
                  Ce fichier peut être :
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Lu par un humain</strong> : comme un PDF normal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Traité automatiquement</strong> : extraction du XML par les logiciels comptables</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Validé électroniquement</strong> : conforme aux exigences légales</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi utiliser Factur-X */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-2xl font-black text-gray-900 mb-6">
          Pourquoi utiliser Factur-X ?
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Préparez 2026</h3>
                <p className="text-sm text-gray-600">
                  La réforme de la facturation électronique devient obligatoire entre 2026 et 2029.
                  Anticipez dès maintenant !
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Gain de temps</h3>
                <p className="text-sm text-gray-600">
                  Vos clients peuvent importer directement vos factures dans leur logiciel comptable.
                  Plus de saisie manuelle !
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Conforme aux normes</h3>
                <p className="text-sm text-gray-600">
                  Profil EN 16931, reconnu par l'administration française et les logiciels comptables.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Satisfait vos clients</h3>
                <p className="text-sm text-gray-600">
                  Les grandes entreprises exigent désormais ce format pour leurs fournisseurs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comment utiliser */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-2xl font-black text-gray-900 mb-6">
          Comment utiliser Factur-X sur FacturmeWeb ?
        </h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Créez votre facture</h3>
              <p className="text-sm text-gray-600">
                Remplissez tous les champs obligatoires : numéro de facture, dates, client, lignes de facturation.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Vérifiez vos informations</h3>
              <p className="text-sm text-gray-600">
                Assurez-vous que votre SIRET et numéro de TVA sont renseignés dans les paramètres.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Cliquez sur "Factur-X"</h3>
              <p className="text-sm text-gray-600">
                Sur la page de détail de la facture, cliquez sur le bouton <strong className="text-indigo-600">Factur-X</strong> dans la barre d'actions.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Téléchargez votre fichier</h3>
              <p className="text-sm text-gray-600">
                Le PDF Factur-X est généré automatiquement et téléchargé sur votre ordinateur.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-gray-900">Disponibilité</p>
              <p className="text-gray-600">
                Le format Factur-X est réservé aux abonnements <strong className="text-indigo-600">Pro</strong> et <strong className="text-indigo-600">Business</strong>.
                Cette fonctionnalité n'est pas disponible pour les factures, devis et avoirs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Validation */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-2xl font-black text-gray-900 mb-6">
          Valider votre fichier Factur-X
        </h2>
        <p className="text-gray-600 mb-6">
          Vous pouvez vérifier que votre fichier Factur-X est conforme en utilisant l'un des validateurs recommandés par l'association FNFE-MPE :
        </p>
        <a
          href="https://fnfe-mpe.org/factur-x/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity"
        >
          <Download size={20} />
          Validateurs Factur-X (FNFE-MPE)
          <ExternalLink size={16} />
        </a>
        <p className="mt-4 text-sm text-gray-500">
          L'association FNFE-MPE (Fédération Nationale des Fibres n°FEE et Matériaux Électroniques - Mode d'Emploi) maintient une liste à jour des validateurs fiables pour vérifier la conformité au profil EN 16931.
        </p>
      </section>

      {/* Profil EN 16931 */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-2xl font-black text-gray-900 mb-6">
          Pourquoi le profil EN 16931 ?
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-bold text-gray-900">Profil</th>
                <th className="text-left py-3 px-4 font-bold text-gray-900">Usage</th>
                <th className="text-left py-3 px-4 font-bold text-gray-900">Conforme réforme 2026 ?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4 font-medium">MINIMUM</td>
                <td className="py-3 px-4 text-gray-600">Données basiques</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <AlertCircle size={14} />
                    Non
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">BASIC</td>
                <td className="py-3 px-4 text-gray-600">Avec lignes</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <AlertCircle size={14} />
                    Non
                  </span>
                </td>
              </tr>
              <tr className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <td className="py-3 px-4 font-bold text-indigo-700">EN 16931</td>
                <td className="py-3 px-4 text-gray-600">Profil complet standard</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle size={14} />
                    Oui ✅
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">EXTENDED</td>
                <td className="py-3 px-4 text-gray-600">Extensions spécifiques</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle size={14} />
                    Oui
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          FacturmeWeb utilise le profil <strong className="text-indigo-600">EN 16931</strong>, qui est le minimum recommandé
          pour être conforme à la réforme française de facturation électronique.
        </p>
      </section>

      {/* Erreurs courantes */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-2xl font-black text-gray-900 mb-6">
          Erreurs courantes à éviter
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-red-50 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} className="text-red-600" />
              <h3 className="font-bold text-gray-900">Données manquantes</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Numéro de facture</li>
              <li>• Date d'émission</li>
              <li>• Nom du client</li>
              <li>• SIRET / TVA</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-red-50 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} className="text-red-600" />
              <h3 className="font-bold text-gray-900">Dates incorrectes</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Format invalide</li>
              <li>• Date dans le futur</li>
              <li>• Date d'échéance avant émission</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-red-50 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} className="text-red-600" />
              <h3 className="font-bold text-gray-900">Taux de TVA</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Taux non standard (hors 0%, 5.5%, 10%, 20%)</li>
              <li>• TVA mal calculée</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-red-50 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} className="text-red-600" />
              <h3 className="font-bold text-gray-900">Totaux incohérents</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Sous-total ≠ somme des lignes</li>
              <li>• TVA mal calculée</li>
              <li>• Total TTC incorrect</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Ressources */}
      <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-8">
        <h2 className="text-2xl font-black text-gray-900 mb-6">
          Ressources utiles
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="https://fnfe-mpe.org/factur-x/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white rounded-xl hover:shadow-md transition-shadow"
          >
            <FileText size={24} className="text-indigo-600" />
            <div>
              <p className="font-bold text-gray-900">FNFE-MPE</p>
              <p className="text-sm text-gray-600">Association nationale Factur-X</p>
            </div>
            <ExternalLink size={16} className="ml-auto text-gray-400" />
          </a>
          <a
            href="https://www.economie.gouv.fr/files/files/directions_services/entreprehonne/Facturation_electronique/Guide_pratique_facturation_electronique.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white rounded-xl hover:shadow-md transition-shadow"
          >
            <FileText size={24} className="text-indigo-600" />
            <div>
              <p className="font-bold text-gray-900">Guide DGFiP</p>
              <p className="text-sm text-gray-600">Guide pratique facturation électronique</p>
            </div>
            <ExternalLink size={16} className="ml-auto text-gray-400" />
          </a>
        </div>
      </section>

      {/* Support */}
      <section className="text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900">
          Besoin d'aide ?
        </h2>
        <p className="text-gray-600">
          Notre support est disponible pour répondre à toutes vos questions sur Factur-X.
        </p>
        <a
          href="mailto:support@facturmeweb.com"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors"
        >
          Contacter le support
        </a>
      </section>
    </div>
  );
}
