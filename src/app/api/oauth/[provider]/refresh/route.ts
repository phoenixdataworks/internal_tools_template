import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Provider } from '@/lib/crypto/tokenVault';
import { refreshFacebookToken } from '@/lib/oauth/facebook';
import { refreshXToken } from '@/lib/oauth/x';
import { getRefreshToken, upsertSocialToken } from '@/lib/supabase/vault';

interface RefreshRequestBody {
  accountId: string;
}

/**
 * Refresh token for Google services (YouTube, Analytics)
 */
async function refreshGoogleToken(refreshToken: string) {
  const tokenUrl = 'https://oauth2.googleapis.com/token';

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Google token refresh failed: ${errorData.error_description || errorData.error}`
      );
    }

    const tokenData = await response.json();
    return {
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
    };
  } catch (error) {
    console.error('Google token refresh error:', error);
    throw error;
  }
}

/**
 * POST handler for /api/oauth/[provider]/refresh
 * Refreshes OAuth tokens for social accounts
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  // We don't actually use the provider parameter in this handler
  // but we'll still await it to be consistent with other handlers
  await context.params;

  try {
    // Get account ID from request body
    const { accountId } = (await request.json()) as RefreshRequestBody;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get refresh token from database
    const supabase = await createSupabaseServerClient();
    const refreshToken = await getRefreshToken(supabase, accountId);

    if (!refreshToken) {
      return NextResponse.json({ error: 'Failed to get refresh token' }, { status: 500 });
    }

    // Get provider details
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('provider, provider_user_id, team_id, metadata')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Error fetching account details for update:', accountError);
      return NextResponse.json({ error: 'Failed to fetch account details' }, { status: 500 });
    }

    const provider = account.provider as Provider;

    // Refresh token based on provider
    let newToken: { access_token: string; expires_in: number };

    switch (provider) {
      case 'ga4':
      case 'youtube':
        newToken = await refreshGoogleToken(refreshToken);
        break;

      case 'facebook':
        // For Facebook, we use the stored user token (stored as refresh_token)
        // to get a new long-lived user token
        newToken = await refreshFacebookToken(refreshToken);
        break;

      case 'x':
        // Use the X-specific refresh token function
        newToken = await refreshXToken(refreshToken);
        break;

      case 'instagram':
        // Instagram uses Facebook's token refresh mechanism
        newToken = await refreshFacebookToken(refreshToken);
        break;

      default:
        return NextResponse.json(
          { error: `Refresh for ${provider} not yet implemented` },
          { status: 501 }
        );
    }

    // Calculate new expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + newToken.expires_in);

    // Ensure metadata is a proper object (not null, not an array, and is an object)
    const metadata =
      typeof account.metadata === 'object' &&
      account.metadata !== null &&
      !Array.isArray(account.metadata)
        ? account.metadata
        : {};

    // Update token in database using the vault-based helper
    await upsertSocialToken(
      supabase,
      account.team_id,
      account.provider,
      account.provider_user_id,
      newToken.access_token,
      refreshToken, // Keep existing refresh token
      expiresAt,
      metadata
    );

    return NextResponse.json({
      success: true,
      provider,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error refreshing token' },
      { status: 500 }
    );
  }
}
