'use client';
import { useAuthStore } from '@/stores/authStore';

export function useSubscription() {
  const profile = useAuthStore((s) => s.profile);
  const tier = profile?.subscription_tier || 'free';
  return {
    tier,
    isFree: tier === 'free',
    isSolo: tier === 'solo' || tier === 'pro',
    isPro: tier === 'pro',
    canUseVoice: tier !== 'free',
    canUseCustomTemplate: tier === 'pro',
    canUseRecurring: tier !== 'free',
    maxInvoices: tier === 'free' ? 3 : Infinity,
    invoiceCount: profile?.invoice_count || 0,
    isAtLimit: tier === 'free' && (profile?.invoice_count || 0) >= 3,
    // Workspace limits: Pro = unlimited, others = 1
    maxWorkspaces: tier === 'pro' ? Infinity : 1,
    canCreateWorkspace: (currentCount: number) => tier === 'pro' || currentCount < 1,
  };
}
