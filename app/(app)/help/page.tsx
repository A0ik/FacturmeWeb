'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Search, ChevronDown, ChevronUp, FileText, Users, CreditCard,
  Mic, BarChart3, Settings, Mail, Shield, Zap, Globe, ArrowUpRight,
  MessageCircle, BookOpen, Video, HelpCircle, ChevronRight,
  Building2, Download, RefreshCw, Kanban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQ {
  q: string;
  a: string;
}

const CATEGORIES = [
  {
    id: 'start',
    icon: Zap,
    label: 'Démarrage',
    color: 'text-primary',
    bg: 'bg-primary-light',
    faqs: [
      { q: 'Comment créer ma première facture ?', a: 'Cliquez sur "Factures" dans le menu, puis sur le bouton "Nouveau". Vous pouvez soit dicter votre facture à voix haute (plan Solo/Pro), soit la saisir manuellement. Renseignez le client, les prestations, les dates et cliquez sur "Créer la facture".' },
      { q: 'Comment ajouter mon logo et mes infos d\'entreprise ?', a: 'Rendez-vous dans Paramètres (icône en bas du menu). Dans la section "Entreprise", vous pouvez uploader votre logo, renseigner vos coordonnées, SIRET, numéro de TVA, et vos coordonnées bancaires. Ces informations apparaîtront automatiquement sur toutes vos factures.' },
      { q: 'Comment créer un client ?', a: 'Allez dans la section "Clients" et cliquez sur "Nouveau client". Vous pouvez également créer un client directement lors de la création d\'une facture en tapant son nom.' },
      { q: 'Quelle est la différence entre Facture, Devis et Avoir ?', a: 'Une Facture est un document de paiement définitif. Un Devis est une proposition commerciale non engageante. Un Avoir (note de crédit) annule tout ou partie d\'une facture déjà émise, par exemple en cas de remboursement.' },
    ],
  },
  {
    id: 'invoices',
    icon: FileText,
    label: 'Facturation',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    faqs: [
      { q: 'Comment envoyer une facture par email ?', a: 'Depuis la page de détail d\'une facture (cliquez dessus dans la liste), utilisez le bouton "Envoyer par email". Votre client recevra un email professionnel avec la facture en PDF.' },
      { q: 'Comment relancer un client pour une facture impayée ?', a: 'Sur la page de détail d\'une facture au statut "Envoyée" ou "En retard", un bouton "Relancer" apparaît. Cliquez dessus pour envoyer automatiquement un email de relance poli à votre client.' },
      { q: 'Comment marquer une facture comme payée ?', a: 'Ouvrez la facture depuis la liste, puis utilisez le bouton "Marquer comme payée". Vous pouvez aussi filtrer par statut dans la liste pour retrouver rapidement vos factures impayées.' },
      { q: 'Comment partager une facture sans email ?', a: 'Chaque facture dispose d\'un lien de partage public sécurisé. Sur la page de détail, cliquez sur "Partager" pour copier le lien. Votre client pourra consulter et télécharger la facture sans se connecter.' },
      { q: 'Comment numéroter mes factures ?', a: 'La numérotation est automatique selon votre préfixe (ex: FACT-2024-001). Vous pouvez personnaliser le préfixe dans Paramètres → Facturation.' },
    ],
  },
  {
    id: 'clients',
    icon: Users,
    label: 'Clients',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    faqs: [
      { q: 'Comment voir toutes les factures d\'un client ?', a: 'Cliquez sur un client dans la liste pour accéder à sa fiche détaillée. Vous y verrez l\'historique complet des factures, le chiffre d\'affaires encaissé et les montants en attente.' },
      { q: 'Comment valider le SIRET d\'un client ?', a: 'Lors de la saisie du SIRET, Factu.me valide automatiquement le format (14 chiffres). Pour une vérification officielle, consultez le site infogreffe.fr.' },
      { q: 'Comment exporter mes clients en CSV ?', a: 'Dans la liste des clients, cliquez sur le bouton "Export" en haut à droite. Un fichier CSV avec toutes vos données clients sera téléchargé immédiatement.' },
    ],
  },
  {
    id: 'voice',
    icon: Mic,
    label: 'Dictée vocale IA',
    color: 'text-green-600',
    bg: 'bg-green-50',
    faqs: [
      { q: 'Comment fonctionne la dictée vocale ?', a: 'Disponible avec les plans Solo et Pro. Cliquez sur "Créer une facture" puis sur le microphone. Parlez naturellement ("Facture pour Dupont SA, développement site web, 5 jours à 500€"). L\'IA Groq analyse votre audio et remplit automatiquement tous les champs.' },
      { q: 'Dans quelle langue puis-je dicter ?', a: 'Factu.me comprend le français et l\'anglais. Dictez dans la langue de votre choix, l\'IA s\'adapte automatiquement.' },
      { q: 'Que faire si la dictée n\'est pas précise ?', a: 'Parlez clairement en articulant les chiffres et noms de clients. Après traitement, tous les champs restent modifiables avant de créer la facture.' },
    ],
  },
  {
    id: 'recurring',
    icon: RefreshCw,
    label: 'Factures récurrentes',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    faqs: [
      { q: 'Comment créer une facture récurrente ?', a: 'Dans la section "Récurrentes", cliquez sur "Nouvelle récurrence". Définissez le client, les prestations et la fréquence (hebdomadaire, mensuelle, trimestrielle, annuelle). La facture sera générée automatiquement à chaque échéance.' },
      { q: 'Puis-je désactiver temporairement une récurrence ?', a: 'Oui, chaque facture récurrente dispose d\'un interrupteur pour la mettre en pause sans la supprimer. Vous pourrez la réactiver quand vous le souhaitez.' },
    ],
  },
  {
    id: 'crm',
    icon: Kanban,
    label: 'Pipeline commercial',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    faqs: [
      { q: 'À quoi sert le Pipeline ?', a: 'Le Pipeline (CRM) vous permet de suivre vos opportunités commerciales de la prospection à la signature. Chaque deal passe par les étapes : Prospect → Qualifié → Proposition → Négociation → Gagné/Perdu.' },
      { q: 'Comment déplacer un deal d\'une colonne à l\'autre ?', a: 'Glissez-déposez la carte du deal vers la colonne souhaitée. Vous pouvez aussi cliquer sur "Modifier" et changer l\'étape manuellement. La probabilité de closing se met à jour automatiquement.' },
      { q: 'Qu\'est-ce que le "Pipeline pondéré" ?', a: 'C\'est la somme de vos deals en cours, chacun multiplié par sa probabilité de closing. C\'est votre revenu prévisionnel réaliste. Ex: un deal de 10 000€ à 50% = 5 000€ dans le pipeline pondéré.' },
    ],
  },
  {
    id: 'accounting',
    icon: Download,
    label: 'Comptabilité',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    faqs: [
      { q: 'Qu\'est-ce que l\'export FEC ?', a: 'Le Fichier des Écritures Comptables (FEC) est un format réglementaire français que votre expert-comptable peut importer directement. Il contient toutes vos écritures de ventes et encaissements, conformément aux exigences de la DGFiP.' },
      { q: 'Comment générer mon FEC ?', a: 'Dans Paramètres → Export comptabilité, sélectionnez l\'année et cliquez sur "FEC [année]". Le fichier est téléchargé immédiatement. Vous pouvez l\'envoyer directement à votre comptable.' },
      { q: 'Quels comptes comptables sont utilisés ?', a: 'Les comptes suivent le Plan Comptable Général français : 411000 (Clients), 706000 (Prestations de services), 445710 (TVA collectée), 512000 (Banque).' },
    ],
  },
  {
    id: 'plans',
    icon: CreditCard,
    label: 'Abonnements',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    faqs: [
      { q: 'Quels sont les différents plans ?', a: 'Plan Gratuit : 3 factures/mois, fonctions de base.\nPlan Solo (9€/mois) : Factures illimitées, dictée vocale IA, factures récurrentes.\nPlan Pro (19€/mois) : Tout Solo + templates premium, Stripe Connect, accès workspace équipe.' },
      { q: 'Comment passer à un plan payant ?', a: 'Cliquez sur "Passer à Pro" dans le menu ou dans Paramètres. Le paiement est sécurisé par Stripe. Vous pouvez annuler à tout moment depuis les paramètres.' },
      { q: 'Mes données sont-elles conservées si je résilie ?', a: 'Oui, vos factures et clients sont conservés. Votre compte repasse en plan Gratuit avec les limitations associées.' },
    ],
  },
  {
    id: 'workspace',
    icon: Building2,
    label: 'Workspace équipe',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    faqs: [
      { q: 'Comment inviter un collaborateur dans mon workspace ?', a: 'Allez dans "Workspace" dans le menu, créez d\'abord un workspace si vous n\'en avez pas encore, puis cliquez sur "Inviter". Entrez l\'email de votre collaborateur et choisissez son rôle. Il recevra un email avec un lien d\'invitation.' },
      { q: 'Quels sont les rôles disponibles ?', a: 'Propriétaire : accès total. Administrateur : gère les membres et paramètres. Membre : crée et modifie factures/clients. Lecteur : consultation uniquement.' },
      { q: 'Les membres peuvent-ils voir toutes mes factures ?', a: 'Par défaut, tous les membres actifs du workspace ont accès aux données selon leur rôle. Le propriétaire peut ajuster les permissions dans les paramètres du workspace.' },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    label: 'Sécurité & données',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    faqs: [
      { q: 'Où sont stockées mes données ?', a: 'Vos données sont hébergées sur Supabase (infrastructure AWS), dans des datacenters situés en Europe (eu-west-3, Paris). Toutes les communications sont chiffrées via TLS.' },
      { q: 'Comment supprimer mon compte ?', a: 'Dans Paramètres → Compte, cliquez sur "Supprimer le compte". Cette action est irréversible et supprime définitivement toutes vos données (factures, clients, profil).' },
      { q: 'Factu.me est-il conforme au RGPD ?', a: 'Oui. Vos données ne sont jamais vendues à des tiers. Vous pouvez demander l\'export ou la suppression de vos données à tout moment via les paramètres.' },
    ],
  },
];

function FAQItem({ faq, idx }: { faq: FAQ; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('border-b border-gray-100 last:border-0', open && 'bg-gray-50/50')}>
      <button
        className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left group hover:bg-gray-50/80 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={cn('text-sm font-semibold transition-colors', open ? 'text-primary' : 'text-gray-800 group-hover:text-gray-900')}>
          {faq.q}
        </span>
        <span className={cn('flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors', open ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400')}>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{faq.a}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = CATEGORIES.map((cat) => ({
    ...cat,
    faqs: cat.faqs.filter(
      (f) =>
        !search ||
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => !search || cat.faqs.length > 0);

  const visibleCats = activeCategory
    ? filtered.filter((c) => c.id === activeCategory)
    : filtered;

  const totalFaqs = CATEGORIES.reduce((s, c) => s + c.faqs.length, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Centre d'aide</h1>
        <p className="text-sm text-gray-400 mt-0.5">{totalFaqs} questions / réponses pour maîtriser Factu.me</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher dans l'aide..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setActiveCategory(null); }}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
        />
      </div>

      {/* Quick links */}
      {!search && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={cn(
                  'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all',
                  activeCategory === cat.id
                    ? 'border-primary bg-primary-light shadow-sm'
                    : 'border-gray-100 bg-white hover:border-primary/30 hover:bg-gray-50 shadow-sm',
                )}
              >
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', cat.bg)}>
                  <Icon size={14} className={cat.color} />
                </div>
                <span className={cn('text-xs font-semibold', activeCategory === cat.id ? 'text-primary' : 'text-gray-700')}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* FAQs */}
      <div className="space-y-3">
        {visibleCats.map((cat) => {
          if (cat.faqs.length === 0) return null;
          const Icon = cat.icon;
          return (
            <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', cat.bg)}>
                  <Icon size={15} className={cat.color} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{cat.label}</h3>
                <span className="ml-auto text-[11px] font-semibold text-gray-400">{cat.faqs.length} question{cat.faqs.length !== 1 ? 's' : ''}</span>
              </div>
              <div>
                {cat.faqs.map((faq, idx) => (
                  <FAQItem key={idx} faq={faq} idx={idx} />
                ))}
              </div>
            </div>
          );
        })}

        {search && filtered.every((c) => c.faqs.length === 0) && (
          <div className="text-center py-12">
            <HelpCircle size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400">Aucun résultat pour « {search} »</p>
            <p className="text-sm text-gray-300 mt-1">Essayez d'autres mots-clés</p>
          </div>
        )}
      </div>

      {/* Contact block */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a
          href="mailto:support@facturme.app"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:border-primary/30 hover:shadow-md transition-all group shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
            <Mail size={17} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">Email support</p>
            <p className="text-xs text-gray-400 mt-0.5">Réponse sous 24h</p>
          </div>
          <ChevronRight size={14} className="text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </a>

        <a
          href="https://github.com/A0ik/FacturmeWeb/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:border-primary/30 hover:shadow-md transition-all group shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <BookOpen size={17} className="text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">Signaler un bug</p>
            <p className="text-xs text-gray-400 mt-0.5">GitHub Issues</p>
          </div>
          <ArrowUpRight size={13} className="text-gray-300 group-hover:text-primary transition-colors" />
        </a>

        <div className="flex items-center gap-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/15 p-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Zap size={17} className="text-primary" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Version actuelle</p>
            <p className="text-xs text-primary font-semibold mt-0.5">v2.0 — Avril 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
