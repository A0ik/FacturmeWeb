'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';

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
      <main className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <div className="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-8 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
