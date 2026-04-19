import { createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the RPC function to activate trial
    const { data, error } = await supabase.rpc('activate_trial', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Error activating trial:', error);
      return NextResponse.json({ error: 'Failed to activate trial' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Trial cannot be activated' }, { status: 400 });
    }

    // Fetch updated profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Error in activate-trial route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
