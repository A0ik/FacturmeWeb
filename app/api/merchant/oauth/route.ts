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
  const provider = searchParams.get('provider');

  if (!provider) {
    return NextResponse.json({ error: 'Provider required' }, { status: 400 });
  }

  // Generate a state parameter for security
  const state = Buffer.from(JSON.stringify({ provider, timestamp: Date.now() })).toString('base64');

  // In production, redirect to the actual OAuth authorization URL
  // For now, return a mock response
  const oauthUrls: Record<string, string> = {
    amazon: 'https://sellercentral.amazon.com/ap/oa',
    orange: 'https://api.orange.com/oauth/v2/authorize',
    uber: 'https://login.uber.com/oauth/v2/authorize',
    apple: 'https://appleid.apple.com/auth/authorize',
    google: 'https://accounts.google.com/o/oauth2/v2/auth',
    microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  };

  const authUrl = oauthUrls[provider];

  if (authUrl) {
    // Build OAuth URL with parameters
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env[`MERCHANT_${provider.toUpperCase()}_CLIENT_ID`] || '',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/merchant/callback`,
      scope: getScopeForProvider(provider),
      state: state,
    });

    return NextResponse.redirect(`${authUrl}?${params.toString()}`);
  }

  // For demo purposes, create a mock connection
  return NextResponse.json({
    message: 'OAuth flow not configured for this provider',
    provider,
    note: 'In production, this would redirect to the OAuth authorization URL'
  });
}

export async function POST(req: NextRequest) {
  try {
    const { provider, user_id, credentials } = await req.json();

    // In production, this would be called after OAuth callback
    // with the authorization code to exchange for access token

    const { data: conn, error } = await getSupabaseAdmin()
      .from('merchant_connections')
      .insert({
        user_id,
        provider,
        provider_account_id: `mock_${provider}_${Date.now()}`,
        credentials_encrypted: JSON.stringify(credentials), // In production, encrypt this!
        status: 'active',
        auto_import: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, connection: conn });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function getScopeForProvider(provider: string): string {
  const scopes: Record<string, string> = {
    amazon: 'sellingpartnerapi::migration',
    orange: 'openid profile email',
    uber: 'profile history request',
    apple: 'name email',
    google: 'openid profile email',
    microsoft: 'openid profile email',
  };
  return scopes[provider] || 'openid profile';
}
