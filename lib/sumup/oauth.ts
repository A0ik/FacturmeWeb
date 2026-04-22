import { createAdminClient } from '@/lib/supabase-server';

const SUMUP_TOKEN_URL = 'https://api.sumup.com/token';

interface SumUpTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

interface RefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Get valid access token for a user, refreshing if necessary
 */
export async function getValidSumUpToken(userId: string): Promise<string | null> {
  const supabase = createAdminClient();

  // Get current tokens
  const { data: profile } = await supabase
    .from('profiles')
    .select('sumup_access_token, sumup_refresh_token, sumup_token_expires_at')
    .eq('id', userId)
    .single();

  if (!profile?.sumup_access_token || !profile?.sumup_refresh_token) {
    return null;
  }

  // Check if token is still valid (with 5 min buffer)
  const expiresAt = new Date(profile.sumup_token_expires_at);
  const now = new Date();
  const tokenExpiryBuffer = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - now.getTime() > tokenExpiryBuffer) {
    // Token is still valid
    return profile.sumup_access_token;
  }

  // Token is expired or expiring soon, refresh it
  return refreshAccessToken(userId, profile.sumup_refresh_token);
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  const supabase = createAdminClient();

  try {
    const response = await fetch(SUMUP_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: process.env.SUMUP_CLIENT_ID,
        client_secret: process.env.SUMUP_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sumup-oauth] Token refresh failed:', response.status, errorText);
      return null;
    }

    const tokenData: RefreshTokenResponse = await response.json();

    // Calculate new expiration
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Update tokens in database
    const updateData: any = {
      sumup_access_token: tokenData.access_token,
      sumup_token_expires_at: expiresAt.toISOString(),
    };

    // Update refresh token if provided (SumUp may rotate it)
    if (tokenData.refresh_token) {
      updateData.sumup_refresh_token = tokenData.refresh_token;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('[sumup-oauth] Failed to store refreshed token:', updateError);
    }

    console.log('[sumup-oauth] Successfully refreshed token for user:', userId);
    return tokenData.access_token;
  } catch (error) {
    console.error('[sumup-oauth] Error refreshing token:', error);
    return null;
  }
}

/**
 * Disconnect SumUp OAuth for a user
 */
export async function disconnectSumUp(userId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      sumup_access_token: null,
      sumup_refresh_token: null,
      sumup_token_expires_at: null,
      sumup_merchant_id: null,
      sumup_merchant_code: null,
      sumup_email: null,
    })
    .eq('id', userId);

  return !error;
}
