import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch profile with trial information
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_trial_active, trial_start_date, trial_end_date, subscription_tier')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching trial status:', error);
      return NextResponse.json({ error: 'Failed to fetch trial status' }, { status: 500 });
    }

    // Check if trial is expired but not yet marked as inactive
    let isActive = profile?.is_trial_active || false;
    if (isActive && profile?.trial_end_date) {
      const now = new Date();
      const endDate = new Date(profile.trial_end_date);
      if (endDate < now) {
        // Trial has expired, update database
        await supabase
          .from('profiles')
          .update({
            is_trial_active: false,
            subscription_tier: 'free'
          })
          .eq('id', user.id);
        isActive = false;
      }
    }

    // Calculate remaining time
    let trialRemaining = null;
    if (isActive && profile?.trial_end_date) {
      const now = new Date();
      const endDate = new Date(profile.trial_end_date);
      const diff = endDate.getTime() - now.getTime();

      if (diff > 0) {
        trialRemaining = {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
          totalMs: diff
        };
      }
    }

    return NextResponse.json({
      isTrialActive: isActive,
      trialRemaining,
      subscriptionTier: profile?.subscription_tier,
      trialEndDate: profile?.trial_end_date
    });

  } catch (error) {
    console.error('Error in trial-status route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
