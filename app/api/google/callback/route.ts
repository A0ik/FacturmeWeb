import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/calendar?error=google_auth_failed', req.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/calendar?error=missing_params', req.url));
    }

    const cookieStore = await cookies();

    const stateCookie = cookieStore.get('google_oauth_state');
    const storedState = stateCookie ? decodeURIComponent(stateCookie.value) : null;

    if (!storedState) {
      return NextResponse.redirect(new URL('/calendar?error=no_stored_state', req.url));
    }

    if (storedState !== state) {
      return NextResponse.redirect(new URL('/calendar?error=state_mismatch', req.url));
    }

    // Vérifier que le state n'est pas expiré (10 minutes max)
    const stateTimestamp = parseInt(state.split('_')[0], 10);
    const stateAge = Date.now() - stateTimestamp;
    if (isNaN(stateAge) || stateAge > 10 * 60 * 1000) {
      return NextResponse.redirect(new URL('/calendar?error=state_expired', req.url));
    }

    // Extraire l'userId du state
    const userId = state.split('_')[2];
    if (!userId) {
      return NextResponse.redirect(new URL('/calendar?error=invalid_state', req.url));
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options as Record<string, unknown>));
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=/calendar', req.url));
    }

    if (user.id !== userId) {
      return NextResponse.redirect(new URL('/calendar?error=user_mismatch', req.url));
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${req.nextUrl.origin}/api/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/calendar?error=google_not_configured', req.url));
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL('/calendar?error=token_exchange_failed', req.url));
    }

    const tokens = await tokenResponse.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json() as {
      email?: string;
      name?: string;
      picture?: string;
    };

    await supabase
      .from('profiles')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token ?? null,
        google_token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        google_email: userInfo.email,
        google_name: userInfo.name,
        google_picture: userInfo.picture,
        google_connected_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    const redirectUrl = new URL('/calendar?success=google_connected', req.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('google_oauth_state');
    return response;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[google-callback]', err.message);
    const redirectUrl = new URL('/calendar?error=unknown_error', req.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('google_oauth_state');
    return response;
  }
}
