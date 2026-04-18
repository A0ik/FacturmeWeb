'use client';
import { useAuthStore } from '@/stores/authStore';

export function useSubscription() {
  const profile = useAuthStore((s) => s.profile);
  const tier = profile?.subscription_tier || 'free';
  const isFree     = tier === 'free';
  const isSolo     = tier === 'solo' || tier === 'pro' || tier === 'business';
  const isPro      = tier === 'pro'  || tier === 'business';
  const isBusiness = tier === 'business';

  return {
    tier,
    isFree,
    isSolo,
    isPro,
    isBusiness,
    canUseVoice:          !isFree,
    canUseCustomTemplate: isPro,
    canUseRecurring:      !isFree,
    canEditInvoice:       !isFree,
    maxInvoices:          isFree ? 5 : Infinity,
    invoiceCount:         profile?.invoice_count || 0,
    isAtLimit:            isFree && (profile?.invoice_count || 0) >= 5,
    maxWorkspaces:        isBusiness ? Infinity : isPro ? 3 : 1,
    canCreateWorkspace:   (count: number) => isBusiness || (isPro && count < 3) || count < 1,
  };
}
