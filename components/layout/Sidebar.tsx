'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, FileText, Users, Kanban,
  RefreshCw, Settings, Zap, ChevronRight, ChevronDown,
  Building2, Bell, HelpCircle, Package, Receipt, Calendar, Camera,
  Calculator, Activity, Landmark, Search, Link2, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, getInitials } from '@/lib/utils';
import { UserDropdown } from '@/components/ui/user-dropdown';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { toast } from 'sonner';

// Items visibles au premier regard — le Core Flow MVP
const NAV_CORE = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', badge: null as null | 'overdue' | 'notif' },
  { href: '/invoices',  icon: FileText,        label: 'Factures',        badge: 'overdue' as null | 'overdue' | 'notif' },
  { href: '/clients',   icon: Users,           label: 'Clients',         badge: null },
  { href: '/settings',  icon: Settings,        label: 'Paramètres',      badge: null },
];

// Features avancées — code intact, UI cachée (Progressive Disclosure)
const NAV_ADVANCED = [
  { href: '/crm',         icon: Kanban,      label: 'Pipeline CRM' },
  { href: '/recurring',   icon: RefreshCw,   label: 'Récurrentes' },
  { href: '/expenses',    icon: Receipt,     label: 'Notes de frais' },
  { href: '/capture',     icon: Camera,      label: 'Capture & OCR' },
  { href: '/suppliers',   icon: Building2,   label: 'Fournisseurs' },
  { href: '/connections', icon: Link2,       label: 'Connexions' },
  { href: '/products',    icon: Package,     label: 'Catalogue' },
  { href: '/calendar',    icon: Calendar,    label: 'Agenda' },
  { href: '/accounting',  icon: Calculator,  label: 'Comptabilité' },
  { href: '/activity',    icon: Activity,    label: 'Activité' },
  { href: '/banking',     icon: Landmark,    label: 'Banque' },
];

const NAV_BOTTOM = [
  { href: '/workspace',      icon: Building2,        label: 'Workspace',       badge: null as null | 'overdue' | 'notif' },
  { href: '/notifications',  icon: Bell,             label: 'Notifications',   badge: 'notif' as null | 'overdue' | 'notif' },
  { href: '/help',           icon: HelpCircle,       label: 'Aide',            badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut } = useAuthStore();
  const { invoices } = useDataStore();
  const { unreadCount, fetchNotifications } = useWorkspaceStore();
  const { isFree } = useSubscription();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  useEffect(() => {
    if (user) fetchNotifications(user.id);
  }, [user]);

  const getBadgeCount = (badge: null | 'overdue' | 'notif') => {
    if (badge === 'overdue') return overdueCount;
    if (badge === 'notif') return unreadCount;
    return 0;
  };

  const NavItem = ({ href, icon: Icon, label, badge }: { href: string; icon: any; label: string; badge: null | 'overdue' | 'notif' }) => {
    const active = pathname.startsWith(href);
    const count = getBadgeCount(badge);

    return (
      <Link
        href={href}
        className={cn(
          'relative group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
          'hover:bg-gradient-to-r',
          active
            ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent text-primary border border-primary/20'
            : 'text-gray-500 hover:text-gray-900 hover:from-primary/5 hover:via-transparent hover:to-transparent',
        )}
      >
        {/* Glow effect on hover */}
        <div className={cn(
          'absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10',
          active && 'opacity-0'
        )} />

        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-gradient-to-b from-primary to-primary-dark shadow-[0_0_8px_rgba(29,158,117,0.6)]" />
        )}
        <span className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 flex-shrink-0',
          active
            ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30'
            : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110',
        )}>
          <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
        </span>
        <span className="flex-1 font-medium group-hover:translate-x-1 transition-transform duration-300">{label}</span>
        {count > 0 && (
          <span className={cn(
            'flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex-shrink-0',
            badge === 'overdue'
              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]'
              : 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-[0_0_8px_rgba(29,158,117,0.4)]',
          )}>
            {count > 9 ? '9+' : count}
          </span>
        )}
        {!active && (
          <ChevronRight
            size={13}
            className="opacity-0 -translate-x-2 group-hover:opacity-30 group-hover:translate-x-0 transition-all duration-300 flex-shrink-0"
          />
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 border-r border-gray-100 dark:border-white/5 overflow-hidden flex-shrink-0">
      {/* Animated gradient background */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/[0.03] via-primary/[0.01] to-transparent dark:from-primary/[0.05] dark:via-primary/[0.02] pointer-events-none" />
      <div className="absolute top-20 -right-20 w-64 h-64 bg-primary/[0.03] dark:bg-primary/[0.05] rounded-full blur-3xl" />

      {/* Logo */}
      <div className="relative z-10 px-5 py-5 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
        <Logo size="md" variant="full" dark={false} />
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-widest">Espace de travail</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative z-10 px-4 pb-3 pt-2 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
        <button
          onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }); window.dispatchEvent(e); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 text-xs group shadow-sm"
        >
          <Search size={14} className="group-hover:scale-110 transition-transform duration-200" />
          <span className="flex-1 text-left font-medium">Rechercher...</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 font-mono group-hover:bg-gray-200 dark:group-hover:bg-white/20 transition-colors">⌘K</kbd>
        </button>
      </div>

      {/* Main nav */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-3 scrollbar-none">
        {/* Core MVP items */}
        <div className="space-y-1">
          {NAV_CORE.map((item) => <NavItem key={item.href} {...item} />)}
        </div>

        {/* Divider + Quick stats */}
        <div className="my-4">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent mx-1 mb-4" />
          <div className="px-3 py-3.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-white/5 dark:to-white/[0.02] border border-gray-200/50 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={12} className="text-primary" />
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Aperçu rapide</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 text-center group cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 rounded-lg p-2 transition-all">
                <p className="text-lg font-black text-gray-900 dark:text-white group-hover:scale-105 transition-transform">{invoices.filter(i => i.status === 'paid').length}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Payées</p>
              </div>
              <div className="w-px bg-gray-200 dark:bg-white/10" />
              <div className="flex-1 text-center group cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 rounded-lg p-2 transition-all">
                <p className="text-lg font-black text-amber-500 group-hover:scale-105 transition-transform">{invoices.filter(i => i.status === 'sent').length}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">En attente</p>
              </div>
              <div className="w-px bg-gray-200 dark:bg-white/10" />
              <div className="flex-1 text-center group cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 rounded-lg p-2 transition-all">
                <p className={cn('text-lg font-black group-hover:scale-105 transition-transform', overdueCount > 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-600')}>
                  {overdueCount}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">En retard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Outils avancés — repliés par défaut (Progressive Disclosure) */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:text-gray-600 dark:hover:text-gray-300 transition-colors group"
          >
            <span className="flex items-center gap-2">
              <span className={cn('transition-all duration-300', showAdvanced ? 'text-primary' : '')}>Outils avancés</span>
            </span>
            <div className={cn('transition-transform duration-300', showAdvanced ? 'rotate-180' : '')}>
              <ChevronDown size={12} />
            </div>
          </button>
          {showAdvanced && (
            <div className="space-y-0.5 mt-1">
              {NAV_ADVANCED.map(({ href, icon: Icon, label }) => (
                <div
                  key={href}
                  className="relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-400 dark:text-gray-500 group cursor-pointer"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <Icon size={16} strokeWidth={1.8} />
                  </span>
                  <span className="flex-1 font-medium">{label}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-white/10 uppercase tracking-wide flex-shrink-0">
                    Bientôt
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Secondary nav */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent mx-1 mb-3" />
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3.5 mb-2">Outils</p>
        <div className="space-y-1">
          {NAV_BOTTOM.map((item) => <NavItem key={item.href} {...item} />)}
        </div>
      </nav>

      {/* Upgrade banner — only show if user is not on Business (top tier) */}
      {profile?.subscription_tier !== 'business' && (
        <div className="relative z-10 px-3 mb-3 flex-shrink-0">
          <Link
            href={profile?.subscription_tier === 'free' ? '/trial' : '/paywall'}
            className="group relative flex items-center gap-3 p-3.5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent hover:border-primary/30 hover:from-primary/15 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 overflow-hidden"
          >
            {/* Animated glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-primary/20">
              <Zap size={17} className="text-white fill-white" />
            </div>
            <div className="relative flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:translate-x-1 transition-transform duration-300">
                {profile?.subscription_tier === 'free'   ? 'Essai gratuit 4 jours' :
                 profile?.subscription_tier === 'solo'   ? 'Passer à Pro'  :
                                                           'Passer à Business'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {profile?.subscription_tier === 'free'   ? 'Accès complet · Sans engagement' :
                 profile?.subscription_tier === 'solo'   ? 'IA · FEC · CRM'             :
                                                           'Multi-comptes · Webhooks'}
              </p>
            </div>
            <ChevronRight size={15} className="relative text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      )}

      {/* Profile — ALWAYS at bottom */}
      <div className="relative z-10 flex-shrink-0 border-t border-gray-100 dark:border-white/5 px-3 py-3 bg-gradient-to-t from-gray-50 to-transparent dark:from-slate-950">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
          <UserDropdown
            user={{
              name:     profile?.company_name || profile?.first_name || 'Mon compte',
              email:    profile?.email || 'compte@factu.me',
              initials: getInitials(profile?.company_name || profile?.first_name || 'U'),
              avatar:   profile?.logo_url || undefined,
              status:   'online',
              tier:     profile?.subscription_tier || 'free',
            }}
            onAction={async (action) => {
              if (action === 'logout') {
                try {
                  toast.loading('Déconnexion en cours...', { id: 'logout' });
                  await signOut();
                  toast.success('Déconnecté avec succès', { id: 'logout' });
                } catch (error) {
                  toast.error('Erreur lors de la déconnexion', { id: 'logout' });
                  console.error('Logout error:', error);
                }
              }
              if (action === 'settings')    { router.push('/settings'); }
              if (action === 'profile')     { router.push('/settings'); }
              if (action === 'notifications') { router.push('/notifications'); }
              if (action === 'help')        { router.push('/help'); }
              if (action === 'add-account') {
                try {
                  await signOut();
                  router.push('/login');
                } catch (error) {
                  console.error('Logout error:', error);
                }
              }
              if (action.startsWith('switch:')) {
                try {
                  await signOut();
                  router.push('/login');
                } catch (error) {
                  console.error('Logout error:', error);
                }
              }
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight group-hover:text-primary transition-colors">
              {profile?.company_name || profile?.first_name || 'Mon compte'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate capitalize font-medium">
                {profile?.subscription_tier === 'free' ? 'Plan gratuit'
                  : profile?.subscription_tier === 'solo' ? 'Plan Solo'
                  : profile?.subscription_tier === 'pro' ? 'Plan Pro'
                  : 'Gratuit'}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
