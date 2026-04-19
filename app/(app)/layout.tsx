'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { Logo } from '@/components/ui/Logo';
import { ServiceWorkerRegistration } from '@/components/ui/ServiceWorkerRegistration';
import CommandPalette from '@/components/ui/CommandPalette';
import { TrialCountdown } from '@/components/ui/trial-countdown';
import { InvoiceCounter } from '@/components/ui/invoice-counter';
import { UpgradeBanner } from '@/components/ui/upgrade-banner';
import { Toaster } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized, profile } = useAuthStore();
  const { fetchInvoices, fetchClients, invoices } = useDataStore();
  const { isFree, isTrialActive, invoiceCount } = useSubscription();
  const pathname = usePathname();
  const [showTrialBanner, setShowTrialBanner] = useState(true);
  const [showInvoiceCounter, setShowInvoiceCounter] = useState(true);

  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.replace('/login'); return; }
    fetchInvoices();
    fetchClients();
  }, [initialized, user]);

  // Hide banners on paywall and trial pages
  const hideBanners = pathname === '/paywall' || pathname === '/trial';

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
    <>
      <script dangerouslySetInnerHTML={{
        __html: `
        try {
          const t = localStorage.getItem('theme');
          if (t === 'dark') document.documentElement.classList.add('dark');
        } catch(e) {}
      ` }} />
      <Toaster position="top-right" richColors closeButton />
      <ServiceWorkerRegistration />
      <CommandPalette />

      {/* Trial Countdown Banner - shows for active trial users */}
      {isTrialActive && showTrialBanner && !hideBanners && (
        <TrialCountdown onClose={() => setShowTrialBanner(false)} />
      )}

      {/* Invoice Counter - shows for free users */}
      {isFree && showInvoiceCounter && !hideBanners && (
        <InvoiceCounter
          invoiceCount={invoiceCount}
          maxInvoices={5}
          onClose={() => setShowInvoiceCounter(false)}
        />
      )}

      {/* Upgrade Banner - shows for free users on specific pages */}
      {isFree && !hideBanners && pathname === '/invoices' && (
        <div className="container mx-auto px-4 lg:px-8 pt-4">
          <UpgradeBanner
            type="limit"
            buttonText="Activer l'essai gratuit"
            description="4 jours d'accès complet à toutes les fonctionnalités"
            onClick={() => router.push('/trial')}
            onClose={() => setShowInvoiceCounter(false)}
          />
        </div>
      )}

      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
          {/* Mobile top bar — logo visible only on mobile */}
          <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <Logo size="sm" variant="full" />
          </div>
          <div className={cn(
            "flex-1 w-full mx-auto px-4 lg:px-8 py-5 lg:py-6",
            pathname === '/paywall' ? "max-w-[1800px]" : "max-w-5xl"
          )}>
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </>
  );
}
