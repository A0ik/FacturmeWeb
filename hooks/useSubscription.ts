'use client';
import { useAuthStore } from '@/stores/authStore';
import { useMemo } from 'react';

export function useSubscription() {
  const profile = useAuthStore((s) => s.profile);
  const tier = profile?.subscription_tier || 'free';
  const isTrialActive = profile?.is_trial_active || false;
  const trialEndDate = profile?.trial_end_date;
  const trialStartDate = profile?.trial_start_date;

  // Calculate remaining trial time
  const trialRemaining = useMemo(() => {
    if (!isTrialActive || !trialEndDate) return null;
    const now = new Date();
    const end = new Date(trialEndDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, totalMs: diff };
  }, [isTrialActive, trialEndDate]);

  const isFree     = tier === 'free' && !isTrialActive;
  const isTrial    = tier === 'trial' || isTrialActive;
  const isSolo     = tier === 'solo' || tier === 'pro' || tier === 'business';
  const isPro      = tier === 'pro'  || tier === 'business';
  const isBusiness = tier === 'business';

  // Trial users get full Pro features
  const effectiveTier = isTrial ? 'pro' : tier;
  const effectiveIsFree = isFree;
  const effectiveIsPro = isTrial || isPro;
  const effectiveIsBusiness = isBusiness;

  return {
    tier,
    effectiveTier,
    isFree,
    isTrial,
    isSolo,
    isPro,
    isBusiness,
    isTrialActive,
    trialRemaining,
    trialEndDate,
    trialStartDate,
    canUseVoice:          effectiveIsPro || effectiveIsBusiness,
    canUseCustomTemplate: effectiveIsPro || effectiveIsBusiness,
    canUseRecurring:      effectiveIsPro || effectiveIsBusiness,
    canEditInvoice:       effectiveIsPro || effectiveIsBusiness,
    canDeleteInvoice:     effectiveIsPro || effectiveIsBusiness,
    maxInvoices:          isFree ? 5 : Infinity,
    invoiceCount:         profile?.invoice_count || 0,
    invoicesRemaining:    isFree ? Math.max(0, 5 - (profile?.invoice_count || 0)) : null,
    isAtLimit:            isFree && (profile?.invoice_count || 0) >= 5,
    maxWorkspaces:        effectiveIsBusiness ? Infinity : (effectiveIsPro || isTrial) ? 3 : 1,
    canCreateWorkspace:   (count: number) => effectiveIsBusiness || ((effectiveIsPro || isTrial) && count < 3) || count < 1,
  };
}
