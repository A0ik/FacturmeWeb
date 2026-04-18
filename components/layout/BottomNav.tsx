'use client';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Users, Settings } from 'lucide-react';
import { InteractiveMenu, InteractiveMenuItem } from '@/components/ui/modern-mobile-menu';

const NAV: (InteractiveMenuItem & { href: string })[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/invoices', icon: FileText, label: 'Factures' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/settings', icon: Settings, label: 'Réglages' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const activeIndex = NAV.findIndex(({ href }) => pathname.startsWith(href));

  const handleItemClick = (index: number) => {
    router.push(NAV[index].href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom px-2 py-1">
      <InteractiveMenu
        items={NAV}
        activeIndex={activeIndex >= 0 ? activeIndex : 0}
        onItemClick={handleItemClick}
      />
    </nav>
  );
}
