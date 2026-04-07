'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Kanban, RefreshCw, Settings, LogOut, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn, getInitials } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/invoices', icon: FileText, label: 'Factures' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/crm', icon: Kanban, label: 'Pipeline' },
  { href: '/recurring', icon: RefreshCw, label: 'Récurrentes' },
  { href: '/settings', icon: Settings, label: 'Paramètres' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuthStore();
  const { isFree } = useSubscription();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-gray-900 text-white">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black text-white text-lg">F</div>
          <span className="font-bold text-xl">Factu.me</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade banner */}
      {isFree && (
        <Link href="/paywall" className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Zap size={16} className="text-yellow-300" />
          <div>
            <p className="text-xs font-bold text-white">Passer à Pro</p>
            <p className="text-xs text-primary-light/80">Illimité + IA</p>
          </div>
        </Link>
      )}

      {/* Profile */}
      <div className="px-3 pb-4 border-t border-gray-800 pt-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-800">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {getInitials(profile?.company_name || profile?.first_name || 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{profile?.company_name || profile?.first_name || 'Mon compte'}</p>
            <p className="text-xs text-gray-400 truncate">{profile?.subscription_tier || 'free'}</p>
          </div>
          <button onClick={signOut} className="text-gray-500 hover:text-white transition-colors p-1">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
