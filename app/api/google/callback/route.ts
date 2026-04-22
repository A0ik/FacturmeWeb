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

    // Verify state parameter
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_oauth_state')
      .eq('id', user.id)
      .single();

    if (!profile || profile.google_oauth_state !== state) {
      return NextResponse.redirect(new URL('/calendar?error=invalid_state', req.url));
    }

    // Exchange code for tokens
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';

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

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userInfoResponse.json();

    // Save tokens and user info to profile
    await supabase
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
        google_oauth_state: null,
      })
      .eq('id', user.id);

    return NextResponse.redirect(new URL('/calendar?success=google_connected', req.url));
  } catch (error: any) {
    console.error('[google-callback] Error:', error);
    return NextResponse.redirect(new URL('/calendar?error=unknown_error', req.url));
  }
}
