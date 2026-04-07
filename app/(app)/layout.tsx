'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { Logo } from '@/components/ui/Logo';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized } = useAuthStore();
  const { fetchInvoices, fetchClients } = useDataStore();

  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.replace('/login'); return; }
    fetchInvoices();
    fetchClients();
  }, [initialized, user]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Mobile top bar — logo visible only on mobile */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <Logo size="sm" variant="full" />
        </div>
        <div className="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-8 py-5 lg:py-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
