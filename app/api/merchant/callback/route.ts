import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time execution
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/connections?error=' + encodeURIComponent(error), req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/connections?error=missing_params', req.url));
  }

  try {
    // Decode state to get provider info
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const provider = stateData.provider;

    // In production, exchange code for access token
    // const tokenResponse = await fetch(`https://api.${provider}.com/oauth/token`, {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     grant_type: 'authorization_code',
    //     code,
    //     redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/merchant/callback`,
    //     client_id: process.env[`MERCHANT_${provider.toUpperCase()}_CLIENT_ID`],
    //     client_secret: process.env[`MERCHANT_${provider.toUpperCase()}_CLIENT_SECRET`],
    //   }),
    // });

    // For demo, create a mock connection
    // In production, get user_id from session
    const { data: { user } } = await getSupabaseAdmin().auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Create the merchant connection
    const { error } = await getSupabaseAdmin().from('merchant_connections').insert({
      user_id: user.id,
      provider,
      provider_account_id: `demo_${provider}_${user.id.slice(0, 8)}`,
      credentials_encrypted: JSON.stringify({ access_token: 'mock_token', refresh_token: 'mock_refresh' }),
      status: 'active',
      auto_import: true,
    });

    if (error) throw error;

    return NextResponse.redirect(new URL('/connections?success=true', req.url));
  } catch (err: any) {
    console.error('OAuth Callback Error:', err);
    return NextResponse.redirect(new URL('/connections?error=' + encodeURIComponent(err.message), req.url));
  }
}
