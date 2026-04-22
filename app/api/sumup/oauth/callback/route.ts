import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUMUP_TOKEN_URL = 'https://api.sumup.com/token';

interface SumUpTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const cookieStore = await cookies();

    // Get state and user_id from cookies
    const storedState = cookieStore.get('sumup_oauth_state')?.value;
    const userId = cookieStore.get('sumup_oauth_user_id')?.value;

    // Clear OAuth cookies
    const response = NextResponse.next();
    response.cookies.delete('sumup_oauth_state');
    response.cookies.delete('sumup_oauth_user_id');

    // Check for errors from SumUp
    if (error) {
      console.error('[sumup-oauth-callback] Error from SumUp:', error);
      return NextResponse.redirect(new URL('/settings?sumup_error=' + encodeURIComponent(error), req.url));
    }

    // Validate state parameter
    if (!state || state !== storedState) {
      console.error('[sumup-oauth-callback] Invalid state parameter');
      return NextResponse.redirect(new URL('/settings?sumup_error=invalid_state', req.url));
    }

    // Validate code
    if (!code) {
      console.error('[sumup-oauth-callback] No code parameter');
      return NextResponse.redirect(new URL('/settings?sumup_error=no_code', req.url));
    }

    // Validate user
    if (!userId) {
      console.error('[sumup-oauth-callback] No user_id in cookie');
      return NextResponse.redirect(new URL('/settings?sumup_error=no_user', req.url));
    }

    // Exchange authorization code for access token
    const redirectUrl = new URL(req.url);
    const callbackUrl = `${redirectUrl.protocol}//${redirectUrl.host}/api/sumup/oauth/callback`;

    const tokenResponse = await fetch(SUMUP_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.SUMUP_CLIENT_ID,
        client_secret: process.env.SUMUP_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[sumup-oauth-callback] Token exchange failed:', tokenResponse.status, errorText);
      return NextResponse.redirect(new URL('/settings?sumup_error=token_exchange_failed', req.url));
    }

    const tokenData: SumUpTokenResponse = await tokenResponse.json();

    // Get merchant profile using the access token
    const profileResponse = await fetch('https://api.sumup.com/v0.1/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('[sumup-oauth-callback] Failed to fetch merchant profile');
      return NextResponse.redirect(new URL('/settings?sumup_error=profile_fetch_failed', req.url));
    }

    const merchantData = await profileResponse.json();

    // Extract merchant information
    const merchantId = merchantData.merchant_profile?.merchant_id || merchantData.merchant_id;
    const merchantCode = merchantData.merchant_profile?.merchant_code || merchantData.merchant_code;
    const merchantName = merchantData.merchant_profile?.company_name || merchantData.company_name || '';
    const merchantEmail = merchantData.merchant_profile?.personal_profile?.email || merchantData.email || '';

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Store OAuth tokens in database
    const supabase = createAdminClient();
    const { error: updateError } = await supabase.from('profiles')
      .update({
        sumup_access_token: tokenData.access_token,
        sumup_refresh_token: tokenData.refresh_token,
        sumup_token_expires_at: expiresAt.toISOString(),
        sumup_merchant_id: merchantId,
        sumup_merchant_code: merchantCode,
        sumup_email: merchantEmail,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[sumup-oauth-callback] Database update error:', updateError);
      return NextResponse.redirect(new URL('/settings?sumup_error=db_update_failed', req.url));
    }

    console.log('[sumup-oauth-callback] Successfully connected merchant:', merchantCode, 'expires:', expiresAt);

    // Redirect back to settings with success message
    return NextResponse.redirect(new URL('/settings?sumup=connected', req.url));
  } catch (error: any) {
    console.error('[sumup-oauth-callback] Unexpected error:', error);
    return NextResponse.redirect(new URL('/settings?sumup_error=unknown', req.url));
  }
}
