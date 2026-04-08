'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, Users, Kanban,
  RefreshCw, Settings, Zap, ChevronRight, AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, getInitials } from '@/lib/utils';
import { UserDropdown } from '@/components/ui/user-dropdown';
import { Logo } from '@/components/ui/Logo';

const NAV = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Tableau de bord', badge: null as null | 'overdue' | 'new' },
  { href: '/invoices',   icon: FileText,         label: 'Factures',        badge: 'overdue' as null | 'overdue' | 'new' },
  { href: '/clients',    icon: Users,            label: 'Clients',         badge: null },
  { href: '/crm',        icon: Kanban,           label: 'Pipeline',        badge: null },
  { href: '/recurring',  icon: RefreshCw,        label: 'Récurrentes',     badge: null },
  { href: '/settings',   icon: Settings,         label: 'Paramètres',      badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const { invoices } = useDataStore();
  const { isFree } = useSubscription();

  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-gray-950 text-white overflow-hidden flex-shrink-0">

      {/* Ambient glow top */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/8 to-transparent pointer-events-none z-0" />

      {/* Logo */}
      <div className="relative z-10 px-5 py-5 border-b border-white/5 flex-shrink-0">
        <Logo size="md" variant="full" dark />
        <div className="mt-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Espace de travail</span>
        </div>
      </div>

      {/* Navigation — scrollable zone */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-none">
        {NAV.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname.startsWith(href);
          const badgeCount = badge === 'overdue' ? overdueCount : 0;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/6 hover:text-gray-100',
              )}
            >
              {/* Active left bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" />
              )}

              {/* Icon with glow on active */}
              <span className={cn(
                'flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 flex-shrink-0',
                active ? 'bg-primary/20 text-primary' : 'text-gray-500 group-hover:text-gray-200 group-hover:bg-white/5',
              )}>
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              </span>

              <span className="flex-1 font-medium">{label}</span>

              {/* Overdue badge */}
              {badgeCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold flex-shrink-0">
                  {badgeCount}
                </span>
              )}

              {/* Hover arrow */}
              {!active && (
                <ChevronRight
                  size={13}
                  className="opacity-0 -translate-x-1 group-hover:opacity-30 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0"
                />
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="pt-3 pb-1">
          <div className="h-px bg-white/5 mx-1" />
        </div>

        {/* Quick stats inside nav */}
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
      </nav>

      {/* Upgrade banner — free users only */}
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
              <p className="text-[11px] text-gray-400 mt-0.5">IA · Illimité · Templates</p>
            </div>
            <ChevronRight size={14} className="text-primary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      )}

      {/* Profile — ALWAYS visible at bottom, never scrollable */}
      <div className="relative z-10 flex-shrink-0 border-t border-white/5 px-3 py-3 bg-gray-950">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
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
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {profile?.company_name || profile?.first_name || 'Mon compte'}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <p className="text-[11px] text-gray-500 truncate capitalize font-medium">
                {profile?.subscription_tier === 'free' ? 'Plan gratuit' : profile?.subscription_tier === 'solo' ? 'Plan Solo' : profile?.subscription_tier === 'pro' ? 'Plan Pro' : 'Gratuit'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
