import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// SumUp OAuth 2.0 endpoints
const SUMUP_AUTH_URL = 'https://api.sumup.com/authorize';
const SUMUP_TOKEN_URL = 'https://api.sumup.com/token';

// Scopes needed for checkout creation
const SCOPES = ['payments', 'user.profile_read'].join(' ');

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
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

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomUUID();

    // Store state in cookie for verification in callback
    const redirectUrl = new URL(req.url);
    const callbackUrl = `${redirectUrl.protocol}//${redirectUrl.host}/api/sumup/oauth/callback`;

    const authUrl = new URL(SUMUP_AUTH_URL);
    authUrl.searchParams.set('client_id', process.env.SUMUP_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', state);

    // Store state and user ID in cookie for callback verification
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('sumup_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });
    response.cookies.set('sumup_oauth_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
    });

    return response;
  } catch (error: any) {
    console.error('[sumup-oauth] Init error:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'initialisation OAuth' }, { status: 500 });
  }
}
