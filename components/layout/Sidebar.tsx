'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, Users, Kanban,
  RefreshCw, Settings, Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, getInitials } from '@/lib/utils';
import { UserDropdown } from '@/components/ui/user-dropdown';
import { Logo } from '@/components/ui/Logo';

const NAV = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/invoices',   icon: FileText,         label: 'Factures' },
  { href: '/clients',    icon: Users,            label: 'Clients' },
  { href: '/crm',        icon: Kanban,           label: 'Pipeline' },
  { href: '/recurring',  icon: RefreshCw,        label: 'Récurrentes' },
  { href: '/settings',   icon: Settings,         label: 'Paramètres' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const { isFree } = useSubscription();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-gray-950 text-white">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <Logo size="md" variant="full" dark />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade banner — free only */}
      {isFree && (
        <Link
          href="/paywall"
          className="mx-3 mb-3 p-3.5 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 flex items-center gap-2.5 hover:border-primary/40 transition-all group"
        >
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
            <Zap size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Passer à Pro</p>
            <p className="text-xs text-gray-400 mt-0.5">Illimité + IA + Templates</p>
          </div>
        </Link>
      )}

      {/* Profile */}
      <div className="px-3 pb-4 border-t border-white/5 pt-3">
        <div className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors">
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
            <p className="text-sm font-semibold text-white truncate">
              {profile?.company_name || profile?.first_name || 'Mon compte'}
            </p>
            <p className="text-xs text-gray-500 truncate capitalize">
              {profile?.subscription_tier || 'Gratuit'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
