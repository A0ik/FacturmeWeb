'use client';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import {
  Calendar, Clock, Link2, CheckCircle2, ArrowUpRight,
  Bell, Zap, RefreshCw, ChevronRight, ExternalLink,
  FileText, Users, AlertTriangle, Plus, CalendarCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Échéances synchronisées',
    desc: 'Vos dates de paiement apparaissent automatiquement dans Google Agenda',
    color: 'text-blue-500 bg-blue-50',
  },
  {
    icon: Bell,
    title: 'Rappels automatiques',
    desc: 'Recevez des alertes 3 jours avant chaque échéance',
    color: 'text-amber-500 bg-amber-50',
  },
  {
    icon: Users,
    title: 'RDV clients',
    desc: 'Créez des événements clients directement depuis une facture',
    color: 'text-purple-500 bg-purple-50',
  },
  {
    icon: RefreshCw,
    title: 'Sync bidirectionnelle',
    desc: 'Les modifications dans Google Agenda se reflètent dans Factu.me',
    color: 'text-green-500 bg-green-50',
  },
];

const SETUP_STEPS = [
  {
    step: '1',
    title: 'Créez un projet Google Cloud',
    desc: 'Rendez-vous sur console.cloud.google.com et créez un nouveau projet.',
    link: 'https://console.cloud.google.com',
    linkLabel: 'Google Cloud Console',
  },
  {
    step: '2',
    title: 'Activez l\'API Google Calendar',
    desc: 'Dans "APIs & Services > Library", recherchez et activez "Google Calendar API".',
    link: null,
    linkLabel: null,
  },
  {
    step: '3',
    title: 'Configurez OAuth 2.0',
    desc: 'Dans "APIs & Services > Credentials", créez un ID client OAuth. Ajoutez les Scopes calendar.events et calendar.readonly.',
    link: null,
    linkLabel: null,
  },
  {
    step: '4',
    title: 'Ajoutez vos variables d\'env',
    desc: 'Dans Vercel, ajoutez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET avec les valeurs obtenues.',
    link: null,
    linkLabel: null,
  },
];

export default function CalendarPage() {
  const { profile } = useAuthStore();
  const { invoices } = useDataStore();
  const [connected, setConnected] = useState(false);

  // Upcoming due invoices
  const upcoming = invoices
    .filter((inv) => inv.status !== 'paid' && inv.due_date)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    .slice(0, 5);

  const handleConnect = () => {
    alert('La connexion Google Calendar nécessite la configuration des variables d\'environnement GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans Vercel.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Google Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Synchronisez vos échéances et rendez-vous clients</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-xs font-semibold text-amber-700">Configuration requise</span>
        </div>
      </div>

      {/* Hero card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-40 h-40 rounded-full border-2 border-white" />
          <div className="absolute top-12 right-12 w-28 h-28 rounded-full border-2 border-white" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full border-2 border-white" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
            <Calendar size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black mb-1">Synchronisation Google Agenda</h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              Connectez votre compte Google pour voir vos échéances de facturation directement dans votre agenda et ne plus jamais manquer un paiement.
            </p>
          </div>
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 bg-white text-blue-700 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-colors flex-shrink-0 shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Connecter Google
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Features + Setup */}
        <div className="lg:col-span-2 space-y-4">
          {/* Features */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">Ce que vous obtenez</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURES.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.title} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', feat.color.split(' ')[1])}>
                      <Icon size={15} className={feat.color.split(' ')[0]} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{feat.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Setup guide */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-amber-500" />
              <h3 className="font-bold text-gray-900">Guide de configuration</h3>
            </div>
            <div className="space-y-3">
              {SETUP_STEPS.map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-4 p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                    {s.link && (
                      <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
                        <ExternalLink size={11} />
                        {s.linkLabel}
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Upcoming */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Prochaines échéances</h3>
              <Link href="/invoices" className="text-xs text-primary font-semibold hover:underline">
                Voir tout
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 size={28} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">Tout est à jour !</p>
                <p className="text-xs text-gray-400 mt-0.5">Aucune échéance en attente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((inv) => {
                  const daysLeft = inv.due_date ? Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86400000) : null;
                  const isUrgent = daysLeft !== null && daysLeft <= 3;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  return (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                        isOverdue ? 'bg-red-50' : isUrgent ? 'bg-amber-50' : 'bg-gray-50'
                      )}>
                        {isOverdue ? <AlertTriangle size={13} className="text-red-500" /> :
                         isUrgent ? <Clock size={13} className="text-amber-500" /> :
                         <FileText size={13} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{inv.client?.name || inv.client_name_override}</p>
                        <p className="text-[11px] text-gray-400">{inv.number}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn('text-xs font-bold', isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-700')}>
                          {isOverdue ? `${Math.abs(daysLeft!)}j retard` : daysLeft === 0 ? "Aujourd'hui" : `J-${daysLeft}`}
                        </p>
                        <p className="text-[11px] text-gray-400">{inv.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick add event */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Plus size={14} className="text-primary" />
              <p className="text-sm font-bold">Créer un RDV client</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">Ajoutez un événement à votre agenda directement depuis une facture.</p>
            <Link
              href="/invoices"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white/10 border border-white/10 text-xs font-semibold hover:bg-white/15 transition-colors"
            >
              Ouvrir une facture
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
