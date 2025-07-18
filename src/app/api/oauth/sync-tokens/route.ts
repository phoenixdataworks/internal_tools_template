import { NextRequest, NextResponse } from 'next/server';
import { refreshGoogleToken } from '@/lib/oauth/google';
import { upsertSocialAccount } from '@/lib/oauth/handler';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * API Route to refresh expired tokens and sync social media data
 * This should be triggered by a cron job every few minutes
 *
 * Authentication is handled by middleware for HMAC-authenticated routes
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Token Sync] Starting token refresh');

  try {
    // Initialize Supabase with service role key
    const supabase = await createSupabaseServiceClient();

    // Get accounts with tokens that expire soon (within next 10 minutes)
    const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Get tokens needing refresh using the proper view that includes decrypted tokens
    const { data: accounts, error } = await supabase
      .from('team_social_tokens')
      .select(
        'account_id, team_id, provider, provider_user_id, expires_at, refresh_token, is_expired, minutes_until_expiry'
      )
      .lt('expires_at', tenMinutesFromNow)
      .not('refresh_token', 'is', null)
      .order('expires_at', { ascending: true });

    if (error) {
      console.error('[Token Sync] Error fetching accounts:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Type guard to ensure accounts is an array with the expected properties
    if (!Array.isArray(accounts)) {
      console.error('[Token Sync] Expected accounts to be an array');
      return NextResponse.json({ error: 'Unexpected data format' }, { status: 500 });
    }

    // Define the type of social account for better type safety
    type SocialAccount = {
      account_id: string;
      team_id: string;
      provider: string;
      provider_user_id: string;
      expires_at: string;
      refresh_token: string;
      is_expired: boolean;
      minutes_until_expiry: number | null;
    };

    // Explicitly cast accounts to the correct type with intermediate cast to unknown
    const typedAccounts = accounts as unknown as SocialAccount[];

    console.log(`[Token Sync] Found ${typedAccounts.length} account(s) to refresh`);

    // Process each account
    const results = await Promise.allSettled(
      typedAccounts.map(async account => {
        try {
          const refreshToken = account.refresh_token;

          if (!refreshToken) {
            return {
              accountId: account.account_id,
              status: 'error',
              error: 'No refresh token available',
            };
          }

          if (account.provider === 'ga4' || account.provider === 'youtube') {
            // Refresh Google token
            const { accessToken, expiresAt } = await refreshGoogleToken(refreshToken);

            // Update token in database
            await upsertSocialAccount({
              teamId: account.team_id,
              provider: account.provider,
              providerUserId: account.provider_user_id,
              accessToken,
              refreshToken: refreshToken, // Keep the same refresh token
              expiresAt,
              scope: undefined, // Scope is not available in the view, will be handled by the upsert function
            });

            return {
              accountId: account.account_id,
              status: 'refreshed',
              provider: account.provider,
              teamId: account.team_id,
              expiresAt,
            };
          } else {
            // TODO: Implement refresh for other providers
            return {
              accountId: account.account_id,
              status: 'skipped',
              provider: account.provider,
              reason: 'Provider not implemented',
            };
          }
        } catch (error) {
          console.error(
            `[Token Sync] Error refreshing token for account ${account.account_id}:`,
            error
          );
          return {
            accountId: account.account_id,
            status: 'error',
            provider: account.provider,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    // Count results by status
    const refreshed = results.filter(
      r => r.status === 'fulfilled' && r.value.status === 'refreshed'
    ).length;
    const skipped = results.filter(
      r => r.status === 'fulfilled' && r.value.status === 'skipped'
    ).length;
    const errors = results.filter(
      r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'error')
    ).length;

    const duration = Date.now() - startTime;
    console.log(
      `[Token Sync] Completed in ${duration}ms. Results: ${refreshed} refreshed, ${skipped} skipped, ${errors} errors`
    );

    return NextResponse.json({
      success: true,
      stats: {
        total: typedAccounts.length,
        refreshed,
        skipped,
        errors,
        duration: `${duration}ms`,
      },
      results: results.map(r => (r.status === 'fulfilled' ? r.value : { status: 'error' })),
    });
  } catch (error) {
    console.error('[Token Sync] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'Server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
