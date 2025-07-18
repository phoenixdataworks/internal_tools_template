import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Provider } from '@/lib/crypto/tokenVault';
import { syncFacebookPages } from '@/lib/facebook/syncPages';
import { syncYoutubeChannels } from '@/lib/youtube/syncChannels';
import { syncXAccounts } from '@/lib/x/syncAccounts';
import { syncInstagramAccounts } from '@/lib/instagram/syncAccounts';
import { syncGa4Properties } from '@/lib/ga4/syncProperties';

interface DeauthorizeRequestBody {
  accountId: string;
}

/**
 * Revoke Google tokens (for Google Analytics and YouTube)
 */
async function revokeGoogleToken(accessToken: string) {
  const revokeUrl = 'https://oauth2.googleapis.com/revoke';
  const params = new URLSearchParams({
    token: accessToken,
  });

  try {
    const response = await fetch(`${revokeUrl}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Google returns 200 even if the token was already revoked
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Google token revocation failed: ${errorData.error_description || errorData.error}`
      );
    }

    return true;
  } catch (error) {
    console.error('Error revoking Google token:', error);
    // Don't throw - we'll still want to delete from our database
    return false;
  }
}

/**
 * Notify Meta (Facebook/Instagram) about token revocation
 */
async function revokeFacebookToken(accessToken: string) {
  const appId = process.env.META_OAUTH_APP_ID;
  const appSecret = process.env.META_OAUTH_APP_SECRET;
  const revokeUrl = `https://graph.facebook.com/v23.0/me/permissions`;

  try {
    const response = await fetch(revokeUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Facebook token revocation failed: ${errorData.error?.message || 'Unknown error'}`
      );
    }

    return true;
  } catch (error) {
    console.error('Error revoking Facebook token:', error);
    // Don't throw - we'll still want to delete from our database
    return false;
  }
}

/**
 * DELETE handler for /api/oauth/[provider]/deauthorize
 * Handles user-initiated disconnection of social accounts
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const params = await context.params;
    const provider = params.provider as Provider;

    // Get body payload
    const { accountId } = (await request.json()) as DeauthorizeRequestBody;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get supabase client
    const supabase = await createSupabaseServerClient();

    // First, get the account details including the encrypted tokens
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('id, provider, team_id')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Error fetching account:', accountError);
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if user is authorized to delete this account (must be team admin)
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', account.team_id)
      .eq('user_id', user.user.id)
      .single();

    if (teamError || !teamMember || teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'You must be a team admin to disconnect social accounts' },
        { status: 403 }
      );
    }

    // Get the access token to revoke it
    const { data: accessToken, error: tokenError } = await supabase.rpc(
      'get_decrypted_access_token',
      {
        account_id: accountId,
      }
    );

    if (tokenError) {
      console.error('Error getting access token:', tokenError);
      // Continue anyway, we'll delete the record
    }

    // Revoke token with provider if available
    let revocationResult = false;
    if (accessToken) {
      switch (provider) {
        case 'ga4':
        case 'youtube':
          revocationResult = await revokeGoogleToken(accessToken);
          break;
        case 'facebook':
        case 'instagram':
          revocationResult = await revokeFacebookToken(accessToken);
          break;
        case 'x':
          // X API doesn't support revoking tokens programmatically
          // We can only delete our local record
          revocationResult = true;
          break;
      }
    }

    // Delete account from database
    const { error: deleteError } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', accountId);

    if (deleteError) {
      console.error('Error deleting account:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account from database' },
        { status: 500 }
      );
    }

    // Sync provider-specific tables to soft-delete resources
    try {
      switch (provider) {
        case 'facebook':
          await syncFacebookPages({ supabase, teamId: account.team_id });
          break;
        case 'youtube':
          await syncYoutubeChannels({ supabase, teamId: account.team_id });
          break;
        case 'x':
          await syncXAccounts({ supabase, teamId: account.team_id });
          break;
        case 'instagram':
          await syncInstagramAccounts({ supabase, teamId: account.team_id });
          break;
        case 'ga4':
          // Always sync GA4 properties, no token needed with metadata-driven approach
          await syncGa4Properties({
            supabase,
            teamId: account.team_id,
          });
          break;
      }
    } catch (syncError) {
      console.error(`Error syncing ${provider} resources after deauthorization:`, syncError);
      // Continue despite sync error
    }

    // Return success response
    return NextResponse.json({
      success: true,
      provider: account.provider,
      tokenRevoked: revocationResult,
    });
  } catch (error: any) {
    console.error('Error deauthorizing account:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error deauthorizing account' },
      { status: 500 }
    );
  }
}
