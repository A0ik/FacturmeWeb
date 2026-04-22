import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any));
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Revoke token on Google side (optional, but good practice)
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_access_token')
      .eq('id', user.id)
      .single();

    if (profile?.google_access_token) {
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: profile.google_access_token }),
        });
      } catch (e) {
        console.warn('[google-disconnect] Token revocation failed:', e);
      }
    }

    // Clear Google data from profile
    await supabase
      .from('profiles')
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expires_at: null,
        google_email: null,
        google_name: null,
        google_picture: null,
        google_connected_at: null,
        google_oauth_state: null,
      })
      .eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[google-disconnect] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
