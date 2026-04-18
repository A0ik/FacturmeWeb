'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import '@/i18n';

export default function Providers({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return <>{children}</>;
}
