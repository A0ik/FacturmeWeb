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

    // Get state from cookie for verification
    const stateCookie = cookieStore.get('google_oauth_state');
    const storedState = stateCookie ? decodeURIComponent(stateCookie.value) : null;

    console.log('[google-callback] State verification:', {
      receivedState: state,
      storedState: storedState,
      hasCookie: !!stateCookie
    });

    if (!storedState) {
      console.error('[google-callback] No state cookie found');
      return NextResponse.redirect(new URL('/calendar?error=no_stored_state', req.url));
    }

    if (storedState !== state) {
      console.error('[google-callback] State mismatch:', {
        received: state,
        stored: storedState
      });
      return NextResponse.redirect(new URL('/calendar?error=state_mismatch', req.url));
    }

    // Verify state is not too old (10 minutes max)
    const stateTimestamp = parseInt(state.split('_')[0]);
    const stateAge = Date.now() - stateTimestamp;
    if (stateAge > 10 * 60 * 1000 || isNaN(stateAge)) {
      console.error('[google-callback] State too old or invalid:', { stateAge, stateTimestamp });
      return NextResponse.redirect(new URL('/calendar?error=state_expired', req.url));
    }

    // Extract user ID from state
    const userId = state.split('_')[2];
    if (!userId) {
      console.error('[google-callback] No user ID in state');
      return NextResponse.redirect(new URL('/calendar?error=invalid_state', req.url));
    }

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
      return NextResponse.redirect(new URL('/login?redirect=/calendar', req.url));
    }

    // Verify user ID matches
    if (user.id !== userId) {
      console.error('[google-callback] User ID mismatch:', { userId: user.id, stateUserId: userId });
      return NextResponse.redirect(new URL('/calendar?error=user_mismatch', req.url));
    }

    // Exchange code for tokens
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    // Use dynamic redirect URL based on request origin
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
      const errorText = await tokenResponse.text();
      console.error('[google-callback] Token exchange failed:', errorText);
      return NextResponse.redirect(new URL('/calendar?error=token_exchange_failed', req.url));
    }

    const tokens = await tokenResponse.json();

    console.log('[google-callback] Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in
    });

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userInfoResponse.json();

    console.log('[google-callback] User info:', {
      email: userInfo.email,
      name: userInfo.name
    });

    // Save tokens and user info to profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token || null,
        google_token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        google_email: userInfo.email,
        google_name: userInfo.name,
        google_picture: userInfo.picture,
        google_connected_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[google-callback] Failed to save profile:', updateError);
    } else {
      console.log('[google-callback] Profile saved successfully');
    }

    // Clear the state cookie
    const redirectUrl = new URL('/calendar?success=google_connected', req.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('google_oauth_state');
    return response;
  } catch (error: any) {
    console.error('[google-callback] Error:', error);

    // Clear the state cookie even on error
    const redirectUrl = new URL('/calendar?error=unknown_error', req.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('google_oauth_state');
    return response;
  }
}
