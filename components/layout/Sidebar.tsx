'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard, FileText, Users, Kanban,
  RefreshCw, Settings, Zap, ChevronRight,
  Building2, Bell, HelpCircle, Package, Receipt, Calendar, Camera,
  Calculator, Activity, Landmark, Search, Link2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, getInitials } from '@/lib/utils';
import { UserDropdown } from '@/components/ui/user-dropdown';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const NAV_TOP = [
  { href: '/dashboard',      icon: LayoutDashboard, label: 'Tableau de bord', badge: null as null | 'overdue' | 'notif' },
  { href: '/invoices',       icon: FileText,         label: 'Factures',        badge: 'overdue' as null | 'overdue' | 'notif' },
  { href: '/clients',        icon: Users,            label: 'Clients',         badge: null },
  { href: '/crm',            icon: Kanban,           label: 'Pipeline',        badge: null },
  { href: '/recurring',      icon: RefreshCw,        label: 'Récurrentes',     badge: null },
  { href: '/expenses',       icon: Receipt,          label: 'Notes de frais',  badge: null },
  { href: '/capture',        icon: Camera,           label: 'Capture',         badge: null },
  { href: '/connections',    icon: Link2,            label: 'Connexions',     badge: null },
  { href: '/products',       icon: Package,          label: 'Catalogue',       badge: null },
  { href: '/calendar',       icon: Calendar,         label: 'Agenda',          badge: null },
  { href: '/accounting',     icon: Calculator,       label: 'Comptabilité',    badge: null },
  { href: '/activity',       icon: Activity,         label: 'Activité',        badge: null },
  { href: '/banking',        icon: Landmark,         label: 'Banque',          badge: null },
];

const NAV_BOTTOM = [
  { href: '/workspace',      icon: Building2,        label: 'Workspace',       badge: null as null | 'overdue' | 'notif' },
  { href: '/notifications',  icon: Bell,             label: 'Notifications',   badge: 'notif' as null | 'overdue' | 'notif' },
  { href: '/help',           icon: HelpCircle,       label: 'Aide',            badge: null },
  { href: '/settings',       icon: Settings,         label: 'Paramètres',      badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut } = useAuthStore();
  const { invoices } = useDataStore();
  const { unreadCount, fetchNotifications } = useWorkspaceStore();
  const { isFree } = useSubscription();

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
          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
          active
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:bg-white/6 hover:text-gray-100',
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" />
        )}
        <span className={cn(
          'flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 flex-shrink-0',
          active ? 'bg-primary/20 text-primary' : 'text-gray-500 group-hover:text-gray-200 group-hover:bg-white/5',
        )}>
          <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
        </span>
        <span className="flex-1 font-medium">{label}</span>
        {count > 0 && (
          <span className={cn(
            'flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex-shrink-0',
            badge === 'overdue' ? 'bg-red-500/20 border border-red-500/30 text-red-400' : 'bg-primary/20 border border-primary/30 text-primary',
          )}>
            {count > 9 ? '9+' : count}
          </span>
        )}
        {!active && (
          <ChevronRight
            size={13}
            className="opacity-0 -translate-x-1 group-hover:opacity-30 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0"
          />
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-gray-950 text-white overflow-hidden flex-shrink-0">

      {/* Ambient glow */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/8 to-transparent pointer-events-none z-0" />

      {/* Logo */}
      <div className="relative z-10 px-5 py-5 border-b border-white/5 flex-shrink-0">
        <Logo size="md" variant="full" dark />
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Espace de travail</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative z-10 px-3 pb-2 pt-1 border-b border-white/5 flex-shrink-0">
        <button
          onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }); window.dispatchEvent(e); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 text-gray-400 hover:text-gray-200 transition-all text-xs group"
        >
          <Search size={13} />
          <span className="flex-1 text-left font-medium">Rechercher...</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-500 font-mono group-hover:text-gray-400">⌘K</kbd>
        </button>
      </div>

      {/* Main nav */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-3 scrollbar-none">
        <div className="space-y-0.5">
          {NAV_TOP.map((item) => <NavItem key={item.href} {...item} />)}
        </div>

        {/* Divider + Quick stats */}
        <div className="my-3">
          <div className="h-px bg-white/5 mx-1 mb-3" />
          <div className="px-3 py-2.5 rounded-xl bg-white/4 border border-white/5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Aperçu rapide</p>
            <div className="flex gap-3">
              <div className="flex-1 text-center">
                <p className="text-base font-black text-white">{invoices.filter(i => i.status === 'paid').length}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Payées</p>
              </div>
              <div className="w-px bg-white/8" />
              <div className="flex-1 text-center">
                <p className="text-base font-black text-amber-400">{invoices.filter(i => i.status === 'sent').length}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">En attente</p>
              </div>
              <div className="w-px bg-white/8" />
              <div className="flex-1 text-center">
                <p className={cn('text-base font-black', overdueCount > 0 ? 'text-red-400' : 'text-gray-500')}>
                  {overdueCount}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">En retard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary nav */}
        <div className="h-px bg-white/5 mx-1 mb-3" />
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-2">Outils</p>
        <div className="space-y-0.5">
          {NAV_BOTTOM.map((item) => <NavItem key={item.href} {...item} />)}
        </div>
      </nav>

      {/* Upgrade banner */}
      {isFree && (
        <div className="relative z-10 px-3 mb-2 flex-shrink-0">
          <Link
            href="/paywall"
            className="group flex items-center gap-2.5 p-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent hover:border-primary/35 hover:from-primary/20 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/25 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/35 group-hover:scale-110 transition-all">
              <Zap size={15} className="text-primary" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">Passer à Pro</p>
              <p className="text-[11px] text-gray-400 mt-0.5">IA · Illimité · Workspace</p>
            </div>
            <ChevronRight size={14} className="text-primary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      )}

      {/* Profile — ALWAYS at bottom */}
      <div className="relative z-10 flex-shrink-0 border-t border-white/5 px-3 py-3 bg-gray-950">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
          <UserDropdown
            user={{
              name: profile?.company_name || profile?.first_name || 'Mon compte',
              username: `@${(profile?.company_name || profile?.first_name || 'compte').toLowerCase().replace(/\s+/g, '')}`,
              initials: getInitials(profile?.company_name || profile?.first_name || 'U'),
              status: 'online',
            }}
            onAction={(action) => {
              if (action === 'logout') signOut();
              if (action === 'settings') router.push('/settings');
              if (action === 'upgrade') router.push('/paywall');
              if (action === 'profile') router.push('/settings');
              if (action === 'notifications') router.push('/notifications');
              if (action === 'help') router.push('/help');
              if (action === 'add-account') { signOut(); router.push('/login'); }
              if (action.startsWith('switch:')) { signOut(); router.push('/login'); }
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {profile?.company_name || profile?.first_name || 'Mon compte'}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <p className="text-[11px] text-gray-500 truncate capitalize font-medium">
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
