import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
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

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'Google Calendar non configuré' }, { status: 500 });
    }

    // Use dynamic redirect URL based on request origin
    const redirectUri = `${req.nextUrl.origin}/api/google/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' ');

    // Generate state parameter for CSRF protection with timestamp
    const timestamp = Date.now();
    const state = `${timestamp}_${Math.random().toString(36).substring(2, 15)}`;

    console.log('[google-oauth] Generated state:', { state, userId: user.id, timestamp });

    // Store state in user metadata for verification in callback
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ google_oauth_state: state })
      .eq('id', user.id);

    if (updateError) {
      console.error('[google-oauth] Failed to save state:', updateError);
      return NextResponse.json({ error: 'Failed to initialize OAuth flow' }, { status: 500 });
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return NextResponse.json({ url: authUrl.toString() });
  } catch (error: any) {
    console.error('[google-oauth] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
